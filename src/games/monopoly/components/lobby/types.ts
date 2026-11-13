import type { Language, PlayerColor, SeatType } from '../../game/types';

export const DEFAULT_NAMES: Record<SeatType, string[]> = {
  'human-local': ['Studi 1', 'Studi 2', 'Studi 3', 'Studi 4'],
  'human-remote': ['Online-Studi 1', 'Online-Studi 2', 'Online-Studi 3', 'Online-Studi 4'],
  bot: ['WI-Leo', 'BWL-Justus', 'ET-Klara', 'Maschbau-Max'],
};

export const ALL_DEFAULT_NAMES = new Set(Object.values(DEFAULT_NAMES).flat());

export const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

export const MAJOR_SUGGESTIONS: Record<Language, string[]> = {
  de: [
    'Informatik',
    'Wirtschaftsinformatik',
    'BWL-Industrie',
    'BWL-Handel',
    'Digital Business Management',
    'Maschinenbau',
    'Mechatronik',
    'Elektrotechnik',
    'Wirtschaftsingenieurwesen',
    'Data Science',
    'Steuern & Prüfungswesen',
    'Sustainable Science',
  ],
  en: [
    'Computer Science',
    'Business Informatics',
    'Industrial Management',
    'Retail Management',
    'Digital Business Management',
    'Mechanical Engineering',
    'Mechatronics',
    'Electrical Engineering',
    'Industrial Engineering',
    'Data Science',
    'Tax & Auditing',
    'Sustainable Science',
  ],
};

export const EMOJI_PRESETS = [
  '🎓',
  '💻',
  '⚖️',
  '📈',
  '🩺',
  '⚙️',
  '🧠',
  '🔬',
  '📐',
  '🎨',
  '📚',
  '☕',
  '🍺',
  '🦉',
  '🚀',
  '⚡',
];
