import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const COLS = 8;
const ROWS = 10;

const COLOR_POOLS = {
  food:      ['#f59e0b', '#ef4444', '#ec4899', '#22c55e', '#f97316'],
  space:     ['#7c3aed', '#06b6d4', '#6366f1', '#3b82f6', '#c084fc'],
  tech:      ['#06b6d4', '#3b82f6', '#8b5cf6', '#14b8a6', '#22d3ee'],
  nature:    ['#22c55e', '#84cc16', '#10b981', '#fbbf24', '#4ade80'],
  music:     ['#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4', '#fbbf24'],
  family:    ['#ec4899', '#f472b6', '#a78bfa', '#fb923c', '#fbbf24'],
  scifi:     ['#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'],
  humor:     ['#fbbf24', '#f43f5e', '#22c55e', '#a78bfa', '#fb923c'],
  adventure: ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6'],
  arts:      ['#ec4899', '#7c3aed', '#06b6d4', '#f59e0b', '#22c55e'],
  spooky:    ['#f97316', '#22c55e', '#7c3aed', '#eab308', '#ef4444'],
  winter:    ['#38bdf8', '#e0f2fe', '#93c5fd', '#c084fc', '#bae6fd'],
  default:   ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e'],
};

const EMOJI_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰'],
  space:     ['🚀', '⭐', '🛸', '🌙', '🪐'],
  tech:      ['💻', '⚡', '🔧', '📱', '🎮'],
  nature:    ['🌸', '🍃', '🦋', '🐝', '🌻'],
  music:     ['🎵', '🎸', '🥁', '🎤', '🎶'],
  family:    ['💖', '🏠', '🤗', '🎈', '🌟'],
  scifi:     ['🤖', '👽', '🔮', '🧬', '🌀'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪'],
  adventure: ['🗺️', '🧭', '⛰️', '🏕️', '🔥'],
  arts:      ['🎨', '🖌️', '🎭', '🎬', '✨'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣'],
  default:   ['⭐', '💎', '🔥', '🍀', '✨'],
};

const VARIANTS = {
  chocolate: {
    colors: ['#4a2c2a', '#c4a882', '#f5e6d3', '#2d1810', '#d4956a'],
    emojis: ['🍫', '🍪', '🧁', '🍩', '🎂'],
    popText: 'Melt!',
    popScale: 1.6,
    popOpacity: 0,
    exitAnim: { scale: 1.6, opacity: 0, y: 20, rotate: 15 },
  },
};

function getColors(category, variant) {
  if (variant && VARIANTS[variant]) return VARIANTS[variant].colors;
  return COLOR_POOLS[category] || COLOR_POOLS.default;
}

function getEmojis(category, variant) {
  if (variant && VARIANTS[variant]) return VARIANTS[variant].emojis;
  return EMOJI_POOLS[category] || EMOJI_POOLS.default;
}

function buildGrid(category, variant) {
  const colors = getColors(category, variant);
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const colorIdx = Math.floor(Math.random() * colors.length);
      row.push({
        id: `${r}-${c}`,
        colorIdx,
        color: colors[colorIdx],
        alive: true,
      });
    }
    row.push(null); // sentinel
    grid.push(row);
  }
  return grid;
}

// Flood-fill to find connected cluster of same color
function findCluster(grid, row, col) {
  const target = grid[row]?.[col];
  if (!target || !target.alive) return [];
  const visited = new Set();
  const cluster = [];
  const stack = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const cell = grid[r]?.[c];
    if (!cell || !cell.alive || cell.colorIdx !== target.colorIdx) continue;
    cluster.push([r, c]);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return cluster;
}

// Apply gravity: bubbles fall down within each column
function applyGravity(grid) {
  const next = grid.map(row => [...row]);
  for (let c = 0; c < COLS; c++) {
    // Collect alive cells in this column from bottom to top
    const alive = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (next[r][c] && next[r][c].alive) {
        alive.push(next[r][c]);
      }
    }
    // Place them at the bottom
    for (let r = ROWS - 1; r >= 0; r--) {
      const item = alive.shift();
      if (item) {
        next[r][c] = { ...item, id: `${r}-${c}` };
      } else {
        next[r][c] = null;
      }
    }
  }
  return next;
}

// Compact columns left: remove fully empty columns
function compactColumns(grid) {
  const next = grid.map(row => [...row]);
  // Find non-empty columns
  const nonEmpty = [];
  for (let c = 0; c < COLS; c++) {
    let hasCell = false;
    for (let r = 0; r < ROWS; r++) {
      if (next[r][c] && next[r][c].alive) { hasCell = true; break; }
    }
    if (hasCell) nonEmpty.push(c);
  }
  // Rebuild from left
  const result = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let i = 0; i < COLS; i++) {
      if (i < nonEmpty.length) {
        const srcCol = nonEmpty[i];
        const cell = next[r][srcCol];
        row.push(cell ? { ...cell, id: `${r}-${i}` } : null);
      } else {
        row.push(null);
      }
    }
    result.push(row);
  }
  return result;
}

// Check if any valid clusters of 3+ exist
function hasValidMoves(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].alive) {
        const cluster = findCluster(grid, r, c);
        if (cluster.length >= 3) return true;
      }
    }
  }
  return false;
}

export default function BubblePop({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const category = holiday?.category || 'default';
  const emojis = getEmojis(category, variant);

  const [grid, setGrid] = useState(() => buildGrid(category, variant));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [popFeedback, setPopFeedback] = useState(null);
  const [poppingCells, setPoppingCells] = useState(new Set());
  const [done, setDone] = useState(false);
  const [hovered, setHovered] = useState(null);
  const { best, submit } = useHighScore('bubble-pop');
  const scoreRef = useRef(0);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const { timeLeft, start, running } = useGameTimer(60, {
    onExpire: () => {
      setDone(true);
      const finalScore = scoreRef.current;
      submit(finalScore);
      if (finalScore > 100) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
      }
      setTimeout(() => onComplete(finalScore), 800);
    },
  });

  useEffect(() => { start(); }, [start]);

  // Highlight cluster on hover
  const hoverCluster = useRef(new Set());
  const handleHover = useCallback((r, c) => {
    if (done) return;
    const cell = gridRef.current[r]?.[c];
    if (!cell || !cell.alive) { setHovered(null); hoverCluster.current = new Set(); return; }
    const cluster = findCluster(gridRef.current, r, c);
    if (cluster.length >= 3) {
      hoverCluster.current = new Set(cluster.map(([rr, cc]) => `${rr}-${cc}`));
      setHovered(`${r}-${c}`);
    } else {
      hoverCluster.current = new Set();
      setHovered(null);
    }
  }, [done]);

  const handlePop = useCallback((r, c) => {
    if (done || poppingCells.size > 0) return;
    const cluster = findCluster(gridRef.current, r, c);
    if (cluster.length < 3) {
      playGameSound('wrong');
      return;
    }

    // Score = size^2
    const clusterScore = cluster.length * cluster.length;
    const newScore = scoreRef.current + clusterScore;
    scoreRef.current = newScore;
    setScore(newScore);
    setCombo(prev => prev + 1);

    // Pop feedback
    const popText = cfg?.popText || `+${clusterScore}`;
    setPopFeedback({ text: popText, x: c, y: r });
    setTimeout(() => setPopFeedback(null), 600);

    playGameSound('pop');
    if (cluster.length >= 6) playGameSound('correct');

    // Mark cells as popping (for exit animation)
    const poppingSet = new Set(cluster.map(([rr, cc]) => `${rr}-${cc}`));
    setPoppingCells(poppingSet);

    // After animation, remove cells + apply gravity
    setTimeout(() => {
      const nextGrid = gridRef.current.map(row => row.map(cell => {
        if (!cell) return null;
        const key = `${cell.id}`;
        // Cell ID format is "r-c" but we need to check against cluster positions
        return poppingSet.has(key) ? null : cell;
      }));

      // Actually mark by cluster positions
      const cleared = gridRef.current.map(row => [...row]);
      for (const [cr, cc] of cluster) {
        cleared[cr][cc] = null;
      }

      const afterGravity = applyGravity(cleared);
      const compacted = compactColumns(afterGravity);
      setGrid(compacted);
      setPoppingCells(new Set());
      hoverCluster.current = new Set();
      setHovered(null);

      // Check for no valid moves
      if (!hasValidMoves(compacted)) {
        // Check if grid is empty (bonus!)
        let cellsLeft = 0;
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            if (compacted[rr][cc] && compacted[rr][cc].alive) cellsLeft++;
          }
        }
        if (cellsLeft === 0) {
          // Clear bonus!
          const bonus = 100;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          playGameSound('win');
          confetti({ particleCount: 50, spread: 40, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary] });
          // Rebuild grid
          setTimeout(() => setGrid(buildGrid(category, variant)), 600);
        }
        // If cells remain but no moves, rebuild
        else if (cellsLeft > 0) {
          setTimeout(() => setGrid(buildGrid(category, variant)), 400);
        }
      }
    }, 250);
  }, [done, poppingCells, category, variant, cfg, theme]);

  const exitAnimation = cfg?.exitAnim || { scale: 0, opacity: 0 };
  const cellSize = 'min(calc((100vw - 4rem) / 8), 3rem)';

  if (done) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
        <span style={{
          color: timeLeft <= 10 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          fontWeight: timeLeft <= 10 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{
          color: theme.primary,
          fontSize: '0.8rem',
          fontWeight: 600,
        }}>
          {score} pts
        </span>
      </div>

      {/* Instruction */}
      <p style={{
        textAlign: 'center',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.35)',
        margin: '0 0 0.5rem',
      }}>
        Tap clusters of 3+ to pop. Bigger clusters = more points!
      </p>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cellSize})`,
          gridTemplateRows: `repeat(${ROWS}, ${cellSize})`,
          gap: '2px',
          justifyContent: 'center',
          margin: '0 auto',
        }}
        onMouseLeave={() => { hoverCluster.current = new Set(); setHovered(null); }}
      >
        <AnimatePresence mode="popLayout">
          {grid.flatMap((row, r) =>
            row.slice(0, COLS).map((cell, c) => {
              if (!cell || !cell.alive) {
                return (
                  <div
                    key={`empty-${r}-${c}`}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                    }}
                  />
                );
              }

              const cellKey = `${r}-${c}`;
              const isPopping = poppingCells.has(cellKey);
              const isHighlighted = hoverCluster.current.has(cellKey);
              const emoji = emojis[cell.colorIdx % emojis.length];

              return (
                <motion.button
                  key={`bubble-${cell.id}-${cell.colorIdx}`}
                  layout
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{
                    scale: isPopping ? 1.3 : isHighlighted ? 1.1 : 1,
                    opacity: isPopping ? 0 : 1,
                    filter: isHighlighted ? 'brightness(1.4)' : 'brightness(1)',
                  }}
                  exit={exitAnimation}
                  transition={{ duration: 0.2, layout: { duration: 0.3 } }}
                  onClick={() => handlePop(r, c)}
                  onMouseEnter={() => handleHover(r, c)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)',
                    background: `radial-gradient(circle at 35% 35%, ${cell.color}dd, ${cell.color}88)`,
                    border: isHighlighted
                      ? `2px solid rgba(255,255,255,0.5)`
                      : `1px solid ${cell.color}44`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: isHighlighted
                      ? `0 0 12px ${cell.color}66, inset 0 -2px 4px rgba(0,0,0,0.2)`
                      : `inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.15)`,
                    padding: 0,
                    outline: 'none',
                  }}
                >
                  {emoji}
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Pop feedback */}
      <AnimatePresence>
        {popFeedback && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -30, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: theme.primary,
              textShadow: `0 0 12px ${theme.primary}88`,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {popFeedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Best score */}
      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
