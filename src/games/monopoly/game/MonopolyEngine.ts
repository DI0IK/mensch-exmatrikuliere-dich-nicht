import { sound } from '../../../shared/audio/sound';
import { BaseGameEngine } from '../../../shared/engine/BaseGameEngine';
import { decideBotAction } from './bot';
import { applyGameAction, createInitialState } from './engine';
import { DEFAULT_GAME_SETTINGS } from './modes';
import type { GameAction, GameSettings, GameState, PlayerConfig } from './types';

const MONOPOLY_DEFAULT_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true, major: 'Informatik', emoji: '💻' },
  { color: 'blau', name: 'WI-Leo', seatType: 'bot', active: true, major: 'Wirtschaftsinformatik', emoji: '⚖️' },
  { color: 'gelb', name: 'BWL-Justus', seatType: 'bot', active: true, major: 'BWL-Industrie', emoji: '📈' },
  { color: 'gruen', name: 'ET-Klara', seatType: 'bot', active: true, major: 'Elektrotechnik', emoji: '⚡' },
];

function playMonopolyTransitionSounds(prev: GameState | null, next: GameState): void {
  if (!prev) return;
  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
    sound.playVictory();
    return;
  }
  if (next.lastDice !== prev.lastDice && next.phase !== 'WAIT_ROLL') {
    sound.playDiceRoll();
  }
  if (next.players.some((p, i) => p.cash !== prev.players[i]?.cash)) {
    sound.playCashRegister();
  }
  if (next.players.some((p, i) => p.inJail && !prev.players[i]?.inJail)) {
    sound.playStampThud();
  }
}

export class MonopolyEngine extends BaseGameEngine<
  GameState,
  GameAction,
  GameSettings,
  PlayerConfig
> {
  public readonly gameId = 'monopoly';

  constructor(autoConnect?: boolean) {
    super({
      defaultSettings: DEFAULT_GAME_SETTINGS,
      defaultPlayers: MONOPOLY_DEFAULT_PLAYERS,
      autoConnect,
    });
  }

  protected createInitialState(players: PlayerConfig[], settings: GameSettings): GameState {
    return createInitialState(players, settings);
  }

  protected isSeatAuthorized(state: GameState, actorSeat: number, action: GameAction): boolean {
    if (state.phase === 'TRADE_REVIEW' && state.pendingTrade && action.type === 'RESPOND_TRADE') {
      return actorSeat === state.pendingTrade.toIndex;
    }
    if (state.phase === 'AUCTION' && state.auction) {
      if (action.type === 'PLACE_BID' || action.type === 'PASS_BID') {
        const expected = state.auction.activeBidders[state.auction.currentBidderPos];
        return actorSeat === expected && action.playerIndex === actorSeat;
      }
      return false;
    }
    return actorSeat === state.currentTurn;
  }

  protected reduceAction(state: GameState, action: GameAction): GameState {
    return applyGameAction(state, action);
  }

  protected override onStateTransition(prev: GameState | null, next: GameState): void {
    playMonopolyTransitionSounds(prev, next);
  }

  protected getBotTurnSeat(state: GameState): number | null {
    if (state.phase === 'GAME_OVER') return null;

    if (state.phase === 'AUCTION' && state.auction) {
      const candidate = state.auction.activeBidders[state.auction.currentBidderPos];
      return state.players[candidate]?.seatType === 'bot' ? candidate : null;
    }
    if (state.phase === 'TRADE_REVIEW' && state.pendingTrade) {
      const candidate = state.pendingTrade.toIndex;
      return state.players[candidate]?.seatType === 'bot' ? candidate : null;
    }
    const candidate = state.currentTurn;
    return state.players[candidate]?.seatType === 'bot' ? candidate : null;
  }

  protected override getBotDelayMs(): number {
    return 520;
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
      .filter((p) => p.seatType === 'human-local')
      .map((p) => p.index);
  }
}
