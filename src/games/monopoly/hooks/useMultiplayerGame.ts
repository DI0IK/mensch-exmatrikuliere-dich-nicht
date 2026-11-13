import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../../shared/audio/sound';
import { DEFAULT_NAMES } from '../components/lobby/types';
import { decideBotAction } from '../game/bot';
import { applyGameAction, createInitialState } from '../game/engine';
import { DEFAULT_GAME_SETTINGS } from '../game/modes';
import type { GameAction, GameSettings, GameState, PlayerConfig } from '../game/types';
import { extractRoomCodeFromHash } from '../../../shared/net/joinLink';
import { type IceTransportKind, LobbyGuestRoom, LobbyHostRoom } from '../../../shared/net/lobbyRoom';
import type { NetMessage } from '../net/webrtc';
import {
  DEFAULT_PLAYERS,
  isSeatAuthorizedForAction,
  loadSavedProfile,
  playTransitionSounds,
  saveProfile,
} from './profileStorage';

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

  const [connectedSeats, setConnectedSeats] = useState<number[]>([]);
  const [disconnectedSeats, setDisconnectedSeats] = useState<number[]>([]);
  const [hostLobbyCode, setHostLobbyCode] = useState<string | null>(null);
  const [hostLobbyError, setHostLobbyError] = useState<string | null>(null);
  const hostRoomRef = useRef<LobbyHostRoom<NetMessage> | null>(null);

  const initialRoomCode = useMemo(() => extractRoomCodeFromHash(), []);
  const [isGuest, setIsGuest] = useState(Boolean(initialRoomCode));
  const [guestSeat, setGuestSeat] = useState<number | null>(null);
  const [guestName, setGuestName] = useState(() => loadSavedProfile().name || 'Online-Studi');
  const [guestMajor, setGuestMajor] = useState(() => loadSavedProfile().major ?? '');
  const [guestEmoji, setGuestEmoji] = useState(() => loadSavedProfile().emoji || '🎓');
  const [guestConnected, setGuestConnected] = useState(false);
  const [guestConnecting, setGuestConnecting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [lobbyRoster, setLobbyRoster] = useState<PlayerConfig[] | null>(null);
  const guestRoomRef = useRef<LobbyGuestRoom<NetMessage> | null>(null);
  const [seatTransports, setSeatTransports] = useState<Record<number, IceTransportKind>>({});

  const playersRef = useRef(players);
  playersRef.current = players;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isGuestRef = useRef(isGuest);
  isGuestRef.current = isGuest;
  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;
  const guestMajorRef = useRef(guestMajor);
  guestMajorRef.current = guestMajor;
  const guestEmojiRef = useRef(guestEmoji);
  guestEmojiRef.current = guestEmoji;

  const updatePlayers = useCallback((next: PlayerConfig[]) => {
    setPlayers(next);
    const host = next[0];
    if (host) {
      saveProfile({ name: host.name, major: host.major, emoji: host.emoji });
    }
  }, []);

  const updateGuestName = useCallback((name: string) => {
    setGuestName(name);
    saveProfile({ name });
  }, []);

  const updateGuestMajor = useCallback((major: string) => {
    setGuestMajor(major);
    saveProfile({ major });
  }, []);

  const updateGuestEmoji = useCallback((emoji: string) => {
    setGuestEmoji(emoji);
    saveProfile({ emoji });
  }, []);

  const broadcastState = useCallback((next: GameState) => {
    setGameState((prev) => {
      playTransitionSounds(prev, next);
      return next;
    });
    hostRoomRef.current?.broadcast({ kind: 'STATE_SYNC', state: next });
  }, []);

  const applyHostAction = useCallback(
    (action: GameAction, actorSeat: number) => {
      const cur = gameStateRef.current;
      if (!cur) return;
      if (!isSeatAuthorizedForAction(cur, actorSeat, action)) return;
      const next = applyGameAction(cur, action);
      if (next !== cur) {
        broadcastState(next);
      }
    },
    [broadcastState]
  );

  // Initialize Host PeerJS room
  useEffect(() => {
    if (isGuest) {
      hostRoomRef.current?.closeAll();
      hostRoomRef.current = null;
      setHostLobbyCode(null);
      return;
    }

    const room = new LobbyHostRoom<NetMessage>({
      getOpenRemoteSeats: () => {
        const list: number[] = [];
        playersRef.current.forEach((p, idx) => {
          if (idx > 0 && p.active && p.seatType !== 'human-local') {
            list.push(idx);
          }
        });
        return list;
      },
      onRoomReady: (code) => {
        setHostLobbyCode(code);
        setHostLobbyError(null);
      },
      onRoomError: (err) => {
        setHostLobbyError(err);
      },
      onStatusChange: (seatIndex, connected) => {
        setConnectedSeats((prev) =>
          connected
            ? prev.includes(seatIndex)
              ? prev
              : [...prev, seatIndex]
            : prev.filter((s) => s !== seatIndex)
        );
        setDisconnectedSeats((prev) =>
          connected
            ? prev.filter((s) => s !== seatIndex)
            : gameStateRef.current
              ? prev.includes(seatIndex)
                ? prev
                : [...prev, seatIndex]
              : prev
        );

        if (connected) {
          setPlayers((prev) => {
            const next = prev.map((p, idx) =>
              idx === seatIndex ? { ...p, seatType: 'human-remote' as const } : p
            );
            room.sendToSeat(seatIndex, {
              kind: 'LOBBY_SYNC',
              players: next,
              settings: settingsRef.current,
            });
            return next;
          });
          if (gameStateRef.current) {
            room.sendToSeat(seatIndex, { kind: 'STATE_SYNC', state: gameStateRef.current });
          }
        } else {
          setPlayers((prev) => {
            const next = prev.map((p, idx) =>
              idx === seatIndex && p.seatType === 'human-remote'
                ? { ...p, seatType: 'bot' as const, name: DEFAULT_NAMES.bot[idx] ?? p.name }
                : p
            );
            return next;
          });

          // Bot takeover mid-game if a guest disconnects
          const cur = gameStateRef.current;
          if (cur) {
            const updated: GameState = {
              ...cur,
              players: cur.players.map((p, idx) =>
                idx === seatIndex ? { ...p, seatType: 'bot' } : p
              ),
            };
            broadcastState(updated);
          }
        }
      },
      onMessage: (seatIndex, msg) => {
        if (msg.kind === 'GUEST_PROFILE') {
          const cleanName = msg.name.trim().slice(0, 18);
          const cleanMajor = msg.major?.trim().slice(0, 28);
          const cleanEmoji = msg.emoji?.trim().slice(0, 8);
          setPlayers((prev) =>
            prev.map((p, idx) =>
              idx === seatIndex
                ? {
                    ...p,
                    name: cleanName || p.name,
                    ...(cleanMajor !== undefined ? { major: cleanMajor } : {}),
                    ...(cleanEmoji ? { emoji: cleanEmoji } : {}),
                  }
                : p
            )
          );
          return;
        }
        if (msg.kind === 'PLAYER_ACTION') {
          applyHostAction(msg.action, seatIndex);
        }
      },
    });

    hostRoomRef.current = room;
    room.start();

    return () => {
      room.closeAll();
      hostRoomRef.current = null;
    };
  }, [isGuest, applyHostAction, broadcastState]);

  // Broadcast lobby roster & settings to connected guests
  useEffect(() => {
    if (isGuest || gameState) return;
    hostRoomRef.current?.broadcast({ kind: 'LOBBY_SYNC', players, settings });
  }, [players, settings, isGuest, gameState]);

  // Poll ICE transport stats
  useEffect(() => {
    const refresh = async () => {
      if (isGuest) {
        if (guestConnected && guestRoomRef.current) {
          const kind = await guestRoomRef.current.getTransportKind();
          setSeatTransports(kind ? { 0: kind } : {});
        } else {
          setSeatTransports({});
        }
      } else if (connectedSeats.length > 0 && hostRoomRef.current) {
        const kinds = await hostRoomRef.current.getSeatTransportKinds();
        setSeatTransports(kinds);
      } else {
        setSeatTransports({});
      }
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [isGuest, guestConnected, connectedSeats]);

  // Bot automation loop (Host only)
  useEffect(() => {
    if (isGuest || !gameState || gameState.phase === 'GAME_OVER') return;

    let botIndex: number | null = null;
    if (gameState.phase === 'AUCTION' && gameState.auction) {
      const candidate = gameState.auction.activeBidders[gameState.auction.currentBidderPos];
      if (gameState.players[candidate]?.seatType === 'bot') {
        botIndex = candidate;
      }
    } else if (gameState.phase === 'TRADE_REVIEW' && gameState.pendingTrade) {
      const candidate = gameState.pendingTrade.toIndex;
      if (gameState.players[candidate]?.seatType === 'bot') {
        botIndex = candidate;
      }
    } else {
      const candidate = gameState.currentTurn;
      if (gameState.players[candidate]?.seatType === 'bot') {
        botIndex = candidate;
      }
    }

    if (botIndex === null) return;
    const action = decideBotAction(gameState, botIndex);
    if (!action) return;

    const timer = window.setTimeout(() => {
      applyHostAction(action, botIndex);
    }, 520);

    return () => window.clearTimeout(timer);
  }, [gameState, isGuest, applyHostAction]);

  const handleGuestMessage = useCallback((msg: NetMessage) => {
    if (msg.kind === 'WELCOME') {
      setGuestSeat(msg.assignedSeat);
      if (msg.state) {
        setGameState(msg.state);
      }
      guestRoomRef.current?.send({
        kind: 'GUEST_PROFILE',
        name: guestNameRef.current,
        major: guestMajorRef.current,
        emoji: guestEmojiRef.current,
      });
      return;
    }
    if (msg.kind === 'LOBBY_SYNC') {
      setLobbyRoster(msg.players);
      setLobbySettings(msg.settings);
      return;
    }
    if (msg.kind === 'STATE_SYNC') {
      setGameState((prev) => {
        playTransitionSounds(prev, msg.state);
        return msg.state;
      });
      return;
    }
    if (msg.kind === 'RETURN_TO_LOBBY') {
      setGameState(null);
      return;
    }
    if (msg.kind === 'ROOM_ERROR') {
      setGuestError(msg.message);
      setGuestConnecting(false);
    }
  }, []);

  const joinRoomAsGuest = useCallback(
    (code: string) => {
      const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!clean) return;
      if (!isGuestRef.current && hostLobbyCode && clean === hostLobbyCode) return;

      hostRoomRef.current?.closeAll();
      hostRoomRef.current = null;
      setIsGuest(true);
      setGuestConnecting(true);
      setGuestError(null);
      setGuestSeat(null);

      const guestRoom = new LobbyGuestRoom<NetMessage>({
        onMessage: handleGuestMessage,
        onStatusChange: (connected) => {
          setGuestConnected(connected);
          setGuestConnecting(false);
          if (!connected) {
            setGuestError('Disconnected from host');
          }
        },
        onError: (err) => {
          setGuestError(err);
          setGuestConnecting(false);
        },
      });
      guestRoomRef.current = guestRoom;
      guestRoom.join(clean);
    },
    [handleGuestMessage, hostLobbyCode]
  );

  // Sync guest profile changes while in lobby
  useEffect(() => {
    if (!isGuest || !guestConnected) return;
    guestRoomRef.current?.send({
      kind: 'GUEST_PROFILE',
      name: guestName,
      major: guestMajor,
      emoji: guestEmoji,
    });
  }, [isGuest, guestConnected, guestName, guestMajor, guestEmoji]);

  const leaveGuestRoom = useCallback(() => {
    guestRoomRef.current?.close();
    guestRoomRef.current = null;
    setIsGuest(false);
    setGuestConnected(false);
    setGuestConnecting(false);
    setGuestSeat(null);
    setGuestError(null);
    setLobbyRoster(null);
    setLobbySettings(null);
    setGameState(null);
  }, []);

  const closeRemoteSeat = useCallback((seatIndex: number) => {
    hostRoomRef.current?.closeSeat(seatIndex);
  }, []);

  const startGame = useCallback(() => {
    if (isGuest) return;
    sound.unlock();
    const effectiveRoster = players.map((p, idx) => {
      if (idx > 0 && p.active && p.seatType === 'human-remote' && !connectedSeats.includes(idx)) {
        return { ...p, seatType: 'bot' as const, name: DEFAULT_NAMES.bot[idx] ?? p.name };
      }
      return p;
    });
    const initial = createInitialState(effectiveRoster, settings);
    setDisconnectedSeats([]);
    broadcastState(initial);
  }, [isGuest, players, connectedSeats, settings, broadcastState]);

  const returnToLobby = useCallback(() => {
    if (isGuest) {
      leaveGuestRoom();
      return;
    }
    setGameState(null);
    hostRoomRef.current?.broadcast({ kind: 'RETURN_TO_LOBBY' });
  }, [isGuest, leaveGuestRoom]);

  const dispatchAction = useCallback(
    (action: GameAction) => {
      sound.unlock();
      if (isGuest) {
        guestRoomRef.current?.send({ kind: 'PLAYER_ACTION', action });
        return;
      }
      const cur = gameStateRef.current;
      if (!cur) return;

      // Determine local human actor seat
      let actorSeat = cur.currentTurn;
      if (cur.phase === 'TRADE_REVIEW' && cur.pendingTrade && action.type === 'RESPOND_TRADE') {
        actorSeat = cur.pendingTrade.toIndex;
      } else if (
        cur.phase === 'AUCTION' &&
        cur.auction &&
        (action.type === 'PLACE_BID' || action.type === 'PASS_BID')
      ) {
        actorSeat = action.playerIndex;
      }

      const actor = cur.players[actorSeat];
      if (!actor || actor.seatType !== 'human-local') return;
      applyHostAction(action, actorSeat);
    },
    [isGuest, applyHostAction]
  );

  return {
    players,
    settings,
    lobbySettings,
    lobbyRoster,
    gameState,
    connectedSeats,
    disconnectedSeats,
    seatTransports,
    hostLobbyCode,
    hostLobbyError,
    initialRoomCode,
    isGuest,
    guestSeat,
    guestName,
    guestMajor,
    guestEmoji,
    guestConnected,
    guestConnecting,
    guestError,
    setPlayers: updatePlayers,
    setSettings,
    setGuestName: updateGuestName,
    setGuestMajor: updateGuestMajor,
    setGuestEmoji: updateGuestEmoji,
    closeRemoteSeat,
    startGame,
    returnToLobby,
    dispatchAction,
    joinRoomAsGuest,
    leaveGuestRoom,
  };
}
