import { useState } from 'react';
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

  if (!game.gameState) {
    return (
      <Lobby
        language={language}
        players={game.players}
        lobbyRoster={game.lobbyRoster}
        remoteSlots={game.remoteSlots}
        hostLobbyCode={game.hostLobbyCode}
        hostLobbyError={game.hostLobbyError}
        initialJoinCode={game.initialJoinCode}
        initialRoomCode={game.initialRoomCode}
        guestName={game.guestName}
        guestAnswerCode={game.guestAnswerCode}
        guestConnected={game.guestConnected}
        guestConnecting={game.guestConnecting}
        guestError={game.guestError}
        onChangePlayers={game.updatePlayers}
        onChangeGuestName={game.updateGuestName}
        onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
        onCreateOffer={(idx) => void game.handleCreateOffer(idx)}
        onAcceptAnswer={(idx, code) => void game.handleAcceptAnswer(idx, code)}
        onUpdateAnswerInput={game.updateAnswerInput}
        onCloseRemoteSeat={game.handleCloseRemoteSeat}
        onStartGame={game.handleStartGame}
        onGuestJoinRoom={game.handleGuestJoinRoom}
        onGuestCreateAnswer={(code) => void game.handleGuestCreateAnswer(code)}
        onGuestLeave={game.handleGuestLeave}
      />
    );
  }

  const state = game.gameState;
  const activeTurnSeat =
    state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT'
      ? state.duel?.attackerPlayerIndex ?? state.currentTurn
      : state.currentTurn;

  const canLocalAct = game.localSeatIndices.includes(activeTurnSeat);
  const canRoll = canLocalAct && state.phase === 'WAIT_ROLL';

  const triggerRoll = () => {
    if (!canRoll || rollingAnim) return;
    setRollingAnim(true);
    window.setTimeout(() => {
      setRollingAnim(false);
      game.dispatchAction({ type: 'ROLL_DICE', playerIndex: state.currentTurn });
    }, 240);
  };

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
          disconnectedSeats={game.disconnectedSeats}
          onRoll={triggerRoll}
          onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
          onToggleMute={handleToggleMute}
          onBackToLobby={game.handleBackToLobby}
          onTakeOverAsBot={game.handleTakeOverAsBot}
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
