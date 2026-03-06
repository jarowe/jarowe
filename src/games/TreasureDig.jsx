import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const GRID_SIZE = 8;
const TREASURE_COUNT = 8;
const TRAP_COUNT = 5;
const TIMER_SECONDS = 90;

const TREASURE_EMOJI = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '🍣', '🧁', '🍫'],
  space:     ['🚀', '⭐', '🌙', '🛸', '☄️', '🪐', '🔭', '💫'],
  tech:      ['💻', '📱', '⚡', '🔧', '💡', '🎮', '💾', '🤖'],
  nature:    ['🌸', '🦋', '🌻', '🐝', '🍃', '🌈', '🌺', '🐞'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺'],
  family:    ['💖', '🧸', '🎈', '🎁', '🎉', '👑', '🏆', '💝'],
  scifi:     ['🔮', '🧬', '🌀', '🛸', '⚡', '💠', '🔬', '🧪'],
  humor:     ['😂', '🤣', '🥳', '🤪', '🎉', '🎈', '🎭', '🤡'],
  adventure: ['💎', '🗝️', '👑', '🏆', '⚔️', '🗺️', '🧭', '💰'],
  arts:      ['🎨', '🖌️', '🎭', '📸', '🎬', '🎪', '🖼️', '✏️'],
  spooky:    ['🎃', '👻', '🕷️', '🦇', '🧙', '🕯️', '🐈‍⬛', '🌙'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️'],
  default:   ['💎', '⭐', '🏆', '💰', '🔑', '👑', '✨', '🎯'],
};

const TRAP_EMOJI_MAP = {
  food: '🌶️', space: '☢️', tech: '🐛', nature: '🕷️', music: '📢',
  family: '🧱', scifi: '💣', humor: '💩', adventure: '🐍', arts: '💥',
  spooky: '💀', winter: '🧊', default: '💀',
};

const VARIANTS = {
  tomb: {
    treasure: '🏆',
    trap: '🦂',
    coverStyle: '#c4a35a',
    title: 'Tomb Raider',
    bg: '#3d2b1f',
    accent: '#daa520',
  },
};

function buildGrid(cat, vcfg) {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    idx: i,
    row: Math.floor(i / GRID_SIZE),
    col: i % GRID_SIZE,
    revealed: false,
    flagged: false,
    content: 'empty', // empty | treasure | trap
    adjacent: 0,
    emoji: null,
  }));

  // Place treasures
  const treasurePool = vcfg
    ? Array(TREASURE_COUNT).fill(vcfg.treasure)
    : [...(TREASURE_EMOJI[cat] || TREASURE_EMOJI.default)].slice(0, TREASURE_COUNT);
  const positions = [];
  while (positions.length < TREASURE_COUNT) {
    const pos = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    if (!positions.includes(pos)) {
      positions.push(pos);
      cells[pos].content = 'treasure';
      cells[pos].emoji = treasurePool[positions.length - 1] || treasurePool[0];
    }
  }

  // Place traps
  const trapEmoji = vcfg?.trap || TRAP_EMOJI_MAP[cat] || TRAP_EMOJI_MAP.default;
  let trapPlaced = 0;
  while (trapPlaced < TRAP_COUNT) {
    const pos = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    if (cells[pos].content === 'empty') {
      cells[pos].content = 'trap';
      cells[pos].emoji = trapEmoji;
      trapPlaced++;
    }
  }

  // Calculate adjacency counts (treasures only, not traps)
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].content !== 'empty') continue;
    let count = 0;
    const r = cells[i].row;
    const c = cells[i].col;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        if (cells[nr * GRID_SIZE + nc].content === 'treasure') count++;
      }
    }
    cells[i].adjacent = count;
  }

  return cells;
}

export default function TreasureDig({ onComplete, holiday, theme, variant }) {
  const vcfg = variant ? VARIANTS[variant] : null;
  const cat = holiday?.category || 'default';

  const [grid, setGrid] = useState(() => buildGrid(cat, vcfg));
  const [lives, setLives] = useState(3);
  const [treasuresFound, setTreasuresFound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  const { best, submit } = useHighScore('treasure-dig');
  const scoreRef = useRef(0);
  const longPressTimer = useRef(null);
  const longPressIdx = useRef(null);

  const { timeLeft, start } = useGameTimer(TIMER_SECONDS, {
    onExpire: () => {
      if (!gameOver) {
        setGameOver(true);
        submit(scoreRef.current);
        onComplete(scoreRef.current);
      }
    },
  });

  useEffect(() => { start(); }, [start]);

  // Right-click to flag
  const handleContextMenu = useCallback((e, idx) => {
    e.preventDefault();
    if (gameOver) return;
    const cell = grid[idx];
    if (cell.revealed) return;
    setGrid(g => g.map((c, i) => i === idx ? { ...c, flagged: !c.flagged } : c));
    playGameSound('tick');
  }, [grid, gameOver]);

  // Long-press for mobile flagging
  const handleTouchStart = useCallback((idx) => {
    longPressIdx.current = idx;
    longPressTimer.current = setTimeout(() => {
      if (gameOver) return;
      const cell = grid[idx];
      if (cell.revealed) return;
      setGrid(g => g.map((c, i) => i === idx ? { ...c, flagged: !c.flagged } : c));
      playGameSound('tick');
      longPressIdx.current = -1; // mark as handled
    }, 500);
  }, [grid, gameOver]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  // Reveal a cell
  const dig = useCallback((idx) => {
    if (gameOver) return;
    if (longPressIdx.current === -1) { longPressIdx.current = null; return; } // was long-press

    const cell = grid[idx];
    if (cell.revealed || cell.flagged) return;

    const newGrid = [...grid];

    if (cell.content === 'treasure') {
      newGrid[idx] = { ...cell, revealed: true };
      const pts = 15;
      const newFound = treasuresFound + 1;
      const newScore = score + pts;
      scoreRef.current = newScore;
      setTreasuresFound(newFound);
      setScore(newScore);
      setLastHit({ type: 'treasure', text: `+${pts}!`, id: Date.now() });
      playGameSound('correct');

      // Found all treasures
      if (newFound >= TREASURE_COUNT) {
        const timeBonus = timeLeft * 2;
        const finalScore = newScore + timeBonus;
        scoreRef.current = finalScore;
        setScore(finalScore);
        setGameOver(true);
        setLastHit({ type: 'win', text: `All found! +${timeBonus} time bonus!`, id: Date.now() });
        playGameSound('win');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        // Reveal all
        for (let i = 0; i < newGrid.length; i++) newGrid[i] = { ...newGrid[i], revealed: true };
        setGrid(newGrid);
        submit(finalScore);
        setTimeout(() => onComplete(finalScore), 1200);
        return;
      }
    } else if (cell.content === 'trap') {
      newGrid[idx] = { ...cell, revealed: true };
      const newLives = lives - 1;
      setLives(newLives);
      setLastHit({ type: 'trap', text: `Trap! ${newLives} lives left`, id: Date.now() });
      playGameSound('wrong');

      if (newLives <= 0) {
        setGameOver(true);
        // Reveal all
        for (let i = 0; i < newGrid.length; i++) newGrid[i] = { ...newGrid[i], revealed: true };
        setGrid(newGrid);
        submit(scoreRef.current);
        setTimeout(() => onComplete(scoreRef.current), 800);
        return;
      }
    } else {
      // Empty cell - reveal it and flood-fill zeros
      const toReveal = [idx];
      const visited = new Set();

      while (toReveal.length > 0) {
        const ci = toReveal.pop();
        if (visited.has(ci)) continue;
        visited.add(ci);
        const c = newGrid[ci];
        if (c.revealed) continue;
        if (c.content !== 'empty') continue;

        newGrid[ci] = { ...c, revealed: true };

        // If adjacent count is 0, expand to neighbors
        if (c.adjacent === 0) {
          const r = c.row;
          const col = c.col;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = col + dc;
              if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
              const ni = nr * GRID_SIZE + nc;
              if (!visited.has(ni) && !newGrid[ni].revealed && newGrid[ni].content === 'empty') {
                toReveal.push(ni);
              }
            }
          }
        }
      }
      playGameSound('pop');
    }

    setGrid(newGrid);
  }, [grid, gameOver, lives, treasuresFound, score, timeLeft, theme, submit, onComplete]);

  const adjacentColors = ['transparent', '#38bdf8', '#22c55e', '#fbbf24', '#f97316', '#ef4444', '#a855f7', '#ec4899', '#f43f5e'];

  const coverBg = vcfg?.coverStyle
    ? `linear-gradient(135deg, ${vcfg.coverStyle}cc, ${vcfg.coverStyle}88)`
    : `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22)`;
  const boardBg = vcfg?.bg || 'rgba(255,255,255,0.02)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{
          color: timeLeft <= 15 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 15 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {'❤️'.repeat(Math.max(0, lives))}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Progress */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
      }}>
        <span>Treasures: {treasuresFound}/{TREASURE_COUNT}</span>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {lastHit && (
          <motion.div
            key={lastHit.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: lastHit.type === 'treasure' || lastHit.type === 'win' ? '#22c55e' : '#f43f5e',
              minHeight: '1.2rem',
            }}
          >
            {lastHit.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: '2px',
        padding: '0.4rem',
        background: boardBg,
        borderRadius: '0.6rem',
        border: '1px solid rgba(255,255,255,0.06)',
        userSelect: 'none',
      }}>
        {grid.map((cell, idx) => (
          <motion.button
            key={idx}
            onClick={() => dig(idx)}
            onContextMenu={(e) => handleContextMenu(e, idx)}
            onTouchStart={() => handleTouchStart(idx)}
            onTouchEnd={handleTouchEnd}
            animate={cell.revealed ? { scale: [1, 0.95, 1] } : {}}
            transition={{ duration: 0.15 }}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: cell.revealed ? '0.85rem' : '0.7rem',
              fontWeight: 700,
              background: cell.revealed
                ? cell.content === 'treasure'
                  ? `${theme.primary}22`
                  : cell.content === 'trap'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(255,255,255,0.03)'
                : coverBg,
              border: cell.revealed
                ? cell.content === 'treasure'
                  ? `1px solid ${theme.primary}44`
                  : cell.content === 'trap'
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid rgba(255,255,255,0.04)'
                : cell.flagged
                  ? `1px solid ${theme.secondary}66`
                  : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.3rem',
              cursor: cell.revealed || gameOver ? 'default' : 'pointer',
              color: adjacentColors[cell.adjacent] || '#fff',
              padding: 0,
              minWidth: 0,
              minHeight: 0,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {cell.revealed ? (
              cell.content === 'treasure' ? (
                <span style={{ fontSize: '1rem' }}>{cell.emoji}</span>
              ) : cell.content === 'trap' ? (
                <span style={{ fontSize: '1rem' }}>{cell.emoji}</span>
              ) : cell.adjacent > 0 ? (
                <span>{cell.adjacent}</span>
              ) : null
            ) : cell.flagged ? (
              <span style={{ fontSize: '0.8rem' }}>🚩</span>
            ) : null}
          </motion.button>
        ))}
      </div>

      {/* Instructions */}
      <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
        Click to dig. Right-click or long-press to flag.
      </p>

      {gameOver && lives > 0 && treasuresFound < TREASURE_COUNT && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          Time's up! Found {treasuresFound}/{TREASURE_COUNT}
        </p>
      )}

      {gameOver && lives <= 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#f43f5e', fontWeight: 600 }}>
          Game Over! Found {treasuresFound}/{TREASURE_COUNT}
        </p>
      )}

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
