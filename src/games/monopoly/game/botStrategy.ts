import { BOARD_TILES, JAIL_FINE } from './boardData';
import {
  calculateRent,
  canBuildOnTile,
  canMortgageTile,
  canSellOnTile,
  canUnmortgageTile,
  getGroupTiles,
  getMortgageValue,
  getUnmortgageCost,
  isOwnableTile,
  ownsFullGroup,
} from './helpers';
import type { ColorGroup, GameState, TileDef } from './types';

// Exact 2D6 roll probabilities for sums 2..12
const DICE_PROB: Record<number, number> = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

// Group priority multipliers reflecting traffic frequency & ROI in Monopoly
const GROUP_PRIORITY: Record<ColorGroup, number> = {
  orange: 1.35,
  red: 1.3,
  lightblue: 1.25,
  pink: 1.2,
  yellow: 1.15,
  green: 1.05,
  darkblue: 1.0,
  brown: 0.9,
};

export function getGroupPriorityScore(group: ColorGroup | undefined): number {
  return group ? GROUP_PRIORITY[group] : 1.0;
}

/**
 * Estimates expected and worst-case rent exposure in the next 2..12 spaces
 * ahead of `playerIndex` to compute a dynamic cash reserve.
 */
export function computeLookaheadDanger(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  if (!player || player.bankrupt) return 120;

  let expectedRent = 0;
  let maxSingleThreat = 0;

  for (let d = 2; d <= 12; d++) {
    const landingIdx = (player.position + d) % BOARD_TILES.length;
    const prop = state.properties[landingIdx];
    let rent = 0;
    if (prop && prop.ownerIndex !== null && prop.ownerIndex !== playerIndex && !prop.mortgaged) {
      rent = calculateRent(state, landingIdx, d);
    } else if (BOARD_TILES[landingIdx]?.type === 'tax') {
      rent = BOARD_TILES[landingIdx].taxAmount ?? 0;
    }

    const prob = DICE_PROB[d] ?? 0;
    expectedRent += prob * rent;
    if (rent > maxSingleThreat) {
      maxSingleThreat = rent;
    }
  }

  // Reserve covers expected rent + 35% of the worst nearby threat, clamped [80, 450]
  const rawReserve = Math.round(80 + expectedRent * 1.4 + maxSingleThreat * 0.35);
  return Math.max(80, Math.min(450, rawReserve));
}

export function countUnownedProperties(state: GameState): number {
  let count = 0;
  for (const tile of BOARD_TILES) {
    if (isOwnableTile(tile) && state.properties[tile.index]?.ownerIndex === null) {
      count++;
    }
  }
  return count;
}

export function countDangerousOpponentMonopolies(state: GameState, botIndex: number): number {
  let count = 0;
  const groups = new Set<ColorGroup>(
    BOARD_TILES.map((t) => t.group).filter((g): g is ColorGroup => Boolean(g))
  );
  for (const group of groups) {
    const tiles = getGroupTiles(group);
    const owner = state.properties[tiles[0]?.index ?? -1]?.ownerIndex;
    if (owner !== null && owner !== undefined && owner !== botIndex) {
      if (ownsFullGroup(state.properties, owner, group)) {
        const hasBuildings = tiles.some((t) => (state.properties[t.index]?.houses ?? 0) > 0);
        if (hasBuildings) count++;
      }
    }
  }
  return count;
}

export function isCompletingOwnGroup(state: GameState, tileIndex: number, playerIndex: number): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile?.group) return false;
  const groupTiles = getGroupTiles(tile.group);
  const owned = groupTiles.filter((t) => state.properties[t.index]?.ownerIndex === playerIndex).length;
  return owned === groupTiles.length - 1;
}

export function isBlockingOpponentGroup(
  state: GameState,
  tileIndex: number,
  playerIndex: number
): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile?.group) return false;
  const groupTiles = getGroupTiles(tile.group);
  const ownerCounts = new Map<number, number>();
  for (const gt of groupTiles) {
    const owner = state.properties[gt.index]?.ownerIndex;
    if (owner !== null && owner !== undefined && owner !== playerIndex) {
      ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
    }
  }
  for (const count of ownerCounts.values()) {
    if (count === groupTiles.length - 1) return true;
  }
  return false;
}

/**
 * Strategic valuation of a tile for buying or auction bidding.
 */
export function evaluateTileStrategicValue(
  state: GameState,
  tileIndex: number,
  playerIndex: number
): number {
  const tile = BOARD_TILES[tileIndex];
  if (!tile || !tile.price) return 0;

  let value = tile.price * getGroupPriorityScore(tile.group);

  if (tile.type === 'street' && tile.group) {
    const groupTiles = getGroupTiles(tile.group);
    const ownedInGroup = groupTiles.filter(
      (t) => state.properties[t.index]?.ownerIndex === playerIndex
    ).length;

    if (ownedInGroup === groupTiles.length - 1) {
      value = Math.max(value, tile.price * 2.2);
    } else if (ownedInGroup > 0) {
      value *= 1.3;
    }

    if (isBlockingOpponentGroup(state, tileIndex, playerIndex)) {
      value += tile.price * 0.75;
    }
  } else if (tile.type === 'transit') {
    const ownedTransits = BOARD_TILES.filter(
      (t) => t.type === 'transit' && state.properties[t.index]?.ownerIndex === playerIndex
    ).length;
    value = tile.price * (1.1 + ownedTransits * 0.25);
  } else if (tile.type === 'utility') {
    const ownedUtilities = BOARD_TILES.filter(
      (t) => t.type === 'utility' && state.properties[t.index]?.ownerIndex === playerIndex
    ).length;
    value = tile.price * (ownedUtilities > 0 ? 1.2 : 0.85);
  }

  return Math.round(value);
}

/**
 * In late game when opponents have developed monopolies and few unowned tiles remain,
 * staying in Jail is a strong defensive advantage (collect rent without landing on hotels).
 */
export function shouldStayInJail(state: GameState, botIndex: number): boolean {
  const bot = state.players[botIndex];
  if (!bot || !bot.inJail) return false;

  const unowned = countUnownedProperties(state);
  const dangerousMonopolies = countDangerousOpponentMonopolies(state, botIndex);

  if (dangerousMonopolies > 0 && unowned <= 4) {
    return true;
  }

  // Early/mid game: exit jail if we have a card or comfortable cash above reserve
  if (bot.jailCards > 0) return false;
  const reserve = computeLookaheadDanger(state, botIndex);
  return bot.cash < JAIL_FINE + Math.max(100, reserve * 0.75);
}

/**
 * Chooses the highest-ROI buildable tile that keeps cash >= reserve.
 */
export function pickBestBuildTile(
  state: GameState,
  botIndex: number,
  reserve: number
): TileDef | null {
  const bot = state.players[botIndex];
  if (!bot) return null;

  let bestTile: TileDef | null = null;
  let bestScore = -1;

  for (const tile of BOARD_TILES) {
    if (!canBuildOnTile(state, botIndex, tile.index)) continue;
    const cost = tile.houseCost ?? 0;
    if (bot.cash - cost < reserve) continue;

    const currentHouses = state.properties[tile.index]?.houses ?? 0;
    const rents = tile.rents;
    if (!rents) continue;

    const currentRent = currentHouses === 0 ? rents[0] * 2 : rents[currentHouses];
    const nextRent = rents[Math.min(5, currentHouses + 1)];
    const roi = (nextRent - currentRent) / Math.max(1, cost);

    // 3 houses is the sweet-spot ROI spike in Monopoly
    const threeHouseBonus = currentHouses < 3 ? 1.45 : currentHouses === 3 ? 1.05 : 0.85;
    const score = roi * threeHouseBonus * getGroupPriorityScore(tile.group);

    if (score > bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return bestTile;
}

/**
 * Checks if the bot owns a full group that is still below 3 houses per tile.
 */
export function hasUnderdevelopedMonopoly(state: GameState, botIndex: number): boolean {
  for (const tile of BOARD_TILES) {
    if (
      tile.type === 'street' &&
      tile.group &&
      ownsFullGroup(state.properties, botIndex, tile.group)
    ) {
      const houses = state.properties[tile.index]?.houses ?? 0;
      if (houses < 3) return true;
    }
  }
  return false;
}

/**
 * Picks the best tile to unmortgage (monopolies first, then transits, then highest value).
 */
export function pickBestUnmortgageTile(
  state: GameState,
  botIndex: number,
  reserve: number
): TileDef | null {
  const bot = state.players[botIndex];
  if (!bot) return null;

  let bestTile: TileDef | null = null;
  let bestScore = -1;

  for (const tile of BOARD_TILES) {
    if (!canUnmortgageTile(state, botIndex, tile.index)) continue;
    const cost = getUnmortgageCost(tile);
    if (bot.cash - cost < reserve) continue;

    let score = getGroupPriorityScore(tile.group) * 10;
    if (tile.group && ownsFullGroup(state.properties, botIndex, tile.group)) {
      score += 100;
    } else if (tile.type === 'transit') {
      score += 35;
    } else if (tile.type === 'street' && isBlockingOpponentGroup(state, tile.index, botIndex)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return bestTile;
}

/**
 * Picks the lowest-impact property to mortgage (for debt recovery or leveraging monopolies).
 * If `onlyDeadSingletons` is true, avoids mortgaging monopolies, 2-of-3 groups, and transits.
 */
export function pickBestMortgageTile(
  state: GameState,
  botIndex: number,
  onlyDeadSingletons = false
): TileDef | null {
  let bestTile: TileDef | null = null;
  let lowestKeepValue = Infinity;

  for (const tile of BOARD_TILES) {
    if (!canMortgageTile(state, botIndex, tile.index)) continue;

    let keepValue = (tile.price ?? 0) * 0.5;
    let isDeadSingleton = true;

    if (tile.group) {
      const groupTiles = getGroupTiles(tile.group);
      const owned = groupTiles.filter(
        (t) => state.properties[t.index]?.ownerIndex === botIndex
      ).length;
      if (owned === groupTiles.length) {
        keepValue += 1000;
        isDeadSingleton = false;
      } else if (owned === groupTiles.length - 1) {
        keepValue += 350;
        isDeadSingleton = false;
      } else if (isBlockingOpponentGroup(state, tile.index, botIndex)) {
        keepValue += 150;
      }
    } else if (tile.type === 'transit') {
      const ownedTransits = BOARD_TILES.filter(
        (t) => t.type === 'transit' && state.properties[t.index]?.ownerIndex === botIndex
      ).length;
      keepValue += ownedTransits * 120;
      if (ownedTransits >= 2) isDeadSingleton = false;
    } else if (tile.type === 'utility') {
      keepValue -= 30;
    }

    if (onlyDeadSingletons && !isDeadSingleton) continue;

    // Prefer mortgaging tiles that yield more cash when keepValue is similar
    const adjusted = keepValue - getMortgageValue(tile) * 0.05;
    if (adjusted < lowestKeepValue) {
      lowestKeepValue = adjusted;
      bestTile = tile;
    }
  }

  return bestTile;
}

/**
 * Picks the lowest-ROI house to sell during debt recovery (preserving 3-house high-traffic groups).
 */
export function pickBestSellHouseTile(state: GameState, botIndex: number): TileDef | null {
  let bestTile: TileDef | null = null;
  let lowestLoss = Infinity;

  for (const tile of BOARD_TILES) {
    if (!canSellOnTile(state, botIndex, tile.index)) continue;
    const houses = state.properties[tile.index]?.houses ?? 0;
    const rents = tile.rents;
    if (!rents) continue;

    const curRent = rents[houses];
    const prevRent = houses === 1 ? rents[0] * 2 : rents[houses - 1];
    const rentLoss = (curRent - prevRent) * getGroupPriorityScore(tile.group);

    if (rentLoss < lowestLoss) {
      lowestLoss = rentLoss;
      bestTile = tile;
    }
  }

  return bestTile;
}
