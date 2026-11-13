import type { DrawnCard } from './types';

export const CHANCE_CARDS: DrawnCard[] = [
  {
    id: 'ch_start',
    deck: 'chance',
    title: { de: 'Theoriephase-Start!', en: 'Theory Phase Begins!' },
    description: {
      de: 'Rücke vor bis zur Theoriephase (LOS) und kassiere 200 € Ausbildungsvergütung.',
      en: 'Advance to Theory Phase (GO) and collect 200 € stipend.',
    },
    effect: { kind: 'move_to', tileIndex: 0, collectStart: true },
  },
  {
    id: 'ch_rektorat',
    deck: 'chance',
    title: { de: 'Dualer Partner übernimmt!', en: 'Corporate Partner Offer!' },
    description: {
      de: 'Rücke vor bis zu Dualer Partner & Rektorat.',
      en: 'Advance to Partner & Rectorate.',
    },
    effect: { kind: 'move_to', tileIndex: 39, collectStart: true },
  },
  {
    id: 'ch_bib',
    deck: 'chance',
    title: { de: 'Nachtschicht in der DHBW-Bib', en: 'Library All-Nighter' },
    description: {
      de: 'Rücke vor bis zur DHBW-Fachbibliothek. Über LOS ziehst du 200 € ein.',
      en: 'Advance to DHBW Library. Collect 200 € if you pass GO.',
    },
    effect: { kind: 'move_to', tileIndex: 26, collectStart: true },
  },
  {
    id: 'ch_hoersaal',
    deck: 'chance',
    title: { de: 'Anwesenheitspflicht im A-Bau!', en: 'Mandatory Lecture in A!' },
    description: {
      de: 'Rücke vor bis zum A-Bau Hörsaal. Über LOS gibt es 200 €.',
      en: 'Advance to Building A Hall. Collect 200 € if you pass GO.',
    },
    effect: { kind: 'move_to', tileIndex: 11, collectStart: true },
  },
  {
    id: 'ch_transit',
    deck: 'chance',
    title: { de: 'KVV-Kontrolle in der Linie 1', en: 'KVV Ticket Inspection' },
    description: {
      de: 'Rücke vor zur nächsten KVV-Haltestelle. Falls sie jemandem gehört, zahle doppelte Miete.',
      en: 'Advance to the nearest KVV stop. If owned, pay double rent.',
    },
    effect: { kind: 'nearest_transit', doubleRent: true },
  },
  {
    id: 'ch_back3',
    deck: 'chance',
    title: { de: 'Dualis-Server down', en: 'Dualis Server Down' },
    description: {
      de: 'Gehe 3 Felder zurück.',
      en: 'Move back 3 spaces.',
    },
    effect: { kind: 'move_relative', steps: -3 },
  },
  {
    id: 'ch_jail',
    deck: 'chance',
    title: { de: 'Praxisbericht-Frist verpasst!', en: 'Missed Report Deadline!' },
    description: {
      de: 'Gehe direkt ins Prüfungsamt (Dualis-Sperre). Ziehe kein Geld über LOS ein.',
      en: 'Go directly to Exam Office (Dualis Hold). Do not collect 200 €.',
    },
    effect: { kind: 'goto_jail' },
  },
  {
    id: 'ch_jail_card',
    deck: 'chance',
    title: { de: 'Gelber Schein / Freikarte', en: 'Medical Excuse Card' },
    description: {
      de: 'Komme kostenlos aus der Prüfungsamt-Sperre frei. Behalte diese Karte.',
      en: 'Get out of Exam Office Hold free. Keep this card.',
    },
    effect: { kind: 'jail_card' },
  },
  {
    id: 'ch_repairs',
    deck: 'chance',
    title: { de: 'Brandschutz im C-Bau', en: 'Building C Renovation' },
    description: {
      de: 'Zahle 25 € pro Tutorium und 100 € pro Lehrstuhl.',
      en: 'Pay 25 € per Tutorial and 100 € per Chair.',
    },
    effect: { kind: 'repairs', perHouse: 25, perHotel: 100 },
  },
  {
    id: 'ch_tutor_pay',
    deck: 'chance',
    title: { de: 'Ausbildungsvergütung ausgezahlt', en: 'Company Stipend Paid' },
    description: {
      de: 'Dein Dualer Partner überweist 150 € Bonus.',
      en: 'Your corporate partner transfers a 150 € bonus.',
    },
    effect: { kind: 'cash', amount: 150 },
  },
  {
    id: 'ch_coffee_fine',
    deck: 'chance',
    title: { de: 'Kaffee-Flatrate im Casino', en: 'Casino Espresso Tab' },
    description: {
      de: 'Zahle 50 € für die StuV-Kaffeemaschine.',
      en: 'Pay 50 € for the StuV espresso machine.',
    },
    effect: { kind: 'cash', amount: -50 },
  },
  {
    id: 'ch_party_host',
    deck: 'chance',
    title: { de: 'StuV-Ersti-Party', en: 'StuV Freshers Party' },
    description: {
      de: 'Zahle jedem Mitspieler 50 € für Getränke in der Nordstadt.',
      en: 'Pay each player 50 € for drinks in Nordstadt.',
    },
    effect: { kind: 'pay_to_all', amount: 50 },
  },
];

export const CHEST_CARDS: DrawnCard[] = [
  {
    id: 'cc_bafoeg',
    deck: 'chest',
    title: { de: 'Ausbildungsvergütung-Bonus', en: 'Partner Bonus' },
    description: {
      de: 'Dein Dualer Partner zahlt Weihnachtsgeld: Du erhältst 200 €.',
      en: 'Your corporate partner pays a bonus: collect 200 €.',
    },
    effect: { kind: 'cash', amount: 200 },
  },
  {
    id: 'cc_books',
    deck: 'chest',
    title: { de: 'Altklausuren geteilt', en: 'Shared Past Exams' },
    description: {
      de: 'Erstis spendieren dir 50 € für deine Zusammenfassungen.',
      en: 'Freshmen chip in 50 € for your lecture notes.',
    },
    effect: { kind: 'cash', amount: 50 },
  },
  {
    id: 'cc_tax_refund',
    deck: 'chest',
    title: { de: 'KVV-Studikarte erstattet', en: 'KVV Ticket Refund' },
    description: {
      de: 'Fahrtkosten abgesetzt! Du bekommst 100 €.',
      en: 'Commute costs reimbursed! Collect 100 €.',
    },
    effect: { kind: 'cash', amount: 100 },
  },
  {
    id: 'cc_stipend',
    deck: 'chest',
    title: { de: 'Bestandene T3000-Arbeit', en: 'Passed T3000 Thesis' },
    description: {
      de: 'Top-Bewertung in Dualis! Kassiere 100 €.',
      en: 'Top grade in Dualis! Collect 100 €.',
    },
    effect: { kind: 'cash', amount: 100 },
  },
  {
    id: 'cc_birthday',
    deck: 'chest',
    title: { de: 'Bachelorarbeit abgegeben!', en: 'Bachelor Thesis Submitted!' },
    description: {
      de: 'Alle stoßen mit dir an: Kassiere 20 € von jedem Mitspieler.',
      en: 'Everyone celebrates with you: collect 20 € from each player.',
    },
    effect: { kind: 'collect_from_all', amount: 20 },
  },
  {
    id: 'cc_print',
    deck: 'chest',
    title: { de: 'Druckerkonto in der Bib leer', en: 'Library Printer Empty' },
    description: {
      de: 'Zahle 50 € für den Bindedruck deiner Projektarbeit.',
      en: 'Pay 50 € for binding your project report.',
    },
    effect: { kind: 'cash', amount: -50 },
  },
  {
    id: 'cc_doctor',
    deck: 'chest',
    title: { de: 'Menseria-Pfand verloren', en: 'Menseria Deposit Lost' },
    description: {
      de: 'Zahle 100 € für verlorene Mehrwegbecher.',
      en: 'Pay 100 € for lost reusable mugs.',
    },
    effect: { kind: 'cash', amount: -100 },
  },
  {
    id: 'cc_jail_card',
    deck: 'chest',
    title: { de: 'Gelber Schein / Freikarte', en: 'Medical Excuse Card' },
    description: {
      de: 'Komme kostenlos aus der Prüfungsamt-Sperre frei. Behalte diese Karte.',
      en: 'Get out of Exam Office Hold free. Keep this card.',
    },
    effect: { kind: 'jail_card' },
  },
  {
    id: 'cc_jail',
    deck: 'chest',
    title: { de: 'Plagiatsverdacht in T2000!', en: 'Citation Audit in T2000!' },
    description: {
      de: 'Gehe direkt ins Prüfungsamt (Dualis-Sperre). Ziehe kein Geld ein.',
      en: 'Go directly to Exam Office (Dualis Hold). Do not collect 200 €.',
    },
    effect: { kind: 'goto_jail' },
  },
  {
    id: 'cc_start',
    deck: 'chest',
    title: { de: 'Praxisphase abgeschlossen!', en: 'Practice Phase Completed!' },
    description: {
      de: 'Rücke vor bis zur Theoriephase (LOS) und kassiere 200 €.',
      en: 'Advance to Theory Phase (GO) and collect 200 €.',
    },
    effect: { kind: 'move_to', tileIndex: 0, collectStart: true },
  },
  {
    id: 'cc_repairs',
    deck: 'chest',
    title: { de: 'Labor-Instandhaltung', en: 'Lab Maintenance' },
    description: {
      de: 'Zahle 40 € pro Tutorium und 115 € pro Lehrstuhl.',
      en: 'Pay 40 € per Tutorial and 115 € per Chair.',
    },
    effect: { kind: 'repairs', perHouse: 40, perHotel: 115 },
  },
  {
    id: 'cc_prize',
    deck: 'chest',
    title: { de: 'StuV-Hackathon-Preis', en: 'StuV Hackathon Prize' },
    description: {
      de: 'Dein Team gewinnt Platz 2: Kassiere 25 €.',
      en: 'Your team wins 2nd place: collect 25 €.',
    },
    effect: { kind: 'cash', amount: 25 },
  },
];

export const CARD_BY_ID: Record<string, DrawnCard> = Object.fromEntries(
  [...CHANCE_CARDS, ...CHEST_CARDS].map((c) => [c.id, c])
);
