import React from 'react';
import { COLOR_HEX, COLOR_LABELS, type Language } from '../../../shared/types/game';
import { Card, StampBadge } from '../../../shared/ui';
import type { GameAction, GameState } from '../game/types';
import { UnoCardBack, UnoCardView } from './UnoCardView';

interface TableCenterProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

const UNDERLAY_ANGLES = [-7, 5, -3];

export const TableCenter: React.FC<TableCenterProps> = ({
  state,
  language,
  canAct,
  onAction,
}) => {
  const discardLen = state.discardPile.length;
  const topCard = discardLen > 0 ? state.discardPile[discardLen - 1] : null;
  const underlayCards = state.discardPile.slice(Math.max(0, discardLen - 3), Math.max(0, discardLen - 1));
  const latestLog = state.logs[0];
  const canDraw = canAct && state.phase === 'PLAY_OR_DRAW';

  return (
    <Card padding="16px" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Non-overlapping Players Strip (2–8 players) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
        }}
      >
        {state.players.map((p, idx) => {
          const isTurn = idx === state.currentTurn && state.phase !== 'GAME_OVER';
          const count = state.hands[idx]?.length ?? 0;
          const showUno = state.unoCalled[idx] && count <= 2 && count > 0;

          return (
            <div
              key={idx}
              className={isTurn ? 'uno-turn-pulse' : undefined}
              style={{
                padding: '10px 12px',
                borderRadius: '11px',
                border: `2px solid ${isTurn ? COLOR_HEX[p.color] : '#cbbba0'}`,
                background: isTurn ? '#fff8e3' : '#fbf5e9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.emoji ?? ''} {p.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '3px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {count} {language === 'de' ? 'Karten' : 'cards'}
                  </span>
                  {isTurn && (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: COLOR_HEX[p.color],
                        color: '#fffdf8',
                      }}
                    >
                      {language === 'de' ? 'Am Zug' : 'Turn'}
                    </span>
                  )}
                  {showUno && (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#c93b2b',
                        color: '#fff4cf',
                      }}
                    >
                      UNO!
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <UnoCardBack size="xs" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Last-Action Announcement */}
      {latestLog && (
        <div
          key={latestLog.id}
          className="uno-banner-pop"
          style={{
            padding: '7px 12px',
            borderRadius: '8px',
            background: 'rgba(231, 220, 200, 0.48)',
            border: '1.5px solid #cbbba0',
            textAlign: 'center',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          {latestLog.text[language]}
        </div>
      )}

      {/* Green Tabletop Felt Mat */}
      <div
        style={{
          borderRadius: '16px',
          padding: '20px 16px',
          background: 'radial-gradient(circle at 50% 42%, #2f6b47 0%, #1e4b31 75%, #163824 100%)',
          border: '3px solid #231d17',
          boxShadow: 'inset 0 0 0 2px rgba(247, 211, 120, 0.25), inset 0 8px 24px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
          flexWrap: 'wrap',
        }}
      >
        {/* 3D Stacked Draw Pile */}
        <button
          type="button"
          disabled={!canDraw}
          onClick={() => onAction({ type: 'DRAW_CARD', playerIndex: state.currentTurn })}
          style={{
            position: 'relative',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: canDraw ? 'pointer' : 'default',
            width: '122px',
            height: '166px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canDraw ? 1 : 0.78,
            transition: 'transform 0.16s ease',
          }}
          title={language === 'de' ? 'Karte ziehen' : 'Draw card'}
        >
          <UnoCardBack
            size="lg"
            style={{ position: 'absolute', transform: 'translate(-4px, -4px)', opacity: 0.85 }}
          />
          <UnoCardBack
            size="lg"
            style={{ position: 'absolute', transform: 'translate(-2px, -2px)', opacity: 0.92 }}
          />
          <UnoCardBack
            size="lg"
            style={{
              position: 'relative',
              boxShadow: canDraw
                ? '0 0 0 2.5px #f7d378, 4px 6px 14px rgba(0,0,0,0.45)'
                : '3px 4px 10px rgba(0,0,0,0.4)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '3px 9px',
              borderRadius: '999px',
              background: state.pendingDrawCount > 0 ? '#c93b2b' : 'rgba(24, 20, 16, 0.9)',
              color: '#fffdf8',
              border: '1.5px solid #f7d378',
              fontSize: '0.72rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {state.pendingDrawCount > 0
              ? `+${state.pendingDrawCount} ${language === 'de' ? 'Ziehen' : 'Draw'}`
              : `${language === 'de' ? 'Ziehen' : 'Draw'} (${state.drawPile.length})`}
          </span>
        </button>

        {/* Layered Discard Pile */}
        {topCard && (
          <div
            style={{
              position: 'relative',
              width: '126px',
              height: '166px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {underlayCards.map((card, i) => (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  transform: `rotate(${UNDERLAY_ANGLES[i % UNDERLAY_ANGLES.length]}deg)`,
                  opacity: 0.88,
                  pointerEvents: 'none',
                }}
              >
                <UnoCardView card={card} language={language} size="lg" />
              </div>
            ))}

            <div key={topCard.id} className="uno-card-land" style={{ position: 'relative', zIndex: 2 }}>
              <UnoCardView
                card={topCard}
                language={language}
                activeColor={topCard.color === 'wild' ? state.activeColor : undefined}
                size="lg"
              />
            </div>
          </div>
        )}

        {/* Table Status Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '165px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(255, 253, 248, 0.94)',
            border: '2px solid var(--ink)',
            boxShadow: '3px 4px 0 rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.84rem', fontWeight: 700 }}>
            <span>{language === 'de' ? 'Farbe:' : 'Color:'}</span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                background: COLOR_HEX[state.activeColor],
                color: '#fff',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: '1.5px solid var(--ink)',
              }}
            >
              {COLOR_LABELS[language][state.activeColor]}
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>{language === 'de' ? 'Richtung:' : 'Direction:'}</span>
            <span>
              {state.direction === 1
                ? `↻ ${language === 'de' ? 'Vorwärts' : 'Clockwise'}`
                : `↺ ${language === 'de' ? 'Rückwärts' : 'Counter'}`}
            </span>
          </div>

          {state.pendingDrawCount > 0 && (
            <StampBadge variant="exmatrikuliert" style={{ fontSize: '0.76rem', textAlign: 'center' }}>
              +{state.pendingDrawCount} {language === 'de' ? 'STRAFE!' : 'PENALTY!'}
            </StampBadge>
          )}
        </div>
      </div>
    </Card>
  );
};
