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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '210px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
            📝 {language === 'de' ? 'Spickzettel-Modus (Twist)' : 'Cheat-Sheet Mode (Twist)'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
            {language === 'de'
              ? 'Verdiene Spickzettel für Extra-Würfe, Würfel-Korrektur & Kategorie-Sperren.'
              : 'Earn Cheat-Sheets for extra rolls, die correction & category locks.'}
          </div>
        </div>

        {isGuest ? (
          <StampBadge variant={effective.twistMode ? 'immatrikuliert' : 'neutral'}>
            {effective.twistMode
              ? language === 'de'
                ? 'AKTIV'
                : 'ACTIVE'
              : language === 'de'
                ? 'KLASSISCH'
                : 'CLASSIC'}
          </StampBadge>
        ) : (
          <Button
            role="switch"
            aria-checked={effective.twistMode}
            variant={effective.twistMode ? 'primary' : 'default'}
            size="sm"
            onClick={() => onChangeSettings({ ...effective, twistMode: !effective.twistMode })}
          >
            {effective.twistMode
              ? language === 'de'
                ? 'An (Twist)'
                : 'On (Twist)'
              : language === 'de'
                ? 'Klassisch'
                : 'Classic'}
          </Button>
        )}
      </div>
    </div>
  );
};
