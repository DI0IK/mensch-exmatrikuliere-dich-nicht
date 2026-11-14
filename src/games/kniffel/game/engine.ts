import type { Language } from '../../../shared/types/game';
import { ALL_CATEGORIES, CATEGORY_LABELS, getTotalScore, scoreCategory } from './scoring';
import type { GameAction, GameSettings, GameState, KniffelCategory, PlayerConfig, PlayerScorecard } from './types';

export type RngFn = () => number;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  twistMode: true,
};

function rollDie(rng: RngFn): number {
  return Math.floor(rng() * 6) + 1;
}

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

export function createInitialState(
  rawPlayers: PlayerConfig[],
  settings: Partial<GameSettings> = {},
  rng: RngFn = Math.random
): GameState {
  const players = rawPlayers.filter((p) => p.active);
  if (players.length < 2) {
    throw new Error('ECTS-Kniffel requires at least 2 active players.');
  }

  const resolvedSettings: GameSettings = {
    twistMode: settings.twistMode ?? true,
  };

  const scorecards: Record<number, PlayerScorecard> = {};
  players.forEach((_, idx) => {
    scorecards[idx] = {
      scores: {},
      cheatTokens: resolvedSettings.twistMode ? 1 : 0,
      lockedCategory: null,
    };
  });

  const initialDice: [number, number, number, number, number] = [
    rollDie(rng),
    rollDie(rng),
    rollDie(rng),
    rollDie(rng),
    rollDie(rng),
  ];

  return {
    players,
    settings: resolvedSettings,
    dice: initialDice,
    held: [false, false, false, false, false],
    rollsLeft: 3,
    hasRolledThisTurn: false,
    round: 1,
    currentTurn: 0,
    phase: 'ROLLING',
    scorecards,
    winnerIndex: null,
    logs: [
      {
        id: 1,
        text: {
          de: 'Prüfungsphase gestartet! Viel Erfolg beim ECTS-Kniffel.',
          en: 'Exam session started! Good luck in ECTS Yahtzee.',
        },
        tone: 'highlight',
      },
    ],
    nextLogId: 2,
  };
}

export function getSelectableCategories(state: GameState, playerIndex: number): KniffelCategory[] {
  const card = state.scorecards[playerIndex];
  if (!card) return [];
  const open = ALL_CATEGORIES.filter(
    (cat) => card.scores[cat] === undefined && card.lockedCategory !== cat
  );
  if (open.length > 0) return open;
  // Fallback if the only remaining open category was locked
  return ALL_CATEGORIES.filter((cat) => card.scores[cat] === undefined);
}

export function applyGameAction(
  state: GameState,
  action: GameAction,
  rng: RngFn = Math.random
): GameState {
  if (state.phase === 'GAME_OVER') return state;
  if (action.playerIndex !== state.currentTurn) return state;

  const player = state.players[state.currentTurn];
  const card = state.scorecards[state.currentTurn];
  if (!player || !card) return state;

  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.rollsLeft <= 0) return state;
      const nextDice = state.dice.map((d, i) =>
        state.hasRolledThisTurn && state.held[i] ? d : rollDie(rng)
      ) as GameState['dice'];

      return {
        ...state,
        dice: nextDice,
        rollsLeft: state.rollsLeft - 1,
        hasRolledThisTurn: true,
      };
    }

    case 'TOGGLE_HOLD': {
      if (!state.hasRolledThisTurn || state.rollsLeft <= 0) return state;
      if (action.dieIndex < 0 || action.dieIndex > 4) return state;
      const nextHeld = [...state.held] as GameState['held'];
      nextHeld[action.dieIndex] = !nextHeld[action.dieIndex];
      return { ...state, held: nextHeld };
    }

    case 'USE_EXTRA_ROLL': {
      if (!state.settings.twistMode || card.cheatTokens <= 0 || !state.hasRolledThisTurn) {
        return state;
      }
      const log = addLog(
        state,
        {
          de: `${player.name} nutzt einen Spickzettel: Härtefallantrag (+1 Wurf)!`,
          en: `${player.name} spends a Cheat-Sheet: Extra Roll!`,
        },
        'highlight'
      );
      return {
        ...state,
        rollsLeft: state.rollsLeft + 1,
        scorecards: {
          ...state.scorecards,
          [state.currentTurn]: { ...card, cheatTokens: card.cheatTokens - 1 },
        },
        ...log,
      };
    }

    case 'USE_SET_DIE': {
      if (!state.settings.twistMode || card.cheatTokens <= 0 || !state.hasRolledThisTurn) {
        return state;
      }
      if (action.dieIndex < 0 || action.dieIndex > 4 || action.value < 1 || action.value > 6) {
        return state;
      }
      const nextDice = [...state.dice] as GameState['dice'];
      nextDice[action.dieIndex] = action.value;
      const nextHeld = [...state.held] as GameState['held'];
      nextHeld[action.dieIndex] = true;
      const log = addLog(
        state,
        {
          de: `${player.name} nutzt Spickzettel-Korrektur: Würfel #${action.dieIndex + 1} → ${action.value}!`,
          en: `${player.name} uses Cheat-Sheet Correction: Die #${action.dieIndex + 1} → ${action.value}!`,
        },
        'highlight'
      );
      return {
        ...state,
        dice: nextDice,
        held: nextHeld,
        scorecards: {
          ...state.scorecards,
          [state.currentTurn]: { ...card, cheatTokens: card.cheatTokens - 1 },
        },
        ...log,
      };
    }

    case 'USE_LOCK_CATEGORY': {
      if (!state.settings.twistMode || card.cheatTokens <= 0) return state;
      if (action.targetPlayerIndex === state.currentTurn) return state;
      const targetCard = state.scorecards[action.targetPlayerIndex];
      const targetPlayer = state.players[action.targetPlayerIndex];
      if (!targetCard || !targetPlayer || targetCard.scores[action.category] !== undefined) {
        return state;
      }
      const label = CATEGORY_LABELS[action.category];
      const log = addLog(
        state,
        {
          de: `${player.name} sperrt „${label.de}“ bei ${targetPlayer.name} für 1 Runde!`,
          en: `${player.name} locks "${label.en}" on ${targetPlayer.name} for 1 turn!`,
        },
        'bad'
      );
      return {
        ...state,
        scorecards: {
          ...state.scorecards,
          [state.currentTurn]: { ...card, cheatTokens: card.cheatTokens - 1 },
          [action.targetPlayerIndex]: { ...targetCard, lockedCategory: action.category },
        },
        ...log,
      };
    }

    case 'SCORE_CATEGORY': {
      if (!state.hasRolledThisTurn) return state;
      const selectable = getSelectableCategories(state, state.currentTurn);
      if (!selectable.includes(action.category)) return state;

      const pts = scoreCategory(state.dice, action.category);
      const earnedToken =
        state.settings.twistMode &&
        pts > 0 &&
        (action.category === 'fullHouse' ||
          action.category === 'largeStraight' ||
          action.category === 'kniffel')
          ? 1
          : 0;

      const nextCard: PlayerScorecard = {
        scores: { ...card.scores, [action.category]: pts },
        cheatTokens: Math.min(3, card.cheatTokens + earnedToken),
        lockedCategory: null, // clear lock after their turn
      };

      const nextScorecards = {
        ...state.scorecards,
        [state.currentTurn]: nextCard,
      };

      const label = CATEGORY_LABELS[action.category];
      const log = addLog(
        state,
        {
          de: `${player.name} trägt ${pts} ECTS bei „${label.de}“ ein.${earnedToken ? ' (+1 Spickzettel!)' : ''}`,
          en: `${player.name} scores ${pts} ECTS in "${label.en}".${earnedToken ? ' (+1 Cheat-Sheet!)' : ''}`,
        },
        pts >= 25 ? 'good' : 'neutral'
      );

      const nextTurn = (state.currentTurn + 1) % state.players.length;
      const nextRound = nextTurn === 0 ? state.round + 1 : state.round;
      const allDone = Object.values(nextScorecards).every(
        (sc) => Object.keys(sc.scores).length >= ALL_CATEGORIES.length
      );

      if (allDone || nextRound > ALL_CATEGORIES.length) {
        let bestIdx = 0;
        let bestTotal = -1;
        state.players.forEach((_, idx) => {
          const total = getTotalScore(nextScorecards[idx]);
          if (total > bestTotal) {
            bestTotal = total;
            bestIdx = idx;
          }
        });
        return {
          ...state,
          scorecards: nextScorecards,
          phase: 'GAME_OVER',
          winnerIndex: bestIdx,
          ...log,
        };
      }

      return {
        ...state,
        scorecards: nextScorecards,
        currentTurn: nextTurn,
        round: nextRound,
        rollsLeft: 3,
        hasRolledThisTurn: false,
        held: [false, false, false, false, false],
        ...log,
      };
    }
  }
}
