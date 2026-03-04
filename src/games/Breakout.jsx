import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 400;
const PADDLE_W = 60;
const PADDLE_H = 10;
const BALL_R = 5;
const BRICK_ROWS = 5;
const BRICK_COLS = 7;
const BRICK_W = W / BRICK_COLS - 4;
const BRICK_H = 14;
const BRICK_PAD = 3;
const BRICK_TOP = 40;

const BRICK_COLORS = {
  food:      ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#fbbf24'],
  tech:      ['#06b6d4', '#14b8a6', '#3b82f6', '#8b5cf6', '#06b6d4'],
  space:     ['#7c3aed', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'],
  nature:    ['#22c55e', '#10b981', '#84cc16', '#16a34a', '#4ade80'],
  family:    ['#ec4899', '#f43f5e', '#f472b6', '#fb7185', '#fda4af'],
  spooky:    ['#f97316', '#22c55e', '#eab308', '#f59e0b', '#84cc16'],
  winter:    ['#38bdf8', '#e0f2fe', '#7dd3fc', '#93c5fd', '#bae6fd'],
  default:   ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e'],
};

function getColors(category) {
  return BRICK_COLORS[category] || BRICK_COLORS.default;
}

function buildBricks(category) {
  const colors = getColors(category);
  const bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD + 2,
        y: r * (BRICK_H + BRICK_PAD) + BRICK_TOP,
        w: BRICK_W,
        h: BRICK_H,
        color: colors[r % colors.length],
        alive: true,
      });
    }
  }
  return bricks;
}

export default function Breakout({ onComplete, holiday, theme }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    paddle: W / 2 - PADDLE_W / 2,
    ball: { x: W / 2, y: H - 40, dx: 2.5, dy: -3 },
    bricks: buildBricks(holiday?.category),
    score: 0,
    lives: 3,
    running: false,
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('breakout');
  const loopRef = useRef(null);
  const mouseXRef = useRef(W / 2);

  // Mouse/touch tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = W / rect.width;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      mouseXRef.current = (clientX - rect.left) * scale;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft') mouseXRef.current = Math.max(0, s.paddle);
      if (e.key === 'ArrowRight') mouseXRef.current = Math.min(W, s.paddle + PADDLE_W + 20);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Game loop
  useEffect(() => {
    if (!started || done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    stateRef.current.running = true;

    function tick() {
      const s = stateRef.current;
      if (!s.running) return;

      // Paddle follows mouse
      const target = mouseXRef.current - PADDLE_W / 2;
      s.paddle += (target - s.paddle) * 0.3;
      s.paddle = Math.max(0, Math.min(W - PADDLE_W, s.paddle));

      // Ball movement
      const b = s.ball;
      b.x += b.dx;
      b.y += b.dy;

      // Wall bounces
      if (b.x <= BALL_R || b.x >= W - BALL_R) { b.dx = -b.dx; b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x)); }
      if (b.y <= BALL_R) { b.dy = -b.dy; b.y = BALL_R; }

      // Paddle bounce
      if (b.dy > 0 && b.y + BALL_R >= H - PADDLE_H - 10 && b.y + BALL_R <= H - 5
        && b.x >= s.paddle && b.x <= s.paddle + PADDLE_W) {
        b.dy = -Math.abs(b.dy);
        // Angle based on hit position
        const hit = (b.x - s.paddle) / PADDLE_W - 0.5;
        b.dx = hit * 6;
        b.y = H - PADDLE_H - 10 - BALL_R;
        playGameSound('tick');
      }

      // Bottom death
      if (b.y > H + 10) {
        s.lives--;
        setLives(s.lives);
        if (s.lives <= 0) {
          s.running = false;
          setDone(true);
          playGameSound('wrong');
          submit(s.score);
          onComplete(s.score);
          return;
        }
        playGameSound('wrong');
        b.x = W / 2; b.y = H - 40; b.dx = 2.5; b.dy = -3;
      }

      // Brick collision
      for (const brick of s.bricks) {
        if (!brick.alive) continue;
        if (b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w
          && b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h) {
          brick.alive = false;
          b.dy = -b.dy;
          s.score += 10;
          setScore(s.score);
          playGameSound('pop');
          break;
        }
      }

      // Win check
      if (s.bricks.every(b => !b.alive)) {
        s.running = false;
        setDone(true);
        playGameSound('win');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        submit(s.score);
        onComplete(s.score);
        return;
      }

      // Draw
      ctx.fillStyle = 'rgba(10, 10, 30, 1)';
      ctx.fillRect(0, 0, W, H);

      // Bricks
      for (const brick of s.bricks) {
        if (!brick.alive) continue;
        ctx.fillStyle = brick.color;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
        ctx.fill();
      }

      // Paddle
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.roundRect(s.paddle, H - PADDLE_H - 10, PADDLE_W, PADDLE_H, 5);
      ctx.fill();

      // Ball
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // Ball glow
      ctx.shadowColor = theme.secondary;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => { stateRef.current.running = false; cancelAnimationFrame(loopRef.current); };
  }, [started, done, holiday, theme, submit, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {'❤️'.repeat(lives)}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={() => { if (!started) setStarted(true); }}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          cursor: 'none',
          touchAction: 'none',
        }}
      />
      {!started && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Click to start. Move mouse/finger to control paddle.</p>
      )}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
