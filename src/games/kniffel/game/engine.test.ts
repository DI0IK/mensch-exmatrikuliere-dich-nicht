import { describe, expect, it } from 'vitest';
import { decideBotAction } from './bot';
import {
  applyGameAction,
  createInitialState,
  getSelectableCategories,
} from './engine';
import {
  ALL_CATEGORIES,
  getTotalScore,
  getUpperBonus,
  scoreCategory,
} from './scoring';
import type { KniffelCategory, PlayerConfig } from './types';

const TEST_PLAYERS: PlayerConfig[] = [
  { name: 'Alice', color: 'rot', seatType: 'human-local', active: true },
  { name: 'Bot', color: 'blau', seatType: 'bot', active: true },
];

describe('ECTS-Kniffel scoring', () => {
  it('scores upper categories correctly', () => {
    expect(scoreCategory([1, 1, 3, 4, 1], 'ones')).toBe(3);
    expect(scoreCategory([6, 6, 6, 2, 1], 'sixes')).toBe(18);
  });

  it('scores lower categories correctly', () => {
    expect(scoreCategory([4, 4, 4, 2, 3], 'threeOfAKind')).toBe(17);
    expect(scoreCategory([4, 4, 2, 3, 5], 'threeOfAKind')).toBe(0);
    expect(scoreCategory([5, 5, 5, 5, 2], 'fourOfAKind')).toBe(22);
    expect(scoreCategory([3, 3, 3, 2, 2], 'fullHouse')).toBe(25);
    expect(scoreCategory([3, 3, 3, 2, 1], 'fullHouse')).toBe(0);
    expect(scoreCategory([1, 2, 3, 4, 6], 'smallStraight')).toBe(30);
    expect(scoreCategory([2, 3, 4, 5, 6], 'largeStraight')).toBe(40);
    expect(scoreCategory([6, 6, 6, 6, 6], 'kniffel')).toBe(50);
    expect(scoreCategory([1, 2, 3, 4, 5], 'chance')).toBe(15);
  });

  it('grants +35 upper bonus at 63+ upper points', () => {
    const scorecard = {
      scores: {
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18,
      },
      cheatTokens: 0,
      lockedCategory: null,
    };
    expect(getUpperBonus(scorecard)).toBe(35);
    expect(getTotalScore(scorecard)).toBe(63 + 35);
  });
});

describe('ECTS-Kniffel engine & twist mode', () => {
  it('rolls, holds, and scores a category, advancing turns', () => {
    let state = createInitialState(TEST_PLAYERS, { twistMode: false }, () => 0.5);
    expect(state.hasRolledThisTurn).toBe(false);
    expect(state.rollsLeft).toBe(3);

    state = applyGameAction(state, { type: 'ROLL_DICE', playerIndex: 0 }, () => 0.99);
    expect(state.hasRolledThisTurn).toBe(true);
    expect(state.rollsLeft).toBe(2);
    expect(state.dice).toEqual([6, 6, 6, 6, 6]);

    state = applyGameAction(state, { type: 'TOGGLE_HOLD', playerIndex: 0, dieIndex: 0 });
    expect(state.held[0]).toBe(true);

    state = applyGameAction(state, {
      type: 'SCORE_CATEGORY',
      playerIndex: 0,
      category: 'kniffel',
    });
    expect(state.scorecards[0].scores.kniffel).toBe(50);
    expect(state.currentTurn).toBe(1);
    expect(state.hasRolledThisTurn).toBe(false);
    expect(state.rollsLeft).toBe(3);
  });

  it('awards and spends cheat tokens (extra roll, set die, lock category) in twist mode', () => {
    let state = createInitialState(TEST_PLAYERS, { twistMode: true }, () => 0.5);

    const startingTokens = state.scorecards[0].cheatTokens;

    // Roll a Kniffel (5x6) -> earns 1 cheat token on scoring
    state = applyGameAction(state, { type: 'ROLL_DICE', playerIndex: 0 }, () => 0.99);
    state = applyGameAction(state, {
      type: 'SCORE_CATEGORY',
      playerIndex: 0,
      category: 'kniffel',
    });
    expect(state.scorecards[0].cheatTokens).toBe(startingTokens + 1);

    // Advance bot turn
    state = applyGameAction(state, { type: 'ROLL_DICE', playerIndex: 1 }, () => 0.1);
    state = applyGameAction(state, {
      type: 'SCORE_CATEGORY',
      playerIndex: 1,
      category: 'ones',
    });
    expect(state.currentTurn).toBe(0);

    // Player 0 spends cheat token to lock bot's 'chance' category
    state = applyGameAction(state, {
      type: 'USE_LOCK_CATEGORY',
      playerIndex: 0,
      targetPlayerIndex: 1,
      category: 'chance',
    });
    expect(state.scorecards[0].cheatTokens).toBe(startingTokens);
    expect(state.scorecards[1].lockedCategory).toBe('chance');

    // Give player 0 more tokens to test USE_SET_DIE and USE_EXTRA_ROLL
    state = {
      ...state,
      scorecards: {
        ...state.scorecards,
        0: { ...state.scorecards[0], cheatTokens: 2 },
      },
    };
    state = applyGameAction(state, { type: 'ROLL_DICE', playerIndex: 0 }, () => 0.0);
    state = applyGameAction(state, {
      type: 'USE_SET_DIE',
      playerIndex: 0,
      dieIndex: 0,
      value: 6,
    });
    expect(state.dice[0]).toBe(6);
    expect(state.scorecards[0].cheatTokens).toBe(1);

    const rollsBefore = state.rollsLeft;
    state = applyGameAction(state, { type: 'USE_EXTRA_ROLL', playerIndex: 0 });
    expect(state.rollsLeft).toBe(rollsBefore + 1);
    expect(state.scorecards[0].cheatTokens).toBe(0);

    // Score and verify bot cannot select locked 'chance'
    state = applyGameAction(state, {
      type: 'SCORE_CATEGORY',
      playerIndex: 0,
      category: 'chance',
    });
    expect(getSelectableCategories(state, 1)).not.toContain('chance');
  });

  it('ends the game after all 13 rounds and determines winner', () => {
    let state = createInitialState(TEST_PLAYERS, { twistMode: false }, () => 0.5);
    const categories: KniffelCategory[] = [...ALL_CATEGORIES];

    for (let r = 0; r < categories.length; r++) {
      for (let p = 0; p < TEST_PLAYERS.length; p++) {
        state = applyGameAction(
          state,
          { type: 'ROLL_DICE', playerIndex: p },
          () => (p === 0 ? 0.99 : 0.0),
        );
        state = applyGameAction(state, {
          type: 'SCORE_CATEGORY',
          playerIndex: p,
          category: categories[r],
        });
      }
    }

    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerIndex).toBe(0);
  });

  it('bot always returns a valid action when it is its turn', () => {
    let state = createInitialState(TEST_PLAYERS, { twistMode: true }, () => 0.4);
    state = applyGameAction(state, { type: 'ROLL_DICE', playerIndex: 0 }, () => 0.4);
    state = applyGameAction(state, {
      type: 'SCORE_CATEGORY',
      playerIndex: 0,
      category: 'chance',
    });

    expect(state.currentTurn).toBe(1);
    const action = decideBotAction(state, 1);
    expect(action).not.toBeNull();
    expect(action?.type).toBe('ROLL_DICE');
  });

  it('supports up to 8 players', () => {
    const eightPlayers: PlayerConfig[] = Array.from({ length: 8 }, (_, idx) => ({
      name: `Player ${idx + 1}`,
      color: (['rot', 'blau', 'gelb', 'gruen'] as const)[idx % 4],
      seatType: idx === 0 ? 'human-local' : 'bot',
      active: true,
    }));
    const state = createInitialState(eightPlayers, { twistMode: true }, () => 0.5);
    expect(state.players).toHaveLength(8);
    expect(Object.keys(state.scorecards)).toHaveLength(8);
  });
});
