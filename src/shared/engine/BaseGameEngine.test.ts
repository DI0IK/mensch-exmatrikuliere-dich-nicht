import { describe, expect, it, vi } from 'vitest';
import { BaseGameEngine } from './BaseGameEngine';
import type { BasePlayerConfig } from '../types/game';

interface TestState {
  currentTurn: number;
  count: number;
  done: boolean;
}

type TestAction = { type: 'INC'; playerIndex: number } | { type: 'FINISH'; playerIndex: number };

interface TestSettings {
  target: number;
}

class MockGameEngine extends BaseGameEngine<TestState, TestAction, TestSettings, BasePlayerConfig> {
  public readonly gameId = 'mock';

  constructor() {
    super({
      defaultSettings: { target: 2 },
      autoConnect: false,
    });
  }

  protected createInitialState(): TestState {
    return { currentTurn: 0, count: 0, done: false };
  }

  protected isSeatAuthorized(state: TestState, actorSeat: number, action: TestAction): boolean {
    return actorSeat === state.currentTurn && action.playerIndex === actorSeat;
  }

  protected reduceAction(state: TestState, action: TestAction): TestState {
    if (state.done) return state;
    if (action.type === 'INC') {
      const nextCount = state.count + 1;
      const nextTurn = (state.currentTurn + 1) % 2;
      return {
        currentTurn: nextTurn,
        count: nextCount,
        done: nextCount >= this.settings.target,
      };
    }
    return { ...state, done: true };
  }

  protected getBotTurnSeat(state: TestState): number | null {
    if (state.done) return null;
    return this.players[state.currentTurn]?.seatType === 'bot' ? state.currentTurn : null;
  }

  protected override getBotDelayMs(): number {
    return 10;
  }

  protected decideBotAction(_state: TestState, botSeat: number): TestAction {
    return { type: 'INC', playerIndex: botSeat };
  }
}

describe('BaseGameEngine', () => {
  it('initializes lobby state, starts game, and dispatches authorized actions', () => {
    const engine = new MockGameEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    expect(engine.getSnapshot().gameState).toBeNull();
    engine.startGame();
    expect(engine.getSnapshot().gameState).toEqual({ currentTurn: 0, count: 0, done: false });
    expect(listener).toHaveBeenCalled();

    // Unauthorized seat (seat 1 when currentTurn is 0) should be ignored
    engine.dispatchAction({ type: 'INC', playerIndex: 1 });
    expect(engine.getSnapshot().gameState?.count).toBe(0);

    // Authorized seat 0 action
    engine.dispatchAction({ type: 'INC', playerIndex: 0 });
    expect(engine.getSnapshot().gameState?.count).toBe(1);
    expect(engine.getSnapshot().gameState?.currentTurn).toBe(1);

    engine.destroy();
  });

  it('schedules and executes bot turns automatically', async () => {
    const engine = new MockGameEngine();
    engine.startGame();
    engine.dispatchAction({ type: 'INC', playerIndex: 0 });

    // Seat 1 is a bot by default
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(engine.getSnapshot().gameState?.count).toBe(2);
    expect(engine.getSnapshot().gameState?.done).toBe(true);

    engine.returnToLobby();
    expect(engine.getSnapshot().gameState).toBeNull();
    engine.destroy();
  });
});
