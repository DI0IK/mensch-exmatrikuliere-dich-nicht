import { stepsFromStart } from './boardGeometry';
import { computeTargetLocation } from './engine';
import type { GameState } from './types';

/**
 * Smart bot heuristic for choosing the best legal pawn to move.
 * Prioritizes:
 * 1. Entering or advancing inside the goal stretch
 * 2. Immatriculating from base on a 6
 * 3. Clearing own start tile
 * 4. Engaging in an Exmatriculation duel (especially against an opponent far along the track)
 * 5. Advancing the pawn closest to goal
 */
export function chooseBestBotPawn(state: GameState): string | null {
  if (state.phase !== 'SELECT_PAWN' || state.lastRoll === null) return null;
  if (state.legalPawnIds.length === 0) return null;
  if (state.legalPawnIds.length === 1) return state.legalPawnIds[0];

  const dice = state.lastRoll;
  let bestId = state.legalPawnIds[0];
  let bestScore = -Infinity;

  for (const pawnId of state.legalPawnIds) {
    const pawn = state.pawns.find((p) => p.id === pawnId);
    if (!pawn) continue;
    const target = computeTargetLocation(pawn, dice, state.pawns);
    if (!target) continue;

    let score = 0;

    // 1. Entering or advancing in goal
    if (target.zone === 'goal') {
      score += 120 + target.slot * 15;
    }

    // 2. Immatriculating from base
    if (pawn.location.zone === 'base' && target.zone === 'track') {
      score += 95;
    }

    // 3. Clearing own start tile
    if (pawn.location.zone === 'track' && stepsFromStart(pawn.color, pawn.location.index) === 0) {
      score += 65;
    }

    // 4. Duel evaluation
    if (target.zone === 'track') {
      const opponent = state.pawns.find(
        (p) =>
          p.playerIndex !== pawn.playerIndex &&
          p.location.zone === 'track' &&
          p.location.index === target.index
      );
      if (opponent) {
        const oppSteps = stepsFromStart(opponent.color, target.index);
        const mySteps =
          pawn.location.zone === 'track' ? stepsFromStart(pawn.color, pawn.location.index) : 0;
        // Worth dueling if opponent is far along or we are early; slightly risky if we're almost at goal
        score += 35 + oppSteps * 1.1 - mySteps * 0.5;
      }
    }

    // 5. General progress along track
    if (pawn.location.zone === 'track') {
      score += stepsFromStart(pawn.color, pawn.location.index) * 0.8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = pawnId;
    }
  }

  return bestId;
}
