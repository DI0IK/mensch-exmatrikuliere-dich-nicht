import React from 'react';
import type { GameState, Language, PlayerColor } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { DieFace } from './DieFace';

interface DuelModalProps {
  state: GameState;
  language: Language;
  canAct: boolean;
  onRollDuel: () => void;
  onAcknowledge: () => void;
}

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

export const DuelModal: React.FC<DuelModalProps> = ({
  state,
  language,
  canAct,
  onRollDuel,
  onAcknowledge,
}) => {
  const duel = state.duel;
  if (!duel || (state.phase !== 'DUEL_ROLL' && state.phase !== 'DUEL_RESULT')) {
    return null;
  }

  const t = TRANSLATIONS[language];
  const attacker = state.players[duel.attackerPlayerIndex];
  const defender = state.players[duel.defenderPlayerIndex];
  const latestRound = duel.rounds[duel.rounds.length - 1] ?? null;
  const isTie = latestRound !== null && latestRound.attackerRoll === latestRound.defenderRoll;

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
        zIndex: 50,
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
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            fontWeight: 800,
          }}
        >
          {t.duelTitle}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
          }}
        >
          {/* Attacker */}
          <div
            style={{
              padding: '12px 8px',
              borderRadius: '10px',
              border: `2px solid ${COLOR_HEX[attacker.color]}`,
              background: '#fffdf7',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-stamp)', color: 'var(--ink-muted)' }}>
              {t.attacker}
            </span>
            <strong style={{ color: COLOR_HEX[attacker.color] }}>{attacker.name}</strong>
            <DieFace
              value={latestRound ? latestRound.attackerRoll : null}
              size={60}
              accentColor={COLOR_HEX[attacker.color]}
            />
          </div>

          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem' }}>
            VS
          </span>

          {/* Defender */}
          <div
            style={{
              padding: '12px 8px',
              borderRadius: '10px',
              border: `2px solid ${COLOR_HEX[defender.color]}`,
              background: '#fffdf7',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-stamp)', color: 'var(--ink-muted)' }}>
              {t.defender}
            </span>
            <strong style={{ color: COLOR_HEX[defender.color] }}>{defender.name}</strong>
            <DieFace
              value={latestRound ? latestRound.defenderRoll : null}
              size={60}
              accentColor={COLOR_HEX[defender.color]}
            />
          </div>
        </div>

        {isTie && state.phase === 'DUEL_ROLL' && (
          <div
            style={{
              fontFamily: 'var(--font-stamp)',
              fontWeight: 700,
              color: 'var(--stamp-red)',
              fontSize: '0.92rem',
            }}
          >
            {t.duelTie}
          </div>
        )}

        {state.phase === 'DUEL_RESULT' && duel.winner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div className="stamp-badge stamp-exmatrikuliert animate-stamp" style={{ fontSize: '1.05rem' }}>
              {t.stampExmatriculated}
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
              {duel.winner === 'attacker'
                ? `${defender.name} → ${language === 'de' ? 'zurück ins Wohnheim!' : 'back to dorm!'}`
                : `${attacker.name} → ${language === 'de' ? 'zurück ins Wohnheim!' : 'back to dorm!'}`}
            </div>
          </div>
        )}

        {state.phase === 'DUEL_ROLL' ? (
          <button className="tactile-btn primary" onClick={onRollDuel} disabled={!canAct}>
            {t.duelRollBtn}
          </button>
        ) : (
          <button className="tactile-btn primary" onClick={onAcknowledge} disabled={!canAct}>
            {t.duelContinueBtn}
          </button>
        )}
      </div>
    </div>
  );
};
