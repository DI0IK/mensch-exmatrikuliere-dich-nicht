import {
  DEFAULT_BASE_PLAYERS,
  DEFAULT_NAMES,
  type BaseNetMessage,
  type BasePlayerConfig,
} from '../types/game';
import { extractRoomCodeFromHash } from '../net/joinLink';
import { type IceTransportKind, LobbyGuestRoom, LobbyHostRoom } from '../net/lobbyRoom';
import { loadSavedProfile, saveProfile } from './profileStorage';

export interface EngineSnapshot<
  TState,
  TSettings,
  TPlayer extends BasePlayerConfig = BasePlayerConfig,
> {
  players: TPlayer[];
  settings: TSettings;
  lobbySettings: TSettings | null;
  gameState: TState | null;
  connectedSeats: number[];
  disconnectedSeats: number[];
  hostLobbyCode: string | null;
  hostLobbyError: string | null;
  initialRoomCode: string;
  isGuest: boolean;
  guestSeat: number | null;
  guestName: string;
  guestMajor: string;
  guestEmoji: string;
  guestConnected: boolean;
  guestConnecting: boolean;
  guestError: string | null;
  lobbyRoster: TPlayer[] | null;
  seatTransports: Record<number, IceTransportKind>;
}

export interface BaseGameEngineOptions<
  TSettings,
  TPlayer extends BasePlayerConfig = BasePlayerConfig,
> {
  defaultSettings: TSettings;
  defaultPlayers?: TPlayer[];
  autoConnect?: boolean;
}

export abstract class BaseGameEngine<
  TState,
  TAction,
  TSettings,
  TPlayer extends BasePlayerConfig = BasePlayerConfig,
> {
  abstract readonly gameId: string;

  protected players: TPlayer[];
  protected settings: TSettings;
  protected lobbySettings: TSettings | null = null;
  protected gameState: TState | null = null;

  protected connectedSeats: number[] = [];
  protected disconnectedSeats: number[] = [];
  protected hostLobbyCode: string | null = null;
  protected hostLobbyError: string | null = null;

  protected readonly initialRoomCode: string;
  protected isGuest: boolean;
  protected guestSeat: number | null = null;
  protected guestName: string;
  protected guestMajor: string;
  protected guestEmoji: string;
  protected guestConnected = false;
  protected guestConnecting = false;
  protected guestError: string | null = null;
  protected lobbyRoster: TPlayer[] | null = null;
  protected seatTransports: Record<number, IceTransportKind> = {};

  private hostRoom: LobbyHostRoom<BaseNetMessage<TState, TAction, TSettings, TPlayer>> | null = null;
  private guestRoom: LobbyGuestRoom<BaseNetMessage<TState, TAction, TSettings, TPlayer>> | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private transportPollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private snapshotCache: EngineSnapshot<TState, TSettings, TPlayer> | null = null;
  private destroyed = false;
  private readonly autoConnect: boolean;

  constructor(options: BaseGameEngineOptions<TSettings, TPlayer>) {
    const saved = loadSavedProfile();
    const basePlayers = options.defaultPlayers ?? (DEFAULT_BASE_PLAYERS as TPlayer[]);
    this.players = basePlayers.map((p, idx) =>
      idx === 0
        ? {
            ...p,
            ...(saved.name ? { name: saved.name } : {}),
            ...(saved.major !== undefined ? { major: saved.major } : {}),
            ...(saved.emoji ? { emoji: saved.emoji } : {}),
          }
        : { ...p }
    );
    this.settings = options.defaultSettings;
    this.initialRoomCode = extractRoomCodeFromHash();
    this.isGuest = Boolean(this.initialRoomCode);
    this.guestName = saved.name || 'Online-Studi';
    this.guestMajor = saved.major ?? '';
    this.guestEmoji = saved.emoji || '🎓';
    this.autoConnect = options.autoConnect ?? typeof window !== 'undefined';
  }

  public mount(): void {
    this.destroyed = false;
    if (this.autoConnect && !this.isGuest && !this.hostRoom) {
      this.initHostRoom();
    }
    if (!this.isGuest && this.gameState) {
      this.scheduleBotIfNeeded();
    }
  }

  // ---- Abstract / Overridable Game Hooks ----

  protected abstract createInitialState(players: TPlayer[], settings: TSettings): TState;
  protected abstract reduceAction(state: TState, action: TAction): TState;
  protected abstract isSeatAuthorized(state: TState, actorSeat: number, action: TAction): boolean;
  protected abstract getBotTurnSeat(state: TState): number | null;
  protected abstract decideBotAction(state: TState, botSeat: number): TAction | null;

  protected getBotDelayMs(_state: TState): number {
    return 650;
  }

  protected onStateTransition(_prev: TState | null, _next: TState): void {
    // Subclasses can play transition sounds or trigger side effects
  }

  protected onGuestProfileExtra(
    _seatIndex: number,
    _extra: Record<string, unknown>
  ): Partial<TPlayer> | null {
    return null;
  }

  protected getGuestExtraPayload(): Record<string, unknown> | undefined {
    return undefined;
  }

  // ---- Subscription / Snapshot API ----

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): EngineSnapshot<TState, TSettings, TPlayer> => {
    if (!this.snapshotCache) {
      this.snapshotCache = {
        players: this.players,
        settings: this.settings,
        lobbySettings: this.lobbySettings,
        gameState: this.gameState,
        connectedSeats: this.connectedSeats,
        disconnectedSeats: this.disconnectedSeats,
        hostLobbyCode: this.hostLobbyCode,
        hostLobbyError: this.hostLobbyError,
        initialRoomCode: this.initialRoomCode,
        isGuest: this.isGuest,
        guestSeat: this.guestSeat,
        guestName: this.guestName,
        guestMajor: this.guestMajor,
        guestEmoji: this.guestEmoji,
        guestConnected: this.guestConnected,
        guestConnecting: this.guestConnecting,
        guestError: this.guestError,
        lobbyRoster: this.lobbyRoster,
        seatTransports: this.seatTransports,
      };
    }
    return this.snapshotCache;
  };

  protected emit(): void {
    this.snapshotCache = null;
    for (const listener of this.listeners) {
      listener();
    }
  }

  // ---- Lobby & Profile Mutators ----

  public setPlayers = (next: TPlayer[]): void => {
    this.players = next;
    const host = next[0];
    if (host) {
      saveProfile({ name: host.name, major: host.major, emoji: host.emoji });
    }
    this.hostRoom?.broadcast({
      kind: 'LOBBY_SYNC',
      players: this.players,
      settings: this.settings,
    });
    this.emit();
  };

  public setSettings = (next: TSettings): void => {
    this.settings = next;
    this.hostRoom?.broadcast({
      kind: 'LOBBY_SYNC',
      players: this.players,
      settings: this.settings,
    });
    this.emit();
  };

  public setGuestName = (name: string): void => {
    this.guestName = name;
    saveProfile({ name });
    this.sendGuestProfile();
    this.emit();
  };

  public setGuestMajor = (major: string): void => {
    this.guestMajor = major;
    saveProfile({ major });
    this.sendGuestProfile();
    this.emit();
  };

  public setGuestEmoji = (emoji: string): void => {
    this.guestEmoji = emoji;
    saveProfile({ emoji });
    this.sendGuestProfile();
    this.emit();
  };

  protected sendGuestProfile(): void {
    if (!this.isGuest || !this.guestConnected) return;
    const extra = this.getGuestExtraPayload();
    this.guestRoom?.send({
      kind: 'GUEST_PROFILE',
      name: this.guestName,
      major: this.guestMajor,
      emoji: this.guestEmoji,
    });
    this.guestRoom?.send({
      kind: 'SET_PROFILE',
      major: this.guestMajor,
      emoji: this.guestEmoji,
      ...(extra ? { extra } : {}),
    });
  }

  public closeRemoteSeat = (seatIndex: number): void => {
    this.hostRoom?.closeSeat(seatIndex);
  };

  // ---- Game Lifecycle ----

  public startGame = (): void => {
    if (this.isGuest) return;
    const active = this.players.filter((p) => p.active);
    if (active.length < 2) return;

    const initial = this.createInitialState(this.players, this.settings);
    this.disconnectedSeats = [];
    this.broadcastState(initial);
    this.scheduleBotIfNeeded();
  };

  public returnToLobby = (): void => {
    if (this.isGuest) {
      this.leaveGuestRoom();
      return;
    }
    this.clearBotTimer();
    this.gameState = null;
    this.disconnectedSeats = [];
    this.hostRoom?.broadcast({ kind: 'RETURN_TO_LOBBY' });
    this.emit();
  };

  public dispatchAction = (action: TAction): void => {
    if (this.isGuest) {
      this.guestRoom?.send({ kind: 'PLAYER_ACTION', action });
      return;
    }
    if (!this.gameState) return;
    const actorSeat = this.getLocalPrimaryActorSeat(this.gameState, action);
    if (actorSeat === null) return;
    this.applyHostAction(action, actorSeat);
  };

  protected getLocalPrimaryActorSeat(state: TState, action: TAction): number | null {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].active && this.players[i].seatType === 'human-local') {
        if (this.isSeatAuthorized(state, i, action)) {
          return i;
        }
      }
    }
    return null;
  }

  protected applyHostAction(action: TAction, actorSeat: number): void {
    const cur = this.gameState;
    if (!cur) return;
    if (!this.isSeatAuthorized(cur, actorSeat, action)) return;
    const next = this.reduceAction(cur, action);
    if (next !== cur) {
      this.broadcastState(next);
      this.scheduleBotIfNeeded();
    }
  }

  protected broadcastState(next: TState): void {
    const prev = this.gameState;
    this.onStateTransition(prev, next);
    this.gameState = next;
    this.hostRoom?.broadcast({ kind: 'STATE_SYNC', state: next });
    this.emit();
  }

  // ---- Bot Turn Scheduling ----

  private clearBotTimer(): void {
    if (this.botTimer !== null) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  private scheduleBotIfNeeded(): void {
    this.clearBotTimer();
    if (this.destroyed || this.isGuest || !this.gameState) return;
    const botSeat = this.getBotTurnSeat(this.gameState);
    if (botSeat === null) return;

    const delay = this.getBotDelayMs(this.gameState);
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (this.destroyed || this.isGuest || !this.gameState) return;
      const currentBotSeat = this.getBotTurnSeat(this.gameState);
      if (currentBotSeat === null) return;
      const action = this.decideBotAction(this.gameState, currentBotSeat);
      if (action !== null) {
        this.applyHostAction(action, currentBotSeat);
      }
    }, delay);
  }

  // ---- Host / Guest PeerJS Networking ----

  public getOpenRemoteSeats = (): number[] => {
    const remoteSeats = this.players
      .map((p, idx) => (idx > 0 && p.active && p.seatType === 'human-remote' ? idx : -1))
      .filter((idx) => idx >= 0);

    if (this.gameState) {
      return remoteSeats;
    }

    const botSeats = this.players
      .map((p, idx) => (idx > 0 && p.active && p.seatType === 'bot' ? idx : -1))
      .filter((idx) => idx >= 0);

    return [...remoteSeats, ...botSeats];
  };

  private initHostRoom(): void {
    this.hostRoom?.closeAll();
    this.hostLobbyError = null;
    const room = new LobbyHostRoom<BaseNetMessage<TState, TAction, TSettings, TPlayer>>({
      gameId: this.gameId,
      getOpenRemoteSeats: this.getOpenRemoteSeats,
      onRoomReady: (code) => {
        if (this.destroyed) return;
        this.hostLobbyCode = code;
        this.hostLobbyError = null;
        this.emit();
      },
      onRoomError: (err) => {
        if (this.destroyed) return;
        this.hostLobbyError = err;
        this.emit();
      },
      onStatusChange: (seatIndex, connected) => {
        if (this.destroyed) return;
        if (connected) {
          if (this.players[seatIndex] && this.players[seatIndex].seatType !== 'human-remote') {
            this.players = this.players.map((p, idx) =>
              idx === seatIndex
                ? {
                    ...p,
                    seatType: 'human-remote' as const,
                    name: DEFAULT_NAMES['human-remote'][seatIndex] ?? p.name,
                  }
                : p
            );
          }
          if (!this.connectedSeats.includes(seatIndex)) {
            this.connectedSeats = [...this.connectedSeats, seatIndex];
          }
          this.disconnectedSeats = this.disconnectedSeats.filter((s) => s !== seatIndex);
          room.broadcast({
            kind: 'LOBBY_SYNC',
            players: this.players,
            settings: this.settings,
          });
          if (this.gameState) {
            room.sendToSeat(seatIndex, { kind: 'STATE_SYNC', state: this.gameState });
          }
        } else {
          this.connectedSeats = this.connectedSeats.filter((s) => s !== seatIndex);
          const { [seatIndex]: _, ...restTransports } = this.seatTransports;
          this.seatTransports = restTransports;
          if (this.gameState) {
            if (!this.disconnectedSeats.includes(seatIndex)) {
              this.disconnectedSeats = [...this.disconnectedSeats, seatIndex];
            }
          } else if (this.players[seatIndex]?.seatType === 'human-remote') {
            this.players = this.players.map((p, idx) =>
              idx === seatIndex
                ? {
                    ...p,
                    seatType: 'bot' as const,
                    name: DEFAULT_NAMES.bot[seatIndex] ?? p.name,
                  }
                : p
            );
            room.broadcast({
              kind: 'LOBBY_SYNC',
              players: this.players,
              settings: this.settings,
            });
          }
        }
        this.emit();
        this.syncTransportPolling();
      },
      onMessage: (seatIndex, msg) => {
        if (this.destroyed) return;
        this.handleHostMessage(seatIndex, msg);
      },
    });
    this.hostRoom = room;
    room.start();
  }

  private handleHostMessage(
    seatIndex: number,
    msg: BaseNetMessage<TState, TAction, TSettings, TPlayer>
  ): void {
    if (msg.kind === 'SET_NAME') {
      const cleanName = msg.name.trim().slice(0, 18);
      if (!cleanName) return;
      this.updateSeatFromGuest(seatIndex, { name: cleanName } as Partial<TPlayer>);
    } else if (msg.kind === 'SET_PROFILE') {
      const patch: Partial<TPlayer> = {};
      if (msg.major !== undefined) patch.major = msg.major.trim().slice(0, 28);
      if (msg.emoji !== undefined && msg.emoji.trim()) patch.emoji = msg.emoji.trim().slice(0, 8);
      if (msg.extra) {
        const extraPatch = this.onGuestProfileExtra(seatIndex, msg.extra);
        if (extraPatch) Object.assign(patch, extraPatch);
      }
      this.updateSeatFromGuest(seatIndex, patch);
    } else if (msg.kind === 'GUEST_PROFILE') {
      const cleanName = msg.name.trim().slice(0, 18);
      const patch: Partial<TPlayer> = {};
      if (cleanName) patch.name = cleanName;
      if (msg.major !== undefined) patch.major = msg.major.trim().slice(0, 28);
      if (msg.emoji !== undefined && msg.emoji.trim()) patch.emoji = msg.emoji.trim().slice(0, 8);
      this.updateSeatFromGuest(seatIndex, patch);
    } else if (msg.kind === 'LEAVE_GAME') {
      this.hostRoom?.closeSeat(seatIndex);
    } else if (msg.kind === 'PLAYER_ACTION') {
      this.applyHostAction(msg.action, seatIndex);
    }
  }

  private updateSeatFromGuest(seatIndex: number, patch: Partial<TPlayer>): void {
    this.players = this.players.map((p, idx) => (idx === seatIndex ? { ...p, ...patch } : p));
    this.hostRoom?.broadcast({
      kind: 'LOBBY_SYNC',
      players: this.players,
      settings: this.settings,
    });
    this.emit();
  }

  public joinRoomAsGuest = (roomCode: string): void => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    this.hostRoom?.closeAll();
    this.hostRoom = null;
    this.hostLobbyCode = null;
    this.guestRoom?.close();

    this.isGuest = true;
    this.guestConnecting = true;
    this.guestError = null;
    this.guestConnected = false;
    this.guestSeat = null;
    this.emit();

    const room = new LobbyGuestRoom<BaseNetMessage<TState, TAction, TSettings, TPlayer>>({
      gameId: this.gameId,
      onStatusChange: (connected) => {
        if (this.destroyed) return;
        this.guestConnected = connected;
        this.guestConnecting = false;
        if (!connected) {
          this.seatTransports = {};
        } else {
          this.sendGuestProfile();
        }
        this.emit();
        this.syncTransportPolling();
      },
      onError: (err) => {
        if (this.destroyed) return;
        this.guestError = err;
        this.guestConnecting = false;
        this.guestConnected = false;
        this.emit();
      },
      onMessage: (msg) => {
        if (this.destroyed) return;
        if (msg.kind === 'WELCOME') {
          this.guestSeat = msg.assignedSeat;
          if (msg.state) {
            this.gameState = msg.state;
          }
          this.sendGuestProfile();
          this.emit();
        } else if (msg.kind === 'LOBBY_SYNC') {
          this.lobbyRoster = msg.players;
          if (msg.settings !== undefined) {
            this.lobbySettings = msg.settings;
          }
          this.emit();
        } else if (msg.kind === 'STATE_SYNC') {
          const prev = this.gameState;
          this.onStateTransition(prev, msg.state);
          this.gameState = msg.state;
          this.emit();
        } else if (msg.kind === 'RETURN_TO_LOBBY') {
          this.gameState = null;
          this.emit();
        } else if (msg.kind === 'ROOM_ERROR') {
          this.guestError = msg.message;
          this.guestConnecting = false;
          this.emit();
        }
      },
    });

    this.guestRoom = room;
    room.join(cleanCode);
  };

  public leaveGuestRoom = (): void => {
    this.guestRoom?.close();
    this.guestRoom = null;
    this.isGuest = false;
    this.guestSeat = null;
    this.guestConnected = false;
    this.guestConnecting = false;
    this.guestError = null;
    this.lobbyRoster = null;
    this.lobbySettings = null;
    this.gameState = null;
    this.seatTransports = {};
    this.syncTransportPolling();
    if (this.autoConnect) {
      this.initHostRoom();
    }
    this.emit();
  };

  public getLocalSeatIndices(): number[] {
    if (!this.gameState) return [];
    if (this.isGuest) {
      return this.guestSeat !== null ? [this.guestSeat] : [];
    }
    const activePlayers = this.players.filter((p) => p.active);
    return activePlayers
      .map((p, idx) => (p.seatType === 'human-local' ? idx : -1))
      .filter((idx) => idx >= 0);
  }

  public resetSeatDefaults(seatIndex: number, seatType: BasePlayerConfig['seatType']): string {
    return DEFAULT_NAMES[seatType][seatIndex] ?? `Spieler ${seatIndex + 1}`;
  }

  private syncTransportPolling(): void {
    const shouldPoll =
      this.autoConnect &&
      ((!this.isGuest && this.connectedSeats.length > 0) ||
        (this.isGuest && this.guestConnected && this.guestSeat !== null));

    if (!shouldPoll) {
      if (this.transportPollTimer !== null) {
        clearInterval(this.transportPollTimer);
        this.transportPollTimer = null;
      }
      return;
    }

    const poll = async () => {
      if (this.destroyed) return;
      if (!this.isGuest && this.hostRoom) {
        const kinds = await this.hostRoom.getSeatTransportKinds();
        if (!this.destroyed) {
          this.seatTransports = kinds;
          this.emit();
        }
      } else if (this.isGuest && this.guestRoom && this.guestSeat !== null) {
        const kind = await this.guestRoom.getTransportKind();
        if (!this.destroyed && kind && this.guestSeat !== null) {
          this.seatTransports = { [this.guestSeat]: kind };
          this.emit();
        }
      }
    };

    void poll();
    if (this.transportPollTimer === null) {
      this.transportPollTimer = setInterval(() => void poll(), 2500);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.clearBotTimer();
    if (this.transportPollTimer !== null) {
      clearInterval(this.transportPollTimer);
      this.transportPollTimer = null;
    }
    this.hostRoom?.closeAll();
    this.hostRoom = null;
    this.guestRoom?.close();
    this.guestRoom = null;
    this.listeners.clear();
  }
}
