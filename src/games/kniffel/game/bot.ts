import { getSelectableCategories } from './engine';
import { scoreCategory } from './scoring';
import type { GameAction, GameState, KniffelCategory } from './types';

function computeTargetHoldMask(dice: readonly number[]): boolean[] {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  let bestVal = dice[0];
  let bestCount = 0;
  for (const [val, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && val > bestVal)) {
      bestVal = val;
      bestCount = count;
    }
  }

  // If we have 4 unique sequential-ish dice (potential straight), hold unique values
  if (bestCount <= 1) {
    const seen = new Set<number>();
    return dice.map((d) => {
      if (d >= 2 && d <= 5 && !seen.has(d)) {
        seen.add(d);
        return true;
      }
      return false;
    });
  }

  return dice.map((d) => d === bestVal);
}

export function decideBotAction(state: GameState, botIndex: number): GameAction | null {
  if (state.phase === 'GAME_OVER' || state.currentTurn !== botIndex) return null;

  if (!state.hasRolledThisTurn) {
    return { type: 'ROLL_DICE', playerIndex: botIndex };
  }

  const selectable = getSelectableCategories(state, botIndex);
  if (selectable.length === 0) return null;

  const card = state.scorecards[botIndex];

  // If rolls remain, check if we already hit a great score (Kniffel / Large Straight / Full House)
  if (state.rollsLeft > 0) {
    if (
      (selectable.includes('kniffel') && scoreCategory(state.dice, 'kniffel') === 50) ||
      (selectable.includes('largeStraight') && scoreCategory(state.dice, 'largeStraight') === 40)
    ) {
      const cat: KniffelCategory =
        selectable.includes('kniffel') && scoreCategory(state.dice, 'kniffel') === 50
          ? 'kniffel'
          : 'largeStraight';
      return { type: 'SCORE_CATEGORY', playerIndex: botIndex, category: cat };
    }

    const desiredHold = computeTargetHoldMask(state.dice);
    for (let i = 0; i < 5; i++) {
      if (state.held[i] !== desiredHold[i]) {
        return { type: 'TOGGLE_HOLD', playerIndex: botIndex, dieIndex: i };
      }
    }
    return { type: 'ROLL_DICE', playerIndex: botIndex };
  }

  // Twist mode: if out of rolls, holding 4-of-a-kind, and have a cheatToken, complete Kniffel!
  if (state.settings.twistMode && (card?.cheatTokens ?? 0) > 0 && selectable.includes('kniffel')) {
    const counts = new Map<number, number>();
    for (const d of state.dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    for (const [val, cnt] of counts.entries()) {
      if (cnt === 4) {
        const oddIdx = state.dice.findIndex((d) => d !== val);
        if (oddIdx >= 0) {
          return { type: 'USE_SET_DIE', playerIndex: botIndex, dieIndex: oddIdx, value: val };
        }
      }
    }
  }

  // Pick highest-scoring open category (prefer sacrificing low-value categories over kniffel if all 0)
  let bestCat = selectable[0];
  let bestScore = -1;

  for (const cat of selectable) {
    const pts = scoreCategory(state.dice, cat);
    // Slight preference to save Chance if score is low
    const adjusted = cat === 'chance' && pts < 18 ? pts - 6 : pts;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestCat = cat;
    }
  }

  if (bestScore <= 0) {
    const sacrificeOrder: KniffelCategory[] = [
      'ones',
      'twos',
      'kniffel',
      'fourOfAKind',
      'largeStraight',
      'threeOfAKind',
      'threes',
    ];
    for (const cat of sacrificeOrder) {
      if (selectable.includes(cat)) {
        bestCat = cat;
        break;
      }
    }
  }

  return { type: 'SCORE_CATEGORY', playerIndex: botIndex, category: bestCat };
}
