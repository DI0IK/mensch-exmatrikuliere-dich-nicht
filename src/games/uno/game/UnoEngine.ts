import { sound } from '../../../shared/audio/sound';
import { BaseGameEngine } from '../../../shared/engine/BaseGameEngine';
import { DEFAULT_BASE_PLAYERS } from '../../../shared/types/game';
import { decideBotAction } from './bot';
import { applyGameAction, createInitialState, DEFAULT_GAME_SETTINGS } from './engine';
import type { GameAction, GameSettings, GameState, PlayerConfig } from './types';

export class UnoEngine extends BaseGameEngine<
  GameState,
  GameAction,
  GameSettings,
  PlayerConfig
> {
  public readonly gameId = 'uno';

  constructor(autoConnect?: boolean) {
    super({
      defaultSettings: DEFAULT_GAME_SETTINGS,
      defaultPlayers: DEFAULT_BASE_PLAYERS as PlayerConfig[],
      minPlayers: 2,
      maxPlayers: 8,
      autoConnect,
    });
  }

  protected createInitialState(players: PlayerConfig[], settings: GameSettings): GameState {
    return createInitialState(players, settings);
  }

  protected isSeatAuthorized(state: GameState, actorSeat: number, action: GameAction): boolean {
    if (action.type === 'CALL_UNO') {
      return action.playerIndex === actorSeat;
    }
    return actorSeat === state.currentTurn && action.playerIndex === actorSeat;
  }

  protected reduceAction(state: GameState, action: GameAction): GameState {
    return applyGameAction(state, action);
  }

  protected override onStateTransition(prev: GameState | null, next: GameState): void {
    if (!prev) return;
    if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
      sound.playVictory();
      return;
    }
    if (next.pendingDrawCount > prev.pendingDrawCount) {
      sound.playStampThud();
      return;
    }
    if (next.discardPile.length > prev.discardPile.length || next.currentTurn !== prev.currentTurn) {
      sound.playPawnTap();
    }
  }

  protected getBotTurnSeat(state: GameState): number | null {
    if (state.phase === 'GAME_OVER') return null;
    return state.players[state.currentTurn]?.seatType === 'bot' ? state.currentTurn : null;
  }

  protected override getBotDelayMs(): number {
    return 1300;
  }

  protected decideBotAction(state: GameState, botSeat: number): GameAction | null {
    return decideBotAction(state, botSeat);
  }

  public override getLocalSeatIndices(): number[] {
    if (!this.gameState) return [];
    if (this.isGuest) {
      return this.guestSeat !== null ? [this.guestSeat] : [];
    }
    return this.gameState.players
      .map((p, idx) => (p.seatType === 'human-local' ? idx : -1))
      .filter((idx) => idx >= 0);
  }
}
