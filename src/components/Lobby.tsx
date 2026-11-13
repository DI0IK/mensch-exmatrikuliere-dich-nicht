import React, { useEffect, useRef, useState } from 'react';
import type { Language, PlayerColor, PlayerConfig, SeatType } from '../game/types';
import { COLOR_LABELS, TRANSLATIONS } from '../i18n/translations';

interface RemoteSlotUI {
  offerCode: string;
  answerInput: string;
  connected: boolean;
  creating: boolean;
  error: string | null;
}

interface LobbyProps {
  language: Language;
  players: PlayerConfig[];
  lobbyRoster: PlayerConfig[] | null;
  remoteSlots: Record<number, RemoteSlotUI>;
  initialJoinCode: string;
  guestName: string;
  guestAnswerCode: string;
  guestConnected: boolean;
  guestError: string | null;
  onChangePlayers: (players: PlayerConfig[]) => void;
  onChangeGuestName: (name: string) => void;
  onToggleLanguage: () => void;
  onCreateOffer: (seatIndex: number) => void;
  onAcceptAnswer: (seatIndex: number, answerCode: string) => void;
  onUpdateAnswerInput: (seatIndex: number, value: string) => void;
  onCloseRemoteSeat: (seatIndex: number) => void;
  onStartGame: () => void;
  onGuestCreateAnswer: (offerCode: string) => void;
  onGuestLeave: () => void;
}

const DEFAULT_NAMES: Record<SeatType, string[]> = {
  'human-local': ['Studi 1', 'Studi 2', 'Studi 3', 'Studi 4'],
  'human-remote': ['Online-Studi 1', 'Online-Studi 2', 'Online-Studi 3', 'Online-Studi 4'],
  bot: ['Maschbau-Max', 'BWL-Justus', 'Info-Klara', 'Jura-Leo'],
};

const ALL_DEFAULT_NAMES = new Set(Object.values(DEFAULT_NAMES).flat());

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

export const Lobby: React.FC<LobbyProps> = ({
  language,
  players,
  lobbyRoster,
  remoteSlots,
  initialJoinCode,
  guestName,
  guestAnswerCode,
  guestConnected,
  guestError,
  onChangePlayers,
  onChangeGuestName,
  onToggleLanguage,
  onCreateOffer,
  onAcceptAnswer,
  onUpdateAnswerInput,
  onCloseRemoteSeat,
  onStartGame,
  onGuestCreateAnswer,
  onGuestLeave,
}) => {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<'host' | 'join'>(initialJoinCode ? 'join' : 'host');
  const [offerInput, setOfferInput] = useState(initialJoinCode);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const autoJoinedRef = useRef(false);

  // Auto-generate Answer Code when opened via #join=... invite link
  useEffect(() => {
    if (initialJoinCode && !autoJoinedRef.current) {
      autoJoinedRef.current = true;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      onGuestCreateAnswer(initialJoinCode);
    }
  }, [initialJoinCode, onGuestCreateAnswer]);

  const activeCount = players.filter((p) => p.active).length;

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

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

  const canStart = activeCount >= 2;

  return (
    <div
      className="app-shell"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '24px',
        paddingBottom: '32px',
      }}
    >
      <div
        className="paper-card"
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: 'clamp(18px, 3vw, 30px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
            borderBottom: '2px solid var(--ink)',
            paddingBottom: '14px',
          }}
        >
          <div>
            <div className="stamp-badge stamp-exmatrikuliert" style={{ fontSize: '0.72rem', marginBottom: '8px' }}>
              PO 2026 · {language === 'de' ? 'PRÜFUNGSAMT' : 'EXAM OFFICE'}
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.55rem, 3.6vw, 2.2rem)',
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {t.title}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-muted)', fontSize: '0.94rem' }}>
              {t.subtitle}
            </p>
          </div>

          <button
            className="tactile-btn"
            onClick={onToggleLanguage}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            {language === 'de' ? 'DE / EN' : 'EN / DE'}
          </button>
        </div>

        {/* Mode Switcher: Host / Local vs Join P2P */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`tactile-btn ${mode === 'host' ? 'primary' : ''}`}
            onClick={() => setMode('host')}
            style={{ flex: 1 }}
          >
            {language === 'de' ? 'Spiel erstellen (Lokal / Bots / Host)' : 'Create Game (Local / Bots / Host)'}
          </button>
          <button
            className={`tactile-btn ${mode === 'join' ? 'primary' : ''}`}
            onClick={() => setMode('join')}
            style={{ flex: 1 }}
          >
            {t.webrtcGuestTitle}
          </button>
        </div>

        {mode === 'host' ? (
          <>
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
                        <option value="bot">{t.seatBot}</option>
                        {idx > 0 && <option value="human-remote">{t.seatRemote}</option>}
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

                    {/* WebRTC Host Invite Controls for Remote Seats */}
                    {player.active && player.seatType === 'human-remote' && (
                      <div
                        style={{
                          borderTop: '1px dashed #cbbba0',
                          paddingTop: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <strong>{t.webrtcHostTitle}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {remote?.connected ? (
                              <span className="stamp-badge stamp-immatrikuliert" style={{ fontSize: '0.72rem' }}>
                                {t.webrtcConnected}
                              </span>
                            ) : (
                              <button
                                className="tactile-btn"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                disabled={remote?.creating}
                                onClick={() => onCreateOffer(idx)}
                              >
                                {t.webrtcCreateInvite}
                              </button>
                            )}
                            {(remote?.connected || remote?.offerCode) && (
                              <button
                                className="tactile-btn"
                                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                                onClick={() => onCloseRemoteSeat(idx)}
                              >
                                {t.webrtcResetSeat}
                              </button>
                            )}
                          </div>
                        </div>

                        {remote?.offerCode && !remote.connected && (
                          <>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                className="tactile-btn"
                                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                onClick={() =>
                                  copyText(
                                    `url-${idx}`,
                                    `${window.location.origin}${window.location.pathname}#join=${remote.offerCode}`
                                  )
                                }
                              >
                                {copiedKey === `url-${idx}` ? t.copied : t.webrtcCopyInviteUrl}
                              </button>
                              <button
                                className="tactile-btn"
                                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                onClick={() => copyText(`offer-${idx}`, remote.offerCode)}
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

            <button
              className="tactile-btn primary"
              disabled={!canStart}
              onClick={onStartGame}
              style={{ width: '100%', padding: '13px', fontSize: '1.05rem' }}
            >
              {t.startGame}
            </button>
          </>
        ) : (
          /* Guest Join Panel */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!guestConnected && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                {t.webrtcGuestHint}
              </p>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.86rem', fontWeight: 700 }}>
              {t.webrtcGuestNameLabel}
              <input
                type="text"
                maxLength={18}
                placeholder={t.webrtcGuestNamePlaceholder}
                value={guestName}
                onChange={(e) => onChangeGuestName(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #bfa988',
                  background: '#fff',
                  fontWeight: 600,
                  fontSize: '0.94rem',
                }}
              />
            </label>

            {guestConnected ? (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#fffdf7',
                  border: '2px solid var(--stamp-green)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div className="stamp-badge stamp-immatrikuliert" style={{ fontSize: '0.75rem', alignSelf: 'flex-start' }}>
                  {t.webrtcConnected}
                </div>
                <strong style={{ fontSize: '0.94rem' }}>{t.webrtcWaitingRoom}</strong>
                {lobbyRoster && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lobbyRoster.map((p) =>
                      p.active ? (
                        <div
                          key={p.color}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.86rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(231, 220, 200, 0.35)',
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: COLOR_HEX[p.color],
                              border: '1.5px solid var(--ink)',
                            }}
                          />
                          <strong>{p.name}</strong>
                          <span style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
                            ({p.seatType === 'bot' ? 'Bot' : p.seatType === 'human-remote' ? 'P2P' : 'Host'})
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                <button
                  className="tactile-btn"
                  onClick={() => {
                    setOfferInput('');
                    onGuestLeave();
                  }}
                >
                  {t.webrtcLeaveRoom}
                </button>
              </div>
            ) : (
              <>
                <textarea
                  rows={3}
                  placeholder={t.webrtcPasteOffer}
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1.5px solid #bfa988',
                    fontFamily: 'var(--font-stamp)',
                    fontSize: '0.8rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="tactile-btn primary"
                    style={{ flex: 1 }}
                    disabled={!offerInput.trim()}
                    onClick={() => onGuestCreateAnswer(offerInput)}
                  >
                    {t.webrtcCreateAnswer}
                  </button>
                  {guestAnswerCode && (
                    <button
                      className="tactile-btn"
                      onClick={() => {
                        setOfferInput('');
                        onGuestLeave();
                      }}
                    >
                      {t.webrtcLeaveRoom}
                    </button>
                  )}
                </div>

                {guestAnswerCode && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#fffdf7',
                      border: '1.5px solid var(--ink)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.86rem' }}>Answer Code:</strong>
                      <button
                        className="tactile-btn"
                        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        onClick={() => copyText('guest-answer', guestAnswerCode)}
                      >
                        {copiedKey === 'guest-answer' ? t.copied : t.webrtcCopyAnswer}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={2}
                      value={guestAnswerCode}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #cbbba0',
                        fontFamily: 'var(--font-stamp)',
                        fontSize: '0.75rem',
                        background: '#f7f1e3',
                      }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                      {t.webrtcJoinWait}
                    </span>
                  </div>
                )}
              </>
            )}

            {guestError && (
              <span style={{ color: 'var(--stamp-red)', fontSize: '0.84rem' }}>{guestError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
