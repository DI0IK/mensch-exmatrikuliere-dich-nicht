import { START_INDEX_BY_COLOR, stepsFromStart } from './boardGeometry';
import type { DuelState, GameLogEntry, GameState, Pawn, PawnLocation, PlayerConfig } from './types';

export type RngFn = () => number;

export function rollD6(rng: RngFn = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

export function createInitialState(players: PlayerConfig[]): GameState {
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
    currentTurn: firstTurn,
    phase: 'WAIT_ROLL',
    lastRoll: null,
    rollAttemptsInBase: 0,
    legalPawnIds: [],
    duel: null,
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
  const legalPawnIds = getLegalPawnIds(state, playerIndex, dice);

  if (legalPawnIds.length > 0) {
    return {
      ...state,
      lastRoll: dice,
      rollAttemptsInBase: 0,
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
      legalPawnIds: [],
      phase: 'WAIT_ROLL',
    };
  }

  // Turn passes to next active player (unless they rolled a 6 and somehow had no legal moves, still pass)
  const nextTurn = nextActivePlayerIndex(state.players, playerIndex);
  const log = addLog(state, { type: 'turn', playerIndex });
  return {
    ...state,
    lastRoll: dice,
    rollAttemptsInBase: 0,
    legalPawnIds: [],
    currentTurn: nextTurn,
    phase: 'WAIT_ROLL',
    ...log,
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

export function selectPawn(state: GameState, pawnId: string): GameState {
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

  const nextTurn =
    dice === 6 ? pawn.playerIndex : nextActivePlayerIndex(state.players, pawn.playerIndex);

  return {
    ...state,
    pawns: updatedPawns,
    legalPawnIds: [],
    currentTurn: nextTurn,
    phase: 'WAIT_ROLL',
    rollAttemptsInBase: 0,
    ...nextLog,
  };
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

export function acknowledgeDuel(state: GameState): GameState {
  if (state.phase !== 'DUEL_RESULT' || !state.duel) return state;

  const { attackerPlayerIndex, attackerHadSix } = state.duel;
  const nextTurn = attackerHadSix
    ? attackerPlayerIndex
    : nextActivePlayerIndex(state.players, attackerPlayerIndex);

  return {
    ...state,
    duel: null,
    currentTurn: nextTurn,
    phase: 'WAIT_ROLL',
    rollAttemptsInBase: 0,
  };
}
