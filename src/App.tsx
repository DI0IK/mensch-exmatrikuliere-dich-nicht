import { useCallback, useEffect, useState } from 'react';
import { sound } from './audio/sound';
import { ActionDock } from './components/ActionDock';
import { DuelModal } from './components/DuelModal';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { TurnBanner } from './components/TurnBanner';
import { WinnerModal } from './components/WinnerModal';
import type { Language } from './game/types';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';

export function App() {
  const [language, setLanguage] = useState<Language>('de');
  const [muted, setMuted] = useState(false);
  const [rollingAnim, setRollingAnim] = useState(false);

  const game = useMultiplayerGame();

  const handleToggleMute = () => {
    sound.muted = !muted;
    setMuted(!muted);
  };

  const state = game.gameState;
  const activeTurnSeat = state
    ? state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT'
      ? state.duel?.attackerPlayerIndex ?? state.currentTurn
      : state.currentTurn
    : -1;

  const canLocalAct = state !== null && game.localSeatIndices.includes(activeTurnSeat);
  const canRoll = canLocalAct && state?.phase === 'WAIT_ROLL';

  const triggerRoll = useCallback(() => {
    if (!state || !canRoll || rollingAnim) return;
    setRollingAnim(true);
    window.setTimeout(() => {
      setRollingAnim(false);
      game.dispatchAction({ type: 'ROLL_DICE', playerIndex: state.currentTurn });
    }, 240);
  }, [state, canRoll, rollingAnim, game]);

  useEffect(() => {
    if (!state) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (canRoll) {
        e.preventDefault();
        triggerRoll();
      } else if (canLocalAct && state.phase === 'DUEL_ROLL') {
        e.preventDefault();
        game.dispatchAction({ type: 'DUEL_ROLL', playerIndex: activeTurnSeat });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, canRoll, canLocalAct, activeTurnSeat, triggerRoll, game]);

  if (!state) {
    return (
      <Lobby
        language={language}
        players={game.players}
        lobbyRoster={game.lobbyRoster}
        connectedSeats={game.connectedSeats}
        hostLobbyCode={game.hostLobbyCode}
        hostLobbyError={game.hostLobbyError}
        initialRoomCode={game.initialRoomCode}
        isGuest={game.isGuest}
        guestSeat={game.guestSeat}
        guestName={game.guestName}
        guestMajor={game.guestMajor}
        guestEmoji={game.guestEmoji}
        guestConnected={game.guestConnected}
        guestConnecting={game.guestConnecting}
        guestError={game.guestError}
        onChangePlayers={game.updatePlayers}
        onChangeGuestName={game.updateGuestName}
        onChangeGuestMajor={game.updateGuestMajor}
        onChangeGuestEmoji={game.updateGuestEmoji}
        onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
        onCloseRemoteSeat={game.handleCloseRemoteSeat}
        onStartGame={game.handleStartGame}
        onGuestJoinRoom={game.handleGuestJoinRoom}
        onGuestLeave={game.handleGuestLeave}
      />
    );
  }

  return (
    <div className="app-shell">
      <TurnBanner
        state={state}
        language={language}
        localSeatIndices={game.localSeatIndices}
      />

      <main className="game-workspace">
        <div className="board-stage">
          <GameBoard
            state={state}
            language={language}
            canInteract={canLocalAct}
            onSelectPawn={(pawnId) =>
              game.dispatchAction({
                type: 'SELECT_PAWN',
                playerIndex: state.currentTurn,
                pawnId,
              })
            }
          />
        </div>

        <ActionDock
          state={state}
          language={language}
          canRoll={canRoll}
          rolling={rollingAnim}
          muted={muted}
          isGuest={game.isGuest}
          hostLobbyCode={game.hostLobbyCode}
          connectedSeats={game.connectedSeats}
          disconnectedSeats={game.disconnectedSeats}
          onRoll={triggerRoll}
          onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
          onToggleMute={handleToggleMute}
          onBackToLobby={game.handleBackToLobby}
          onTakeOverAsBot={game.handleTakeOverAsBot}
          getConnectionTransports={game.getConnectionTransports}
        />
      </main>

      <DuelModal
        state={state}
        language={language}
        canAct={canLocalAct}
        onRollDuel={() =>
          game.dispatchAction({ type: 'DUEL_ROLL', playerIndex: activeTurnSeat })
        }
        onAcknowledge={() =>
          game.dispatchAction({ type: 'ACK_DUEL', playerIndex: activeTurnSeat })
        }
      />

      <WinnerModal
        state={state}
        language={language}
        onPlayAgain={game.handleStartGame}
        onBackToLobby={game.handleBackToLobby}
      />
    </div>
  );
}

export default App;
