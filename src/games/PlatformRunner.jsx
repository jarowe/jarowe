import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 320;
const H = 400;
const GRAVITY = 0.55;
const JUMP_FORCE = -10;
const DOUBLE_JUMP_FORCE = -8.5;
const MAX_HOLD_BOOST = 6;
const GROUND_H = 50;
const PLAYER_SIZE = 22;
const COIN_SIZE = 18;
const OBSTACLE_W = 22;
const OBSTACLE_H = 28;
const PLATFORM_H = 14;
const STAR_COUNT = 40;

const CATEGORY_CONFIG = {
  food:      { player: '🍕', coins: ['🍔', '🌮', '🍩', '🍰', '🍣'], obstacles: ['🌶️', '🔪', '🧅'], ground: '#7c2d12', sky1: '#1a0a2e', sky2: '#0d0520', accent: '#f59e0b' },
  space:     { player: '🚀', coins: ['⭐', '🌙', '☄️', '💫', '🪐'], obstacles: ['🛸', '☢️', '🌑'], ground: '#1e1b4b', sky1: '#0a0a2e', sky2: '#050514', accent: '#7c3aed' },
  tech:      { player: '🤖', coins: ['💡', '⚡', '🔧', '📱', '💾'], obstacles: ['🐛', '🔥', '💣'], ground: '#0f172a', sky1: '#0a1628', sky2: '#050a14', accent: '#06b6d4' },
  nature:    { player: '🦊', coins: ['🌸', '🍃', '🦋', '🐝', '🌻'], obstacles: ['🌵', '🕷️', '🪨'], ground: '#14532d', sky1: '#0a2e1a', sky2: '#051408', accent: '#22c55e' },
  music:     { player: '🎸', coins: ['🎵', '🥁', '🎤', '🎶', '🎷'], obstacles: ['📢', '💥', '🔕'], ground: '#4a1d6e', sky1: '#1a0a2e', sky2: '#0d0520', accent: '#a855f7' },
  family:    { player: '🧡', coins: ['🎈', '🎁', '🧸', '🎉', '💖'], obstacles: ['🧱', '🚧', '⛔'], ground: '#831843', sky1: '#2e0a1a', sky2: '#140508', accent: '#ec4899' },
  scifi:     { player: '👽', coins: ['🔮', '🧬', '🌀', '⚡', '💠'], obstacles: ['🛡️', '💣', '🔥'], ground: '#1e1b4b', sky1: '#0a0a2e', sky2: '#050514', accent: '#6366f1' },
  humor:     { player: '🤡', coins: ['😂', '🎉', '🥳', '🤪', '🎈'], obstacles: ['💩', '🍌', '🧨'], ground: '#713f12', sky1: '#2e1a0a', sky2: '#140d05', accent: '#eab308' },
  adventure: { player: '🏃', coins: ['💎', '🏆', '👑', '🗝️', '✨'], obstacles: ['🪤', '🐍', '🕳️'], ground: '#422006', sky1: '#1a140a', sky2: '#0d0a05', accent: '#f97316' },
  arts:      { player: '🎨', coins: ['🖌️', '🎭', '📸', '🎬', '🎪'], obstacles: ['💥', '🧱', '🚫'], ground: '#4c1d95', sky1: '#1a0a2e', sky2: '#0d0520', accent: '#c084fc' },
  spooky:    { player: '👻', coins: ['🎃', '🕷️', '🦇', '🍬', '🌙'], obstacles: ['💀', '⚰️', '🔥'], ground: '#1c1917', sky1: '#1a0f0a', sky2: '#0a0705', accent: '#f97316' },
  winter:    { player: '⛄', coins: ['❄️', '🎄', '🎅', '🧣', '🛷'], obstacles: ['🧊', '🌨️', '🐻‍❄️'], ground: '#1e3a5f', sky1: '#0a1e2e', sky2: '#050f14', accent: '#38bdf8' },
  default:   { player: '🏃', coins: ['⭐', '💎', '🔥', '🍀', '✨'], obstacles: ['🌵', '🧱', '💣'], ground: '#1e1b4b', sky1: '#0a0a2e', sky2: '#050514', accent: '#7c3aed' },
};

const VARIANTS = {
  mario: {
    player: '🍄',
    coins: ['❓', '❓', '❓', '❓', '❓'],
    obstacles: ['🌵', '🐢'],
    ground: '#22c55e',
    sky1: '#87CEEB',
    sky2: '#5ba3cf',
    accent: '#fbbf24',
    coinSound: 'correct',
  },
};

function makeStars() {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W * 3,
    y: Math.random() * (H - GROUND_H - 60) + 10,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.4 + 0.2,
  }));
}

function generatePlatform(x, prevY, speed) {
  const gapMin = 60 + speed * 2;
  const gapMax = 120 + speed * 4;
  const gap = gapMin + Math.random() * (gapMax - gapMin);
  const pW = 50 + Math.random() * 60;
  const pY = H - GROUND_H - 40 - Math.random() * 140;
  const clamped = Math.max(H - GROUND_H - 200, Math.min(H - GROUND_H - 60, pY));
  return { x: x + gap, y: clamped, w: pW, hasCoin: Math.random() > 0.35, hasObstacle: Math.random() > 0.7 };
}

function initialPlatforms() {
  const platforms = [];
  let x = 200;
  let prevY = H - GROUND_H - 80;
  for (let i = 0; i < 8; i++) {
    const p = generatePlatform(x, prevY, 2);
    platforms.push(p);
    x = p.x + p.w;
    prevY = p.y;
  }
  return platforms;
}

export default function PlatformRunner({ onComplete, holiday, theme, variant }) {
  const canvasRef = useRef(null);
  const cfg = variant ? VARIANTS[variant] : null;
  const cat = holiday?.category || 'default';
  const config = cfg || CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;

  const stateRef = useRef({
    player: { x: 60, y: H - GROUND_H - PLAYER_SIZE, vy: 0, grounded: true, jumps: 0 },
    platforms: initialPlatforms(),
    coins: [],
    obstacles: [],
    scroll: 0,
    speed: 2.5,
    score: 0,
    lives: 3,
    distance: 0,
    running: false,
    jumpHeld: false,
    jumpHoldFrames: 0,
    stars: makeStars(),
    dustStars: makeStars().map(s => ({ ...s, y: H - GROUND_H + 5 + Math.random() * (GROUND_H - 10), a: Math.random() * 0.15 + 0.05 })),
    invincible: 0,
    particles: [],
    time: 0,
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('platform-runner');
  const loopRef = useRef(null);

  // Jump input
  const jumpDown = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    if (s.player.jumps < 2) {
      const force = s.player.jumps === 0 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
      s.player.vy = force;
      s.player.grounded = false;
      s.player.jumps++;
      s.jumpHeld = true;
      s.jumpHoldFrames = 0;
      playGameSound('pop');
    }
  }, []);

  const jumpUp = useCallback(() => {
    stateRef.current.jumpHeld = false;
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!started) { setStarted(true); return; }
        jumpDown();
      }
    };
    const up = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') jumpUp();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [started, jumpDown, jumpUp]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e) => {
      e.preventDefault();
      if (!started) { setStarted(true); return; }
      jumpDown();
    };
    const onUp = (e) => {
      e.preventDefault();
      jumpUp();
    };
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchend', onUp);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [started, jumpDown, jumpUp]);

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
      s.time++;

      const p = s.player;

      // Hold jump for extra height
      if (s.jumpHeld && s.jumpHoldFrames < MAX_HOLD_BOOST) {
        p.vy -= 0.4;
        s.jumpHoldFrames++;
      }

      // Gravity
      p.vy += GRAVITY;
      p.y += p.vy;

      // Speed increases over time
      s.speed = 2.5 + s.distance * 0.001;
      if (s.speed > 7) s.speed = 7;
      s.scroll += s.speed;
      s.distance += s.speed;

      // Ground collision
      const groundY = H - GROUND_H - PLAYER_SIZE;
      if (p.y >= groundY) {
        p.y = groundY;
        p.vy = 0;
        p.grounded = true;
        p.jumps = 0;
      }

      // Platform collision (only when falling)
      p.grounded = p.y >= groundY;
      for (const plat of s.platforms) {
        const px = plat.x - s.scroll;
        if (p.vy >= 0 && p.x + PLAYER_SIZE / 2 > px && p.x - PLAYER_SIZE / 2 < px + plat.w) {
          if (p.y + PLAYER_SIZE >= plat.y && p.y + PLAYER_SIZE <= plat.y + PLATFORM_H + p.vy + 2) {
            p.y = plat.y - PLAYER_SIZE;
            p.vy = 0;
            p.grounded = true;
            p.jumps = 0;
          }
        }
      }

      // Invincibility countdown
      if (s.invincible > 0) s.invincible--;

      // Check coins on platforms
      for (const plat of s.platforms) {
        if (plat.hasCoin && !plat.coinCollected) {
          const cx = plat.x + plat.w / 2 - s.scroll;
          const cy = plat.y - COIN_SIZE - 4;
          const dx = Math.abs((p.x) - cx);
          const dy = Math.abs((p.y + PLAYER_SIZE / 2) - cy);
          if (dx < PLAYER_SIZE / 2 + COIN_SIZE / 2 && dy < PLAYER_SIZE / 2 + COIN_SIZE / 2) {
            plat.coinCollected = true;
            s.score += 10;
            setScore(s.score);
            playGameSound(cfg?.coinSound || 'correct');
            // Coin particles
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: cx, y: cy,
                dx: (Math.random() - 0.5) * 3,
                dy: -Math.random() * 3 - 1,
                life: 1, color: config.accent,
              });
            }
          }
        }
      }

      // Check obstacles on platforms
      if (s.invincible <= 0) {
        for (const plat of s.platforms) {
          if (plat.hasObstacle && !plat.obstacleHit) {
            const ox = plat.x + plat.w / 2 - s.scroll;
            const oy = plat.y - OBSTACLE_H;
            const dx = Math.abs(p.x - ox);
            const dy = Math.abs((p.y + PLAYER_SIZE / 2) - (oy + OBSTACLE_H / 2));
            if (dx < PLAYER_SIZE / 2 + OBSTACLE_W / 2 - 4 && dy < PLAYER_SIZE / 2 + OBSTACLE_H / 2 - 4) {
              plat.obstacleHit = true;
              s.lives--;
              setLives(s.lives);
              s.invincible = 60;
              playGameSound('wrong');
              // Hit particles
              for (let i = 0; i < 8; i++) {
                s.particles.push({
                  x: ox, y: oy + OBSTACLE_H / 2,
                  dx: (Math.random() - 0.5) * 4,
                  dy: (Math.random() - 0.5) * 4,
                  life: 1, color: '#f43f5e',
                });
              }
              if (s.lives <= 0) {
                s.running = false;
                setDone(true);
                submit(s.score);
                setTimeout(() => onComplete(s.score), 600);
                return;
              }
            }
          }
        }
      }

      // Generate new platforms
      const lastPlat = s.platforms[s.platforms.length - 1];
      if (lastPlat && lastPlat.x - s.scroll < W + 100) {
        const np = generatePlatform(lastPlat.x + lastPlat.w, lastPlat.y, s.speed);
        s.platforms.push(np);
      }

      // Remove off-screen platforms
      s.platforms = s.platforms.filter(plat => plat.x + plat.w - s.scroll > -100);

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.dx;
        pt.y += pt.dy;
        pt.dy += 0.1;
        pt.life -= 0.04;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // ==================== DRAW ====================

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      skyGrad.addColorStop(0, config.sky1);
      skyGrad.addColorStop(1, config.sky2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Parallax stars (layer 1, slow)
      for (const star of s.stars) {
        const sx = ((star.x - s.scroll * 0.2) % (W * 3) + W * 3) % (W * 3) - W;
        if (sx < -5 || sx > W + 5) continue;
        ctx.fillStyle = `rgba(255,255,255,${star.a})`;
        ctx.beginPath();
        ctx.arc(sx, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Parallax dust (layer 2, medium)
      for (const star of s.dustStars) {
        const sx = ((star.x - s.scroll * 0.5) % (W * 3) + W * 3) % (W * 3) - W;
        if (sx < -5 || sx > W + 5) continue;
        ctx.fillStyle = `rgba(255,255,255,${star.a})`;
        ctx.beginPath();
        ctx.arc(sx, star.y - 100, star.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground
      ctx.fillStyle = config.ground;
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      // Ground surface line
      ctx.strokeStyle = `${config.accent}66`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H - GROUND_H);
      ctx.lineTo(W, H - GROUND_H);
      ctx.stroke();
      // Ground texture dots
      ctx.fillStyle = `${config.accent}22`;
      for (let i = 0; i < 20; i++) {
        const gx = ((i * 47 + 13 - s.scroll * 0.8) % W + W) % W;
        ctx.fillRect(gx, H - GROUND_H + 8 + (i % 3) * 12, 3, 2);
      }

      // Platforms
      for (const plat of s.platforms) {
        const px = plat.x - s.scroll;
        if (px > W + 10 || px + plat.w < -10) continue;

        // Platform body
        ctx.fillStyle = `${config.accent}44`;
        ctx.beginPath();
        ctx.roundRect(px, plat.y, plat.w, PLATFORM_H, 4);
        ctx.fill();
        ctx.strokeStyle = `${config.accent}88`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Platform top highlight
        ctx.fillStyle = `${config.accent}66`;
        ctx.fillRect(px + 2, plat.y, plat.w - 4, 2);

        // Coin on platform
        if (plat.hasCoin && !plat.coinCollected) {
          const coinPool = config.coins;
          const coinEmoji = coinPool[Math.floor((plat.x * 7) % coinPool.length)];
          const cx = px + plat.w / 2;
          const cy = plat.y - COIN_SIZE - 4;
          const bob = Math.sin(s.time * 0.08 + plat.x * 0.1) * 3;
          ctx.font = `${COIN_SIZE}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Coin glow
          ctx.shadowColor = config.accent;
          ctx.shadowBlur = 8;
          ctx.fillText(coinEmoji, cx, cy + bob);
          ctx.shadowBlur = 0;
        }

        // Obstacle on platform
        if (plat.hasObstacle && !plat.obstacleHit) {
          const obsPool = config.obstacles;
          const obsEmoji = obsPool[Math.floor((plat.x * 13) % obsPool.length)];
          const ox = px + plat.w / 2;
          const oy = plat.y - OBSTACLE_H;
          ctx.font = `${OBSTACLE_W}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obsEmoji, ox, oy + OBSTACLE_H / 2);
        }
      }

      // Player
      const blink = s.invincible > 0 && s.time % 6 < 3;
      if (!blink) {
        ctx.font = `${PLAYER_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Player shadow
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = 10;
        ctx.fillText(config.player, p.x, p.y + PLAYER_SIZE / 2);
        ctx.shadowBlur = 0;
      }

      // Particles
      for (const pt of s.particles) {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Distance marker
      const dist = Math.floor(s.distance / 10);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${dist}m`, W - 8, 16);

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => { stateRef.current.running = false; cancelAnimationFrame(loopRef.current); };
  }, [started, done, holiday, theme, config, cfg, submit, onComplete]);

  // Score milestone confetti
  useEffect(() => {
    if (score > 0 && score % 100 === 0 && !done) {
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.5 }, colors: [theme.primary, config.accent] });
    }
  }, [score, done, theme, config]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {'❤️'.repeat(Math.max(0, lives))}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          touchAction: 'none',
          cursor: 'pointer',
        }}
      />
      {!started && (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Tap / Space to jump. Hold for higher!<br />Double-tap for double jump.
        </p>
      )}
      {done && (
        <p style={{ fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          Game Over! Distance: {Math.floor(stateRef.current.distance / 10)}m
        </p>
      )}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
