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

export interface PlayerConfig {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  active: boolean; // false if 2 or 3 player game and seat is unused
}

export type TurnPhase =
  | 'WAIT_ROLL'
  | 'SELECT_PAWN'
  | 'DUEL_ROLL'
  | 'DUEL_RESULT'
  | 'GAME_OVER';

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
  rounds: DuelRound[];
  winner: 'attacker' | 'defender' | null;
  attackerHadSix: boolean;
}

export interface GameLogEntry {
  id: number;
  type: 'immatrikulation' | 'exmatrikulation' | 'duel_tie' | 'duel_win' | 'goal' | 'turn' | 'win';
  playerIndex: number;
  opponentIndex?: number;
  detail?: string;
}

export interface GameState {
  players: PlayerConfig[];
  pawns: Pawn[];
  currentTurn: number; // index into players[]
  phase: TurnPhase;
  lastRoll: number | null;
  rollAttemptsInBase: number; // 0..3 when all pawns are in base
  legalPawnIds: string[];
  duel: DuelState | null;
  winnerIndex: number | null;
  eventLog: GameLogEntry[];
  nextLogId: number;
}

export type GameAction =
  | { type: 'ROLL_DICE'; playerIndex: number }
  | { type: 'SELECT_PAWN'; playerIndex: number; pawnId: string }
  | { type: 'DUEL_ROLL'; playerIndex: number }
  | { type: 'ACK_DUEL'; playerIndex: number };
