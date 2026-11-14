import type { Language } from '../../../shared/types/game';
import type { CardColor, CardValue, GameSettings, UnoCard } from './types';

export type RngFn = () => number;

export const CARD_COLORS: CardColor[] = ['rot', 'blau', 'gelb', 'gruen'];

export const CARD_VALUE_LABELS: Record<CardValue, { icon: string; label: Record<Language, string> }> = {
  '0': { icon: '0', label: { de: '0', en: '0' } },
  '1': { icon: '1', label: { de: '1', en: '1' } },
  '2': { icon: '2', label: { de: '2', en: '2' } },
  '3': { icon: '3', label: { de: '3', en: '3' } },
  '4': { icon: '4', label: { de: '4', en: '4' } },
  '5': { icon: '5', label: { de: '5', en: '5' } },
  '6': { icon: '6', label: { de: '6', en: '6' } },
  '7': { icon: '7', label: { de: '7', en: '7' } },
  '8': { icon: '8', label: { de: '8', en: '8' } },
  '9': { icon: '9', label: { de: '9', en: '9' } },
  skip: { icon: '🚫', label: { de: 'Vorlesungsausfall', en: 'Skip Lecture' } },
  reverse: { icon: '🔄', label: { de: 'Nachschreibetermin', en: 'Reverse' } },
  draw2: { icon: '+2', label: { de: 'Nachtschicht +2', en: 'All-Nighter +2' } },
  wild: { icon: '🎓', label: { de: 'Fachwechsel', en: 'Change Major' } },
  wild4: { icon: '💀+4', label: { de: 'Exmatrikulation +4', en: 'Expulsion +4' } },
  swapHands: { icon: '🤝', label: { de: 'Gruppenarbeit (Tausch)', en: 'Group Work (Swap)' } },
  stealCard: { icon: '🕵️', label: { de: 'Altklausur (Klau)', en: 'Past Exam (Steal)' } },
};

export function shuffleCards<T>(items: T[], rng: RngFn = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildUnoDeck(settings: GameSettings, rng: RngFn = Math.random): UnoCard[] {
  const cards: UnoCard[] = [];
  let seq = 1;
  const push = (color: UnoCard['color'], value: CardValue, count = 1) => {
    for (let i = 0; i < count; i++) {
      cards.push({ id: `u-${seq++}`, color, value });
    }
  };

  for (const color of CARD_COLORS) {
    push(color, '0', 1);
    const numbers: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (const n of numbers) {
      push(color, n, 2);
    }
    push(color, 'skip', 2);
    push(color, 'reverse', 2);
    push(color, 'draw2', 2);
  }

  push('wild', 'wild', 4);
  push('wild', 'wild4', 4);

  if (settings.campusChaos) {
    push('wild', 'swapHands', 2);
    push('wild', 'stealCard', 2);
  }

  return shuffleCards(cards, rng);
}
