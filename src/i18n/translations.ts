import type { Language, PlayerColor } from '../game/types';

export const COLOR_LABELS: Record<Language, Record<PlayerColor, string>> = {
  de: { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün' },
  en: { rot: 'Red', blau: 'Blue', gelb: 'Yellow', gruen: 'Green' },
};

export interface Translations {
  title: string;
  subtitle: string;
  backToLobby: string;
  newGame: string;
  startGame: string;
  players: string;
  seatHumanLocal: string;
  seatBot: string;
  seatRemote: string;
  yourTurn: string;
  waitRoll: string;
  selectPawn: string;
  duelRollPrompt: string;
  duelResultPrompt: string;
  rollDice: string;
  rolling: string;
  attempt: string;
  botThinking: string;
  waitingForPlayer: string;
  immatriculation: string;
  exmatriculation: string;
  duelTitle: string;
  attacker: string;
  defender: string;
  duelTie: string;
  duelRollBtn: string;
  duelContinueBtn: string;
  stampExmatriculated: string;
  stampDefended: string;
  stampImmatriculated: string;
  winnerTitle: string;
  winnerSubtitle: string;
  playAgain: string;
  eventLogTitle: string;
  noEventsYet: string;
  rulesHint: string;
  // WebRTC Lobby
  webrtcHostTitle: string;
  webrtcCreateInvite: string;
  webrtcCopyInviteUrl: string;
  webrtcCopyOfferCode: string;
  webrtcPasteAnswer: string;
  webrtcConnectBtn: string;
  webrtcConnected: string;
  webrtcWaitingAnswer: string;
  webrtcGuestTitle: string;
  webrtcGuestHint: string;
  webrtcGuestNameLabel: string;
  webrtcGuestNamePlaceholder: string;
  webrtcPasteOffer: string;
  webrtcCreateAnswer: string;
  webrtcCopyAnswer: string;
  webrtcJoinWait: string;
  webrtcWaitingRoom: string;
  webrtcLeaveRoom: string;
  webrtcLeaveGame: string;
  webrtcResetSeat: string;
  webrtcDisconnectedBanner: string;
  webrtcTakeOverBot: string;
  copied: string;
  soundOn: string;
  soundOff: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  de: {
    title: 'Mensch exmatrikuliere dich nicht',
    subtitle: 'Das akademische Brettspiel mit 1v1-Exmatrikulations-Duell',
    backToLobby: 'Zurück zum Dekanat',
    newGame: 'Neues Semester',
    startGame: 'Semester starten',
    players: 'Studierende (2–4 Plätze)',
    seatHumanLocal: 'Mensch (Lokal)',
    seatBot: 'Kommilitone (Bot)',
    seatRemote: 'Online (WebRTC)',
    yourTurn: 'Du bist dran!',
    waitRoll: 'Würfeln!',
    selectPawn: 'Figur wählen',
    duelRollPrompt: 'Exmatrikulations-Duell!',
    duelResultPrompt: 'Urteil gefällt',
    rollDice: 'Würfeln',
    rolling: 'Würfelt…',
    attempt: 'Versuch',
    botThinking: 'überlegt…',
    waitingForPlayer: 'ist am Zug…',
    immatriculation: 'Immatrikulation',
    exmatriculation: 'Exmatrikulation',
    duelTitle: '1v1 Exmatrikulations-Duell',
    attacker: 'Angreifer',
    defender: 'Verteidiger',
    duelTie: 'Gleichstand! Nochmal würfeln!',
    duelRollBtn: 'Duell-Würfel werfen!',
    duelContinueBtn: 'Weiter',
    stampExmatriculated: 'EXMATRIKULIERT!',
    stampDefended: 'VERTEIDIGT!',
    stampImmatriculated: 'IMMATRIKULIERT!',
    winnerTitle: 'Regelstudienzeit geschafft!',
    winnerSubtitle: 'hat alle 4 Figuren ins Ziel gebracht und den Abschluss geholt!',
    playAgain: 'Noch ein Semester',
    eventLogTitle: 'Prüfungsprotokoll',
    noEventsYet: 'Noch keine Vorkommnisse im Semester.',
    rulesHint: '6 = Immatrikulation & Bonuswurf · Gleiches Feld = 1v1 Duell (Gleichstand wird neu gewürfelt)',
    webrtcHostTitle: 'Online-Einladung (P2P)',
    webrtcCreateInvite: 'Einladung erstellen',
    webrtcCopyInviteUrl: 'Invite-Link kopieren',
    webrtcCopyOfferCode: 'Offer-Code kopieren',
    webrtcPasteAnswer: 'Answer-Code vom Gast einfügen…',
    webrtcConnectBtn: 'Verbinden',
    webrtcConnected: 'Verbunden!',
    webrtcWaitingAnswer: 'Warte auf Answer-Code…',
    webrtcGuestTitle: 'Online-Spiel beitreten (WebRTC P2P)',
    webrtcGuestHint: 'Gib deinen Namen ein, füge den Offer-Code (oder öffne den Invite-Link) des Hosts ein, generiere deinen Answer-Code und schicke ihn zurück.',
    webrtcGuestNameLabel: 'Dein Name',
    webrtcGuestNamePlaceholder: 'z.B. Alex',
    webrtcPasteOffer: 'Offer-Code hier einfügen…',
    webrtcCreateAnswer: 'Answer-Code erzeugen',
    webrtcCopyAnswer: 'Answer-Code kopieren',
    webrtcJoinWait: 'Warte auf Host-Verbindung…',
    webrtcWaitingRoom: 'Verbunden im Wartezimmer — Warte auf Spielstart durch Host…',
    webrtcLeaveRoom: 'Verbindung trennen',
    webrtcLeaveGame: 'Spiel verlassen',
    webrtcResetSeat: 'Trennen / Reset',
    webrtcDisconnectedBanner: 'Verbindung verloren:',
    webrtcTakeOverBot: 'Als Bot übernehmen',
    copied: 'Kopiert!',
    soundOn: 'Ton an',
    soundOff: 'Ton aus',
  },
  en: {
    title: 'Mensch exmatrikuliere dich nicht',
    subtitle: 'The academic board game with 1v1 Exmatriculation Duels',
    backToLobby: 'Back to Setup',
    newGame: 'New Semester',
    startGame: 'Start Semester',
    players: 'Students (2–4 Seats)',
    seatHumanLocal: 'Human (Local)',
    seatBot: 'Classmate (Bot)',
    seatRemote: 'Online (WebRTC)',
    yourTurn: 'Your turn!',
    waitRoll: 'Roll the die!',
    selectPawn: 'Pick a pawn',
    duelRollPrompt: 'Exmatriculation Duel!',
    duelResultPrompt: 'Verdict reached',
    rollDice: 'Roll Die',
    rolling: 'Rolling…',
    attempt: 'Attempt',
    botThinking: 'is thinking…',
    waitingForPlayer: 'is up…',
    immatriculation: 'Immatriculation',
    exmatriculation: 'Exmatriculation',
    duelTitle: '1v1 Exmatriculation Duel',
    attacker: 'Attacker',
    defender: 'Defender',
    duelTie: 'Tie! Roll again!',
    duelRollBtn: 'Roll Duel Dice!',
    duelContinueBtn: 'Continue',
    stampExmatriculated: 'EXMATRICULATED!',
    stampDefended: 'DEFENDED!',
    stampImmatriculated: 'IMMATRICULATED!',
    winnerTitle: 'Graduated on Time!',
    winnerSubtitle: 'brought all 4 pawns to the finish and earned their degree!',
    playAgain: 'Play Again',
    eventLogTitle: 'Exam Log',
    noEventsYet: 'No events recorded this semester yet.',
    rulesHint: '6 = Immatriculation & bonus roll · Landing on opponent = 1v1 Duel (ties re-roll)',
    webrtcHostTitle: 'Online Invite (P2P)',
    webrtcCreateInvite: 'Create Invite',
    webrtcCopyInviteUrl: 'Copy Invite Link',
    webrtcCopyOfferCode: 'Copy Offer Code',
    webrtcPasteAnswer: 'Paste guest Answer code…',
    webrtcConnectBtn: 'Connect',
    webrtcConnected: 'Connected!',
    webrtcWaitingAnswer: 'Waiting for Answer code…',
    webrtcGuestTitle: 'Join Online Game (WebRTC P2P)',
    webrtcGuestHint: 'Enter your name, paste the host Offer code (or open their Invite link), generate your Answer code, and send it back.',
    webrtcGuestNameLabel: 'Your Name',
    webrtcGuestNamePlaceholder: 'e.g. Alex',
    webrtcPasteOffer: 'Paste Offer code here…',
    webrtcCreateAnswer: 'Generate Answer',
    webrtcCopyAnswer: 'Copy Answer Code',
    webrtcJoinWait: 'Waiting for host connection…',
    webrtcWaitingRoom: 'Connected in Waiting Room — Waiting for host to start…',
    webrtcLeaveRoom: 'Leave Room',
    webrtcLeaveGame: 'Leave Game',
    webrtcResetSeat: 'Disconnect / Reset',
    webrtcDisconnectedBanner: 'Connection lost:',
    webrtcTakeOverBot: 'Take over as Bot',
    copied: 'Copied!',
    soundOn: 'Sound On',
    soundOff: 'Sound Off',
  },
};
