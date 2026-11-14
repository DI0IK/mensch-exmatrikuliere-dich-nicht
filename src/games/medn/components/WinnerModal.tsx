import React from 'react';
import type { GameState, Language, PlayerColor } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { Button, Modal, StampBadge } from '../../../shared/ui';

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
    <Modal
      open
      maxWidth="440px"
      closeOnBackdrop={false}
      cardStyle={{
        padding: '26px',
        alignItems: 'center',
        gap: '14px',
        textAlign: 'center',
      }}
    >
      <StampBadge variant="immatrikuliert" animated style={{ fontSize: '1rem' }}>
        1,0 · SUMMA CUM LAUDE
      </StampBadge>
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
        <Button variant="primary" onClick={onPlayAgain} style={{ flex: 1 }}>
          {t.playAgain}
        </Button>
        <Button onClick={onBackToLobby} style={{ flex: 1 }}>
          {t.backToLobby}
        </Button>
      </div>
    </Modal>
  );
};
