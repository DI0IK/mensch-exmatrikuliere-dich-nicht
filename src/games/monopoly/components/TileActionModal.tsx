import React from 'react';
import { BOARD_TILES, COLOR_GROUP_INFO } from '../game/boardData';
import type { GameAction, GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';

interface TileActionModalProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
}

export const TileActionModal: React.FC<TileActionModalProps> = ({
  state,
  language,
  canAct,
  onAction,
}) => {
  const t = TRANSLATIONS[language];
  const player = state.players[state.currentTurn];

  if (state.phase === 'BUY_OR_AUCTION' && state.pendingTileIndex !== null) {
    const tile = BOARD_TILES[state.pendingTileIndex];
    const price = tile.price ?? 0;
    const canAfford = player && player.cash >= price;
    const groupColor = tile.group ? COLOR_GROUP_INFO[tile.group].hex : '#4a5568';

    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(28, 22, 16, 0.48)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          className="paper-card"
          style={{
            width: '100%',
            maxWidth: '380px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: groupColor,
              color: '#fff',
              padding: '14px 18px',
              borderBottom: '2px solid var(--ink)',
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
              {tile.group ? COLOR_GROUP_INFO[tile.group].label[language] : tile.type.toUpperCase()}
            </div>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
              {tile.name[language]}
            </strong>
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.96rem' }}>
              <span style={{ color: 'var(--ink-muted)' }}>
                {language === 'de' ? 'Kaufpreis' : 'Price'}
              </span>
              <strong style={{ fontFamily: 'var(--font-stamp)', fontSize: '1.1rem' }}>{price} €</strong>
            </div>

            {tile.rents && (
              <div
                style={{
                  fontSize: '0.8rem',
                  background: '#fbf5e9',
                  border: '1px solid #d6c3a3',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '3px 12px',
                }}
              >
                <span>{language === 'de' ? 'Grundmiete' : 'Base rent'}</span>
                <strong>{tile.rents[0]} €</strong>
                <span>1–4 Tutorien</span>
                <strong>{tile.rents[1]}–{tile.rents[4]} €</strong>
                <span>Lehrstuhl</span>
                <strong>{tile.rents[5]} €</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="tactile-btn success"
                disabled={!canAct || !canAfford}
                onClick={() => onAction({ type: 'BUY_PROPERTY' })}
                style={{ flex: 1 }}
              >
                {t.buyProperty} ({price} €)
              </button>
              <button
                type="button"
                className="tactile-btn"
                disabled={!canAct}
                onClick={() => onAction({ type: 'DECLINE_PROPERTY' })}
                style={{ flex: 1 }}
              >
                {state.settings.auctions
                  ? language === 'de'
                    ? 'Auktion'
                    : 'Auction'
                  : t.declineProperty}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'CARD_MODAL' && state.drawnCard) {
    const card = state.drawnCard;
    const isChance = card.deck === 'chance';
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(28, 22, 16, 0.48)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          className="paper-card"
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <div
            className={`stamp-badge ${isChance ? 'stamp-exmatrikuliert' : 'stamp-immatrikuliert'} animate-stamp`}
            style={{ alignSelf: 'center', fontSize: '0.75rem' }}
          >
            {isChance
              ? language === 'de'
                ? 'KLAUSUREN- & PRAXISPHASE'
                : 'EXAM & PRACTICE PHASE'
              : language === 'de'
                ? 'STUV-POST'
                : 'STUV MAIL'}
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
            {card.title[language]}
          </h3>
          <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-muted)', lineHeight: 1.45 }}>
            {card.description[language]}
          </p>
          <button
            type="button"
            className="tactile-btn primary"
            disabled={!canAct}
            onClick={() => onAction({ type: 'ACK_CARD' })}
            style={{ marginTop: '6px' }}
          >
            {t.acknowledge} (Space)
          </button>
        </div>
      </div>
    );
  }

  return null;
};
