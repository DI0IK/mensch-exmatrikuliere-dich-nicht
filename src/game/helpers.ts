import type { GameLogEntry, GameState, Pawn, PlayerConfig } from './types';

export type RngFn = () => number;

export function rollD6(rng: RngFn = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

export function addLog(
  state: GameState,
  entry: Omit<GameLogEntry, 'id'>
): { eventLog: GameLogEntry[]; nextLogId: number } {
  const newEntry: GameLogEntry = { ...entry, id: state.nextLogId };
  return {
    eventLog: [newEntry, ...state.eventLog].slice(0, 30),
    nextLogId: state.nextLogId + 1,
  };
}

export function nextActivePlayerIndex(players: PlayerConfig[], current: number): number {
  const len = players.length;
  for (let offset = 1; offset <= len; offset++) {
    const idx = (current + offset) % len;
    if (players[idx].active) return idx;
  }
  return current;
}

export function advanceTurnCheckingSkips(
  state: GameState,
  fromPlayerIndex: number
): {
  currentTurn: number;
  skippedTurns: Record<number, number>;
  eventLog: GameLogEntry[];
  nextLogId: number;
} {
  const nextSkipped = { ...state.skippedTurns };
  let eventLog = state.eventLog;
  let nextLogId = state.nextLogId;
  let candidate = nextActivePlayerIndex(state.players, fromPlayerIndex);

  for (let i = 0; i < state.players.length; i++) {
    const skips = nextSkipped[candidate] ?? 0;
    if (skips > 0) {
      nextSkipped[candidate] = skips - 1;
      const logged = addLog(
        { ...state, eventLog, nextLogId },
        { type: 'turn_skipped', playerIndex: candidate }
      );
      eventLog = logged.eventLog;
      nextLogId = logged.nextLogId;
      candidate = nextActivePlayerIndex(state.players, candidate);
    } else {
      break;
    }
  }

  return {
    currentTurn: candidate,
    skippedTurns: nextSkipped,
    eventLog,
    nextLogId,
  };
}

export function allPawnsInBase(pawns: Pawn[], playerIndex: number): boolean {
  return pawns
    .filter((p) => p.playerIndex === playerIndex)
    .every((p) => p.location.zone === 'base');
}

export function allPawnsInGoal(pawns: Pawn[], playerIndex: number): boolean {
  return pawns
    .filter((p) => p.playerIndex === playerIndex)
    .every((p) => p.location.zone === 'goal');
}

export function findOpenBaseSlot(pawns: Pawn[], playerIndex: number): number {
  const used = new Set(
    pawns
      .filter((p) => p.playerIndex === playerIndex && p.location.zone === 'base')
      .map((p) => (p.location as { zone: 'base'; slot: number }).slot)
  );
  for (let s = 0; s < 4; s++) {
    if (!used.has(s)) return s;
  }
  return 0;
}

export function findOpponentAtTrack(
  pawns: Pawn[],
  playerIndex: number,
  trackIndex: number
): Pawn | undefined {
  return pawns.find(
    (p) =>
      p.playerIndex !== playerIndex &&
      p.location.zone === 'track' &&
      p.location.index === trackIndex
  );
}
