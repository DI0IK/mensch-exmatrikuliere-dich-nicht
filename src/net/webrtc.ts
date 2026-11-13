import LZString from 'lz-string';
import type { GameAction, GameState, PlayerConfig } from '../game/types';
import { getIceServers } from './iceConfig';

export type NetMessage =
  | { kind: 'WELCOME'; assignedSeat: number; state: GameState | null }
  | { kind: 'LOBBY_SYNC'; players: PlayerConfig[] }
  | { kind: 'SET_NAME'; name: string }
  | { kind: 'SET_PROFILE'; major?: string; emoji?: string }
  | { kind: 'STATE_SYNC'; state: GameState }
  | { kind: 'RETURN_TO_LOBBY' }
  | { kind: 'LEAVE_GAME' }
  | { kind: 'ROOM_ERROR'; message: string }
  | { kind: 'PLAYER_ACTION'; action: GameAction };

interface SignalPayload {
  sdp: RTCSessionDescriptionInit;
  seat?: number;
}

function encodeSignal(payload: SignalPayload): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

function decodeSignal(code: string): SignalPayload {
  const cleaned = code.trim().replace(/^.*#join=/, '');
  const json = LZString.decompressFromEncodedURIComponent(cleaned);
  if (!json) {
    throw new Error('Invalid WebRTC invite/answer code.');
  }
  return JSON.parse(json) as SignalPayload;
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }, timeoutMs);

    function onChange() {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    }
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

export interface HostPeerSlot {
  seatIndex: number;
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
  offerCode: string;
  connected: boolean;
}

export class WebRTCHostManager {
  private peers = new Map<number, HostPeerSlot>();
  private onMessage: (seatIndex: number, msg: NetMessage) => void;
  private onStatusChange: (seatIndex: number, connected: boolean) => void;

  constructor(
    onMessage: (seatIndex: number, msg: NetMessage) => void,
    onStatusChange: (seatIndex: number, connected: boolean) => void
  ) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  public async createOfferForSeat(seatIndex: number): Promise<string> {
    this.closeSeat(seatIndex);

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    const channel = pc.createDataChannel('medn-game', { ordered: true });

    const slot: HostPeerSlot = {
      seatIndex,
      pc,
      channel,
      offerCode: '',
      connected: false,
    };
    this.peers.set(seatIndex, slot);

    channel.onopen = () => {
      slot.connected = true;
      this.onStatusChange(seatIndex, true);
    };
    channel.onclose = () => {
      slot.connected = false;
      this.onStatusChange(seatIndex, false);
    };
    channel.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as NetMessage;
        this.onMessage(seatIndex, msg);
      } catch {
        // Ignore malformed packet
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error('Failed to gather local description');
    slot.offerCode = encodeSignal({ sdp: localDesc, seat: seatIndex });
    return slot.offerCode;
  }

  public async acceptAnswerForSeat(seatIndex: number, answerCode: string): Promise<void> {
    const slot = this.peers.get(seatIndex);
    if (!slot) throw new Error('No pending offer for this seat.');
    const payload = decodeSignal(answerCode);
    await slot.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  }

  public sendToSeat(seatIndex: number, msg: NetMessage): void {
    const slot = this.peers.get(seatIndex);
    if (slot?.channel && slot.channel.readyState === 'open') {
      slot.channel.send(JSON.stringify(msg));
    }
  }

  public broadcast(msg: NetMessage): void {
    const serialized = JSON.stringify(msg);
    for (const slot of this.peers.values()) {
      if (slot.channel && slot.channel.readyState === 'open') {
        slot.channel.send(serialized);
      }
    }
  }

  public closeSeat(seatIndex: number): void {
    const existing = this.peers.get(seatIndex);
    if (existing) {
      existing.channel?.close();
      existing.pc.close();
      this.peers.delete(seatIndex);
    }
  }

  public closeAll(): void {
    for (const seatIndex of this.peers.keys()) {
      this.closeSeat(seatIndex);
    }
  }
}

export class WebRTCGuestClient {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private onMessage: (msg: NetMessage) => void;
  private onStatusChange: (connected: boolean) => void;

  constructor(
    onMessage: (msg: NetMessage) => void,
    onStatusChange: (connected: boolean) => void
  ) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  public async acceptOfferAndCreateAnswer(
    offerCode: string
  ): Promise<{ answerCode: string; assignedSeat: number }> {
    this.close();
    const payload = decodeSignal(offerCode);
    const assignedSeat = payload.seat ?? 1;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.pc = pc;

    pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      this.channel = ch;
      ch.onopen = () => this.onStatusChange(true);
      ch.onclose = () => this.onStatusChange(false);
      ch.onmessage = (msgEv) => {
        try {
          const msg = JSON.parse(msgEv.data as string) as NetMessage;
          this.onMessage(msg);
        } catch {
          // Ignore malformed packet
        }
      };
    };

    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error('Failed to create WebRTC answer');
    return {
      answerCode: encodeSignal({ sdp: localDesc, seat: assignedSeat }),
      assignedSeat,
    };
  }

  public send(msg: NetMessage): void {
    if (this.channel && this.channel.readyState === 'open') {
      this.channel.send(JSON.stringify(msg));
    }
  }

  public close(): void {
    this.channel?.close();
    this.pc?.close();
    this.channel = null;
    this.pc = null;
  }
}
