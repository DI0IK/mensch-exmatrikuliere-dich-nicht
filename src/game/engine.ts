import { triggerHardcoreActivityAtTile, triggerTripleSixActivity } from './activities';
import { createDuelState } from './duels';
import {
  addLog,
  advanceTurnCheckingSkips,
  allPawnsInBase,
  allPawnsInGoal,
  findOpponentAtTrack,
  rollD6,
  type RngFn,
} from './helpers';
import { normalizeGameSettings } from './modes';
import { computeTargetLocation, getLegalPawnIds } from './movement';
import type { GameSettings, GameState, Pawn, PlayerConfig } from './types';

export { acknowledgeActivity, acknowledgeDuel, resolveDuelRoll, rollDuelDie } from './duels';
export { allPawnsInBase, allPawnsInGoal, nextActivePlayerIndex, rollD6, type RngFn } from './helpers';
export { computeTargetLocation, getLegalPawnIds } from './movement';

export function createInitialState(
  players: PlayerConfig[],
  settings?: Partial<GameSettings>
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

  return {
    players,
    pawns,
    settings: normalizeGameSettings(settings),
    currentTurn: players.findIndex((p) => p.active),
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

export function rollDice(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'WAIT_ROLL') return state;

  const playerIndex = state.currentTurn;
  const dice = rollD6(rng);
  const nextConsecutiveSixes =
    state.settings.hardcore && dice === 6 ? state.consecutiveSixes + 1 : 0;

  if (state.settings.hardcore && nextConsecutiveSixes >= 3) {
    return triggerTripleSixActivity(state, playerIndex, dice, rng);
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
  const opponentAtTarget =
    target.zone === 'track'
      ? findOpponentAtTrack(state.pawns, pawn.playerIndex, target.index)
      : undefined;

  if (opponentAtTarget && target.zone === 'track') {
    const updatedPawns = state.pawns.map((p) =>
      p.id === pawn.id ? { ...p, location: target } : p
    );
    const log = wasInBase
      ? addLog(state, { type: 'immatrikulation', playerIndex: pawn.playerIndex })
      : { eventLog: state.eventLog, nextLogId: state.nextLogId };

    return {
      ...state,
      pawns: updatedPawns,
      legalPawnIds: [],
      phase: 'DUEL_ROLL',
      duel: createDuelState({
        attackerPlayerIndex: pawn.playerIndex,
        attackerPawnId: pawn.id,
        defenderPlayerIndex: opponentAtTarget.playerIndex,
        defenderPawnId: opponentAtTarget.id,
        contestedTrackIndex: target.index,
        attackerHadSix: dice === 6,
      }),
      ...log,
    };
  }

  const updatedPawns = state.pawns.map((p) =>
    p.id === pawn.id ? { ...p, location: target } : p
  );

  let nextLog = { eventLog: state.eventLog, nextLogId: state.nextLogId };
  if (wasInBase) {
    nextLog = addLog(state, { type: 'immatrikulation', playerIndex: pawn.playerIndex });
  } else if (target.zone === 'goal' && pawn.location.zone !== 'goal') {
    nextLog = addLog(state, { type: 'goal', playerIndex: pawn.playerIndex });
  }

  if (state.settings.hardcore && target.zone === 'track') {
    const actState = triggerHardcoreActivityAtTile(
      { ...state, pawns: updatedPawns, ...nextLog },
      { ...pawn, location: target },
      target.index,
      dice === 6,
      rng
    );
    if (actState) return actState;
  }

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
