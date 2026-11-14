import type { BasePlayerConfig, Language } from '../../../shared/types/game';

export type PlayerConfig = BasePlayerConfig;

export type KniffelCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'kniffel'
  | 'chance';

export interface GameSettings {
  twistMode: boolean;
}

export interface PlayerScorecard {
  scores: Partial<Record<KniffelCategory, number>>;
  cheatTokens: number;
  lockedCategory: KniffelCategory | null;
}

export interface KniffelLogEntry {
  id: number;
  text: Record<Language, string>;
  tone?: 'neutral' | 'good' | 'bad' | 'highlight';
}

export interface GameState {
  players: PlayerConfig[];
  settings: GameSettings;
  dice: [number, number, number, number, number];
  held: [boolean, boolean, boolean, boolean, boolean];
  rollsLeft: number;
  hasRolledThisTurn: boolean;
  round: number;
  currentTurn: number;
  phase: 'ROLLING' | 'GAME_OVER';
  scorecards: Record<number, PlayerScorecard>;
  winnerIndex: number | null;
  logs: KniffelLogEntry[];
  nextLogId: number;
}

export type GameAction =
  | { type: 'ROLL_DICE'; playerIndex: number }
  | { type: 'TOGGLE_HOLD'; playerIndex: number; dieIndex: number }
  | { type: 'SCORE_CATEGORY'; playerIndex: number; category: KniffelCategory }
  | { type: 'USE_EXTRA_ROLL'; playerIndex: number }
  | { type: 'USE_SET_DIE'; playerIndex: number; dieIndex: number; value: number }
  | { type: 'USE_LOCK_CATEGORY'; playerIndex: number; targetPlayerIndex: number; category: KniffelCategory };
