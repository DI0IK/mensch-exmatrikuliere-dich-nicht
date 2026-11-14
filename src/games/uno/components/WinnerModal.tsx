import React from 'react';
import { COLOR_HEX, type Language } from '../../../shared/types/game';
import { Button, Modal, StampBadge } from '../../../shared/ui';
import type { GameState } from '../game/types';

interface WinnerModalProps {
  state: GameState;
  language: Language;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  state,
  language,
  onPlayAgain,
  onBackToLobby,
}) => {
  if (state.phase !== 'GAME_OVER' || state.winnerIndex === null) return null;
  const winner = state.players[state.winnerIndex];

  return (
    <Modal
      open
      maxWidth="400px"
      closeOnBackdrop={false}
      cardStyle={{ alignItems: 'center', textAlign: 'center', gap: '14px' }}
    >
      <StampBadge variant="immatrikuliert" animated>
        🃏 {language === 'de' ? 'BESTANDEN!' : 'PASSED!'}
      </StampBadge>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.65rem', color: COLOR_HEX[winner.color] }}>
        {winner.emoji ?? '🏆'} {winner.name}
      </h2>
      <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '0.92rem' }}>
        {language === 'de'
          ? 'Alle Prüfungskarten erfolgreich abgelegt!'
          : 'Successfully shed all exam cards!'}
      </p>
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <Button variant="primary" onClick={onPlayAgain} style={{ flex: 1 }}>
          {language === 'de' ? 'Nochmal' : 'Play Again'}
        </Button>
        <Button onClick={onBackToLobby} style={{ flex: 1 }}>
          {language === 'de' ? 'Zur Lobby' : 'Back to Lobby'}
        </Button>
      </div>
    </Modal>
  );
};
