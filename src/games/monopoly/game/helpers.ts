import { BOARD_TILES } from './boardData';
import type { ColorGroup, GameState, Language, LogEntry, PropertyState, TileDef } from './types';

export type RngFn = () => number;

export function roll2D6(rng: RngFn = Math.random): [number, number] {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return [d1, d2];
}

export function shuffleIds(ids: string[], rng: RngFn = Math.random): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function isOwnableTile(tile: TileDef): boolean {
  return tile.type === 'street' || tile.type === 'transit' || tile.type === 'utility';
}

export function getGroupTiles(group: ColorGroup): TileDef[] {
  return BOARD_TILES.filter((t) => t.group === group);
}

export function ownsFullGroup(
  properties: Record<number, PropertyState>,
  playerIndex: number,
  group: ColorGroup
): boolean {
  const groupTiles = getGroupTiles(group);
  return groupTiles.length > 0 && groupTiles.every((t) => properties[t.index]?.ownerIndex === playerIndex);
}

export function groupHasMortgaged(
  properties: Record<number, PropertyState>,
  group: ColorGroup
): boolean {
  return getGroupTiles(group).some((t) => properties[t.index]?.mortgaged);
}

export function groupHasBuildings(
  properties: Record<number, PropertyState>,
  group: ColorGroup
): boolean {
  return getGroupTiles(group).some((t) => (properties[t.index]?.houses ?? 0) > 0);
}

export function canBuildOnTile(
  state: GameState,
  playerIndex: number,
  tileIndex: number
): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile || tile.type !== 'street' || !tile.group || !tile.houseCost) return false;

  const prop = state.properties[tileIndex];
  if (!prop || prop.ownerIndex !== playerIndex || prop.mortgaged) return false;
  if (prop.houses >= 5) return false;
  if (!ownsFullGroup(state.properties, playerIndex, tile.group)) return false;
  if (groupHasMortgaged(state.properties, tile.group)) return false;

  const player = state.players[playerIndex];
  if (!player || player.bankrupt || player.cash < tile.houseCost) return false;

  // Even-building rule: cannot build if another tile in the group has fewer houses
  const groupTiles = getGroupTiles(tile.group);
  const minHouses = Math.min(...groupTiles.map((t) => state.properties[t.index]?.houses ?? 0));
  return prop.houses === minHouses;
}

export function canSellOnTile(
  state: GameState,
  playerIndex: number,
  tileIndex: number
): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile || tile.type !== 'street' || !tile.group) return false;

  const prop = state.properties[tileIndex];
  if (!prop || prop.ownerIndex !== playerIndex || prop.houses <= 0) return false;

  // Even-selling rule: cannot sell if another tile in the group has more houses
  const groupTiles = getGroupTiles(tile.group);
  const maxHouses = Math.max(...groupTiles.map((t) => state.properties[t.index]?.houses ?? 0));
  return prop.houses === maxHouses;
}

export function getMortgageValue(tile: TileDef): number {
  return Math.floor((tile.price ?? 0) * 0.5);
}

export function getUnmortgageCost(tile: TileDef): number {
  return Math.round((tile.price ?? 0) * 0.55);
}

export function canMortgageTile(
  state: GameState,
  playerIndex: number,
  tileIndex: number
): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile || !isOwnableTile(tile)) return false;
  const prop = state.properties[tileIndex];
  if (!prop || prop.ownerIndex !== playerIndex || prop.mortgaged) return false;
  if (tile.group && groupHasBuildings(state.properties, tile.group)) return false;
  return true;
}

export function canUnmortgageTile(
  state: GameState,
  playerIndex: number,
  tileIndex: number
): boolean {
  const tile = BOARD_TILES[tileIndex];
  if (!tile || !isOwnableTile(tile)) return false;
  const prop = state.properties[tileIndex];
  if (!prop || prop.ownerIndex !== playerIndex || !prop.mortgaged) return false;
  const player = state.players[playerIndex];
  return Boolean(player && !player.bankrupt && player.cash >= getUnmortgageCost(tile));
}

export function calculateRent(
  state: GameState,
  tileIndex: number,
  diceTotal: number,
  doubleTransit = false
): number {
  const tile = BOARD_TILES[tileIndex];
  const prop = state.properties[tileIndex];
  if (!tile || !prop || prop.ownerIndex === null || prop.mortgaged) return 0;

  const ownerIdx = prop.ownerIndex;

  if (tile.type === 'street' && tile.rents && tile.group) {
    if (prop.houses > 0) {
      return tile.rents[Math.min(prop.houses, 5)];
    }
    const base = tile.rents[0];
    return ownsFullGroup(state.properties, ownerIdx, tile.group) ? base * 2 : base;
  }

  if (tile.type === 'transit') {
    const ownedTransits = BOARD_TILES.filter(
      (t) => t.type === 'transit' && state.properties[t.index]?.ownerIndex === ownerIdx
    ).length;
    const rent = 25 * Math.pow(2, Math.max(0, ownedTransits - 1));
    return doubleTransit ? rent * 2 : rent;
  }

  if (tile.type === 'utility') {
    const ownedUtilities = BOARD_TILES.filter(
      (t) => t.type === 'utility' && state.properties[t.index]?.ownerIndex === ownerIdx
    ).length;
    const multiplier = ownedUtilities >= 2 ? 10 : 4;
    return diceTotal * multiplier;
  }

  return 0;
}

export function nextActivePlayer(state: GameState, fromIndex: number): number {
  const count = state.players.length;
  for (let offset = 1; offset <= count; offset++) {
    const idx = (fromIndex + offset) % count;
    if (!state.players[idx].bankrupt) {
      return idx;
    }
  }
  return fromIndex;
}

export function getActivePlayerCount(state: GameState): number {
  return state.players.filter((p) => !p.bankrupt).length;
}

export function getPlayerNetWorth(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  if (!player || player.bankrupt) return 0;
  let total = player.cash;
  for (const tile of BOARD_TILES) {
    const prop = state.properties[tile.index];
    if (!prop || prop.ownerIndex !== playerIndex) continue;
    total += prop.mortgaged ? getMortgageValue(tile) : tile.price ?? 0;
    if (prop.houses > 0 && tile.houseCost) {
      total += prop.houses * tile.houseCost;
    }
  }
  return total;
}

export function appendLog(
  logs: LogEntry[],
  nextLogId: number,
  text: Record<Language, string>,
  playerIndex?: number,
  tone: LogEntry['tone'] = 'neutral'
): { logs: LogEntry[]; nextLogId: number } {
  const entry: LogEntry = { id: nextLogId, text, playerIndex, tone };
  const trimmed = [...logs, entry].slice(-45);
  return { logs: trimmed, nextLogId: nextLogId + 1 };
}
