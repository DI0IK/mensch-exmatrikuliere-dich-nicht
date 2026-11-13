import React, { useState } from 'react';
import type { Language, PlayerConfig } from '../../game/types';
import { TRANSLATIONS } from '../../i18n/translations';
import { COLOR_HEX, EMOJI_PRESETS, MAJOR_SUGGESTIONS } from './types';

interface GuestJoinPanelProps {
  language: Language;
  lobbyRoster: PlayerConfig[] | null;
  initialJoinCode: string;
  initialRoomCode: string;
  guestName: string;
  guestMajor: string;
  guestEmoji: string;
  guestAnswerCode: string;
  guestConnected: boolean;
  guestConnecting: boolean;
  guestError: string | null;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onChangeGuestName: (name: string) => void;
  onChangeGuestMajor: (major: string) => void;
  onChangeGuestEmoji: (emoji: string) => void;
  onGuestJoinRoom: (roomCode: string) => void;
  onGuestCreateAnswer: (offerCode: string) => void;
  onGuestLeave: () => void;
}

export const GuestJoinPanel: React.FC<GuestJoinPanelProps> = ({
  language,
  lobbyRoster,
  initialJoinCode,
  initialRoomCode,
  guestName,
  guestMajor,
  guestEmoji,
  guestAnswerCode,
  guestConnected,
  guestConnecting,
  guestError,
  copiedKey,
  onCopy,
  onChangeGuestName,
  onChangeGuestMajor,
  onChangeGuestEmoji,
  onGuestJoinRoom,
  onGuestCreateAnswer,
  onGuestLeave,
}) => {
  const t = TRANSLATIONS[language];
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [offerInput, setOfferInput] = useState(initialJoinCode);
  const [showManualGuest, setShowManualGuest] = useState(Boolean(initialJoinCode));
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <datalist id="guest-study-major-suggestions">
          {MAJOR_SUGGESTIONS[language].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            list="guest-study-major-suggestions"
            value={guestMajor}
            maxLength={28}
            placeholder={language === 'de' ? 'Studiengang (z. B. Informatik)…' : 'Field of study (e.g. CS)…'}
            aria-label={language === 'de' ? 'Studiengang' : 'Field of study'}
            onChange={(e) => onChangeGuestMajor(e.target.value)}
            style={{
              flex: '1 1 180px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1.5px solid #bfa988',
              background: '#fff',
              fontSize: '0.88rem',
              minWidth: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="text"
              value={guestEmoji}
              placeholder="🎓"
              maxLength={8}
              aria-label={language === 'de' ? 'Spielfigur-Emoji' : 'Pawn emoji'}
              title={language === 'de' ? 'Eigenes Emoji eingeben oder rechts auswählen' : 'Type any emoji or pick one'}
              onChange={(e) => onChangeGuestEmoji(e.target.value)}
              style={{
                width: '48px',
                textAlign: 'center',
                padding: '6px 4px',
                borderRadius: '8px',
                border: '1.5px solid #bfa988',
                background: '#fff',
                fontSize: '1.1rem',
                lineHeight: 1.2,
              }}
            />
            <button
              type="button"
              className="tactile-btn"
              onClick={() => setOpenEmojiPicker((v) => !v)}
              aria-label={language === 'de' ? 'Emoji auswählen' : 'Choose emoji'}
              title={language === 'de' ? 'Emoji auswählen' : 'Choose emoji'}
              style={{
                padding: '6px 8px',
                fontSize: '0.78rem',
                boxShadow: '0 2px 0 var(--ink)',
              }}
            >
              {openEmojiPicker ? '▴' : '▾'}
            </button>
          </div>
        </div>

        {openEmojiPicker && (
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1.5px solid #cbbba0',
              background: '#fbf7ee',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            {EMOJI_PRESETS.map((em) => {
              const isSelected = guestEmoji === em;
              return (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    onChangeGuestEmoji(em);
                    setOpenEmojiPicker(false);
                  }}
                  style={{
                    width: '34px',
                    height: '34px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--ink)' : '1px solid #d5c6ae',
                    background: isSelected ? '#fff' : '#fffdf7',
                    cursor: 'pointer',
                  }}
                >
                  {em}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
                    <strong>
                      {p.emoji ? `${p.emoji} ` : ''}
                      {p.name}
                    </strong>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
                      ({p.major?.trim() ? `${p.major.trim()} · ` : ''}
                      {p.seatType === 'bot' ? 'Bot' : p.seatType === 'human-remote' ? 'P2P' : 'Host'})
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
              setRoomCodeInput('');
              onGuestLeave();
            }}
          >
            {t.webrtcLeaveRoom}
          </button>
        </div>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.86rem', fontWeight: 700 }}>
            {t.lobbyCodeJoinLabel}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                maxLength={8}
                placeholder={t.lobbyCodeJoinPlaceholder}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #bfa988',
                  background: '#fff',
                  fontFamily: 'var(--font-stamp)',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                }}
              />
              <button
                className="tactile-btn primary"
                disabled={!roomCodeInput.trim() || guestConnecting}
                onClick={() => onGuestJoinRoom(roomCodeInput)}
              >
                {guestConnecting ? t.lobbyCodeConnecting : t.lobbyCodeJoinBtn}
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setShowManualGuest((v) => !v)}
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
            {showManualGuest ? '▾ ' : '▸ '}
            {t.manualFallbackToggle}
          </button>

          {showManualGuest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      onClick={() => onCopy('guest-answer', guestAnswerCode)}
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
            </div>
          )}
        </>
      )}

      {guestError && (
        <span style={{ color: 'var(--stamp-red)', fontSize: '0.84rem' }}>{guestError}</span>
      )}
    </div>
  );
};
