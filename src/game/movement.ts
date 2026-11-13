import { START_INDEX_BY_COLOR, stepsFromStart } from './boardGeometry';
import type { GameState, Pawn, PawnLocation } from './types';

/**
 * Computes the destination PawnLocation if `pawn` moves by `dice` steps, or null if illegal.
 */
export function computeTargetLocation(
  pawn: Pawn,
  dice: number,
  allPawns: Pawn[]
): PawnLocation | null {
  const ownPawns = allPawns.filter((p) => p.playerIndex === pawn.playerIndex && p.id !== pawn.id);

  if (pawn.location.zone === 'base') {
    if (dice !== 6) return null;
    const startIdx = START_INDEX_BY_COLOR[pawn.color];
    const ownOnStart = ownPawns.some(
      (p) => p.location.zone === 'track' && p.location.index === startIdx
    );
    return ownOnStart ? null : { zone: 'track', index: startIdx };
  }

  if (pawn.location.zone === 'track') {
    const traveled = stepsFromStart(pawn.color, pawn.location.index);
    const nextSteps = traveled + dice;

    if (nextSteps < 40) {
      const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + nextSteps) % 40;
      const ownAtTarget = ownPawns.some(
        (p) => p.location.zone === 'track' && p.location.index === targetIndex
      );
      return ownAtTarget ? null : { zone: 'track', index: targetIndex };
    }

    const goalSlot = nextSteps - 40;
    if (goalSlot > 3) return null;
    const blockedInGoal = ownPawns.some(
      (p) => p.location.zone === 'goal' && p.location.slot <= goalSlot
    );
    return blockedInGoal ? null : { zone: 'goal', slot: goalSlot };
  }

  const currentGoalSlot = pawn.location.slot;
  const nextSlot = currentGoalSlot + dice;
  if (nextSlot > 3) return null;
  const blockedInGoal = ownPawns.some(
    (p) =>
      p.location.zone === 'goal' &&
      p.location.slot > currentGoalSlot &&
      p.location.slot <= nextSlot
  );
  return blockedInGoal ? null : { zone: 'goal', slot: nextSlot };
}

/**
 * Returns IDs of all pawns belonging to `playerIndex` that have a legal move for `dice`.
 */
export function getLegalPawnIds(state: GameState, playerIndex: number, dice: number): string[] {
  const player = state.players[playerIndex];
  if (!player || !player.active) return [];

  const myPawns = state.pawns.filter((p) => p.playerIndex === playerIndex);
  const startIdx = START_INDEX_BY_COLOR[player.color];
  const hasBasePawn = myPawns.some((p) => p.location.zone === 'base');
  const pawnOnStart = myPawns.find(
    (p) => p.location.zone === 'track' && p.location.index === startIdx
  );

  if (dice === 6 && hasBasePawn && !pawnOnStart) {
    return myPawns.filter((p) => p.location.zone === 'base').map((p) => p.id);
  }

  if (hasBasePawn && pawnOnStart) {
    const startTarget = computeTargetLocation(pawnOnStart, dice, state.pawns);
    if (startTarget !== null) {
      return [pawnOnStart.id];
    }
  }

  return myPawns
    .filter((p) => computeTargetLocation(p, dice, state.pawns) !== null)
    .map((p) => p.id);
}

export function computeActivityDestination(
  pawn: Pawn,
  stepDelta: number,
  allPawns: Pawn[]
): PawnLocation {
  if (pawn.location.zone !== 'track' || stepDelta === 0) {
    return pawn.location;
  }

  const ownPawns = allPawns.filter((p) => p.playerIndex === pawn.playerIndex && p.id !== pawn.id);
  const traveled = stepsFromStart(pawn.color, pawn.location.index);

  if (stepDelta > 0) {
    for (let d = stepDelta; d >= 1; d--) {
      const nextSteps = traveled + d;
      if (nextSteps < 40) {
        const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + nextSteps) % 40;
        const ownAtTarget = ownPawns.some(
          (p) => p.location.zone === 'track' && p.location.index === targetIndex
        );
        if (!ownAtTarget) return { zone: 'track', index: targetIndex };
      } else {
        const goalSlot = nextSteps - 40;
        if (goalSlot <= 3) {
          const blockedInGoal = ownPawns.some(
            (p) => p.location.zone === 'goal' && p.location.slot <= goalSlot
          );
          if (!blockedInGoal) return { zone: 'goal', slot: goalSlot };
        }
      }
    }
    return pawn.location;
  }

  const minSteps = Math.max(0, traveled + stepDelta);
  for (let s = minSteps; s < traveled; s++) {
    const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + s) % 40;
    const ownAtTarget = ownPawns.some(
      (p) => p.location.zone === 'track' && p.location.index === targetIndex
    );
    if (!ownAtTarget) return { zone: 'track', index: targetIndex };
  }
  return pawn.location;
}

export function computePushDestination(
  pawn: Pawn,
  delta: number,
  allPawns: Pawn[]
): { location: PawnLocation; movedSteps: number } {
  if (pawn.location.zone !== 'track' || delta === 0) {
    return { location: pawn.location, movedSteps: 0 };
  }

  const ownPawns = allPawns.filter((p) => p.playerIndex === pawn.playerIndex && p.id !== pawn.id);
  const traveled = stepsFromStart(pawn.color, pawn.location.index);

  if (delta > 0) {
    const maxSteps = Math.min(43, traveled + delta);
    if (maxSteps >= 40) {
      const maxGoalSlot = maxSteps - 40;
      for (let slot = maxGoalSlot; slot >= 0; slot--) {
        const blockedInGoal = ownPawns.some(
          (p) => p.location.zone === 'goal' && p.location.slot <= slot
        );
        if (!blockedInGoal) {
          return { location: { zone: 'goal', slot }, movedSteps: 40 + slot - traveled };
        }
      }
    }

    const maxTrackSteps = Math.min(39, maxSteps);
    for (let s = maxTrackSteps; s >= traveled; s--) {
      const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + s) % 40;
      const ownAtTarget = ownPawns.some(
        (p) => p.location.zone === 'track' && p.location.index === targetIndex
      );
      if (!ownAtTarget) {
        return { location: { zone: 'track', index: targetIndex }, movedSteps: s - traveled };
      }
    }
    return { location: pawn.location, movedSteps: 0 };
  }

  const minSteps = Math.max(0, traveled + delta);
  for (let s = minSteps; s <= traveled; s++) {
    const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + s) % 40;
    const ownAtTarget = ownPawns.some(
      (p) => p.location.zone === 'track' && p.location.index === targetIndex
    );
    if (!ownAtTarget) {
      return { location: { zone: 'track', index: targetIndex }, movedSteps: traveled - s };
    }
  }
  return { location: pawn.location, movedSteps: 0 };
}
