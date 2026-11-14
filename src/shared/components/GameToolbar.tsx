import React from 'react';
import { Button, Card } from '../ui';

interface GameToolbarProps {
  language: 'de' | 'en';
  muted: boolean;
  backLabel?: string;
  onOpenConnectionInfo: () => void;
  onToggleMute: () => void;
  onToggleLanguage: () => void;
  onReturnToLobby: () => void;
}

export const GameToolbar: React.FC<GameToolbarProps> = ({
  language,
  muted,
  backLabel,
  onOpenConnectionInfo,
  onToggleMute,
  onToggleLanguage,
  onReturnToLobby,
}) => {
  const defaultBackLabel = language === 'de' ? 'Zurück zur Lobby' : 'Back to Lobby';
  const muteTitle = muted
    ? language === 'de'
      ? 'Ton einschalten'
      : 'Unmute'
    : language === 'de'
      ? 'Ton ausschalten'
      : 'Mute';

  return (
    <Card
      padding="8px 12px"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Button
          size="sm"
          onClick={onOpenConnectionInfo}
          aria-label={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
          title={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
          style={{ padding: '5px 9px', fontSize: '0.84rem' }}
        >
          ⓘ
        </Button>
        <Button
          size="sm"
          onClick={onToggleMute}
          aria-label={muteTitle}
          title={muteTitle}
          style={{ padding: '5px 9px', fontSize: '0.84rem' }}
        >
          {muted ? '🔇' : '🔊'}
        </Button>
        <Button
          size="sm"
          onClick={onToggleLanguage}
          style={{ padding: '5px 9px', fontSize: '0.78rem' }}
        >
          {language === 'de' ? 'DE' : 'EN'}
        </Button>
      </div>

      <Button
        size="sm"
        onClick={onReturnToLobby}
        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
      >
        ← {backLabel ?? defaultBackLabel}
      </Button>
    </Card>
  );
};
