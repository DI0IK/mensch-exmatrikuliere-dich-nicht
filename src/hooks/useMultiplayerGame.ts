import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { DEFAULT_NAMES, type RemoteSlotUI } from '../components/lobby/types';
import { chooseBestBotPawn } from '../game/bot';
import {
  acknowledgeDuel,
  createInitialState,
  resolveDuelRoll,
  rollDice,
  selectPawn,
} from '../game/engine';
import type { GameAction, GameState, PlayerConfig } from '../game/types';
import { LobbyGuestRoom, LobbyHostRoom } from '../net/lobbyRoom';
import { WebRTCGuestClient, WebRTCHostManager, type NetMessage } from '../net/webrtc';

const DEFAULT_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true },
  { color: 'blau', name: 'BWL-Justus', seatType: 'bot', active: true },
  { color: 'gelb', name: 'Info-Klara', seatType: 'bot', active: true },
  { color: 'gruen', name: 'Jura-Leo', seatType: 'bot', active: true },
];

function extractHashParam(prefix: string): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash;
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : '';
}

export function useMultiplayerGame() {
  const [players, setPlayers] = useState<PlayerConfig[]>(DEFAULT_PLAYERS);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // WebRTC Host state
  const [remoteSlots, setRemoteSlots] = useState<Record<number, RemoteSlotUI>>({});
  const [disconnectedSeats, setDisconnectedSeats] = useState<number[]>([]);
  const [hostLobbyCode, setHostLobbyCode] = useState<string | null>(null);
  const [hostLobbyError, setHostLobbyError] = useState<string | null>(null);
  const hostManagerRef = useRef<WebRTCHostManager | null>(null);
  const lobbyHostRef = useRef<LobbyHostRoom | null>(null);
  const playersRef = useRef<PlayerConfig[]>(players);
  playersRef.current = players;

  // WebRTC Guest state
  const [initialJoinCode] = useState<string>(() => extractHashParam('#join='));
  const [initialRoomCode] = useState<string>(() => extractHashParam('#room='));
  const [guestName, setGuestName] = useState('Gast-Studi');
  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;
  const [guestAnswerCode, setGuestAnswerCode] = useState('');
  const [guestConnected, setGuestConnected] = useState(false);
  const [guestConnecting, setGuestConnecting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSeat, setGuestSeat] = useState<number | null>(null);
  const [lobbyRoster, setLobbyRoster] = useState<PlayerConfig[] | null>(null);
  const guestClientRef = useRef<WebRTCGuestClient | null>(null);
  const lobbyGuestRef = useRef<LobbyGuestRoom | null>(null);

  const isGuest = guestSeat !== null;
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  const broadcastAll = useCallback((msg: NetMessage) => {
    hostManagerRef.current?.broadcast(msg);
    lobbyHostRef.current?.broadcast(msg);
  }, []);

  const applyHostAction = useCallback(
    (action: GameAction) => {
      setGameState((prev) => {
        if (!prev) return prev;
        if (
          action.playerIndex !== prev.currentTurn &&
          prev.phase !== 'DUEL_ROLL' &&
          prev.phase !== 'DUEL_RESULT'
        ) {
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

        broadcastAll({ kind: 'STATE_SYNC', state: next });
        return next;
      });
    },
    [broadcastAll]
  );

  const handleHostMessage = useCallback(
    (seatIndex: number, msg: NetMessage) => {
      if (msg.kind === 'PLAYER_ACTION' && msg.action.playerIndex === seatIndex) {
        applyHostAction(msg.action);
      } else if (msg.kind === 'SET_NAME') {
        const cleanName = msg.name.trim().slice(0, 18);
        if (!cleanName) return;
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex ? { ...p, name: cleanName } : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers });
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
          broadcastAll({ kind: 'STATE_SYNC', state: next });
          return next;
        });
      } else if (msg.kind === 'LEAVE_GAME') {
        hostManagerRef.current?.closeSeat(seatIndex);
        lobbyHostRef.current?.closeSeat(seatIndex);
        setRemoteSlots((prev) => {
          const next = { ...prev };
          delete next[seatIndex];
          return next;
        });
        setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex
              ? { ...p, seatType: 'bot' as const, name: DEFAULT_NAMES.bot[i] ?? p.name }
              : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers });
          return nextPlayers;
        });
        setGameState((prev) => {
          if (!prev) return prev;
          const next: GameState = {
            ...prev,
            players: prev.players.map((p, i) =>
              i === seatIndex ? { ...p, seatType: 'bot' } : p
            ),
          };
          broadcastAll({ kind: 'STATE_SYNC', state: next });
          return next;
        });
      }
    },
    [applyHostAction, broadcastAll]
  );

  const handleHostStatusChange = useCallback(
    (seatIndex: number, connected: boolean) => {
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
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex ? { ...p, seatType: 'human-remote' as const } : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers });
          return nextPlayers;
        });
        if (gameStateRef.current) {
          setGameState((prev) => {
            if (!prev) return prev;
            const next: GameState = {
              ...prev,
              players: prev.players.map((p, i) =>
                i === seatIndex ? { ...p, seatType: 'human-remote' } : p
              ),
            };
            broadcastAll({ kind: 'STATE_SYNC', state: next });
            return next;
          });
        }
      } else {
        setPlayers((prev) => {
          const seat = prev[seatIndex];
          if (!seat || seat.seatType !== 'human-remote') return prev;
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex
              ? { ...p, seatType: 'bot' as const, name: DEFAULT_NAMES.bot[i] ?? p.name }
              : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers });
          return nextPlayers;
        });
        if (gameStateRef.current) {
          setDisconnectedSeats((prev) =>
            prev.includes(seatIndex) ? prev : [...prev, seatIndex]
          );
        }
      }
    },
    [broadcastAll]
  );

  // Auto-manage LobbyHostRoom whenever any non-local seat (Bot or P2P) exists so Lobby Code is always ready
  const hasJoinableSeats = players.some(
    (p, idx) => idx > 0 && p.active && p.seatType !== 'human-local'
  );
  useEffect(() => {
    if (isGuest || !hasJoinableSeats) {
      if (lobbyHostRef.current) {
        lobbyHostRef.current.closeAll();
        lobbyHostRef.current = null;
        setHostLobbyCode(null);
        setHostLobbyError(null);
      }
      return;
    }

    if (!lobbyHostRef.current) {
      setHostLobbyError(null);
      const room = new LobbyHostRoom({
        getOpenRemoteSeats: () => {
          const explicitRemote = playersRef.current
            .map((p, idx) => (idx > 0 && p.active && p.seatType === 'human-remote' ? idx : -1))
            .filter((idx) => idx !== -1);
          const botSeats = playersRef.current
            .map((p, idx) => (idx > 0 && p.active && p.seatType === 'bot' ? idx : -1))
            .filter((idx) => idx !== -1);
          return [...explicitRemote, ...botSeats];
        },
        onMessage: handleHostMessage,
        onStatusChange: handleHostStatusChange,
        onRoomReady: (code) => setHostLobbyCode(code),
        onRoomError: (err) => setHostLobbyError(err),
      });
      lobbyHostRef.current = room;
      room.start();
    }
  }, [isGuest, hasJoinableSeats, handleHostMessage, handleHostStatusChange]);

  const ensureHostManager = useCallback(() => {
    if (!hostManagerRef.current) {
      hostManagerRef.current = new WebRTCHostManager(
        handleHostMessage,
        handleHostStatusChange
      );
    }
    return hostManagerRef.current;
  }, [handleHostMessage, handleHostStatusChange]);

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

  const handleGuestCreateAnswer = useCallback(async (offerCode: string) => {
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
  }, []);

  const handleGuestJoinRoom = useCallback((roomCode: string) => {
    setGuestError(null);
    setGuestConnecting(true);
    lobbyGuestRef.current?.close();
    const client = new LobbyGuestRoom({
      onMessage: (msg: NetMessage) => {
        if (msg.kind === 'WELCOME') {
          setGuestSeat(msg.assignedSeat);
          if (msg.state) setGameState(msg.state);
          const clean = guestNameRef.current.trim().slice(0, 18);
          if (clean) {
            client.send({ kind: 'SET_NAME', name: clean });
          }
        } else if (msg.kind === 'STATE_SYNC') {
          setGameState(msg.state);
        } else if (msg.kind === 'LOBBY_SYNC') {
          setLobbyRoster(msg.players);
        } else if (msg.kind === 'RETURN_TO_LOBBY') {
          setGameState(null);
        } else if (msg.kind === 'ROOM_ERROR') {
          setGuestError(msg.message);
          setGuestConnecting(false);
        }
      },
      onStatusChange: (connected) => {
        setGuestConnected(connected);
        setGuestConnecting(false);
      },
      onError: (err) => {
        setGuestError(err);
        setGuestConnecting(false);
      },
    });
    lobbyGuestRef.current = client;
    client.join(roomCode);
  }, []);

  const dispatchAction = useCallback(
    (action: GameAction) => {
      if (isGuest) {
        guestClientRef.current?.send({ kind: 'PLAYER_ACTION', action });
        lobbyGuestRef.current?.send({ kind: 'PLAYER_ACTION', action });
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

  const localSeatIndices = useMemo(() => {
    if (!gameState) return [];
    if (isGuest && guestSeat !== null) return [guestSeat];
    return gameState.players
      .map((p, idx) => (p.active && p.seatType === 'human-local' ? idx : -1))
      .filter((idx) => idx !== -1);
  }, [gameState, isGuest, guestSeat]);

  const handleCloseRemoteSeat = (seatIndex: number) => {
    hostManagerRef.current?.closeSeat(seatIndex);
    lobbyHostRef.current?.closeSeat(seatIndex);
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
      lobbyGuestRef.current?.send({ kind: 'LEAVE_GAME' });
    }
    guestClientRef.current?.close();
    guestClientRef.current = null;
    lobbyGuestRef.current?.close();
    lobbyGuestRef.current = null;
    setGuestSeat(null);
    setGuestConnected(false);
    setGuestConnecting(false);
    setGuestAnswerCode('');
    setGuestError(null);
    setLobbyRoster(null);
    setGameState(null);
  };

  const handleBackToLobby = () => {
    if (isGuest) {
      handleGuestLeave();
    } else {
      broadcastAll({ kind: 'RETURN_TO_LOBBY' });
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
      broadcastAll({ kind: 'STATE_SYNC', state: next });
      return next;
    });
  };

  const handleStartGame = () => {
    setDisconnectedSeats([]);
    // Any P2P seat that never connected automatically becomes a Bot
    const resolvedPlayers = players.map((p, idx) => {
      if (p.active && p.seatType === 'human-remote' && !remoteSlots[idx]?.connected) {
        return {
          ...p,
          seatType: 'bot' as const,
          name: p.name.startsWith('Online-Studi') ? DEFAULT_NAMES.bot[idx] : p.name,
        };
      }
      return p;
    });
    setPlayers(resolvedPlayers);
    const initial = createInitialState(resolvedPlayers);
    setGameState(initial);
    broadcastAll({ kind: 'STATE_SYNC', state: initial });
  };

  const updatePlayers = (nextPlayers: PlayerConfig[]) => {
    setPlayers(nextPlayers);
    broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers });
  };

  const updateGuestName = (name: string) => {
    setGuestName(name);
    if (guestConnected) {
      const clean = name.trim().slice(0, 18);
      if (clean) {
        guestClientRef.current?.send({ kind: 'SET_NAME', name: clean });
        lobbyGuestRef.current?.send({ kind: 'SET_NAME', name: clean });
      }
    }
  };

  const updateAnswerInput = (seatIndex: number, value: string) => {
    setRemoteSlots((prev) => ({
      ...prev,
      [seatIndex]: {
        ...(prev[seatIndex] ?? {
          offerCode: '',
          connected: false,
          creating: false,
          error: null,
        }),
        answerInput: value,
      },
    }));
  };

  return {
    players,
    gameState,
    isGuest,
    localSeatIndices,
    remoteSlots,
    disconnectedSeats,
    hostLobbyCode,
    hostLobbyError,
    initialJoinCode,
    initialRoomCode,
    guestName,
    guestAnswerCode,
    guestConnected,
    guestConnecting,
    guestError,
    lobbyRoster,
    updatePlayers,
    updateGuestName,
    updateAnswerInput,
    handleCreateOffer,
    handleAcceptAnswer,
    handleCloseRemoteSeat,
    handleGuestJoinRoom,
    handleGuestCreateAnswer,
    handleGuestLeave,
    handleStartGame,
    handleBackToLobby,
    handleTakeOverAsBot,
    dispatchAction,
  };
}
