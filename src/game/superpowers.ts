import { finalizeDuelOutcome } from './duels';
import { addLog, allPawnsInGoal } from './helpers';
import { getLegalPawnIds } from './movement';
import type { GameState, Language, SuperpowerType } from './types';

export interface SuperpowerMeta {
  id: SuperpowerType;
  icon: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
}

export const SUPERPOWER_LIST: SuperpowerMeta[] = [
  {
    id: 'swap',
    icon: '🔄',
    label: { de: 'Positionstausch', en: 'Position Swap' },
    description: {
      de: 'Tausche eine deiner Bahn-Figuren mit einer beliebigen gegnerischen Bahn-Figur.',
      en: 'Swap one of your track pawns with any opponent track pawn.',
    },
  },
  {
    id: 'instantFinish',
    icon: '🏁',
    label: { de: 'Direkt-Abschluss', en: 'Instant Finish' },
    description: {
      de: 'Schicke eine deiner Figuren direkt ins nächste freie Zielfeld.',
      en: 'Send one of your pawns straight to your next open goal slot.',
    },
  },
  {
    id: 'autoWinDuel',
    icon: '👑',
    label: { de: 'Duell-Garantie', en: 'Auto-Win Duel' },
    description: {
      de: 'Gewinne sofort jedes laufende 1v1-Duell (als Angreifer oder Verteidiger).',
      en: 'Instantly win any active 1v1 duel (as attacker or defender).',
    },
  },
  {
    id: 'loadedSix',
    icon: '🎲',
    label: { de: 'Wunsch-Sechs', en: 'Guaranteed 6' },
    description: {
      de: 'Erzwinge eine gewürfelte 6 zu Beginn deines Zuges.',
      en: 'Force your dice roll to be a 6 on your turn.',
    },
  },
  {
    id: 'kickToDorm',
    icon: '🥾',
    label: { de: 'Rauswurf ins Wohnheim', en: 'Kick to Dorm' },
    description: {
      de: 'Schickt 1 gegnerische Bahn-Figur sofort zurück ins Wohnheim.',
      en: 'Immediately sends 1 opponent track pawn back to their dorm.',
    },
  },
];

export const SUPERPOWER_META: Record<SuperpowerType, SuperpowerMeta> = Object.fromEntries(
  SUPERPOWER_LIST.map((s) => [s.id, s])
) as Record<SuperpowerType, SuperpowerMeta>;

export function getPlayerSuperpower(state: GameState, playerIndex: number): SuperpowerType {
  return state.players[playerIndex]?.superpower ?? 'swap';
}

export function canUseSuperpower(
  state: GameState,
  playerIndex: number,
  expected: SuperpowerType
): boolean {
  if (!state.settings.ultraHardcore) return false;
  if (state.superpowerUsed?.[playerIndex]) return false;
  return getPlayerSuperpower(state, playerIndex) === expected;
}

function markSuperpowerUsed(state: GameState, playerIndex: number): Record<number, boolean> {
  return { ...(state.superpowerUsed ?? {}), [playerIndex]: true };
}

export function applySwapSuperpower(
  state: GameState,
  playerIndex: number,
  ownPawnId: string,
  targetPawnId: string
): GameState {
  if (state.phase !== 'WAIT_ROLL' || state.currentTurn !== playerIndex) return state;
  if (!canUseSuperpower(state, playerIndex, 'swap')) return state;

  const ownPawn = state.pawns.find((p) => p.id === ownPawnId && p.playerIndex === playerIndex);
  const targetPawn = state.pawns.find((p) => p.id === targetPawnId && p.playerIndex !== playerIndex);
  if (!ownPawn || !targetPawn) return state;
  if (ownPawn.location.zone !== 'track' || targetPawn.location.zone !== 'track') return state;

  const ownLoc = ownPawn.location;
  const targetLoc = targetPawn.location;

  const updatedPawns = state.pawns.map((p) => {
    if (p.id === ownPawn.id) return { ...p, location: targetLoc };
    if (p.id === targetPawn.id) return { ...p, location: ownLoc };
    return p;
  });

  const log = addLog(state, {
    type: 'superpower',
    playerIndex,
    opponentIndex: targetPawn.playerIndex,
    detail: 'swap',
  });

  return {
    ...state,
    pawns: updatedPawns,
    superpowerUsed: markSuperpowerUsed(state, playerIndex),
    ...log,
  };
}

export function applyInstantFinishSuperpower(
  state: GameState,
  playerIndex: number,
  pawnId: string
): GameState {
  if (state.phase !== 'WAIT_ROLL' || state.currentTurn !== playerIndex) return state;
  if (!canUseSuperpower(state, playerIndex, 'instantFinish')) return state;

  const pawn = state.pawns.find((p) => p.id === pawnId && p.playerIndex === playerIndex);
  if (!pawn || pawn.location.zone === 'goal') return state;

  const usedSlots = new Set(
    state.pawns
      .filter((p) => p.playerIndex === playerIndex && p.location.zone === 'goal')
      .map((p) => (p.location as { zone: 'goal'; slot: number }).slot)
  );

  let openSlot = -1;
  for (let s = 3; s >= 0; s--) {
    if (!usedSlots.has(s)) {
      openSlot = s;
      break;
    }
  }
  if (openSlot === -1) return state;

  const updatedPawns = state.pawns.map((p) =>
    p.id === pawn.id ? { ...p, location: { zone: 'goal' as const, slot: openSlot } } : p
  );

  const spLog = addLog(state, {
    type: 'superpower',
    playerIndex,
    detail: 'instantFinish',
  });

  if (allPawnsInGoal(updatedPawns, playerIndex)) {
    const winLog = addLog({ ...state, ...spLog }, { type: 'win', playerIndex });
    return {
      ...state,
      pawns: updatedPawns,
      superpowerUsed: markSuperpowerUsed(state, playerIndex),
      phase: 'GAME_OVER',
      winnerIndex: playerIndex,
      ...winLog,
    };
  }

  return {
    ...state,
    pawns: updatedPawns,
    superpowerUsed: markSuperpowerUsed(state, playerIndex),
    ...spLog,
  };
}

export function applyAutoWinDuelSuperpower(state: GameState, playerIndex: number): GameState {
  if (state.phase !== 'DUEL_ROLL' || !state.duel) return state;
  if (!canUseSuperpower(state, playerIndex, 'autoWinDuel')) return state;

  const duel = state.duel;
  let winner: 'attacker' | 'defender';
  if (playerIndex === duel.attackerPlayerIndex) {
    winner = 'attacker';
  } else if (playerIndex === duel.defenderPlayerIndex) {
    winner = 'defender';
  } else {
    return state;
  }

  const attackerRoll = winner === 'attacker' ? 6 : 1;
  const defenderRoll = winner === 'defender' ? 6 : 1;
  const rounds = [...duel.rounds, { attackerRoll, defenderRoll }];

  const spLog = addLog(state, {
    type: 'superpower',
    playerIndex,
    detail: 'autoWinDuel',
  });

  return finalizeDuelOutcome(
    {
      ...state,
      superpowerUsed: markSuperpowerUsed(state, playerIndex),
      ...spLog,
    },
    winner,
    rounds,
    attackerRoll,
    defenderRoll
  );
}

export function applyLoadedSixSuperpower(state: GameState, playerIndex: number): GameState {
  if (state.phase !== 'WAIT_ROLL' || state.currentTurn !== playerIndex) return state;
  if (!canUseSuperpower(state, playerIndex, 'loadedSix')) return state;

  const spLog = addLog(state, {
    type: 'superpower',
    playerIndex,
    detail: 'loadedSix',
  });

  const legalPawnIds = getLegalPawnIds(state, playerIndex, 6);
  const nextConsecutiveSixes = state.settings.hardcore ? state.consecutiveSixes + 1 : 0;

  if (legalPawnIds.length > 0) {
    return {
      ...state,
      superpowerUsed: markSuperpowerUsed(state, playerIndex),
      lastRoll: 6,
      rollAttemptsInBase: 0,
      consecutiveSixes: nextConsecutiveSixes,
      legalPawnIds,
      phase: 'SELECT_PAWN',
      ...spLog,
    };
  }

  return {
    ...state,
    superpowerUsed: markSuperpowerUsed(state, playerIndex),
    lastRoll: 6,
    rollAttemptsInBase: 0,
    consecutiveSixes: nextConsecutiveSixes,
    ...spLog,
  };
}

export function applyKickToDormSuperpower(
  state: GameState,
  playerIndex: number,
  targetPawnId: string
): GameState {
  if (state.phase !== 'WAIT_ROLL' || state.currentTurn !== playerIndex) return state;
  if (!canUseSuperpower(state, playerIndex, 'kickToDorm')) return state;

  const targetPawn = state.pawns.find((p) => p.id === targetPawnId && p.playerIndex !== playerIndex);
  if (!targetPawn || targetPawn.location.zone !== 'track') return state;

  const updatedPawns = state.pawns.map((p) =>
    p.id === targetPawn.id
      ? { ...p, location: { zone: 'base' as const, slot: targetPawn.pawnNumber } }
      : p
  );

  const spLog = addLog(state, {
    type: 'superpower',
    playerIndex,
    opponentIndex: targetPawn.playerIndex,
    detail: 'kickToDorm',
  });
  const exmatLog = addLog(
    { ...state, ...spLog },
    {
      type: 'exmatrikulation',
      playerIndex,
      opponentIndex: targetPawn.playerIndex,
      detail: 'kickToDorm',
    }
  );

  return {
    ...state,
    pawns: updatedPawns,
    superpowerUsed: markSuperpowerUsed(state, playerIndex),
    ...exmatLog,
  };
}
