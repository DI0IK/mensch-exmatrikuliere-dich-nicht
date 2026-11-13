import {
  BOARD_TILES,
  CARD_BY_ID,
  CHANCE_CARDS,
  CHEST_CARDS,
  JAIL_TILE_INDEX,
  START_PASS_BONUS,
} from './boardData';
import {
  appendLog,
  calculateRent,
  isOwnableTile,
  shuffleIds,
  type RngFn,
} from './helpers';
import type { CardDeck, GameState } from './types';

export function sendPlayerToJail(
  state: GameState,
  playerIndex: number,
  reasonDe: string,
  reasonEn: string
): GameState {
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, position: JAIL_TILE_INDEX, inJail: true, jailTurns: 0 } : p
  );
  const playerName = players[playerIndex].name;
  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${playerName} muss ins Prüfungsamt (Sperre): ${reasonDe}`,
      en: `${playerName} goes to Exam Office (Detention): ${reasonEn}`,
    },
    playerIndex,
    'bad'
  );

  return {
    ...state,
    players,
    doublesCount: 0,
    canRollAgain: false,
    pendingTileIndex: null,
    phase: 'TURN_ACTION',
    logs: log.logs,
    nextLogId: log.nextLogId,
  };
}

export function applyCashDelta(
  state: GameState,
  playerIndex: number,
  delta: number,
  creditorIndex: number | null = null
): GameState {
  const players = state.players.map((p, i) => {
    if (i === playerIndex) {
      return { ...p, cash: p.cash + delta };
    }
    if (creditorIndex !== null && i === creditorIndex && delta < 0) {
      return { ...p, cash: p.cash + Math.abs(delta) };
    }
    return p;
  });

  const target = players[playerIndex];
  const needsDebtRecovery = target.cash < 0;

  return {
    ...state,
    players,
    debtCreditorIndex: needsDebtRecovery ? creditorIndex : null,
  };
}

export function drawCardFromDeck(
  state: GameState,
  deck: CardDeck,
  rng: RngFn = Math.random
): GameState {
  const deckKey = deck === 'chance' ? 'chanceDeck' : 'chestDeck';
  const sourceCards = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
  let queue = [...state[deckKey]];
  if (queue.length === 0) {
    queue = shuffleIds(
      sourceCards.map((c) => c.id),
      rng
    );
  }
  const [cardId, ...rest] = queue;
  const card = CARD_BY_ID[cardId] ?? sourceCards[0];
  const player = state.players[state.currentTurn];

  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${player.name} zieht „${card.title.de}“.`,
      en: `${player.name} draws "${card.title.en}".`,
    },
    state.currentTurn,
    'highlight'
  );

  return {
    ...state,
    [deckKey]: rest,
    drawnCard: card,
    phase: 'CARD_MODAL',
    logs: log.logs,
    nextLogId: log.nextLogId,
  };
}

export function movePlayerForward(
  state: GameState,
  playerIndex: number,
  steps: number,
  collectStart = true
): GameState {
  const player = state.players[playerIndex];
  const rawPos = player.position + steps;
  const wrapped = rawPos >= 40;
  const newPos = ((rawPos % 40) + 40) % 40;

  let next = {
    ...state,
    players: state.players.map((p, i) => (i === playerIndex ? { ...p, position: newPos } : p)),
  };

  if (collectStart && wrapped) {
    next = applyCashDelta(next, playerIndex, START_PASS_BONUS);
    const log = appendLog(
      next.logs,
      next.nextLogId,
      {
        de: `${player.name} zieht über Semesterstart: +200 € BAföG.`,
        en: `${player.name} passes Semester Start: +200 € BAföG.`,
      },
      playerIndex,
      'good'
    );
    next = { ...next, logs: log.logs, nextLogId: log.nextLogId };
  }

  return next;
}

export function resolveLanding(
  state: GameState,
  tileIndex: number,
  diceTotal: number,
  doubleTransit = false,
  rng: RngFn = Math.random
): GameState {
  const tile = BOARD_TILES[tileIndex];
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];

  if (!tile || !player || player.bankrupt) {
    return { ...state, phase: 'TURN_ACTION' };
  }

  if (tile.type === 'start') {
    if (state.settings.doubleOnStart) {
      const next = applyCashDelta(state, playerIdx, START_PASS_BONUS);
      const log = appendLog(
        next.logs,
        next.nextLogId,
        {
          de: `${player.name} landet exakt auf Semesterstart: +200 € Bonus (400 € gesamt)!`,
          en: `${player.name} lands directly on Semester Start: +200 € bonus (400 € total)!`,
        },
        playerIdx,
        'good'
      );
      return { ...next, phase: 'TURN_ACTION', logs: log.logs, nextLogId: log.nextLogId };
    }
    return { ...state, phase: 'TURN_ACTION' };
  }

  if (tile.type === 'jail') {
    return { ...state, phase: 'TURN_ACTION' };
  }

  if (tile.type === 'goto_jail') {
    return sendPlayerToJail(state, playerIdx, 'Zwangspause!', 'Detention!');
  }

  if (tile.type === 'parking') {
    if (state.settings.freeParkingPot && state.freeParkingPot > 0) {
      const pot = state.freeParkingPot;
      const next = applyCashDelta(state, playerIdx, pot);
      const log = appendLog(
        next.logs,
        next.nextLogId,
        {
          de: `${player.name} räumt die Campus-Kasse ab: +${pot} €!`,
          en: `${player.name} collects the Campus Pot: +${pot} €!`,
        },
        playerIdx,
        'good'
      );
      return {
        ...next,
        freeParkingPot: 0,
        phase: 'TURN_ACTION',
        logs: log.logs,
        nextLogId: log.nextLogId,
      };
    }
    return { ...state, phase: 'TURN_ACTION' };
  }

  if (tile.type === 'tax') {
    const tax = tile.taxAmount ?? 100;
    let next = applyCashDelta(state, playerIdx, -tax, null);
    if (next.settings.freeParkingPot) {
      next = { ...next, freeParkingPot: next.freeParkingPot + tax };
    }
    const log = appendLog(
      next.logs,
      next.nextLogId,
      {
        de: `${player.name} zahlt ${tax} € (${tile.name.de}).`,
        en: `${player.name} pays ${tax} € (${tile.name.en}).`,
      },
      playerIdx,
      'bad'
    );
    return {
      ...next,
      phase: next.players[playerIdx].cash < 0 ? 'DEBT_RECOVERY' : 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  if (tile.type === 'chance') {
    return drawCardFromDeck(state, 'chance', rng);
  }

  if (tile.type === 'chest') {
    return drawCardFromDeck(state, 'chest', rng);
  }

  if (isOwnableTile(tile)) {
    const prop = state.properties[tileIndex];
    if (!prop || prop.ownerIndex === null) {
      return {
        ...state,
        pendingTileIndex: tileIndex,
        phase: 'BUY_OR_AUCTION',
      };
    }

    if (prop.ownerIndex === playerIdx || prop.mortgaged) {
      return { ...state, phase: 'TURN_ACTION' };
    }

    const rent = calculateRent(state, tileIndex, diceTotal, doubleTransit);
    const owner = state.players[prop.ownerIndex];
    const next = applyCashDelta(state, playerIdx, -rent, prop.ownerIndex);
    const log = appendLog(
      next.logs,
      next.nextLogId,
      {
        de: `${player.name} zahlt ${rent} € Miete an ${owner.name} (${tile.name.de}).`,
        en: `${player.name} pays ${rent} € rent to ${owner.name} (${tile.name.en}).`,
      },
      playerIdx,
      'bad'
    );
    return {
      ...next,
      phase: next.players[playerIdx].cash < 0 ? 'DEBT_RECOVERY' : 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  return { ...state, phase: 'TURN_ACTION' };
}
