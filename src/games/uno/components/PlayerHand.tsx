import React, { useMemo, useState } from 'react';
import type { Language } from '../../../shared/types/game';
import { Button, Card } from '../../../shared/ui';
import { isCardPlayable } from '../game/engine';
import type { GameAction, GameState, UnoCard } from '../game/types';
import { UnoCardView } from './UnoCardView';

interface PlayerHandProps {
  state: GameState;
  language: Language;
  seatIndex: number;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

const EMPTY_HAND: UnoCard[] = [];

const COLOR_ORDER: Record<UnoCard['color'], number> = {
  rot: 0,
  blau: 1,
  gelb: 2,
  gruen: 3,
  wild: 4,
};

export const PlayerHand: React.FC<PlayerHandProps> = ({
  state,
  language,
  seatIndex,
  canAct,
  onAction,
}) => {
  const [sorted, setSorted] = useState(false);
  const hand = state.hands[seatIndex] ?? EMPTY_HAND;
  const player = state.players[seatIndex];
  const canCallUno = hand.length <= 2 && !state.unoCalled[seatIndex];

  const displayHand = useMemo(() => {
    if (!sorted) return hand;
    return [...hand].sort((a, b) => {
      const colorDiff = COLOR_ORDER[a.color] - COLOR_ORDER[b.color];
      if (colorDiff !== 0) return colorDiff;
      return a.value.localeCompare(b.value);
    });
  }, [hand, sorted]);

  return (
    <Card padding="14px" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
          {player?.emoji ?? '🎓'} {player?.name} — {language === 'de' ? 'Deine Hand' : 'Your Hand'} ({hand.length})
        </strong>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            size="sm"
            onClick={() => setSorted((prev) => !prev)}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            {sorted
              ? language === 'de'
                ? '✓ Sortiert'
                : '✓ Sorted'
              : language === 'de'
                ? '⇅ Sortieren'
                : '⇅ Sort'}
          </Button>

          {canCallUno && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAction({ type: 'CALL_UNO', playerIndex: seatIndex })}
            >
              📢 UNO!
            </Button>
          )}
        </div>
      </div>

      {/* Non-overlapping card grid with top breathing room for playable lift */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '10px',
          paddingBottom: '4px',
        }}
      >
        {displayHand.map((card) => {
          const playable = canAct && state.phase === 'PLAY_OR_DRAW' && isCardPlayable(state, card);

          return (
            <button
              key={card.id}
              type="button"
              className="uno-card-draw"
              disabled={!playable}
              onClick={() =>
                onAction({ type: 'PLAY_CARD', playerIndex: seatIndex, cardId: card.id })
              }
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: playable ? 'pointer' : 'default',
                transform: playable ? 'translateY(-6px)' : 'none',
                transition: 'transform 0.16s ease',
              }}
            >
              <UnoCardView
                card={card}
                language={language}
                size="md"
                playable={playable}
                dimmed={!playable}
              />
            </button>
          );
        })}
      </div>
    </Card>
  );
};
