import React, { useEffect, useState } from 'react';
import type { GameLogEntry, GameState, Language } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import type { IceTransportKind } from '../net/lobbyRoom';
import { ConnectionInfoModal } from './ConnectionInfoModal';
import { DieFace } from './DieFace';

interface ActionDockProps {
  state: GameState;
  language: Language;
  canRoll: boolean;
  rolling: boolean;
  muted: boolean;
  isGuest: boolean;
  hostLobbyCode: string | null;
  connectedSeats: number[];
  disconnectedSeats: number[];
  onRoll: () => void;
  onToggleLanguage: () => void;
  onToggleMute: () => void;
  onBackToLobby: () => void;
  onTakeOverAsBot: (seatIndex: number) => void;
  getConnectionTransports?: () => Promise<Record<number, IceTransportKind>>;
}

function formatLogEntry(entry: GameLogEntry, state: GameState, language: Language): string {
  const player = state.players[entry.playerIndex]?.name ?? '?';
  const opp = entry.opponentIndex !== undefined ? state.players[entry.opponentIndex]?.name ?? '?' : '';

  if (language === 'de') {
    switch (entry.type) {
      case 'immatrikulation':
        return `${player}: IMMATRIKULIERT!`;
      case 'exmatrikulation':
        return `${player} exmatrikuliert ${opp} (${entry.detail})!`;
      case 'duel_tie':
        return `Duell-Gleichstand (${entry.detail}) — Nochmal!`;
      case 'goal':
        return `${player} bringt Figur ins Ziel!`;
      case 'win':
        return `${player} hat den Abschluss!`;
      case 'turn':
        return `${player} hatte keinen Zug.`;
      case 'activity_good':
        return `${player}: Hardcore-Glück (${entry.detail})!`;
      case 'activity_bad':
        return `${player}: Hardcore-Pech (${entry.detail})!`;
      case 'turn_skipped':
        return `${player} muss diese Runde aussetzen.`;
      default:
        return `${player}: ${entry.type}`;
    }
  } else {
    switch (entry.type) {
      case 'immatrikulation':
        return `${player}: IMMATRICULATED!`;
      case 'exmatrikulation':
        return `${player} exmatriculated ${opp} (${entry.detail})!`;
      case 'duel_tie':
        return `Duel tie (${entry.detail}) — Re-roll!`;
      case 'goal':
        return `${player} reached the finish!`;
      case 'win':
        return `${player} graduated!`;
      case 'turn':
        return `${player} had no legal move.`;
      case 'activity_good':
        return `${player}: Hardcore lucky break (${entry.detail})!`;
      case 'activity_bad':
        return `${player}: Hardcore unlucky (${entry.detail})!`;
      case 'turn_skipped':
        return `${player} skips this turn.`;
      default:
        return `${player}: ${entry.type}`;
    }
  }
}

export const ActionDock: React.FC<ActionDockProps> = ({
  state,
  language,
  canRoll,
  rolling,
  muted,
  isGuest,
  hostLobbyCode,
  connectedSeats,
  disconnectedSeats,
  onRoll,
  onToggleLanguage,
  onToggleMute,
  onBackToLobby,
  onTakeOverAsBot,
  getConnectionTransports,
}) => {
  const t = TRANSLATIONS[language];
  const [showConnInfo, setShowConnInfo] = useState(false);
  const [seatTransports, setSeatTransports] = useState<Record<number, IceTransportKind>>({});
  const currentPlayer = state.players[state.currentTurn];

  useEffect(() => {
    if (!showConnInfo || !getConnectionTransports) return;
    let cancelled = false;
    getConnectionTransports().then((res) => {
      if (!cancelled) {
        setSeatTransports(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showConnInfo, getConnectionTransports]);
  const showAttempts =
    state.phase === 'WAIT_ROLL' &&
    state.rollAttemptsInBase > 0 &&
    state.pawns
      .filter((p) => p.playerIndex === state.currentTurn)
      .every((p) => p.location.zone === 'base');

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Dice & Roll Card */}
      <div
        className="paper-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', justifyContent: 'center' }}>
          <DieFace value={state.lastRoll} size={68} rolling={rolling} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              className="tactile-btn primary"
              onClick={onRoll}
              disabled={!canRoll || rolling}
              style={{ minWidth: '140px' }}
            >
              {rolling ? t.rolling : t.rollDice}
            </button>
            {showAttempts && (
              <span
                style={{
                  fontFamily: 'var(--font-stamp)',
                  fontSize: '0.78rem',
                  color: 'var(--ink-muted)',
                  textAlign: 'center',
                }}
              >
                {t.attempt} {state.rollAttemptsInBase + 1}/3
              </span>
            )}
            {state.phase === 'SELECT_PAWN' && (
              <span
                style={{
                  fontFamily: 'var(--font-stamp)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--stamp-green)',
                  textAlign: 'center',
                }}
              >
                {currentPlayer.seatType === 'bot' ? t.botThinking : t.selectPawn}
              </span>
            )}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '0.76rem',
            lineHeight: 1.35,
            color: 'var(--ink-muted)',
            textAlign: 'center',
            borderTop: '1px dashed #cbbba0',
            paddingTop: '8px',
            width: '100%',
          }}
        >
          {t.rulesHint}
        </p>
      </div>

      {/* Exam / Event Log */}
      <div
        className="paper-card"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-stamp)',
            fontWeight: 700,
            fontSize: '0.82rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderBottom: '1.5px solid var(--ink)',
            paddingBottom: '4px',
          }}
        >
          {t.eventLogTitle}
        </div>
        <div
          style={{
            maxHeight: '170px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            fontSize: '0.82rem',
          }}
        >
          {state.eventLog.length === 0 ? (
            <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>{t.noEventsYet}</span>
          ) : (
            state.eventLog.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  background:
                    entry.type === 'exmatrikulation'
                      ? 'rgba(183, 43, 34, 0.08)'
                      : entry.type === 'immatrikulation'
                        ? 'rgba(34, 107, 64, 0.08)'
                        : 'transparent',
                  fontFamily:
                    entry.type === 'exmatrikulation' || entry.type === 'immatrikulation'
                      ? 'var(--font-stamp)'
                      : 'var(--font-sans)',
                  fontWeight:
                    entry.type === 'exmatrikulation' || entry.type === 'win' ? 700 : 400,
                  color: entry.type === 'exmatrikulation' ? 'var(--stamp-red)' : 'var(--ink)',
                }}
              >
                {formatLogEntry(entry, state, language)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Disconnected Remote Seats (Host recovery) */}
      {!isGuest && disconnectedSeats.length > 0 && (
        <div
          className="paper-card"
          style={{
            padding: '10px 12px',
            borderColor: 'var(--stamp-red)',
            background: '#fdf2f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {disconnectedSeats.map((seatIdx) => {
            const p = state.players[seatIdx];
            if (!p || !p.active || p.seatType !== 'human-remote') return null;
            return (
              <div
                key={seatIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ color: 'var(--stamp-red)', fontWeight: 700 }}>
                  {t.webrtcDisconnectedBanner} {p.name}
                </span>
                <button
                  className="tactile-btn"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={() => onTakeOverAsBot(seatIdx)}
                >
                  {t.webrtcTakeOverBot}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Utility Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="tactile-btn" onClick={onToggleLanguage} style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem' }}>
          {language === 'de' ? 'DE / EN' : 'EN / DE'}
        </button>
        <button className="tactile-btn" onClick={onToggleMute} style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem' }}>
          {muted ? t.soundOff : t.soundOn}
        </button>
        <button
          type="button"
          className="tactile-btn"
          onClick={() => setShowConnInfo((v) => !v)}
          aria-label={language === 'de' ? 'Verbindungsdetails' : 'Connection details'}
          title={language === 'de' ? 'Verbindungsdetails' : 'Connection details'}
          style={{
            padding: '8px 11px',
            fontSize: '0.82rem',
            lineHeight: 1,
          }}
        >
          ⓘ
        </button>
        <button className="tactile-btn" onClick={onBackToLobby} style={{ width: '100%', padding: '8px 10px', fontSize: '0.84rem' }}>
          {isGuest ? t.webrtcLeaveGame : t.backToLobby}
        </button>
      </div>

      {/* Connection Details Modal */}
      {showConnInfo && (
        <ConnectionInfoModal
          state={state}
          language={language}
          isGuest={isGuest}
          hostLobbyCode={hostLobbyCode}
          connectedSeats={connectedSeats}
          disconnectedSeats={disconnectedSeats}
          seatTransports={seatTransports}
          onClose={() => setShowConnInfo(false)}
        />
      )}
    </aside>
  );
};
