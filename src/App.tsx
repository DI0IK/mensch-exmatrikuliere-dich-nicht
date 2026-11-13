import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from './audio/sound';
import { ActionDock } from './components/ActionDock';
import { DuelModal } from './components/DuelModal';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { TurnBanner } from './components/TurnBanner';
import { WinnerModal } from './components/WinnerModal';
import { chooseBestBotPawn } from './game/bot';
import {
  acknowledgeDuel,
  createInitialState,
  resolveDuelRoll,
  rollDice,
  selectPawn,
} from './game/engine';
import type { GameAction, GameState, Language, PlayerConfig } from './game/types';
import { WebRTCGuestClient, WebRTCHostManager, type NetMessage } from './net/webrtc';

const DEFAULT_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true },
  { color: 'blau', name: 'BWL-Justus', seatType: 'bot', active: true },
  { color: 'gelb', name: 'Info-Klara', seatType: 'bot', active: true },
  { color: 'gruen', name: 'Jura-Leo', seatType: 'bot', active: true },
];

interface RemoteSlotUI {
  offerCode: string;
  answerInput: string;
  connected: boolean;
  creating: boolean;
  error: string | null;
}

function extractJoinHash(): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash;
  if (hash.startsWith('#join=')) {
    return hash.slice('#join='.length);
  }
  return '';
}

export function App() {
  const [language, setLanguage] = useState<Language>('de');
  const [muted, setMuted] = useState(false);
  const [players, setPlayers] = useState<PlayerConfig[]>(DEFAULT_PLAYERS);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [rollingAnim, setRollingAnim] = useState(false);

  // WebRTC Host state
  const [remoteSlots, setRemoteSlots] = useState<Record<number, RemoteSlotUI>>({});
  const [disconnectedSeats, setDisconnectedSeats] = useState<number[]>([]);
  const hostManagerRef = useRef<WebRTCHostManager | null>(null);
  const playersRef = useRef<PlayerConfig[]>(players);
  playersRef.current = players;

  // WebRTC Guest state
  const [initialJoinCode] = useState<string>(() => extractJoinHash());
  const [guestName, setGuestName] = useState('Gast-Studi');
  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;
  const [guestAnswerCode, setGuestAnswerCode] = useState('');
  const [guestConnected, setGuestConnected] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSeat, setGuestSeat] = useState<number | null>(null);
  const [lobbyRoster, setLobbyRoster] = useState<PlayerConfig[] | null>(null);
  const guestClientRef = useRef<WebRTCGuestClient | null>(null);

  const isGuest = guestSeat !== null;

  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  const applyHostAction = useCallback((action: GameAction) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (action.playerIndex !== prev.currentTurn && prev.phase !== 'DUEL_ROLL' && prev.phase !== 'DUEL_RESULT') {
        return prev;
      }
      if (
        (prev.phase === 'DUEL_ROLL' || prev.phase === 'DUEL_RESULT') &&
        prev.duel &&
        action.playerIndex !== prev.duel.attackerPlayerIndex
      ) {
        return prev;
      }

      let next = prev;
      switch (action.type) {
        case 'ROLL_DICE':
          sound.playDiceRoll();
          next = rollDice(prev);
          break;
        case 'SELECT_PAWN':
          sound.playPawnTap();
          next = selectPawn(prev, action.pawnId);
          break;
        case 'DUEL_ROLL':
          sound.playDiceRoll();
          next = resolveDuelRoll(prev);
          if (next.phase === 'DUEL_RESULT') {
            sound.playStampThud();
          }
          break;
        case 'ACK_DUEL':
          sound.playPawnTap();
          next = acknowledgeDuel(prev);
          break;
      }

      if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
        sound.playVictory();
      }

      hostManagerRef.current?.broadcast({ kind: 'STATE_SYNC', state: next });
      return next;
    });
  }, []);

  // Initialize Host Manager lazily
  const ensureHostManager = useCallback(() => {
    if (!hostManagerRef.current) {
      hostManagerRef.current = new WebRTCHostManager(
        (seatIndex, msg: NetMessage) => {
          if (msg.kind === 'PLAYER_ACTION' && msg.action.playerIndex === seatIndex) {
            applyHostAction(msg.action);
          } else if (msg.kind === 'SET_NAME') {
            const cleanName = msg.name.trim().slice(0, 18);
            if (!cleanName) return;
            setPlayers((prev) => {
              const nextPlayers = prev.map((p, i) =>
                i === seatIndex ? { ...p, name: cleanName } : p
              );
              hostManagerRef.current?.broadcast({ kind: 'LOBBY_SYNC', players: nextPlayers });
              return nextPlayers;
            });
            setGameState((prev) => {
              if (!prev) return prev;
              const next: GameState = {
                ...prev,
                players: prev.players.map((p, i) =>
                  i === seatIndex ? { ...p, name: cleanName } : p
                ),
              };
              hostManagerRef.current?.broadcast({ kind: 'STATE_SYNC', state: next });
              return next;
            });
          } else if (msg.kind === 'LEAVE_GAME') {
            hostManagerRef.current?.closeSeat(seatIndex);
            setRemoteSlots((prev) => {
              const next = { ...prev };
              delete next[seatIndex];
              return next;
            });
            setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
            setGameState((prev) => {
              if (!prev) return prev;
              const next: GameState = {
                ...prev,
                players: prev.players.map((p, i) =>
                  i === seatIndex ? { ...p, seatType: 'bot' } : p
                ),
              };
              hostManagerRef.current?.broadcast({ kind: 'STATE_SYNC', state: next });
              return next;
            });
          }
        },
        (seatIndex, connected) => {
          setRemoteSlots((prev) => ({
            ...prev,
            [seatIndex]: {
              ...(prev[seatIndex] ?? {
                offerCode: '',
                answerInput: '',
                creating: false,
                error: null,
              }),
              connected,
            },
          }));
          if (connected) {
            setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
            hostManagerRef.current?.sendToSeat(seatIndex, {
              kind: 'LOBBY_SYNC',
              players: playersRef.current,
            });
            if (gameStateRef.current) {
              hostManagerRef.current?.sendToSeat(seatIndex, {
                kind: 'STATE_SYNC',
                state: gameStateRef.current,
              });
            }
          } else if (gameStateRef.current) {
            setDisconnectedSeats((prev) =>
              prev.includes(seatIndex) ? prev : [...prev, seatIndex]
            );
          }
        }
      );
    }
    return hostManagerRef.current;
  }, [applyHostAction]);

  const handleCreateOffer = async (seatIndex: number) => {
    const mgr = ensureHostManager();
    setRemoteSlots((prev) => ({
      ...prev,
      [seatIndex]: {
        offerCode: '',
        answerInput: '',
        connected: false,
        creating: true,
        error: null,
      },
    }));
    try {
      const offerCode = await mgr.createOfferForSeat(seatIndex);
      setRemoteSlots((prev) => ({
        ...prev,
        [seatIndex]: {
          offerCode,
          answerInput: '',
          connected: false,
          creating: false,
          error: null,
        },
      }));
    } catch (err) {
      setRemoteSlots((prev) => ({
        ...prev,
        [seatIndex]: {
          offerCode: '',
          answerInput: '',
          connected: false,
          creating: false,
          error: err instanceof Error ? err.message : 'WebRTC error',
        },
      }));
    }
  };

  const handleAcceptAnswer = async (seatIndex: number, answerCode: string) => {
    const mgr = ensureHostManager();
    try {
      await mgr.acceptAnswerForSeat(seatIndex, answerCode);
    } catch (err) {
      setRemoteSlots((prev) => ({
        ...prev,
        [seatIndex]: {
          ...(prev[seatIndex] ?? {
            offerCode: '',
            answerInput: '',
            connected: false,
            creating: false,
          }),
          error: err instanceof Error ? err.message : 'Invalid answer code',
        },
      }));
    }
  };

  const handleGuestCreateAnswer = async (offerCode: string) => {
    setGuestError(null);
    try {
      if (!guestClientRef.current) {
        guestClientRef.current = new WebRTCGuestClient(
          (msg: NetMessage) => {
            if (msg.kind === 'STATE_SYNC') {
              setGameState(msg.state);
            } else if (msg.kind === 'LOBBY_SYNC') {
              setLobbyRoster(msg.players);
            } else if (msg.kind === 'RETURN_TO_LOBBY') {
              setGameState(null);
            }
          },
          (connected) => {
            setGuestConnected(connected);
            if (connected) {
              const clean = guestNameRef.current.trim().slice(0, 18);
              if (clean) {
                guestClientRef.current?.send({ kind: 'SET_NAME', name: clean });
              }
            }
          }
        );
      }
      const { answerCode, assignedSeat } =
        await guestClientRef.current.acceptOfferAndCreateAnswer(offerCode);
      setGuestAnswerCode(answerCode);
      setGuestSeat(assignedSeat);
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : 'Failed to parse Offer code');
    }
  };

  const dispatchAction = useCallback(
    (action: GameAction) => {
      if (isGuest) {
        guestClientRef.current?.send({ kind: 'PLAYER_ACTION', action });
      } else {
        applyHostAction(action);
      }
    },
    [isGuest, applyHostAction]
  );

  // Bot automation (Host only)
  useEffect(() => {
    if (isGuest || !gameState || gameState.phase === 'GAME_OVER') return;

    const activePlayerIndex =
      gameState.phase === 'DUEL_ROLL' || gameState.phase === 'DUEL_RESULT'
        ? gameState.duel?.attackerPlayerIndex ?? gameState.currentTurn
        : gameState.currentTurn;

    const activePlayer = gameState.players[activePlayerIndex];
    if (!activePlayer || activePlayer.seatType !== 'bot') return;

    const delayMs =
      gameState.phase === 'DUEL_RESULT'
        ? 2200
        : gameState.phase === 'DUEL_ROLL'
          ? 1250
          : gameState.phase === 'SELECT_PAWN'
            ? 1150
            : 1000;

    const timer = window.setTimeout(() => {
      if (gameState.phase === 'WAIT_ROLL') {
        dispatchAction({ type: 'ROLL_DICE', playerIndex: activePlayerIndex });
      } else if (gameState.phase === 'SELECT_PAWN') {
        const bestPawn = chooseBestBotPawn(gameState);
        if (bestPawn) {
          dispatchAction({ type: 'SELECT_PAWN', playerIndex: activePlayerIndex, pawnId: bestPawn });
        }
      } else if (gameState.phase === 'DUEL_ROLL') {
        dispatchAction({ type: 'DUEL_ROLL', playerIndex: activePlayerIndex });
      } else if (gameState.phase === 'DUEL_RESULT') {
        dispatchAction({ type: 'ACK_DUEL', playerIndex: activePlayerIndex });
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [gameState, isGuest, dispatchAction]);

  // Which seats can this browser control?
  const localSeatIndices = useMemo(() => {
    if (!gameState) return [];
    if (isGuest && guestSeat !== null) return [guestSeat];
    return gameState.players
      .map((p, idx) => (p.active && p.seatType === 'human-local' ? idx : -1))
      .filter((idx) => idx !== -1);
  }, [gameState, isGuest, guestSeat]);

  const handleCloseRemoteSeat = (seatIndex: number) => {
    hostManagerRef.current?.closeSeat(seatIndex);
    setRemoteSlots((prev) => {
      const next = { ...prev };
      delete next[seatIndex];
      return next;
    });
    setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
  };

  const handleGuestLeave = () => {
    if (guestConnected) {
      guestClientRef.current?.send({ kind: 'LEAVE_GAME' });
    }
    guestClientRef.current?.close();
    guestClientRef.current = null;
    setGuestSeat(null);
    setGuestConnected(false);
    setGuestAnswerCode('');
    setGuestError(null);
    setLobbyRoster(null);
    setGameState(null);
  };

  const handleBackToLobby = () => {
    if (isGuest) {
      handleGuestLeave();
    } else {
      hostManagerRef.current?.broadcast({ kind: 'RETURN_TO_LOBBY' });
      setDisconnectedSeats([]);
      setGameState(null);
    }
  };

  const handleTakeOverAsBot = (seatIndex: number) => {
    setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
    setGameState((prev) => {
      if (!prev) return prev;
      const next: GameState = {
        ...prev,
        players: prev.players.map((p, i) =>
          i === seatIndex ? { ...p, seatType: 'bot' } : p
        ),
      };
      hostManagerRef.current?.broadcast({ kind: 'STATE_SYNC', state: next });
      return next;
    });
  };

  const handleStartGame = () => {
    setDisconnectedSeats([]);
    const initial = createInitialState(players);
    setGameState(initial);
    hostManagerRef.current?.broadcast({ kind: 'STATE_SYNC', state: initial });
  };

  const handleToggleMute = () => {
    sound.muted = !muted;
    setMuted(!muted);
  };

  if (!gameState) {
    return (
      <Lobby
        language={language}
        players={players}
        lobbyRoster={lobbyRoster}
        remoteSlots={remoteSlots}
        initialJoinCode={initialJoinCode}
        guestName={guestName}
        guestAnswerCode={guestAnswerCode}
        guestConnected={guestConnected}
        guestError={guestError}
        onChangePlayers={(nextPlayers) => {
          setPlayers(nextPlayers);
          hostManagerRef.current?.broadcast({ kind: 'LOBBY_SYNC', players: nextPlayers });
        }}
        onChangeGuestName={(name) => {
          setGuestName(name);
          if (guestConnected) {
            const clean = name.trim().slice(0, 18);
            if (clean) {
              guestClientRef.current?.send({ kind: 'SET_NAME', name: clean });
            }
          }
        }}
        onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
        onCreateOffer={(idx) => void handleCreateOffer(idx)}
        onAcceptAnswer={(idx, code) => void handleAcceptAnswer(idx, code)}
        onUpdateAnswerInput={(idx, value) =>
          setRemoteSlots((prev) => ({
            ...prev,
            [idx]: {
              ...(prev[idx] ?? {
                offerCode: '',
                connected: false,
                creating: false,
                error: null,
              }),
              answerInput: value,
            },
          }))
        }
        onCloseRemoteSeat={handleCloseRemoteSeat}
        onStartGame={handleStartGame}
        onGuestCreateAnswer={(code) => void handleGuestCreateAnswer(code)}
        onGuestLeave={handleGuestLeave}
      />
    );
  }

  const activeTurnSeat =
    gameState.phase === 'DUEL_ROLL' || gameState.phase === 'DUEL_RESULT'
      ? gameState.duel?.attackerPlayerIndex ?? gameState.currentTurn
      : gameState.currentTurn;

  const canLocalAct = localSeatIndices.includes(activeTurnSeat);
  const canRoll = canLocalAct && gameState.phase === 'WAIT_ROLL';

  const triggerRoll = () => {
    if (!canRoll || rollingAnim) return;
    setRollingAnim(true);
    window.setTimeout(() => {
      setRollingAnim(false);
      dispatchAction({ type: 'ROLL_DICE', playerIndex: gameState.currentTurn });
    }, 240);
  };

  return (
    <div className="app-shell">
      <TurnBanner
        state={gameState}
        language={language}
        localSeatIndices={localSeatIndices}
      />

      <main className="game-workspace">
        <div className="board-stage">
          <GameBoard
            state={gameState}
            language={language}
            canInteract={canLocalAct}
            onSelectPawn={(pawnId) =>
              dispatchAction({
                type: 'SELECT_PAWN',
                playerIndex: gameState.currentTurn,
                pawnId,
              })
            }
          />
        </div>

        <ActionDock
          state={gameState}
          language={language}
          canRoll={canRoll}
          rolling={rollingAnim}
          muted={muted}
          isGuest={isGuest}
          disconnectedSeats={disconnectedSeats}
          onRoll={triggerRoll}
          onToggleLanguage={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
          onToggleMute={handleToggleMute}
          onBackToLobby={handleBackToLobby}
          onTakeOverAsBot={handleTakeOverAsBot}
        />
      </main>

      <DuelModal
        state={gameState}
        language={language}
        canAct={canLocalAct}
        onRollDuel={() =>
          dispatchAction({ type: 'DUEL_ROLL', playerIndex: activeTurnSeat })
        }
        onAcknowledge={() =>
          dispatchAction({ type: 'ACK_DUEL', playerIndex: activeTurnSeat })
        }
      />

      <WinnerModal
        state={gameState}
        language={language}
        onPlayAgain={handleStartGame}
        onBackToLobby={handleBackToLobby}
      />
    </div>
  );
}

export default App;
