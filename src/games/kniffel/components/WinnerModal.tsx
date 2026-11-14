import React from 'react';
import { COLOR_HEX, type Language } from '../../../shared/types/game';
import { Button, Modal, StampBadge } from '../../../shared/ui';
import { getTotalScore } from '../game/scoring';
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

  const ranked = state.players
    .map((p, idx) => ({ player: p, score: getTotalScore(state.scorecards[idx]) }))
    .sort((a, b) => b.score - a.score);

  const winner = state.players[state.winnerIndex];

  return (
    <Modal
      open
      maxWidth="420px"
      closeOnBackdrop={false}
      cardStyle={{ alignItems: 'center', textAlign: 'center', gap: '14px' }}
    >
      <StampBadge variant="immatrikuliert" animated>
        🎲 {language === 'de' ? 'PRÜFUNG BESTANDEN' : 'EXAM PASSED'}
      </StampBadge>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: COLOR_HEX[winner.color] }}>
        {winner.emoji ?? '🏆'} {winner.name}
      </h2>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ranked.map((entry, rankIdx) => (
          <div
            key={entry.player.name + rankIdx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '8px',
              background: rankIdx === 0 ? '#e9f6ec' : '#fbf5e9',
              border: '1px solid #d6c3a3',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <span>
              #{rankIdx + 1} {entry.player.name}
            </span>
            <span style={{ fontFamily: 'var(--font-stamp)' }}>{entry.score} ECTS</span>
          </div>
        ))}
      </div>

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
