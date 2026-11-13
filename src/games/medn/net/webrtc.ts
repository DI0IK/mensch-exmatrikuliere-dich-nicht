import type { GameAction, GameSettings, GameState, PlayerConfig, SuperpowerType } from '../game/types';

export type NetMessage =
  | { kind: 'WELCOME'; assignedSeat: number; state: GameState | null }
  | { kind: 'LOBBY_SYNC'; players: PlayerConfig[]; settings?: GameSettings }
  | { kind: 'SET_NAME'; name: string }
  | { kind: 'SET_PROFILE'; major?: string; emoji?: string; superpower?: SuperpowerType | 'random' }
  | { kind: 'STATE_SYNC'; state: GameState }
  | { kind: 'RETURN_TO_LOBBY' }
  | { kind: 'LEAVE_GAME' }
  | { kind: 'ROOM_ERROR'; message: string }
  | { kind: 'PLAYER_ACTION'; action: GameAction };
