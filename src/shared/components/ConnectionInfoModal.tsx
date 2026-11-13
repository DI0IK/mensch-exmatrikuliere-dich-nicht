import React, { useState } from 'react';
import { getIceServers } from '../net/iceConfig';
import type { IceTransportKind } from '../net/lobbyRoom';

export interface ConnectionSeatPlayer {
  color: string;
  name: string;
  emoji?: string;
  seatType: string;
}

interface ConnectionInfoModalProps {
  players: ConnectionSeatPlayer[];
  language: 'de' | 'en';
  isGuest: boolean;
  hostLobbyCode: string | null;
  connectedSeats: number[];
  disconnectedSeats: number[];
  seatTransports: Record<number, IceTransportKind>;
  onClose: () => void;
}

export const ConnectionInfoModal: React.FC<ConnectionInfoModalProps> = ({
  players,
  language,
  isGuest,
  hostLobbyCode,
  connectedSeats,
  disconnectedSeats,
  seatTransports,
  onClose,
}) => {
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
                  aria-label={
                    copiedCode
                      ? language === 'de'
                        ? 'Kopiert!'
                        : 'Copied!'
                      : language === 'de'
                        ? 'Code kopieren'
                        : 'Copy code'
                  }
                  title={
                    copiedCode
                      ? language === 'de'
                        ? 'Kopiert!'
                        : 'Copied!'
                      : language === 'de'
                        ? 'Code kopieren'
                        : 'Copy code'
                  }
                  style={{ padding: '4px 6px', lineHeight: 1 }}
                  onClick={() => {
                    void navigator.clipboard?.writeText(hostLobbyCode);
                    setCopiedCode(true);
                    window.setTimeout(() => setCopiedCode(false), 1600);
                  }}
                >
                  {copiedCode ? '✓' : '⧉'}
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
          {players.map((p, idx) => {
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
