import React from 'react';
import { GameRulesSection } from '../../../../shared/components/GameRulesSection';
import { GAME_MODE_OPTIONS, normalizeGameSettings } from '../../game/modes';
import type { GameSettings, Language } from '../../game/types';

interface GameModeSelectorProps {
  language: Language;
  isGuest: boolean;
  settings: GameSettings;
  lobbySettings: GameSettings | null;
  onChangeSettings: (settings: GameSettings) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  language,
  isGuest,
  settings,
  lobbySettings,
  onChangeSettings,
}) => {
  const effectiveSettings = normalizeGameSettings(isGuest ? lobbySettings : settings);

  return (
    <GameRulesSection
      language={language}
      isGuest={isGuest}
      options={GAME_MODE_OPTIONS.map((mode) => ({
        id: mode.id,
        title: `${mode.icon} ${mode.label[language]}`,
        description: mode.description[language],
        active: mode.isActive(effectiveSettings),
        onToggle: () => onChangeSettings(mode.toggle(settings)),
      }))}
    />
  );
};
