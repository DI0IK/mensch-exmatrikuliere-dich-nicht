import type React from 'react';
import type { Language } from '../types/game';

export interface GameComponentProps {
  language: Language;
  muted: boolean;
  onToggleLanguage: () => void;
  onToggleMute: () => void;
  onBackToGames: () => void;
}

export interface GameDefinition {
  id: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  description: Record<Language, string>;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  badge?: Record<Language, string>;
  component: React.ComponentType<GameComponentProps>;
}
