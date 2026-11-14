import { CARD_COLORS } from './deck';
import { isCardPlayable } from './engine';
import type { CardColor, GameAction, GameState } from './types';

function pickBestColorForHand(state: GameState, botIndex: number): CardColor {
  const hand = state.hands[botIndex] ?? [];
  const counts: Record<CardColor, number> = { rot: 0, blau: 0, gelb: 0, gruen: 0 };
  for (const c of hand) {
    if (c.color !== 'wild') counts[c.color]++;
  }
  let best: CardColor = CARD_COLORS[0];
  let max = -1;
  for (const color of CARD_COLORS) {
    if (counts[color] > max) {
      max = counts[color];
      best = color;
    }
  }
  return best;
}

function pickLeaderOpponent(state: GameState, botIndex: number): number {
  let bestIdx = (botIndex + 1) % state.players.length;
  let minCards = Infinity;
  state.players.forEach((_, idx) => {
    if (idx === botIndex) return;
    const len = state.hands[idx]?.length ?? 99;
    if (len < minCards) {
      minCards = len;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

export function decideBotAction(state: GameState, botIndex: number): GameAction | null {
  if (state.phase === 'GAME_OVER' || state.currentTurn !== botIndex) return null;

  if (state.phase === 'CHOOSE_COLOR') {
    return {
      type: 'CHOOSE_COLOR',
      playerIndex: botIndex,
      color: pickBestColorForHand(state, botIndex),
    };
  }

  if (state.phase === 'CHOOSE_SWAP_TARGET' || state.phase === 'CHOOSE_STEAL_TARGET') {
    return {
      type: 'CHOOSE_TARGET',
      playerIndex: botIndex,
      targetPlayerIndex: pickLeaderOpponent(state, botIndex),
    };
  }

  const hand = state.hands[botIndex] ?? [];
  if (hand.length === 2 && !state.unoCalled[botIndex]) {
    const hasPlayable = hand.some((c) => isCardPlayable(state, c));
    if (hasPlayable) {
      return { type: 'CALL_UNO', playerIndex: botIndex };
    }
  }

  const playable = hand.filter((c) => isCardPlayable(state, c));
  if (playable.length === 0) {
    return { type: 'DRAW_CARD', playerIndex: botIndex };
  }

  // Prefer non-wild action cards, then colored number cards, saving wilds for last
  const priority = (val: string) => {
    if (val === 'draw2' || val === 'skip' || val === 'reverse') return 3;
    if (val === 'swapHands' || val === 'stealCard') return hand.length >= 4 ? 2 : 0;
    if (val === 'wild' || val === 'wild4') return 1;
    return 4;
  };

  const sorted = [...playable].sort((a, b) => priority(b.value) - priority(a.value));
  return { type: 'PLAY_CARD', playerIndex: botIndex, cardId: sorted[0].id };
}
