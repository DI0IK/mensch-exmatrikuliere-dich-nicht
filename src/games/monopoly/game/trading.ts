import { BOARD_TILES } from './boardData';
import {
  computeLookaheadDanger,
  evaluateTileStrategicValue,
  getGroupPriorityScore,
  isBlockingOpponentGroup,
  isCompletingOwnGroup,
} from './botStrategy';
import { appendLog, getGroupTiles, getMortgageValue, getUnmortgageCost, groupHasBuildings } from './helpers';
import type { AuctionState, ColorGroup, GameState, TradeOffer } from './types';

export function getCanonicalTradeKey(offer: TradeOffer): string {
  const offerProps = [...offer.offerProperties].sort((a, b) => a - b).join(',');
  const reqProps = [...offer.requestProperties].sort((a, b) => a - b).join(',');
  return `${offer.fromIndex}->${offer.toIndex}:${offerProps}|${offer.offerCash}|${offer.offerJailCards}:${reqProps}|${offer.requestCash}|${offer.requestJailCards}`;
}

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
): { value: number; completesMonopoly: boolean } {
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !tile.price) return { value: 0, completesMonopoly: false };

  let value = (prop?.mortgaged ? getMortgageValue(tile) : tile.price) * getGroupPriorityScore(tile.group);
  let completesMonopoly = false;

  if (tile.group) {
    const groupTiles = getGroupTiles(tile.group);
    const ownedCount = groupTiles.filter((t) => {
      if (simulateRemoved.has(t.index)) return false;
      if (simulateAdded.has(t.index)) return true;
      return state.properties[t.index]?.ownerIndex === playerIndex;
    }).length;
    if (ownedCount === groupTiles.length) {
      value *= 2.2;
      completesMonopoly = true;
    } else if (ownedCount === groupTiles.length - 1) {
      value *= 1.3;
    }
  } else if (tile.type === 'transit') {
    const ownedTransits = BOARD_TILES.filter((t) => {
      if (t.type !== 'transit') return false;
      if (simulateRemoved.has(t.index)) return false;
      if (simulateAdded.has(t.index)) return true;
      return state.properties[t.index]?.ownerIndex === playerIndex;
    }).length;
    value = tile.price * (1.05 + ownedTransits * 0.25);
  }

  return { value, completesMonopoly };
}

export function evaluateTradeForBot(state: GameState, offer: TradeOffer): boolean {
  if (!validateTradeOffer(state, offer)) return false;
  const botIndex = offer.toIndex;
  const fromIndex = offer.fromIndex;
  const bot = state.players[botIndex];
  const reserve = Math.min(140, computeLookaheadDanger(state, botIndex));
  if (!bot || bot.cash - offer.requestCash + offer.offerCash < reserve) {
    return false;
  }

  const botAdded = new Set(offer.offerProperties);
  const botRemoved = new Set(offer.requestProperties);

  let incomingValue = offer.offerCash + offer.offerJailCards * 45;
  let botGainsMonopoly = false;
  for (const tileIdx of offer.offerProperties) {
    const est = estimatePropertyValueForPlayer(state, tileIdx, botIndex, botAdded, botRemoved);
    incomingValue += est.value;
    if (est.completesMonopoly) botGainsMonopoly = true;
  }

  let outgoingValue = offer.requestCash + offer.requestJailCards * 45;
  for (const tileIdx of offer.requestProperties) {
    const est = estimatePropertyValueForPlayer(state, tileIdx, botIndex, new Set(), new Set());
    outgoingValue += est.value;
  }

  // Also check if the proposer completes a monopoly from this trade
  const fromAdded = new Set(offer.requestProperties);
  const fromRemoved = new Set(offer.offerProperties);
  let proposerGainsMonopoly = false;
  for (const tileIdx of offer.requestProperties) {
    const est = estimatePropertyValueForPlayer(state, tileIdx, fromIndex, fromAdded, fromRemoved);
    if (est.completesMonopoly) proposerGainsMonopoly = true;
  }

  // Never hand an opponent a monopoly unless we also get one or receive an overwhelming premium
  if (proposerGainsMonopoly && !botGainsMonopoly) {
    return incomingValue >= outgoingValue * 1.6 + 200;
  }

  // Mutually beneficial monopoly trades or clear value wins
  if (botGainsMonopoly) {
    return incomingValue >= outgoingValue * 0.95;
  }

  return incomingValue >= outgoingValue * 1.08;
}

/**
 * Finds a strategic trade offer for `botIndex` to complete a color group.
 */
export function findBestBotTradeOffer(state: GameState, botIndex: number): TradeOffer | null {
  const bot = state.players[botIndex];
  if (!bot || bot.bankrupt) return null;

  const declined = new Set(state.declinedTradeKeys ?? []);
  const groups = new Set<ColorGroup>(
    BOARD_TILES.map((t) => t.group).filter((g): g is ColorGroup => Boolean(g))
  );

  // Collect bot's surplus singletons (not part of a 2-of-3 or full group)
  const surplusProps: number[] = [];
  for (const tile of BOARD_TILES) {
    if (!isPropertyTradeable(state, botIndex, tile.index)) continue;
    if (tile.group) {
      const groupTiles = getGroupTiles(tile.group);
      const owned = groupTiles.filter((t) => state.properties[t.index]?.ownerIndex === botIndex).length;
      if (owned >= groupTiles.length - 1) continue; // keep 2-of-3 or monopolies
    } else if (tile.type === 'transit') {
      const ownedTransits = BOARD_TILES.filter(
        (t) => t.type === 'transit' && state.properties[t.index]?.ownerIndex === botIndex
      ).length;
      if (ownedTransits >= 2) continue;
    }
    surplusProps.push(tile.index);
  }

  let bestOffer: TradeOffer | null = null;
  let bestScore = -Infinity;

  for (const group of groups) {
    const groupTiles = getGroupTiles(group);
    const botOwned = groupTiles.filter((t) => state.properties[t.index]?.ownerIndex === botIndex);
    if (botOwned.length !== groupTiles.length - 1) continue;

    const missingTile = groupTiles.find((t) => state.properties[t.index]?.ownerIndex !== botIndex);
    if (!missingTile) continue;

    const targetIdx = state.properties[missingTile.index]?.ownerIndex;
    if (targetIdx === null || targetIdx === undefined || targetIdx === botIndex) continue;
    if (!isPropertyTradeable(state, targetIdx, missingTile.index)) continue;

    const targetPrice = missingTile.price ?? 0;

    // 1) Try offering a surplus property that helps the target + cash difference
    for (const offerPropIdx of surplusProps) {
      const offerTile = BOARD_TILES[offerPropIdx];
      const offerBase = offerTile?.price ?? 0;
      const targetNeedsIt = isCompletingOwnGroup(state, offerPropIdx, targetIdx);
      const fairTargetVal = targetPrice * 1.25;
      const offerVal = offerBase * (targetNeedsIt ? 1.5 : 1.0);
      const cashDelta = Math.max(0, Math.round((fairTargetVal - offerVal) / 10) * 10);

      if (bot.cash - cashDelta < 100) continue;

      const candidate: TradeOffer = {
        fromIndex: botIndex,
        toIndex: targetIdx,
        offerCash: cashDelta,
        requestCash: 0,
        offerProperties: [offerPropIdx],
        requestProperties: [missingTile.index],
        offerJailCards: 0,
        requestJailCards: 0,
      };

      if (!validateTradeOffer(state, candidate)) continue;
      if (declined.has(getCanonicalTradeKey(candidate))) continue;
      if (state.players[targetIdx]?.seatType === 'bot' && !evaluateTradeForBot(state, candidate)) {
        continue;
      }

      const score = getGroupPriorityScore(group) * 100 - cashDelta * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestOffer = candidate;
      }
    }

    // 2) Try pure cash offer if bot has plenty of cash above reserve
    const cashOffer = Math.round((targetPrice * 1.65) / 10) * 10;
    if (bot.cash - cashOffer >= 150) {
      const candidate: TradeOffer = {
        fromIndex: botIndex,
        toIndex: targetIdx,
        offerCash: cashOffer,
        requestCash: 0,
        offerProperties: [],
        requestProperties: [missingTile.index],
        offerJailCards: 0,
        requestJailCards: 0,
      };
      if (
        validateTradeOffer(state, candidate) &&
        !declined.has(getCanonicalTradeKey(candidate)) &&
        (state.players[targetIdx]?.seatType !== 'bot' || evaluateTradeForBot(state, candidate))
      ) {
        const score = getGroupPriorityScore(group) * 80 - cashOffer * 0.2;
        if (score > bestScore) {
          bestScore = score;
          bestOffer = candidate;
        }
      }
    }
  }

  return bestOffer;
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

  const strategicValue = evaluateTileStrategicValue(state, auction.tileIndex, botIndex);
  const completesOrBlocks =
    isCompletingOwnGroup(state, auction.tileIndex, botIndex) ||
    isBlockingOpponentGroup(state, auction.tileIndex, botIndex);

  const reserve = completesOrBlocks
    ? 40
    : Math.min(160, computeLookaheadDanger(state, botIndex));
  const maxAffordable = Math.max(0, bot.cash - reserve);
  const cap = Math.min(strategicValue, maxAffordable);
  const nextBid = auction.currentBid === 0 ? Math.min(20, cap) : auction.currentBid + 10;

  if (nextBid <= cap && nextBid > auction.currentBid) {
    return nextBid;
  }
  return null;
}

export { getUnmortgageCost };
