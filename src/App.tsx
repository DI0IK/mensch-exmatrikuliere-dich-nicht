import { useCallback, useEffect, useState } from 'react';
import { sound } from './audio/sound';
import { ActionDock } from './components/ActionDock';
import { ActivityModal } from './components/ActivityModal';
import { DuelModal } from './components/DuelModal';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { TurnBanner } from './components/TurnBanner';
import { WinnerModal } from './components/WinnerModal';
import { canUseSuperpower } from './game/superpowers';
import type { Language } from './game/types';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';

export function App() {
  const [language, setLanguage] = useState<Language>('de');
  const [muted, setMuted] = useState(false);
  const [rollingAnim, setRollingAnim] = useState(false);
  const [targetingInstantFinish, setTargetingInstantFinish] = useState(false);
  const [targetingKickToDorm, setTargetingKickToDorm] = useState(false);
  const [swapTargeting, setSwapTargeting] = useState<{ active: boolean; ownPawnId: string | null }>({
    active: false,
    ownPawnId: null,
  });

  const game = useMultiplayerGame();

  const handleToggleMute = () => {
    sound.muted = !muted;
    setMuted(!muted);
  };

  const state = game.gameState;
  const activeTurnSeat = state
    ? state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT'
      ? state.duel?.attackerPlayerIndex ?? state.currentTurn
      : state.phase === 'ACTIVITY_RESULT'
        ? state.activity?.playerIndex ?? state.currentTurn
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
      } else if (state.phase === 'DUEL_ROLL' && state.duel) {
        const { attackerPlayerIndex, defenderPlayerIndex, pendingAttackerRoll, pendingDefenderRoll } =
          state.duel;
        const targetSeat =
          pendingAttackerRoll === null && game.localSeatIndices.includes(attackerPlayerIndex)
            ? attackerPlayerIndex
            : pendingDefenderRoll === null && game.localSeatIndices.includes(defenderPlayerIndex)
              ? defenderPlayerIndex
              : null;
        if (targetSeat !== null) {
          e.preventDefault();
          game.dispatchAction({ type: 'DUEL_ROLL', playerIndex: targetSeat });
        }
      } else if (state.phase === 'DUEL_RESULT' && state.duel) {
        const ackSeat = game.localSeatIndices.includes(state.duel.attackerPlayerIndex)
          ? state.duel.attackerPlayerIndex
          : game.localSeatIndices.includes(state.duel.defenderPlayerIndex)
            ? state.duel.defenderPlayerIndex
            : null;
        if (ackSeat !== null) {
          e.preventDefault();
          game.dispatchAction({ type: 'ACK_DUEL', playerIndex: ackSeat });
        }
      } else if (canLocalAct && state.phase === 'ACTIVITY_RESULT') {
        e.preventDefault();
        game.dispatchAction({ type: 'ACK_ACTIVITY', playerIndex: activeTurnSeat });
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
        settings={game.settings}
        lobbySettings={game.lobbySettings}
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
        guestSuperpower={game.guestSuperpower}
        guestConnected={game.guestConnected}
        guestConnecting={game.guestConnecting}
        guestError={game.guestError}
        onChangePlayers={game.updatePlayers}
        onChangeSettings={game.updateSettings}
        onChangeGuestName={game.updateGuestName}
        onChangeGuestMajor={game.updateGuestMajor}
        onChangeGuestEmoji={game.updateGuestEmoji}
        onChangeGuestSuperpower={game.updateGuestSuperpower}
        onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
        onCloseRemoteSeat={game.handleCloseRemoteSeat}
        onStartGame={game.handleStartGame}
        onGuestJoinRoom={game.handleGuestJoinRoom}
        onGuestLeave={game.handleGuestLeave}
      />
    );
  }

  const isInstantFinishTargeting =
    targetingInstantFinish &&
    state !== null &&
    canRoll &&
    state.phase === 'WAIT_ROLL' &&
    canUseSuperpower(state, state.currentTurn, 'instantFinish');

  const isSwapTargeting =
    swapTargeting.active &&
    state !== null &&
    canRoll &&
    state.phase === 'WAIT_ROLL' &&
    canUseSuperpower(state, state.currentTurn, 'swap');

  const isKickToDormTargeting =
    targetingKickToDorm &&
    state !== null &&
    canRoll &&
    state.phase === 'WAIT_ROLL' &&
    canUseSuperpower(state, state.currentTurn, 'kickToDorm');

  const swapStep: 'own' | 'target' | null = isSwapTargeting
    ? swapTargeting.ownPawnId
      ? 'target'
      : 'own'
    : null;

  const overrideSelectablePawnIds =
    state && isInstantFinishTargeting
      ? state.pawns
          .filter((p) => p.playerIndex === state.currentTurn && p.location.zone !== 'goal')
          .map((p) => p.id)
      : state && isKickToDormTargeting
        ? state.pawns
            .filter((p) => p.playerIndex !== state.currentTurn && p.location.zone === 'track')
            .map((p) => p.id)
        : state && swapStep === 'own'
          ? state.pawns
              .filter((p) => p.playerIndex === state.currentTurn && p.location.zone === 'track')
              .map((p) => p.id)
          : state && swapStep === 'target'
            ? state.pawns
                .filter((p) => p.playerIndex !== state.currentTurn && p.location.zone === 'track')
                .map((p) => p.id)
            : undefined;

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
            overrideSelectablePawnIds={overrideSelectablePawnIds}
            onSelectPawn={(pawnId) => {
              if (isInstantFinishTargeting) {
                setTargetingInstantFinish(false);
                game.dispatchAction({
                  type: 'USE_INSTANT_FINISH',
                  playerIndex: state.currentTurn,
                  pawnId,
                });
                return;
              }
              if (isKickToDormTargeting) {
                setTargetingKickToDorm(false);
                game.dispatchAction({
                  type: 'USE_KICK_TO_DORM',
                  playerIndex: state.currentTurn,
                  targetPawnId: pawnId,
                });
                return;
              }
              if (swapStep === 'own') {
                setSwapTargeting({ active: true, ownPawnId: pawnId });
                return;
              }
              if (swapStep === 'target' && swapTargeting.ownPawnId) {
                const ownPawnId = swapTargeting.ownPawnId;
                setSwapTargeting({ active: false, ownPawnId: null });
                game.dispatchAction({
                  type: 'USE_SWAP',
                  playerIndex: state.currentTurn,
                  ownPawnId,
                  targetPawnId: pawnId,
                });
                return;
              }
              game.dispatchAction({
                type: 'SELECT_PAWN',
                playerIndex: state.currentTurn,
                pawnId,
              });
            }}
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
          onDispatchAction={game.dispatchAction}
          isInstantFinishTargeting={isInstantFinishTargeting}
          onToggleInstantFinishTargeting={() => setTargetingInstantFinish((prev) => !prev)}
          swapStep={swapStep}
          onToggleSwapTargeting={() =>
            setSwapTargeting((prev) => ({ active: !prev.active, ownPawnId: null }))
          }
          isKickToDormTargeting={isKickToDormTargeting}
          onToggleKickToDormTargeting={() => setTargetingKickToDorm((prev) => !prev)}
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
        localSeatIndices={game.localSeatIndices}
        canAcknowledge={
          state.duel !== null &&
          (game.localSeatIndices.includes(state.duel.attackerPlayerIndex) ||
            game.localSeatIndices.includes(state.duel.defenderPlayerIndex))
        }
        onRollDuel={(playerIndex) =>
          game.dispatchAction({ type: 'DUEL_ROLL', playerIndex })
        }
        onAutoWinDuel={(playerIndex) =>
          game.dispatchAction({ type: 'USE_AUTO_WIN_DUEL', playerIndex })
        }
        onAcknowledge={() => {
          const ackSeat =
            state.duel && game.localSeatIndices.includes(state.duel.attackerPlayerIndex)
              ? state.duel.attackerPlayerIndex
              : state.duel?.defenderPlayerIndex ?? activeTurnSeat;
          game.dispatchAction({ type: 'ACK_DUEL', playerIndex: ackSeat });
        }}
      />

      <ActivityModal
        state={state}
        language={language}
        canAct={canLocalAct}
        onAcknowledge={() =>
          game.dispatchAction({ type: 'ACK_ACTIVITY', playerIndex: activeTurnSeat })
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
