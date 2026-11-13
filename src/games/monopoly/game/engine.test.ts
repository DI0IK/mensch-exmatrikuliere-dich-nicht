import { describe, expect, it } from 'vitest';
import { BOARD_TILES, JAIL_TILE_INDEX, STARTING_CASH } from './boardData';
import { decideBotAction } from './bot';
import {
  buildHouse,
  buyProperty,
  createInitialState,
  declareBankruptcy,
  declineProperty,
  endTurn,
  passBid,
  placeBid,
  proposeTrade,
  respondTrade,
  rollDice,
  sellHouse,
  toggleMortgage,
} from './engine';
import { calculateRent, canBuildOnTile } from './helpers';
import type { PlayerConfig } from './types';

const TEST_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Anna', seatType: 'human-local', active: true, major: 'Informatik', emoji: '💻' },
  { color: 'blau', name: 'Ben', seatType: 'bot', active: true, major: 'Jura', emoji: '⚖️' },
  { color: 'gelb', name: 'Clara', seatType: 'bot', active: true, major: 'BWL', emoji: '📈' },
];

function makeSeqRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx++;
    return val;
  };
}

// Helper to convert desired die face (1..6) into rng output in [0, 1)
function dieRng(face: number): number {
  return (face - 1) / 6 + 0.01;
}

describe('Campus Monopoly Engine', () => {
  it('initializes standard and turboStart games properly', () => {
    const std = createInitialState(TEST_PLAYERS, { turboStart: false });
    expect(std.players).toHaveLength(3);
    expect(std.players[0].cash).toBe(STARTING_CASH);
    expect(std.phase).toBe('WAIT_ROLL');

    const turbo = createInitialState(TEST_PLAYERS, { turboStart: true }, makeSeqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]));
    for (let i = 0; i < 3; i++) {
      const owned = Object.values(turbo.properties).filter((p) => p.ownerIndex === i);
      expect(owned).toHaveLength(2);
    }
  });

  it('awards +200 € passing Semesterstart and +400 € when doubleOnStart lands directly on 0', () => {
    let state = createInitialState(TEST_PLAYERS, { doubleOnStart: false });
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 35 } : p)),
    };
    // Roll 3 + 4 = 7 -> wraps from 35 to 2 (Chest)
    state = rollDice(state, makeSeqRng([dieRng(3), dieRng(4)]));
    expect(state.players[0].position).toBe(2);
    expect(state.players[0].cash).toBe(STARTING_CASH + 200);

    // Now test doubleOnStart landing directly on 0 (35 + 5 = 40 -> 0)
    let doubleState = createInitialState(TEST_PLAYERS, { doubleOnStart: true });
    doubleState = {
      ...doubleState,
      players: doubleState.players.map((p, i) => (i === 0 ? { ...p, position: 35 } : p)),
    };
    doubleState = rollDice(doubleState, makeSeqRng([dieRng(2), dieRng(3)]));
    expect(doubleState.players[0].position).toBe(0);
    expect(doubleState.players[0].cash).toBe(STARTING_CASH + 400);
  });

  it('sends player to Prüfungsamt-Sperre on 3 consecutive doubles', () => {
    let state = createInitialState(TEST_PLAYERS, { auctions: false });

    // 1st double: 1+1 = 2 (Chest)
    state = rollDice(state, makeSeqRng([dieRng(1), dieRng(1)]));
    expect(state.doublesCount).toBe(1);
    expect(state.canRollAgain).toBe(true);
    // Move to TURN_ACTION if Chest modal opened
    if (state.phase === 'CARD_MODAL') {
      state = { ...state, phase: 'TURN_ACTION', drawnCard: null };
    }
    state = endTurn(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(0);

    // 2nd double: 2+2 = 4 (from pos 2 -> pos 6 Copyshop)
    state = rollDice(state, makeSeqRng([dieRng(2), dieRng(2)]));
    expect(state.doublesCount).toBe(2);
    if (state.phase === 'BUY_OR_AUCTION') {
      state = declineProperty(state);
    }
    state = endTurn(state);
    expect(state.currentTurn).toBe(0);

    // 3rd double: 3+3 -> straight to Jail!
    state = rollDice(state, makeSeqRng([dieRng(3), dieRng(3)]));
    expect(state.players[0].inJail).toBe(true);
    expect(state.players[0].position).toBe(JAIL_TILE_INDEX);
    expect(state.doublesCount).toBe(0);
    expect(state.canRollAgain).toBe(false);
  });

  it('enforces monopoly rent doubling, even-building rule, and Lehrstuhl rent', () => {
    let state = createInitialState(TEST_PLAYERS);
    // Give player 0 both brown properties: 1 (Altbau-WG) and 3 (Fachschafts-Keller)
    state = {
      ...state,
      phase: 'TURN_ACTION',
      properties: {
        ...state.properties,
        1: { ownerIndex: 0, houses: 0, mortgaged: false },
        3: { ownerIndex: 0, houses: 0, mortgaged: false },
      },
    };

    // Unimproved monopoly doubles base rent (2 -> 4, 4 -> 8)
    expect(calculateRent(state, 1, 7)).toBe(4);
    expect(calculateRent(state, 3, 7)).toBe(8);

    // Build 1st house on tile 1
    expect(canBuildOnTile(state, 0, 1)).toBe(true);
    state = buildHouse(state, 1);
    expect(state.properties[1].houses).toBe(1);
    // Cannot build 2nd house on tile 1 while tile 3 has 0 (even-building)
    expect(canBuildOnTile(state, 0, 1)).toBe(false);
    expect(canBuildOnTile(state, 0, 3)).toBe(true);

    // Build up to Lehrstuhl (5 houses) evenly
    for (let level = 1; level <= 4; level++) {
      state = buildHouse(state, 3); // catches up to level
      expect(state.properties[3].houses).toBe(level);
      state = buildHouse(state, 1); // advances to level + 1
      expect(state.properties[1].houses).toBe(level + 1);
    }
    state = buildHouse(state, 3);
    expect(state.properties[1].houses).toBe(5);
    expect(state.properties[3].houses).toBe(5);
    expect(calculateRent(state, 1, 7)).toBe(BOARD_TILES[1].rents![5]);

    // Even-selling: cannot sell on tile 1 if tile 3 has same, either can sell, then must sell other
    state = sellHouse(state, 1);
    expect(state.properties[1].houses).toBe(4);
  });

  it('handles mortgaging, zero rent while mortgaged, and 55% unmortgage cost', () => {
    let state = createInitialState(TEST_PLAYERS);
    state = {
      ...state,
      phase: 'TURN_ACTION',
      properties: {
        ...state.properties,
        5: { ownerIndex: 0, houses: 0, mortgaged: false }, // Campus-Bus (200 €)
      },
    };

    const cashBefore = state.players[0].cash;
    state = toggleMortgage(state, 5);
    expect(state.properties[5].mortgaged).toBe(true);
    expect(state.players[0].cash).toBe(cashBefore + 100);
    expect(calculateRent(state, 5, 7)).toBe(0);

    state = toggleMortgage(state, 5);
    expect(state.properties[5].mortgaged).toBe(false);
    expect(state.players[0].cash).toBe(cashBefore + 100 - 110);
    expect(calculateRent(state, 5, 7)).toBe(25);
  });

  it('executes direct trades and resolves auctions when properties are declined', () => {
    let state = createInitialState(TEST_PLAYERS, { auctions: true });
    state = {
      ...state,
      phase: 'TURN_ACTION',
      properties: {
        ...state.properties,
        1: { ownerIndex: 0, houses: 0, mortgaged: false },
        6: { ownerIndex: 1, houses: 0, mortgaged: false },
      },
    };

    state = proposeTrade(state, {
      fromIndex: 0,
      toIndex: 1,
      offerCash: 50,
      requestCash: 0,
      offerProperties: [1],
      requestProperties: [6],
      offerJailCards: 0,
      requestJailCards: 0,
    });
    expect(state.phase).toBe('TRADE_REVIEW');
    state = respondTrade(state, true);
    expect(state.phase).toBe('TURN_ACTION');
    expect(state.properties[1].ownerIndex).toBe(1);
    expect(state.properties[6].ownerIndex).toBe(0);
    expect(state.players[0].cash).toBe(STARTING_CASH - 50);
    expect(state.players[1].cash).toBe(STARTING_CASH + 50);

    // Now test Auction: player 0 lands on tile 3 and declines
    state = {
      ...state,
      phase: 'BUY_OR_AUCTION',
      pendingTileIndex: 3,
    };
    state = declineProperty(state);
    expect(state.phase).toBe('AUCTION');
    expect(state.auction?.tileIndex).toBe(3);

    // Active bidders order starts after currentTurn (0): [1, 2, 0]
    state = placeBid(state, 1, 40);
    state = passBid(state, 2);
    state = passBid(state, 0);

    expect(state.phase).toBe('TURN_ACTION');
    expect(state.properties[3].ownerIndex).toBe(1);
    expect(state.players[1].cash).toBe(STARTING_CASH + 50 - 40);
  });

  it('handles bankruptcy asset transfer and last-player-standing GAME_OVER', () => {
    let state = createInitialState(TEST_PLAYERS.slice(0, 2)); // 2 players: Anna (0), Ben (1)
    state = {
      ...state,
      phase: 'DEBT_RECOVERY',
      debtCreditorIndex: 1,
      players: state.players.map((p, i) => (i === 0 ? { ...p, cash: -120 } : p)),
      properties: {
        ...state.properties,
        1: { ownerIndex: 0, houses: 0, mortgaged: false },
      },
    };

    state = declareBankruptcy(state);
    expect(state.players[0].bankrupt).toBe(true);
    expect(state.properties[1].ownerIndex).toBe(1);
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerIndex).toBe(1);
  });

  it('bot AI buys affordable properties and ends turn cleanly', () => {
    let state = createInitialState(TEST_PLAYERS);
    state = {
      ...state,
      currentTurn: 1,
      phase: 'BUY_OR_AUCTION',
      pendingTileIndex: 1,
    };
    const buyAct = decideBotAction(state, 1);
    expect(buyAct).toEqual({ type: 'BUY_PROPERTY' });
    state = buyProperty(state);
    expect(state.phase).toBe('TURN_ACTION');

    const endAct = decideBotAction(state, 1);
    expect(endAct).toEqual({ type: 'END_TURN' });
  });
});
