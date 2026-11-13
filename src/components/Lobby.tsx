import React, { useEffect, useRef, useState } from 'react';
import type { GameSettings, Language, PlayerConfig } from '../game/types';
import { COLOR_LABELS, TRANSLATIONS } from '../i18n/translations';
import {
  ALL_DEFAULT_NAMES,
  COLOR_HEX,
  DEFAULT_EMOJI,
  DEFAULT_NAMES,
  EMOJI_PRESETS,
  MAJOR_SUGGESTIONS,
} from './lobby/types';

interface LobbyProps {
  language: Language;
  players: PlayerConfig[];
  settings: GameSettings;
  lobbySettings: GameSettings | null;
  lobbyRoster: PlayerConfig[] | null;
  connectedSeats: number[];
  hostLobbyCode: string | null;
  hostLobbyError: string | null;
  initialRoomCode: string;
  isGuest: boolean;
  guestSeat: number | null;
  guestName: string;
  guestMajor: string;
  guestEmoji: string;
  guestConnected: boolean;
  guestConnecting: boolean;
  guestError: string | null;
  onChangePlayers: (players: PlayerConfig[]) => void;
  onChangeSettings: (settings: GameSettings) => void;
  onChangeGuestName: (name: string) => void;
  onChangeGuestMajor: (major: string) => void;
  onChangeGuestEmoji: (emoji: string) => void;
  onToggleLanguage: () => void;
  onCloseRemoteSeat: (seatIndex: number) => void;
  onStartGame: () => void;
  onGuestJoinRoom: (roomCode: string) => void;
  onGuestLeave: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  language,
  players,
  settings,
  lobbySettings,
  lobbyRoster,
  connectedSeats,
  hostLobbyCode,
  hostLobbyError,
  initialRoomCode,
  isGuest,
  guestSeat,
  guestName,
  guestMajor,
  guestEmoji,
  guestConnected,
  guestConnecting,
  guestError,
  onChangePlayers,
  onChangeSettings,
  onChangeGuestName,
  onChangeGuestMajor,
  onChangeGuestEmoji,
  onToggleLanguage,
  onCloseRemoteSeat,
  onStartGame,
  onGuestJoinRoom,
  onGuestLeave,
}) => {
  const t = TRANSLATIONS[language];
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openEmojiSeat, setOpenEmojiSeat] = useState<number | null>(null);
  const autoJoinedRef = useRef(false);

  // Auto-join via #room=...
  useEffect(() => {
    if (autoJoinedRef.current || !initialRoomCode) return;
    autoJoinedRef.current = true;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    onGuestJoinRoom(initialRoomCode);
  }, [initialRoomCode, onGuestJoinRoom]);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

  const displayPlayers = isGuest && lobbyRoster ? lobbyRoster : players;
  const activeCount = displayPlayers.filter((p) => p.active).length;
  const hasJoinableSeats =
    !isGuest && players.some((p, idx) => idx > 0 && p.active && p.seatType !== 'human-local');
  const canStart = !isGuest && activeCount >= 2;
  const connectedSet = new Set(connectedSeats);

  const updateSeat = (idx: number, patch: Partial<PlayerConfig>) => {
    if (isGuest) return;
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
          maxWidth: '740px',
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

        {/* Unified Campus Room Pass (Host Code + Join by Code, or Connected Guest Bar) */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '12px',
            border: `2px solid ${guestConnected ? 'var(--stamp-green)' : '#c8b493'}`,
            background: guestConnected
              ? 'linear-gradient(135deg, #f3faf4 0%, #fffdf7 100%)'
              : 'linear-gradient(135deg, #fbf4e6 0%, #fffdf8 55%, #f6eddc 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 3px 10px rgba(45,35,24,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isGuest && guestConnected ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="stamp-badge stamp-immatrikuliert" style={{ fontSize: '0.74rem' }}>
                  {t.webrtcConnected}
                </span>
                <strong style={{ fontSize: '0.94rem' }}>{t.webrtcWaitingRoom}</strong>
              </div>
              <button
                className="tactile-btn"
                style={{ padding: '7px 14px', fontSize: '0.84rem' }}
                onClick={() => {
                  setRoomCodeInput('');
                  onGuestLeave();
                }}
              >
                {t.webrtcLeaveRoom}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: hasJoinableSeats ? 'repeat(auto-fit, minmax(230px, 1fr))' : '1fr',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              {hasJoinableSeats && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingRight: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: hostLobbyCode ? 'var(--stamp-green)' : '#bfa988',
                        display: 'inline-block',
                      }}
                    />
                    {t.lobbyCodeTitle}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: '#fff',
                        border: '1.5px dashed #b99f77',
                        fontFamily: 'var(--font-stamp)',
                        fontSize: '1.45rem',
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: 'var(--c-rot)',
                        lineHeight: 1.15,
                        userSelect: 'all',
                      }}
                    >
                      {hostLobbyCode ?? '…'}
                    </div>

                    {hostLobbyCode && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="tactile-btn"
                          aria-label={copiedKey === 'lobby-code' ? t.copied : t.lobbyCodeCopy}
                          title={copiedKey === 'lobby-code' ? t.copied : t.lobbyCodeCopy}
                          style={{
                            padding: '7px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                          onClick={() => copyText('lobby-code', hostLobbyCode)}
                        >
                          {copiedKey === 'lobby-code' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--stamp-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="tactile-btn"
                          aria-label={copiedKey === 'lobby-url' ? t.copied : t.lobbyCodeLinkCopy}
                          title={copiedKey === 'lobby-url' ? t.copied : t.lobbyCodeLinkCopy}
                          style={{
                            padding: '7px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                          onClick={() =>
                            copyText(
                              'lobby-url',
                              `${window.location.origin}${window.location.pathname}#room=${hostLobbyCode}`
                            )
                          }
                        >
                          {copiedKey === 'lobby-url' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--stamp-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderLeft: hasJoinableSeats ? '1.5px dashed #d6c3a3' : 'none',
                  paddingLeft: hasJoinableSeats ? '16px' : 0,
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                  }}
                >
                  {t.lobbyCodeJoinLabel}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder={t.lobbyCodeJoinPlaceholder}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    aria-label={t.lobbyCodeJoinLabel}
                    style={{
                      flex: 1,
                      minWidth: '110px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #bfa988',
                      background: '#fff',
                      fontFamily: 'var(--font-stamp)',
                      fontSize: '0.96rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  />
                  <button
                    type="button"
                    className="tactile-btn primary"
                    style={{ padding: '8px 14px', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
                    disabled={
                      !roomCodeInput.trim() ||
                      guestConnecting ||
                      Boolean(
                        hostLobbyCode &&
                          roomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === hostLobbyCode
                      )
                    }
                    onClick={() => onGuestJoinRoom(roomCodeInput)}
                  >
                    {guestConnecting ? t.lobbyCodeConnecting : t.lobbyCodeJoinBtn}
                  </button>
                </div>
                {hostLobbyCode &&
                  roomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === hostLobbyCode && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--stamp-red)', fontWeight: 600 }}>
                      {language === 'de'
                        ? 'Das ist dein eigener Lobby-Code.'
                        : 'That is your own lobby code.'}
                    </div>
                  )}
              </div>
            </div>
          )}

          {hostLobbyError && !isGuest && (
            <div style={{ fontSize: '0.78rem', color: 'var(--stamp-red)' }}>{hostLobbyError}</div>
          )}
          {guestError && (
            <div style={{ fontSize: '0.82rem', color: 'var(--stamp-red)' }}>{guestError}</div>
          )}
        </div>

        {/* Unified 2-4 Player Seat List */}
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.players}</div>
        <datalist id="study-major-suggestions">
          {MAJOR_SUGGESTIONS[language].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayPlayers.map((player, idx) => {
            if (isGuest && !player.active) return null;

            const isMyGuestSeat = isGuest && guestSeat === idx;
            const canDisable = !isGuest && (!player.active || activeCount > 2);
            const isRemoteConnected = !isGuest && connectedSet.has(idx);
            const canEditProfile = (!isGuest && player.active && player.seatType !== 'human-remote') || isMyGuestSeat;

            const effectiveName = isMyGuestSeat ? guestName : player.name;
            const effectiveMajor = isMyGuestSeat ? guestMajor : (player.major ?? '');
            const effectiveEmoji = isMyGuestSeat ? guestEmoji : (player.emoji ?? DEFAULT_EMOJI[player.color]);

            return (
              <div
                key={player.color}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${
                    isMyGuestSeat
                      ? 'var(--stamp-green)'
                      : player.active
                        ? COLOR_HEX[player.color]
                        : '#cbbba0'
                  }`,
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
                    gridTemplateColumns: isGuest ? '1fr auto auto' : 'auto 1fr auto auto',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {!isGuest && (
                    <input
                      type="checkbox"
                      checked={player.active}
                      disabled={!canDisable}
                      onChange={(e) => updateSeat(idx, { active: e.target.checked })}
                      aria-label={`${COLOR_LABELS[language][player.color]} aktiv`}
                      style={{ width: 18, height: 18, accentColor: COLOR_HEX[player.color] }}
                    />
                  )}

                  {!isGuest || isMyGuestSeat ? (
                    <input
                      type="text"
                      value={effectiveName}
                      disabled={!player.active}
                      maxLength={18}
                      onChange={(e) =>
                        isMyGuestSeat
                          ? onChangeGuestName(e.target.value)
                          : updateSeat(idx, { name: e.target.value })
                      }
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
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '1.1rem' }}>{effectiveEmoji}</span>
                      <strong style={{ fontSize: '0.94rem' }}>{effectiveName}</strong>
                      {effectiveMajor && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                          · {effectiveMajor}
                        </span>
                      )}
                    </div>
                  )}

                  {!isGuest ? (
                    idx === 0 ? (
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: '#f2e8d5',
                          border: '1.5px solid #c9b493',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--ink)',
                        }}
                      >
                        Host
                      </span>
                    ) : player.seatType === 'human-remote' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: '#e9f6ec',
                          border: '1.5px solid var(--stamp-green)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--stamp-green)',
                        }}
                      >
                        ● Online
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={player.seatType === 'human-local'}
                        disabled={!player.active}
                        onClick={() =>
                          updateSeat(idx, {
                            seatType: player.seatType === 'human-local' ? 'bot' : 'human-local',
                          })
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: `1.5px solid ${
                            player.seatType === 'human-local' ? 'var(--ink)' : '#c9b493'
                          }`,
                          background:
                            player.seatType === 'human-local' ? '#fff7e0' : '#f5efe4',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color:
                            player.seatType === 'human-local' ? 'var(--ink)' : 'var(--ink-muted)',
                          cursor: player.active ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '4px',
                            border: '1.5px solid currentColor',
                            background:
                              player.seatType === 'human-local' ? 'var(--ink)' : 'transparent',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            lineHeight: 1,
                          }}
                        >
                          {player.seatType === 'human-local' ? '✓' : ''}
                        </span>
                        {language === 'de' ? 'Lokal' : 'Local'}
                      </button>
                    )
                  ) : (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                      {isMyGuestSeat
                        ? language === 'de'
                          ? 'Du'
                          : 'You'
                        : idx === 0
                          ? 'Host'
                          : player.seatType === 'human-remote'
                            ? 'Online'
                            : player.seatType === 'human-local'
                              ? language === 'de'
                                ? 'Lokal'
                                : 'Local'
                              : 'Bot'}
                    </span>
                  )}

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

                {/* Study Major & Custom Emoji Picker */}
                {canEditProfile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingLeft: isGuest ? 0 : '28px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="text"
                        list="study-major-suggestions"
                        value={effectiveMajor}
                        maxLength={28}
                        placeholder={language === 'de' ? 'Studiengang (z. B. Informatik)…' : 'Field of study (e.g. CS)…'}
                        aria-label={language === 'de' ? 'Studiengang' : 'Field of study'}
                        onChange={(e) =>
                          isMyGuestSeat
                            ? onChangeGuestMajor(e.target.value)
                            : updateSeat(idx, { major: e.target.value })
                        }
                        style={{
                          flex: '1 1 180px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbbba0',
                          background: '#fff',
                          fontSize: '0.84rem',
                          minWidth: 0,
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          value={effectiveEmoji}
                          maxLength={8}
                          aria-label={language === 'de' ? 'Spielfigur-Emoji' : 'Pawn emoji'}
                          onChange={(e) =>
                            isMyGuestSeat
                              ? onChangeGuestEmoji(e.target.value)
                              : updateSeat(idx, { emoji: e.target.value })
                          }
                          style={{
                            width: '48px',
                            textAlign: 'center',
                            padding: '5px 4px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbbba0',
                            background: '#fff',
                            fontSize: '1.1rem',
                            lineHeight: 1.2,
                          }}
                        />
                        <button
                          type="button"
                          className="tactile-btn"
                          onClick={() => setOpenEmojiSeat(openEmojiSeat === idx ? null : idx)}
                          aria-label={language === 'de' ? 'Emoji auswählen' : 'Choose emoji'}
                          style={{
                            padding: '5px 8px',
                            fontSize: '0.78rem',
                            boxShadow: '0 2px 0 var(--ink)',
                          }}
                        >
                          {openEmojiSeat === idx ? '▴' : '▾'}
                        </button>
                      </div>
                    </div>

                    {openEmojiSeat === idx && (
                      <div
                        style={{
                          marginLeft: isGuest ? 0 : '28px',
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbbba0',
                          background: '#fbf7ee',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        {EMOJI_PRESETS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              if (isMyGuestSeat) onChangeGuestEmoji(em);
                              else updateSeat(idx, { emoji: em });
                              setOpenEmojiSeat(null);
                            }}
                            style={{
                              fontSize: '1.15rem',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: '1px solid #d8c7a8',
                              background: effectiveEmoji === em ? '#ffeec7' : '#fff',
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Connected P2P Guest indicator + Kick/Reset button for Host */}
                {!isGuest && isRemoteConnected && (
                  <div
                    style={{
                      borderTop: '1px dashed #cbbba0',
                      paddingTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span className="stamp-badge stamp-immatrikuliert" style={{ fontSize: '0.72rem' }}>
                      {t.webrtcConnected}
                    </span>
                    <button
                      className="tactile-btn"
                      style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      onClick={() => onCloseRemoteSeat(idx)}
                    >
                      {t.webrtcResetSeat}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hardcore Mode Toggle */}
        {(() => {
          const activeHardcore = isGuest ? (lobbySettings?.hardcore ?? false) : settings.hardcore;
          return (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `2px solid ${activeHardcore ? 'var(--stamp-red)' : '#cbbba0'}`,
                background: activeHardcore ? '#fdf1ef' : '#fffdf7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔥</span>
                  <span>{language === 'de' ? 'Hardcore-Modus' : 'Hardcore Mode'}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                  {language === 'de'
                    ? '🍽️ Mensa, ☕ Bib, 📝 Prüfungsamt, 🍺 Party & 🎲 6-6-6 (50/50 Sofortsieg oder Zwangsexmatrikulation!).'
                    : '🍽️ Cafeteria, ☕ Library, 📝 Exam Office, 🍺 Party & 🎲 6-6-6 (50/50 instant win or full reset!).'}
                </div>
              </div>

              {isGuest ? (
                <span
                  className={`stamp-badge ${activeHardcore ? 'stamp-exmatrikuliert' : ''}`}
                  style={{ fontSize: '0.74rem' }}
                >
                  {activeHardcore
                    ? language === 'de'
                      ? 'AKTIV'
                      : 'ON'
                    : language === 'de'
                      ? 'AUS'
                      : 'OFF'}
                </span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.hardcore}
                  onClick={() => onChangeSettings({ ...settings, hardcore: !settings.hardcore })}
                  className={`tactile-btn ${settings.hardcore ? 'primary' : ''}`}
                  style={{ padding: '7px 14px', fontSize: '0.84rem', minWidth: '86px' }}
                >
                  {settings.hardcore
                    ? language === 'de'
                      ? '🔥 AN'
                      : '🔥 ON'
                    : language === 'de'
                      ? 'AUS'
                      : 'OFF'}
                </button>
              )}
            </div>
          );
        })()}

        {/* 1v1 Duel Mode Toggle */}
        {(() => {
          const activeDuelMode = isGuest
            ? (lobbySettings?.duelMode ?? 'classic')
            : (settings.duelMode ?? 'classic');
          const isPush = activeDuelMode === 'push';
          return (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `2px solid ${isPush ? 'var(--c-blau)' : '#cbbba0'}`,
                background: isPush ? '#eef5fc' : '#fffdf7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚔️</span>
                  <span>{language === 'de' ? '1v1-Duell: Augensumme' : '1v1 Duel: Push Mode'}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                  {language === 'de'
                    ? 'Statt Wohnheim: Sieger zieht Verlierer-Augensumme vor, Verlierer Sieger-Augensumme zurück (inkl. Ketten-1v1!).'
                    : 'Instead of base: winner moves +loser sum forward, loser moves -winner sum back (with chain 1v1s!).'}
                </div>
              </div>

              {isGuest ? (
                <span
                  className={`stamp-badge ${isPush ? 'stamp-immatrikuliert' : ''}`}
                  style={{ fontSize: '0.74rem' }}
                >
                  {isPush
                    ? language === 'de'
                      ? 'VOR/ZURÜCK'
                      : 'PUSH'
                    : language === 'de'
                      ? 'KLASSISCH'
                      : 'CLASSIC'}
                </span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPush}
                  onClick={() =>
                    onChangeSettings({
                      ...settings,
                      duelMode: isPush ? 'classic' : 'push',
                    })
                  }
                  className={`tactile-btn ${isPush ? 'primary' : ''}`}
                  style={{ padding: '7px 14px', fontSize: '0.84rem', minWidth: '86px' }}
                >
                  {isPush
                    ? language === 'de'
                      ? '⚔️ AN'
                      : '⚔️ ON'
                    : language === 'de'
                      ? 'AUS'
                      : 'OFF'}
                </button>
              )}
            </div>
          );
        })()}

        {/* Start Game (Host) or Waiting Status (Guest) */}
        {isGuest ? (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(231, 220, 200, 0.45)',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--ink-muted)',
            }}
          >
            {t.webrtcWaitingRoom}
          </div>
        ) : (
          <button
            className="tactile-btn primary"
            disabled={!canStart}
            onClick={onStartGame}
            style={{ width: '100%', padding: '13px', fontSize: '1.05rem' }}
          >
            {t.startGame}
          </button>
        )}
      </div>
    </div>
  );
};
