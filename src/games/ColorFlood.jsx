import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const GRID_SIZE = 8;
const MAX_MOVES = 20;

const COLOR_SETS = {
  food:      ['#e74c3c', '#f39c12', '#2ecc71', '#9b59b6', '#e67e22'],
  space:     ['#7c3aed', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'],
  tech:      ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4'],
  nature:    ['#22c55e', '#84cc16', '#0ea5e9', '#eab308', '#a855f7'],
  music:     ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e'],
  family:    ['#f472b6', '#a78bfa', '#67e8f9', '#fbbf24', '#34d399'],
  scifi:     ['#6366f1', '#22d3ee', '#a855f7', '#f43f5e', '#14b8a6'],
  humor:     ['#fbbf24', '#f43f5e', '#22c55e', '#8b5cf6', '#f97316'],
  adventure: ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ef4444'],
  arts:      ['#c084fc', '#fb7185', '#67e8f9', '#fde047', '#4ade80'],
  spooky:    ['#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444'],
  winter:    ['#38bdf8', '#e0f2fe', '#7dd3fc', '#a78bfa', '#fbbf24'],
  default:   ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e'],
};

const VARIANTS = {
  rainbow: {
    colors: ['#8B4513', '#228B22', '#4169E1', '#DAA520', '#CD853F'],
    title: 'Paint the Planet',
  },
};

function buildGrid(colors) {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(colors[Math.floor(Math.random() * colors.length)]);
    }
    grid.push(row);
  }
  return grid;
}

function floodFill(grid, newColor) {
  const oldColor = grid[0][0];
  if (oldColor === newColor) return grid;
  const next = grid.map(row => [...row]);
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const stack = [[0, 0]];

  while (stack.length > 0) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (visited[r][c]) continue;
    if (next[r][c] !== oldColor) continue;
    visited[r][c] = true;
    next[r][c] = newColor;
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return next;
}

function countConnected(grid) {
  const color = grid[0][0];
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const stack = [[0, 0]];
  let count = 0;

  while (stack.length > 0) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (visited[r][c]) continue;
    if (grid[r][c] !== color) continue;
    visited[r][c] = true;
    count++;
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return count;
}

function isUniform(grid) {
  return countConnected(grid) === GRID_SIZE * GRID_SIZE;
}

export default function ColorFlood({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const colors = cfg?.colors || COLOR_SETS[holiday?.category] || COLOR_SETS.default;
  const title = cfg?.title || null;

  const [grid, setGrid] = useState(() => buildGrid(colors));
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [connected, setConnected] = useState(() => countConnected(buildGrid(colors)));
  const { best, submit } = useHighScore('color-flood');
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Recalculate connected after grid changes
  useEffect(() => {
    setConnected(countConnected(grid));
  }, [grid]);

  const pickColor = useCallback((color) => {
    if (done) return;
    if (color === grid[0][0]) return; // Same color, skip

    playGameSound('pop');
    const nextGrid = floodFill(grid, color);
    const nextMoves = moves + 1;
    setGrid(nextGrid);
    setMoves(nextMoves);

    if (isUniform(nextGrid)) {
      // Won!
      setDone(true);
      setWon(true);
      const score = (MAX_MOVES - nextMoves) * 15 + 50;
      playGameSound('win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
        colors: [theme.primary, theme.secondary, '#fbbf24'],
      });
      setFeedback({ text: `Cleared in ${nextMoves} moves!`, score });
      submit(score);
      setTimeout(() => onComplete(score), 1400);
    } else if (nextMoves >= MAX_MOVES) {
      // Out of moves
      setDone(true);
      const filledPct = countConnected(nextGrid) / (GRID_SIZE * GRID_SIZE);
      const score = Math.round(filledPct * 50);
      playGameSound('wrong');
      setFeedback({ text: `Out of moves! ${Math.round(filledPct * 100)}% filled`, score });
      submit(score);
      setTimeout(() => onComplete(score), 1200);
    }
  }, [grid, moves, done, theme, submit, onComplete]);

  const cellSize = `calc((min(280px, 70vw)) / ${GRID_SIZE})`;
  const totalCells = GRID_SIZE * GRID_SIZE;
  const pct = Math.round((connected / totalCells) * 100);

  return (
    <div>
      {/* Title for variant */}
      {title && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: theme.secondary,
          marginBottom: '0.25rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
      }}>
        <span style={{
          color: moves >= MAX_MOVES - 3 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          fontWeight: moves >= MAX_MOVES - 3 ? 700 : 400,
        }}>
          Moves: {moves}/{MAX_MOVES}
        </span>
        <span style={{
          color: theme.primary,
          fontSize: '0.8rem',
          fontWeight: 600,
        }}>
          {pct}% filled
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '4px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        marginBottom: '0.75rem',
        overflow: 'hidden',
      }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: '2px',
        maxWidth: '280px',
        margin: '0 auto',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {grid.flat().map((color, i) => {
          const r = Math.floor(i / GRID_SIZE);
          const c = i % GRID_SIZE;
          return (
            <motion.div
              key={`${r}-${c}`}
              animate={{ backgroundColor: color }}
              transition={{ duration: 0.2 }}
              style={{
                aspectRatio: '1',
                backgroundColor: color,
              }}
            />
          );
        })}
      </div>

      {/* Color picker buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '0.75rem',
      }}>
        {colors.map((color) => {
          const isCurrentColor = grid[0][0] === color;
          return (
            <motion.button
              key={color}
              onClick={() => pickColor(color)}
              whileHover={!isCurrentColor && !done ? { scale: 1.15 } : {}}
              whileTap={!isCurrentColor && !done ? { scale: 0.9 } : {}}
              disabled={done || isCurrentColor}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: color,
                border: isCurrentColor
                  ? '3px solid rgba(255,255,255,0.8)'
                  : '2px solid rgba(255,255,255,0.15)',
                cursor: done || isCurrentColor ? 'default' : 'pointer',
                opacity: done ? 0.4 : isCurrentColor ? 0.5 : 1,
                boxShadow: isCurrentColor
                  ? `0 0 12px ${color}66`
                  : `0 2px 8px ${color}33`,
                transition: 'border 0.2s, opacity 0.2s, box-shadow 0.2s',
              }}
            />
          );
        })}
      </div>

      {/* Instructions */}
      {moves === 0 && !done && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.35)',
            marginTop: '0.5rem',
          }}
        >
          Pick a color to flood-fill from the top-left corner
        </motion.p>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              marginTop: '0.75rem',
            }}
          >
            <p style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: won ? '#22c55e' : '#f43f5e',
            }}>
              {feedback.text}
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: theme.primary,
              marginTop: '0.25rem',
            }}>
              Score: {feedback.score}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {best > 0 && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '0.5rem',
        }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
