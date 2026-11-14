import React from 'react';
import { COLOR_HEX, type Language } from '../../../shared/types/game';
import { CARD_VALUE_LABELS } from '../game/deck';
import type { CardColor, CardValue, UnoCard } from '../game/types';

function getCornerSymbol(value: CardValue): string {
  switch (value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
      return '★';
    case 'wild4':
      return '+4';
    case 'swapHands':
      return '🤝';
    case 'stealCard':
      return '🕵️';
    default:
      return value;
  }
}

function getShortFaceLabel(value: CardValue, language: Language): string | null {
  switch (value) {
    case 'skip':
      return language === 'de' ? 'Ausfall' : 'Skip';
    case 'reverse':
      return language === 'de' ? 'Richtung' : 'Reverse';
    case 'wild':
      return language === 'de' ? 'Fachwahl' : 'Wild';
    case 'swapHands':
      return language === 'de' ? 'Tausch' : 'Swap';
    case 'stealCard':
      return language === 'de' ? 'Klau' : 'Steal';
    default:
      return null;
  }
}

interface UnoCardViewProps {
  card: UnoCard;
  language: Language;
  activeColor?: CardColor;
  size?: 'md' | 'lg';
  playable?: boolean;
  dimmed?: boolean;
  style?: React.CSSProperties;
}

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  language,
  activeColor,
  size = 'md',
  playable = false,
  dimmed = false,
  style,
}) => {
  const meta = CARD_VALUE_LABELS[card.value];
  const corner = getCornerSymbol(card.value);
  const shortLabel = getShortFaceLabel(card.value, language);
  const ovalText = card.value === 'wild4' ? '+4' : meta.icon;
  const isWild = card.color === 'wild';
  const baseColor =
    card.color === 'wild'
      ? activeColor
        ? COLOR_HEX[activeColor]
        : '#231d17'
      : COLOR_HEX[card.color];

  const width = size === 'lg' ? 114 : 88;
  const height = size === 'lg' ? 158 : 124;

  return (
    <div
      title={meta.label[language]}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: size === 'lg' ? '14px' : '11px',
        padding: size === 'lg' ? '5px' : '4px',
        background: '#fffdf8',
        border: '2.5px solid var(--ink)',
        boxShadow: playable
          ? '0 8px 18px rgba(35, 29, 23, 0.28), 0 0 0 2.5px #d69618'
          : '3px 4px 0 rgba(35, 29, 23, 0.22)',
        opacity: dimmed ? 0.5 : 1,
        boxSizing: 'border-box',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: size === 'lg' ? '9px' : '7px',
          background: isWild && !activeColor
            ? 'linear-gradient(145deg, #2d2620 0%, #171310 100%)'
            : `linear-gradient(155deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
          color: '#fffdf8',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Top-left corner index */}
        <span
          style={{
            position: 'absolute',
            top: size === 'lg' ? '5px' : '4px',
            left: size === 'lg' ? '7px' : '5px',
            fontSize: size === 'lg' ? '0.86rem' : '0.72rem',
            fontWeight: 900,
            lineHeight: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {corner}
        </span>

        {/* Bottom-right corner index (inverted) */}
        <span
          style={{
            position: 'absolute',
            bottom: size === 'lg' ? '5px' : '4px',
            right: size === 'lg' ? '7px' : '5px',
            fontSize: size === 'lg' ? '0.86rem' : '0.72rem',
            fontWeight: 900,
            lineHeight: 1,
            transform: 'rotate(180deg)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {corner}
        </span>

        {/* Classic tilted center oval */}
        <div
          style={{
            width: size === 'lg' ? '76%' : '78%',
            height: size === 'lg' ? '56%' : '54%',
            borderRadius: '50%',
            background: isWild
              ? 'conic-gradient(#c93b2b 0deg 90deg, #255c99 90deg 180deg, #d69618 180deg 270deg, #2b7a4b 270deg 360deg)'
              : 'rgba(255, 253, 248, 0.94)',
            border: '2px solid rgba(35, 29, 23, 0.25)',
            transform: 'rotate(-16deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          <div
            style={{
              width: isWild ? '76%' : '100%',
              height: isWild ? '76%' : '100%',
              borderRadius: '50%',
              background: isWild ? '#fffdf8' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(16deg)',
            }}
          >
            <span
              style={{
                fontSize: size === 'lg' ? (ovalText.length > 1 ? '1.65rem' : '2rem') : (ovalText.length > 1 ? '1.2rem' : '1.45rem'),
                fontWeight: 900,
                lineHeight: 1,
                color: isWild ? '#231d17' : baseColor,
                textShadow: '0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              {ovalText}
            </span>
          </div>
        </div>

        {/* Short non-overlapping label for action/special cards */}
        {shortLabel && (
          <span
            style={{
              position: 'absolute',
              bottom: size === 'lg' ? '12px' : '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '1px 6px',
              borderRadius: '999px',
              background: 'rgba(24, 20, 16, 0.55)',
              textAlign: 'center',
              fontSize: size === 'lg' ? '0.6rem' : '0.5rem',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#fffdf8',
              whiteSpace: 'nowrap',
            }}
          >
            {shortLabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface UnoCardBackProps {
  size?: 'xs' | 'lg';
  style?: React.CSSProperties;
}

export const UnoCardBack: React.FC<UnoCardBackProps> = ({ size = 'lg', style }) => {
  const isMini = size === 'xs';
  const width = isMini ? 20 : 114;
  const height = isMini ? 28 : 158;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: isMini ? '4px' : '14px',
        padding: isMini ? '2px' : '5px',
        background: '#fffdf8',
        border: `${isMini ? '1.5px' : '2.5px'} solid var(--ink)`,
        boxShadow: isMini ? '1px 1px 0 rgba(35,29,23,0.2)' : '3px 4px 0 rgba(35,29,23,0.28)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: isMini ? '2px' : '9px',
          background: 'linear-gradient(145deg, #2b241d 0%, #181410 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: isMini ? '82%' : '76%',
            height: isMini ? '54%' : '46%',
            borderRadius: '50%',
            background: '#c93b2b',
            border: `${isMini ? '1px' : '2px'} solid #f7d378`,
            transform: 'rotate(-18deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!isMini && (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.05rem',
                letterSpacing: '0.04em',
                color: '#fff4cf',
                textShadow: '1px 1px 0 #231d17',
              }}
            >
              UNO
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
