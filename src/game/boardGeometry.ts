import type { PlayerColor } from './types';

export interface GridCoord {
  row: number; // 0..10
  col: number; // 0..10
}

export const PLAYER_COLORS: PlayerColor[] = ['rot', 'blau', 'gelb', 'gruen'];

/**
 * Classic 11x11 Mensch ärgere dich nicht clockwise 40-tile track.
 * Index 0 = Rot start (row 4, col 0), moving right -> up -> right -> down -> left -> down -> left -> up.
 */
export const TRACK_COORDS: GridCoord[] = [
  // 0..4: Rot arm top row, moving right
  { row: 4, col: 0 }, // 0: Rot Start
  { row: 4, col: 1 },
  { row: 4, col: 2 },
  { row: 4, col: 3 },
  { row: 4, col: 4 },
  // 5..9: Top arm left col, moving up
  { row: 3, col: 4 },
  { row: 2, col: 4 },
  { row: 1, col: 4 },
  { row: 0, col: 4 },
  { row: 0, col: 5 }, // 9: Blau goal entry
  // 10..14: Top arm right col, moving down
  { row: 0, col: 6 }, // 10: Blau Start
  { row: 1, col: 6 },
  { row: 2, col: 6 },
  { row: 3, col: 6 },
  { row: 4, col: 6 },
  // 15..19: Right arm top row, moving right
  { row: 4, col: 7 },
  { row: 4, col: 8 },
  { row: 4, col: 9 },
  { row: 4, col: 10 },
  { row: 5, col: 10 }, // 19: Gelb goal entry
  // 20..24: Right arm bottom row, moving left
  { row: 6, col: 10 }, // 20: Gelb Start
  { row: 6, col: 9 },
  { row: 6, col: 8 },
  { row: 6, col: 7 },
  { row: 6, col: 6 },
  // 25..29: Bottom arm right col, moving down
  { row: 7, col: 6 },
  { row: 8, col: 6 },
  { row: 9, col: 6 },
  { row: 10, col: 6 },
  { row: 10, col: 5 }, // 29: Gruen goal entry
  // 30..34: Bottom arm left col, moving up
  { row: 10, col: 4 }, // 30: Gruen Start
  { row: 9, col: 4 },
  { row: 8, col: 4 },
  { row: 7, col: 4 },
  { row: 6, col: 4 },
  // 35..39: Left arm bottom row, moving left
  { row: 6, col: 3 },
  { row: 6, col: 2 },
  { row: 6, col: 1 },
  { row: 6, col: 0 },
  { row: 5, col: 0 }, // 39: Rot goal entry
];

export const START_INDEX_BY_COLOR: Record<PlayerColor, number> = {
  rot: 0,
  blau: 10,
  gelb: 20,
  gruen: 30,
};

export const BASE_COORDS_BY_COLOR: Record<PlayerColor, GridCoord[]> = {
  rot: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  blau: [
    { row: 0, col: 9 },
    { row: 0, col: 10 },
    { row: 1, col: 9 },
    { row: 1, col: 10 },
  ],
  gelb: [
    { row: 9, col: 9 },
    { row: 9, col: 10 },
    { row: 10, col: 9 },
    { row: 10, col: 10 },
  ],
  gruen: [
    { row: 9, col: 0 },
    { row: 9, col: 1 },
    { row: 10, col: 0 },
    { row: 10, col: 1 },
  ],
};

export const GOAL_COORDS_BY_COLOR: Record<PlayerColor, GridCoord[]> = {
  rot: [
    { row: 5, col: 1 },
    { row: 5, col: 2 },
    { row: 5, col: 3 },
    { row: 5, col: 4 },
  ],
  blau: [
    { row: 1, col: 5 },
    { row: 2, col: 5 },
    { row: 3, col: 5 },
    { row: 4, col: 5 },
  ],
  gelb: [
    { row: 5, col: 9 },
    { row: 5, col: 8 },
    { row: 5, col: 7 },
    { row: 5, col: 6 },
  ],
  gruen: [
    { row: 9, col: 5 },
    { row: 8, col: 5 },
    { row: 7, col: 5 },
    { row: 6, col: 5 },
  ],
};

/**
 * Returns how many steps (0..39) a pawn at `trackIndex` has traveled from its color's start tile.
 */
export function stepsFromStart(color: PlayerColor, trackIndex: number): number {
  const start = START_INDEX_BY_COLOR[color];
  return (trackIndex - start + 40) % 40;
}
