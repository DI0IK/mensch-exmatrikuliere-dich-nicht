import { BOARD_TILES, JAIL_FINE } from './boardData';
import {
  canBuildOnTile,
  canMortgageTile,
  canSellOnTile,
  canUnmortgageTile,
  getUnmortgageCost,
  ownsFullGroup,
} from './helpers';
import { computeBotAuctionBid, evaluateTradeForBot } from './trading';
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
      if (bot.inJail) {
        if (bot.jailCards > 0) {
          return { type: 'USE_JAIL_CARD' };
        }
        if (bot.cash >= JAIL_FINE + 200 && state.turnCount < 25) {
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

      let completesGroup = false;
      if (tile?.group) {
        const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
        const owned = groupTiles.filter(
          (t) => state.properties[t.index]?.ownerIndex === botIndex
        ).length;
        completesGroup = owned === groupTiles.length - 1;
      }

      const reserve = completesGroup ? 40 : state.turnCount > 25 ? 250 : 120;
      if (bot.cash - price >= reserve) {
        return { type: 'BUY_PROPERTY' };
      }
      return { type: 'DECLINE_PROPERTY' };
    }

    case 'CARD_MODAL': {
      return { type: 'ACK_CARD' };
    }

    case 'DEBT_RECOVERY': {
      // First sell houses evenly
      for (const tile of BOARD_TILES) {
        if (canSellOnTile(state, botIndex, tile.index)) {
          return { type: 'SELL_HOUSE', tileIndex: tile.index };
        }
      }
      // Then mortgage non-monopoly properties first
      for (const tile of BOARD_TILES) {
        if (
          canMortgageTile(state, botIndex, tile.index) &&
          (!tile.group || !ownsFullGroup(state.properties, botIndex, tile.group))
        ) {
          return { type: 'TOGGLE_MORTGAGE', tileIndex: tile.index };
        }
      }
      // Then mortgage any remaining property
      for (const tile of BOARD_TILES) {
        if (canMortgageTile(state, botIndex, tile.index)) {
          return { type: 'TOGGLE_MORTGAGE', tileIndex: tile.index };
        }
      }
      return { type: 'DECLARE_BANKRUPTCY' };
    }

    case 'TURN_ACTION': {
      const reserve = state.turnCount > 25 ? 240 : 160;

      // Unmortgage if cash allows
      for (const tile of BOARD_TILES) {
        if (
          canUnmortgageTile(state, botIndex, tile.index) &&
          bot.cash - getUnmortgageCost(tile) >= reserve
        ) {
          return { type: 'TOGGLE_MORTGAGE', tileIndex: tile.index };
        }
      }

      // Build Tutorien / Lehrstuhl evenly on monopolies
      for (const tile of BOARD_TILES) {
        if (
          canBuildOnTile(state, botIndex, tile.index) &&
          bot.cash - (tile.houseCost ?? 0) >= reserve
        ) {
          return { type: 'BUILD_HOUSE', tileIndex: tile.index };
        }
      }

      return { type: 'END_TURN' };
    }

    default:
      return null;
  }
}
