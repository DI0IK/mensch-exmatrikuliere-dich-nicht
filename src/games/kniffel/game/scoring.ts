import type { Language } from '../../../shared/types/game';
import type { KniffelCategory, PlayerScorecard } from './types';

export const UPPER_CATEGORIES: KniffelCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
];

export const LOWER_CATEGORIES: KniffelCategory[] = [
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'kniffel',
  'chance',
];

export const ALL_CATEGORIES: KniffelCategory[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

export const CATEGORY_LABELS: Record<KniffelCategory, Record<Language, string>> = {
  ones: { de: 'Einser (1)', en: 'Ones (1)' },
  twos: { de: 'Zweier (2)', en: 'Twos (2)' },
  threes: { de: 'Dreier (3)', en: 'Threes (3)' },
  fours: { de: 'Vierer (4)', en: 'Fours (4)' },
  fives: { de: 'Fünfer (5)', en: 'Fives (5)' },
  sixes: { de: 'Sechser (6)', en: 'Sixes (6)' },
  threeOfAKind: { de: 'Dreierpasch', en: 'Three of a Kind' },
  fourOfAKind: { de: 'Viererpasch', en: 'Four of a Kind' },
  fullHouse: { de: 'Full House', en: 'Full House' },
  smallStraight: { de: 'Kleine Straße', en: 'Small Straight' },
  largeStraight: { de: 'Große Straße', en: 'Large Straight' },
  kniffel: { de: 'ECTS-Kniffel!', en: 'ECTS Yahtzee!' },
  chance: { de: 'Chance', en: 'Chance' },
};

export function scoreCategory(
  dice: readonly number[],
  category: KniffelCategory
): number {
  const counts = new Map<number, number>();
  let sum = 0;
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
    sum += d;
  }

  const values = Array.from(counts.values());
  const uniqueSorted = Array.from(counts.keys()).sort((a, b) => a - b);

  switch (category) {
    case 'ones':
      return (counts.get(1) ?? 0) * 1;
    case 'twos':
      return (counts.get(2) ?? 0) * 2;
    case 'threes':
      return (counts.get(3) ?? 0) * 3;
    case 'fours':
      return (counts.get(4) ?? 0) * 4;
    case 'fives':
      return (counts.get(5) ?? 0) * 5;
    case 'sixes':
      return (counts.get(6) ?? 0) * 6;
    case 'threeOfAKind':
      return values.some((c) => c >= 3) ? sum : 0;
    case 'fourOfAKind':
      return values.some((c) => c >= 4) ? sum : 0;
    case 'fullHouse':
      return (values.includes(3) && values.includes(2)) || values.includes(5) ? 25 : 0;
    case 'smallStraight': {
      const hasRun = (start: number) =>
        [start, start + 1, start + 2, start + 3].every((n) => counts.has(n));
      return hasRun(1) || hasRun(2) || hasRun(3) ? 30 : 0;
    }
    case 'largeStraight': {
      const str = uniqueSorted.join('');
      return str === '12345' || str === '23456' ? 40 : 0;
    }
    case 'kniffel':
      return values.includes(5) ? 50 : 0;
    case 'chance':
      return sum;
  }
}

export function getUpperSum(card: PlayerScorecard): number {
  return UPPER_CATEGORIES.reduce((acc, cat) => acc + (card.scores[cat] ?? 0), 0);
}

export function getUpperBonus(card: PlayerScorecard): number {
  return getUpperSum(card) >= 63 ? 35 : 0;
}

export function getTotalScore(card: PlayerScorecard): number {
  const base = ALL_CATEGORIES.reduce((acc, cat) => acc + (card.scores[cat] ?? 0), 0);
  return base + getUpperBonus(card);
}
