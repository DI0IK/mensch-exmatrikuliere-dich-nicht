import { sound } from '../../../shared/audio/sound';
import type { GameAction, GameState, PlayerConfig } from '../game/types';

const PROFILE_STORAGE_KEY = 'cmnp_profile';

export interface SavedProfile {
  name?: string;
  major?: string;
  emoji?: string;
}

export function loadSavedProfile(): SavedProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedProfile) : {};
    return {
      name: parsed.name?.trim().slice(0, 18) || undefined,
      major: typeof parsed.major === 'string' ? parsed.major.trim().slice(0, 28) : undefined,
      emoji: typeof parsed.emoji === 'string' ? parsed.emoji.trim().slice(0, 8) : undefined,
    };
  } catch {
    return {};
  }
}

export function saveProfile(partial: SavedProfile): void {
  try {
    const current = loadSavedProfile();
    const next: SavedProfile = {
      ...current,
      ...(partial.name !== undefined && partial.name.trim()
        ? { name: partial.name.trim().slice(0, 18) }
        : {}),
      ...(partial.major !== undefined ? { major: partial.major.trim().slice(0, 28) } : {}),
      ...(partial.emoji !== undefined ? { emoji: partial.emoji.trim().slice(0, 8) } : {}),
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export const DEFAULT_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true, major: 'Informatik', emoji: '💻' },
  { color: 'blau', name: 'WI-Leo', seatType: 'bot', active: true, major: 'Wirtschaftsinformatik', emoji: '⚖️' },
  { color: 'gelb', name: 'BWL-Justus', seatType: 'bot', active: true, major: 'BWL-Industrie', emoji: '📈' },
  { color: 'gruen', name: 'ET-Klara', seatType: 'bot', active: true, major: 'Elektrotechnik', emoji: '⚡' },
];

export function extractHashParam(prefix: string): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash;
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : '';
}

export function playTransitionSounds(prev: GameState | null, next: GameState): void {
  if (!prev) return;
  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
    sound.playVictory();
    return;
  }
  if (next.lastDice !== prev.lastDice && next.phase !== 'WAIT_ROLL') {
    sound.playDiceRoll();
  }
  if (next.players.some((p, i) => p.cash !== prev.players[i]?.cash)) {
    sound.playCashRegister();
  }
  if (next.players.some((p, i) => p.inJail && !prev.players[i]?.inJail)) {
    sound.playStampThud();
  }
}

export function isSeatAuthorizedForAction(
  state: GameState,
  seatIndex: number,
  action: GameAction
): boolean {
  if (state.phase === 'TRADE_REVIEW' && state.pendingTrade && action.type === 'RESPOND_TRADE') {
    return seatIndex === state.pendingTrade.toIndex;
  }
  if (state.phase === 'AUCTION' && state.auction) {
    if (action.type === 'PLACE_BID' || action.type === 'PASS_BID') {
      const expected = state.auction.activeBidders[state.auction.currentBidderPos];
      return seatIndex === expected && action.playerIndex === seatIndex;
    }
    return false;
  }
  return seatIndex === state.currentTurn;
}
