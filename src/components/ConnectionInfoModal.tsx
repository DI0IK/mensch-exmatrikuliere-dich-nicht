import React, { useState } from 'react';
import type { GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { getIceServers } from '../net/iceConfig';
import type { IceTransportKind } from '../net/lobbyRoom';

interface ConnectionInfoModalProps {
  state: GameState;
  language: Language;
  isGuest: boolean;
  hostLobbyCode: string | null;
  connectedSeats: number[];
  disconnectedSeats: number[];
  seatTransports: Record<number, IceTransportKind>;
  onClose: () => void;
}

export const ConnectionInfoModal: React.FC<ConnectionInfoModalProps> = ({
  state,
  language,
  isGuest,
  hostLobbyCode,
  connectedSeats,
  disconnectedSeats,
  seatTransports,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const [copiedCode, setCopiedCode] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(28, 22, 16, 0.45)',
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
          maxWidth: '380px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            {language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
          </strong>
          <button
            type="button"
            className="tactile-btn"
            onClick={onClose}
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.84rem',
            background: '#fbf5e9',
            border: '1.5px solid #d6c3a3',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: 'var(--ink-muted)' }}>{language === 'de' ? 'Rolle' : 'Role'}</span>
            <strong>
              {isGuest
                ? language === 'de'
                  ? 'Gast (Online)'
                  : 'Guest (Online)'
                : connectedSeats.length > 0
                  ? 'Host (Online)'
                  : language === 'de'
                    ? 'Lokal / Host'
                    : 'Local / Host'}
            </strong>
          </div>

          {!isGuest && hostLobbyCode && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Lobby-Code</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <code
                  style={{
                    fontFamily: 'var(--font-stamp)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--c-rot)',
                  }}
                >
                  {hostLobbyCode}
                </code>
                <button
                  type="button"
                  className="tactile-btn"
                  aria-label={copiedCode ? t.copied : t.lobbyCodeCopy}
                  title={copiedCode ? t.copied : t.lobbyCodeCopy}
                  style={{
                    padding: '4px 6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  onClick={() => {
                    navigator.clipboard?.writeText(hostLobbyCode);
                    setCopiedCode(true);
                    window.setTimeout(() => setCopiedCode(false), 1600);
                  }}
                >
                  {copiedCode ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--stamp-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: 'var(--ink-muted)' }}>STUN / TURN</span>
            <strong>
              {getIceServers().length > 2
                ? language === 'de'
                  ? 'STUN + TURN aktiv'
                  : 'STUN + TURN active'
                : language === 'de'
                  ? 'Nur STUN (kein TURN)'
                  : 'STUN only (no TURN)'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--ink-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
            {language === 'de' ? 'Spielerplätze' : 'Seats'}
          </div>
          {state.players.map((p, idx) => {
            const isRemote = p.seatType === 'human-remote';
            const isOnline = connectedSeats.includes(idx);
            const isDropped = disconnectedSeats.includes(idx);
            const transport = seatTransports[idx];
            const transportLabel =
              transport === 'turn'
                ? 'TURN'
                : transport === 'stun'
                  ? 'STUN'
                  : transport === 'local'
                    ? language === 'de'
                      ? 'Lokal (LAN)'
                      : 'Local (LAN)'
                    : null;
            const statusLabel = isRemote
              ? isDropped
                ? language === 'de'
                  ? 'Getrennt'
                  : 'Disconnected'
                : isOnline || isGuest
                  ? transportLabel
                    ? `Online · ${transportLabel}`
                    : 'Online'
                  : language === 'de'
                    ? 'Wartend'
                    : 'Waiting'
              : p.seatType === 'bot'
                ? 'Bot'
                : idx === 0
                  ? isGuest && transportLabel
                    ? `Host · ${transportLabel}`
                    : 'Host'
                  : language === 'de'
                    ? 'Lokal'
                    : 'Local';
            return (
              <div
                key={p.color}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: '#fff',
                  border: '1px solid #e2d5be',
                }}
              >
                <span>
                  {p.emoji ?? ''} {p.name}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    color: isDropped
                      ? 'var(--stamp-red)'
                      : isRemote && (isOnline || isGuest)
                        ? 'var(--stamp-green)'
                        : 'var(--ink-muted)',
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
