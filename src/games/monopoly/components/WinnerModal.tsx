import React from 'react';
import { Button, Modal, StampBadge } from '../../../shared/ui';
import { getPlayerNetWorth } from '../game/helpers';
import type { GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { COLOR_HEX } from './lobby/types';

interface WinnerModalProps {
  state: GameState;
  language: Language;
  onReturnToLobby: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ state, language, onReturnToLobby }) => {
  if (state.phase !== 'GAME_OVER' || state.winnerIndex === null) return null;

  const t = TRANSLATIONS[language];
  const winner = state.players[state.winnerIndex];
  const netWorth = getPlayerNetWorth(state, winner.index);

  return (
    <Modal
      open
      maxWidth="420px"
      zIndex={65}
      closeOnBackdrop={false}
      cardStyle={{
        padding: '24px',
        textAlign: 'center',
        gap: '14px',
        alignItems: 'center',
      }}
    >
      <StampBadge variant="immatrikuliert" animated style={{ fontSize: '0.84rem' }}>
        🎓 {t.winnerTitle}
      </StampBadge>
      <div style={{ fontSize: '3rem', lineHeight: 1 }}>{winner.emoji ?? '🎓'}</div>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: COLOR_HEX[winner.color] }}>
        {winner.name}
      </h2>
      <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '0.92rem' }}>{t.winnerSubtitle}</p>
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          background: '#fbf5e9',
          border: '1.5px solid #d6c3a3',
          fontFamily: 'var(--font-stamp)',
          fontWeight: 700,
        }}
      >
        {t.netWorth}: {netWorth} €
      </div>
      <Button variant="primary" onClick={onReturnToLobby} style={{ width: '100%' }}>
        {t.playAgain}
      </Button>
    </Modal>
  );
};
