import React from 'react';
import { BOARD_TILES, COLOR_GROUP_INFO } from '../game/boardData';
import {
  canBuildOnTile,
  canMortgageTile,
  canSellOnTile,
  canUnmortgageTile,
  getMortgageValue,
  getUnmortgageCost,
  isOwnableTile,
} from '../game/helpers';
import type { GameAction, GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { COLOR_HEX } from './lobby/types';

interface TileDetailModalProps {
  state: GameState;
  tileIndex: number;
  language: Language;
  canAct: boolean;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}

export const TileDetailModal: React.FC<TileDetailModalProps> = ({
  state,
  tileIndex,
  language,
  canAct,
  onAction,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const tile = BOARD_TILES[tileIndex];
  if (!tile) return null;

  const prop = state.properties[tileIndex];
  const owner = prop && prop.ownerIndex !== null ? state.players[prop.ownerIndex] : null;
  const currentIdx = state.currentTurn;
  const currentPlayer = state.players[currentIdx];
  const isOwnerActing = canAct && prop?.ownerIndex === currentIdx;
  const groupColor = tile.group ? COLOR_GROUP_INFO[tile.group].hex : '#4a5568';

  const isPendingBuy = state.phase === 'BUY_OR_AUCTION' && state.pendingTileIndex === tileIndex;
  const canBuy = canAct && isPendingBuy && currentPlayer.cash >= (tile.price ?? 0);

  const buildable = isOwnerActing && canBuildOnTile(state, currentIdx, tileIndex);
  const sellable = isOwnerActing && canSellOnTile(state, currentIdx, tileIndex);
  const mortgagable = isOwnerActing && canMortgageTile(state, currentIdx, tileIndex);
  const unmortgagable = isOwnerActing && canUnmortgageTile(state, currentIdx, tileIndex);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 56,
        background: 'rgba(28, 22, 16, 0.48)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="paper-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '390px',
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
              {tile.group ? COLOR_GROUP_INFO[tile.group].label[language] : tile.type.toUpperCase()}
            </div>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.28rem' }}>
              {tile.name[language]}
            </strong>
          </div>
          <button
            type="button"
            className="tactile-btn"
            onClick={onClose}
            style={{ padding: '3px 9px', fontSize: '0.8rem' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isOwnableTile(tile) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.88rem',
              }}
            >
              <span style={{ color: 'var(--ink-muted)' }}>
                {language === 'de' ? 'Eigentümer' : 'Owner'}
              </span>
              {owner ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: COLOR_HEX[owner.color],
                      border: '1.5px solid var(--ink)',
                    }}
                  />
                  {owner.emoji ?? ''} {owner.name}
                </span>
              ) : (
                <strong>{language === 'de' ? `Frei (${tile.price} €)` : `Unowned (${tile.price} €)`}</strong>
              )}
            </div>
          )}

          {prop?.mortgaged && (
            <div
              className="stamp-badge stamp-exmatrikuliert"
              style={{ alignSelf: 'flex-start', fontSize: '0.72rem' }}
            >
              {language === 'de' ? 'BELIEHEN (KEINE MIETE)' : 'MORTGAGED (NO RENT)'}
            </div>
          )}

          {tile.rents && (
            <div
              style={{
                fontSize: '0.8rem',
                background: '#fbf5e9',
                border: '1px solid #d6c3a3',
                borderRadius: '8px',
                padding: '9px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '4px 12px',
              }}
            >
              <span>{language === 'de' ? 'Grundmiete (Monopol ×2)' : 'Base rent (Monopoly ×2)'}</span>
              <strong>{tile.rents[0]} € ({tile.rents[0] * 2} €)</strong>
              <span>1 Tutorium</span>
              <strong>{tile.rents[1]} €</strong>
              <span>2 Tutorien</span>
              <strong>{tile.rents[2]} €</strong>
              <span>3 Tutorien</span>
              <strong>{tile.rents[3]} €</strong>
              <span>4 Tutorien</span>
              <strong>{tile.rents[4]} €</strong>
              <span>🏛 Lehrstuhl</span>
              <strong>{tile.rents[5]} €</strong>
              {tile.houseCost && (
                <>
                  <span style={{ color: 'var(--ink-muted)' }}>
                    {language === 'de' ? 'Baukosten je Stufe' : 'Build cost'}
                  </span>
                  <strong>{tile.houseCost} €</strong>
                </>
              )}
            </div>
          )}

          {tile.type === 'transit' && (
            <div
              style={{
                fontSize: '0.82rem',
                background: '#fbf5e9',
                border: '1px solid #d6c3a3',
                borderRadius: '8px',
                padding: '9px 12px',
              }}
            >
              {language === 'de'
                ? 'Miete je nach Anzahl der Haltestellen: 25 € / 50 € / 100 € / 200 €.'
                : 'Rent by owned stops: 25 € / 50 € / 100 € / 200 €.'}
            </div>
          )}

          {tile.type === 'utility' && (
            <div
              style={{
                fontSize: '0.82rem',
                background: '#fbf5e9',
                border: '1px solid #d6c3a3',
                borderRadius: '8px',
                padding: '9px 12px',
              }}
            >
              {language === 'de'
                ? 'Miete: 4× Augenzahl (bei 2 Werken: 10× Augenzahl).'
                : 'Rent: 4× dice roll (10× if both utilities owned).'}
            </div>
          )}

          {tile.type === 'tax' && (
            <div style={{ fontSize: '0.88rem', color: 'var(--stamp-red)', fontWeight: 700 }}>
              {language === 'de' ? `Gebühr: ${tile.taxAmount} €` : `Fee: ${tile.taxAmount} €`}
            </div>
          )}

          {/* Contextual Actions */}
          {isPendingBuy && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="tactile-btn success"
                disabled={!canBuy}
                onClick={() => {
                  onAction({ type: 'BUY_PROPERTY' });
                  onClose();
                }}
                style={{ flex: 1 }}
              >
                {t.buyProperty} ({tile.price} €)
              </button>
              <button
                type="button"
                className="tactile-btn"
                disabled={!canAct}
                onClick={() => {
                  onAction({ type: 'DECLINE_PROPERTY' });
                  onClose();
                }}
                style={{ flex: 1 }}
              >
                {state.settings.auctions ? (language === 'de' ? 'Auktion' : 'Auction') : t.declineProperty}
              </button>
            </div>
          )}

          {isOwnerActing && (tile.type === 'street' || isOwnableTile(tile)) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tile.type === 'street' && (
                <>
                  <button
                    type="button"
                    className="tactile-btn success"
                    disabled={!buildable}
                    onClick={() => onAction({ type: 'BUILD_HOUSE', tileIndex })}
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    +🏠 {tile.houseCost}€
                  </button>
                  <button
                    type="button"
                    className="tactile-btn"
                    disabled={!sellable}
                    onClick={() => onAction({ type: 'SELL_HOUSE', tileIndex })}
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    -🏠 +{Math.floor((tile.houseCost ?? 0) * 0.5)}€
                  </button>
                </>
              )}
              <button
                type="button"
                className="tactile-btn"
                disabled={prop?.mortgaged ? !unmortgagable : !mortgagable}
                onClick={() => onAction({ type: 'TOGGLE_MORTGAGE', tileIndex })}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                {prop?.mortgaged
                  ? language === 'de'
                    ? `Auslösen (-${getUnmortgageCost(tile)} €)`
                    : `Redeem (-${getUnmortgageCost(tile)} €)`
                  : language === 'de'
                    ? `Beleihen (+${getMortgageValue(tile)} €)`
                    : `Mortgage (+${getMortgageValue(tile)} €)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
