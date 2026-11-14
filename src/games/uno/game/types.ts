import type { BasePlayerConfig, Language, PlayerColor } from '../../../shared/types/game';

export type PlayerConfig = BasePlayerConfig;
export type CardColor = PlayerColor;

export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4'
  | 'swapHands'
  | 'stealCard';

export interface UnoCard {
  id: string;
  color: CardColor | 'wild';
  value: CardValue;
}

export interface GameSettings {
  campusChaos: boolean;
  stackDrawCards: boolean;
}

export interface UnoLogEntry {
  id: number;
  text: Record<Language, string>;
  tone?: 'neutral' | 'good' | 'bad' | 'highlight';
}

export type GamePhase =
  | 'PLAY_OR_DRAW'
  | 'CHOOSE_COLOR'
  | 'CHOOSE_SWAP_TARGET'
  | 'CHOOSE_STEAL_TARGET'
  | 'GAME_OVER';

export interface GameState {
  players: PlayerConfig[];
  settings: GameSettings;
  hands: Record<number, UnoCard[]>;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: CardColor;
  direction: 1 | -1;
  pendingDrawCount: number;
  currentTurn: number;
  phase: GamePhase;
  unoCalled: Record<number, boolean>;
  winnerIndex: number | null;
  logs: UnoLogEntry[];
  nextLogId: number;
}

export type GameAction =
  | { type: 'PLAY_CARD'; playerIndex: number; cardId: string }
  | { type: 'DRAW_CARD'; playerIndex: number }
  | { type: 'CHOOSE_COLOR'; playerIndex: number; color: CardColor }
  | { type: 'CHOOSE_TARGET'; playerIndex: number; targetPlayerIndex: number }
  | { type: 'CALL_UNO'; playerIndex: number };
