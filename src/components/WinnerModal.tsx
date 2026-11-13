import React from 'react';
import type { GameState, Language, PlayerColor } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';

interface WinnerModalProps {
  state: GameState;
  language: Language;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

export const WinnerModal: React.FC<WinnerModalProps> = ({
  state,
  language,
  onPlayAgain,
  onBackToLobby,
}) => {
  if (state.phase !== 'GAME_OVER' || state.winnerIndex === null) return null;
  const t = TRANSLATIONS[language];
  const winner = state.players[state.winnerIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(35, 29, 23, 0.58)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 60,
      }}
    >
      <div
        className="paper-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <div className="stamp-badge stamp-immatrikuliert animate-stamp" style={{ fontSize: '1rem' }}>
          1,0 · SUMMA CUM LAUDE
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
          }}
        >
          {t.winnerTitle}
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.45 }}>
          <strong style={{ color: COLOR_HEX[winner.color] }}>{winner.name}</strong>{' '}
          {t.winnerSubtitle}
        </p>

        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button className="tactile-btn primary" onClick={onPlayAgain} style={{ flex: 1 }}>
            {t.playAgain}
          </button>
          <button className="tactile-btn" onClick={onBackToLobby} style={{ flex: 1 }}>
            {t.backToLobby}
          </button>
        </div>
      </div>
    </div>
  );
};
