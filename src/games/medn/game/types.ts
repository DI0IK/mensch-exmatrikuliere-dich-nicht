export type PlayerColor = 'rot' | 'blau' | 'gelb' | 'gruen';

export type SeatType = 'human-local' | 'human-remote' | 'bot';

export type Language = 'de' | 'en';

export type PawnLocation =
  | { zone: 'base'; slot: number }   // 0..3 inside player's Wohnheim
  | { zone: 'track'; index: number } // 0..39 clockwise main track
  | { zone: 'goal'; slot: number };  // 0..3 inside player's Abschluss

export interface Pawn {
  id: string;
  playerIndex: number; // 0..3 (corresponds to PlayerConfig index in active players? No: seatIndex 0..3 in color order)
  color: PlayerColor;
  pawnNumber: number; // 0..3
  location: PawnLocation;
}

export type SuperpowerType = 'swap' | 'instantFinish' | 'autoWinDuel' | 'loadedSix' | 'kickToDorm';

export interface PlayerConfig {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  active: boolean; // false if 2 or 3 player game and seat is unused
  major?: string;
  emoji?: string;
  superpower?: SuperpowerType;
}

export type TurnPhase =
  | 'WAIT_ROLL'
  | 'SELECT_PAWN'
  | 'DUEL_ROLL'
  | 'DUEL_RESULT'
  | 'ACTIVITY_RESULT'
  | 'GAME_OVER';

export type ActivityType = 'mensa' | 'bib' | 'examOffice' | 'party' | 'tripleSix';

export type DuelMode = 'classic' | 'push';

export interface GameSettings {
  hardcore: boolean;
  duelMode?: DuelMode;
  ultraHardcore?: boolean;
}

export type PendingPostDuelEvent =
  | {
      kind: 'duel';
      attackerPlayerIndex: number;
      attackerPawnId: string;
      defenderPlayerIndex: number;
      defenderPawnId: string;
      trackIndex: number;
      hadSix: boolean;
    }
  | {
      kind: 'activity';
      playerIndex: number;
      pawnId: string;
      trackIndex: number;
      hadSix: boolean;
    };

export interface ActivityState {
  type: ActivityType;
  playerIndex: number;
  pawnId: string;
  outcome: 'good' | 'bad';
  stepDelta: number;
  skipTurn: boolean;
  bonusRoll: boolean;
  winGame?: boolean;
  exmatriculateAll?: boolean;
  pendingDuelOpponentId?: string;
  pendingDuelTrackIndex?: number;
  hadSix: boolean;
}

export interface DuelRound {
  attackerRoll: number;
  defenderRoll: number;
}

export interface DuelState {
  attackerPlayerIndex: number;
  attackerPawnId: string;
  defenderPlayerIndex: number;
  defenderPawnId: string;
  contestedTrackIndex: number;
  pendingAttackerRoll: number | null;
  pendingDefenderRoll: number | null;
  rounds: DuelRound[];
  winner: 'attacker' | 'defender' | null;
  attackerHadSix: boolean;
  winnerSum?: number;
  loserSum?: number;
  winnerMoved?: number;
  loserMoved?: number;
}

export interface GameLogEntry {
  id: number;
  type:
    | 'immatrikulation'
    | 'exmatrikulation'
    | 'duel_tie'
    | 'duel_win'
    | 'goal'
    | 'turn'
    | 'activity_good'
    | 'activity_bad'
    | 'turn_skipped'
    | 'superpower'
    | 'win';
  playerIndex: number;
  opponentIndex?: number;
  detail?: string;
}

export interface GameState {
  players: PlayerConfig[];
  pawns: Pawn[];
  settings: GameSettings;
  currentTurn: number; // index into players[]
  phase: TurnPhase;
  lastRoll: number | null;
  rollAttemptsInBase: number; // 0..3 when all pawns are in base
  consecutiveSixes: number; // 0..3 for Hardcore 6-6-6 rule
  skippedTurns: Record<number, number>;
  superpowerUsed?: Record<number, boolean>;
  legalPawnIds: string[];
  duel: DuelState | null;
  activity: ActivityState | null;
  queuedEvents?: PendingPostDuelEvent[];
  turnOwnerAfterQueue?: number;
  turnHadSixAfterQueue?: boolean;
  winnerIndex: number | null;
  eventLog: GameLogEntry[];
  nextLogId: number;
}

export type GameAction =
  | { type: 'ROLL_DICE'; playerIndex: number }
  | { type: 'SELECT_PAWN'; playerIndex: number; pawnId: string }
  | { type: 'DUEL_ROLL'; playerIndex: number }
  | { type: 'ACK_DUEL'; playerIndex: number }
  | { type: 'ACK_ACTIVITY'; playerIndex: number }
  | { type: 'USE_SWAP'; playerIndex: number; ownPawnId: string; targetPawnId: string }
  | { type: 'USE_INSTANT_FINISH'; playerIndex: number; pawnId: string }
  | { type: 'USE_AUTO_WIN_DUEL'; playerIndex: number }
  | { type: 'USE_LOADED_SIX'; playerIndex: number }
  | { type: 'USE_KICK_TO_DORM'; playerIndex: number; targetPawnId: string };
