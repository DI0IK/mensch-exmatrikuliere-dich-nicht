import type { GameSettings, Language } from './types';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  turboStart: false,
  freeParkingPot: true,
  auctions: true,
  doubleOnStart: false,
};

export function normalizeGameSettings(settings?: Partial<GameSettings> | null): GameSettings {
  return {
    turboStart: Boolean(settings?.turboStart),
    freeParkingPot: settings?.freeParkingPot ?? DEFAULT_GAME_SETTINGS.freeParkingPot,
    auctions: settings?.auctions ?? DEFAULT_GAME_SETTINGS.auctions,
    doubleOnStart: Boolean(settings?.doubleOnStart),
  };
}

export interface GameModeOption {
  id: keyof GameSettings;
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
    id: 'turboStart',
    icon: '⚡',
    accentColor: '#c93b2b',
    activeBg: '#fdf2f0',
    guestBadgeClass: 'stamp-exmatrikuliert',
    label: {
      de: 'Turbo-Start (Schnellstart)',
      en: 'Turbo Start (Fast Setup)',
    },
    description: {
      de: 'Jeder Studi erhält zu Beginn 2 zufällige Campus-Grundstücke gratis für schnellere Duelle.',
      en: 'Each player starts with 2 random campus properties for a faster early game.',
    },
    activeText: { de: 'AN', en: 'ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.turboStart,
    toggle: (s) => ({ ...s, turboStart: !s.turboStart }),
  },
  {
    id: 'freeParkingPot',
    icon: '🌿',
    accentColor: '#226b40',
    activeBg: '#f2f9f4',
    guestBadgeClass: 'stamp-immatrikuliert',
    label: {
      de: 'Campus-Kasse (Frei Parken)',
      en: 'Campus Pot (Free Parking)',
    },
    description: {
      de: 'Steuern & Gebühren landen auf der Campus-Wiese — wer dort landet, kassiert den Topf.',
      en: 'Taxes & fines collect on Campus Lawn — landing there awards the entire pot.',
    },
    activeText: { de: 'AN', en: 'ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.freeParkingPot,
    toggle: (s) => ({ ...s, freeParkingPot: !s.freeParkingPot }),
  },
  {
    id: 'auctions',
    icon: '🔨',
    accentColor: '#255c99',
    activeBg: '#f1f6fc',
    guestBadgeClass: 'stamp-immatrikuliert',
    label: {
      de: 'Auktionen bei Verzicht',
      en: 'Property Auctions',
    },
    description: {
      de: 'Wird ein Grundstück nicht gekauft, kommt es sofort unter alle Studis zur Versteigerung.',
      en: 'Declined properties are immediately auctioned off among all active players.',
    },
    activeText: { de: 'AN', en: 'ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.auctions,
    toggle: (s) => ({ ...s, auctions: !s.auctions }),
  },
  {
    id: 'doubleOnStart',
    icon: '🎓',
    accentColor: '#b7791f',
    activeBg: '#fdf8ec',
    guestBadgeClass: 'stamp-immatrikuliert',
    label: {
      de: 'Doppeltes BAföG auf LOS',
      en: 'Double BAföG on GO',
    },
    description: {
      de: 'Wer exakt auf „Semesterstart (LOS)“ landet, erhält 400 € statt 200 €.',
      en: 'Landing directly on Semester Start (GO) awards 400 € instead of 200 €.',
    },
    activeText: { de: 'AN', en: 'ON' },
    inactiveText: { de: 'AUS', en: 'OFF' },
    isActive: (s) => s.doubleOnStart,
    toggle: (s) => ({ ...s, doubleOnStart: !s.doubleOnStart }),
  },
];
