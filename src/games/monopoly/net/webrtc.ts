import type { GameAction, GameSettings, GameState, PlayerConfig } from '../game/types';

export type NetMessage =
  | { kind: 'WELCOME'; assignedSeat: number; state: GameState | null }
  | { kind: 'LOBBY_SYNC'; players: PlayerConfig[]; settings: GameSettings }
  | { kind: 'STATE_SYNC'; state: GameState }
  | { kind: 'PLAYER_ACTION'; action: GameAction }
  | { kind: 'GUEST_PROFILE'; name: string; major?: string; emoji?: string }
  | { kind: 'RETURN_TO_LOBBY' }
  | { kind: 'ROOM_ERROR'; message: string };
