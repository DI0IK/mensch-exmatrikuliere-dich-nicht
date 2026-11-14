export type Language = 'de' | 'en';

export type PlayerColor = 'rot' | 'blau' | 'gelb' | 'gruen';

export type SeatType = 'human-local' | 'human-remote' | 'bot';

export interface BasePlayerConfig {
  color: PlayerColor;
  name: string;
  seatType: SeatType;
  active: boolean;
  major?: string;
  emoji?: string;
}

export type BaseNetMessage<
  TState = unknown,
  TAction = unknown,
  TSettings = unknown,
  TPlayer extends BasePlayerConfig = BasePlayerConfig,
> =
  | { kind: 'WELCOME'; assignedSeat: number; state: TState | null }
  | { kind: 'LOBBY_SYNC'; players: TPlayer[]; settings?: TSettings }
  | { kind: 'SET_NAME'; name: string }
  | { kind: 'SET_PROFILE'; major?: string; emoji?: string; extra?: Record<string, unknown> }
  | { kind: 'GUEST_PROFILE'; name: string; major?: string; emoji?: string }
  | { kind: 'STATE_SYNC'; state: TState }
  | { kind: 'RETURN_TO_LOBBY' }
  | { kind: 'LEAVE_GAME' }
  | { kind: 'ROOM_ERROR'; message: string }
  | { kind: 'PLAYER_ACTION'; action: TAction };

export const DEFAULT_NAMES: Record<SeatType, string[]> = {
  'human-local': ['Studi 1', 'Studi 2', 'Studi 3', 'Studi 4'],
  'human-remote': ['Online-Studi 1', 'Online-Studi 2', 'Online-Studi 3', 'Online-Studi 4'],
  bot: ['Maschbau-Max', 'BWL-Justus', 'Info-Klara', 'Jura-Leo'],
};

export const ALL_DEFAULT_NAMES = new Set(Object.values(DEFAULT_NAMES).flat());

export const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

export const COLOR_LABELS: Record<Language, Record<PlayerColor, string>> = {
  de: { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün' },
  en: { rot: 'Red', blau: 'Blue', gelb: 'Yellow', gruen: 'Green' },
};

export const DEFAULT_EMOJI: Record<PlayerColor, string> = {
  rot: '💻',
  blau: '⚖️',
  gelb: '📈',
  gruen: '🩺',
};

export const DEFAULT_BASE_PLAYERS: BasePlayerConfig[] = [
  { color: 'rot', name: 'Studi 1', seatType: 'human-local', active: true, major: 'Informatik', emoji: '💻' },
  { color: 'blau', name: 'Jura-Leo', seatType: 'bot', active: true, major: 'Jura', emoji: '⚖️' },
  { color: 'gelb', name: 'BWL-Justus', seatType: 'bot', active: true, major: 'BWL', emoji: '📈' },
  { color: 'gruen', name: 'Med-Klara', seatType: 'bot', active: true, major: 'Medizin', emoji: '🩺' },
];

export const MAJOR_SUGGESTIONS: Record<Language, string[]> = {
  de: [
    'Informatik',
    'Jura',
    'BWL',
    'Medizin',
    'Maschinenbau',
    'Psychologie',
    'Physik',
    'Mathematik',
    'Architektur',
    'Lehramt',
    'Biologie',
    'Kunst',
  ],
  en: [
    'Computer Science',
    'Law',
    'Business',
    'Medicine',
    'Mechanical Engineering',
    'Psychology',
    'Physics',
    'Mathematics',
    'Architecture',
    'Education',
    'Biology',
    'Fine Arts',
  ],
};

export const EMOJI_PRESETS = ['🎓', '💻', '⚖️', '📈', '🩺', '⚙️', '🧠', '🔬', '📐', '🎨', '📚', '☕', '🍺', '🦉', '🚀', '⚡'];
