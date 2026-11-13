import React from 'react';
import type { ActivityType, GameState, Language, PlayerColor } from '../game/types';

interface ActivityModalProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onAcknowledge: () => void;
}

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

const ACTIVITY_META: Record<
  ActivityType,
  {
    icon: string;
    titleDe: string;
    titleEn: string;
    goodDe: string;
    goodEn: string;
    badDe: string;
    badEn: string;
  }
> = {
  mensa: {
    icon: '🍽️',
    titleDe: 'Mensa-Besuch',
    titleEn: 'Cafeteria Stop',
    goodDe: 'Power-Schub! Das Schnitzel war tatsächlich essbar: +3 Felder vor!',
    goodEn: 'Energy boost! The mystery meal worked: +3 steps forward!',
    badDe: 'Mensa-Vergiftung! Magen-Darm zwingt dich, 1 Runde auszusetzen.',
    badEn: 'Food poisoning! You must skip your next turn.',
  },
  bib: {
    icon: '☕',
    titleDe: 'Bib-Nachtschicht',
    titleEn: 'Library All-Nighter',
    goodDe: 'Koffein-Kick! Du bekommst sofort einen Bonus-Wurf!',
    goodEn: 'Caffeine kick! You get an immediate bonus roll!',
    badDe: 'Sekundenschlaf auf der Tastatur: 2 Felder zurück.',
    badEn: 'Microsleep on the keyboard: 2 steps backward.',
  },
  examOffice: {
    icon: '📝',
    titleDe: 'Prüfungsamt (Drittversuch)',
    titleEn: 'Exam Office (3rd Attempt)',
    goodDe: 'Bestanden! Mit Rückenwind 4 Felder nach vorn!',
    goodEn: 'Passed! Surge 4 steps forward!',
    badDe: 'Durchgefallen! 4 Felder zurück Richtung Wohnheim.',
    badEn: 'Failed! Fall back 4 steps.',
  },
  party: {
    icon: '🍺',
    titleDe: 'Fachschafts-Party',
    titleEn: 'Campus Party',
    goodDe: 'Networking-Glück! +2 Felder vor und ein Bonus-Wurf!',
    goodEn: 'Networking luck! +2 steps forward and a bonus roll!',
    badDe: 'Vollabsturz! 3 Felder zurück und nächste Runde aussetzen.',
    badEn: 'Hangover! 3 steps back and skip your next turn.',
  },
  tripleSix: {
    icon: '🎲',
    titleDe: '6-6-6 Dreier-Sechs!',
    titleEn: '6-6-6 Triple Six!',
    goodDe: 'Ehrenpromotion! 50/50 gewonnen — du gewinnst das ganze Spiel sofort!',
    goodEn: 'Summa Cum Laude! Won the 50/50 — you win the entire game immediately!',
    badDe: 'Zwangsexmatrikulation! 50/50 verloren — ALLE deine Figuren fliegen zurück ins Wohnheim!',
    badEn: 'Forced Exmatriculation! Lost the 50/50 — ALL your pawns return to base!',
  },
};

export const ActivityModal: React.FC<ActivityModalProps> = ({
  state,
  language,
  canAct,
  onAcknowledge,
}) => {
  const activity = state.activity;
  if (!activity || state.phase !== 'ACTIVITY_RESULT') {
    return null;
  }

  const player = state.players[activity.playerIndex];
  const meta = ACTIVITY_META[activity.type];
  const isGood = activity.outcome === 'good';
  const title = language === 'de' ? meta.titleDe : meta.titleEn;
  const description = isGood
    ? language === 'de'
      ? meta.goodDe
      : meta.goodEn
    : language === 'de'
      ? meta.badDe
      : meta.badEn;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(35, 29, 23, 0.56)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 55,
      }}
    >
      <div
        className="paper-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{meta.icon}</div>

        <div>
          <div
            className={`stamp-badge ${isGood ? 'stamp-immatrikuliert' : 'stamp-exmatrikuliert'}`}
            style={{ fontSize: '0.78rem', marginBottom: '8px' }}
          >
            {isGood
              ? language === 'de'
                ? 'HARDCORE · GLÜCK GEHABT'
                : 'HARDCORE · LUCKY BREAK'
              : language === 'de'
                ? 'HARDCORE · PECH GEHABT'
                : 'HARDCORE · UNLUCKY'}
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              margin: '4px 0',
              fontSize: '1.45rem',
            }}
          >
            {title}
          </h2>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              color: COLOR_HEX[player.color],
            }}
          >
            {player.emoji ? `${player.emoji} ` : ''}
            {player.name}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(231, 220, 200, 0.45)',
            border: '1.5px solid #c9ba9e',
            fontSize: '0.96rem',
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>

        {activity.pendingDuelOpponentId && (
          <div
            style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--stamp-red)',
            }}
          >
            {language === 'de'
              ? '⚔️ Achtung: Auf dem Zielfeld wartet ein Duell!'
              : '⚔️ Heads up: An opponent awaits a Duel on the destination tile!'}
          </div>
        )}

        {canAct ? (
          <button
            className="tactile-btn primary"
            onClick={onAcknowledge}
            style={{ fontSize: '1rem', padding: '12px' }}
          >
            {language === 'de' ? 'Weiter' : 'Continue'}
          </button>
        ) : (
          <div style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
            {player.seatType === 'bot'
              ? language === 'de'
                ? 'Bot bestätigt…'
                : 'Bot continuing…'
              : language === 'de'
                ? 'Warte auf Spieler…'
                : 'Waiting for player…'}
          </div>
        )}
      </div>
    </div>
  );
};
