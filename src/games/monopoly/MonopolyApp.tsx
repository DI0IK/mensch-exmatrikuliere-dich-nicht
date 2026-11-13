import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ConnectionInfoModal } from '../../shared/components/ConnectionInfoModal';
import { sound } from '../../shared/audio/sound';
import { Lobby as SharedLobby } from '../../shared/components/Lobby';
import { ActionDock } from './components/ActionDock';
import { AuctionModal } from './components/AuctionModal';
import { GameBoard } from './components/GameBoard';
import { GameModeSelector } from './components/lobby/GameModeSelector';
import { PropertyManagerModal } from './components/PropertyManagerModal';
import { TileActionModal } from './components/TileActionModal';
import { TileDetailModal } from './components/TileDetailModal';
import { TradeModal } from './components/TradeModal';
import { WinnerModal } from './components/WinnerModal';
import type { Language } from './game/types';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { TRANSLATIONS } from './i18n/translations';

export function App({ gameSwitcher }: { gameSwitcher?: ReactNode } = {}) {
  const [language, setLanguage] = useState<Language>('de');
  const [muted, setMuted] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);

  const mp = useMultiplayerGame();
  const state = mp.gameState;

  const localSeatIndices = useMemo(() => {
    if (!state) return [];
    if (mp.isGuest) {
      return mp.guestSeat !== null ? [mp.guestSeat] : [];
    }
    return state.players
      .filter((p) => p.seatType === 'human-local')
      .map((p) => p.index);
  }, [state, mp.isGuest, mp.guestSeat]);

  const canActCurrentTurn = useMemo(() => {
    if (!state) return false;
    return localSeatIndices.includes(state.currentTurn);
  }, [state, localSeatIndices]);

  // Space keyboard shortcut for rolling dice, acknowledging cards, and ending turn
  useEffect(() => {
    if (!state) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (showProperties || selectedTileIndex !== null || showTrade || showConnectionInfo) return;
      if (!canActCurrentTurn) return;

      if (state.phase === 'WAIT_ROLL') {
        e.preventDefault();
        mp.dispatchAction({ type: 'ROLL_DICE' });
      } else if (state.phase === 'CARD_MODAL') {
        e.preventDefault();
        mp.dispatchAction({ type: 'ACK_CARD' });
      } else if (state.phase === 'TURN_ACTION') {
        e.preventDefault();
        mp.dispatchAction({ type: 'END_TURN' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, canActCurrentTurn, showProperties, selectedTileIndex, showTrade, showConnectionInfo, mp]);

  const toggleLanguage = () => setLanguage((prev) => (prev === 'de' ? 'en' : 'de'));

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      sound.muted = next;
      return next;
    });
  };

  if (!state) {
    const t = TRANSLATIONS[language];
    return (
      <>
        {gameSwitcher}
        <SharedLobby
        gameId="monopoly"
        language={language}
        players={mp.players}
        lobbyRoster={mp.lobbyRoster}
        connectedSeats={mp.connectedSeats}
        hostLobbyCode={mp.hostLobbyCode}
        hostLobbyError={mp.hostLobbyError}
        initialRoomCode={mp.initialRoomCode}
        isGuest={mp.isGuest}
        guestSeat={mp.guestSeat}
        guestName={mp.guestName}
        guestMajor={mp.guestMajor}
        guestEmoji={mp.guestEmoji}
        guestConnected={mp.guestConnected}
        guestConnecting={mp.guestConnecting}
        guestError={mp.guestError}
        onChangePlayers={mp.setPlayers}
        onChangeGuestName={mp.setGuestName}
        onChangeGuestMajor={mp.setGuestMajor}
        onChangeGuestEmoji={mp.setGuestEmoji}
        onToggleLanguage={toggleLanguage}
        onCloseRemoteSeat={mp.closeRemoteSeat}
        onStartGame={mp.startGame}
        onGuestJoinRoom={mp.joinRoomAsGuest}
        onGuestLeave={mp.leaveGuestRoom}
        titleOverride={t.title}
        subtitleOverride={t.subtitle}
        badgeOverride={`DHBW KARLSRUHE · ${language === 'de' ? 'ERZBERGERSTR. 121' : 'NORDSTADT CAMPUS'}`}
        startLabelOverride={t.startGame}
        customModeSelector={
          <GameModeSelector
            language={language}
            isGuest={mp.isGuest}
            settings={mp.settings}
            lobbySettings={mp.lobbySettings}
            onChangeSettings={mp.setSettings}
          />
        }
      />
      </>
    );
  }

  return (
    <div className="app-shell">
      <div className="game-layout">
        <GameBoard
          state={state}
          language={language}
          onSelectTile={(tileIdx) => setSelectedTileIndex(tileIdx)}
        />

        <ActionDock
          state={state}
          language={language}
          canAct={canActCurrentTurn}
          muted={muted}
          onAction={mp.dispatchAction}
          onOpenProperties={() => setShowProperties(true)}
          onOpenTrade={() => setShowTrade(true)}
          onOpenConnectionInfo={() => setShowConnectionInfo(true)}
          onToggleMute={toggleMute}
          onToggleLanguage={toggleLanguage}
          onReturnToLobby={mp.returnToLobby}
        />
      </div>

      <TileActionModal
        state={state}
        language={language}
        canAct={canActCurrentTurn}
        onAction={mp.dispatchAction}
      />

      <AuctionModal
        state={state}
        language={language}
        localSeatIndices={localSeatIndices}
        onAction={mp.dispatchAction}
      />

      {selectedTileIndex !== null && (
        <TileDetailModal
          state={state}
          tileIndex={selectedTileIndex}
          language={language}
          canAct={canActCurrentTurn}
          onAction={mp.dispatchAction}
          onClose={() => setSelectedTileIndex(null)}
        />
      )}

      {showProperties && (
        <PropertyManagerModal
          state={state}
          language={language}
          canAct={canActCurrentTurn}
          onAction={mp.dispatchAction}
          onClose={() => setShowProperties(false)}
        />
      )}

      <TradeModal
        state={state}
        language={language}
        localSeatIndices={localSeatIndices}
        isOpen={showTrade}
        onAction={mp.dispatchAction}
        onClose={() => setShowTrade(false)}
      />

      {showConnectionInfo && (
        <ConnectionInfoModal
          players={state.players}
          language={language}
          isGuest={mp.isGuest}
          hostLobbyCode={mp.hostLobbyCode}
          connectedSeats={mp.connectedSeats}
          disconnectedSeats={mp.disconnectedSeats}
          seatTransports={mp.seatTransports}
          onClose={() => setShowConnectionInfo(false)}
        />
      )}

      <WinnerModal
        state={state}
        language={language}
        onReturnToLobby={mp.returnToLobby}
      />
    </div>
  );
}

export default App;
