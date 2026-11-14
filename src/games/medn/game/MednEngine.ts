import { sound } from '../../../shared/audio/sound';
import { BaseGameEngine } from '../../../shared/engine/BaseGameEngine';
import { DEFAULT_BASE_PLAYERS } from '../../../shared/types/game';
import { chooseBestBotPawn, chooseBotSuperpowerAction } from './bot';
import {
  acknowledgeActivity,
  acknowledgeDuel,
  applyAutoWinDuelSuperpower,
  applyInstantFinishSuperpower,
  applyKickToDormSuperpower,
  applyLoadedSixSuperpower,
  applySwapSuperpower,
  createInitialState,
  rollDice,
  rollDuelDie,
  selectPawn,
} from './engine';
import { DEFAULT_GAME_SETTINGS } from './modes';
import type { GameAction, GameSettings, GameState, PlayerConfig, SuperpowerType } from './types';

function playMednTransitionSounds(prev: GameState | null, next: GameState): void {
  if (!prev) return;

  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
    sound.playVictory();
    return;
  }
  if (next.phase === 'DUEL_RESULT' && prev.phase !== 'DUEL_RESULT') {
    sound.playDiceRoll();
    sound.playStampThud();
    return;
  }
  if (
    prev.phase === 'DUEL_ROLL' &&
    next.phase === 'DUEL_ROLL' &&
    (next.duel?.rounds.length ?? 0) > (prev.duel?.rounds.length ?? 0)
  ) {
    sound.playDiceRoll();
    return;
  }
  if (next.phase === 'ACTIVITY_RESULT' && prev.phase !== 'ACTIVITY_RESULT') {
    if (next.activity?.outcome === 'bad') {
      sound.playStampThud();
    } else {
      sound.playPawnTap();
    }
    return;
  }
  if (prev.phase === 'ACTIVITY_RESULT' && next.phase !== 'ACTIVITY_RESULT') {
    sound.playPawnTap();
    return;
  }
  if (prev.phase === 'DUEL_RESULT' && next.phase !== 'DUEL_RESULT') {
    sound.playPawnTap();
    return;
  }
  if (
    prev.phase === 'WAIT_ROLL' &&
    (next.phase === 'SELECT_PAWN' ||
      (next.phase === 'WAIT_ROLL' &&
        (next.rollAttemptsInBase !== prev.rollAttemptsInBase ||
          next.currentTurn !== prev.currentTurn ||
          next.lastRoll !== prev.lastRoll ||
          next.nextLogId !== prev.nextLogId)))
  ) {
    sound.playDiceRoll();
    return;
  }
  if (prev.phase === 'SELECT_PAWN' && next.phase !== 'SELECT_PAWN') {
    sound.playPawnTap();
  }
}

export class MednEngine extends BaseGameEngine<GameState, GameAction, GameSettings, PlayerConfig> {
  public readonly gameId = 'medn';
  private guestSuperpower: SuperpowerType | 'random' = 'random';

  constructor(autoConnect?: boolean) {
    super({
      defaultSettings: DEFAULT_GAME_SETTINGS,
      defaultPlayers: DEFAULT_BASE_PLAYERS as PlayerConfig[],
      autoConnect,
    });
  }

  public getGuestSuperpower(): SuperpowerType | 'random' {
    return this.guestSuperpower;
  }

  public setGuestSuperpower = (superpower: SuperpowerType | 'random'): void => {
    this.guestSuperpower = superpower;
    this.sendGuestProfile();
    this.emit();
  };

  protected override getGuestExtraPayload(): Record<string, unknown> {
    return { superpower: this.guestSuperpower };
  }

  protected override onGuestProfileExtra(
    _seatIndex: number,
    extra: Record<string, unknown>
  ): Partial<PlayerConfig> | null {
    if (extra.superpower === 'random') {
      return { superpower: undefined };
    }
    if (typeof extra.superpower === 'string') {
      return { superpower: extra.superpower as SuperpowerType };
    }
    return null;
  }

  protected createInitialState(players: PlayerConfig[], settings: GameSettings): GameState {
    return createInitialState(players, settings);
  }

  protected isSeatAuthorized(state: GameState, actorSeat: number, action: GameAction): boolean {
    if (action.playerIndex !== actorSeat) return false;
    if (
      action.playerIndex !== state.currentTurn &&
      state.phase !== 'DUEL_ROLL' &&
      state.phase !== 'DUEL_RESULT' &&
      state.phase !== 'ACTIVITY_RESULT'
    ) {
      return false;
    }
    if (
      (state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT') &&
      state.duel &&
      action.playerIndex !== state.duel.attackerPlayerIndex &&
      action.playerIndex !== state.duel.defenderPlayerIndex
    ) {
      return false;
    }
    if (
      state.phase === 'ACTIVITY_RESULT' &&
      state.activity &&
      action.playerIndex !== state.activity.playerIndex
    ) {
      return false;
    }
    return true;
  }

  protected reduceAction(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'ROLL_DICE':
        return rollDice(state);
      case 'SELECT_PAWN':
        return selectPawn(state, action.pawnId);
      case 'DUEL_ROLL':
        return rollDuelDie(state, action.playerIndex);
      case 'ACK_DUEL':
        return acknowledgeDuel(state);
      case 'ACK_ACTIVITY':
        return acknowledgeActivity(state);
      case 'USE_SWAP':
        return applySwapSuperpower(state, action.playerIndex, action.ownPawnId, action.targetPawnId);
      case 'USE_INSTANT_FINISH':
        return applyInstantFinishSuperpower(state, action.playerIndex, action.pawnId);
      case 'USE_AUTO_WIN_DUEL':
        return applyAutoWinDuelSuperpower(state, action.playerIndex);
      case 'USE_LOADED_SIX':
        return applyLoadedSixSuperpower(state, action.playerIndex);
      case 'USE_KICK_TO_DORM':
        return applyKickToDormSuperpower(state, action.playerIndex, action.targetPawnId);
    }
  }

  protected override onStateTransition(prev: GameState | null, next: GameState): void {
    playMednTransitionSounds(prev, next);
  }

  protected getBotTurnSeat(state: GameState): number | null {
    if (state.phase === 'GAME_OVER') return null;

    let activePlayerIndex = state.currentTurn;
    if (state.phase === 'DUEL_ROLL' && state.duel) {
      const { attackerPlayerIndex, defenderPlayerIndex, pendingAttackerRoll, pendingDefenderRoll } =
        state.duel;
      if (pendingAttackerRoll === null) {
        activePlayerIndex = attackerPlayerIndex;
      } else if (pendingDefenderRoll === null) {
        activePlayerIndex = defenderPlayerIndex;
      } else {
        return null;
      }
    } else if (state.phase === 'DUEL_RESULT') {
      activePlayerIndex = state.duel?.attackerPlayerIndex ?? state.currentTurn;
    } else if (state.phase === 'ACTIVITY_RESULT') {
      activePlayerIndex = state.activity?.playerIndex ?? state.currentTurn;
    }

    const activePlayer = state.players[activePlayerIndex];
    if (!activePlayer || activePlayer.seatType !== 'bot') return null;
    return activePlayerIndex;
  }

  protected override getBotDelayMs(state: GameState): number {
    switch (state.phase) {
      case 'DUEL_RESULT':
        return 2200;
      case 'ACTIVITY_RESULT':
        return 1900;
      case 'DUEL_ROLL':
        return 1250;
      case 'SELECT_PAWN':
        return 1150;
      default:
        return 1000;
    }
  }

  protected decideBotAction(state: GameState, botSeat: number): GameAction | null {
    const botSuperpower = chooseBotSuperpowerAction(state, botSeat);
    if (botSuperpower) return botSuperpower;

    if (state.phase === 'WAIT_ROLL') {
      return { type: 'ROLL_DICE', playerIndex: botSeat };
    }
    if (state.phase === 'SELECT_PAWN') {
      const bestPawn = chooseBestBotPawn(state);
      return bestPawn ? { type: 'SELECT_PAWN', playerIndex: botSeat, pawnId: bestPawn } : null;
    }
    if (state.phase === 'DUEL_ROLL') {
      return { type: 'DUEL_ROLL', playerIndex: botSeat };
    }
    if (state.phase === 'DUEL_RESULT') {
      return { type: 'ACK_DUEL', playerIndex: botSeat };
    }
    if (state.phase === 'ACTIVITY_RESULT') {
      return { type: 'ACK_ACTIVITY', playerIndex: botSeat };
    }
    return null;
  }

  public override getLocalSeatIndices(): number[] {
    if (!this.gameState) return [];
    if (this.isGuest) {
      return this.guestSeat !== null ? [this.guestSeat] : [];
    }
    return this.gameState.players
      .map((p, idx) => (p.active && p.seatType === 'human-local' ? idx : -1))
      .filter((idx) => idx !== -1);
  }

  public takeOverSeatAsBot = (seatIndex: number): void => {
    if (this.isGuest || !this.gameState) return;
    this.players = this.players.map((p, idx) =>
      idx === seatIndex ? { ...p, seatType: 'bot' as const } : p
    );
    const nextState: GameState = {
      ...this.gameState,
      players: this.gameState.players.map((p, idx) =>
        idx === seatIndex ? { ...p, seatType: 'bot' as const } : p
      ),
    };
    this.disconnectedSeats = this.disconnectedSeats.filter((s) => s !== seatIndex);
    this.broadcastState(nextState);
  };
}
