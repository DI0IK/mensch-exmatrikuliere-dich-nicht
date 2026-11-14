import type { GameDefinition } from '../shared/collection/types';
import { KniffelApp } from './kniffel/KniffelApp';
import { MednApp } from './medn/MednApp';
import { MonopolyApp } from './monopoly/MonopolyApp';
import { UnoApp } from './uno/UnoApp';

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
  {
    id: 'kniffel',
    icon: '🎯',
    title: {
      de: 'ECTS-Kniffel',
      en: 'ECTS Yahtzee',
    },
    subtitle: {
      de: 'Würfle deinen Studienabschluss zusammen',
      en: 'Roll your way to graduation',
    },
    description: {
      de: 'Sammle ECTS-Punkte in 13 Modulen, sichere dir den Regelstudienzeit-Bonus und nutze im Prüfungsamt-Modus Spickzettel-Chips.',
      en: 'Score ECTS credits across 13 modules, earn the Standard-Period Bonus, and spend Cheat-Sheet tokens in Exam Office mode.',
    },
    minPlayers: 2,
    maxPlayers: 8,
    badge: {
      de: 'MODULHANDBUCH',
      en: 'MODULE HANDBOOK',
    },
    component: KniffelApp,
  },
  {
    id: 'uno',
    icon: '🃏',
    title: {
      de: 'Prüfungs-UNO',
      en: 'Exam UNO',
    },
    subtitle: {
      de: 'Werde deine Prüfungsleistungen los',
      en: 'Shed your exam cards before anyone else',
    },
    description: {
      de: 'Lege Module nach Farbe oder Wert ab, stapele Nachschreibetermine (+2/+4) und überstehe im Härtefall-Modus Dekanat-Tausch und Plagiatsverdacht.',
      en: 'Match modules by color or value, stack Retake (+2/+4) penalties, and survive Dean Swaps and Plagiarism Audits in Hardship mode.',
    },
    minPlayers: 2,
    maxPlayers: 8,
    badge: {
      de: 'PRÜFUNGSORDNUNG',
      en: 'EXAM RULES',
    },
    component: UnoApp,
  },
];
