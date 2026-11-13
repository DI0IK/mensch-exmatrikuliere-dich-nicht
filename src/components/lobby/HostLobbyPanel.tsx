import React, { useState } from 'react';
import type { Language, PlayerConfig, SeatType } from '../../game/types';
import { COLOR_LABELS, TRANSLATIONS } from '../../i18n/translations';
import { ALL_DEFAULT_NAMES, COLOR_HEX, DEFAULT_NAMES, type RemoteSlotUI } from './types';

interface HostLobbyPanelProps {
  language: Language;
  players: PlayerConfig[];
  remoteSlots: Record<number, RemoteSlotUI>;
  hostLobbyCode: string | null;
  hostLobbyError: string | null;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onChangePlayers: (players: PlayerConfig[]) => void;
  onCreateOffer: (seatIndex: number) => void;
  onAcceptAnswer: (seatIndex: number, answerCode: string) => void;
  onUpdateAnswerInput: (seatIndex: number, value: string) => void;
  onCloseRemoteSeat: (seatIndex: number) => void;
  onStartGame: () => void;
}

export const HostLobbyPanel: React.FC<HostLobbyPanelProps> = ({
  language,
  players,
  remoteSlots,
  hostLobbyCode,
  hostLobbyError,
  copiedKey,
  onCopy,
  onChangePlayers,
  onCreateOffer,
  onAcceptAnswer,
  onUpdateAnswerInput,
  onCloseRemoteSeat,
  onStartGame,
}) => {
  const t = TRANSLATIONS[language];
  const [showManualHost, setShowManualHost] = useState(false);

  const activeCount = players.filter((p) => p.active).length;
  const hasJoinableSeats = players.some(
    (p, idx) => idx > 0 && p.active && p.seatType !== 'human-local'
  );
  const canStart = activeCount >= 2;

  const updateSeat = (idx: number, patch: Partial<PlayerConfig>) => {
    const prevSeat = players[idx];
    const next = players.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, ...patch };
      if (patch.seatType && ALL_DEFAULT_NAMES.has(p.name.trim())) {
        updated.name = DEFAULT_NAMES[patch.seatType][idx] ?? p.name;
      }
      return updated;
    });
    if (
      prevSeat?.seatType === 'human-remote' &&
      ((patch.seatType && patch.seatType !== 'human-remote') || patch.active === false)
    ) {
      onCloseRemoteSeat(idx);
    }
    onChangePlayers(next);
  };

  return (
    <>
      {hasJoinableSeats && (
        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            border: '2px solid var(--ink)',
            background: '#fffdf7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
              {t.lobbyCodeTitle}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-stamp)',
                fontSize: '1.65rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--c-rot)',
              }}
            >
              {hostLobbyCode ?? '…'}
            </div>
            {hostLobbyError && (
              <div style={{ fontSize: '0.78rem', color: 'var(--stamp-red)' }}>
                {hostLobbyError}
              </div>
            )}
          </div>

          {hostLobbyCode && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="tactile-btn"
                style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                onClick={() => onCopy('lobby-code', hostLobbyCode)}
              >
                {copiedKey === 'lobby-code' ? t.copied : t.lobbyCodeCopy}
              </button>
              <button
                className="tactile-btn primary"
                style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                onClick={() =>
                  onCopy(
                    'lobby-url',
                    `${window.location.origin}${window.location.pathname}#room=${hostLobbyCode}`
                  )
                }
              >
                {copiedKey === 'lobby-url' ? t.copied : t.lobbyCodeLinkCopy}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.players}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {players.map((player, idx) => {
          const remote = remoteSlots[idx];
          const canDisable = !player.active || activeCount > 2;

          return (
            <div
              key={player.color}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${player.active ? COLOR_HEX[player.color] : '#cbbba0'}`,
                background: player.active ? '#fffdf7' : 'rgba(231, 220, 200, 0.35)',
                opacity: player.active ? 1 : 0.65,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <input
                  type="checkbox"
                  checked={player.active}
                  disabled={!canDisable}
                  onChange={(e) => updateSeat(idx, { active: e.target.checked })}
                  aria-label={`${COLOR_LABELS[language][player.color]} aktiv`}
                  style={{ width: 18, height: 18, accentColor: COLOR_HEX[player.color] }}
                />

                <input
                  type="text"
                  value={player.name}
                  disabled={!player.active}
                  maxLength={18}
                  onChange={(e) => updateSeat(idx, { name: e.target.value })}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #bfa988',
                    background: '#fff',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    minWidth: 0,
                  }}
                />

                <select
                  value={player.seatType}
                  disabled={!player.active || idx === 0}
                  onChange={(e) =>
                    updateSeat(idx, { seatType: e.target.value as SeatType })
                  }
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #bfa988',
                    background: '#fff',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="human-local">{t.seatHumanLocal}</option>
                  <option value="bot">
                    {language === 'de' ? 'Bot / P2P-Platz' : 'Bot / P2P Slot'}
                  </option>
                  {idx > 0 && player.seatType === 'human-remote' && (
                    <option value="human-remote">{t.seatRemote}</option>
                  )}
                </select>

                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: COLOR_HEX[player.color],
                    border: '2px solid var(--ink)',
                  }}
                />
              </div>

              {player.active && player.seatType === 'human-remote' && (
                <div
                  style={{
                    borderTop: '1px dashed #cbbba0',
                    paddingTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.84rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    {remote?.connected ? (
                      <span className="stamp-badge stamp-immatrikuliert" style={{ fontSize: '0.72rem' }}>
                        {t.webrtcConnected}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                        {language === 'de' ? 'Wartet auf Beitritt per Lobby-Code…' : 'Waiting for player via Lobby Code…'}
                      </span>
                    )}

                    {remote?.connected && (
                      <button
                        className="tactile-btn"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        onClick={() => onCloseRemoteSeat(idx)}
                      >
                        {t.webrtcResetSeat}
                      </button>
                    )}
                  </div>

                  {showManualHost && !remote?.connected && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                      <button
                        className="tactile-btn"
                        style={{ padding: '5px 10px', fontSize: '0.78rem', alignSelf: 'flex-start' }}
                        disabled={remote?.creating}
                        onClick={() => onCreateOffer(idx)}
                      >
                        {t.webrtcCreateInvite}
                      </button>

                      {remote?.offerCode && (
                        <>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="tactile-btn"
                              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                              onClick={() =>
                                onCopy(
                                  `url-${idx}`,
                                  `${window.location.origin}${window.location.pathname}#join=${remote.offerCode}`
                                )
                              }
                            >
                              {copiedKey === `url-${idx}` ? t.copied : t.webrtcCopyInviteUrl}
                            </button>
                            <button
                              className="tactile-btn"
                              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                              onClick={() => onCopy(`offer-${idx}`, remote.offerCode)}
                            >
                              {copiedKey === `offer-${idx}` ? t.copied : t.webrtcCopyOfferCode}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder={t.webrtcPasteAnswer}
                              value={remote.answerInput}
                              onChange={(e) => onUpdateAnswerInput(idx, e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1.5px solid #bfa988',
                                fontFamily: 'var(--font-stamp)',
                                fontSize: '0.78rem',
                              }}
                            />
                            <button
                              className="tactile-btn primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              disabled={!remote.answerInput.trim()}
                              onClick={() => onAcceptAnswer(idx, remote.answerInput)}
                            >
                              {t.webrtcConnectBtn}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {remote?.error && (
                    <span style={{ color: 'var(--stamp-red)', fontSize: '0.78rem' }}>
                      {remote.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasJoinableSeats && (
        <button
          type="button"
          onClick={() => setShowManualHost((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            fontSize: '0.78rem',
            color: 'var(--ink-muted)',
            textDecoration: 'underline',
          }}
        >
          {showManualHost ? '▾ ' : '▸ '}
          {t.manualFallbackToggle}
        </button>
      )}

      <button
        className="tactile-btn primary"
        disabled={!canStart}
        onClick={onStartGame}
        style={{ width: '100%', padding: '13px', fontSize: '1.05rem' }}
      >
        {t.startGame}
      </button>
    </>
  );
};
