import React from 'react';
import type { GameState, Language, PlayerColor } from '../game/types';
import { COLOR_LABELS, TRANSLATIONS } from '../i18n/translations';
import { Card } from '../../../shared/ui';

interface TurnBannerProps {
  state: GameState;
  language: Language;
  localSeatIndices: number[];
}

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

const COLOR_BG: Record<PlayerColor, string> = {
  rot: '#f9e3e0',
  blau: '#dfeaf6',
  gelb: '#fbf0d9',
  gruen: '#dff0e5',
};

export const TurnBanner: React.FC<TurnBannerProps> = ({
  state,
  language,
  localSeatIndices,
}) => {
  const t = TRANSLATIONS[language];
  const currentPlayer = state.players[state.currentTurn];
  const isLocalTurn = localSeatIndices.includes(state.currentTurn);

  let phaseLabel = t.waitRoll;
  if (state.phase === 'SELECT_PAWN') phaseLabel = t.selectPawn;
  else if (state.phase === 'DUEL_ROLL') phaseLabel = t.duelRollPrompt;
  else if (state.phase === 'DUEL_RESULT') phaseLabel = t.duelResultPrompt;
  else if (state.phase === 'ACTIVITY_RESULT') {
    phaseLabel = language === 'de' ? 'Hardcore-Ereignis!' : 'Hardcore Event!';
  } else if (state.phase === 'GAME_OVER') phaseLabel = t.winnerTitle;

  return (
    <Card
      padding="10px 14px"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: COLOR_HEX[currentPlayer.color],
              border: '2px solid var(--ink)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
            }}
          >
            {currentPlayer.name}
          </span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: isLocalTurn ? '#231d17' : 'var(--desk-accent)',
              color: isLocalTurn ? '#fbf7ee' : 'var(--ink)',
            }}
          >
            {currentPlayer.seatType === 'bot'
              ? `Bot · ${t.botThinking}`
              : isLocalTurn
                ? t.yourTurn
                : t.waitingForPlayer}
          </span>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-stamp)',
            fontWeight: 700,
            fontSize: '0.9rem',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            color:
              state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT'
                ? 'var(--stamp-red)'
                : 'var(--ink)',
          }}
        >
          [{phaseLabel}]
        </div>
      </div>

      {/* 2-4 Player Scoreboard Strip */}
      <div className="scoreboard-strip">
        {state.players.map((player, idx) => {
          if (!player.active) return null;
          const isActive = idx === state.currentTurn && state.phase !== 'GAME_OVER';
          const goalCount = state.pawns.filter(
            (p) => p.playerIndex === idx && p.location.zone === 'goal'
          ).length;
          const trackCount = state.pawns.filter(
            (p) => p.playerIndex === idx && p.location.zone === 'track'
          ).length;

          return (
            <div
              key={player.color}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: isActive ? COLOR_BG[player.color] : 'rgba(231, 220, 200, 0.45)',
                border: isActive ? `2px solid ${COLOR_HEX[player.color]}` : '2px solid #c9ba9e',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--ink)',
                  }}
                >
                  {player.emoji ? `${player.emoji} ` : ''}
                  {player.name}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--ink-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {player.major?.trim() ? `${player.major.trim()} · ` : ''}
                  {COLOR_LABELS[language][player.color]} ·{' '}
                  {player.seatType === 'bot'
                    ? 'Bot'
                    : player.seatType === 'human-remote'
                      ? 'P2P'
                      : 'Lokal'}
                  {trackCount > 0 ? ` · ${trackCount} aktiv` : ''}
                </div>
              </div>

              {/* 4 Graduation Pips */}
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }} title={`${goalCount}/4`}>
                {[0, 1, 2, 3].map((pip) => (
                  <span
                    key={pip}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: pip < goalCount ? COLOR_HEX[player.color] : 'transparent',
                      border: `1.5px solid ${COLOR_HEX[player.color]}`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
