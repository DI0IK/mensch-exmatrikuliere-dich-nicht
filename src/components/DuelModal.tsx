import React from 'react';
import { canUseSuperpower } from '../game/superpowers';
import type { GameState, Language, PlayerColor } from '../game/types';
import { TRANSLATIONS } from '../i18n/translations';
import { DieFace } from './DieFace';

interface DuelModalProps {
  state: GameState;
  language: Language;
  localSeatIndices: number[];
  canAcknowledge: boolean;
  onRollDuel: (playerIndex: number) => void;
  onAutoWinDuel: (playerIndex: number) => void;
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
  localSeatIndices,
  canAcknowledge,
  onRollDuel,
  onAutoWinDuel,
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

  const showTieDice =
    state.phase === 'DUEL_ROLL' &&
    isTie &&
    duel.pendingAttackerRoll === null &&
    duel.pendingDefenderRoll === null;

  const displayedAttackerRoll =
    state.phase === 'DUEL_RESULT'
      ? latestRound?.attackerRoll ?? null
      : duel.pendingAttackerRoll !== null
        ? duel.pendingAttackerRoll
        : showTieDice
          ? latestRound?.attackerRoll ?? null
          : null;

  const displayedDefenderRoll =
    state.phase === 'DUEL_RESULT'
      ? latestRound?.defenderRoll ?? null
      : duel.pendingDefenderRoll !== null
        ? duel.pendingDefenderRoll
        : showTieDice
          ? latestRound?.defenderRoll ?? null
          : null;

  const canRollAttacker =
    state.phase === 'DUEL_ROLL' &&
    duel.pendingAttackerRoll === null &&
    localSeatIndices.includes(duel.attackerPlayerIndex);

  const canRollDefender =
    state.phase === 'DUEL_ROLL' &&
    duel.pendingDefenderRoll === null &&
    localSeatIndices.includes(duel.defenderPlayerIndex);

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
              value={displayedAttackerRoll}
              size={60}
              accentColor={COLOR_HEX[attacker.color]}
            />
            {state.phase === 'DUEL_ROLL' && (
              duel.pendingAttackerRoll !== null ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--stamp-green)' }}>
                  ✓ {language === 'de' ? 'Gewürfelt' : 'Rolled'}
                </span>
              ) : canRollAttacker ? (
                <button
                  type="button"
                  className="tactile-btn primary"
                  style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                  onClick={() => onRollDuel(duel.attackerPlayerIndex)}
                >
                  {language === 'de' ? 'Würfeln!' : 'Roll!'}
                </button>
              ) : (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  {attacker.seatType === 'bot'
                    ? language === 'de'
                      ? 'Bot würfelt…'
                      : 'Bot rolling…'
                    : language === 'de'
                      ? 'Wartet…'
                      : 'Waiting…'}
                </span>
              )
            )}
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
              value={displayedDefenderRoll}
              size={60}
              accentColor={COLOR_HEX[defender.color]}
            />
            {state.phase === 'DUEL_ROLL' && (
              duel.pendingDefenderRoll !== null ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--stamp-green)' }}>
                  ✓ {language === 'de' ? 'Gewürfelt' : 'Rolled'}
                </span>
              ) : canRollDefender ? (
                <button
                  type="button"
                  className="tactile-btn primary"
                  style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                  onClick={() => onRollDuel(duel.defenderPlayerIndex)}
                >
                  {language === 'de' ? 'Würfeln!' : 'Roll!'}
                </button>
              ) : (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  {defender.seatType === 'bot'
                    ? language === 'de'
                      ? 'Bot würfelt…'
                      : 'Bot rolling…'
                    : language === 'de'
                      ? 'Wartet…'
                      : 'Waiting…'}
                </span>
              )
            )}
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
            {state.settings.duelMode === 'push' ? (
              <>
                <div className="stamp-badge stamp-immatrikuliert animate-stamp" style={{ fontSize: '1.05rem' }}>
                  {duel.winner === 'attacker' ? attacker.name : defender.name}{' '}
                  {language === 'de' ? 'GEWINNT!' : 'WINS!'}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4 }}>
                  {duel.winner === 'attacker' ? attacker.name : defender.name}:{' '}
                  +{duel.winnerMoved ?? duel.loserSum ?? 0}{' '}
                  {language === 'de' ? 'vor' : 'forward'} ·{' '}
                  {duel.winner === 'attacker' ? defender.name : attacker.name}:{' '}
                  -{duel.loserMoved ?? duel.winnerSum ?? 0}{' '}
                  {language === 'de' ? 'zurück' : 'back'}
                </div>
                {(state.queuedEvents?.length ?? 0) > 0 && (
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--stamp-red)' }}>
                    {language === 'de'
                      ? '⚡ Folge-Ereignis ausgelöst!'
                      : '⚡ Follow-up event triggered!'}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="stamp-badge stamp-exmatrikuliert animate-stamp" style={{ fontSize: '1.05rem' }}>
                  {t.stampExmatriculated}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                  {duel.winner === 'attacker'
                    ? `${defender.name} → ${language === 'de' ? 'zurück ins Wohnheim!' : 'back to dorm!'}`
                    : `${attacker.name} → ${language === 'de' ? 'zurück ins Wohnheim!' : 'back to dorm!'}`}
                </div>
              </>
            )}
          </div>
        )}

        {state.phase === 'DUEL_ROLL' &&
          [duel.attackerPlayerIndex, duel.defenderPlayerIndex]
            .filter(
              (seatIdx) =>
                localSeatIndices.includes(seatIdx) &&
                canUseSuperpower(state, seatIdx, 'autoWinDuel')
            )
            .map((seatIdx) => (
              <button
                key={`autowin-${seatIdx}`}
                type="button"
                className="tactile-btn"
                style={{
                  background: '#fff3cd',
                  borderColor: '#c99a2e',
                  color: '#7a5400',
                  fontSize: '0.86rem',
                }}
                onClick={() => onAutoWinDuel(seatIdx)}
              >
                👑{' '}
                {language === 'de'
                  ? `Superkraft (${state.players[seatIdx]?.name}): Duell sofort gewinnen!`
                  : `Superpower (${state.players[seatIdx]?.name}): Win duel immediately!`}
              </button>
            ))}

        {state.phase === 'DUEL_RESULT' && (
          <button className="tactile-btn primary" onClick={onAcknowledge} disabled={!canAcknowledge}>
            {t.duelContinueBtn}
          </button>
        )}
      </div>
    </div>
  );
};
