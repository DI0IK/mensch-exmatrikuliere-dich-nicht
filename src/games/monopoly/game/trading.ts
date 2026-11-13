import { BOARD_TILES } from './boardData';
import { appendLog, getMortgageValue, getUnmortgageCost, groupHasBuildings, ownsFullGroup } from './helpers';
import type { AuctionState, GameState, TradeOffer } from './types';

export function isPropertyTradeable(state: GameState, ownerIndex: number, tileIndex: number): boolean {
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !prop || prop.ownerIndex !== ownerIndex) return false;
  if (tile.group && groupHasBuildings(state.properties, tile.group)) return false;
  return true;
}

export function validateTradeOffer(state: GameState, offer: TradeOffer): boolean {
  if (offer.fromIndex === offer.toIndex) return false;
  const from = state.players[offer.fromIndex];
  const to = state.players[offer.toIndex];
  if (!from || !to || from.bankrupt || to.bankrupt) return false;

  if (offer.offerCash < 0 || offer.requestCash < 0) return false;
  if (offer.offerCash > from.cash || offer.requestCash > to.cash) return false;
  if (offer.offerJailCards < 0 || offer.requestJailCards < 0) return false;
  if (offer.offerJailCards > from.jailCards || offer.requestJailCards > to.jailCards) return false;

  const hasContent =
    offer.offerCash > 0 ||
    offer.requestCash > 0 ||
    offer.offerProperties.length > 0 ||
    offer.requestProperties.length > 0 ||
    offer.offerJailCards > 0 ||
    offer.requestJailCards > 0;
  if (!hasContent) return false;

  for (const tileIdx of offer.offerProperties) {
    if (!isPropertyTradeable(state, offer.fromIndex, tileIdx)) return false;
  }
  for (const tileIdx of offer.requestProperties) {
    if (!isPropertyTradeable(state, offer.toIndex, tileIdx)) return false;
  }

  return true;
}

export function executeTrade(state: GameState, offer: TradeOffer): GameState {
  if (!validateTradeOffer(state, offer)) {
    return {
      ...state,
      phase: state.preTradePhase ?? 'TURN_ACTION',
      pendingTrade: null,
      preTradePhase: undefined,
    };
  }

  const players = state.players.map((p) => ({ ...p }));
  const properties: GameState['properties'] = { ...state.properties };

  const from = players[offer.fromIndex];
  const to = players[offer.toIndex];

  from.cash = from.cash - offer.offerCash + offer.requestCash;
  to.cash = to.cash + offer.offerCash - offer.requestCash;

  from.jailCards = from.jailCards - offer.offerJailCards + offer.requestJailCards;
  to.jailCards = to.jailCards + offer.offerJailCards - offer.requestJailCards;

  for (const tileIdx of offer.offerProperties) {
    properties[tileIdx] = { ...properties[tileIdx], ownerIndex: offer.toIndex };
  }
  for (const tileIdx of offer.requestProperties) {
    properties[tileIdx] = { ...properties[tileIdx], ownerIndex: offer.fromIndex };
  }

  const log = appendLog(
    state.logs,
    state.nextLogId,
    {
      de: `${from.name} und ${to.name} haben einen Tauschhandel abgeschlossen.`,
      en: `${from.name} and ${to.name} completed a trade.`,
    },
    offer.fromIndex,
    'good'
  );

  return {
    ...state,
    players,
    properties,
    pendingTrade: null,
    preTradePhase: undefined,
    phase: from.cash < 0 ? 'DEBT_RECOVERY' : (state.preTradePhase ?? 'TURN_ACTION'),
    logs: log.logs,
    nextLogId: log.nextLogId,
  };
}

function estimatePropertyValueForPlayer(
  state: GameState,
  tileIndex: number,
  playerIndex: number,
  simulateAdded: Set<number>,
  simulateRemoved: Set<number>
): number {
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !tile.price) return 0;

  let value = prop?.mortgaged ? getMortgageValue(tile) : tile.price;

  if (tile.group) {
    const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
    const ownedCount = groupTiles.filter((t) => {
      if (simulateRemoved.has(t.index)) return false;
      if (simulateAdded.has(t.index)) return true;
      return state.properties[t.index]?.ownerIndex === playerIndex;
    }).length;
    if (ownedCount === groupTiles.length) {
      value *= 1.65;
    } else if (ownedCount === groupTiles.length - 1) {
      value *= 1.2;
    }
  }

  return value;
}

export function evaluateTradeForBot(state: GameState, offer: TradeOffer): boolean {
  if (!validateTradeOffer(state, offer)) return false;
  const botIndex = offer.toIndex;
  const bot = state.players[botIndex];
  if (!bot || bot.cash - offer.requestCash + offer.offerCash < 80) {
    return false;
  }

  const added = new Set(offer.offerProperties);
  const removed = new Set(offer.requestProperties);

  let incomingValue = offer.offerCash + offer.offerJailCards * 45;
  for (const tileIdx of offer.offerProperties) {
    incomingValue += estimatePropertyValueForPlayer(state, tileIdx, botIndex, added, removed);
  }

  let outgoingValue = offer.requestCash + offer.requestJailCards * 45;
  for (const tileIdx of offer.requestProperties) {
    outgoingValue += estimatePropertyValueForPlayer(state, tileIdx, botIndex, new Set(), new Set());
  }

  // Bot accepts if incoming value is at least 95% of outgoing value
  return incomingValue >= outgoingValue * 0.95;
}

export function createAuction(state: GameState, tileIndex: number): AuctionState {
  const activeBidders: number[] = [];
  for (let offset = 1; offset <= state.players.length; offset++) {
    const idx = (state.currentTurn + offset) % state.players.length;
    if (!state.players[idx].bankrupt) {
      activeBidders.push(idx);
    }
  }

  return {
    tileIndex,
    currentBid: 0,
    highestBidder: null,
    activeBidders,
    currentBidderPos: 0,
    passedPlayers: [],
  };
}

export function advanceAuctionBidder(auction: AuctionState): AuctionState {
  const n = auction.activeBidders.length;
  for (let offset = 1; offset <= n; offset++) {
    const pos = (auction.currentBidderPos + offset) % n;
    const candidate = auction.activeBidders[pos];
    if (!auction.passedPlayers.includes(candidate)) {
      return { ...auction, currentBidderPos: pos };
    }
  }
  return auction;
}

export function finalizeAuctionIfDone(state: GameState): GameState {
  const auction = state.auction;
  if (!auction) return state;

  const remaining = auction.activeBidders.filter((idx) => !auction.passedPlayers.includes(idx));
  const tile = BOARD_TILES[auction.tileIndex];

  // Everyone passed and nobody bid
  if (remaining.length === 0 && auction.highestBidder === null) {
    const log = appendLog(
      state.logs,
      state.nextLogId,
      {
        de: `Niemand hat für ${tile.name.de} geboten — bleibt frei.`,
        en: `No bids for ${tile.name.en} — remains unowned.`,
      },
      undefined,
      'neutral'
    );
    return {
      ...state,
      auction: null,
      pendingTileIndex: null,
      phase: 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  // One bidder left and they already hold the highest bid (or everyone else passed)
  if (
    auction.highestBidder !== null &&
    (remaining.length === 0 || (remaining.length === 1 && remaining[0] === auction.highestBidder))
  ) {
    const winnerIdx = auction.highestBidder;
    const players = state.players.map((p, i) =>
      i === winnerIdx ? { ...p, cash: p.cash - auction.currentBid } : p
    );
    const properties = {
      ...state.properties,
      [auction.tileIndex]: {
        ...state.properties[auction.tileIndex],
        ownerIndex: winnerIdx,
      },
    };
    const winnerName = players[winnerIdx].name;
    const log = appendLog(
      state.logs,
      state.nextLogId,
      {
        de: `${winnerName} ersteigert ${tile.name.de} für ${auction.currentBid} €!`,
        en: `${winnerName} wins auction for ${tile.name.en} at ${auction.currentBid} €!`,
      },
      winnerIdx,
      'good'
    );
    return {
      ...state,
      players,
      properties,
      auction: null,
      pendingTileIndex: null,
      phase: 'TURN_ACTION',
      logs: log.logs,
      nextLogId: log.nextLogId,
    };
  }

  return state;
}

export function computeBotAuctionBid(
  state: GameState,
  botIndex: number,
  auction: AuctionState
): number | null {
  const bot = state.players[botIndex];
  const tile = BOARD_TILES[auction.tileIndex];
  if (!bot || !tile || !tile.price) return null;

  let maxWilling = Math.floor(tile.price * 1.1);
  if (tile.group) {
    const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
    const ownedInGroup = groupTiles.filter(
      (t) => state.properties[t.index]?.ownerIndex === botIndex
    ).length;
    if (ownedInGroup === groupTiles.length - 1) {
      maxWilling = Math.floor(tile.price * 1.45);
    } else if (ownsFullGroup(state.properties, botIndex, tile.group)) {
      maxWilling = tile.price;
    }
  }

  const reserve = 120;
  const maxAffordable = Math.max(0, bot.cash - reserve);
  const cap = Math.min(maxWilling, maxAffordable);
  const nextBid = auction.currentBid === 0 ? Math.min(20, cap) : auction.currentBid + 10;

  if (nextBid <= cap && nextBid > auction.currentBid) {
    return nextBid;
  }
  return null;
}

export { getUnmortgageCost };
