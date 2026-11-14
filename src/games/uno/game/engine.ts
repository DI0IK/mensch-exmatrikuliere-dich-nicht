import { COLOR_LABELS, type Language } from '../../../shared/types/game';
import { buildUnoDeck, CARD_VALUE_LABELS, shuffleCards, type RngFn } from './deck';
import type { GameAction, GameSettings, GameState, PlayerConfig, UnoCard } from './types';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  campusChaos: true,
  stackDrawCards: true,
};

function addLog(
  state: GameState,
  text: Record<Language, string>,
  tone: GameState['logs'][number]['tone'] = 'neutral'
): Pick<GameState, 'logs' | 'nextLogId'> {
  return {
    logs: [{ id: state.nextLogId, text, tone }, ...state.logs].slice(0, 40),
    nextLogId: state.nextLogId + 1,
  };
}

function advanceIndex(current: number, direction: 1 | -1, count: number, steps = 1): number {
  return (((current + direction * steps) % count) + count) % count;
}

function drawFromPile(
  drawPile: UnoCard[],
  discardPile: UnoCard[],
  count: number,
  rng: RngFn
): { drawn: UnoCard[]; drawPile: UnoCard[]; discardPile: UnoCard[] } {
  let curDraw = [...drawPile];
  let curDiscard = [...discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (curDraw.length === 0) {
      if (curDiscard.length <= 1) break;
      const top = curDiscard[curDiscard.length - 1];
      const recycled = shuffleCards(curDiscard.slice(0, -1), rng);
      curDraw = recycled;
      curDiscard = [top];
    }
    const card = curDraw.pop();
    if (card) drawn.push(card);
  }

  return { drawn, drawPile: curDraw, discardPile: curDiscard };
}

export function createInitialState(
  rawPlayers: PlayerConfig[],
  settings: Partial<GameSettings> = {},
  rng: RngFn = Math.random
): GameState {
  const players = rawPlayers.filter((p) => p.active);
  if (players.length < 2) {
    throw new Error('Prüfungs-UNO requires at least 2 active players.');
  }

  const resolvedSettings: GameSettings = {
    campusChaos: settings.campusChaos ?? true,
    stackDrawCards: settings.stackDrawCards ?? true,
  };

  let deck = buildUnoDeck(resolvedSettings, rng);
  const hands: Record<number, UnoCard[]> = {};
  const unoCalled: Record<number, boolean> = {};

  players.forEach((_, idx) => {
    hands[idx] = deck.splice(0, 7);
    unoCalled[idx] = false;
  });

  // Pick a non-wild starting discard card
  let starterIdx = deck.findIndex((c) => c.color !== 'wild');
  if (starterIdx === -1) starterIdx = 0;
  const [starter] = deck.splice(starterIdx, 1);

  return {
    players,
    settings: resolvedSettings,
    hands,
    drawPile: deck,
    discardPile: [starter],
    activeColor: starter.color === 'wild' ? 'rot' : starter.color,
    direction: 1,
    pendingDrawCount: 0,
    currentTurn: 0,
    phase: 'PLAY_OR_DRAW',
    unoCalled,
    winnerIndex: null,
    logs: [
      {
        id: 1,
        text: {
          de: 'Prüfungs-UNO gestartet! 7 Karten pro Studi.',
          en: 'Exam UNO started! 7 cards per student.',
        },
        tone: 'highlight',
      },
    ],
    nextLogId: 2,
  };
}

export function isCardPlayable(state: GameState, card: UnoCard): boolean {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return true;

  if (state.pendingDrawCount > 0) {
    if (!state.settings.stackDrawCards) return false;
    return card.value === 'draw2' || card.value === 'wild4';
  }

  if (card.color === 'wild') return true;
  if (card.color === state.activeColor) return true;
  return card.value === top.value;
}

function checkWinner(state: GameState, playerIndex: number): GameState {
  const hand = state.hands[playerIndex];
  if (hand && hand.length === 0) {
    const winner = state.players[playerIndex];
    const log = addLog(
      state,
      {
        de: `🏆 ${winner.name} hat alle Karten abgelegt und gewinnt!`,
        en: `🏆 ${winner.name} shed all cards and wins!`,
      },
      'good'
    );
    return {
      ...state,
      phase: 'GAME_OVER',
      winnerIndex: playerIndex,
      ...log,
    };
  }
  return state;
}

export function applyGameAction(
  state: GameState,
  action: GameAction,
  rng: RngFn = Math.random
): GameState {
  if (state.phase === 'GAME_OVER') return state;

  if (action.type === 'CALL_UNO') {
    const p = state.players[action.playerIndex];
    const hand = state.hands[action.playerIndex];
    if (!p || !hand || hand.length > 2) return state;
    const log = addLog(
      state,
      { de: `📢 ${p.name} ruft UNO!`, en: `📢 ${p.name} calls UNO!` },
      'highlight'
    );
    return {
      ...state,
      unoCalled: { ...state.unoCalled, [action.playerIndex]: true },
      ...log,
    };
  }

  if (action.playerIndex !== state.currentTurn) return state;
  const player = state.players[state.currentTurn];
  const playerCount = state.players.length;
  if (!player) return state;

  switch (action.type) {
    case 'PLAY_CARD': {
      if (state.phase !== 'PLAY_OR_DRAW') return state;
      const hand = state.hands[state.currentTurn] ?? [];
      const card = hand.find((c) => c.id === action.cardId);
      if (!card || !isCardPlayable(state, card)) return state;

      const nextHand = hand.filter((c) => c.id !== card.id);
      const nextHands = { ...state.hands, [state.currentTurn]: nextHand };
      const nextDiscard = [...state.discardPile, card];
      const nextUno = { ...state.unoCalled, [state.currentTurn]: nextHand.length <= 1 ? state.unoCalled[state.currentTurn] : false };

      const cardLabel = CARD_VALUE_LABELS[card.value].label;
      const log = addLog(state, {
        de: `${player.name} legt ${cardLabel.de}.`,
        en: `${player.name} plays ${cardLabel.en}.`,
      });

      const baseNext: GameState = {
        ...state,
        hands: nextHands,
        discardPile: nextDiscard,
        unoCalled: nextUno,
        activeColor: card.color === 'wild' ? state.activeColor : card.color,
        ...log,
      };

      // Win immediately if hand is empty
      if (nextHand.length === 0) {
        return checkWinner(baseNext, state.currentTurn);
      }

      if (card.value === 'wild' || card.value === 'wild4') {
        return {
          ...baseNext,
          pendingDrawCount:
            card.value === 'wild4' ? state.pendingDrawCount + 4 : state.pendingDrawCount,
          phase: 'CHOOSE_COLOR',
        };
      }

      if (card.value === 'swapHands') {
        return { ...baseNext, phase: 'CHOOSE_SWAP_TARGET' };
      }

      if (card.value === 'stealCard') {
        return { ...baseNext, phase: 'CHOOSE_STEAL_TARGET' };
      }

      if (card.value === 'reverse') {
        const nextDir: 1 | -1 = state.direction === 1 ? -1 : 1;
        // In 2-player UNO, Reverse acts like Skip
        const steps = playerCount === 2 ? 2 : 1;
        return {
          ...baseNext,
          direction: nextDir,
          currentTurn: advanceIndex(state.currentTurn, nextDir, playerCount, steps),
        };
      }

      if (card.value === 'skip') {
        return {
          ...baseNext,
          currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 2),
        };
      }

      if (card.value === 'draw2') {
        return {
          ...baseNext,
          pendingDrawCount: state.pendingDrawCount + 2,
          currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
        };
      }

      return {
        ...baseNext,
        currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
      };
    }

    case 'DRAW_CARD': {
      if (state.phase !== 'PLAY_OR_DRAW') return state;
      const drawAmount = state.pendingDrawCount > 0 ? state.pendingDrawCount : 1;
      const res = drawFromPile(state.drawPile, state.discardPile, drawAmount, rng);
      const curHand = state.hands[state.currentTurn] ?? [];
      const nextHand = [...curHand, ...res.drawn];

      const log = addLog(
        state,
        {
          de: `${player.name} zieht ${res.drawn.length} Karte${res.drawn.length === 1 ? '' : 'n'}.`,
          en: `${player.name} draws ${res.drawn.length} card${res.drawn.length === 1 ? '' : 's'}.`,
        },
        state.pendingDrawCount > 0 ? 'bad' : 'neutral'
      );

      return {
        ...state,
        hands: { ...state.hands, [state.currentTurn]: nextHand },
        drawPile: res.drawPile,
        discardPile: res.discardPile,
        pendingDrawCount: 0,
        unoCalled: { ...state.unoCalled, [state.currentTurn]: false },
        currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
        ...log,
      };
    }

    case 'CHOOSE_COLOR': {
      if (state.phase !== 'CHOOSE_COLOR') return state;
      const colorName = COLOR_LABELS;
      const log = addLog(
        state,
        {
          de: `${player.name} wählt ${colorName.de[action.color]}.`,
          en: `${player.name} chooses ${colorName.en[action.color]}.`,
        },
        'highlight'
      );
      return {
        ...state,
        activeColor: action.color,
        phase: 'PLAY_OR_DRAW',
        currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
        ...log,
      };
    }

    case 'CHOOSE_TARGET': {
      if (
        (state.phase !== 'CHOOSE_SWAP_TARGET' && state.phase !== 'CHOOSE_STEAL_TARGET') ||
        action.targetPlayerIndex === state.currentTurn
      ) {
        return state;
      }
      const targetPlayer = state.players[action.targetPlayerIndex];
      const myHand = state.hands[state.currentTurn] ?? [];
      const targetHand = state.hands[action.targetPlayerIndex] ?? [];
      if (!targetPlayer) return state;

      if (state.phase === 'CHOOSE_SWAP_TARGET') {
        const log = addLog(
          state,
          {
            de: `🤝 ${player.name} tauscht alle Handkarten mit ${targetPlayer.name}!`,
            en: `🤝 ${player.name} swaps hands with ${targetPlayer.name}!`,
          },
          'highlight'
        );
        return {
          ...state,
          hands: {
            ...state.hands,
            [state.currentTurn]: targetHand,
            [action.targetPlayerIndex]: myHand,
          },
          phase: 'PLAY_OR_DRAW',
          currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
          ...log,
        };
      }

      // CHOOSE_STEAL_TARGET
      if (targetHand.length === 0) {
        return {
          ...state,
          phase: 'PLAY_OR_DRAW',
          currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
        };
      }
      const stolenIdx = Math.floor(rng() * targetHand.length);
      const stolenCard = targetHand[stolenIdx];
      const nextTargetHand = targetHand.filter((_, i) => i !== stolenIdx);
      const nextMyHand = [...myHand, stolenCard];

      const log = addLog(
        state,
        {
          de: `🕵️ ${player.name} klaut eine Karte von ${targetPlayer.name}!`,
          en: `🕵️ ${player.name} steals a card from ${targetPlayer.name}!`,
        },
        'bad'
      );

      const nextState: GameState = {
        ...state,
        hands: {
          ...state.hands,
          [state.currentTurn]: nextMyHand,
          [action.targetPlayerIndex]: nextTargetHand,
        },
        phase: 'PLAY_OR_DRAW',
        currentTurn: advanceIndex(state.currentTurn, state.direction, playerCount, 1),
        ...log,
      };
      return checkWinner(nextState, action.targetPlayerIndex);
    }
  }
}
