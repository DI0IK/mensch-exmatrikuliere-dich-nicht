import React from 'react';
import { GAME_MODE_OPTIONS, normalizeGameSettings } from '../../game/modes';
import type { GameSettings, Language } from '../../game/types';
import { Button, StampBadge } from '../../../../shared/ui';

interface GameModeSelectorProps {
  language: Language;
  isGuest: boolean;
  settings: GameSettings;
  lobbySettings: GameSettings | null;
  onChangeSettings: (settings: GameSettings) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  language,
  isGuest,
  settings,
  lobbySettings,
  onChangeSettings,
}) => {
  const effectiveSettings = normalizeGameSettings(isGuest ? lobbySettings : settings);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {GAME_MODE_OPTIONS.map((mode) => {
        const active = mode.isActive(effectiveSettings);
        return (
          <div
            key={mode.id}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: `2px solid ${active ? mode.accentColor : '#cbbba0'}`,
              background: active ? mode.activeBg : '#fffdf7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{mode.icon}</span>
                <span>{mode.label[language]}</span>
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--ink-muted)',
                  marginTop: '2px',
                  lineHeight: 1.35,
                }}
              >
                {mode.description[language]}
              </div>
            </div>

            {isGuest ? (
              <StampBadge
                variant={active ? (mode.guestBadgeClass === 'stamp-exmatrikuliert' ? 'exmatrikuliert' : 'immatrikuliert') : 'neutral'}
                style={{ fontSize: '0.74rem' }}
              >
                {active ? mode.activeText[language] : mode.inactiveText[language]}
              </StampBadge>
            ) : (
              <Button
                role="switch"
                aria-checked={active}
                onClick={() => onChangeSettings(mode.toggle(settings))}
                variant={active ? 'primary' : 'default'}
                style={{ padding: '7px 14px', fontSize: '0.84rem', minWidth: '86px' }}
              >
                {active ? mode.activeText[language] : mode.inactiveText[language]}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};
