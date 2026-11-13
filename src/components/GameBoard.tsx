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
  rot: '#e74c3c',
  blau: '#3498db',
  gruen: '#2ecc71',
  gelb: '#f1c40f',
};

const COLOR_TEXT: Record<PlayerColor, string> = {
  rot: '#ffffff',
  blau: '#ffffff',
  gruen: '#ffffff',
  gelb: '#111111',
};

const BASE_LABEL: Record<PlayerColor, string> = {
  rot: 'A',
  blau: 'B',
  gruen: 'C',
  gelb: 'D',
};

const FACULTY_ICON: Record<PlayerColor, string> = {
  rot: '💻',
  blau: '⚖️',
  gruen: '🩺',
  gelb: '📈',
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
  language: _language,
  canInteract,
  onSelectPawn,
}) => {
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
            <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.28" />
          </filter>
          <radialGradient id="pawn-grad-rot" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff7675" />
            <stop offset="100%" stopColor="#d63031" />
          </radialGradient>
          <radialGradient id="pawn-grad-blau" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#74b9ff" />
            <stop offset="100%" stopColor="#0984e3" />
          </radialGradient>
          <radialGradient id="pawn-grad-gruen" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#55efc4" />
            <stop offset="100%" stopColor="#00b894" />
          </radialGradient>
          <radialGradient id="pawn-grad-gelb" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffeaa7" />
            <stop offset="100%" stopColor="#fdcb6e" />
          </radialGradient>
        </defs>

        {/* Classic Yellow Board Surface */}
        <rect x="0" y="0" width="1100" height="1100" fill="#fef17e" />

        {/* University Corner Headings */}
        <text
          x="200"
          y="300"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          fontFamily="'KuenstlerScript', Georgia, serif"
          fill="#333333"
          pointerEvents="none"
        >
          Mensch
        </text>
        <text
          x="900"
          y="300"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="44"
          fontFamily="'KuenstlerScript', Georgia, serif"
          fill="#333333"
          pointerEvents="none"
        >
          exmatrikuliere
        </text>
        <text
          x="200"
          y="800"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          fontFamily="'KuenstlerScript', Georgia, serif"
          fill="#333333"
          pointerEvents="none"
        >
          dich
        </text>
        <text
          x="900"
          y="800"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          fontFamily="'KuenstlerScript', Georgia, serif"
          fill="#333333"
          pointerEvents="none"
        >
          nicht
        </text>

        {/* Center University Seal (Row 6, Col 6) */}
        <g transform="translate(550, 550)">
          <title>Exmatrikulationsamt / Uni-Zentrum</title>
          <circle
            r="46"
            fill="rgba(255, 255, 255, 0.4)"
            stroke="#bdc3c7"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <text
            y="-6"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="36"
          >
            🏛️
          </text>
          <text
            y="24"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="12"
            fontWeight="800"
            letterSpacing="0.8"
            fill="#7f8c8d"
          >
            CAMPUS
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
                r="41"
                fill={startColor ? COLOR_HEX[startColor] : '#d3d3d3'}
                stroke="#000000"
                strokeWidth="3.5"
              />
              {startColor && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r="35.5"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="4"
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="28"
                    fontWeight="700"
                    fill={COLOR_TEXT[startColor]}
                  >
                    S
                  </text>
                </>
              )}
              {isContested && (
                <circle
                  cx={x}
                  cy={y}
                  r="48"
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
              <g key={`base-${color}-${slot}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="41"
                  fill={COLOR_HEX[color]}
                  stroke="#000000"
                  strokeWidth="3.5"
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="28"
                  fontWeight="700"
                  fill={COLOR_TEXT[color]}
                >
                  {BASE_LABEL[color]}
                </text>
              </g>
            );
          })
        )}

        {/* Goal Slots (4 per player) */}
        {PLAYER_COLORS.map((color) =>
          GOAL_COORDS_BY_COLOR[color].map((coord, slot) => {
            const { x, y } = cellCenter(coord);
            return (
              <g key={`goal-${color}-${slot}`} opacity="0.9">
                <circle
                  cx={x}
                  cy={y}
                  r="41"
                  fill={COLOR_HEX[color]}
                  stroke="#000000"
                  strokeWidth="3.5"
                />
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

          const player = state.players[pawn.playerIndex];
          const pawnEmoji = player?.emoji?.trim() || FACULTY_ICON[pawn.color];
          const pawnTitle = player
            ? player.major?.trim()
              ? `${player.name} (${player.major.trim()})`
              : player.name
            : pawn.color;

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
              <title>{pawnTitle}</title>
              <g className={isLegal ? 'board-pawn--movable' : undefined}>
                <g className="board-pawn-token" filter="url(#pawn-shadow)">
                  <circle
                    cx="0"
                    cy="0"
                    r="33"
                    fill={`url(#pawn-grad-${pawn.color})`}
                    stroke="#1e293b"
                    strokeWidth="4"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="26"
                    pointerEvents="none"
                  >
                    {pawnEmoji}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
