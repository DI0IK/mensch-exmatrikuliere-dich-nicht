import React, { useEffect, useRef, useState } from 'react';
import type { Language, PlayerConfig } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { GuestJoinPanel } from './lobby/GuestJoinPanel';
import { HostLobbyPanel } from './lobby/HostLobbyPanel';
import { TurnSettingsPanel } from './lobby/TurnSettingsPanel';
import type { RemoteSlotUI } from './lobby/types';

export type { RemoteSlotUI };

interface LobbyProps {
  language: Language;
  players: PlayerConfig[];
  lobbyRoster: PlayerConfig[] | null;
  remoteSlots: Record<number, RemoteSlotUI>;
  hostLobbyCode: string | null;
  hostLobbyError: string | null;
  initialJoinCode: string;
  initialRoomCode: string;
  guestName: string;
  guestMajor: string;
  guestEmoji: string;
  guestAnswerCode: string;
  guestConnected: boolean;
  guestConnecting: boolean;
  guestError: string | null;
  onChangePlayers: (players: PlayerConfig[]) => void;
  onChangeGuestName: (name: string) => void;
  onChangeGuestMajor: (major: string) => void;
  onChangeGuestEmoji: (emoji: string) => void;
  onToggleLanguage: () => void;
  onCreateOffer: (seatIndex: number) => void;
  onAcceptAnswer: (seatIndex: number, answerCode: string) => void;
  onUpdateAnswerInput: (seatIndex: number, value: string) => void;
  onCloseRemoteSeat: (seatIndex: number) => void;
  onStartGame: () => void;
  onGuestJoinRoom: (roomCode: string) => void;
  onGuestCreateAnswer: (offerCode: string) => void;
  onGuestLeave: () => void;
}


export const Lobby: React.FC<LobbyProps> = ({
  language,
  players,
  lobbyRoster,
  remoteSlots,
  hostLobbyCode,
  hostLobbyError,
  initialJoinCode,
  initialRoomCode,
  guestName,
  guestMajor,
  guestEmoji,
  guestAnswerCode,
  guestConnected,
  guestConnecting,
  guestError,
  onChangePlayers,
  onChangeGuestName,
  onChangeGuestMajor,
  onChangeGuestEmoji,
  onToggleLanguage,
  onCreateOffer,
  onAcceptAnswer,
  onUpdateAnswerInput,
  onCloseRemoteSeat,
  onStartGame,
  onGuestJoinRoom,
  onGuestCreateAnswer,
  onGuestLeave,
}) => {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<'host' | 'join'>(
    initialRoomCode || initialJoinCode ? 'join' : 'host'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const autoJoinedRef = useRef(false);

  // Auto-join via #room=... or #join=...
  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (initialRoomCode) {
      autoJoinedRef.current = true;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      onGuestJoinRoom(initialRoomCode);
    } else if (initialJoinCode) {
      autoJoinedRef.current = true;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      onGuestCreateAnswer(initialJoinCode);
    }
  }, [initialRoomCode, initialJoinCode, onGuestJoinRoom, onGuestCreateAnswer]);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
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

        {/* Mode Switcher */}
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
          <HostLobbyPanel
            language={language}
            players={players}
            remoteSlots={remoteSlots}
            hostLobbyCode={hostLobbyCode}
            hostLobbyError={hostLobbyError}
            copiedKey={copiedKey}
            onCopy={copyText}
            onChangePlayers={onChangePlayers}
            onCreateOffer={onCreateOffer}
            onAcceptAnswer={onAcceptAnswer}
            onUpdateAnswerInput={onUpdateAnswerInput}
            onCloseRemoteSeat={onCloseRemoteSeat}
            onStartGame={onStartGame}
          />
        ) : (
          <GuestJoinPanel
            language={language}
            lobbyRoster={lobbyRoster}
            initialJoinCode={initialJoinCode}
            initialRoomCode={initialRoomCode}
            guestName={guestName}
            guestMajor={guestMajor}
            guestEmoji={guestEmoji}
            guestAnswerCode={guestAnswerCode}
            guestConnected={guestConnected}
            guestConnecting={guestConnecting}
            guestError={guestError}
            copiedKey={copiedKey}
            onCopy={copyText}
            onChangeGuestName={onChangeGuestName}
            onChangeGuestMajor={onChangeGuestMajor}
            onChangeGuestEmoji={onChangeGuestEmoji}
            onGuestJoinRoom={onGuestJoinRoom}
            onGuestCreateAnswer={onGuestCreateAnswer}
            onGuestLeave={onGuestLeave}
          />
        )}

        <TurnSettingsPanel language={language} />
      </div>
    </div>
  );
};
