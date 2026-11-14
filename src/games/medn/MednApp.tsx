import { useCallback, useEffect, useState } from 'react';
import type { GameComponentProps } from '../../shared/collection/types';
import { Lobby } from '../../shared/components/Lobby';
import { useGameEngine } from '../../shared/engine/useGameEngine';
import { Dropdown } from '../../shared/ui';
import { ActionDock } from './components/ActionDock';
import { ActivityModal } from './components/ActivityModal';
import { DuelModal } from './components/DuelModal';
import { GameBoard } from './components/GameBoard';
import { GameModeSelector } from './components/lobby/GameModeSelector';
import { TurnBanner } from './components/TurnBanner';
import { WinnerModal } from './components/WinnerModal';
import { MednEngine } from './game/MednEngine';
import { canUseSuperpower, SUPERPOWER_LIST, SUPERPOWER_META } from './game/superpowers';
import type { PlayerConfig, SuperpowerType } from './game/types';
import { TRANSLATIONS } from './i18n/translations';

export function MednApp({
  language,
  muted,
  onToggleLanguage,
  onToggleMute,
  onBackToGames,
}: GameComponentProps) {
  const [rollingAnim, setRollingAnim] = useState(false);
  const [targetingInstantFinish, setTargetingInstantFinish] = useState(false);
  const [targetingKickToDorm, setTargetingKickToDorm] = useState(false);
  const [swapTargeting, setSwapTargeting] = useState<{ active: boolean; ownPawnId: string | null }>({
    active: false,
    ownPawnId: null,
  });

  const { engine, snapshot: game } = useGameEngine(() => new MednEngine());
  const localSeatIndices = engine.getLocalSeatIndices();

  const state = game.gameState;
  const activeTurnSeat = state
    ? state.phase === 'DUEL_ROLL' || state.phase === 'DUEL_RESULT'
      ? state.duel?.attackerPlayerIndex ?? state.currentTurn
      : state.phase === 'ACTIVITY_RESULT'
        ? state.activity?.playerIndex ?? state.currentTurn
        : state.currentTurn
    : -1;

  const canLocalAct = state !== null && localSeatIndices.includes(activeTurnSeat);
  const canRoll = canLocalAct && state?.phase === 'WAIT_ROLL';

  const triggerRoll = useCallback(() => {
    if (!state || !canRoll || rollingAnim) return;
    setRollingAnim(true);
    window.setTimeout(() => {
      setRollingAnim(false);
      engine.dispatchAction({ type: 'ROLL_DICE', playerIndex: state.currentTurn });
    }, 240);
  }, [state, canRoll, rollingAnim, engine]);

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
          pendingAttackerRoll === null && localSeatIndices.includes(attackerPlayerIndex)
            ? attackerPlayerIndex
            : pendingDefenderRoll === null && localSeatIndices.includes(defenderPlayerIndex)
              ? defenderPlayerIndex
              : null;
        if (targetSeat !== null) {
          e.preventDefault();
          engine.dispatchAction({ type: 'DUEL_ROLL', playerIndex: targetSeat });
        }
      } else if (state.phase === 'DUEL_RESULT' && state.duel) {
        const ackSeat = localSeatIndices.includes(state.duel.attackerPlayerIndex)
          ? state.duel.attackerPlayerIndex
          : localSeatIndices.includes(state.duel.defenderPlayerIndex)
            ? state.duel.defenderPlayerIndex
            : null;
        if (ackSeat !== null) {
          e.preventDefault();
          engine.dispatchAction({ type: 'ACK_DUEL', playerIndex: ackSeat });
        }
      } else if (canLocalAct && state.phase === 'ACTIVITY_RESULT') {
        e.preventDefault();
        engine.dispatchAction({ type: 'ACK_ACTIVITY', playerIndex: activeTurnSeat });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, canRoll, canLocalAct, activeTurnSeat, triggerRoll, engine, localSeatIndices]);

  if (!state) {
    const t = TRANSLATIONS[language];
    const ultraHardcoreActive = Boolean(
      game.isGuest ? game.lobbySettings?.ultraHardcore : game.settings.ultraHardcore
    );
    return (
      <Lobby<PlayerConfig>
        gameId="medn"
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
        onChangePlayers={engine.setPlayers}
        onChangeGuestName={engine.setGuestName}
        onChangeGuestMajor={engine.setGuestMajor}
        onChangeGuestEmoji={engine.setGuestEmoji}
        onToggleLanguage={onToggleLanguage}
        onCloseRemoteSeat={engine.closeRemoteSeat}
        onStartGame={engine.startGame}
        onGuestJoinRoom={engine.joinRoomAsGuest}
        onGuestLeave={engine.leaveGuestRoom}
        onBackToGames={onBackToGames}
        titleOverride={t.title}
        subtitleOverride={t.subtitle}
        startLabelOverride={t.startGame}
        customModeSelector={
          <GameModeSelector
            language={language}
            isGuest={game.isGuest}
            settings={game.settings}
            lobbySettings={game.lobbySettings}
            onChangeSettings={engine.setSettings}
          />
        }
        renderSeatExtra={({ player, isGuest: seatIsGuest, isMyGuestSeat, canEditProfile, onUpdate }) => {
          if (!ultraHardcoreActive) return null;
          return (
            <div
              style={{
                paddingLeft: seatIsGuest ? 0 : '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                ⚡ {language === 'de' ? 'Superkraft:' : 'Superpower:'}
              </span>
              {canEditProfile ? (
                <Dropdown
                  value={isMyGuestSeat ? engine.getGuestSuperpower() : (player.superpower ?? 'random')}
                  onChange={(raw) => {
                    if (isMyGuestSeat) {
                      engine.setGuestSuperpower(raw as SuperpowerType | 'random');
                    } else {
                      onUpdate({
                        superpower: raw === 'random' ? undefined : (raw as SuperpowerType),
                      });
                    }
                  }}
                >
                  <option value="random">
                    ❓ {language === 'de' ? 'Zufällig' : 'Random'}
                  </option>
                  {SUPERPOWER_LIST.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.icon} {sp.label[language]}
                    </option>
                  ))}
                </Dropdown>
              ) : (
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {!player.superpower ? (
                    <>❓ {language === 'de' ? 'Zufällig' : 'Random'}</>
                  ) : (
                    <>
                      {SUPERPOWER_META[player.superpower].icon}{' '}
                      {SUPERPOWER_META[player.superpower].label[language]}
                    </>
                  )}
                </span>
              )}
            </div>
          );
        }}
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
        localSeatIndices={localSeatIndices}
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
                engine.dispatchAction({
                  type: 'USE_INSTANT_FINISH',
                  playerIndex: state.currentTurn,
                  pawnId,
                });
                return;
              }
              if (isKickToDormTargeting) {
                setTargetingKickToDorm(false);
                engine.dispatchAction({
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
                engine.dispatchAction({
                  type: 'USE_SWAP',
                  playerIndex: state.currentTurn,
                  ownPawnId,
                  targetPawnId: pawnId,
                });
                return;
              }
              engine.dispatchAction({
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
          seatTransports={game.seatTransports}
          onRoll={triggerRoll}
          onDispatchAction={engine.dispatchAction}
          isInstantFinishTargeting={isInstantFinishTargeting}
          onToggleInstantFinishTargeting={() => setTargetingInstantFinish((prev) => !prev)}
          swapStep={swapStep}
          onToggleSwapTargeting={() =>
            setSwapTargeting((prev) => ({ active: !prev.active, ownPawnId: null }))
          }
          isKickToDormTargeting={isKickToDormTargeting}
          onToggleKickToDormTargeting={() => setTargetingKickToDorm((prev) => !prev)}
          onToggleLanguage={onToggleLanguage}
          onToggleMute={onToggleMute}
          onBackToLobby={engine.returnToLobby}
          onTakeOverAsBot={engine.takeOverSeatAsBot}
        />
      </main>

      <DuelModal
        state={state}
        language={language}
        localSeatIndices={localSeatIndices}
        canAcknowledge={
          state.duel !== null &&
          (localSeatIndices.includes(state.duel.attackerPlayerIndex) ||
            localSeatIndices.includes(state.duel.defenderPlayerIndex))
        }
        onRollDuel={(playerIndex) =>
          engine.dispatchAction({ type: 'DUEL_ROLL', playerIndex })
        }
        onAutoWinDuel={(playerIndex) =>
          engine.dispatchAction({ type: 'USE_AUTO_WIN_DUEL', playerIndex })
        }
        onAcknowledge={() => {
          const ackSeat =
            state.duel && localSeatIndices.includes(state.duel.attackerPlayerIndex)
              ? state.duel.attackerPlayerIndex
              : state.duel?.defenderPlayerIndex ?? activeTurnSeat;
          engine.dispatchAction({ type: 'ACK_DUEL', playerIndex: ackSeat });
        }}
      />

      <ActivityModal
        state={state}
        language={language}
        canAct={canLocalAct}
        onAcknowledge={() =>
          engine.dispatchAction({ type: 'ACK_ACTIVITY', playerIndex: activeTurnSeat })
        }
      />

      <WinnerModal
        state={state}
        language={language}
        onPlayAgain={engine.startGame}
        onBackToLobby={engine.returnToLobby}
      />
    </div>
  );
}
