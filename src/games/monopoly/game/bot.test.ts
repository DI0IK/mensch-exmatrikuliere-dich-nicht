import { describe, expect, it } from 'vitest';
import { BOARD_TILES } from './boardData';
import { decideBotAction } from './bot';
import { applyGameAction, createInitialState } from './engine';
import { getGroupTiles } from './helpers';
import type { GameState, PlayerConfig } from './types';

const TEST_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Human', seatType: 'human-local', active: true },
  { color: 'blau', name: 'Bot-1', seatType: 'bot', active: true },
  { color: 'gelb', name: 'Bot-2', seatType: 'bot', active: true },
];

function makeBaseState(): GameState {
  return createInitialState(TEST_PLAYERS, {
    turboStart: false,
    freeParkingPot: true,
    auctions: true,
    doubleOnStart: true,
  });
}

describe('Smart Monopoly Bot AI', () => {
  it('buys a property that blocks an opponent monopoly even with tight cash', () => {
    const state = makeBaseState();
    const orangeTiles = getGroupTiles('orange');
    // Human (0) owns 2 of 3 orange tiles; Bot-1 (1) lands on the 3rd with just enough cash + 25
    state.properties[orangeTiles[0].index] = { ownerIndex: 0, houses: 0, mortgaged: false };
    state.properties[orangeTiles[1].index] = { ownerIndex: 0, houses: 0, mortgaged: false };

    const target = orangeTiles[2];
    state.currentTurn = 1;
    state.phase = 'BUY_OR_AUCTION';
    state.pendingTileIndex = target.index;
    state.players[1].cash = (target.price ?? 200) + 25;

    const action = decideBotAction(state, 1);
    expect(action).toEqual({ type: 'BUY_PROPERTY' });
  });

  it('prioritizes building on higher-ROI Orange group before Brown', () => {
    const state = makeBaseState();
    const brownTiles = getGroupTiles('brown');
    const orangeTiles = getGroupTiles('orange');

    for (const t of [...brownTiles, ...orangeTiles]) {
      state.properties[t.index] = { ownerIndex: 1, houses: 0, mortgaged: false };
    }

    state.currentTurn = 1;
    state.phase = 'TURN_ACTION';
    state.players[1].cash = 800;

    const action = decideBotAction(state, 1);
    expect(action?.type).toBe('BUILD_HOUSE');
    if (action?.type === 'BUILD_HOUSE') {
      expect(orangeTiles.map((t) => t.index)).toContain(action.tileIndex);
    }
  });

  it('exits jail early in expansion phase, but stays in jail late-game when opponents have hotels/houses', () => {
    const earlyState = makeBaseState();
    earlyState.currentTurn = 1;
    earlyState.phase = 'WAIT_ROLL';
    earlyState.players[1].inJail = true;
    earlyState.players[1].cash = 500;
    expect(decideBotAction(earlyState, 1)).toEqual({ type: 'PAY_JAIL' });

    const lateState = makeBaseState();
    // Mark almost all properties as owned and give Human a developed monopoly
    for (const tile of BOARD_TILES) {
      if (tile.price) {
        lateState.properties[tile.index] = { ownerIndex: 0, houses: 0, mortgaged: false };
      }
    }
    const redTiles = getGroupTiles('red');
    for (const t of redTiles) {
      lateState.properties[t.index] = { ownerIndex: 0, houses: 3, mortgaged: false };
    }
    lateState.currentTurn = 1;
    lateState.phase = 'WAIT_ROLL';
    lateState.players[1].inJail = true;
    lateState.players[1].cash = 800;

    expect(decideBotAction(lateState, 1)).toEqual({ type: 'ROLL_DICE' });
  });

  it('rejects a trade that hands the human a monopoly for a small cash sweetener', () => {
    const state = makeBaseState();
    const orangeTiles = getGroupTiles('orange');
    const pinkTiles = getGroupTiles('pink');

    state.properties[orangeTiles[0].index] = { ownerIndex: 0, houses: 0, mortgaged: false };
    state.properties[orangeTiles[1].index] = { ownerIndex: 0, houses: 0, mortgaged: false };
    state.properties[orangeTiles[2].index] = { ownerIndex: 1, houses: 0, mortgaged: false };
    state.properties[pinkTiles[0].index] = { ownerIndex: 0, houses: 0, mortgaged: false };

    state.phase = 'TRADE_REVIEW';
    state.pendingTrade = {
      fromIndex: 0,
      toIndex: 1,
      offerCash: 100,
      requestCash: 0,
      offerProperties: [pinkTiles[0].index],
      requestProperties: [orangeTiles[2].index],
      offerJailCards: 0,
      requestJailCards: 0,
    };

    expect(decideBotAction(state, 1)).toEqual({ type: 'RESPOND_TRADE', accept: false });
  });

  it('proposes a trade to complete its 2/3 group and does not re-propose after decline', () => {
    const state = makeBaseState();
    const lightblueTiles = getGroupTiles('lightblue');
    const brownTiles = getGroupTiles('brown');

    state.properties[lightblueTiles[0].index] = { ownerIndex: 1, houses: 0, mortgaged: false };
    state.properties[lightblueTiles[1].index] = { ownerIndex: 1, houses: 0, mortgaged: false };
    state.properties[lightblueTiles[2].index] = { ownerIndex: 0, houses: 0, mortgaged: false };
    state.properties[brownTiles[0].index] = { ownerIndex: 1, houses: 0, mortgaged: false };

    state.currentTurn = 1;
    state.phase = 'TURN_ACTION';
    state.players[1].cash = 500;

    const proposeAction = decideBotAction(state, 1);
    expect(proposeAction?.type).toBe('PROPOSE_TRADE');

    // Simulate proposing and human declining
    const afterPropose = applyGameAction(state, proposeAction!);
    expect(afterPropose.phase).toBe('TRADE_REVIEW');
    const afterDecline = applyGameAction(afterPropose, { type: 'RESPOND_TRADE', accept: false });
    expect(afterDecline.phase).toBe('TURN_ACTION');

    // Same turn: should NOT spam another trade
    const nextAction = decideBotAction(afterDecline, 1);
    expect(nextAction).toEqual({ type: 'END_TURN' });

    // Next turn: should NOT re-propose the exact same declined offer
    const nextTurnState: GameState = { ...afterDecline, turnCount: afterDecline.turnCount + 1 };
    const nextTurnAction = decideBotAction(nextTurnState, 1);
    if (nextTurnAction?.type === 'PROPOSE_TRADE') {
      expect(nextTurnAction).not.toEqual(proposeAction);
    }
  });

  it('mortgages isolated singletons before selling houses on a monopoly in DEBT_RECOVERY', () => {
    const state = makeBaseState();
    const orangeTiles = getGroupTiles('orange');
    const brownTiles = getGroupTiles('brown');

    for (const t of orangeTiles) {
      state.properties[t.index] = { ownerIndex: 1, houses: 3, mortgaged: false };
    }
    state.properties[brownTiles[0].index] = { ownerIndex: 1, houses: 0, mortgaged: false };

    state.currentTurn = 1;
    state.phase = 'DEBT_RECOVERY';
    state.players[1].cash = -20;

    const action = decideBotAction(state, 1);
    expect(action).toEqual({ type: 'TOGGLE_MORTGAGE', tileIndex: brownTiles[0].index });
  });

  it('never enters a mortgage/unmortgage loop in TURN_ACTION', () => {
    let state = makeBaseState();
    const orangeTiles = getGroupTiles('orange');
    const brownTiles = getGroupTiles('brown');

    for (const t of orangeTiles) {
      state.properties[t.index] = { ownerIndex: 1, houses: 0, mortgaged: false };
    }
    state.properties[brownTiles[0].index] = { ownerIndex: 1, houses: 0, mortgaged: true };

    state.currentTurn = 1;
    state.phase = 'TURN_ACTION';
    state.players[1].cash = 175;

    const actions: string[] = [];
    for (let step = 0; step < 10; step++) {
      const action = decideBotAction(state, 1);
      expect(action).not.toBeNull();
      actions.push(action!.type);
      if (action!.type === 'END_TURN') break;
      state = applyGameAction(state, action!);
    }

    expect(actions[actions.length - 1]).toBe('END_TURN');
    expect(actions.filter((a) => a === 'TOGGLE_MORTGAGE').length).toBeLessThanOrEqual(1);
  });
});
