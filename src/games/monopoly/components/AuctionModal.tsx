import React from 'react';
import { BOARD_TILES } from '../game/boardData';
import type { GameAction, GameState, Language } from '../game/types';
import { COLOR_HEX } from './lobby/types';

interface AuctionModalProps {
  state: GameState;
  language: Language;
  localSeatIndices: number[];
  onAction: (action: GameAction) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  state,
  language,
  localSeatIndices,
  onAction,
}) => {
  if (state.phase !== 'AUCTION' || !state.auction) return null;

  const auction = state.auction;
  const tile = BOARD_TILES[auction.tileIndex];
  const currentBidderIdx = auction.activeBidders[auction.currentBidderPos];
  const currentBidder = state.players[currentBidderIdx];
  const canBid = localSeatIndices.includes(currentBidderIdx);
  const highestBidder =
    auction.highestBidder !== null ? state.players[auction.highestBidder] : null;

  const minBid = auction.currentBid === 0 ? 10 : auction.currentBid + 10;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: 'rgba(28, 22, 16, 0.5)',
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
          maxWidth: '400px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div className="stamp-badge stamp-exmatrikuliert" style={{ alignSelf: 'flex-start', fontSize: '0.72rem' }}>
          🔨 {language === 'de' ? 'AUKTION' : 'AUCTION'}
        </div>

        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
            {tile.name[language]}
          </h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
            {language === 'de' ? 'Listenpreis' : 'List price'}: {tile.price} €
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#fbf5e9',
            border: '1.5px solid #d6c3a3',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{language === 'de' ? 'Aktuelles Gebot' : 'Current Bid'}</span>
          <strong style={{ fontFamily: 'var(--font-stamp)', fontSize: '1.15rem' }}>
            {auction.currentBid} € {highestBidder ? `(${highestBidder.name})` : ''}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: COLOR_HEX[currentBidder.color],
              border: '1.5px solid var(--ink)',
            }}
          />
          <strong>
            {language === 'de' ? 'Am Zug:' : 'Bidding:'} {currentBidder.name} ({currentBidder.cash} €)
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[minBid, minBid + 20, minBid + 50].map((amt) => (
            <button
              key={amt}
              type="button"
              className="tactile-btn success"
              disabled={!canBid || currentBidder.cash < amt}
              onClick={() => onAction({ type: 'PLACE_BID', playerIndex: currentBidderIdx, amount: amt })}
              style={{ flex: 1, fontSize: '0.84rem' }}
            >
              {amt} €
            </button>
          ))}
        </div>

        <button
          type="button"
          className="tactile-btn"
          disabled={!canBid}
          onClick={() => onAction({ type: 'PASS_BID', playerIndex: currentBidderIdx })}
          style={{ width: '100%' }}
        >
          {language === 'de' ? 'Passen' : 'Pass'}
        </button>
      </div>
    </div>
  );
};
