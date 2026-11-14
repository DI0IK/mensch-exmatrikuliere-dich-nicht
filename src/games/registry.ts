import type { GameDefinition } from '../shared/collection/types';
import { MednApp } from './medn/MednApp';
import { MonopolyApp } from './monopoly/MonopolyApp';

export const GAME_COLLECTION: GameDefinition[] = [
  {
    id: 'medn',
    icon: '🎲',
    title: {
      de: 'Mensch exmatrikuliere dich nicht',
      en: 'Mensch exmatrikuliere dich nicht',
    },
    subtitle: {
      de: 'Das akademische Brettspiel mit 1v1-Duellen',
      en: 'The academic board game with 1v1 duels',
    },
    description: {
      de: 'Bringe alle 4 Figuren ins Ziel, weiche Exmatrikulationen aus und nutze im Ultra-Hardcore-Modus akademische Superkräfte.',
      en: 'Bring all 4 pawns to the finish, survive exmatriculation duels, and unleash academic superpowers in Ultra Hardcore mode.',
    },
    minPlayers: 2,
    maxPlayers: 4,
    badge: {
      de: 'PO 2026',
      en: 'PO 2026',
    },
    component: MednApp,
  },
  {
    id: 'monopoly',
    icon: '🏛️',
    title: {
      de: 'DHBW Karlsruhe Monopoly',
      en: 'DHBW Karlsruhe Monopoly',
    },
    subtitle: {
      de: 'Campus-Grundstücke, Tutorien & Lehrstühle',
      en: 'Campus properties, tutorials & chairs',
    },
    description: {
      de: 'Kaufe Vorlesungssäle, Mensen und KVV-Linien rund um den Nordstadt-Campus, handle mit Mitspielern und vermeide das Prüfungsamt.',
      en: 'Acquire lecture halls, cafeterias, and transit lines around Nordstadt Campus, trade with rivals, and stay out of the Exam Office.',
    },
    minPlayers: 2,
    maxPlayers: 4,
    badge: {
      de: 'CAMPUS EDITION',
      en: 'CAMPUS EDITION',
    },
    component: MonopolyApp,
  },
];
