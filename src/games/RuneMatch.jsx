import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const COLS = 6;
const ROWS = 12;
const CELL = 40;
const W = COLS * CELL;
const H = ROWS * CELL;
const FALL_SPEED = 0.035; // cells per ms
const DROP_INTERVAL_START = 800;
const DROP_INTERVAL_MIN = 300;

const COLOR_PALETTES = {
  food:      ['#f59e0b', '#ef4444', '#22c55e', '#ec4899'],
  space:     ['#7c3aed', '#06b6d4', '#f59e0b', '#ec4899'],
  tech:      ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
  nature:    ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
  music:     ['#a78bfa', '#ec4899', '#06b6d4', '#f59e0b'],
  family:    ['#ec4899', '#a78bfa', '#06b6d4', '#22c55e'],
  scifi:     ['#06b6d4', '#7c3aed', '#22c55e', '#f59e0b'],
  humor:     ['#f59e0b', '#ef4444', '#a78bfa', '#06b6d4'],
  adventure: ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444'],
  arts:      ['#ec4899', '#a78bfa', '#f59e0b', '#06b6d4'],
  spooky:    ['#22c55e', '#f59e0b', '#a78bfa', '#ef4444'],
  winter:    ['#38bdf8', '#e0f2fe', '#a78bfa', '#7dd3fc'],
  default:   ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b'],
};

const BLOCK_EMOJI = {
  food:      ['🍕', '🍔', '🌮', '🍩'],
  space:     ['⭐', '🌙', '☄️', '🛸'],
  tech:      ['⚡', '🔧', '💡', '🔌'],
  nature:    ['🌸', '🍃', '🦋', '🌻'],
  music:     ['🎵', '🎸', '🥁', '🎤'],
  family:    ['❤️', '🌟', '🎁', '🤗'],
  scifi:     ['🤖', '👽', '🔮', '🧬'],
  humor:     ['😂', '🎉', '🤪', '🥳'],
  adventure: ['🗺️', '🏔️', '🌊', '🧭'],
  arts:      ['🎨', '🎬', '📚', '🎭'],
  spooky:    ['👻', '🎃', '🕷️', '🦇'],
  winter:    ['❄️', '⛄', '🎄', '🧣'],
  default:   ['🔴', '🔵', '🟢', '🟡'],
};

// Variant overrides
const VARIANTS = {
  spell: {
    blockEmoji: ['🧪', '🔮', '🌙', '☠️'],
    colors: ['#22c55e', '#a78bfa', '#fbbf24', '#94a3b8'],
    clearEffect: 'green',
    title: "Witch's Brew",
    bg: '#1a0a2e',
  },
};

function getColors(category) {
  return COLOR_PALETTES[category] || COLOR_PALETTES.default;
}

function getEmoji(category) {
  return BLOCK_EMOJI[category] || BLOCK_EMOJI.default;
}

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomColor(count) {
  return Math.floor(Math.random() * count);
}

export default function RuneMatch({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const colors = cfg?.colors || getColors(holiday?.category);
  const emoji = cfg?.blockEmoji || getEmoji(holiday?.category);
  const bgColor = cfg?.bg || '#0a0a1e';
  const numColors = colors.length;

  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [chainText, setChainText] = useState(null);
  const { best, submit } = useHighScore('rune-match');
  const scoreRef = useRef(0);
  const loopRef = useRef(null);

  const { timeLeft, start } = useGameTimer(90, {
    onExpire: () => {
      stateRef.current.running = false;
      setDone(true);
      if (scoreRef.current > 0) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
      }
      submit(scoreRef.current);
      setTimeout(() => onComplete(scoreRef.current), 600);
    },
  });

  const stateRef = useRef({
    board: createEmptyBoard(),
    // Active falling pair: pivot + satellite
    active: null, // { px, py, pc, sx, sy, sc, rotation } rotation: 0=up, 1=right, 2=down, 3=left
    fallTimer: 0,
    dropInterval: DROP_INTERVAL_START,
    running: false,
    lastTime: 0,
    clearing: false,
    clearCells: [], // [{r,c}]
    clearTimer: 0,
    gravityPhase: false,
    chainCount: 0,
    particles: [], // [{x, y, dx, dy, life, color}]
    piecesPlaced: 0,
  });

  const spawnPiece = useCallback(() => {
    const s = stateRef.current;
    const px = 2;
    const py = 0;
    const pc = randomColor(numColors);
    const sc = randomColor(numColors);
    // Check if spawn blocked
    if (s.board[py][px] !== null || s.board[py][px + 1] !== null) {
      return false; // game over
    }
    s.active = { px, py: -1, pc, sx: px, sy: -2, sc, rotation: 0 };
    return true;
  }, [numColors]);

  // Get satellite offset from rotation
  const getSatOffset = useCallback((rot) => {
    switch (rot % 4) {
      case 0: return { dx: 0, dy: -1 }; // up
      case 1: return { dx: 1, dy: 0 };  // right
      case 2: return { dx: 0, dy: 1 };  // down
      case 3: return { dx: -1, dy: 0 }; // left
      default: return { dx: 0, dy: -1 };
    }
  }, []);

  // Check if position is valid
  const isValid = useCallback((col, row, board) => {
    if (col < 0 || col >= COLS) return false;
    if (row >= ROWS) return false;
    if (row < 0) return true; // above board is ok
    return board[row][col] === null;
  }, []);

  // Lock piece into board
  const lockPiece = useCallback(() => {
    const s = stateRef.current;
    const a = s.active;
    if (!a) return;
    const off = getSatOffset(a.rotation);
    const pr = Math.round(a.py);
    const sr = pr + off.dy;
    const sc = a.px + off.dx;

    if (pr >= 0 && pr < ROWS) s.board[pr][a.px] = a.pc;
    if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS) s.board[sr][sc] = a.sc;

    s.active = null;
    s.piecesPlaced++;
    // Speed up every 10 pieces
    s.dropInterval = Math.max(DROP_INTERVAL_MIN, DROP_INTERVAL_START - s.piecesPlaced * 15);
  }, [getSatOffset]);

  // Check for matches (3+ in a line)
  const findMatches = useCallback((board) => {
    const matched = new Set();
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c < COLS; c++) {
        if (board[r][c] !== null && board[r][c] === board[r][c - 1]) {
          run++;
        } else {
          if (run >= 3 && board[r][c - 1] !== null) {
            for (let k = 0; k < run; k++) matched.add(`${r},${c - 1 - k}`);
          }
          run = 1;
        }
      }
      if (run >= 3 && board[r][COLS - 1] !== null) {
        for (let k = 0; k < run; k++) matched.add(`${r},${COLS - 1 - k}`);
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r < ROWS; r++) {
        if (board[r][c] !== null && board[r][c] === board[r - 1][c]) {
          run++;
        } else {
          if (run >= 3 && board[r - 1][c] !== null) {
            for (let k = 0; k < run; k++) matched.add(`${r - 1 - k},${c}`);
          }
          run = 1;
        }
      }
      if (run >= 3 && board[ROWS - 1][c] !== null) {
        for (let k = 0; k < run; k++) matched.add(`${ROWS - 1 - k},${c}`);
      }
    }
    return Array.from(matched).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });
  }, []);

  // Apply gravity (blocks fall down)
  const applyGravity = useCallback((board) => {
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          if (r !== writeRow) {
            board[writeRow][c] = board[r][c];
            board[r][c] = null;
            moved = true;
          }
          writeRow--;
        }
      }
    }
    return moved;
  }, []);

  // Spawn explosion particles
  const spawnParticles = useCallback((cx, cy, color) => {
    const s = stateRef.current;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      s.particles.push({
        x: cx, y: cy,
        dx: Math.cos(angle) * (1 + Math.random() * 2),
        dy: Math.sin(angle) * (1 + Math.random() * 2),
        life: 1.0,
        color,
      });
    }
  }, []);

  // Input handling
  useEffect(() => {
    if (!started || done) return;
    const handler = (e) => {
      const s = stateRef.current;
      if (!s.active || s.clearing) return;
      const a = s.active;
      const off = getSatOffset(a.rotation);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newPx = a.px - 1;
        const newSc = newPx + off.dx;
        const pr = Math.round(a.py);
        const sr = pr + off.dy;
        if (isValid(newPx, pr, s.board) && isValid(newSc, sr, s.board)) {
          a.px = newPx;
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newPx = a.px + 1;
        const newSc = newPx + off.dx;
        const pr = Math.round(a.py);
        const sr = pr + off.dy;
        if (isValid(newPx, pr, s.board) && isValid(newSc, sr, s.board)) {
          a.px = newPx;
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Rotate
        const newRot = (a.rotation + 1) % 4;
        const newOff = getSatOffset(newRot);
        const newSc = a.px + newOff.dx;
        const pr = Math.round(a.py);
        const newSr = pr + newOff.dy;
        if (isValid(newSc, newSr, s.board)) {
          a.rotation = newRot;
        } else if (isValid(a.px + 1, pr, s.board) && isValid(a.px + 1 + newOff.dx, newSr, s.board)) {
          // Wall kick right
          a.px += 1;
          a.rotation = newRot;
        } else if (isValid(a.px - 1, pr, s.board) && isValid(a.px - 1 + newOff.dx, newSr, s.board)) {
          // Wall kick left
          a.px -= 1;
          a.rotation = newRot;
        }
        playGameSound('tick');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Hard drop speed boost
        s.dropInterval = 50;
      }
    };
    const keyUp = (e) => {
      if (e.key === 'ArrowDown') {
        const s = stateRef.current;
        s.dropInterval = Math.max(DROP_INTERVAL_MIN, DROP_INTERVAL_START - s.piecesPlaced * 15);
      }
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUp);
    };
  }, [started, done, getSatOffset, isValid]);

  // Touch controls
  const touchStartRef = useRef(null);
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const s = stateRef.current;
    if (!s.active || s.clearing) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const a = s.active;
    const off = getSatOffset(a.rotation);

    if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && elapsed < 300) {
      // Tap = rotate
      const newRot = (a.rotation + 1) % 4;
      const newOff = getSatOffset(newRot);
      const newSc = a.px + newOff.dx;
      const pr = Math.round(a.py);
      const newSr = pr + newOff.dy;
      if (isValid(newSc, newSr, s.board)) {
        a.rotation = newRot;
        playGameSound('tick');
      }
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      const dir = dx > 0 ? 1 : -1;
      const newPx = a.px + dir;
      const newSc = newPx + off.dx;
      const pr = Math.round(a.py);
      const sr = pr + off.dy;
      if (isValid(newPx, pr, s.board) && isValid(newSc, sr, s.board)) {
        a.px = newPx;
      }
    } else if (dy > 30) {
      // Swipe down = fast drop
      s.dropInterval = 50;
      setTimeout(() => {
        s.dropInterval = Math.max(DROP_INTERVAL_MIN, DROP_INTERVAL_START - s.piecesPlaced * 15);
      }, 500);
    }
  }, [getSatOffset, isValid]);

  // Game loop
  useEffect(() => {
    if (!started || done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    s.running = true;
    s.lastTime = performance.now();

    if (!s.active) spawnPiece();

    function tick(now) {
      if (!s.running) return;
      const dt = now - s.lastTime;
      s.lastTime = now;

      // --- Clear phase ---
      if (s.clearing) {
        s.clearTimer -= dt;
        if (s.clearTimer <= 0) {
          // Remove cleared cells
          for (const { r, c } of s.clearCells) {
            spawnParticles(c * CELL + CELL / 2, r * CELL + CELL / 2, colors[s.board[r][c]] || '#fff');
            s.board[r][c] = null;
          }
          s.clearCells = [];
          applyGravity(s.board);

          // Check for chain
          const newMatches = findMatches(s.board);
          if (newMatches.length > 0) {
            s.chainCount++;
            const pts = newMatches.length * 10 * Math.pow(2, s.chainCount);
            scoreRef.current += pts;
            setScore(scoreRef.current);
            setChainText({ text: `${s.chainCount + 1}x Chain! +${pts}`, id: Date.now() });
            playGameSound('win');
            s.clearCells = newMatches;
            s.clearTimer = 350;
          } else {
            s.clearing = false;
            s.chainCount = 0;
            setChainText(null);
            // Spawn next piece
            if (!spawnPiece()) {
              // Game over - board full
              s.running = false;
              setDone(true);
              if (scoreRef.current > 0) {
                confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
              }
              submit(scoreRef.current);
              setTimeout(() => onComplete(scoreRef.current), 600);
              return;
            }
          }
        }
      }

      // --- Active piece falling ---
      if (s.active && !s.clearing) {
        s.fallTimer += dt;
        if (s.fallTimer >= s.dropInterval) {
          s.fallTimer = 0;
          const a = s.active;
          const off = getSatOffset(a.rotation);
          const newPy = a.py + 1;
          const pr = Math.round(newPy);
          const sr = pr + off.dy;
          const sc = a.px + off.dx;

          // Can we move down?
          const pivotBlocked = pr >= ROWS || (pr >= 0 && s.board[pr][a.px] !== null);
          const satBlocked = sr >= ROWS || (sr >= 0 && sc >= 0 && sc < COLS && s.board[sr][sc] !== null);

          if (pivotBlocked || satBlocked) {
            lockPiece();
            playGameSound('pop');

            // Check for matches
            const matches = findMatches(s.board);
            if (matches.length > 0) {
              const pts = matches.length * 10;
              scoreRef.current += pts;
              setScore(scoreRef.current);
              playGameSound('correct');
              s.clearing = true;
              s.clearCells = matches;
              s.clearTimer = 350;
              s.chainCount = 0;
            } else {
              // Check if board is full at top
              if (s.board[0].some(c => c !== null) || s.board[1].some(c => c !== null)) {
                // Check for game over
                const topFilled = s.board[0].filter(c => c !== null).length;
                if (topFilled >= COLS - 1) {
                  s.running = false;
                  setDone(true);
                  submit(scoreRef.current);
                  setTimeout(() => onComplete(scoreRef.current), 600);
                  return;
                }
              }
              if (!spawnPiece()) {
                s.running = false;
                setDone(true);
                submit(scoreRef.current);
                setTimeout(() => onComplete(scoreRef.current), 600);
                return;
              }
            }
          } else {
            a.py = newPy;
          }
        }
      }

      // --- Update particles ---
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.08; // gravity
        p.life -= 0.03;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ==================== DRAW ====================
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(W, r * CELL);
        ctx.stroke();
      }

      // Board blocks
      ctx.font = `${CELL - 10}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const val = s.board[r][c];
          if (val === null) continue;
          const isClearing = s.clearing && s.clearCells.some(m => m.r === r && m.c === c);
          const x = c * CELL;
          const y = r * CELL;

          if (isClearing) {
            // Flash effect
            const flash = Math.sin(s.clearTimer * 0.02) * 0.5 + 0.5;
            ctx.globalAlpha = 0.3 + flash * 0.7;
          }

          // Block background
          ctx.fillStyle = colors[val] || '#666';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();

          // Block highlight
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x + 4, y + 4, CELL - 8, 3);

          // Emoji
          ctx.fillStyle = '#fff';
          ctx.fillText(emoji[val] || '?', x + CELL / 2, y + CELL / 2 + 1);

          ctx.globalAlpha = 1;
        }
      }

      // Active piece
      if (s.active && !s.clearing) {
        const a = s.active;
        const off = getSatOffset(a.rotation);
        const drawBlock = (col, row, colorIdx) => {
          if (row < 0) return;
          const x = col * CELL;
          const y = row * CELL;
          ctx.fillStyle = colors[colorIdx] || '#666';
          ctx.shadowColor = colors[colorIdx] || '#666';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(x + 4, y + 4, CELL - 8, 3);
          ctx.fillStyle = '#fff';
          ctx.fillText(emoji[colorIdx] || '?', x + CELL / 2, y + CELL / 2 + 1);
        };
        const pr = Math.round(a.py);
        const sr = pr + off.dy;
        const sc = a.px + off.dx;
        drawBlock(a.px, pr, a.pc);
        drawBlock(sc, sr, a.sc);
      }

      // Ghost / drop preview
      if (s.active && !s.clearing) {
        const a = s.active;
        const off = getSatOffset(a.rotation);
        let ghostY = Math.round(a.py);
        while (true) {
          const nextY = ghostY + 1;
          const pr = nextY;
          const sr = pr + off.dy;
          const sc = a.px + off.dx;
          const pivotBlocked = pr >= ROWS || (pr >= 0 && s.board[pr][a.px] !== null);
          const satBlocked = sr >= ROWS || (sr >= 0 && sc >= 0 && sc < COLS && s.board[sr][sc] !== null);
          if (pivotBlocked || satBlocked) break;
          ghostY = nextY;
        }
        if (ghostY > Math.round(a.py) + 1) {
          ctx.globalAlpha = 0.2;
          const gx1 = a.px * CELL;
          const gy1 = ghostY * CELL;
          ctx.strokeStyle = colors[a.pc] || '#666';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(gx1 + 4, gy1 + 4, CELL - 8, CELL - 8);
          const gx2 = (a.px + off.dx) * CELL;
          const gy2 = (ghostY + off.dy) * CELL;
          if (ghostY + off.dy >= 0 && ghostY + off.dy < ROWS) {
            ctx.strokeStyle = colors[a.sc] || '#666';
            ctx.strokeRect(gx2 + 4, gy2 + 4, CELL - 8, CELL - 8);
          }
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Danger zone warning (top 2 rows)
      const topCount = s.board[0].filter(v => v !== null).length + s.board[1].filter(v => v !== null).length;
      if (topCount > 0) {
        const danger = Math.min(1, topCount / 6);
        ctx.fillStyle = `rgba(239, 68, 68, ${danger * 0.15})`;
        ctx.fillRect(0, 0, W, CELL * 2);
      }

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      s.running = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [started, done, colors, emoji, bgColor, theme, getSatOffset, isValid,
      lockPiece, findMatches, applyGravity, spawnPiece, spawnParticles, submit, onComplete]);

  const handleStart = useCallback(() => {
    if (!started) {
      setStarted(true);
      start();
    }
  }, [started, start]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{
          color: timeLeft <= 15 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 15 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        {cfg && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{cfg.title}</span>
        )}
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Chain text */}
      {chainText && (
        <div style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#fbbf24',
          textShadow: '0 0 8px rgba(251,191,36,0.5)',
        }}>
          {chainText.text}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleStart}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          touchAction: 'none',
        }}
      />

      {!started && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Click to start. Arrow keys or swipe to move.<br />
          Up arrow / tap to rotate. Match 3+ to clear!
        </p>
      )}
      {done && (
        <p style={{ fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          {score > 0 ? 'Nice chains!' : 'Game Over!'} Final: {score} pts
        </p>
      )}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
