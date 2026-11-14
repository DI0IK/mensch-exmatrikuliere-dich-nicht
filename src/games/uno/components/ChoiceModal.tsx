import React from 'react';
import { COLOR_HEX, COLOR_LABELS, type Language } from '../../../shared/types/game';
import { Button, Modal } from '../../../shared/ui';
import { CARD_COLORS } from '../game/deck';
import type { GameAction, GameState } from '../game/types';

interface ChoiceModalProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

export const ChoiceModal: React.FC<ChoiceModalProps> = ({
  state,
  language,
  canAct,
  onAction,
}) => {
  if (!canAct) return null;

  if (state.phase === 'CHOOSE_COLOR') {
    return (
      <Modal
        open
        maxWidth="360px"
        closeOnBackdrop={false}
        title={language === 'de' ? '🎓 Fachrichtung wählen' : '🎓 Choose Color'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {CARD_COLORS.map((color) => (
            <Button
              key={color}
              onClick={() =>
                onAction({ type: 'CHOOSE_COLOR', playerIndex: state.currentTurn, color })
              }
              style={{ background: COLOR_HEX[color], color: '#fffdf8' }}
            >
              {COLOR_LABELS[language][color]}
            </Button>
          ))}
        </div>
      </Modal>
    );
  }

  if (state.phase === 'CHOOSE_SWAP_TARGET' || state.phase === 'CHOOSE_STEAL_TARGET') {
    const isSwap = state.phase === 'CHOOSE_SWAP_TARGET';
    const opponents = state.players
      .map((p, idx) => ({ p, idx }))
      .filter(({ idx }) => idx !== state.currentTurn);

    return (
      <Modal
        open
        maxWidth="380px"
        closeOnBackdrop={false}
        title={
          isSwap
            ? language === 'de'
              ? '🤝 Gruppenarbeit: Hand tauschen mit…'
              : '🤝 Group Work: Swap hands with…'
            : language === 'de'
              ? '🕵️ Altklausur: Karte klauen von…'
              : '🕵️ Past Exam: Steal card from…'
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {opponents.map(({ p, idx }) => (
            <Button
              key={idx}
              onClick={() =>
                onAction({
                  type: 'CHOOSE_TARGET',
                  playerIndex: state.currentTurn,
                  targetPlayerIndex: idx,
                })
              }
              style={{ justifyContent: 'space-between' }}
            >
              <span>
                {p.emoji ?? ''} {p.name}
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {state.hands[idx]?.length ?? 0} {language === 'de' ? 'Karten' : 'cards'}
              </span>
            </Button>
          ))}
        </div>
      </Modal>
    );
  }

  return null;
};
