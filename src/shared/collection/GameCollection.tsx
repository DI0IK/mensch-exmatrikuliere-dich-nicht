import React, { useCallback, useState } from 'react';
import { sound } from '../audio/sound';
import { extractGameFromHash } from '../net/joinLink';
import type { Language } from '../types/game';
import { Button, Card, StampBadge } from '../ui';
import type { GameDefinition } from './types';

const LANGUAGE_STORAGE_KEY = 'boardgame_language';

function loadInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'de';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  return 'de';
}

interface GameCollectionProps {
  games: GameDefinition[];
}

export const GameCollection: React.FC<GameCollectionProps> = ({ games }) => {
  const [language, setLanguage] = useState<Language>(loadInitialLanguage);
  const [muted, setMuted] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
    const fromHash = extractGameFromHash();
    if (fromHash && games.some((g) => g.id === fromHash)) {
      return fromHash;
    }
    return null;
  });

  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next: Language = prev === 'de' ? 'en' : 'de';
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      sound.muted = next;
      return next;
    });
  }, []);

  const handleSelectGame = useCallback((gameId: string) => {
    setActiveGameId(gameId);
    if (typeof window !== 'undefined' && !window.location.hash.includes('room=')) {
      window.history.replaceState(null, '', `#game=${encodeURIComponent(gameId)}`);
    }
  }, []);

  const handleBackToGames = useCallback(() => {
    setActiveGameId(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const activeGame = activeGameId ? games.find((g) => g.id === activeGameId) ?? null : null;

  if (activeGame) {
    const ActiveComponent = activeGame.component;
    return (
      <ActiveComponent
        language={language}
        muted={muted}
        onToggleLanguage={handleToggleLanguage}
        onToggleMute={handleToggleMute}
        onBackToGames={handleBackToGames}
      />
    );
  }

  return (
    <div
      className="app-shell"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '28px',
        paddingBottom: '40px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header Card */}
        <Card
          padding="clamp(18px, 3vw, 28px)"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <StampBadge variant="exmatrikuliert" style={{ fontSize: '0.72rem', marginBottom: '8px' }}>
              DHBW KARLSRUHE · {language === 'de' ? 'SPIELESAMMLUNG' : 'GAME COLLECTION'}
            </StampBadge>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 3.8vw, 2.3rem)',
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {language === 'de' ? 'Akademische Spielesammlung' : 'Academic Board Game Collection'}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-muted)', fontSize: '0.94rem' }}>
              {language === 'de'
                ? 'Wähle ein Spiel aus — lokal, gegen Bots oder online per P2P-Lobby.'
                : 'Choose a game — play locally, against bots, or online via P2P lobby.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              size="sm"
              onClick={handleToggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              style={{ padding: '6px 10px', fontSize: '0.86rem' }}
            >
              {muted ? '🔇' : '🔊'}
            </Button>
            <Button
              size="sm"
              onClick={handleToggleLanguage}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              {language === 'de' ? 'DE / EN' : 'EN / DE'}
            </Button>
          </div>
        </Card>

        {/* Game Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px',
          }}
        >
          {games.map((game) => (
            <Card
              key={game.id}
              padding="22px"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '2rem', lineHeight: 1 }}>{game.icon}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {game.badge && (
                      <StampBadge variant="immatrikuliert" style={{ fontSize: '0.68rem' }}>
                        {game.badge[language]}
                      </StampBadge>
                    )}
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--ink-muted)',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        border: '1px solid #cbbba0',
                        background: '#fbf5e9',
                      }}
                    >
                      {game.minPlayers}–{game.maxPlayers} {language === 'de' ? 'Spieler' : 'Players'}
                    </span>
                  </div>
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.3rem',
                      fontWeight: 800,
                    }}
                  >
                    {game.title[language]}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.86rem', fontWeight: 600, color: 'var(--c-rot)' }}>
                    {game.subtitle[language]}
                  </p>
                </div>

                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.45 }}>
                  {game.description[language]}
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => handleSelectGame(game.id)}
                style={{ width: '100%', padding: '11px 16px' }}
              >
                {language === 'de' ? 'Lobby öffnen →' : 'Open Lobby →'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
