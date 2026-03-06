import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 400;
const BASKET_W = 50;
const BASKET_H = 20;
const ITEM_SIZE = 22;
const SPAWN_INTERVAL_BASE = 600;

const GOOD_EMOJI = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '🍪'],
  space:     ['⭐', '🌙', '🪐', '💫', '🛸', '☄️'],
  tech:      ['💡', '⚡', '📱', '💎', '🔋', '🎮'],
  nature:    ['🌸', '🍃', '🦋', '🌻', '🍀', '🐝'],
  music:     ['🎵', '🎸', '🥁', '🎤', '🎶', '🎹'],
  family:    ['❤️', '🏠', '🧸', '🎁', '🌈', '⭐'],
  scifi:     ['🔮', '🧬', '⚡', '🌀', '💠', '🛸'],
  humor:     ['😂', '🤣', '🎈', '🥳', '🎉', '✨'],
  adventure: ['🗺️', '⛰️', '🧭', '🏔️', '⭐', '🌄'],
  arts:      ['🎨', '🖌️', '🎭', '✨', '🌈', '💫'],
  spooky:    ['🎃', '👻', '🍬', '🕯️', '🦇', '🕷️'],
  winter:    ['❄️', '⛄', '🎄', '🎁', '🧣', '☃️'],
  default:   ['⭐', '💎', '🍀', '✨', '🔥', '💫'],
};

const BAD_EMOJI = ['💣', '💀', '🔴'];

const BASKET_EMOJI = {
  food: '🧺', space: '🛰️', tech: '💻', nature: '🌿', music: '🎧',
  family: '🤲', scifi: '🤖', humor: '🤹', adventure: '🎒', arts: '🎨',
  spooky: '🧙', winter: '🧤', default: '🧺',
};

const VARIANTS = {
  snow: {
    goodEmoji: ['❄️', '🌨️', '⛄', '🎿', '🧊', '☃️'],
    badEmoji: ['🪨', '🔥'],
    basket: '🧤',
    bgTop: 'rgba(30, 40, 80, 1)',
    bgBottom: 'rgba(10, 15, 40, 1)',
    title: 'Snowflake Catcher',
  },
};

export default function CatchDodge({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const category = holiday?.category || 'default';
  const goodPool = cfg?.goodEmoji || GOOD_EMOJI[category] || GOOD_EMOJI.default;
  const badPool = cfg?.badEmoji || BAD_EMOJI;
  const basketEmoji = cfg?.basket || BASKET_EMOJI[category] || BASKET_EMOJI.default;

  const canvasRef = useRef(null);
  const stateRef = useRef({
    basketX: W / 2,
    items: [],
    score: 0,
    lives: 3,
    running: false,
    lastSpawn: 0,
    speedMult: 1,
    elapsed: 0,
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('catch-dodge');
  const loopRef = useRef(null);
  const mouseXRef = useRef(W / 2);
  const lastTimeRef = useRef(0);
  const scoreRef = useRef(0);

  const { timeLeft, start: startTimer } = useGameTimer(45, {
    onExpire: () => {
      stateRef.current.running = false;
      setDone(true);
      const finalScore = stateRef.current.score;
      if (finalScore > 50) {
        playGameSound('win');
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: [theme.primary, theme.secondary, '#fbbf24'],
        });
      }
      submit(finalScore);
      onComplete(finalScore);
    },
  });

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

  // Game loop
  useEffect(() => {
    if (!started || done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    stateRef.current.running = true;
    lastTimeRef.current = performance.now();

    function spawnItem(now) {
      const s = stateRef.current;
      const isBad = Math.random() < 0.2;
      const emoji = isBad
        ? badPool[Math.floor(Math.random() * badPool.length)]
        : goodPool[Math.floor(Math.random() * goodPool.length)];
      s.items.push({
        x: ITEM_SIZE + Math.random() * (W - ITEM_SIZE * 2),
        y: -ITEM_SIZE,
        emoji,
        bad: isBad,
        speed: (1.5 + Math.random() * 1.5) * s.speedMult,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    function tick(now) {
      const s = stateRef.current;
      if (!s.running) return;

      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;
      s.elapsed += dt;

      // Speed ramp every 10 seconds
      s.speedMult = 1 + Math.floor(s.elapsed / 10000) * 0.25;

      // Spawn items
      const spawnInterval = Math.max(250, SPAWN_INTERVAL_BASE / s.speedMult);
      if (now - s.lastSpawn > spawnInterval) {
        spawnItem(now);
        s.lastSpawn = now;
      }

      // Move basket toward mouse
      const target = mouseXRef.current;
      s.basketX += (target - s.basketX) * 0.25;
      s.basketX = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, s.basketX));

      // Update items
      const basketLeft = s.basketX - BASKET_W / 2;
      const basketRight = s.basketX + BASKET_W / 2;
      const basketTop = H - BASKET_H - 15;
      const alive = [];

      for (const item of s.items) {
        item.y += item.speed;
        item.wobble += item.wobbleSpeed;
        const wobbleX = Math.sin(item.wobble) * 0.5;
        item.x += wobbleX;

        // Check basket collision
        if (
          item.y + ITEM_SIZE / 2 >= basketTop &&
          item.y - ITEM_SIZE / 2 <= basketTop + BASKET_H &&
          item.x >= basketLeft &&
          item.x <= basketRight
        ) {
          if (item.bad) {
            s.lives--;
            setLives(s.lives);
            s.score = Math.max(0, s.score - 20);
            scoreRef.current = s.score;
            setScore(s.score);
            playGameSound('wrong');
            if (s.lives <= 0) {
              s.running = false;
              setDone(true);
              submit(s.score);
              onComplete(s.score);
              return;
            }
          } else {
            s.score += 10;
            scoreRef.current = s.score;
            setScore(s.score);
            playGameSound('pop');
          }
          continue; // Remove item
        }

        // Remove items that fell off screen
        if (item.y > H + ITEM_SIZE) continue;

        alive.push(item);
      }
      s.items = alive;

      // ── Draw ──
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      const bgTop = cfg?.bgTop || 'rgba(10, 10, 30, 1)';
      const bgBot = cfg?.bgBottom || 'rgba(10, 10, 30, 1)';
      bgGrad.addColorStop(0, bgTop);
      bgGrad.addColorStop(1, bgBot);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Items
      ctx.font = `${ITEM_SIZE}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const item of s.items) {
        // Glow for bad items
        if (item.bad) {
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 8;
        }
        ctx.fillText(item.emoji, item.x, item.y);
        ctx.shadowBlur = 0;
      }

      // Basket
      ctx.font = `${BASKET_W * 0.6}px serif`;
      ctx.fillText(basketEmoji, s.basketX, basketTop + BASKET_H / 2);

      // Basket platform glow
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(basketLeft, basketTop + BASKET_H);
      ctx.lineTo(basketRight, basketTop + BASKET_H);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      stateRef.current.running = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [started, done, goodPool, badPool, basketEmoji, cfg, theme, submit, onComplete]);

  const handleStart = useCallback(() => {
    setStarted(true);
    stateRef.current.elapsed = 0;
    stateRef.current.lastSpawn = performance.now();
    startTimer();
  }, [startTimer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: W,
        maxWidth: '100%',
        fontSize: '0.8rem',
      }}>
        <span style={{
          color: lives <= 1 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: lives <= 1 ? 700 : 400,
        }}>
          {'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, 3 - lives))}
        </span>
        <span style={{
          color: timeLeft <= 10 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 10 ? 700 : 400,
        }}>
          {started ? `${timeLeft}s` : '45s'}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={() => { if (!started) handleStart(); }}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          cursor: started ? 'none' : 'pointer',
          touchAction: 'none',
        }}
      />

      {!started && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Click to start. Move mouse/finger to catch {goodPool[0]} and dodge {badPool[0]}!
        </p>
      )}

      {cfg?.title && !started && (
        <p style={{
          fontSize: '0.7rem',
          color: theme.secondary,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {cfg.title}
        </p>
      )}

      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
