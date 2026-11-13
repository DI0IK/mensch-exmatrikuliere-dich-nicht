import React, { useState } from 'react';
import { BOARD_TILES } from '../game/boardData';
import { isPropertyTradeable, validateTradeOffer } from '../game/trading';
import type { GameAction, GameState, Language, TradeOffer } from '../game/types';

interface TradeModalProps {
  state: GameState;
  language: Language;
  localSeatIndices: number[];
  isOpen: boolean;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  state,
  language,
  localSeatIndices,
  isOpen,
  onAction,
  onClose,
}) => {
  const fromIdx = state.currentTurn;
  const fromPlayer = state.players[fromIdx];
  const candidates = state.players.filter((p) => !p.bankrupt && p.index !== fromIdx);

  const [toIdx, setToIdx] = useState<number>(() => candidates[0]?.index ?? 1);
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [offerJailCards, setOfferJailCards] = useState(0);
  const [requestJailCards, setRequestJailCards] = useState(0);

  // Incoming Trade Review
  if (state.phase === 'TRADE_REVIEW' && state.pendingTrade) {
    const offer = state.pendingTrade;
    const sender = state.players[offer.fromIndex];
    const receiver = state.players[offer.toIndex];
    const canRespond = localSeatIndices.includes(offer.toIndex);

    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 58,
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
            maxWidth: '420px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
            🤝 {language === 'de' ? 'Tauschangebot' : 'Trade Offer'}: {sender.name} → {receiver.name}
          </strong>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              background: '#fbf5e9',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #d6c3a3',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <strong>{sender.name} {language === 'de' ? 'bietet:' : 'offers:'}</strong>
              <div>{offer.offerCash > 0 ? `${offer.offerCash} €` : null}</div>
              <div>{offer.offerJailCards > 0 ? `🎫 ×${offer.offerJailCards}` : null}</div>
              {offer.offerProperties.map((idx) => (
                <div key={idx}>• {BOARD_TILES[idx].name[language]}</div>
              ))}
            </div>
            <div>
              <strong>{sender.name} {language === 'de' ? 'möchte:' : 'wants:'}</strong>
              <div>{offer.requestCash > 0 ? `${offer.requestCash} €` : null}</div>
              <div>{offer.requestJailCards > 0 ? `🎫 ×${offer.requestJailCards}` : null}</div>
              {offer.requestProperties.map((idx) => (
                <div key={idx}>• {BOARD_TILES[idx].name[language]}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="tactile-btn success"
              disabled={!canRespond}
              onClick={() => onAction({ type: 'RESPOND_TRADE', accept: true })}
              style={{ flex: 1 }}
            >
              {language === 'de' ? 'Annehmen' : 'Accept'}
            </button>
            <button
              type="button"
              className="tactile-btn primary"
              disabled={!canRespond}
              onClick={() => onAction({ type: 'RESPOND_TRADE', accept: false })}
              style={{ flex: 1 }}
            >
              {language === 'de' ? 'Ablehnen' : 'Decline'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || candidates.length === 0) return null;

  const effectiveToIdx = candidates.some((c) => c.index === toIdx) ? toIdx : candidates[0].index;
  const toPlayer = state.players[effectiveToIdx];
  const myProps = BOARD_TILES.filter((t) => isPropertyTradeable(state, fromIdx, t.index));
  const theirProps = BOARD_TILES.filter((t) => isPropertyTradeable(state, effectiveToIdx, t.index));

  const toggleProp = (list: number[], setList: (v: number[]) => void, idx: number) => {
    setList(list.includes(idx) ? list.filter((x) => x !== idx) : [...list, idx]);
  };

  const draftOffer: TradeOffer = {
    fromIndex: fromIdx,
    toIndex: effectiveToIdx,
    offerCash,
    requestCash,
    offerProperties: offerProps,
    requestProperties: requestProps,
    offerJailCards,
    requestJailCards,
  };
  const valid = validateTradeOffer(state, draftOffer);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
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
          maxWidth: '520px',
          maxHeight: '85dvh',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
            🤝 {language === 'de' ? 'Handel vorschlagen' : 'Propose Trade'}
          </strong>
          <button type="button" className="tactile-btn" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
          <span>{language === 'de' ? 'Handelspartner:' : 'Partner:'}</span>
          <select
            value={effectiveToIdx}
            onChange={(e) => {
              setToIdx(Number(e.target.value));
              setRequestProps([]);
              setRequestJailCards(0);
            }}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #bfa988' }}
          >
            {candidates.map((c) => (
              <option key={c.index} value={c.index}>
                {c.emoji ?? ''} {c.name} ({c.cash} €)
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Offer side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
            <strong>{fromPlayer.name} {language === 'de' ? 'bietet' : 'offers'}</strong>
            <input
              type="number"
              min={0}
              max={fromPlayer.cash}
              step={10}
              value={offerCash}
              onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value)))}
              placeholder="€"
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #bfa988' }}
            />
            {fromPlayer.jailCards > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={offerJailCards > 0}
                  onChange={(e) => setOfferJailCards(e.target.checked ? 1 : 0)}
                />
                🎫 {language === 'de' ? 'Freikarte' : 'Excuse Card'}
              </label>
            )}
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {myProps.map((t) => (
                <label key={t.index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={offerProps.includes(t.index)}
                    onChange={() => toggleProp(offerProps, setOfferProps, t.index)}
                  />
                  {t.name[language]}
                </label>
              ))}
            </div>
          </div>

          {/* Request side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
            <strong>{toPlayer.name} {language === 'de' ? 'gibt' : 'gives'}</strong>
            <input
              type="number"
              min={0}
              max={toPlayer.cash}
              step={10}
              value={requestCash}
              onChange={(e) => setRequestCash(Math.max(0, Number(e.target.value)))}
              placeholder="€"
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #bfa988' }}
            />
            {toPlayer.jailCards > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  checked={requestJailCards > 0}
                  onChange={(e) => setRequestJailCards(e.target.checked ? 1 : 0)}
                />
                🎫 {language === 'de' ? 'Freikarte' : 'Excuse Card'}
              </label>
            )}
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {theirProps.map((t) => (
                <label key={t.index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={requestProps.includes(t.index)}
                    onChange={() => toggleProp(requestProps, setRequestProps, t.index)}
                  />
                  {t.name[language]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="tactile-btn primary"
          disabled={!valid}
          onClick={() => {
            onAction({ type: 'PROPOSE_TRADE', offer: draftOffer });
            onClose();
          }}
        >
          {language === 'de' ? 'Angebot senden' : 'Send Offer'}
        </button>
      </div>
    </div>
  );
};
