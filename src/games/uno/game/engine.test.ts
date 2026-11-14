import { describe, expect, it } from 'vitest';
import { decideBotAction } from './bot';
import { applyGameAction, createInitialState, isCardPlayable } from './engine';
import type { PlayerConfig, UnoCard } from './types';

const TEST_PLAYERS: PlayerConfig[] = [
  { name: 'Alice', color: 'rot', seatType: 'human-local', active: true },
  { name: 'Bob', color: 'blau', seatType: 'human-local', active: true },
  { name: 'Bot', color: 'gruen', seatType: 'bot', active: true },
];

describe('Prüfungs-UNO engine', () => {
  it('deals 7 cards per player and sets a valid initial discard', () => {
    const state = createInitialState(TEST_PLAYERS, { campusChaos: true, stackDrawCards: true });
    expect(state.hands[0]).toHaveLength(7);
    expect(state.hands[1]).toHaveLength(7);
    expect(state.hands[2]).toHaveLength(7);
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].color).not.toBe('wild');
    expect(state.phase).toBe('PLAY_OR_DRAW');
  });

  it('stacks +2 and +4 draw penalties when stackDrawCards is enabled', () => {
    let state = createInitialState(TEST_PLAYERS, { campusChaos: false, stackDrawCards: true });
    const p0Draw2: UnoCard = { id: 'p0-d2', color: 'rot', value: 'draw2' };
    const p1Draw2: UnoCard = { id: 'p1-d2', color: 'blau', value: 'draw2' };
    const p1Num: UnoCard = { id: 'p1-5', color: 'rot', value: '5' };

    state = {
      ...state,
      activeColor: 'rot',
      discardPile: [{ id: 'top', color: 'rot', value: '3' }],
      hands: {
        0: [p0Draw2, { id: 'p0-1', color: 'gruen', value: '1' }],
        1: [p1Draw2, p1Num],
        2: [{ id: 'p2-1', color: 'gelb', value: '2' }],
      },
      currentTurn: 0,
      pendingDrawCount: 0,
    };

    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: 'p0-d2' });
    expect(state.pendingDrawCount).toBe(2);
    expect(state.currentTurn).toBe(1);

    // Under pendingDrawCount > 0, number card is NOT playable, +2 IS playable
    expect(isCardPlayable(state, p1Num)).toBe(false);
    expect(isCardPlayable(state, p1Draw2)).toBe(true);

    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: 'p1-d2' });
    expect(state.pendingDrawCount).toBe(4);
    expect(state.currentTurn).toBe(2);

    // Player 2 draws the stacked 4 cards
    const p2Before = state.hands[2].length;
    state = applyGameAction(state, { type: 'DRAW_CARD', playerIndex: 2 });
    expect(state.hands[2].length).toBe(p2Before + 4);
    expect(state.pendingDrawCount).toBe(0);
    expect(state.currentTurn).toBe(0);
  });

  it('handles wild card color choice', () => {
    let state = createInitialState(TEST_PLAYERS, { campusChaos: false, stackDrawCards: true });
    const wildCard: UnoCard = { id: 'w1', color: 'wild', value: 'wild' };

    state = {
      ...state,
      hands: {
        ...state.hands,
        0: [wildCard, { id: 'p0-2', color: 'blau', value: '4' }],
      },
      currentTurn: 0,
    };

    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: 'w1' });
    expect(state.phase).toBe('CHOOSE_COLOR');

    state = applyGameAction(state, { type: 'CHOOSE_COLOR', playerIndex: 0, color: 'gruen' });
    expect(state.activeColor).toBe('gruen');
    expect(state.phase).toBe('PLAY_OR_DRAW');
    expect(state.currentTurn).toBe(1);
  });

  it('handles campusChaos swapHands and stealCard twists', () => {
    let state = createInitialState(TEST_PLAYERS, { campusChaos: true, stackDrawCards: true });
    const swapCard: UnoCard = { id: 'swap-1', color: 'wild', value: 'swapHands' };
    const stealCard: UnoCard = { id: 'steal-1', color: 'wild', value: 'stealCard' };

    state = {
      ...state,
      hands: {
        0: [swapCard, { id: 'p0-a', color: 'rot', value: '1' }],
        1: [
          stealCard,
          { id: 'p1-a', color: 'blau', value: '2' },
          { id: 'p1-b', color: 'gruen', value: '3' },
        ],
        2: [{ id: 'p2-a', color: 'gelb', value: '9' }],
      },
      currentTurn: 0,
    };

    // Player 0 swaps hands with Player 2
    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: 'swap-1' });
    expect(state.phase).toBe('CHOOSE_SWAP_TARGET');
    state = applyGameAction(state, { type: 'CHOOSE_TARGET', playerIndex: 0, targetPlayerIndex: 2 });
    expect(state.hands[0]).toEqual([{ id: 'p2-a', color: 'gelb', value: '9' }]);
    expect(state.hands[2]).toEqual([{ id: 'p0-a', color: 'rot', value: '1' }]);
    expect(state.currentTurn).toBe(1);

    // Player 1 steals a card from Player 2
    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: 'steal-1' });
    expect(state.phase).toBe('CHOOSE_STEAL_TARGET');
    state = applyGameAction(state, { type: 'CHOOSE_TARGET', playerIndex: 1, targetPlayerIndex: 2 });
    expect(state.hands[2]).toHaveLength(0);
    expect(state.hands[1]).toHaveLength(3);
  });

  it('declares winner when a player plays their last card', () => {
    let state = createInitialState(TEST_PLAYERS, { campusChaos: false, stackDrawCards: true });
    state = {
      ...state,
      activeColor: 'rot',
      discardPile: [{ id: 'top', color: 'rot', value: '3' }],
      hands: {
        0: [{ id: 'last', color: 'rot', value: '7' }],
        1: [{ id: 'b1', color: 'blau', value: '1' }],
        2: [{ id: 'c1', color: 'gruen', value: '2' }],
      },
      currentTurn: 0,
    };

    state = applyGameAction(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: 'last' });
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerIndex).toBe(0);
  });

  it('bot returns a valid action on its turn', () => {
    let state = createInitialState(TEST_PLAYERS, { campusChaos: true, stackDrawCards: true });
    state = {
      ...state,
      currentTurn: 2,
    };
    const action = decideBotAction(state, 2);
    expect(action).not.toBeNull();
    expect(action?.playerIndex).toBe(2);
  });

  it('supports up to 8 players', () => {
    const eightPlayers: PlayerConfig[] = Array.from({ length: 8 }, (_, idx) => ({
      name: `Player ${idx + 1}`,
      color: (['rot', 'blau', 'gelb', 'gruen'] as const)[idx % 4],
      seatType: idx === 0 ? 'human-local' : 'bot',
      active: true,
    }));
    const state = createInitialState(eightPlayers, { campusChaos: true, stackDrawCards: true });
    expect(state.players).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(state.hands[i]).toHaveLength(7);
    }
  });
});
