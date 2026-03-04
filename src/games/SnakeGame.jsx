import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';

const CELL = 20;
const COLS = 15;
const ROWS = 15;
const W = COLS * CELL;
const H = ROWS * CELL;

const FOOD_EMOJI = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰'],
  space:     ['⭐', '🌙', '☄️', '🛸', '🪐'],
  tech:      ['💡', '⚡', '🔧', '📱', '🎮'],
  nature:    ['🌸', '🍃', '🦋', '🐝', '🌻'],
  music:     ['🎵', '🎸', '🥁', '🎤', '🎶'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀'],
  default:   ['⭐', '💎', '🔥', '🍀', '✨'],
};

function getFood(category) {
  const pool = FOOD_EMOJI[category] || FOOD_EMOJI.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnFood(snake) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

const DIR = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };

export default function SnakeGame({ onComplete, holiday, theme }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    snake: [{ x: 7, y: 7 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 3, y: 3 },
    foodEmoji: getFood(holiday?.category),
    score: 0,
    alive: true,
    speed: 150,
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const { best, submit } = useHighScore('snake');
  const loopRef = useRef(null);
  const lastMoveRef = useRef(0);
  const touchStart = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const s = stateRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && s.dir.x !== -1) s.nextDir = { x: 1, y: 0 };
      else if (dx < -20 && s.dir.x !== 1) s.nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 20 && s.dir.y !== -1) s.nextDir = { x: 0, y: 1 };
      else if (dy < -20 && s.dir.y !== 1) s.nextDir = { x: 0, y: -1 };
    }
    touchStart.current = null;
    if (!started) setStarted(true);
  }, [started]);

  useEffect(() => {
    const handler = (e) => {
      const d = DIR[e.key];
      if (!d) return;
      e.preventDefault();
      const s = stateRef.current;
      if (d.x !== -s.dir.x || d.y !== -s.dir.y) {
        s.nextDir = d;
      }
      if (!started) setStarted(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function tick(now) {
      const s = stateRef.current;
      if (!s.alive) return;

      if (now - lastMoveRef.current < s.speed) {
        loopRef.current = requestAnimationFrame(tick);
        return;
      }
      lastMoveRef.current = now;

      s.dir = s.nextDir;
      const head = {
        x: (s.snake[0].x + s.dir.x + COLS) % COLS,
        y: (s.snake[0].y + s.dir.y + ROWS) % ROWS,
      };

      if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        s.alive = false;
        playGameSound('wrong');
        setGameOver(true);
        submit(s.score);
        onComplete(s.score);
        return;
      }

      s.snake.unshift(head);

      if (head.x === s.food.x && head.y === s.food.y) {
        s.score += 10;
        s.food = spawnFood(s.snake);
        s.foodEmoji = getFood(holiday?.category);
        s.speed = Math.max(60, s.speed - 3);
        setScore(s.score);
        playGameSound('correct');
      } else {
        s.snake.pop();
      }

      // Draw
      ctx.fillStyle = 'rgba(10, 10, 30, 1)';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let x = 0; x <= W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      s.snake.forEach((seg, i) => {
        const alpha = 1 - (i / s.snake.length) * 0.6;
        ctx.fillStyle = i === 0 ? theme.primary : `${theme.secondary}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
        ctx.fill();
      });

      ctx.font = `${CELL - 4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.foodEmoji, s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2);

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(loopRef.current);
  }, [started, gameOver, holiday, theme, submit, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {gameOver ? 'Game Over!' : started ? 'Arrow keys / swipe' : 'Press arrow or swipe to start'}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (!started) setStarted(true); }}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          touchAction: 'none',
        }}
      />
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
