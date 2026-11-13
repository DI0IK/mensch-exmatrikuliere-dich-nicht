import type { Language, PlayerColor, SeatType } from '../../game/types';

export interface RemoteSlotUI {
  offerCode: string;
  answerInput: string;
  connected: boolean;
  creating: boolean;
  error: string | null;
}

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

export const DEFAULT_EMOJI: Record<PlayerColor, string> = {
  rot: '💻',
  blau: '⚖️',
  gelb: '📈',
  gruen: '🩺',
};

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
