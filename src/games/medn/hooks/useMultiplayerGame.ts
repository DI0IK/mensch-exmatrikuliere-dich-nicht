import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../../shared/audio/sound';
import { DEFAULT_NAMES } from '../components/lobby/types';
import { chooseBestBotPawn, chooseBotSuperpowerAction } from '../game/bot';
import {
  acknowledgeActivity,
  acknowledgeDuel,
  createInitialState,
  rollDice,
  rollDuelDie,
  selectPawn,
  applyAutoWinDuelSuperpower,
  applyInstantFinishSuperpower,
  applyKickToDormSuperpower,
  applyLoadedSixSuperpower,
  applySwapSuperpower,
} from '../game/engine';
import { DEFAULT_GAME_SETTINGS } from '../game/modes';
import type {
  GameAction,
  GameSettings,
  GameState,
  PlayerConfig,
  SuperpowerType,
} from '../game/types';
import { type IceTransportKind, LobbyGuestRoom, LobbyHostRoom } from '../../../shared/net/lobbyRoom';
import type { NetMessage } from '../net/webrtc';

const USERNAME_STORAGE_KEY = 'medn_username';
const PROFILE_STORAGE_KEY = 'medn_profile';

interface SavedProfile {
  name?: string;
  major?: string;
  emoji?: string;
}

function loadSavedProfile(): SavedProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedProfile) : {};
    const legacyName = window.localStorage.getItem(USERNAME_STORAGE_KEY)?.trim().slice(0, 18);
    return {
      name: parsed.name?.trim().slice(0, 18) || legacyName || undefined,
      major: typeof parsed.major === 'string' ? parsed.major.trim().slice(0, 28) : undefined,
      emoji: typeof parsed.emoji === 'string' ? parsed.emoji.trim().slice(0, 8) : undefined,
    };
  } catch {
    return {};
  }
}

function saveProfile(partial: SavedProfile): void {
  try {
    const current = loadSavedProfile();
    const next: SavedProfile = {
      ...current,
      ...(partial.name !== undefined && partial.name.trim()
        ? { name: partial.name.trim().slice(0, 18) }
        : {}),
      ...(partial.major !== undefined ? { major: partial.major.trim().slice(0, 28) } : {}),
      ...(partial.emoji !== undefined ? { emoji: partial.emoji.trim().slice(0, 8) } : {}),
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    if (next.name) {
      window.localStorage.setItem(USERNAME_STORAGE_KEY, next.name);
    }
  } catch {
    // ignore storage errors
  }
}

const DEFAULT_PLAYERS: PlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true, major: 'Informatik', emoji: '💻' },
  { color: 'blau', name: 'Jura-Leo', seatType: 'bot', active: true, major: 'Jura', emoji: '⚖️' },
  { color: 'gelb', name: 'BWL-Justus', seatType: 'bot', active: true, major: 'BWL', emoji: '📈' },
  { color: 'gruen', name: 'Med-Klara', seatType: 'bot', active: true, major: 'Medizin', emoji: '🩺' },
];

function extractHashParam(prefix: string): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash;
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : '';
}

function playTransitionSounds(prev: GameState | null, next: GameState): void {
  if (!prev) return;

  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
    sound.playVictory();
    return;
  }
  if (next.phase === 'DUEL_RESULT' && prev.phase !== 'DUEL_RESULT') {
    sound.playDiceRoll();
    sound.playStampThud();
    return;
  }
  if (
    prev.phase === 'DUEL_ROLL' &&
    next.phase === 'DUEL_ROLL' &&
    (next.duel?.rounds.length ?? 0) > (prev.duel?.rounds.length ?? 0)
  ) {
    sound.playDiceRoll();
    return;
  }
  if (next.phase === 'ACTIVITY_RESULT' && prev.phase !== 'ACTIVITY_RESULT') {
    if (next.activity?.outcome === 'bad') {
      sound.playStampThud();
    } else {
      sound.playPawnTap();
    }
    return;
  }
  if (prev.phase === 'ACTIVITY_RESULT' && next.phase !== 'ACTIVITY_RESULT') {
    sound.playPawnTap();
    return;
  }
  if (prev.phase === 'DUEL_RESULT' && next.phase !== 'DUEL_RESULT') {
    sound.playPawnTap();
    return;
  }
  if (
    prev.phase === 'WAIT_ROLL' &&
    (next.phase === 'SELECT_PAWN' ||
      (next.phase === 'WAIT_ROLL' &&
        (next.rollAttemptsInBase !== prev.rollAttemptsInBase ||
          next.currentTurn !== prev.currentTurn ||
          next.lastRoll !== prev.lastRoll ||
          next.nextLogId !== prev.nextLogId)))
  ) {
    sound.playDiceRoll();
    return;
  }
  if (prev.phase === 'SELECT_PAWN' && next.phase !== 'SELECT_PAWN') {
    sound.playPawnTap();
  }
}

export function useMultiplayerGame() {
  const [players, setPlayers] = useState<PlayerConfig[]>(() => {
    const saved = loadSavedProfile();
    return DEFAULT_PLAYERS.map((p, idx) =>
      idx === 0
        ? {
            ...p,
            ...(saved.name ? { name: saved.name } : {}),
            ...(saved.major !== undefined ? { major: saved.major } : {}),
            ...(saved.emoji ? { emoji: saved.emoji } : {}),
          }
        : p
    );
  });
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [lobbySettings, setLobbySettings] = useState<GameSettings | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Host P2P state
  const [connectedSeats, setConnectedSeats] = useState<number[]>([]);
  const [disconnectedSeats, setDisconnectedSeats] = useState<number[]>([]);
  const [hostLobbyCode, setHostLobbyCode] = useState<string | null>(null);
  const [hostLobbyError, setHostLobbyError] = useState<string | null>(null);
  const lobbyHostRef = useRef<LobbyHostRoom | null>(null);
  const playersRef = useRef<PlayerConfig[]>(players);
  playersRef.current = players;

  // Guest P2P state
  const [initialRoomCode] = useState<string>(() => extractHashParam('#room='));
  const [guestName, setGuestName] = useState(() => loadSavedProfile().name ?? 'Gast-Studi');
  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;
  const [guestMajor, setGuestMajor] = useState(() => loadSavedProfile().major ?? '');
  const guestMajorRef = useRef(guestMajor);
  guestMajorRef.current = guestMajor;
  const [guestEmoji, setGuestEmoji] = useState(() => loadSavedProfile().emoji ?? '');
  const guestEmojiRef = useRef(guestEmoji);
  guestEmojiRef.current = guestEmoji;
  const [guestSuperpower, setGuestSuperpower] = useState<SuperpowerType | 'random'>('random');
  const guestSuperpowerRef = useRef(guestSuperpower);
  guestSuperpowerRef.current = guestSuperpower;
  const [guestConnected, setGuestConnected] = useState(false);
  const [guestConnecting, setGuestConnecting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSeat, setGuestSeat] = useState<number | null>(null);
  const [lobbyRoster, setLobbyRoster] = useState<PlayerConfig[] | null>(null);
  const lobbyGuestRef = useRef<LobbyGuestRoom | null>(null);

  const isGuest = guestSeat !== null;
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

  const broadcastAll = useCallback((msg: NetMessage) => {
    lobbyHostRef.current?.broadcast(msg);
  }, []);

  const applyHostAction = useCallback(
    (action: GameAction) => {
      setGameState((prev) => {
        if (!prev) return prev;
        if (
          action.playerIndex !== prev.currentTurn &&
          prev.phase !== 'DUEL_ROLL' &&
          prev.phase !== 'DUEL_RESULT' &&
          prev.phase !== 'ACTIVITY_RESULT'
        ) {
          return prev;
        }
        if (
          (prev.phase === 'DUEL_ROLL' || prev.phase === 'DUEL_RESULT') &&
          prev.duel &&
          action.playerIndex !== prev.duel.attackerPlayerIndex &&
          action.playerIndex !== prev.duel.defenderPlayerIndex
        ) {
          return prev;
        }
        if (
          prev.phase === 'ACTIVITY_RESULT' &&
          prev.activity &&
          action.playerIndex !== prev.activity.playerIndex
        ) {
          return prev;
        }

        let next = prev;
        switch (action.type) {
          case 'ROLL_DICE':
            sound.playDiceRoll();
            next = rollDice(prev);
            if (next.phase === 'ACTIVITY_RESULT' && next.activity?.outcome === 'bad') {
              sound.playStampThud();
            }
            break;
          case 'SELECT_PAWN':
            sound.playPawnTap();
            next = selectPawn(prev, action.pawnId);
            if (next.phase === 'ACTIVITY_RESULT' && next.activity?.outcome === 'bad') {
              sound.playStampThud();
            }
            break;
          case 'DUEL_ROLL':
            sound.playDiceRoll();
            next = rollDuelDie(prev, action.playerIndex);
            if (next.phase === 'DUEL_RESULT') {
              sound.playStampThud();
            }
            break;
          case 'ACK_DUEL':
            sound.playPawnTap();
            next = acknowledgeDuel(prev);
            break;
          case 'ACK_ACTIVITY':
            sound.playPawnTap();
            next = acknowledgeActivity(prev);
            break;
          case 'USE_SWAP':
            sound.playPawnTap();
            next = applySwapSuperpower(prev, action.playerIndex, action.ownPawnId, action.targetPawnId);
            break;
          case 'USE_INSTANT_FINISH':
            sound.playPawnTap();
            next = applyInstantFinishSuperpower(prev, action.playerIndex, action.pawnId);
            break;
          case 'USE_AUTO_WIN_DUEL':
            sound.playStampThud();
            next = applyAutoWinDuelSuperpower(prev, action.playerIndex);
            break;
          case 'USE_LOADED_SIX':
            sound.playDiceRoll();
            next = applyLoadedSixSuperpower(prev, action.playerIndex);
            break;
          case 'USE_KICK_TO_DORM':
            sound.playStampThud();
            next = applyKickToDormSuperpower(prev, action.playerIndex, action.targetPawnId);
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
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
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
      } else if (msg.kind === 'SET_PROFILE') {
        const cleanMajor = msg.major !== undefined ? msg.major.trim().slice(0, 28) : undefined;
        const cleanEmoji = msg.emoji !== undefined ? msg.emoji.trim().slice(0, 8) : undefined;
        const hasSuperpowerUpdate = msg.superpower !== undefined;
        const cleanSuperpower =
          msg.superpower === 'random'
            ? undefined
            : msg.superpower &&
                (['swap', 'instantFinish', 'autoWinDuel', 'loadedSix', 'kickToDorm'] as const).includes(
                  msg.superpower
                )
              ? msg.superpower
              : undefined;
        const validSuperpowerUpdate =
          hasSuperpowerUpdate && (msg.superpower === 'random' || cleanSuperpower !== undefined);
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex
              ? {
                  ...p,
                  ...(cleanMajor !== undefined ? { major: cleanMajor } : {}),
                  ...(cleanEmoji !== undefined ? { emoji: cleanEmoji } : {}),
                  ...(validSuperpowerUpdate ? { superpower: cleanSuperpower } : {}),
                }
              : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
          return nextPlayers;
        });
        setGameState((prev) => {
          if (!prev) return prev;
          const next: GameState = {
            ...prev,
            players: prev.players.map((p, i) =>
              i === seatIndex
                ? {
                    ...p,
                    ...(cleanMajor !== undefined ? { major: cleanMajor } : {}),
                    ...(cleanEmoji !== undefined ? { emoji: cleanEmoji } : {}),
                    ...(validSuperpowerUpdate ? { superpower: cleanSuperpower } : {}),
                  }
                : p
            ),
          };
          broadcastAll({ kind: 'STATE_SYNC', state: next });
          return next;
        });
      } else if (msg.kind === 'LEAVE_GAME') {
        lobbyHostRef.current?.closeSeat(seatIndex);
        setConnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
        setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex
              ? { ...p, seatType: 'bot' as const, name: DEFAULT_NAMES.bot[i] ?? p.name }
              : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
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
      setConnectedSeats((prev) =>
        connected
          ? prev.includes(seatIndex)
            ? prev
            : [...prev, seatIndex]
          : prev.filter((s) => s !== seatIndex)
      );

      if (connected) {
        setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
        setPlayers((prev) => {
          const nextPlayers = prev.map((p, i) =>
            i === seatIndex ? { ...p, seatType: 'human-remote' as const } : p
          );
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
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
          broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
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

  // Auto-manage LobbyHostRoom whenever any non-local seat (Bot or P2P) exists
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

  const handleGuestJoinRoom = useCallback((roomCode: string) => {
    const normalized = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (lobbyHostRef.current && normalized === lobbyHostRef.current.lobbyCode) {
      setGuestError('Cannot join your own lobby');
      return;
    }
    setGuestError(null);
    setGuestConnecting(true);
    lobbyGuestRef.current?.close();
    const client = new LobbyGuestRoom({
      onMessage: (msg: NetMessage) => {
        if (msg.kind === 'WELCOME') {
          setGuestSeat(msg.assignedSeat);
          if (msg.state) {
            playTransitionSounds(gameStateRef.current, msg.state);
            setGameState(msg.state);
          }
          const clean = guestNameRef.current.trim().slice(0, 18);
          if (clean) {
            client.send({ kind: 'SET_NAME', name: clean });
          }
          const cleanMajor = guestMajorRef.current.trim().slice(0, 28);
          const cleanEmoji = guestEmojiRef.current.trim().slice(0, 8);
          client.send({
            kind: 'SET_PROFILE',
            ...(cleanMajor ? { major: cleanMajor } : {}),
            ...(cleanEmoji ? { emoji: cleanEmoji } : {}),
            superpower: guestSuperpowerRef.current,
          });
        } else if (msg.kind === 'STATE_SYNC') {
          playTransitionSounds(gameStateRef.current, msg.state);
          setGameState(msg.state);
        } else if (msg.kind === 'LOBBY_SYNC') {
          setLobbyRoster(msg.players);
          if (msg.settings) setLobbySettings(msg.settings);
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

    let activePlayerIndex = gameState.currentTurn;
    if (gameState.phase === 'DUEL_ROLL' && gameState.duel) {
      const { attackerPlayerIndex, defenderPlayerIndex, pendingAttackerRoll, pendingDefenderRoll } =
        gameState.duel;
      const attackerIsBot = gameState.players[attackerPlayerIndex]?.seatType === 'bot';
      const defenderIsBot = gameState.players[defenderPlayerIndex]?.seatType === 'bot';
      if (attackerIsBot && pendingAttackerRoll === null) {
        activePlayerIndex = attackerPlayerIndex;
      } else if (defenderIsBot && pendingDefenderRoll === null) {
        activePlayerIndex = defenderPlayerIndex;
      } else {
        return;
      }
    } else if (gameState.phase === 'DUEL_RESULT') {
      activePlayerIndex = gameState.duel?.attackerPlayerIndex ?? gameState.currentTurn;
    } else if (gameState.phase === 'ACTIVITY_RESULT') {
      activePlayerIndex = gameState.activity?.playerIndex ?? gameState.currentTurn;
    }

    const activePlayer = gameState.players[activePlayerIndex];
    if (!activePlayer || activePlayer.seatType !== 'bot') return;

    const delayMs =
      gameState.phase === 'DUEL_RESULT'
        ? 2200
        : gameState.phase === 'ACTIVITY_RESULT'
          ? 1900
          : gameState.phase === 'DUEL_ROLL'
            ? 1250
            : gameState.phase === 'SELECT_PAWN'
              ? 1150
              : 1000;

    const timer = window.setTimeout(() => {
      const botSuperpower = chooseBotSuperpowerAction(gameState, activePlayerIndex);
      if (botSuperpower) {
        dispatchAction(botSuperpower);
        return;
      }
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
      } else if (gameState.phase === 'ACTIVITY_RESULT') {
        dispatchAction({ type: 'ACK_ACTIVITY', playerIndex: activePlayerIndex });
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
    lobbyHostRef.current?.closeSeat(seatIndex);
    setConnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
    setDisconnectedSeats((prev) => prev.filter((s) => s !== seatIndex));
  };

  const handleGuestLeave = () => {
    if (guestConnected) {
      lobbyGuestRef.current?.send({ kind: 'LEAVE_GAME' });
    }
    lobbyGuestRef.current?.close();
    lobbyGuestRef.current = null;
    setGuestSeat(null);
    setGuestConnected(false);
    setGuestConnecting(false);
    setGuestError(null);
    setLobbyRoster(null);
    setLobbySettings(null);
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
    const connectedSet = new Set(connectedSeats);
    const resolvedPlayers = players.map((p, idx) => {
      if (p.active && p.seatType === 'human-remote' && !connectedSet.has(idx)) {
        return {
          ...p,
          seatType: 'bot' as const,
          name: p.name.startsWith('Online-Studi') ? DEFAULT_NAMES.bot[idx] : p.name,
        };
      }
      return p;
    });
    setPlayers(resolvedPlayers);
    const initial = createInitialState(resolvedPlayers, settings);
    setGameState(initial);
    broadcastAll({ kind: 'STATE_SYNC', state: initial });
  };

  const updatePlayers = (nextPlayers: PlayerConfig[]) => {
    setPlayers(nextPlayers);
    const hostPlayer = nextPlayers[0];
    if (hostPlayer) {
      saveProfile({
        name: hostPlayer.name,
        major: hostPlayer.major ?? '',
        emoji: hostPlayer.emoji ?? '',
      });
    }
    broadcastAll({ kind: 'LOBBY_SYNC', players: nextPlayers, settings: settingsRef.current });
  };

  const updateSettings = (nextSettings: GameSettings) => {
    setSettings(nextSettings);
    broadcastAll({ kind: 'LOBBY_SYNC', players: playersRef.current, settings: nextSettings });
  };

  const updateGuestName = (name: string) => {
    setGuestName(name);
    saveProfile({ name });
    if (guestConnected) {
      const clean = name.trim().slice(0, 18);
      if (clean) {
        lobbyGuestRef.current?.send({ kind: 'SET_NAME', name: clean });
      }
    }
  };

  const updateGuestMajor = (major: string) => {
    setGuestMajor(major);
    saveProfile({ major });
    if (guestConnected) {
      lobbyGuestRef.current?.send({ kind: 'SET_PROFILE', major: major.trim().slice(0, 28) });
    }
  };

  const updateGuestEmoji = (emoji: string) => {
    setGuestEmoji(emoji);
    saveProfile({ emoji });
    if (guestConnected) {
      lobbyGuestRef.current?.send({ kind: 'SET_PROFILE', emoji: emoji.trim().slice(0, 8) });
    }
  };

  const updateGuestSuperpower = (superpower: SuperpowerType | 'random') => {
    setGuestSuperpower(superpower);
    if (guestConnected) {
      lobbyGuestRef.current?.send({ kind: 'SET_PROFILE', superpower });
    }
  };

  const getConnectionTransports = useCallback(async (): Promise<Record<number, IceTransportKind>> => {
    if (isGuest) {
      const kind = await lobbyGuestRef.current?.getTransportKind();
      return kind ? { 0: kind } : {};
    }
    return (await lobbyHostRef.current?.getSeatTransportKinds()) ?? {};
  }, [isGuest]);

  return {
    players,
    settings,
    lobbySettings,
    gameState,
    isGuest,
    guestSeat,
    localSeatIndices,
    connectedSeats,
    disconnectedSeats,
    hostLobbyCode,
    hostLobbyError,
    initialRoomCode,
    guestName,
    guestMajor,
    guestEmoji,
    guestSuperpower,
    guestConnected,
    guestConnecting,
    guestError,
    lobbyRoster,
    updatePlayers,
    updateSettings,
    updateGuestName,
    updateGuestMajor,
    updateGuestEmoji,
    updateGuestSuperpower,
    handleCloseRemoteSeat,
    handleGuestJoinRoom,
    handleGuestLeave,
    handleStartGame,
    handleBackToLobby,
    handleTakeOverAsBot,
    dispatchAction,
    getConnectionTransports,
  };
}
