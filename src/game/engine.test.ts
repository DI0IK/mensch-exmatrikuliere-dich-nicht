import { describe, expect, it } from 'vitest';
import { chooseBestBotPawn } from './bot';
import {
  acknowledgeDuel,
  createInitialState,
  resolveDuelRoll,
  rollDice,
  selectPawn,
} from './engine';
import type { PlayerConfig } from './types';

function twoPlayers(): PlayerConfig[] {
  return [
    { color: 'rot', name: 'Anna', seatType: 'human-local', active: true },
    { color: 'blau', name: 'Bot', seatType: 'bot', active: true },
    { color: 'gelb', name: 'P3', seatType: 'bot', active: false },
    { color: 'gruen', name: 'P4', seatType: 'bot', active: false },
  ];
}

// Helper to create deterministic RNG returning sequence of 1..6 dice values
function seqRng(diceValues: number[]): () => number {
  let i = 0;
  return () => {
    const val = diceValues[i % diceValues.length];
    i++;
    return (val - 1) / 6 + 0.01;
  };
}

describe('Mensch exmatrikuliere dich nicht - Game Engine', () => {
  it('allows 3 attempts in base when rolling non-6, then passes turn', () => {
    let state = createInitialState(twoPlayers());
    expect(state.currentTurn).toBe(0);

    // Attempt 1: roll 3
    state = rollDice(state, seqRng([3]));
    expect(state.currentTurn).toBe(0);
    expect(state.rollAttemptsInBase).toBe(1);
    expect(state.phase).toBe('WAIT_ROLL');

    // Attempt 2: roll 2
    state = rollDice(state, seqRng([2]));
    expect(state.currentTurn).toBe(0);
    expect(state.rollAttemptsInBase).toBe(2);

    // Attempt 3: roll 5 -> passes turn to player 1
    state = rollDice(state, seqRng([5]));
    expect(state.currentTurn).toBe(1);
    expect(state.rollAttemptsInBase).toBe(0);
    expect(state.phase).toBe('WAIT_ROLL');
  });

  it('immatriculates a pawn on rolling a 6 and grants bonus roll', () => {
    let state = createInitialState(twoPlayers());
    state = rollDice(state, seqRng([6]));
    expect(state.phase).toBe('SELECT_PAWN');
    expect(state.legalPawnIds).toHaveLength(4);

    state = selectPawn(state, 'rot-0');
    const pawn = state.pawns.find((p) => p.id === 'rot-0')!;
    expect(pawn.location).toEqual({ zone: 'track', index: 0 });
    expect(state.currentTurn).toBe(0); // bonus roll for 6
    expect(state.phase).toBe('WAIT_ROLL');
  });

  it('forces clearing own start tile when pawns remain in base', () => {
    let state = createInitialState(twoPlayers());
    state = rollDice(state, seqRng([6]));
    state = selectPawn(state, 'rot-0'); // rot-0 is on track 0

    state = rollDice(state, seqRng([4]));
    expect(state.legalPawnIds).toEqual(['rot-0']);

    // Even if another pawn was also on track, start tile must clear first if pawns in base
    state = selectPawn(state, 'rot-0'); // rot-0 moves to track 4
    state = rollDice(state, seqRng([6])); // Next turn? Wait: rot rolled 4, so turn passed to blau
    expect(state.currentTurn).toBe(1);
  });

  it('triggers 1v1 Exmatriculation duel on landing on opponent, re-rolls ties, and exmatriculates loser', () => {
    let state = createInitialState(twoPlayers());
    // Place rot-0 on track 9 and blau-0 on track 10 (blau start)
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 9 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 10 } };
        return p;
      }),
    };

    // Rot rolls 1 -> lands on track 10 (blau-0)
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'rot-0');
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel).not.toBeNull();
    expect(state.duel?.attackerPlayerIndex).toBe(0);
    expect(state.duel?.defenderPlayerIndex).toBe(1);

    // Round 1: Tie (4 vs 4) -> stays in DUEL_ROLL
    state = resolveDuelRoll(state, seqRng([4, 4]));
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.rounds).toHaveLength(1);
    expect(state.duel?.winner).toBeNull();

    // Round 2: Defender wins (2 vs 5) -> Attacker rot-0 is exmatriculated back to base!
    state = resolveDuelRoll(state, seqRng([2, 5]));
    expect(state.phase).toBe('DUEL_RESULT');
    expect(state.duel?.winner).toBe('defender');

    const rot0 = state.pawns.find((p) => p.id === 'rot-0')!;
    const blau0 = state.pawns.find((p) => p.id === 'blau-0')!;
    expect(rot0.location.zone).toBe('base');
    expect(blau0.location).toEqual({ zone: 'track', index: 10 });

    state = acknowledgeDuel(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(1); // Rot didn't roll 6, so turn passes to Blau
  });

  it('detects victory when all 4 pawns reach goal', () => {
    let state = createInitialState(twoPlayers());
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'goal', slot: 1 } };
        if (p.id === 'rot-1') return { ...p, location: { zone: 'goal', slot: 2 } };
        if (p.id === 'rot-2') return { ...p, location: { zone: 'goal', slot: 3 } };
        if (p.id === 'rot-3') return { ...p, location: { zone: 'track', index: 39 } };
        return p;
      }),
    };

    // Rot rolls 1 -> rot-3 lands on goal slot 0!
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'rot-3');
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerIndex).toBe(0);
  });

  it('bot prioritizes entering goal over regular track moves', () => {
    let state = createInitialState(twoPlayers());
    state = {
      ...state,
      currentTurn: 1,
      pawns: state.pawns.map((p) => {
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 9 } }; // 1 step from goal!
        if (p.id === 'blau-1') return { ...p, location: { zone: 'track', index: 15 } };
        return p;
      }),
    };
    state = rollDice(state, seqRng([1]));
    const choice = chooseBestBotPawn(state);
    expect(choice).toBe('blau-0');
  });
});
