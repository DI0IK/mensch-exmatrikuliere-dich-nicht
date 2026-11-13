import { ACTIVITY_TILE_MAP, START_INDEX_BY_COLOR, stepsFromStart } from './boardGeometry';
import type {
  ActivityState,
  ActivityType,
  DuelState,
  GameLogEntry,
  GameSettings,
  GameState,
  Pawn,
  PawnLocation,
  PendingPostDuelEvent,
  PlayerConfig,
} from './types';

export type RngFn = () => number;

export function rollD6(rng: RngFn = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

export function createInitialState(
  players: PlayerConfig[],
  settings: GameSettings = { hardcore: false, duelMode: 'classic' }
): GameState {
  const activePlayers = players.filter((p) => p.active);
  if (activePlayers.length < 2 || activePlayers.length > 4) {
    throw new Error('Game requires between 2 and 4 active players.');
  }

  const pawns: Pawn[] = [];
  players.forEach((player, playerIndex) => {
    if (!player.active) return;
    for (let i = 0; i < 4; i++) {
      pawns.push({
        id: `${player.color}-${i}`,
        playerIndex,
        color: player.color,
        pawnNumber: i,
        location: { zone: 'base', slot: i },
      });
    }
  });

  const firstTurn = players.findIndex((p) => p.active);

  return {
    players,
    pawns,
    settings: {
      hardcore: settings.hardcore,
      duelMode: settings.duelMode ?? 'classic',
    },
    currentTurn: firstTurn,
    phase: 'WAIT_ROLL',
    lastRoll: null,
    rollAttemptsInBase: 0,
    consecutiveSixes: 0,
    skippedTurns: {},
    legalPawnIds: [],
    duel: null,
    activity: null,
    queuedEvents: [],
    winnerIndex: null,
    eventLog: [],
    nextLogId: 1,
  };
}

function addLog(
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

function advanceTurnCheckingSkips(
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
      const logged = addLog({ ...state, eventLog, nextLogId }, { type: 'turn_skipped', playerIndex: candidate });
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
    if (ownOnStart) return null;
    return { zone: 'track', index: startIdx };
  }

  if (pawn.location.zone === 'track') {
    const traveled = stepsFromStart(pawn.color, pawn.location.index);
    const nextSteps = traveled + dice;

    if (nextSteps < 40) {
      const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + nextSteps) % 40;
      const ownAtTarget = ownPawns.some(
        (p) => p.location.zone === 'track' && p.location.index === targetIndex
      );
      if (ownAtTarget) return null;
      return { zone: 'track', index: targetIndex };
    }

    const goalSlot = nextSteps - 40;
    if (goalSlot > 3) return null; // Overshot goal
    // Cannot land on or jump over own pawns in goal stretch
    const blockedInGoal = ownPawns.some(
      (p) => p.location.zone === 'goal' && p.location.slot <= goalSlot
    );
    if (blockedInGoal) return null;
    return { zone: 'goal', slot: goalSlot };
  }

  // Already in goal
  const currentGoalSlot = pawn.location.slot;
  const nextSlot = currentGoalSlot + dice;
  if (nextSlot > 3) return null;
  const blockedInGoal = ownPawns.some(
    (p) =>
      p.location.zone === 'goal' &&
      p.location.slot > currentGoalSlot &&
      p.location.slot <= nextSlot
  );
  if (blockedInGoal) return null;
  return { zone: 'goal', slot: nextSlot };
}

/**
 * Returns IDs of all pawns belonging to `playerIndex` that have a legal move for `dice`.
 * Enforces standard MÄDN rules:
 * 1. If a player has pawns in base and rolled a 6, and their start tile is free, they MUST immatriculate.
 * 2. If their start tile is occupied by their own pawn and they still have pawns in base, they MUST move the pawn off the start tile first (if possible).
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

  // Rule 1: Rolled 6 with pawns in base and empty start tile -> must immatriculate
  if (dice === 6 && hasBasePawn && !pawnOnStart) {
    return myPawns.filter((p) => p.location.zone === 'base').map((p) => p.id);
  }

  // Rule 2: Own pawn on start tile while pawns remain in base -> must clear start tile if legal
  if (hasBasePawn && pawnOnStart) {
    const startTarget = computeTargetLocation(pawnOnStart, dice, state.pawns);
    if (startTarget !== null) {
      return [pawnOnStart.id];
    }
  }

  // Otherwise, any pawn with a valid target location
  return myPawns
    .filter((p) => computeTargetLocation(p, dice, state.pawns) !== null)
    .map((p) => p.id);
}

export function rollDice(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'WAIT_ROLL') return state;

  const playerIndex = state.currentTurn;
  const dice = rollD6(rng);
  const nextConsecutiveSixes =
    state.settings.hardcore && dice === 6 ? state.consecutiveSixes + 1 : 0;

  // Hardcore 6-6-6 Sudden Death: 50% instant win, 50% all pawns exmatriculated to base
  if (state.settings.hardcore && nextConsecutiveSixes >= 3) {
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

  const legalPawnIds = getLegalPawnIds(state, playerIndex, dice);

  if (legalPawnIds.length > 0) {
    return {
      ...state,
      lastRoll: dice,
      rollAttemptsInBase: 0,
      consecutiveSixes: nextConsecutiveSixes,
      legalPawnIds,
      phase: 'SELECT_PAWN',
    };
  }

  // No legal moves
  const inBaseOnly = allPawnsInBase(state.pawns, playerIndex);
  if (inBaseOnly && dice !== 6 && state.rollAttemptsInBase + 1 < 3) {
    return {
      ...state,
      lastRoll: dice,
      rollAttemptsInBase: state.rollAttemptsInBase + 1,
      consecutiveSixes: nextConsecutiveSixes,
      legalPawnIds: [],
      phase: 'WAIT_ROLL',
    };
  }

  // Turn passes to next active player
  const logged = addLog(state, { type: 'turn', playerIndex });
  const advanced = advanceTurnCheckingSkips({ ...state, ...logged }, playerIndex);
  return {
    ...state,
    lastRoll: dice,
    rollAttemptsInBase: 0,
    consecutiveSixes: 0,
    legalPawnIds: [],
    phase: 'WAIT_ROLL',
    ...advanced,
  };
}

function findOpenBaseSlot(pawns: Pawn[], playerIndex: number): number {
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

function computeActivityDestination(
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
        if (!ownAtTarget) {
          return { zone: 'track', index: targetIndex };
        }
      } else {
        const goalSlot = nextSteps - 40;
        if (goalSlot <= 3) {
          const blockedInGoal = ownPawns.some(
            (p) => p.location.zone === 'goal' && p.location.slot <= goalSlot
          );
          if (!blockedInGoal) {
            return { zone: 'goal', slot: goalSlot };
          }
        }
      }
    }
    return pawn.location;
  }

  // Negative stepDelta: clamp at 0 (start tile), step toward current position if own pawn blocks
  const minSteps = Math.max(0, traveled + stepDelta);
  for (let s = minSteps; s < traveled; s++) {
    const targetIndex = (START_INDEX_BY_COLOR[pawn.color] + s) % 40;
    const ownAtTarget = ownPawns.some(
      (p) => p.location.zone === 'track' && p.location.index === targetIndex
    );
    if (!ownAtTarget) {
      return { zone: 'track', index: targetIndex };
    }
  }
  return pawn.location;
}

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

export function selectPawn(
  state: GameState,
  pawnId: string,
  rng: RngFn = Math.random
): GameState {
  if (state.phase !== 'SELECT_PAWN' || state.lastRoll === null) return state;
  if (!state.legalPawnIds.includes(pawnId)) return state;

  const pawn = state.pawns.find((p) => p.id === pawnId);
  if (!pawn) return state;

  const dice = state.lastRoll;
  const target = computeTargetLocation(pawn, dice, state.pawns);
  if (!target) return state;

  const wasInBase = pawn.location.zone === 'base';

  // Check if an opponent pawn occupies the target track tile
  const opponentAtTarget =
    target.zone === 'track'
      ? state.pawns.find(
          (p) =>
            p.playerIndex !== pawn.playerIndex &&
            p.location.zone === 'track' &&
            p.location.index === target.index
        )
      : undefined;

  if (opponentAtTarget && target.zone === 'track') {
    // Move attacker to the contested tile temporarily and initiate 1v1 Exmatriculation Duel!
    const updatedPawns = state.pawns.map((p) =>
      p.id === pawn.id ? { ...p, location: target } : p
    );
    const duel: DuelState = {
      attackerPlayerIndex: pawn.playerIndex,
      attackerPawnId: pawn.id,
      defenderPlayerIndex: opponentAtTarget.playerIndex,
      defenderPawnId: opponentAtTarget.id,
      contestedTrackIndex: target.index,
      rounds: [],
      winner: null,
      attackerHadSix: dice === 6,
    };

    const log = wasInBase
      ? addLog(state, { type: 'immatrikulation', playerIndex: pawn.playerIndex })
      : { eventLog: state.eventLog, nextLogId: state.nextLogId };

    return {
      ...state,
      pawns: updatedPawns,
      legalPawnIds: [],
      phase: 'DUEL_ROLL',
      duel,
      ...log,
    };
  }

  // Normal non-duel move
  const updatedPawns = state.pawns.map((p) =>
    p.id === pawn.id ? { ...p, location: target } : p
  );

  let nextLog = { eventLog: state.eventLog, nextLogId: state.nextLogId };
  if (wasInBase) {
    nextLog = addLog(state, { type: 'immatrikulation', playerIndex: pawn.playerIndex });
  } else if (target.zone === 'goal' && pawn.location.zone !== 'goal') {
    nextLog = addLog(state, { type: 'goal', playerIndex: pawn.playerIndex });
  }

  // Hardcore Mode automatic activity field trigger
  if (state.settings.hardcore && target.zone === 'track') {
    const actType = ACTIVITY_TILE_MAP[target.index];
    if (actType) {
      const isGood = rng() < 0.5;
      const effect = buildActivityOutcome(actType, isGood);
      const movedPawn: Pawn = { ...pawn, location: target };
      const finalLoc = computeActivityDestination(movedPawn, effect.stepDelta, updatedPawns);
      const finalPawns = updatedPawns.map((p) =>
        p.id === pawn.id ? { ...p, location: finalLoc } : p
      );

      const pendingOpponent =
        finalLoc.zone === 'track'
          ? finalPawns.find(
              (p) =>
                p.playerIndex !== pawn.playerIndex &&
                p.location.zone === 'track' &&
                p.location.index === finalLoc.index
            )
          : undefined;

      const nextSkipped = { ...state.skippedTurns };
      if (effect.skipTurn) {
        nextSkipped[pawn.playerIndex] = (nextSkipped[pawn.playerIndex] ?? 0) + 1;
      }

      const actLog = addLog(
        { ...state, ...nextLog },
        {
          type: isGood ? 'activity_good' : 'activity_bad',
          playerIndex: pawn.playerIndex,
          detail: actType,
        }
      );

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
        hadSix: dice === 6,
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
  }

  // Check victory
  if (allPawnsInGoal(updatedPawns, pawn.playerIndex)) {
    const winLog = addLog(
      { ...state, ...nextLog },
      { type: 'win', playerIndex: pawn.playerIndex }
    );
    return {
      ...state,
      pawns: updatedPawns,
      legalPawnIds: [],
      phase: 'GAME_OVER',
      winnerIndex: pawn.playerIndex,
      ...winLog,
    };
  }

  if (dice === 6) {
    return {
      ...state,
      pawns: updatedPawns,
      legalPawnIds: [],
      currentTurn: pawn.playerIndex,
      phase: 'WAIT_ROLL',
      rollAttemptsInBase: 0,
      ...nextLog,
    };
  }

  const advanced = advanceTurnCheckingSkips({ ...state, ...nextLog }, pawn.playerIndex);
  return {
    ...state,
    pawns: updatedPawns,
    legalPawnIds: [],
    consecutiveSixes: 0,
    phase: 'WAIT_ROLL',
    rollAttemptsInBase: 0,
    ...advanced,
  };
}

function computePushDestination(
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
          return {
            location: { zone: 'goal', slot },
            movedSteps: 40 + slot - traveled,
          };
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
        return {
          location: { zone: 'track', index: targetIndex },
          movedSteps: s - traveled,
        };
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
      return {
        location: { zone: 'track', index: targetIndex },
        movedSteps: traveled - s,
      };
    }
  }
  return { location: pawn.location, movedSteps: 0 };
}

function triggerHardcoreActivityAtTile(
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
      ? finalPawns.find(
          (p) =>
            p.playerIndex !== pawn.playerIndex &&
            p.location.zone === 'track' &&
            p.location.index === finalLoc.index
        )
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

function processNextQueuedEvent(state: GameState, rng: RngFn): GameState | null {
  const queue = [...(state.queuedEvents ?? [])];
  while (queue.length > 0) {
    const nextEvt = queue.shift()!;
    if (nextEvt.kind === 'duel') {
      const attacker = state.pawns.find((p) => p.id === nextEvt.attackerPawnId);
      const defender = state.pawns.find((p) => p.id === nextEvt.defenderPawnId);
      if (
        attacker &&
        defender &&
        attacker.location.zone === 'track' &&
        defender.location.zone === 'track' &&
        attacker.location.index === nextEvt.trackIndex &&
        defender.location.index === nextEvt.trackIndex
      ) {
        const duel: DuelState = {
          attackerPlayerIndex: nextEvt.attackerPlayerIndex,
          attackerPawnId: nextEvt.attackerPawnId,
          defenderPlayerIndex: nextEvt.defenderPlayerIndex,
          defenderPawnId: nextEvt.defenderPawnId,
          contestedTrackIndex: nextEvt.trackIndex,
          rounds: [],
          winner: null,
          attackerHadSix: nextEvt.hadSix,
        };
        return {
          ...state,
          duel,
          activity: null,
          queuedEvents: queue,
          phase: 'DUEL_ROLL',
        };
      }
    } else if (nextEvt.kind === 'activity') {
      const pawn = state.pawns.find((p) => p.id === nextEvt.pawnId);
      if (pawn && pawn.location.zone === 'track' && pawn.location.index === nextEvt.trackIndex) {
        const actState = triggerHardcoreActivityAtTile(
          { ...state, duel: null, queuedEvents: queue },
          pawn,
          nextEvt.trackIndex,
          nextEvt.hadSix,
          rng
        );
        if (actState) return actState;
      }
    }
  }
  return null;
}

export function resolveDuelRoll(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'DUEL_ROLL' || !state.duel) return state;

  const attackerRoll = rollD6(rng);
  const defenderRoll = rollD6(rng);
  const rounds = [...state.duel.rounds, { attackerRoll, defenderRoll }];

  if (attackerRoll === defenderRoll) {
    const log = addLog(state, {
      type: 'duel_tie',
      playerIndex: state.duel.attackerPlayerIndex,
      opponentIndex: state.duel.defenderPlayerIndex,
      detail: `${attackerRoll}:${defenderRoll}`,
    });
    return {
      ...state,
      duel: { ...state.duel, rounds },
      ...log,
    };
  }

  const winner: 'attacker' | 'defender' = attackerRoll > defenderRoll ? 'attacker' : 'defender';
  const loserPlayerIndex =
    winner === 'attacker' ? state.duel.defenderPlayerIndex : state.duel.attackerPlayerIndex;
  const loserPawnId =
    winner === 'attacker' ? state.duel.defenderPawnId : state.duel.attackerPawnId;
  const winnerPlayerIndex =
    winner === 'attacker' ? state.duel.attackerPlayerIndex : state.duel.defenderPlayerIndex;
  const winnerPawnId =
    winner === 'attacker' ? state.duel.attackerPawnId : state.duel.defenderPawnId;

  if (state.settings.duelMode === 'push') {
    const attackerSum = rounds.reduce((acc, r) => acc + r.attackerRoll, 0);
    const defenderSum = rounds.reduce((acc, r) => acc + r.defenderRoll, 0);
    const winnerSum = winner === 'attacker' ? attackerSum : defenderSum;
    const loserSum = winner === 'attacker' ? defenderSum : attackerSum;

    const loserPawn = state.pawns.find((p) => p.id === loserPawnId)!;
    const loserPush = computePushDestination(loserPawn, -winnerSum, state.pawns);
    let updatedPawns = state.pawns.map((p) =>
      p.id === loserPawnId ? { ...p, location: loserPush.location } : p
    );

    const winnerPawn = updatedPawns.find((p) => p.id === winnerPawnId)!;
    const winnerPush = computePushDestination(winnerPawn, loserSum, updatedPawns);
    updatedPawns = updatedPawns.map((p) =>
      p.id === winnerPawnId ? { ...p, location: winnerPush.location } : p
    );

    const newEvents: PendingPostDuelEvent[] = [];
    if (winnerPush.location.zone === 'track') {
      const winnerTrackIdx = winnerPush.location.index;
      const opp = updatedPawns.find(
        (p) =>
          p.playerIndex !== winnerPlayerIndex &&
          p.location.zone === 'track' &&
          p.location.index === winnerTrackIdx
      );
      if (opp) {
        newEvents.push({
          kind: 'duel',
          attackerPlayerIndex: winnerPlayerIndex,
          attackerPawnId: winnerPawnId,
          defenderPlayerIndex: opp.playerIndex,
          defenderPawnId: opp.id,
          trackIndex: winnerTrackIdx,
          hadSix: false,
        });
      } else if (state.settings.hardcore && ACTIVITY_TILE_MAP[winnerTrackIdx]) {
        newEvents.push({
          kind: 'activity',
          playerIndex: winnerPlayerIndex,
          pawnId: winnerPawnId,
          trackIndex: winnerTrackIdx,
          hadSix: false,
        });
      }
    }

    if (loserPush.location.zone === 'track') {
      const loserTrackIdx = loserPush.location.index;
      const opp = updatedPawns.find(
        (p) =>
          p.playerIndex !== loserPlayerIndex &&
          p.location.zone === 'track' &&
          p.location.index === loserTrackIdx
      );
      if (opp) {
        newEvents.push({
          kind: 'duel',
          attackerPlayerIndex: loserPlayerIndex,
          attackerPawnId: loserPawnId,
          defenderPlayerIndex: opp.playerIndex,
          defenderPawnId: opp.id,
          trackIndex: loserTrackIdx,
          hadSix: false,
        });
      } else if (state.settings.hardcore && ACTIVITY_TILE_MAP[loserTrackIdx]) {
        newEvents.push({
          kind: 'activity',
          playerIndex: loserPlayerIndex,
          pawnId: loserPawnId,
          trackIndex: loserTrackIdx,
          hadSix: false,
        });
      }
    }

    const log = addLog(state, {
      type: 'duel_win',
      playerIndex: winnerPlayerIndex,
      opponentIndex: loserPlayerIndex,
      detail: `${attackerSum}:${defenderSum}`,
    });

    return {
      ...state,
      pawns: updatedPawns,
      phase: 'DUEL_RESULT',
      turnOwnerAfterQueue: state.turnOwnerAfterQueue ?? state.duel.attackerPlayerIndex,
      turnHadSixAfterQueue: state.turnHadSixAfterQueue ?? state.duel.attackerHadSix,
      queuedEvents: [...newEvents, ...(state.queuedEvents ?? [])],
      duel: {
        ...state.duel,
        rounds,
        winner,
        winnerSum,
        loserSum,
        winnerMoved: winnerPush.movedSteps,
        loserMoved: loserPush.movedSteps,
      },
      ...log,
    };
  }

  const openSlot = findOpenBaseSlot(state.pawns, loserPlayerIndex);
  const updatedPawns = state.pawns.map((p) =>
    p.id === loserPawnId ? { ...p, location: { zone: 'base' as const, slot: openSlot } } : p
  );

  const log = addLog(state, {
    type: 'exmatrikulation',
    playerIndex: winnerPlayerIndex,
    opponentIndex: loserPlayerIndex,
    detail: `${attackerRoll}:${defenderRoll}`,
  });

  return {
    ...state,
    pawns: updatedPawns,
    phase: 'DUEL_RESULT',
    duel: {
      ...state.duel,
      rounds,
      winner,
    },
    ...log,
  };
}

export function acknowledgeDuel(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'DUEL_RESULT' || !state.duel) return state;

  const turnOwner = state.turnOwnerAfterQueue ?? state.duel.attackerPlayerIndex;
  const turnHadSix = state.turnHadSixAfterQueue ?? state.duel.attackerHadSix;

  // Check if any player won via push into goal
  for (let idx = 0; idx < state.players.length; idx++) {
    if (state.players[idx].active && allPawnsInGoal(state.pawns, idx)) {
      const winLog = addLog(state, { type: 'win', playerIndex: idx });
      return {
        ...state,
        duel: null,
        queuedEvents: [],
        turnOwnerAfterQueue: undefined,
        turnHadSixAfterQueue: undefined,
        phase: 'GAME_OVER',
        winnerIndex: idx,
        ...winLog,
      };
    }
  }

  // Process any queued chain duel or Hardcore activity
  const queuedNext = processNextQueuedEvent(
    { ...state, turnOwnerAfterQueue: turnOwner, turnHadSixAfterQueue: turnHadSix },
    rng
  );
  if (queuedNext) {
    return queuedNext;
  }

  if (turnHadSix) {
    return {
      ...state,
      duel: null,
      queuedEvents: [],
      turnOwnerAfterQueue: undefined,
      turnHadSixAfterQueue: undefined,
      currentTurn: turnOwner,
      phase: 'WAIT_ROLL',
      rollAttemptsInBase: 0,
    };
  }

  const advanced = advanceTurnCheckingSkips(state, turnOwner);
  return {
    ...state,
    duel: null,
    queuedEvents: [],
    turnOwnerAfterQueue: undefined,
    turnHadSixAfterQueue: undefined,
    consecutiveSixes: 0,
    phase: 'WAIT_ROLL',
    rollAttemptsInBase: 0,
    ...advanced,
  };
}

export function acknowledgeActivity(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'ACTIVITY_RESULT' || !state.activity) return state;

  const act = state.activity;
  const turnOwner = state.turnOwnerAfterQueue ?? act.playerIndex;
  const turnHadSix = state.turnHadSixAfterQueue ?? (act.hadSix || act.bonusRoll);

  if (act.winGame || allPawnsInGoal(state.pawns, act.playerIndex)) {
    const winLog = addLog(state, { type: 'win', playerIndex: act.playerIndex });
    return {
      ...state,
      activity: null,
      queuedEvents: [],
      turnOwnerAfterQueue: undefined,
      turnHadSixAfterQueue: undefined,
      phase: 'GAME_OVER',
      winnerIndex: act.playerIndex,
      ...winLog,
    };
  }

  if (act.pendingDuelOpponentId && act.pendingDuelTrackIndex !== undefined) {
    const opponent = state.pawns.find((p) => p.id === act.pendingDuelOpponentId);
    if (opponent) {
      const duel: DuelState = {
        attackerPlayerIndex: act.playerIndex,
        attackerPawnId: act.pawnId,
        defenderPlayerIndex: opponent.playerIndex,
        defenderPawnId: opponent.id,
        contestedTrackIndex: act.pendingDuelTrackIndex,
        rounds: [],
        winner: null,
        attackerHadSix: turnHadSix,
      };
      return {
        ...state,
        activity: null,
        phase: 'DUEL_ROLL',
        duel,
      };
    }
  }

  const queuedNext = processNextQueuedEvent(state, rng);
  if (queuedNext) {
    return queuedNext;
  }

  if (turnHadSix && !act.skipTurn && !act.exmatriculateAll) {
    return {
      ...state,
      activity: null,
      queuedEvents: [],
      turnOwnerAfterQueue: undefined,
      turnHadSixAfterQueue: undefined,
      currentTurn: turnOwner,
      phase: 'WAIT_ROLL',
      rollAttemptsInBase: 0,
    };
  }

  const advanced = advanceTurnCheckingSkips(state, turnOwner);
  return {
    ...state,
    activity: null,
    queuedEvents: [],
    turnOwnerAfterQueue: undefined,
    turnHadSixAfterQueue: undefined,
    consecutiveSixes: 0,
    phase: 'WAIT_ROLL',
    rollAttemptsInBase: 0,
    ...advanced,
  };
}
