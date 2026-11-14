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
          id: 'twistMode',
          title:
            language === 'de'
              ? '📝 Spickzettel-Modus (Twist)'
              : '📝 Cheat-Sheet Mode (Twist)',
          description:
            language === 'de'
              ? 'Verdiene Spickzettel für Extra-Würfe, Würfel-Korrektur & Kategorie-Sperren.'
              : 'Earn Cheat-Sheets for extra rolls, die correction & category locks.',
          active: effective.twistMode,
          onToggle: () => onChangeSettings({ ...effective, twistMode: !effective.twistMode }),
        },
      ]}
    />
  );
};
