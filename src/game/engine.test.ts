import { describe, expect, it } from 'vitest';
import { chooseBestBotPawn } from './bot';
import {
  acknowledgeActivity,
  acknowledgeDuel,
  createInitialState,
  resolveDuelRoll,
  rollDice,
  rollDuelDie,
  selectPawn,
} from './engine';
import type { PlayerConfig } from './types';

function twoPlayers(): PlayerConfig[] {
  return [
    { color: 'rot', name: 'Anna', seatType: 'human-local', active: true },
    { color: 'blau', name: 'Bot', seatType: 'bot', active: true },
    { color: 'gelb', name: 'P3', seatType: 'bot', active: false },
    { color: 'gruen', name: 'P4', seatType: 'bot', active: false },
  ];
}

// Helper to create deterministic RNG returning sequence of 1..6 dice values
function seqRng(diceValues: number[]): () => number {
  let i = 0;
  return () => {
    const val = diceValues[i % diceValues.length];
    i++;
    return (val - 1) / 6 + 0.01;
  };
}

describe('Mensch exmatrikuliere dich nicht - Game Engine', () => {
  it('allows 3 attempts in base when rolling non-6, then passes turn', () => {
    let state = createInitialState(twoPlayers());
    expect(state.currentTurn).toBe(0);

    // Attempt 1: roll 3
    state = rollDice(state, seqRng([3]));
    expect(state.currentTurn).toBe(0);
    expect(state.rollAttemptsInBase).toBe(1);
    expect(state.phase).toBe('WAIT_ROLL');

    // Attempt 2: roll 2
    state = rollDice(state, seqRng([2]));
    expect(state.currentTurn).toBe(0);
    expect(state.rollAttemptsInBase).toBe(2);

    // Attempt 3: roll 5 -> passes turn to player 1
    state = rollDice(state, seqRng([5]));
    expect(state.currentTurn).toBe(1);
    expect(state.rollAttemptsInBase).toBe(0);
    expect(state.phase).toBe('WAIT_ROLL');
  });

  it('immatriculates a pawn on rolling a 6 and grants bonus roll', () => {
    let state = createInitialState(twoPlayers());
    state = rollDice(state, seqRng([6]));
    expect(state.phase).toBe('SELECT_PAWN');
    expect(state.legalPawnIds).toHaveLength(4);

    state = selectPawn(state, 'rot-0');
    const pawn = state.pawns.find((p) => p.id === 'rot-0')!;
    expect(pawn.location).toEqual({ zone: 'track', index: 0 });
    expect(state.currentTurn).toBe(0); // bonus roll for 6
    expect(state.phase).toBe('WAIT_ROLL');
  });

  it('forces clearing own start tile when pawns remain in base', () => {
    let state = createInitialState(twoPlayers());
    state = rollDice(state, seqRng([6]));
    state = selectPawn(state, 'rot-0'); // rot-0 is on track 0

    state = rollDice(state, seqRng([4]));
    expect(state.legalPawnIds).toEqual(['rot-0']);

    // Even if another pawn was also on track, start tile must clear first if pawns in base
    state = selectPawn(state, 'rot-0'); // rot-0 moves to track 4
    state = rollDice(state, seqRng([6])); // Next turn? Wait: rot rolled 4, so turn passed to blau
    expect(state.currentTurn).toBe(1);
  });

  it('triggers 1v1 Exmatriculation duel on landing on opponent, re-rolls ties, and exmatriculates loser', () => {
    let state = createInitialState(twoPlayers());
    // Place rot-0 on track 9 and blau-0 on track 10 (blau start)
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 9 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 10 } };
        return p;
      }),
    };

    // Rot rolls 1 -> lands on track 10 (blau-0)
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'rot-0');
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel).not.toBeNull();
    expect(state.duel?.attackerPlayerIndex).toBe(0);
    expect(state.duel?.defenderPlayerIndex).toBe(1);

    // Round 1: Tie (4 vs 4) -> stays in DUEL_ROLL
    state = resolveDuelRoll(state, seqRng([4, 4]));
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.rounds).toHaveLength(1);
    expect(state.duel?.winner).toBeNull();

    // Round 2: Defender wins (2 vs 5) -> Attacker rot-0 is exmatriculated back to base!
    state = resolveDuelRoll(state, seqRng([2, 5]));
    expect(state.phase).toBe('DUEL_RESULT');
    expect(state.duel?.winner).toBe('defender');

    const rot0 = state.pawns.find((p) => p.id === 'rot-0')!;
    const blau0 = state.pawns.find((p) => p.id === 'blau-0')!;
    expect(rot0.location.zone).toBe('base');
    expect(blau0.location).toEqual({ zone: 'track', index: 10 });

    state = acknowledgeDuel(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(1); // Rot didn't roll 6, so turn passes to Blau
  });

  it('detects victory when all 4 pawns reach goal', () => {
    let state = createInitialState(twoPlayers());
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'goal', slot: 1 } };
        if (p.id === 'rot-1') return { ...p, location: { zone: 'goal', slot: 2 } };
        if (p.id === 'rot-2') return { ...p, location: { zone: 'goal', slot: 3 } };
        if (p.id === 'rot-3') return { ...p, location: { zone: 'track', index: 39 } };
        return p;
      }),
    };

    // Rot rolls 1 -> rot-3 lands on goal slot 0!
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'rot-3');
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winnerIndex).toBe(0);
  });

  it('bot prioritizes entering goal over regular track moves', () => {
    let state = createInitialState(twoPlayers());
    state = {
      ...state,
      currentTurn: 1,
      pawns: state.pawns.map((p) => {
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 9 } }; // 1 step from goal!
        if (p.id === 'blau-1') return { ...p, location: { zone: 'track', index: 15 } };
        return p;
      }),
    };
    state = rollDice(state, seqRng([1]));
    const choice = chooseBestBotPawn(state);
    expect(choice).toBe('blau-0');
  });

  it('hardcore mode triggers Mensa good (+3) and bad (skip turn) outcomes', () => {
    // Good outcome (rng < 0.5)
    let state = createInitialState(twoPlayers(), { hardcore: true });
    state = {
      ...state,
      pawns: state.pawns.map((p) =>
        p.id === 'rot-0' ? { ...p, location: { zone: 'track', index: 0 } } : p
      ),
    };
    state = rollDice(state, seqRng([4]));
    state = selectPawn(state, 'rot-0', () => 0.1);
    expect(state.phase).toBe('ACTIVITY_RESULT');
    expect(state.activity?.type).toBe('mensa');
    expect(state.activity?.outcome).toBe('good');
    expect(state.pawns.find((p) => p.id === 'rot-0')?.location).toEqual({
      zone: 'track',
      index: 7,
    });
    state = acknowledgeActivity(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(1);

    // Bad outcome (rng >= 0.5) -> skips Rot's next turn
    state = {
      ...state,
      currentTurn: 0,
      pawns: state.pawns.map((p) =>
        p.id === 'rot-0' ? { ...p, location: { zone: 'track', index: 0 } } : p
      ),
    };
    state = rollDice(state, seqRng([4]));
    state = selectPawn(state, 'rot-0', () => 0.9);
    expect(state.activity?.outcome).toBe('bad');
    expect(state.skippedTurns[0]).toBe(1);
    state = acknowledgeActivity(state);
    expect(state.currentTurn).toBe(1); // Blau's turn

    // Blau rolls 1 (moves blau-0 from base? No, rolls 1 in base -> 3 attempts or pass)
    state = {
      ...state,
      pawns: state.pawns.map((p) =>
        p.id === 'blau-0' ? { ...p, location: { zone: 'track', index: 11 } } : p
      ),
    };
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'blau-0', () => 0.1);
    // Rot was supposed to be next, but skippedTurns[0] === 1 -> wraps back to Blau!
    expect(state.currentTurn).toBe(1);
    expect(state.skippedTurns[0]).toBe(0);
  });

  it('hardcore activity boost can enter goal and trigger duel on opponent', () => {
    let state = createInitialState(twoPlayers(), { hardcore: true });
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 0 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 7 } };
        return p;
      }),
    };
    // Rot rolls 4 -> lands on Mensa (4), gets +3 -> lands on 7 where blau-0 is!
    state = rollDice(state, seqRng([4]));
    state = selectPawn(state, 'rot-0', () => 0.1);
    expect(state.phase).toBe('ACTIVITY_RESULT');
    expect(state.activity?.pendingDuelOpponentId).toBe('blau-0');
    state = acknowledgeActivity(state);
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.defenderPawnId).toBe('blau-0');
  });

  it('hardcore 6-6-6 triggers 50/50 instant win or full exmatriculation', () => {
    // 1) Win case
    let winState = createInitialState(twoPlayers(), { hardcore: true });
    winState = {
      ...winState,
      pawns: winState.pawns.map((p) =>
        p.id === 'rot-0' ? { ...p, location: { zone: 'track', index: 0 } } : p
      ),
    };
    winState = rollDice(winState, seqRng([6]));
    winState = selectPawn(winState, 'rot-0', () => 0.9);
    winState = rollDice(winState, seqRng([6]));
    winState = selectPawn(winState, 'rot-1', () => 0.9);
    // 3rd six in a row, rng < 0.5 -> win!
    winState = rollDice(winState, () => 0.85); // rollD6(0.85) = 6, wait: 0.85 used for both rollD6 and win?
    // Use separate sequence: 0.9 for rollD6 (=6), then 0.1 for win (<0.5)
    let winState2 = createInitialState(twoPlayers(), { hardcore: true });
    winState2 = {
      ...winState2,
      consecutiveSixes: 2,
      pawns: winState2.pawns.map((p) =>
        p.id === 'rot-0' ? { ...p, location: { zone: 'track', index: 5 } } : p
      ),
    };
    let call = 0;
    winState2 = rollDice(winState2, () => (call++ === 0 ? 0.9 : 0.1));
    expect(winState2.phase).toBe('ACTIVITY_RESULT');
    expect(winState2.activity?.type).toBe('tripleSix');
    expect(winState2.activity?.winGame).toBe(true);
    winState2 = acknowledgeActivity(winState2);
    expect(winState2.phase).toBe('GAME_OVER');
    expect(winState2.winnerIndex).toBe(0);

    // 2) Lose case: all pawns exmatriculated to base
    let loseState = createInitialState(twoPlayers(), { hardcore: true });
    loseState = {
      ...loseState,
      consecutiveSixes: 2,
      pawns: loseState.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 12 } };
        if (p.id === 'rot-1') return { ...p, location: { zone: 'goal', slot: 2 } };
        return p;
      }),
    };
    let call2 = 0;
    loseState = rollDice(loseState, () => (call2++ === 0 ? 0.9 : 0.8));
    expect(loseState.phase).toBe('ACTIVITY_RESULT');
    expect(loseState.activity?.exmatriculateAll).toBe(true);
    expect(
      loseState.pawns
        .filter((p) => p.playerIndex === 0)
        .every((p) => p.location.zone === 'base')
    ).toBe(true);
    loseState = acknowledgeActivity(loseState);
    expect(loseState.phase).toBe('WAIT_ROLL');
    expect(loseState.currentTurn).toBe(1);
  });

  it('duel push mode sums ties, moves winner +loserSum and loser -winnerSum, and clamps', () => {
    let state = createInitialState(twoPlayers(), { hardcore: false, duelMode: 'push' });
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 12 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 15 } }; // 5 steps from blau start (10)
        return p;
      }),
    };

    // Rot rolls 3 -> lands on 15 -> duel with blau-0
    state = rollDice(state, seqRng([3]));
    state = selectPawn(state, 'rot-0');
    expect(state.phase).toBe('DUEL_ROLL');

    // Round 1: 6:6 tie; Round 2: 2:1 (Rot wins: Rot sum = 8, Blau sum = 7)
    state = resolveDuelRoll(state, seqRng([6, 6]));
    expect(state.phase).toBe('DUEL_ROLL');
    state = resolveDuelRoll(state, seqRng([2, 1]));
    expect(state.phase).toBe('DUEL_RESULT');
    expect(state.duel?.winner).toBe('attacker');
    expect(state.duel?.winnerSum).toBe(8);
    expect(state.duel?.loserSum).toBe(7);
    expect(state.duel?.winnerMoved).toBe(7);

    // Rot moved +7 from 15 -> 22
    expect(state.pawns.find((p) => p.id === 'rot-0')?.location).toEqual({
      zone: 'track',
      index: 22,
    });
    // Blau was at 15 (5 steps from start 10), pushed -8 -> clamped to 0 steps (index 10)
    expect(state.pawns.find((p) => p.id === 'blau-0')?.location).toEqual({
      zone: 'track',
      index: 10,
    });

    state = acknowledgeDuel(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(1);
  });

  it('duel push mode enters goal without jumping and chains next 1v1 duel', () => {
    let state = createInitialState(twoPlayers(), { hardcore: false, duelMode: 'push' });
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 37 } };
        if (p.id === 'rot-1') return { ...p, location: { zone: 'goal', slot: 2 } }; // blocks slot 2 & 3
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 38 } };
        if (p.id === 'blau-1') return { ...p, location: { zone: 'track', index: 32 } }; // blau-0 pushed -6 from 38 -> 32!
        return p;
      }),
    };

    // Rot rolls 1 -> lands on 38 -> duel with blau-0
    state = rollDice(state, seqRng([1]));
    state = selectPawn(state, 'rot-0');
    // Rot rolls 6, Blau rolls 5 -> Rot wins (+5 forward from 38 -> 43 = goal slot 3, blocked by rot-1 at slot 2 -> stops at goal slot 1!)
    // Blau pushed -6 from 38 -> 32 -> collides with blau-1 (own pawn) -> stops 1 tile short at 33!
    state = resolveDuelRoll(state, seqRng([6, 5]));
    expect(state.pawns.find((p) => p.id === 'rot-0')?.location).toEqual({
      zone: 'goal',
      slot: 1,
    });
    expect(state.pawns.find((p) => p.id === 'blau-0')?.location).toEqual({
      zone: 'track',
      index: 33,
    });

    // Now test chain 1v1 duel when winner lands on another opponent
    let chainState = createInitialState(twoPlayers(), { hardcore: false, duelMode: 'push' });
    chainState = {
      ...chainState,
      pawns: chainState.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 12 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 14 } };
        if (p.id === 'blau-1') return { ...p, location: { zone: 'track', index: 17 } }; // 14 + 3 = 17!
        return p;
      }),
    };
    chainState = rollDice(chainState, seqRng([2]));
    chainState = selectPawn(chainState, 'rot-0');
    // Rot rolls 5, Blau rolls 3 -> Rot moves +3 from 14 to 17 (where blau-1 is!)
    chainState = resolveDuelRoll(chainState, seqRng([5, 3]));
    expect(chainState.phase).toBe('DUEL_RESULT');
    chainState = acknowledgeDuel(chainState);
    expect(chainState.phase).toBe('DUEL_ROLL');
    expect(chainState.duel?.defenderPawnId).toBe('blau-1');
  });

  it('requires each duel participant to roll their own die independently', () => {
    let state = createInitialState(twoPlayers());
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 4 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 7 } };
        return p;
      }),
    };

    state = rollDice(state, seqRng([3]));
    state = selectPawn(state, 'rot-0');
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.pendingAttackerRoll).toBeNull();
    expect(state.duel?.pendingDefenderRoll).toBeNull();

    // Attacker (0) rolls 4 -> waits for defender (1)
    state = rollDuelDie(state, 0, seqRng([4]));
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.pendingAttackerRoll).toBe(4);
    expect(state.duel?.pendingDefenderRoll).toBeNull();

    // Attacker cannot roll twice before defender rolls
    const afterDoubleRoll = rollDuelDie(state, 0, seqRng([6]));
    expect(afterDoubleRoll.duel?.pendingAttackerRoll).toBe(4);

    // Defender (1) rolls 4 -> tie resets both pending rolls and stays in DUEL_ROLL
    state = rollDuelDie(state, 1, seqRng([4]));
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.rounds).toEqual([{ attackerRoll: 4, defenderRoll: 4 }]);
    expect(state.duel?.pendingAttackerRoll).toBeNull();
    expect(state.duel?.pendingDefenderRoll).toBeNull();

    // Defender rolls first (5), then Attacker rolls (2) -> Defender wins
    state = rollDuelDie(state, 1, seqRng([5]));
    expect(state.phase).toBe('DUEL_ROLL');
    expect(state.duel?.pendingDefenderRoll).toBe(5);
    state = rollDuelDie(state, 0, seqRng([2]));
    expect(state.phase).toBe('DUEL_RESULT');
    expect(state.duel?.winner).toBe('defender');
  });

  it('grants bonus roll to the player pushed onto a Bib/Party tile in push duel', () => {
    // Track index 14 is 'bib' (good = bonusRoll: true).
    // Blau (seat 1) starts at track index 17; Rot (seat 0) moves from 15 to 17 and wins 3:1 in push duel ->
    // Blau is pushed -3 from 17 to 14 ('bib') and gets good outcome (rng < 0.5).
    let state = createInitialState(twoPlayers(), { hardcore: true, duelMode: 'push' });
    state = {
      ...state,
      pawns: state.pawns.map((p) => {
        if (p.id === 'rot-0') return { ...p, location: { zone: 'track', index: 15 } };
        if (p.id === 'blau-0') return { ...p, location: { zone: 'track', index: 17 } };
        return p;
      }),
    };

    state = rollDice(state, seqRng([2]));
    state = selectPawn(state, 'rot-0');
    expect(state.phase).toBe('DUEL_ROLL');

    state = resolveDuelRoll(state, seqRng([3, 1]));
    expect(state.phase).toBe('DUEL_RESULT');

    // Acknowledge duel with rng=0.1 -> triggers 'bib' good outcome (bonusRoll: true) for Blau (seat 1)
    state = acknowledgeDuel(state, () => 0.1);
    expect(state.phase).toBe('ACTIVITY_RESULT');
    expect(state.activity?.playerIndex).toBe(1);
    expect(state.activity?.type).toBe('bib');
    expect(state.activity?.bonusRoll).toBe(true);

    // Acknowledging the activity must give the bonus roll to Blau (seat 1), not Rot (seat 0)!
    state = acknowledgeActivity(state);
    expect(state.phase).toBe('WAIT_ROLL');
    expect(state.currentTurn).toBe(1);
  });
});
