import type { Language } from '../types/game';

export interface LobbyTranslations {
  title: string;
  subtitle: string;
  players: string;
  startGame: string;
  copied: string;
  backToGames: string;
  webrtcConnected: string;
  webrtcWaitingRoom: string;
  webrtcLeaveRoom: string;
  webrtcResetSeat: string;
  lobbyCodeCopy: string;
  lobbyCodeLinkCopy: string;
  lobbyCodeJoinLabel: string;
  lobbyCodeJoinPlaceholder: string;
  lobbyCodeJoinBtn: string;
  lobbyCodeConnecting: string;
}

export const LOBBY_TRANSLATIONS: Record<Language, LobbyTranslations> = {
  de: {
    title: 'Brettspiel-Lobby',
    subtitle: 'Lokal, mit Bots oder online per P2P',
    players: 'Studierende (2–4 Plätze)',
    startGame: 'Spiel starten',
    copied: 'Kopiert!',
    backToGames: 'Alle Spiele',
    webrtcConnected: 'Online verbunden',
    webrtcWaitingRoom: 'Verbunden — warte auf Spielstart durch Host…',
    webrtcLeaveRoom: 'Lobby verlassen',
    webrtcResetSeat: 'Platz zurücksetzen',
    lobbyCodeCopy: 'Code kopieren',
    lobbyCodeLinkCopy: 'Einladungs-Link kopieren',
    lobbyCodeJoinLabel: 'Mit Code beitreten:',
    lobbyCodeJoinPlaceholder: 'z.B. A7K9P2',
    lobbyCodeJoinBtn: 'Beitreten',
    lobbyCodeConnecting: 'Verbinde mit Lobby…',
  },
  en: {
    title: 'Board Game Lobby',
    subtitle: 'Local, with bots, or online via P2P',
    players: 'Students (2–4 Seats)',
    startGame: 'Start Game',
    copied: 'Copied!',
    backToGames: 'All Games',
    webrtcConnected: 'Connected online',
    webrtcWaitingRoom: 'Connected — waiting for host to start…',
    webrtcLeaveRoom: 'Leave Lobby',
    webrtcResetSeat: 'Reset Seat',
    lobbyCodeCopy: 'Copy Code',
    lobbyCodeLinkCopy: 'Copy Invite Link',
    lobbyCodeJoinLabel: 'Join with Code:',
    lobbyCodeJoinPlaceholder: 'e.g. A7K9P2',
    lobbyCodeJoinBtn: 'Join',
    lobbyCodeConnecting: 'Connecting to lobby…',
  },
};
