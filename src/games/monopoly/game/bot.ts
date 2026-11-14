import { BOARD_TILES, JAIL_FINE } from './boardData';
import {
  computeLookaheadDanger,
  evaluateTileStrategicValue,
  hasUnderdevelopedMonopoly,
  isBlockingOpponentGroup,
  isCompletingOwnGroup,
  pickBestBuildTile,
  pickBestMortgageTile,
  pickBestSellHouseTile,
  pickBestUnmortgageTile,
  shouldStayInJail,
} from './botStrategy';
import { computeBotAuctionBid, evaluateTradeForBot, findBestBotTradeOffer } from './trading';
import type { GameAction, GameState } from './types';

export function decideBotAction(state: GameState, botIndex: number): GameAction | null {
  const bot = state.players[botIndex];
  if (!bot || bot.bankrupt) return null;

  if (state.phase === 'AUCTION' && state.auction) {
    const currentBidder = state.auction.activeBidders[state.auction.currentBidderPos];
    if (currentBidder !== botIndex) return null;
    const bid = computeBotAuctionBid(state, botIndex, state.auction);
    if (bid !== null) {
      return { type: 'PLACE_BID', playerIndex: botIndex, amount: bid };
    }
    return { type: 'PASS_BID', playerIndex: botIndex };
  }

  if (state.phase === 'TRADE_REVIEW' && state.pendingTrade) {
    if (state.pendingTrade.toIndex !== botIndex) return null;
    const accept = evaluateTradeForBot(state, state.pendingTrade);
    return { type: 'RESPOND_TRADE', accept };
  }

  if (state.currentTurn !== botIndex) return null;

  switch (state.phase) {
    case 'WAIT_ROLL': {
      if (bot.inJail && !shouldStayInJail(state, botIndex)) {
        if (bot.jailCards > 0) {
          return { type: 'USE_JAIL_CARD' };
        }
        if (bot.cash >= JAIL_FINE + 60) {
          return { type: 'PAY_JAIL' };
        }
      }
      return { type: 'ROLL_DICE' };
    }

    case 'BUY_OR_AUCTION': {
      const tileIdx = state.pendingTileIndex;
      if (tileIdx === null) return { type: 'DECLINE_PROPERTY' };
      const tile = BOARD_TILES[tileIdx];
      const price = tile?.price ?? 0;
      if (bot.cash < price) return { type: 'DECLINE_PROPERTY' };

      const completesOrBlocks =
        isCompletingOwnGroup(state, tileIdx, botIndex) ||
        isBlockingOpponentGroup(state, tileIdx, botIndex);

      const dynamicReserve = completesOrBlocks
        ? 20
        : Math.min(180, computeLookaheadDanger(state, botIndex));

      const strategicValue = evaluateTileStrategicValue(state, tileIdx, botIndex);
      if (bot.cash - price >= dynamicReserve || (completesOrBlocks && bot.cash >= price)) {
        return { type: 'BUY_PROPERTY' };
      }
      if (strategicValue >= price * 1.25 && bot.cash - price >= 40) {
        return { type: 'BUY_PROPERTY' };
      }
      return { type: 'DECLINE_PROPERTY' };
    }

    case 'CARD_MODAL': {
      return { type: 'ACK_CARD' };
    }

    case 'DEBT_RECOVERY': {
      // First mortgage dead singletons / non-monopolies before selling houses on monopolies
      const mortgageCandidate = pickBestMortgageTile(state, botIndex, false);
      if (mortgageCandidate) {
        return { type: 'TOGGLE_MORTGAGE', tileIndex: mortgageCandidate.index };
      }
      const sellTile = pickBestSellHouseTile(state, botIndex);
      if (sellTile) {
        return { type: 'SELL_HOUSE', tileIndex: sellTile.index };
      }
      return { type: 'DECLARE_BANKRUPTCY' };
    }

    case 'TURN_ACTION': {
      const reserve = computeLookaheadDanger(state, botIndex);

      // 1. Unmortgage monopolies & high-value tiles first
      const unmortgageTile = pickBestUnmortgageTile(state, botIndex, reserve);
      if (unmortgageTile) {
        return { type: 'TOGGLE_MORTGAGE', tileIndex: unmortgageTile.index };
      }

      // 2. Build houses on highest-ROI monopolies (prioritizing the 3-house spike)
      const buildReserve = hasUnderdevelopedMonopoly(state, botIndex)
        ? Math.min(reserve, 100)
        : reserve;
      const buildTile = pickBestBuildTile(state, botIndex, buildReserve);
      if (buildTile) {
        return { type: 'BUILD_HOUSE', tileIndex: buildTile.index };
      }

      // 3. Proactively mortgage dead singletons to fund underdeveloped monopolies (< 3 houses)
      if (hasUnderdevelopedMonopoly(state, botIndex)) {
        const deadSingleton = pickBestMortgageTile(state, botIndex, true);
        if (deadSingleton) {
          return { type: 'TOGGLE_MORTGAGE', tileIndex: deadSingleton.index };
        }
      }

      // 4. Propose a strategic trade (at most once per turn, never repeating declined offers)
      if (state.botTradeAttemptedTurn !== state.turnCount) {
        const offer = findBestBotTradeOffer(state, botIndex);
        if (offer) {
          return { type: 'PROPOSE_TRADE', offer };
        }
      }

      return { type: 'END_TURN' };
    }

    default:
      return null;
  }
}
