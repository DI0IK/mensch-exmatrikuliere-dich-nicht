import React from 'react';

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
    <div
      className="paper-card"
      style={{
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className="tactile-btn"
          onClick={onOpenConnectionInfo}
          aria-label={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
          title={language === 'de' ? 'Verbindungsdetails' : 'Connection Details'}
          style={{ padding: '5px 9px', fontSize: '0.84rem' }}
        >
          ⓘ
        </button>
        <button
          type="button"
          className="tactile-btn"
          onClick={onToggleMute}
          aria-label={muteTitle}
          title={muteTitle}
          style={{ padding: '5px 9px', fontSize: '0.84rem' }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          className="tactile-btn"
          onClick={onToggleLanguage}
          style={{ padding: '5px 9px', fontSize: '0.78rem' }}
        >
          {language === 'de' ? 'DE' : 'EN'}
        </button>
      </div>

      <button
        type="button"
        className="tactile-btn"
        onClick={onReturnToLobby}
        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
      >
        ← {backLabel ?? defaultBackLabel}
      </button>
    </div>
  );
};
