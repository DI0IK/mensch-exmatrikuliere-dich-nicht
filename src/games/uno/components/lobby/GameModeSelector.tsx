import React from 'react';
import { GameRulesSection } from '../../../../shared/components/GameRulesSection';
import type { Language } from '../../../../shared/types/game';
import type { GameSettings } from '../../game/types';

interface GameModeSelectorProps {
  language: Language;
  isGuest: boolean;
  settings: GameSettings;
  lobbySettings: GameSettings | null;
  onChangeSettings: (next: GameSettings) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  language,
  isGuest,
  settings,
  lobbySettings,
  onChangeSettings,
}) => {
  const effective = isGuest && lobbySettings ? lobbySettings : settings;

  return (
    <GameRulesSection
      language={language}
      isGuest={isGuest}
      options={[
        {
          id: 'campusChaos',
          title:
            language === 'de'
              ? '🃏 Campus-Chaos-Karten (Twist)'
              : '🃏 Campus Chaos Cards (Twist)',
          description:
            language === 'de'
              ? 'Fügt Gruppenarbeit (Handtausch) & Altklausur (Kartenklau) ins Deck hinzu.'
              : 'Adds Group Work (swap hands) & Past Exam (steal card) to the deck.',
          active: effective.campusChaos,
          onToggle: () =>
            onChangeSettings({ ...effective, campusChaos: !effective.campusChaos }),
        },
        {
          id: 'stackDrawCards',
          title: language === 'de' ? '🔥 +2 / +4 Stapeln' : '🔥 Stack +2 / +4',
          description:
            language === 'de'
              ? 'Auf +2 oder +4 darf eine weitere Ziehkarte gelegt werden.'
              : 'Allow stacking another draw card onto +2 or +4.',
          active: effective.stackDrawCards,
          onToggle: () =>
            onChangeSettings({ ...effective, stackDrawCards: !effective.stackDrawCards }),
        },
      ]}
    />
  );
};
