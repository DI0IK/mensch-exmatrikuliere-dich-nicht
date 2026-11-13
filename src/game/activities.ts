import { ACTIVITY_TILE_MAP } from './boardGeometry';
import { addLog, findOpponentAtTrack, type RngFn } from './helpers';
import { computeActivityDestination } from './movement';
import type { ActivityState, ActivityType, GameState, Pawn } from './types';

function buildActivityOutcome(
  type: Exclude<ActivityType, 'tripleSix'>,
  isGood: boolean
): { stepDelta: number; skipTurn: boolean; bonusRoll: boolean } {
  switch (type) {
    case 'mensa':
      return isGood
        ? { stepDelta: 3, skipTurn: false, bonusRoll: false }
        : { stepDelta: 0, skipTurn: true, bonusRoll: false };
    case 'bib':
      return isGood
        ? { stepDelta: 0, skipTurn: false, bonusRoll: true }
        : { stepDelta: -2, skipTurn: false, bonusRoll: false };
    case 'examOffice':
      return isGood
        ? { stepDelta: 4, skipTurn: false, bonusRoll: false }
        : { stepDelta: -4, skipTurn: false, bonusRoll: false };
    case 'party':
      return isGood
        ? { stepDelta: 2, skipTurn: false, bonusRoll: true }
        : { stepDelta: -3, skipTurn: true, bonusRoll: false };
  }
}

export function triggerTripleSixActivity(
  state: GameState,
  playerIndex: number,
  dice: number,
  rng: RngFn
): GameState {
  const win = rng() < 0.5;
  if (win) {
    const log = addLog(state, {
      type: 'activity_good',
      playerIndex,
      detail: 'tripleSix',
    });
    return {
      ...state,
      lastRoll: dice,
      rollAttemptsInBase: 0,
      consecutiveSixes: 0,
      legalPawnIds: [],
      phase: 'ACTIVITY_RESULT',
      activity: {
        type: 'tripleSix',
        playerIndex,
        pawnId: '',
        outcome: 'good',
        stepDelta: 0,
        skipTurn: false,
        bonusRoll: false,
        winGame: true,
        hadSix: false,
      },
      ...log,
    };
  }

  const resetPawns = state.pawns.map((p) =>
    p.playerIndex === playerIndex
      ? { ...p, location: { zone: 'base' as const, slot: p.pawnNumber } }
      : p
  );
  const log = addLog(state, {
    type: 'activity_bad',
    playerIndex,
    detail: 'tripleSix',
  });
  return {
    ...state,
    pawns: resetPawns,
    lastRoll: dice,
    rollAttemptsInBase: 0,
    consecutiveSixes: 0,
    legalPawnIds: [],
    phase: 'ACTIVITY_RESULT',
    activity: {
      type: 'tripleSix',
      playerIndex,
      pawnId: '',
      outcome: 'bad',
      stepDelta: 0,
      skipTurn: false,
      bonusRoll: false,
      exmatriculateAll: true,
      hadSix: false,
    },
    ...log,
  };
}

export function triggerHardcoreActivityAtTile(
  state: GameState,
  pawn: Pawn,
  trackIndex: number,
  hadSix: boolean,
  rng: RngFn
): GameState | null {
  const actType = ACTIVITY_TILE_MAP[trackIndex];
  if (!actType) return null;

  const isGood = rng() < 0.5;
  const effect = buildActivityOutcome(actType, isGood);
  const movedPawn: Pawn = { ...pawn, location: { zone: 'track', index: trackIndex } };
  const finalLoc = computeActivityDestination(movedPawn, effect.stepDelta, state.pawns);
  const finalPawns = state.pawns.map((p) =>
    p.id === pawn.id ? { ...p, location: finalLoc } : p
  );

  const pendingOpponent =
    finalLoc.zone === 'track'
      ? findOpponentAtTrack(finalPawns, pawn.playerIndex, finalLoc.index)
      : undefined;

  const nextSkipped = { ...state.skippedTurns };
  if (effect.skipTurn) {
    nextSkipped[pawn.playerIndex] = (nextSkipped[pawn.playerIndex] ?? 0) + 1;
  }

  const actLog = addLog(state, {
    type: isGood ? 'activity_good' : 'activity_bad',
    playerIndex: pawn.playerIndex,
    detail: actType,
  });

  const activity: ActivityState = {
    type: actType,
    playerIndex: pawn.playerIndex,
    pawnId: pawn.id,
    outcome: isGood ? 'good' : 'bad',
    stepDelta: effect.stepDelta,
    skipTurn: effect.skipTurn,
    bonusRoll: effect.bonusRoll,
    pendingDuelOpponentId: pendingOpponent?.id,
    pendingDuelTrackIndex:
      pendingOpponent && finalLoc.zone === 'track' ? finalLoc.index : undefined,
    hadSix,
  };

  return {
    ...state,
    pawns: finalPawns,
    skippedTurns: nextSkipped,
    legalPawnIds: [],
    phase: 'ACTIVITY_RESULT',
    activity,
    ...actLog,
  };
}
