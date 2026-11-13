import React from 'react';
import {
  BASE_COORDS_BY_COLOR,
  GOAL_COORDS_BY_COLOR,
  PLAYER_COLORS,
  START_INDEX_BY_COLOR,
  TRACK_COORDS,
  type GridCoord,
} from '../game/boardGeometry';
import type { GameState, Language, Pawn, PlayerColor } from '../game/types';

interface GameBoardProps {
  state: GameState;
  language: Language;
  canInteract: boolean;
  onSelectPawn: (pawnId: string) => void;
}

const COLOR_HEX: Record<PlayerColor, string> = {
  rot: '#c93b2b',
  blau: '#255c99',
  gelb: '#d69618',
  gruen: '#2b7a4b',
};

const COLOR_LIGHT: Record<PlayerColor, string> = {
  rot: '#f5cbc6',
  blau: '#c8ddf2',
  gelb: '#f7e5bc',
  gruen: '#c7e6d3',
};

function cellCenter(coord: GridCoord): { x: number; y: number } {
  return {
    x: coord.col * 100 + 50,
    y: coord.row * 100 + 50,
  };
}

function getPawnCoord(pawn: Pawn): GridCoord {
  if (pawn.location.zone === 'base') {
    return BASE_COORDS_BY_COLOR[pawn.color][pawn.location.slot];
  }
  if (pawn.location.zone === 'track') {
    return TRACK_COORDS[pawn.location.index];
  }
  return GOAL_COORDS_BY_COLOR[pawn.color][pawn.location.slot];
}

export const GameBoard: React.FC<GameBoardProps> = ({
  state,
  language,
  canInteract,
  onSelectPawn,
}) => {
  const trackPoints = TRACK_COORDS.map(cellCenter)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  // Build lookup of start tiles
  const startTileColors = new Map<number, PlayerColor>();
  PLAYER_COLORS.forEach((c) => {
    startTileColors.set(START_INDEX_BY_COLOR[c], c);
  });

  const legalSet = new Set(canInteract && state.phase === 'SELECT_PAWN' ? state.legalPawnIds : []);

  return (
    <div className="board-frame">
      <svg
        viewBox="0 0 1100 1100"
        style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
        role="img"
        aria-label="Mensch exmatrikuliere dich nicht Spielbrett"
      >
        <defs>
          <filter id="pawn-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#231d17" floodOpacity="0.32" />
          </filter>
          <radialGradient id="birch-sheen" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fcf7eb" />
            <stop offset="100%" stopColor="#efe4cc" />
          </radialGradient>
        </defs>

        {/* Board Surface */}
        <rect x="0" y="0" width="1100" height="1100" rx="28" fill="url(#birch-sheen)" />

        {/* Subtle Corner Wohnheim Frames */}
        {[
          { color: 'rot' as PlayerColor, x: 4, y: 4, label: language === 'de' ? 'WOHNHEIM' : 'DORM' },
          { color: 'blau' as PlayerColor, x: 904, y: 4, label: language === 'de' ? 'WOHNHEIM' : 'DORM' },
          { color: 'gelb' as PlayerColor, x: 904, y: 904, label: language === 'de' ? 'WOHNHEIM' : 'DORM' },
          { color: 'gruen' as PlayerColor, x: 4, y: 904, label: language === 'de' ? 'WOHNHEIM' : 'DORM' },
        ].map(({ color, x, y, label }) => (
          <g key={`dorm-${color}`}>
            <rect
              x={x}
              y={y}
              width="192"
              height="192"
              rx="22"
              fill={COLOR_LIGHT[color]}
              fillOpacity="0.48"
              stroke={COLOR_HEX[color]}
              strokeWidth="3"
              strokeDasharray="8 6"
            />
            <text
              x={x + 96}
              y={y < 500 ? y + 214 : y - 10}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fontFamily="var(--font-stamp)"
              letterSpacing="2"
              fill={COLOR_HEX[color]}
              opacity="0.85"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Connecting Ink Path */}
        <polygon
          points={trackPoints}
          fill="none"
          stroke="#231d17"
          strokeWidth="5"
          strokeLinejoin="round"
          opacity="0.72"
        />

        {/* Goal Connector Lines */}
        {PLAYER_COLORS.map((color) => {
          const pts = GOAL_COORDS_BY_COLOR[color].map(cellCenter);
          return (
            <line
              key={`goal-line-${color}`}
              x1={pts[0].x}
              y1={pts[0].y}
              x2={pts[3].x}
              y2={pts[3].y}
              stroke={COLOR_HEX[color]}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.45"
            />
          );
        })}

        {/* Center University Crest */}
        <g transform="translate(550, 550)">
          <circle r="48" fill="#fbf7ee" stroke="#231d17" strokeWidth="4" />
          <circle r="40" fill="none" stroke="#c93b2b" strokeWidth="2" strokeDasharray="4 3" />
          <text
            y="-4"
            textAnchor="middle"
            fontSize="21"
            fontWeight="800"
            fontFamily="var(--font-display)"
            fill="#231d17"
          >
            UNI
          </text>
          <text
            y="18"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fontFamily="var(--font-stamp)"
            fill="#c93b2b"
          >
            ECTS
          </text>
        </g>

        {/* 40 Main Track Tiles */}
        {TRACK_COORDS.map((coord, idx) => {
          const { x, y } = cellCenter(coord);
          const startColor = startTileColors.get(idx);
          const isContested = state.duel?.contestedTrackIndex === idx;

          return (
            <g key={`track-${idx}`}>
              <circle
                cx={x}
                cy={y}
                r={startColor ? 36 : 32}
                fill={startColor ? COLOR_HEX[startColor] : '#fffdf7'}
                stroke="#231d17"
                strokeWidth="4"
              />
              {startColor && (
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill="none"
                  stroke="#fffdf7"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
              )}
              {isContested && (
                <circle
                  cx={x}
                  cy={y}
                  r="43"
                  fill="none"
                  stroke="#b72b22"
                  strokeWidth="5"
                  strokeDasharray="8 5"
                />
              )}
            </g>
          );
        })}

        {/* Base Slots (4 per player) */}
        {PLAYER_COLORS.map((color) =>
          BASE_COORDS_BY_COLOR[color].map((coord, slot) => {
            const { x, y } = cellCenter(coord);
            return (
              <circle
                key={`base-${color}-${slot}`}
                cx={x}
                cy={y}
                r="32"
                fill={COLOR_LIGHT[color]}
                stroke={COLOR_HEX[color]}
                strokeWidth="4"
              />
            );
          })
        )}

        {/* Goal Slots (4 per player) */}
        {PLAYER_COLORS.map((color) =>
          GOAL_COORDS_BY_COLOR[color].map((coord, slot) => {
            const { x, y } = cellCenter(coord);
            return (
              <g key={`goal-${color}-${slot}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="30"
                  fill={COLOR_LIGHT[color]}
                  stroke={COLOR_HEX[color]}
                  strokeWidth="4"
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  fontFamily="var(--font-stamp)"
                  fill={COLOR_HEX[color]}
                  opacity="0.7"
                >
                  {slot + 1}
                </text>
              </g>
            );
          })
        )}

        {/* Pawns */}
        {state.pawns.map((pawn) => {
          const coord = getPawnCoord(pawn);
          const { x, y } = cellCenter(coord);
          const isLegal = legalSet.has(pawn.id);

          // Offset slightly if two pawns temporarily share a contested duel tile
          let offsetX = 0;
          let offsetY = 0;
          if (
            state.duel &&
            pawn.location.zone === 'track' &&
            pawn.location.index === state.duel.contestedTrackIndex
          ) {
            if (pawn.id === state.duel.attackerPawnId) {
              offsetX = -14;
              offsetY = -10;
            } else if (pawn.id === state.duel.defenderPawnId) {
              offsetX = 14;
              offsetY = 10;
            }
          }

          return (
            <g
              key={pawn.id}
              transform={`translate(${x + offsetX}, ${y + offsetY})`}
              style={{
                transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                cursor: isLegal ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (isLegal) onSelectPawn(pawn.id);
              }}
              role={isLegal ? 'button' : undefined}
              tabIndex={isLegal ? 0 : undefined}
              onKeyDown={(e) => {
                if (isLegal && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectPawn(pawn.id);
                }
              }}
            >
              {isLegal && (
                <circle
                  cx="0"
                  cy="0"
                  r="36"
                  fill="none"
                  stroke="#231d17"
                  strokeWidth="4"
                  strokeDasharray="7 5"
                  style={{
                    animation: 'pawnPulse 1.1s ease-in-out infinite',
                  }}
                />
              )}

              {/* Physical Wooden Pawn Silhouette */}
              <g filter="url(#pawn-shadow)">
                {/* Pawn Base */}
                <ellipse
                  cx="0"
                  cy="14"
                  rx="21"
                  ry="12"
                  fill={COLOR_HEX[pawn.color]}
                  stroke="#231d17"
                  strokeWidth="3.5"
                />
                {/* Pawn Body */}
                <path
                  d="M -14 12 C -12 -4, -7 -12, -5 -16 L 5 -16 C 7 -12, 12 -4, 14 12 Z"
                  fill={COLOR_HEX[pawn.color]}
                  stroke="#231d17"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Pawn Head */}
                <circle
                  cx="0"
                  cy="-18"
                  r="13"
                  fill={COLOR_HEX[pawn.color]}
                  stroke="#231d17"
                  strokeWidth="3.5"
                />
                {/* Glossy highlight */}
                <circle cx="-4" cy="-22" r="4" fill="#ffffff" opacity="0.45" />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
