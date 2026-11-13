import { BOARD_TILES } from './boardData';
import type { RngFn } from './helpers';
import { applyCashDelta, movePlayerForward, resolveLanding, sendPlayerToJail } from './landing';
import type { GameState } from './types';

export function acknowledgeCard(state: GameState, rng: RngFn = Math.random): GameState {
  if (state.phase !== 'CARD_MODAL' || !state.drawnCard) return state;

  const card = state.drawnCard;
  const playerIdx = state.currentTurn;
  const player = state.players[playerIdx];
  const baseState: GameState = { ...state, drawnCard: null };
  const effect = card.effect;

  switch (effect.kind) {
    case 'cash': {
      let next = applyCashDelta(baseState, playerIdx, effect.amount, null);
      if (effect.amount < 0 && next.settings.freeParkingPot) {
        next = { ...next, freeParkingPot: next.freeParkingPot + Math.abs(effect.amount) };
      }
      return {
        ...next,
        phase: next.players[playerIdx].cash < 0 ? 'DEBT_RECOVERY' : 'TURN_ACTION',
      };
    }

    case 'jail_card': {
      const players = baseState.players.map((p, i) =>
        i === playerIdx ? { ...p, jailCards: p.jailCards + 1 } : p
      );
      return { ...baseState, players, phase: 'TURN_ACTION' };
    }

    case 'goto_jail': {
      return sendPlayerToJail(baseState, playerIdx, card.title.de, card.title.en);
    }

    case 'move_relative': {
      const targetPos = (((player.position + effect.steps) % 40) + 40) % 40;
      const next = {
        ...baseState,
        players: baseState.players.map((p, i) =>
          i === playerIdx ? { ...p, position: targetPos } : p
        ),
      };
      const diceTotal = baseState.lastDice ? baseState.lastDice[0] + baseState.lastDice[1] : 7;
      return resolveLanding(next, targetPos, diceTotal, false, rng);
    }

    case 'move_to': {
      const steps = (effect.tileIndex - player.position + 40) % 40;
      const next = movePlayerForward(baseState, playerIdx, steps, effect.collectStart);
      const diceTotal = baseState.lastDice ? baseState.lastDice[0] + baseState.lastDice[1] : 7;
      return resolveLanding(next, effect.tileIndex, diceTotal, false, rng);
    }

    case 'nearest_transit': {
      const transits = [5, 15, 25, 35];
      let target = transits.find((t) => t > player.position);
      if (target === undefined) target = transits[0];
      const steps = (target - player.position + 40) % 40;
      const next = movePlayerForward(baseState, playerIdx, steps, true);
      const diceTotal = baseState.lastDice ? baseState.lastDice[0] + baseState.lastDice[1] : 7;
      return resolveLanding(next, target, diceTotal, effect.doubleRent, rng);
    }

    case 'repairs': {
      let cost = 0;
      for (const tile of BOARD_TILES) {
        const prop = baseState.properties[tile.index];
        if (prop && prop.ownerIndex === playerIdx && prop.houses > 0) {
          if (prop.houses === 5) cost += effect.perHotel;
          else cost += prop.houses * effect.perHouse;
        }
      }
      let next = applyCashDelta(baseState, playerIdx, -cost, null);
      if (cost > 0 && next.settings.freeParkingPot) {
        next = { ...next, freeParkingPot: next.freeParkingPot + cost };
      }
      return {
        ...next,
        phase: next.players[playerIdx].cash < 0 ? 'DEBT_RECOVERY' : 'TURN_ACTION',
      };
    }

    case 'collect_from_all': {
      const others = baseState.players.filter((p) => !p.bankrupt && p.index !== playerIdx);
      const totalGain = others.length * effect.amount;
      const players = baseState.players.map((p) => {
        if (p.bankrupt) return p;
        if (p.index === playerIdx) return { ...p, cash: p.cash + totalGain };
        return { ...p, cash: p.cash - effect.amount };
      });
      return { ...baseState, players, phase: 'TURN_ACTION' };
    }

    case 'pay_to_all': {
      const others = baseState.players.filter((p) => !p.bankrupt && p.index !== playerIdx);
      const totalCost = others.length * effect.amount;
      const players = baseState.players.map((p) => {
        if (p.bankrupt) return p;
        if (p.index === playerIdx) return { ...p, cash: p.cash - totalCost };
        return { ...p, cash: p.cash + effect.amount };
      });
      return {
        ...baseState,
        players,
        phase: players[playerIdx].cash < 0 ? 'DEBT_RECOVERY' : 'TURN_ACTION',
      };
    }
  }
}
