import React from 'react';
import { JAIL_FINE } from '../game/boardData';
import { getPlayerNetWorth } from '../game/helpers';
import type { GameAction, GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { COLOR_HEX } from './lobby/types';

interface ActionDockProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  muted: boolean;
  onAction: (action: GameAction) => void;
  onOpenProperties: () => void;
  onOpenTrade: () => void;
  onOpenConnectionInfo: () => void;
  onToggleMute: () => void;
  onToggleLanguage: () => void;
  onReturnToLobby: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  state,
  language,
  canAct,
  muted,
  onAction,
  onOpenProperties,
  onOpenTrade,
  onOpenConnectionInfo,
  onToggleMute,
  onToggleLanguage,
  onReturnToLobby,
}) => {
  const t = TRANSLATIONS[language];
  const current = state.players[state.currentTurn];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Toolbar */}
      <div
        className="paper-card"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="tactile-btn"
            onClick={onOpenConnectionInfo}
            title={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
            style={{ padding: '5px 9px', fontSize: '0.84rem' }}
          >
            ⓘ
          </button>
          <button
            type="button"
            className="tactile-btn"
            onClick={onToggleMute}
            title={muted ? t.unmuteAudio : t.muteAudio}
            style={{ padding: '5px 9px', fontSize: '0.84rem' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="tactile-btn"
            onClick={onToggleLanguage}
            style={{ padding: '5px 9px', fontSize: '0.78rem' }}
          >
            {language === 'de' ? 'DE' : 'EN'}
          </button>
        </div>

        <button
          type="button"
          className="tactile-btn"
          onClick={onReturnToLobby}
          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
        >
          ← {t.backToLobby}
        </button>
      </div>

      {/* Active Turn & Actions */}
      <div
        className="paper-card"
        style={{
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: COLOR_HEX[current.color],
                border: '2px solid var(--ink)',
              }}
            />
            <strong style={{ fontSize: '1rem' }}>
              {current.emoji ?? ''} {current.name}
            </strong>
          </div>
          <span style={{ fontFamily: 'var(--font-stamp)', fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
            #{state.turnCount}
          </span>
        </div>

        {current.inJail && state.phase === 'WAIT_ROLL' && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#fdf2f0',
              border: '1.5px solid var(--stamp-red)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--stamp-red)',
            }}
          >
            🏛️ {language === 'de' ? `Prüfungsamt-Sperre (${current.jailTurns}/3)` : `Exam Office Detention (${current.jailTurns}/3)`}
          </div>
        )}

        {/* Primary Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {state.phase === 'WAIT_ROLL' && (
            <>
              <button
                type="button"
                className="tactile-btn primary"
                disabled={!canAct}
                onClick={() => onAction({ type: 'ROLL_DICE' })}
                style={{ width: '100%' }}
              >
                🎲 {t.rollDice} (Space)
              </button>

              {current.inJail && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="tactile-btn"
                    disabled={!canAct || current.cash < JAIL_FINE}
                    onClick={() => onAction({ type: 'PAY_JAIL' })}
                    style={{ flex: 1, fontSize: '0.78rem', padding: '7px 8px' }}
                  >
                    {t.payJail}
                  </button>
                  {current.jailCards > 0 && (
                    <button
                      type="button"
                      className="tactile-btn success"
                      disabled={!canAct}
                      onClick={() => onAction({ type: 'USE_JAIL_CARD' })}
                      style={{ flex: 1, fontSize: '0.78rem', padding: '7px 8px' }}
                    >
                      {t.useJailCard}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {state.phase === 'TURN_ACTION' && (
            <button
              type="button"
              className="tactile-btn primary"
              disabled={!canAct}
              onClick={() => onAction({ type: 'END_TURN' })}
              style={{ width: '100%' }}
            >
              {state.canRollAgain
                ? language === 'de'
                  ? '🎲 Pasch! Nochmal würfeln (Space)'
                  : '🎲 Doubles! Roll Again (Space)'
                : `${t.endTurn} (Space)`}
            </button>
          )}

          {state.phase === 'DEBT_RECOVERY' && (
            <button
              type="button"
              className="tactile-btn primary"
              disabled={!canAct}
              onClick={() => onAction({ type: 'DECLARE_BANKRUPTCY' })}
              style={{ width: '100%' }}
            >
              📜 {t.declareBankruptcy}
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="tactile-btn"
              onClick={onOpenProperties}
              style={{ flex: 1, fontSize: '0.82rem', padding: '7px 10px' }}
            >
              🏘️ {t.manageProperties}
            </button>
            <button
              type="button"
              className="tactile-btn"
              disabled={!canAct || (state.phase !== 'TURN_ACTION' && state.phase !== 'WAIT_ROLL')}
              onClick={onOpenTrade}
              style={{ flex: 1, fontSize: '0.82rem', padding: '7px 10px' }}
            >
              🤝 {t.proposeTrade}
            </button>
          </div>
        </div>
      </div>

      {/* Player Standings */}
      <div className="paper-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {state.players.map((p) => {
          const isTurn = p.index === state.currentTurn && state.phase !== 'GAME_OVER';
          const netWorth = getPlayerNetWorth(state, p.index);
          return (
            <div
              key={p.color}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: `2px solid ${isTurn ? COLOR_HEX[p.color] : '#e2d5be'}`,
                background: p.bankrupt ? '#ebe3d3' : isTurn ? '#fffdf8' : '#fbf7ee',
                opacity: p.bankrupt ? 0.55 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.emoji ?? ''} {p.name}
                  {p.seatType === 'bot' ? ' 🤖' : ''}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  {p.major ? `${p.major} · ` : ''}
                  {t.netWorth}: {netWorth} €
                  {p.jailCards > 0 ? ` · 🎫×${p.jailCards}` : ''}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-stamp)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: p.cash < 0 ? 'var(--stamp-red)' : 'var(--stamp-green)',
                  flexShrink: 0,
                }}
              >
                {p.bankrupt ? 'EXMAT.' : `${p.cash} €`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prüfungsprotokoll Log */}
      <div
        className="paper-card"
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          {t.protocolTitle}
        </strong>
        <div
          style={{
            maxHeight: '165px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.78rem',
            lineHeight: 1.35,
          }}
        >
          {[...state.logs].reverse().map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '4px 6px',
                borderRadius: '5px',
                background:
                  entry.tone === 'bad'
                    ? '#fdf2f0'
                    : entry.tone === 'good'
                      ? '#f2f9f4'
                      : entry.tone === 'highlight'
                        ? '#fdf8ec'
                        : 'transparent',
                color:
                  entry.tone === 'bad'
                    ? 'var(--stamp-red)'
                    : entry.tone === 'good'
                      ? 'var(--stamp-green)'
                      : 'var(--ink)',
              }}
            >
              {entry.text[language]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
