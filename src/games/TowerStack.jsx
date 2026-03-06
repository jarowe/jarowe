import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 450;
const MAX_LAYERS = 20;
const BLOCK_H = 18;
const BASE_WIDTH = 180;
const BASE_SPEED = 2.5;
const PERFECT_THRESHOLD = 3;
const GOOD_THRESHOLD = 12;

const VARIANTS = {
  fireworks: {
    blockColors: ['#ef4444', '#ffffff', '#3b82f6'],
    perfectEffect: 'firework',
    trail: 'sparkler',
  },
};

function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function hexToRgba(hex, alpha) {
  const h = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(h >> 16) & 0xff},${(h >> 8) & 0xff},${h & 0xff},${alpha})`;
}

export default function TowerStack({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const canvasRef = useRef(null);
  const stateRef = useRef({
    layers: [],          // { x, width, perfect } stacked layers
    current: null,       // { x, width, speed, dir } the moving block
    phase: 'idle',       // idle | moving | dropping | gameover | win
    score: 0,
    perfectStreak: 0,
    dropAnim: null,      // { x, width, y, vy } the falling trimmed piece
    flashTimer: 0,       // for perfect flash effect
    particles: [],       // sparkle particles
  });
  const [score, setScore] = useState(0);
  const [layer, setLayer] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [gameState, setGameState] = useState('idle'); // idle | playing | done
  const { best, submit } = useHighScore('tower-stack');
  const scoreRef = useRef(0);
  const loopRef = useRef(null);

  // Spawn a new moving block
  const spawnBlock = useCallback(() => {
    const s = stateRef.current;
    const prevWidth = s.layers.length > 0 ? s.layers[s.layers.length - 1].width : BASE_WIDTH;
    // Speed increases with layers
    const speed = BASE_SPEED + s.layers.length * 0.15;
    s.current = {
      x: -prevWidth,
      width: prevWidth,
      speed,
      dir: 1,
    };
    s.phase = 'moving';
  }, []);

  // Handle tap/click to drop block
  const handleDrop = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle') {
      // Start the game — place foundation block
      s.layers.push({ x: W / 2 - BASE_WIDTH / 2, width: BASE_WIDTH, perfect: false });
      setLayer(1);
      spawnBlock();
      setGameState('playing');
      return;
    }
    if (s.phase !== 'moving' || !s.current) return;

    const cur = s.current;
    const prev = s.layers[s.layers.length - 1];

    // Calculate overlap
    const overlapLeft = Math.max(cur.x, prev.x);
    const overlapRight = Math.min(cur.x + cur.width, prev.x + prev.width);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // Missed entirely — game over
      s.phase = 'gameover';
      s.dropAnim = { x: cur.x, width: cur.width, y: getBlockY(s.layers.length), vy: 0 };
      playGameSound('wrong');
      setFeedback('Miss!');
      setGameState('done');
      submit(s.score);
      setTimeout(() => onComplete(s.score), 1200);
      return;
    }

    // Calculate how much was trimmed
    const diff = Math.abs(overlapWidth - cur.width);
    let pts = 0;
    let isPerfect = false;

    if (diff <= PERFECT_THRESHOLD) {
      // Perfect placement!
      isPerfect = true;
      s.perfectStreak++;
      pts = 20 + (s.perfectStreak > 1 ? s.perfectStreak * 5 : 0);
      s.flashTimer = 15;
      playGameSound('correct');
      setFeedback(s.perfectStreak > 2 ? `Perfect x${s.perfectStreak}!` : 'Perfect!');

      // Confetti on streaks
      if (s.perfectStreak >= 3) {
        if (cfg?.perfectEffect === 'firework') {
          confetti({ particleCount: 20, angle: 90, spread: 40, startVelocity: 20, origin: { x: 0.5, y: 0.3 }, colors: cfg.blockColors });
        } else {
          // Sparkle particles
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: W / 2 + (Math.random() - 0.5) * overlapWidth,
              y: getBlockY(s.layers.length),
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 3 - 1,
              life: 30 + Math.random() * 20,
              maxLife: 50,
            });
          }
        }
      }

      // Perfect: keep full width (snap to previous)
      s.layers.push({ x: prev.x, width: prev.width, perfect: true });
    } else {
      s.perfectStreak = 0;
      pts = diff <= GOOD_THRESHOLD ? 10 : 5;
      setFeedback(diff <= GOOD_THRESHOLD ? 'Good!' : 'Barely!');
      playGameSound('tick');

      // Add trimmed piece as falling animation
      if (cur.x < prev.x) {
        // Trimmed from left
        s.dropAnim = { x: cur.x, width: cur.width - overlapWidth, y: getBlockY(s.layers.length), vy: 0 };
      } else {
        // Trimmed from right
        s.dropAnim = { x: overlapRight, width: cur.width - overlapWidth, y: getBlockY(s.layers.length), vy: 0 };
      }

      s.layers.push({ x: overlapLeft, width: overlapWidth, perfect: false });
    }

    s.score += pts;
    scoreRef.current = s.score;
    setScore(s.score);
    setLayer(s.layers.length);
    s.current = null;

    // Check win
    if (s.layers.length >= MAX_LAYERS) {
      s.phase = 'win';
      playGameSound('win');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
      setFeedback('Tower Complete!');
      setGameState('done');
      submit(s.score);
      setTimeout(() => onComplete(s.score), 1500);
      return;
    }

    // Clear feedback after delay
    setTimeout(() => setFeedback(''), 500);

    // Spawn next block
    setTimeout(() => spawnBlock(), 200);
  }, [spawnBlock, theme, cfg, submit, onComplete]);

  function getBlockY(layerIndex) {
    // Layers stack from bottom up; camera follows
    return H - 40 - layerIndex * BLOCK_H;
  }

  // Main game loop (canvas rendering)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function getBlockColor(layerIdx) {
      if (cfg?.blockColors) {
        return cfg.blockColors[layerIdx % cfg.blockColors.length];
      }
      const t = layerIdx / MAX_LAYERS;
      return lerpColor(theme.primary || '#7c3aed', theme.secondary || '#06b6d4', t);
    }

    function tick() {
      const s = stateRef.current;

      // Update moving block
      if (s.phase === 'moving' && s.current) {
        s.current.x += s.current.speed * s.current.dir;
        // Bounce at edges
        if (s.current.x + s.current.width > W + 20) s.current.dir = -1;
        if (s.current.x < -20) s.current.dir = 1;
      }

      // Update falling trimmed piece
      if (s.dropAnim) {
        s.dropAnim.vy += 0.5;
        s.dropAnim.y += s.dropAnim.vy;
        if (s.dropAnim.y > H + 50) s.dropAnim = null;
      }

      // Flash timer
      if (s.flashTimer > 0) s.flashTimer--;

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
      });

      // ── Draw ──
      // Background
      ctx.fillStyle = 'rgba(10, 10, 30, 1)';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      for (let y = 0; y < H; y += BLOCK_H) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Camera offset: scroll up as tower grows
      const cameraY = Math.max(0, (s.layers.length - 12) * BLOCK_H);

      // Draw stacked layers
      s.layers.forEach((layer, i) => {
        const y = getBlockY(i) + cameraY;
        if (y < -BLOCK_H || y > H + BLOCK_H) return;
        const color = getBlockColor(i);

        // Block body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(layer.x, y, layer.width, BLOCK_H - 2, 3);
        ctx.fill();

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(layer.x + 2, y + 1, layer.width - 4, 3);

        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(layer.x + 2, y + BLOCK_H - 4, layer.width - 4, 2);

        // Perfect glow
        if (layer.perfect) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = 'transparent';
          ctx.beginPath();
          ctx.roundRect(layer.x, y, layer.width, BLOCK_H - 2, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw moving block
      if (s.current && s.phase === 'moving') {
        const y = getBlockY(s.layers.length) + cameraY;
        const color = getBlockColor(s.layers.length);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(s.current.x, y, s.current.width, BLOCK_H - 2, 3);
        ctx.fill();

        // Sparkler trail for fireworks variant
        if (cfg?.trail === 'sparkler') {
          for (let i = 0; i < 3; i++) {
            const sx = s.current.x + Math.random() * s.current.width;
            const sy = y + Math.random() * BLOCK_H;
            ctx.fillStyle = `rgba(255,${200 + Math.random() * 55},100,${0.5 + Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Guide line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.setLineDash([4, 4]);
        const prev = s.layers[s.layers.length - 1];
        ctx.strokeRect(prev.x, y, prev.width, BLOCK_H - 2);
        ctx.setLineDash([]);
      }

      // Draw falling trimmed piece
      if (s.dropAnim) {
        const y = s.dropAnim.y + cameraY;
        const color = getBlockColor(s.layers.length - 1);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(s.dropAnim.x, y, s.dropAnim.width, BLOCK_H - 2, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Perfect flash overlay
      if (s.flashTimer > 0) {
        const alpha = (s.flashTimer / 15) * 0.15;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Particles
      s.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y + cameraY, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Layer count display
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.layers.length}/${MAX_LAYERS}`, W - 8, 16);

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(loopRef.current);
  }, [theme, cfg]);

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDrop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDrop]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {gameState === 'idle' ? 'Tap to start' : gameState === 'done' ? (stateRef.current.phase === 'win' ? 'Tower Complete!' : 'Game Over') : `Layer ${layer}/${MAX_LAYERS}`}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleDrop}
        onTouchStart={(e) => { e.preventDefault(); handleDrop(); }}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          touchAction: 'none',
          cursor: 'pointer',
        }}
      />

      {/* Feedback */}
      {feedback && (
        <p style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: feedback.includes('Perfect') ? '#22c55e' : feedback === 'Miss!' ? '#f43f5e' : theme.secondary,
          textAlign: 'center',
          margin: 0,
          textShadow: feedback.includes('Perfect') ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
        }}>
          {feedback}
        </p>
      )}

      {/* Start hint */}
      {gameState === 'idle' && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: 0 }}>
          Tap / click / spacebar to drop blocks. Stack them perfectly!
        </p>
      )}

      {/* Best score */}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
