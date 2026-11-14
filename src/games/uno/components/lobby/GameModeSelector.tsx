import React from 'react';
import type { Language } from '../../../../shared/types/game';
import { Button, StampBadge } from '../../../../shared/ui';
import type { GameSettings } from '../../game/types';

interface GameModeSelectorProps {
  language: Language;
  isGuest: boolean;
  settings: GameSettings;
  lobbySettings: GameSettings | null;
  onChangeSettings: (next: GameSettings) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  language,
  isGuest,
  settings,
  lobbySettings,
  onChangeSettings,
}) => {
  const effective = isGuest && lobbySettings ? lobbySettings : settings;

  const flags = [
    {
      key: 'campusChaos' as const,
      title: language === 'de' ? '🃏 Campus-Chaos-Karten (Twist)' : '🃏 Campus Chaos Cards (Twist)',
      desc:
        language === 'de'
          ? 'Fügt Gruppenarbeit (Handtausch) & Altklausur (Kartenklau) ins Deck hinzu.'
          : 'Adds Group Work (swap hands) & Past Exam (steal card) to the deck.',
    },
    {
      key: 'stackDrawCards' as const,
      title: language === 'de' ? '🔥 +2 / +4 Stapeln' : '🔥 Stack +2 / +4',
      desc:
        language === 'de'
          ? 'Auf +2 oder +4 darf eine weitere Ziehkarte gelegt werden.'
          : 'Allow stacking another draw card onto +2 or +4.',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1.5px solid #cbbba0',
        background: '#fbf5e9',
      }}
    >
      {flags.map((flag) => {
        const active = effective[flag.key];
        return (
          <div
            key={flag.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '210px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{flag.title}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                {flag.desc}
              </div>
            </div>

            {isGuest ? (
              <StampBadge variant={active ? 'immatrikuliert' : 'neutral'}>
                {active ? (language === 'de' ? 'AN' : 'ON') : language === 'de' ? 'AUS' : 'OFF'}
              </StampBadge>
            ) : (
              <Button
                role="switch"
                aria-checked={active}
                variant={active ? 'primary' : 'default'}
                size="sm"
                onClick={() => onChangeSettings({ ...effective, [flag.key]: !active })}
              >
                {active ? (language === 'de' ? 'An' : 'On') : language === 'de' ? 'Aus' : 'Off'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};
