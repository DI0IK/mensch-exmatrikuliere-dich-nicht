import React, { useState } from 'react';
import type { Language } from '../../../shared/types/game';
import { Button, Card, Dropdown, StampBadge } from '../../../shared/ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../game/scoring';
import type { GameAction, GameState, KniffelCategory } from '../game/types';

interface DiceTrayProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

const DIE_PIPS: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

export const DiceTray: React.FC<DiceTrayProps> = ({ state, language, canAct, onAction }) => {
  const [setDieMode, setSetDieMode] = useState(false);
  const [selectedDieIdx, setSelectedDieIdx] = useState(0);
  const [targetVal, setTargetVal] = useState(6);
  const [lockMode, setLockMode] = useState(false);
  const [lockTargetIdx, setLockTargetIdx] = useState<number>(() =>
    state.players.findIndex((_, i) => i !== state.currentTurn)
  );
  const [lockCategory, setLockCategory] = useState<KniffelCategory>('kniffel');

  const currentCard = state.scorecards[state.currentTurn];
  const cheatTokens = currentCard?.cheatTokens ?? 0;
  const opponents = state.players
    .map((p, idx) => ({ p, idx }))
    .filter(({ idx }) => idx !== state.currentTurn);

  return (
    <Card padding="16px" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            {state.players[state.currentTurn]?.emoji ?? '🎲'} {state.players[state.currentTurn]?.name}
          </strong>
          <StampBadge variant="neutral" style={{ fontSize: '0.72rem' }}>
            {language === 'de' ? `Runde ${state.round}/13` : `Round ${state.round}/13`}
          </StampBadge>
        </div>

        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
          {language === 'de' ? `Würfe übrig: ${state.rollsLeft}` : `Rolls left: ${state.rollsLeft}`}
        </span>
      </div>

      {/* 5 Dice */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {state.dice.map((val, idx) => {
          const isHeld = state.hasRolledThisTurn && state.held[idx];
          const clickable = canAct && state.hasRolledThisTurn && state.rollsLeft > 0;
          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable && !setDieMode}
              onClick={() => {
                if (setDieMode && canAct) {
                  setSelectedDieIdx(idx);
                  return;
                }
                if (clickable) {
                  onAction({ type: 'TOGGLE_HOLD', playerIndex: state.currentTurn, dieIndex: idx });
                }
              }}
              style={{
                width: '62px',
                height: '62px',
                borderRadius: '12px',
                border: `2.5px solid ${
                  setDieMode && selectedDieIdx === idx
                    ? 'var(--c-rot)'
                    : isHeld
                      ? 'var(--stamp-green)'
                      : 'var(--ink)'
                }`,
                background: isHeld ? '#e9f6ec' : '#fffdf8',
                boxShadow: isHeld ? 'inset 0 0 0 2px rgba(34,107,64,0.2)' : '0 3px 0 var(--ink)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.1rem',
                lineHeight: 1,
                position: 'relative',
              }}
            >
              <span>{state.hasRolledThisTurn ? DIE_PIPS[val] : '❔'}</span>
              {isHeld && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    background: 'var(--stamp-green)',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  HOLD
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Roll Button */}
      <Button
        variant="primary"
        disabled={!canAct || state.rollsLeft <= 0}
        onClick={() => onAction({ type: 'ROLL_DICE', playerIndex: state.currentTurn })}
        style={{ width: '100%' }}
      >
        🎲{' '}
        {!state.hasRolledThisTurn
          ? language === 'de'
            ? 'Würfeln (1. Wurf)'
            : 'Roll Dice (1st roll)'
          : state.rollsLeft > 0
            ? language === 'de'
              ? `Nochmal würfeln (${state.rollsLeft} übrig)`
              : `Roll Again (${state.rollsLeft} left)`
            : language === 'de'
              ? 'Kategorie wählen!'
              : 'Pick a Category!'}
      </Button>

      {/* Spickzettel (Twist) Controls */}
      {state.settings.twistMode && (
        <div
          style={{
            borderTop: '1.5px dashed #cbbba0',
            paddingTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
              📝 {language === 'de' ? 'Spickzettel-Tokens:' : 'Cheat-Sheet Tokens:'}{' '}
              <strong style={{ color: 'var(--c-rot)' }}>{cheatTokens} / 3</strong>
            </span>
          </div>

          {canAct && cheatTokens > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                disabled={!state.hasRolledThisTurn}
                onClick={() => onAction({ type: 'USE_EXTRA_ROLL', playerIndex: state.currentTurn })}
              >
                +1 {language === 'de' ? 'Wurf' : 'Roll'}
              </Button>
              <Button
                size="sm"
                disabled={!state.hasRolledThisTurn}
                variant={setDieMode ? 'primary' : 'default'}
                onClick={() => {
                  setSetDieMode((v) => !v);
                  setLockMode(false);
                }}
              >
                ✏️ {language === 'de' ? 'Würfel setzen' : 'Set Die'}
              </Button>
              <Button
                size="sm"
                variant={lockMode ? 'primary' : 'default'}
                onClick={() => {
                  setLockMode((v) => !v);
                  setSetDieMode(false);
                }}
              >
                🔒 {language === 'de' ? 'Kategorie sperren' : 'Lock Category'}
              </Button>
            </div>
          )}

          {canAct && setDieMode && state.hasRolledThisTurn && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <span>{language === 'de' ? `Würfel #${selectedDieIdx + 1} →` : `Die #${selectedDieIdx + 1} →`}</span>
              <Dropdown
                value={String(targetVal)}
                onChange={(v) => setTargetVal(Number(v))}
                options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}` }))}
              />
              <Button
                size="sm"
                variant="success"
                onClick={() => {
                  onAction({
                    type: 'USE_SET_DIE',
                    playerIndex: state.currentTurn,
                    dieIndex: selectedDieIdx,
                    value: targetVal,
                  });
                  setSetDieMode(false);
                }}
              >
                ✓ {language === 'de' ? 'Anwenden' : 'Apply'}
              </Button>
            </div>
          )}

          {canAct && lockMode && opponents.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <Dropdown
                value={String(lockTargetIdx)}
                onChange={(v) => setLockTargetIdx(Number(v))}
                options={opponents.map(({ p, idx }) => ({ value: String(idx), label: p.name }))}
              />
              <Dropdown
                value={lockCategory}
                onChange={(v) => setLockCategory(v as KniffelCategory)}
                options={ALL_CATEGORIES.filter(
                  (c) => state.scorecards[lockTargetIdx]?.scores[c] === undefined
                ).map((c) => ({ value: c, label: CATEGORY_LABELS[c][language] }))}
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onAction({
                    type: 'USE_LOCK_CATEGORY',
                    playerIndex: state.currentTurn,
                    targetPlayerIndex: lockTargetIdx,
                    category: lockCategory,
                  });
                  setLockMode(false);
                }}
              >
                🔒 {language === 'de' ? 'Sperren' : 'Lock'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
