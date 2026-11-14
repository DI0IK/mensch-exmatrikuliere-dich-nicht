import React from 'react';
import { COLOR_HEX, type Language } from '../../../shared/types/game';
import { Button, Card } from '../../../shared/ui';
import { getSelectableCategories } from '../game/engine';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  getTotalScore,
  getUpperBonus,
  getUpperSum,
  scoreCategory,
} from '../game/scoring';
import type { GameAction, GameState } from '../game/types';

interface ScorecardTableProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({
  state,
  language,
  canAct,
  onAction,
}) => {
  const selectable = canAct && state.hasRolledThisTurn ? getSelectableCategories(state, state.currentTurn) : [];

  return (
    <Card padding="14px" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ink)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>
              {language === 'de' ? 'Kategorie' : 'Category'}
            </th>
            {state.players.map((p, idx) => (
              <th
                key={idx}
                style={{
                  textAlign: 'center',
                  padding: '6px 8px',
                  color: COLOR_HEX[p.color],
                  background: idx === state.currentTurn ? 'rgba(201,59,43,0.08)' : 'transparent',
                  borderRadius: '6px 6px 0 0',
                }}
              >
                {p.emoji ?? ''} {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_CATEGORIES.map((cat) => {
            const canScoreThis = selectable.includes(cat);
            const previewPts = canScoreThis ? scoreCategory(state.dice, cat) : null;

            return (
              <tr key={cat} style={{ borderBottom: '1px solid #e2d5be' }}>
                <td style={{ padding: '5px 8px', fontWeight: 600 }}>{CATEGORY_LABELS[cat][language]}</td>
                {state.players.map((_, idx) => {
                  const card = state.scorecards[idx];
                  const val = card?.scores[cat];
                  const isLocked = card?.lockedCategory === cat;
                  const isCurrentCol = idx === state.currentTurn;

                  return (
                    <td
                      key={idx}
                      style={{
                        textAlign: 'center',
                        padding: '4px 6px',
                        background: isCurrentCol ? 'rgba(201,59,43,0.04)' : 'transparent',
                      }}
                    >
                      {val !== undefined ? (
                        <strong style={{ fontFamily: 'var(--font-stamp)' }}>{val}</strong>
                      ) : isLocked ? (
                        <span title={language === 'de' ? 'Gesperrt!' : 'Locked!'}>🔒</span>
                      ) : isCurrentCol && canScoreThis && previewPts !== null ? (
                        <Button
                          size="sm"
                          variant={previewPts > 0 ? 'success' : 'default'}
                          style={{ padding: '2px 8px', fontSize: '0.76rem', minWidth: '42px' }}
                          onClick={() =>
                            onAction({
                              type: 'SCORE_CATEGORY',
                              playerIndex: state.currentTurn,
                              category: cat,
                            })
                          }
                        >
                          {previewPts}
                        </Button>
                      ) : (
                        <span style={{ color: '#bba98d' }}>–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Upper Bonus Row */}
          <tr style={{ borderTop: '1.5px solid #bfa988', background: '#fbf5e9' }}>
            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '0.78rem' }}>
              {language === 'de' ? 'Oben-Bonus (≥63 → +35)' : 'Upper Bonus (≥63 → +35)'}
            </td>
            {state.players.map((_, idx) => {
              const card = state.scorecards[idx];
              const up = getUpperSum(card);
              const bonus = getUpperBonus(card);
              return (
                <td key={idx} style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {bonus > 0 ? '+35' : `${up}/63`}
                </td>
              );
            })}
          </tr>

          {/* Total Row */}
          <tr style={{ borderTop: '2px solid var(--ink)', background: '#f4ead7' }}>
            <td style={{ padding: '8px', fontWeight: 800 }}>
              {language === 'de' ? 'Gesamt (ECTS)' : 'Total (ECTS)'}
            </td>
            {state.players.map((_, idx) => (
              <td
                key={idx}
                style={{
                  textAlign: 'center',
                  padding: '8px',
                  fontFamily: 'var(--font-stamp)',
                  fontWeight: 800,
                  fontSize: '1rem',
                }}
              >
                {getTotalScore(state.scorecards[idx])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
};
