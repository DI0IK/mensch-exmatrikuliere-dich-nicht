import React from 'react';
import type { Language } from '../types/game';
import { Button, StampBadge } from '../ui';

export interface GameRuleOption {
  id: string;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

interface GameRulesSectionProps {
  language: Language;
  isGuest: boolean;
  badge?: string;
  options: GameRuleOption[];
}

export const GameRulesSection: React.FC<GameRulesSectionProps> = ({
  language,
  isGuest,
  badge,
  options,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.95rem' }}>
          {language === 'de' ? 'Spielregeln' : 'Game Rules'}
        </strong>
        {badge && (
          <StampBadge variant="immatrikuliert" style={{ fontSize: '0.68rem' }}>
            {badge}
          </StampBadge>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
        }}
      >
        {options.map((opt) => (
          <Button
            key={opt.id}
            role="switch"
            aria-checked={opt.active}
            disabled={isGuest}
            onClick={opt.onToggle}
            style={{
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '10px 12px',
              gap: '12px',
              background: opt.active ? '#fff7e0' : '#f5efe4',
              borderColor: opt.active ? 'var(--ink)' : '#c9b493',
            }}
          >
            <span>
              <strong style={{ display: 'block', fontSize: '0.88rem' }}>{opt.title}</strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
                {opt.description}
              </span>
            </span>
            <span style={{ fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
              {opt.active ? '✓' : '—'}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
