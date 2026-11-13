import type { GameSettings, Language } from './types';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  hardcore: false,
  duelMode: 'classic',
};

export function normalizeGameSettings(partial?: Partial<GameSettings> | null): GameSettings {
  return {
    hardcore: partial?.hardcore ?? DEFAULT_GAME_SETTINGS.hardcore,
    duelMode: partial?.duelMode ?? DEFAULT_GAME_SETTINGS.duelMode,
  };
}

export interface GameModeOption {
  id: string;
  icon: string;
  accentColor: string;
  activeBg: string;
  guestBadgeClass: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  activeText: Record<Language, string>;
  inactiveText: Record<Language, string>;
  isActive: (settings: GameSettings) => boolean;
  toggle: (settings: GameSettings) => GameSettings;
}

export const GAME_MODE_OPTIONS: GameModeOption[] = [
  {
    id: 'hardcore',
    icon: '🔥',
    accentColor: 'var(--stamp-red)',
    activeBg: '#fdf1ef',
    guestBadgeClass: 'stamp-exmatrikuliert',
    label: { de: 'Hardcore-Modus', en: 'Hardcore Mode' },
    description: {
      de: '🍽️ Mensa, ☕ Bib, 📝 Prüfungsamt, 🍺 Party & 🎲 6-6-6 (50/50 Sofortsieg oder Zwangsexmatrikulation!).',
      en: '🍽️ Cafeteria, ☕ Library, 📝 Exam Office, 🍺 Party & 🎲 6-6-6 (50/50 instant win or full reset!).',
    },
    activeText: { de: '🔥 AN', en: '🔥 ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.hardcore,
    toggle: (s) => ({ ...s, hardcore: !s.hardcore }),
  },
  {
    id: 'push-duel',
    icon: '⚔️',
    accentColor: 'var(--c-blau)',
    activeBg: '#eef5fc',
    guestBadgeClass: 'stamp-immatrikuliert',
    label: { de: '1v1-Duell: Augensumme', en: '1v1 Duel: Push Mode' },
    description: {
      de: 'Statt Wohnheim: Sieger zieht Verlierer-Augensumme vor, Verlierer Sieger-Augensumme zurück (inkl. Ketten-1v1!).',
      en: 'Instead of base: winner moves +loser sum forward, loser moves -winner sum back (with chain 1v1s!).',
    },
    activeText: { de: '⚔️ AN', en: '⚔️ ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.duelMode === 'push',
    toggle: (s) => ({ ...s, duelMode: s.duelMode === 'push' ? 'classic' : 'push' }),
  },
];
