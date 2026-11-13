import React from 'react';

interface DieFaceProps {
  value: number | null;
  size?: number;
  rolling?: boolean;
  accentColor?: string;
}

const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

export const DieFace: React.FC<DieFaceProps> = ({
  value,
  size = 56,
  rolling = false,
  accentColor = '#231d17',
}) => {
  const pips = value && PIP_POSITIONS[value] ? PIP_POSITIONS[value] : [];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={rolling ? 'animate-dice' : undefined}
      aria-label={value ? `Würfel ${value}` : 'Würfel'}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="18"
        fill="#fffdf7"
        stroke="#231d17"
        strokeWidth="5"
      />
      <rect
        x="11"
        y="11"
        width="78"
        height="78"
        rx="13"
        fill="none"
        stroke="#e6dac3"
        strokeWidth="2"
      />
      {value === null ? (
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="36"
          fontWeight="700"
          fontFamily="var(--font-stamp)"
          fill="#8c7d6b"
        >
          ?
        </text>
      ) : (
        pips.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r="8.5"
            fill={value === 6 ? '#c93b2b' : accentColor}
          />
        ))
      )}
    </svg>
  );
};
