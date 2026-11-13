import {
  BOARD_TILES,
  CHANCE_CARDS,
  CHEST_CARDS,
  GOTO_JAIL_TILE_INDEX,
  JAIL_FINE,
  PARKING_TILE_INDEX,
  STARTING_CASH,
} from './boardData';
import { acknowledgeCard } from './cards';
import {
  appendLog,
  canBuildOnTile,
  canMortgageTile,
  canSellOnTile,
  canUnmortgageTile,
  getActivePlayerCount,
  getMortgageValue,
  getUnmortgageCost,
  isOwnableTile,
  nextActivePlayer,
  roll2D6,
  shuffleIds,
  type RngFn,
} from './helpers';
import { applyCashDelta, movePlayerForward, resolveLanding, sendPlayerToJail } from './landing';
import { normalizeGameSettings } from './modes';
import {
  advanceAuctionBidder,
  createAuction,
  executeTrade,
  finalizeAuctionIfDone,
  validateTradeOffer,
} from './trading';
import type {
  GameAction,
  GameSettings,
  GameState,
  PlayerConfig,
  PlayerState,
  PropertyState,
  TradeOffer,
} from './types';

function createInitialProperties(): Record<number, PropertyState> {
  const props: Record<number, PropertyState> = {};
  for (const tile of BOARD_TILES) {
    if (isOwnableTile(tile)) {
      props[tile.index] = { ownerIndex: null, houses: 0, mortgaged: false };
    }
  }
  return props;
}

export function createInitialState(
  configs: PlayerConfig[],
  rawSettings?: Partial<GameSettings> | null,
  rng: RngFn = Math.random
): GameState {
  const settings = normalizeGameSettings(rawSettings);
  const activeConfigs = configs.filter((c) => c.active);
  const players: PlayerState[] = activeConfigs.map((c, index) => ({
    index,
    color: c.color,
    name: c.name.trim() || `Studi ${index + 1}`,
    seatType: c.seatType,
    major: c.major,
    emoji: c.emoji,
    position: 0,
    cash: STARTING_CASH,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false,
  }));

  const properties = createInitialProperties();
  let logs: GameState['logs'] = [];
  let nextLogId = 1;

  if (settings.turboStart && players.length > 0) {
    const ownableIndices = shuffleIds(
      BOARD_TILES.filter((t) => isOwnableTile(t)).map((t) => String(t.index)),
      rng
    ).map(Number);

    let cursor = 0;
    for (const p of players) {
      const dealtNamesDe: string[] = [];
      const dealtNamesEn: string[] = [];
      for (let k = 0; k < 2 && cursor < ownableIndices.length; k++) {
        const tileIdx = ownableIndices[cursor++];
        properties[tileIdx] = { ...properties[tileIdx], ownerIndex: p.index };
        dealtNamesDe.push(BOARD_TILES[tileIdx].name.de);
        dealtNamesEn.push(BOARD_TILES[tileIdx].name.en);
      }
      const res = appendLog(
        logs,
        nextLogId,
        {
          de: `Turbo-Start: ${p.name} erhält ${dealtNamesDe.join(' & ')}.`,
          en: `Turbo Start: ${p.name} receives ${dealtNamesEn.join(' & ')}.`,
        },
        p.index,
        'highlight'
      );
      logs = res.logs;
      nextLogId = res.nextLogId;
    }
  }

  const startLog = appendLog(
    logs,
    nextLogId,
    {
      de: 'Semester eröffnet! Viel Erfolg im Campus Monopoly.',
      en: 'Semester opened! Good luck in Campus Monopoly.',
    },
    undefined,
    'highlight'
  );

  return {
    players,
    properties,
    currentTurn: 0,
    phase: 'WAIT_ROLL',
    settings,
    lastDice: null,
    doublesCount: 0,
    canRollAgain: false,
    freeParkingPot: 0,
    pendingTileIndex: null,
    drawnCard: null,
    pendingTrade: null,
    auction: null,
    debtCreditorIndex: null,
    chanceDeck: shuffleIds(
      CHANCE_CARDS.map((c) => c.id),
      rng
    ),
    chestDeck: shuffleIds(
      CHEST_CARDS.map((c) => c.id),
      rng
    ),
    winnerIndex: null,
    logs: startLog.logs,
    nextLogId: startLog.nextLogId,
    turnCount: 1,
  };
}

export function rollDice(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'WAIT_ROLL') return state;

  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  if (!player || player.bankrupt) return state;

  const [d1, d2] = roll2D6(rng);
  const total = d1 + d2;
  const isDouble = d1 === d2;

  let next: GameState = { ...state, lastDice: [d1, d2] };

  if (player.inJail) {
    if (isDouble) {
      const players = next.players.map((p, i) =>
        i === playerIdx ? { ...p, inJail: false, jailTurns: 0 } : p
      );
      const log = appendLog(
        next.logs,
        next.nextLogId,
        {
          de: `${player.name} würfelt Pasch (${d1}+${d2}) und kommt aus dem Prüfungsamt frei!`,
          en: `${player.name} rolls doubles (${d1}+${d2}) and leaves Exam Office!`,
        },
        playerIdx,
        'good'
      );
      next = {
        ...next,
        players,
        canRollAgain: false,
        doublesCount: 0,
        logs: log.logs,
        nextLogId: log.nextLogId,
      };
      next = movePlayerForward(next, playerIdx, total, true);
      return resolveLanding(next, next.players[playerIdx].position, total, false, rng);
    }

    const newJailTurns = player.jailTurns + 1;
    if (newJailTurns >= 3) {
      const players = next.players.map((p, i) =>
        i === playerIdx ? { ...p, inJail: false, jailTurns: 0 } : p
      );
      next = { ...next, players, canRollAgain: false, doublesCount: 0 };
      next = applyCashDelta(next, playerIdx, -JAIL_FINE, null);
      if (next.settings.freeParkingPot) {
        next = { ...next, freeParkingPot: next.freeParkingPot + JAIL_FINE };
      }
      const log = appendLog(
        next.logs,
        next.nextLogId,
        {
          de: `${player.name} zahlt nach 3 Versuchen ${JAIL_FINE} € Strafe und rückt ${total} Felder vor.`,
          en: `${player.name} pays ${JAIL_FINE} € fine after 3 tries and moves ${total}.`,
        },
        playerIdx,
        'bad'
      );
      next = { ...next, logs: log.logs, nextLogId: log.nextLogId };
      if (next.players[playerIdx].cash < 0) {
        return { ...next, phase: 'DEBT_RECOVERY' };
      }
      next = movePlayerForward(next, playerIdx, total, true);
      return resolveLanding(next, next.players[playerIdx].position, total, false, rng);
    }

    const players = next.players.map((p, i) =>
      i === playerIdx ? { ...p, jailTurns: newJailTurns } : p
    );
    const log = appendLog(
      next.logs,
      next.nextLogId,
      {
        de: `${player.name} würfelt ${d1}+${d2} — kein Pasch (Versuch ${newJailTurns}/3).`,
        en: `${player.name} rolls ${d1}+${d2} — no doubles (Attempt ${newJailTurns}/3).`,
      },
      playerIdx,
      'neutral'
    );
    return {
      ...next,
      players,
      canRollAgain: false,
      phase: 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  const newDoublesCount = isDouble ? state.doublesCount + 1 : 0;
  if (newDoublesCount >= 3) {
    return sendPlayerToJail(next, playerIdx, '3× Pasch hintereinander!', '3 consecutive doubles!');
  }

  next = { ...next, doublesCount: newDoublesCount, canRollAgain: isDouble };

  const rollLog = appendLog(
    next.logs,
    next.nextLogId,
    {
      de: `${player.name} würfelt ${d1} + ${d2} = ${total}${isDouble ? ' (Pasch!)' : ''}.`,
      en: `${player.name} rolls ${d1} + ${d2} = ${total}${isDouble ? ' (Doubles!)' : ''}.`,
    },
    playerIdx,
    isDouble ? 'highlight' : 'neutral'
  );
  next = { ...next, logs: rollLog.logs, nextLogId: rollLog.nextLogId };

  next = movePlayerForward(next, playerIdx, total, true);
  return resolveLanding(next, next.players[playerIdx].position, total, false, rng);
}

export function payJailFine(state: GameState): GameState {
  if (state.phase !== 'WAIT_ROLL') return state;
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  if (!player || !player.inJail || player.cash < JAIL_FINE) return state;

  let next = applyCashDelta(state, playerIdx, -JAIL_FINE, null);
  next = {
    ...next,
    players: next.players.map((p, i) =>
      i === playerIdx ? { ...p, inJail: false, jailTurns: 0 } : p
    ),
    freeParkingPot: next.settings.freeParkingPot
      ? next.freeParkingPot + JAIL_FINE
      : next.freeParkingPot,
  };
  const log = appendLog(
    next.logs,
    next.nextLogId,
    {
      de: `${player.name} zahlt ${JAIL_FINE} € Kaution und ist frei!`,
      en: `${player.name} pays ${JAIL_FINE} € bail and is free!`,
    },
    playerIdx,
    'good'
  );
  return { ...next, logs: log.logs, nextLogId: log.nextLogId };
}

export function redeemJailCard(state: GameState): GameState {
  if (state.phase !== 'WAIT_ROLL') return state;
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  if (!player || !player.inJail || player.jailCards <= 0) return state;

  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, inJail: false, jailTurns: 0, jailCards: p.jailCards - 1 } : p
  );
  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${player.name} nutzt einen Krankenschein / Freikarte!`,
      en: `${player.name} uses a Medical Excuse card!`,
    },
    playerIdx,
    'good'
  );
  return { ...state, players, logs: log.logs, nextLogId: log.nextLogId };
}

export function buyProperty(state: GameState): GameState {
  if (state.phase !== 'BUY_OR_AUCTION' || state.pendingTileIndex === null) return state;
  const tile = BOARD_TILES[state.pendingTileIndex];
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  const price = tile?.price ?? 0;

  if (!tile || !player || player.cash < price) return state;

  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, cash: p.cash - price } : p
  );
  const properties = {
    ...state.properties,
    [tile.index]: { ...state.properties[tile.index], ownerIndex: playerIdx },
  };
  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${player.name} kauft ${tile.name.de} für ${price} €.`,
      en: `${player.name} buys ${tile.name.en} for ${price} €.`,
    },
    playerIdx,
    'good'
  );

  return {
    ...state,
    players,
    properties,
    pendingTileIndex: null,
    phase: 'TURN_ACTION',
    logs: log.logs,
    nextLogId: log.nextLogId,
  };
}

export function declineProperty(state: GameState): GameState {
  if (state.phase !== 'BUY_OR_AUCTION' || state.pendingTileIndex === null) return state;
  const tile = BOARD_TILES[state.pendingTileIndex];

  if (state.settings.auctions) {
    const auction = createAuction(state, tile.index);
    const log = appendLog(
      state.logs,
      state.nextLogId,
      {
        de: `Auktion gestartet für ${tile.name.de}!`,
        en: `Auction started for ${tile.name.en}!`,
      },
      undefined,
      'highlight'
    );
    return {
      ...state,
      auction,
      phase: 'AUCTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  return { ...state, pendingTileIndex: null, phase: 'TURN_ACTION' };
}

export function placeBid(state: GameState, playerIndex: number, amount: number): GameState {
  if (state.phase !== 'AUCTION' || !state.auction) return state;
  const auction = state.auction;
  const expectedBidder = auction.activeBidders[auction.currentBidderPos];
  if (playerIndex !== expectedBidder) return state;

  const bidder = state.players[playerIndex];
  if (!bidder || bidder.bankrupt || bidder.cash < amount || amount <= auction.currentBid) {
    return state;
  }

  const updatedAuction = advanceAuctionBidder({
    ...auction,
    currentBid: amount,
    highestBidder: playerIndex,
  });

  return finalizeAuctionIfDone({ ...state, auction: updatedAuction });
}

export function passBid(state: GameState, playerIndex: number): GameState {
  if (state.phase !== 'AUCTION' || !state.auction) return state;
  const auction = state.auction;
  const expectedBidder = auction.activeBidders[auction.currentBidderPos];
  if (playerIndex !== expectedBidder) return state;

  const passedPlayers = auction.passedPlayers.includes(playerIndex)
    ? auction.passedPlayers
    : [...auction.passedPlayers, playerIndex];

  const updatedAuction = advanceAuctionBidder({ ...auction, passedPlayers });
  return finalizeAuctionIfDone({ ...state, auction: updatedAuction });
}

export function buildHouse(state: GameState, tileIndex: number): GameState {
  if (state.phase !== 'TURN_ACTION' && state.phase !== 'WAIT_ROLL') return state;
  const playerIdx = state.currentTurn;
  if (!canBuildOnTile(state, playerIdx, tileIndex)) return state;

  const tile = BOARD_TILES[tileIndex];
  const cost = tile.houseCost ?? 0;
  const newHouses = state.properties[tileIndex].houses + 1;

  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, cash: p.cash - cost } : p
  );
  const properties = {
    ...state.properties,
    [tileIndex]: { ...state.properties[tileIndex], houses: newHouses },
  };
  const labelDe = newHouses === 5 ? 'einen Lehrstuhl' : `Tutorium #${newHouses}`;
  const labelEn = newHouses === 5 ? 'a Chair (Hotel)' : `Tutorial #${newHouses}`;
  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${players[playerIdx].name} baut ${labelDe} auf ${tile.name.de} (-${cost} €).`,
      en: `${players[playerIdx].name} builds ${labelEn} on ${tile.name.en} (-${cost} €).`,
    },
    playerIdx,
    'good'
  );

  return { ...state, players, properties, logs: log.logs, nextLogId: log.nextLogId };
}

export function sellHouse(state: GameState, tileIndex: number): GameState {
  if (state.phase !== 'TURN_ACTION' && state.phase !== 'WAIT_ROLL' && state.phase !== 'DEBT_RECOVERY') {
    return state;
  }
  const playerIdx = state.currentTurn;
  if (!canSellOnTile(state, playerIdx, tileIndex)) return state;

  const tile = BOARD_TILES[tileIndex];
  const refund = Math.floor((tile.houseCost ?? 0) * 0.5);
  const newHouses = state.properties[tileIndex].houses - 1;

  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, cash: p.cash + refund } : p
  );
  const properties = {
    ...state.properties,
    [tileIndex]: { ...state.properties[tileIndex], houses: newHouses },
  };
  const nextPhase =
    state.phase === 'DEBT_RECOVERY' && players[playerIdx].cash >= 0
      ? 'TURN_ACTION'
      : state.phase;

  return {
    ...state,
    players,
    properties,
    phase: nextPhase,
    debtCreditorIndex: nextPhase === 'TURN_ACTION' ? null : state.debtCreditorIndex,
  };
}

export function toggleMortgage(state: GameState, tileIndex: number): GameState {
  if (state.phase !== 'TURN_ACTION' && state.phase !== 'WAIT_ROLL' && state.phase !== 'DEBT_RECOVERY') {
    return state;
  }
  const playerIdx = state.currentTurn;
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !prop) return state;

  if (!prop.mortgaged) {
    if (!canMortgageTile(state, playerIdx, tileIndex)) return state;
    const gain = getMortgageValue(tile);
    const players = state.players.map((p, i) =>
      i === playerIdx ? { ...p, cash: p.cash + gain } : p
    );
    const properties = { ...state.properties, [tileIndex]: { ...prop, mortgaged: true } };
    const nextPhase =
      state.phase === 'DEBT_RECOVERY' && players[playerIdx].cash >= 0
        ? 'TURN_ACTION'
        : state.phase;
    return {
      ...state,
      players,
      properties,
      phase: nextPhase,
      debtCreditorIndex: nextPhase === 'TURN_ACTION' ? null : state.debtCreditorIndex,
    };
  }

  if (!canUnmortgageTile(state, playerIdx, tileIndex)) return state;
  const cost = getUnmortgageCost(tile);
  const players = state.players.map((p, i) =>
    i === playerIdx ? { ...p, cash: p.cash - cost } : p
  );
  const properties = { ...state.properties, [tileIndex]: { ...prop, mortgaged: false } };
  return { ...state, players, properties };
}

export function proposeTrade(state: GameState, offer: TradeOffer): GameState {
  if (state.phase !== 'TURN_ACTION' && state.phase !== 'WAIT_ROLL') return state;
  if (offer.fromIndex !== state.currentTurn) return state;
  if (!validateTradeOffer(state, offer)) return state;
  return { ...state, pendingTrade: offer, preTradePhase: state.phase, phase: 'TRADE_REVIEW' };
}

export function respondTrade(state: GameState, accept: boolean): GameState {
  if (state.phase !== 'TRADE_REVIEW' || !state.pendingTrade) return state;
  if (!accept) {
    const fromName = state.players[state.pendingTrade.fromIndex]?.name ?? '';
    const toName = state.players[state.pendingTrade.toIndex]?.name ?? '';
    const log = appendLog(
      state.logs,
      state.nextLogId,
      {
        de: `${toName} lehnt das Tauschangebot von ${fromName} ab.`,
        en: `${toName} declines ${fromName}'s trade offer.`,
      },
      state.pendingTrade.toIndex,
      'neutral'
    );
    return {
      ...state,
      pendingTrade: null,
      preTradePhase: undefined,
      phase: state.preTradePhase ?? 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }
  return executeTrade(state, state.pendingTrade);
}

export function declareBankruptcy(state: GameState): GameState {
  if (state.phase !== 'DEBT_RECOVERY' && state.phase !== 'TURN_ACTION') return state;
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  if (!player || player.bankrupt) return state;

  const creditorIdx = state.debtCreditorIndex;
  const players = state.players.map((p, i) => {
    if (i === playerIdx) return { ...p, cash: 0, jailCards: 0, bankrupt: true };
    if (creditorIdx !== null && i === creditorIdx) {
      return {
        ...p,
        cash: p.cash + Math.max(0, player.cash),
        jailCards: p.jailCards + player.jailCards,
      };
    }
    return p;
  });

  const properties: Record<number, PropertyState> = { ...state.properties };
  for (const tile of BOARD_TILES) {
    const prop = properties[tile.index];
    if (prop && prop.ownerIndex === playerIdx) {
      properties[tile.index] = {
        ownerIndex: creditorIdx,
        houses: 0,
        mortgaged: creditorIdx !== null ? prop.mortgaged : false,
      };
    }
  }

  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${player.name} wird exmatrikuliert (Bankrott)!`,
      en: `${player.name} is expelled (Bankrupt)!`,
    },
    playerIdx,
    'bad'
  );

  const interim: GameState = {
    ...state,
    players,
    properties,
    debtCreditorIndex: null,
    canRollAgain: false,
    doublesCount: 0,
    logs: log.logs,
    nextLogId: log.nextLogId,
  };

  if (getActivePlayerCount(interim) <= 1) {
    const winner = interim.players.find((p) => !p.bankrupt);
    return { ...interim, phase: 'GAME_OVER', winnerIndex: winner ? winner.index : null };
  }

  return {
    ...interim,
    currentTurn: nextActivePlayer(interim, playerIdx),
    phase: 'WAIT_ROLL',
    turnCount: interim.turnCount + 1,
  };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'TURN_ACTION') return state;
  const player = state.players[state.currentTurn];
  if (player && player.cash < 0) return { ...state, phase: 'DEBT_RECOVERY' };

  if (state.canRollAgain && player && !player.inJail && !player.bankrupt) {
    return { ...state, phase: 'WAIT_ROLL', canRollAgain: false };
  }

  return {
    ...state,
    currentTurn: nextActivePlayer(state, state.currentTurn),
    phase: 'WAIT_ROLL',
    doublesCount: 0,
    canRollAgain: false,
    pendingTileIndex: null,
    turnCount: state.turnCount + 1,
  };
}

export function applyGameAction(
  state: GameState,
  action: GameAction,
  rng: RngFn = Math.random
): GameState {
  switch (action.type) {
    case 'ROLL_DICE':
      return rollDice(state, rng);
    case 'PAY_JAIL':
      return payJailFine(state);
    case 'USE_JAIL_CARD':
      return redeemJailCard(state);
    case 'BUY_PROPERTY':
      return buyProperty(state);
    case 'DECLINE_PROPERTY':
      return declineProperty(state);
    case 'PLACE_BID':
      return placeBid(state, action.playerIndex, action.amount);
    case 'PASS_BID':
      return passBid(state, action.playerIndex);
    case 'ACK_CARD':
      return acknowledgeCard(state, rng);
    case 'BUILD_HOUSE':
      return buildHouse(state, action.tileIndex);
    case 'SELL_HOUSE':
      return sellHouse(state, action.tileIndex);
    case 'TOGGLE_MORTGAGE':
      return toggleMortgage(state, action.tileIndex);
    case 'PROPOSE_TRADE':
      return proposeTrade(state, action.offer);
    case 'RESPOND_TRADE':
      return respondTrade(state, action.accept);
    case 'DECLARE_BANKRUPTCY':
      return declareBankruptcy(state);
    case 'END_TURN':
      return endTurn(state);
  }
}

export { acknowledgeCard, GOTO_JAIL_TILE_INDEX, PARKING_TILE_INDEX };
