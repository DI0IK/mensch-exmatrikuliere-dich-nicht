import Peer, { type DataConnection } from 'peerjs';
import { getIceServers } from './iceConfig';
import type { NetMessage } from './webrtc';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateLobbyCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function peerIdFromCode(code: string): string {
  return `medn-${code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
}

export class LobbyHostRoom {
  private peer: Peer | null = null;
  private seatConns = new Map<number, DataConnection>();
  public readonly lobbyCode: string;

  private getOpenRemoteSeats: () => number[];
  private onMessage: (seatIndex: number, msg: NetMessage) => void;
  private onStatusChange: (seatIndex: number, connected: boolean) => void;
  private onRoomReady: (code: string) => void;
  private onRoomError: (err: string) => void;

  constructor(opts: {
    lobbyCode?: string;
    getOpenRemoteSeats: () => number[];
    onMessage: (seatIndex: number, msg: NetMessage) => void;
    onStatusChange: (seatIndex: number, connected: boolean) => void;
    onRoomReady: (code: string) => void;
    onRoomError: (err: string) => void;
  }) {
    this.lobbyCode = opts.lobbyCode ?? generateLobbyCode();
    this.getOpenRemoteSeats = opts.getOpenRemoteSeats;
    this.onMessage = opts.onMessage;
    this.onStatusChange = opts.onStatusChange;
    this.onRoomReady = opts.onRoomReady;
    this.onRoomError = opts.onRoomError;
  }

  public start(): void {
    this.closeAll();
    const peer = new Peer(peerIdFromCode(this.lobbyCode), {
      config: { iceServers: getIceServers() },
    });
    this.peer = peer;

    peer.on('open', () => {
      this.onRoomReady(this.lobbyCode);
    });

    peer.on('error', (err) => {
      this.onRoomError(err.message || 'PeerJS signaling error');
    });

    peer.on('connection', (conn) => {
      const openSeats = this.getOpenRemoteSeats().filter((s) => !this.seatConns.has(s));
      if (openSeats.length === 0) {
        conn.on('open', () => {
          conn.send({ kind: 'ROOM_ERROR', message: 'Lobby is full' } satisfies NetMessage);
          window.setTimeout(() => conn.close(), 200);
        });
        return;
      }

      const assignedSeat = openSeats[0];
      this.seatConns.set(assignedSeat, conn);

      conn.on('open', () => {
        conn.send({ kind: 'WELCOME', assignedSeat, state: null } satisfies NetMessage);
        this.onStatusChange(assignedSeat, true);
      });

      conn.on('data', (data) => {
        if (data && typeof data === 'object') {
          this.onMessage(assignedSeat, data as NetMessage);
        }
      });

      conn.on('close', () => {
        if (this.seatConns.get(assignedSeat) === conn) {
          this.seatConns.delete(assignedSeat);
          this.onStatusChange(assignedSeat, false);
        }
      });

      conn.on('error', () => {
        if (this.seatConns.get(assignedSeat) === conn) {
          this.seatConns.delete(assignedSeat);
          this.onStatusChange(assignedSeat, false);
        }
      });
    });
  }

  public sendToSeat(seatIndex: number, msg: NetMessage): void {
    const conn = this.seatConns.get(seatIndex);
    if (conn && conn.open) {
      conn.send(msg);
    }
  }

  public broadcast(msg: NetMessage): void {
    for (const conn of this.seatConns.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public closeSeat(seatIndex: number): void {
    const conn = this.seatConns.get(seatIndex);
    if (conn) {
      this.seatConns.delete(seatIndex);
      conn.close();
      this.onStatusChange(seatIndex, false);
    }
  }

  public closeAll(): void {
    for (const conn of this.seatConns.values()) {
      conn.close();
    }
    this.seatConns.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}

export class LobbyGuestRoom {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onMessage: (msg: NetMessage) => void;
  private onStatusChange: (connected: boolean) => void;
  private onError: (err: string) => void;

  constructor(opts: {
    onMessage: (msg: NetMessage) => void;
    onStatusChange: (connected: boolean) => void;
    onError: (err: string) => void;
  }) {
    this.onMessage = opts.onMessage;
    this.onStatusChange = opts.onStatusChange;
    this.onError = opts.onError;
  }

  public join(lobbyCode: string): void {
    this.close();
    const targetId = peerIdFromCode(lobbyCode);
    if (targetId.length <= 5) {
      this.onError('Invalid lobby code');
      return;
    }

    const peer = new Peer({
      config: { iceServers: getIceServers() },
    });
    this.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetId, { reliable: true });
      this.conn = conn;

      conn.on('open', () => {
        this.onStatusChange(true);
      });

      conn.on('data', (data) => {
        if (data && typeof data === 'object') {
          this.onMessage(data as NetMessage);
        }
      });

      conn.on('close', () => {
        this.onStatusChange(false);
      });

      conn.on('error', (err) => {
        this.onError(err.message || 'Connection failed');
      });
    });

    peer.on('error', (err) => {
      this.onError(err.message || 'Could not reach lobby');
    });
  }

  public send(msg: NetMessage): void {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  public close(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
  }
}
