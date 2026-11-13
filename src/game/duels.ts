import { triggerHardcoreActivityAtTile } from './activities';
import { ACTIVITY_TILE_MAP } from './boardGeometry';
import {
  addLog,
  advanceTurnCheckingSkips,
  allPawnsInGoal,
  findOpenBaseSlot,
  findOpponentAtTrack,
  rollD6,
  type RngFn,
} from './helpers';
import { computePushDestination } from './movement';
import type { DuelState, GameState, Pawn, PawnLocation, PendingPostDuelEvent } from './types';

export function createDuelState(params: {
  attackerPlayerIndex: number;
  attackerPawnId: string;
  defenderPlayerIndex: number;
  defenderPawnId: string;
  contestedTrackIndex: number;
  attackerHadSix: boolean;
}): DuelState {
  return {
    ...params,
    pendingAttackerRoll: null,
    pendingDefenderRoll: null,
    rounds: [],
    winner: null,
  };
}

function collectPushFollowUpEvents(
  pawns: Pawn[],
  playerIndex: number,
  pawnId: string,
  location: PawnLocation,
  hardcore: boolean
): PendingPostDuelEvent[] {
  if (location.zone !== 'track') return [];
  const trackIdx = location.index;
  const opp = findOpponentAtTrack(pawns, playerIndex, trackIdx);
  if (opp) {
    return [
      {
        kind: 'duel',
        attackerPlayerIndex: playerIndex,
        attackerPawnId: pawnId,
        defenderPlayerIndex: opp.playerIndex,
        defenderPawnId: opp.id,
        trackIndex: trackIdx,
        hadSix: false,
      },
    ];
  }
  if (hardcore && ACTIVITY_TILE_MAP[trackIdx]) {
    return [{ kind: 'activity', playerIndex, pawnId, trackIndex: trackIdx, hadSix: false }];
  }
  return [];
}

export function processNextQueuedEvent(state: GameState, rng: RngFn): GameState | null {
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
        return {
          ...state,
          duel: createDuelState({
            attackerPlayerIndex: nextEvt.attackerPlayerIndex,
            attackerPawnId: nextEvt.attackerPawnId,
            defenderPlayerIndex: nextEvt.defenderPlayerIndex,
            defenderPawnId: nextEvt.defenderPawnId,
            contestedTrackIndex: nextEvt.trackIndex,
            attackerHadSix: nextEvt.hadSix,
          }),
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

export function rollDuelDie(
  state: GameState,
  playerIndex: number,
  rng: RngFn = Math.random
): GameState {
  if (state.phase !== 'DUEL_ROLL' || !state.duel) return state;

  const duel = state.duel;
  let nextAttackerRoll = duel.pendingAttackerRoll;
  let nextDefenderRoll = duel.pendingDefenderRoll;

  if (playerIndex === duel.attackerPlayerIndex && nextAttackerRoll === null) {
    nextAttackerRoll = rollD6(rng);
  } else if (playerIndex === duel.defenderPlayerIndex && nextDefenderRoll === null) {
    nextDefenderRoll = rollD6(rng);
  } else {
    return state;
  }

  if (nextAttackerRoll === null || nextDefenderRoll === null) {
    return {
      ...state,
      duel: {
        ...duel,
        pendingAttackerRoll: nextAttackerRoll,
        pendingDefenderRoll: nextDefenderRoll,
      },
    };
  }

  const attackerRoll = nextAttackerRoll;
  const defenderRoll = nextDefenderRoll;
  const rounds = [...duel.rounds, { attackerRoll, defenderRoll }];

  if (attackerRoll === defenderRoll) {
    const log = addLog(state, {
      type: 'duel_tie',
      playerIndex: duel.attackerPlayerIndex,
      opponentIndex: duel.defenderPlayerIndex,
      detail: `${attackerRoll}:${defenderRoll}`,
    });
    return {
      ...state,
      duel: { ...duel, pendingAttackerRoll: null, pendingDefenderRoll: null, rounds },
      ...log,
    };
  }

  const winner: 'attacker' | 'defender' = attackerRoll > defenderRoll ? 'attacker' : 'defender';
  const loserPlayerIndex =
    winner === 'attacker' ? duel.defenderPlayerIndex : duel.attackerPlayerIndex;
  const loserPawnId = winner === 'attacker' ? duel.defenderPawnId : duel.attackerPawnId;
  const winnerPlayerIndex =
    winner === 'attacker' ? duel.attackerPlayerIndex : duel.defenderPlayerIndex;
  const winnerPawnId = winner === 'attacker' ? duel.attackerPawnId : duel.defenderPawnId;

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

    const newEvents: PendingPostDuelEvent[] = [
      ...collectPushFollowUpEvents(
        updatedPawns,
        winnerPlayerIndex,
        winnerPawnId,
        winnerPush.location,
        state.settings.hardcore
      ),
      ...collectPushFollowUpEvents(
        updatedPawns,
        loserPlayerIndex,
        loserPawnId,
        loserPush.location,
        state.settings.hardcore
      ),
    ];

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
      turnOwnerAfterQueue: state.turnOwnerAfterQueue ?? duel.attackerPlayerIndex,
      turnHadSixAfterQueue: state.turnHadSixAfterQueue ?? duel.attackerHadSix,
      queuedEvents: [...newEvents, ...(state.queuedEvents ?? [])],
      duel: {
        ...duel,
        pendingAttackerRoll: null,
        pendingDefenderRoll: null,
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
    duel: { ...duel, pendingAttackerRoll: null, pendingDefenderRoll: null, rounds, winner },
    ...log,
  };
}

export function resolveDuelRoll(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'DUEL_ROLL' || !state.duel) return state;
  const afterAttacker =
    state.duel.pendingAttackerRoll === null
      ? rollDuelDie(state, state.duel.attackerPlayerIndex, rng)
      : state;
  if (afterAttacker.phase !== 'DUEL_ROLL' || !afterAttacker.duel) return afterAttacker;
  return rollDuelDie(afterAttacker, afterAttacker.duel.defenderPlayerIndex, rng);
}

export function acknowledgeDuel(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'DUEL_RESULT' || !state.duel) return state;

  const turnOwner = state.turnOwnerAfterQueue ?? state.duel.attackerPlayerIndex;
  const turnHadSix = state.turnHadSixAfterQueue ?? state.duel.attackerHadSix;

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

  const queuedNext = processNextQueuedEvent(
    { ...state, turnOwnerAfterQueue: turnOwner, turnHadSixAfterQueue: turnHadSix },
    rng
  );
  if (queuedNext) return queuedNext;

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
  const hasBonusRoll = act.bonusRoll && !act.skipTurn && !act.exmatriculateAll;
  const turnOwner = hasBonusRoll
    ? act.playerIndex
    : (state.turnOwnerAfterQueue ?? act.playerIndex);
  const turnHadSix = hasBonusRoll
    ? true
    : (state.turnHadSixAfterQueue ?? act.hadSix);

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
      return {
        ...state,
        activity: null,
        phase: 'DUEL_ROLL',
        duel: createDuelState({
          attackerPlayerIndex: act.playerIndex,
          attackerPawnId: act.pawnId,
          defenderPlayerIndex: opponent.playerIndex,
          defenderPawnId: opponent.id,
          contestedTrackIndex: act.pendingDuelTrackIndex,
          attackerHadSix: turnHadSix,
        }),
      };
    }
  }

  const queuedNext = processNextQueuedEvent(
    { ...state, turnOwnerAfterQueue: turnOwner, turnHadSixAfterQueue: turnHadSix },
    rng
  );
  if (queuedNext) return queuedNext;

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
