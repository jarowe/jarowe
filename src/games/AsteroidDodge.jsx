import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 320;
const H = 400;
const SHIP_SIZE = 24;
const ASTEROID_MIN = 14;
const ASTEROID_MAX = 28;
const CRYSTAL_SIZE = 14;
const SHIELD_SIZE = 16;
const STAR_LAYERS = 2;
const STARS_PER_LAYER = 40;
const MAX_LIVES = 3;
const INVINCIBILITY_MS = 1500;

const SHIP_EMOJI = {
  food:      '🍕',
  space:     '🚀',
  tech:      '🤖',
  nature:    '🦋',
  music:     '🎸',
  family:    '🏠',
  scifi:     '🛸',
  humor:     '🤡',
  adventure: '⛵',
  arts:      '🎨',
  spooky:    '🧙',
  winter:    '⛄',
  default:   '🚀',
};

const ASTEROID_EMOJI = {
  food:      ['🍔', '🌮', '🍩', '🧁'],
  space:     ['🪨', '☄️', '🌑', '💫'],
  tech:      ['💣', '🔩', '⚙️', '🧲'],
  nature:    ['🌵', '🪨', '🌋', '🍄'],
  music:     ['📢', '🔔', '💥', '🎺'],
  family:    ['🧹', '📦', '🧺', '🪣'],
  scifi:     ['🛸', '☄️', '🌑', '💫'],
  humor:     ['💣', '🎈', '🤯', '💀'],
  adventure: ['🪨', '🌊', '⚡', '🌋'],
  arts:      ['📏', '✂️', '📌', '🖇️'],
  spooky:    ['💀', '👻', '🕷️', '🦇'],
  winter:    ['🧊', '❄️', '🌨️', '⛰️'],
  default:   ['🪨', '☄️', '🌑', '💫'],
};

// Variant overrides
const VARIANTS = {
  moon: {
    ship: '🚀',
    rocks: ['🌑', '☄️', '🪨'],
    collectible: '🏁',
    shield: '🛡️',
    bg: '#0d0d1a',
    title: 'Moon Landing',
  },
};

function getShip(category) {
  return SHIP_EMOJI[category] || SHIP_EMOJI.default;
}

function getAsteroids(category) {
  return ASTEROID_EMOJI[category] || ASTEROID_EMOJI.default;
}

function makeStarfield() {
  const layers = [];
  for (let l = 0; l < STAR_LAYERS; l++) {
    const stars = [];
    for (let i = 0; i < STARS_PER_LAYER; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + Math.random() * (l === 0 ? 0.8 : 1.2),
        speed: l === 0 ? 0.3 + Math.random() * 0.3 : 0.8 + Math.random() * 0.5,
        alpha: l === 0 ? 0.2 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4,
      });
    }
    layers.push(stars);
  }
  return layers;
}

export default function AsteroidDodge({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const shipEmoji = cfg?.ship || getShip(holiday?.category);
  const rockEmoji = cfg?.rocks || getAsteroids(holiday?.category);
  const crystalEmoji = cfg?.collectible || '💎';
  const shieldEmoji = cfg?.shield || '🛡️';
  const bgColor = cfg?.bg || '#0a0a1e';

  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const { best, submit } = useHighScore('asteroid-dodge');
  const loopRef = useRef(null);
  const mouseYRef = useRef(H / 2);

  const stateRef = useRef({
    shipY: H / 2,
    asteroids: [],      // [{x, y, size, speed, emoji, rotation}]
    crystals: [],        // [{x, y, speed}]
    shields: [],         // [{x, y, speed}]
    particles: [],       // [{x, y, dx, dy, life, color}]
    starfield: makeStarfield(),
    score: 0,
    lives: MAX_LIVES,
    hasShield: false,
    invincibleUntil: 0,
    running: false,
    time: 0,
    spawnTimer: 0,
    crystalTimer: 0,
    shieldTimer: 0,
    difficultyTimer: 0,
    baseSpeed: 2,
    spawnRate: 50,       // frames between spawns
  });

  // Mouse/touch tracking for Y position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = H / rect.height;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      mouseYRef.current = (clientY - rect.top) * scale;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchstart', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = H / rect.height;
      mouseYRef.current = (e.touches[0].clientY - rect.top) * scale;
    }, { passive: true });
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Keyboard support
  useEffect(() => {
    const keysDown = new Set();
    const down = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysDown.add(e.key);
      }
    };
    const up = (e) => {
      keysDown.delete(e.key);
    };
    const kbInterval = setInterval(() => {
      if (keysDown.has('ArrowUp')) mouseYRef.current = Math.max(SHIP_SIZE, mouseYRef.current - 5);
      if (keysDown.has('ArrowDown')) mouseYRef.current = Math.min(H - SHIP_SIZE, mouseYRef.current + 5);
    }, 16);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      clearInterval(kbInterval);
    };
  }, []);

  const spawnExplosion = useCallback((x, y, color, count = 6) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      s.particles.push({
        x, y,
        dx: Math.cos(angle) * (1.5 + Math.random() * 2.5),
        dy: Math.sin(angle) * (1.5 + Math.random() * 2.5),
        life: 1.0,
        color,
      });
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (!started || done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    s.running = true;

    function tick() {
      if (!s.running) return;
      s.time++;
      const now = performance.now();

      // --- Ship follows mouse Y ---
      const targetY = mouseYRef.current;
      s.shipY += (targetY - s.shipY) * 0.15;
      s.shipY = Math.max(SHIP_SIZE, Math.min(H - SHIP_SIZE, s.shipY));
      const shipX = 45;

      // --- Difficulty increase ---
      s.difficultyTimer++;
      if (s.difficultyTimer >= 180) { // every 3 seconds
        s.difficultyTimer = 0;
        s.baseSpeed = Math.min(6, s.baseSpeed + 0.1);
        s.spawnRate = Math.max(15, s.spawnRate - 1);
      }

      // --- Spawn asteroids ---
      s.spawnTimer++;
      if (s.spawnTimer >= s.spawnRate) {
        s.spawnTimer = 0;
        const size = ASTEROID_MIN + Math.random() * (ASTEROID_MAX - ASTEROID_MIN);
        s.asteroids.push({
          x: W + size,
          y: SHIP_SIZE + Math.random() * (H - SHIP_SIZE * 2),
          size,
          speed: s.baseSpeed + Math.random() * 1.5,
          emoji: rockEmoji[Math.floor(Math.random() * rockEmoji.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 4,
        });
      }

      // --- Spawn crystals ---
      s.crystalTimer++;
      if (s.crystalTimer >= 90 + Math.random() * 60) {
        s.crystalTimer = 0;
        s.crystals.push({
          x: W + CRYSTAL_SIZE,
          y: SHIP_SIZE + Math.random() * (H - SHIP_SIZE * 2),
          speed: s.baseSpeed * 0.8,
        });
      }

      // --- Spawn shields (rare) ---
      s.shieldTimer++;
      if (s.shieldTimer >= 400 + Math.random() * 200) {
        s.shieldTimer = 0;
        if (!s.hasShield) {
          s.shields.push({
            x: W + SHIELD_SIZE,
            y: SHIP_SIZE + Math.random() * (H - SHIP_SIZE * 2),
            speed: s.baseSpeed * 0.6,
          });
        }
      }

      const isInvincible = now < s.invincibleUntil;

      // --- Move & check asteroids ---
      for (let i = s.asteroids.length - 1; i >= 0; i--) {
        const a = s.asteroids[i];
        a.x -= a.speed;
        a.rotation += a.rotSpeed;
        if (a.x < -a.size * 2) {
          s.asteroids.splice(i, 1);
          // Survived = +1 point
          s.score += 1;
          setScore(s.score);
          continue;
        }
        // Collision with ship
        const dx = a.x - shipX;
        const dy = a.y - s.shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = (a.size / 2) + (SHIP_SIZE / 2) - 4;
        if (dist < hitDist && !isInvincible) {
          if (s.hasShield) {
            // Shield absorbs hit
            s.hasShield = false;
            setHasShield(false);
            s.asteroids.splice(i, 1);
            playGameSound('spin');
            spawnExplosion(a.x, a.y, '#38bdf8', 8);
          } else {
            // Take damage
            s.lives--;
            setLives(s.lives);
            s.asteroids.splice(i, 1);
            s.invincibleUntil = now + INVINCIBILITY_MS;
            playGameSound('wrong');
            spawnExplosion(shipX, s.shipY, '#ef4444', 10);

            if (s.lives <= 0) {
              s.running = false;
              setDone(true);
              if (s.score > 50) {
                confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
              }
              submit(s.score);
              setTimeout(() => onComplete(s.score), 600);
              return;
            }
          }
        }
      }

      // --- Move & check crystals ---
      for (let i = s.crystals.length - 1; i >= 0; i--) {
        const c = s.crystals[i];
        c.x -= c.speed;
        if (c.x < -CRYSTAL_SIZE * 2) {
          s.crystals.splice(i, 1);
          continue;
        }
        const dx = c.x - shipX;
        const dy = c.y - s.shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (CRYSTAL_SIZE / 2) + (SHIP_SIZE / 2)) {
          s.crystals.splice(i, 1);
          s.score += 15;
          setScore(s.score);
          playGameSound('correct');
          spawnExplosion(c.x, c.y, theme.primary, 4);
        }
      }

      // --- Move & check shields ---
      for (let i = s.shields.length - 1; i >= 0; i--) {
        const sh = s.shields[i];
        sh.x -= sh.speed;
        if (sh.x < -SHIELD_SIZE * 2) {
          s.shields.splice(i, 1);
          continue;
        }
        const dx = sh.x - shipX;
        const dy = sh.y - s.shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (SHIELD_SIZE / 2) + (SHIP_SIZE / 2)) {
          s.shields.splice(i, 1);
          s.hasShield = true;
          setHasShield(true);
          playGameSound('win');
          spawnExplosion(sh.x, sh.y, '#38bdf8', 6);
        }
      }

      // --- Update particles ---
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life -= 0.025;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ==================== DRAW ====================
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // --- Starfield parallax ---
      for (let l = 0; l < s.starfield.length; l++) {
        for (const star of s.starfield[l]) {
          star.x -= star.speed;
          if (star.x < 0) {
            star.x = W;
            star.y = Math.random() * H;
          }
          ctx.fillStyle = `rgba(255,255,255,${star.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Asteroids ---
      ctx.font = 'serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const a of s.asteroids) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate((a.rotation * Math.PI) / 180);
        ctx.font = `${Math.round(a.size)}px serif`;
        ctx.fillText(a.emoji, 0, 0);
        ctx.restore();
      }

      // --- Crystals (floating bob) ---
      ctx.font = `${CRYSTAL_SIZE + 2}px serif`;
      for (const c of s.crystals) {
        const bob = Math.sin(s.time * 0.08 + c.y) * 3;
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = 10;
        ctx.fillText(crystalEmoji, c.x, c.y + bob);
        ctx.shadowBlur = 0;
      }

      // --- Shields ---
      ctx.font = `${SHIELD_SIZE + 2}px serif`;
      for (const sh of s.shields) {
        const bob = Math.sin(s.time * 0.06 + sh.y) * 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillText(shieldEmoji, sh.x, sh.y + bob);
        ctx.shadowBlur = 0;
      }

      // --- Ship ---
      const shipAlpha = isInvincible ? (Math.sin(now * 0.02) * 0.3 + 0.5) : 1;
      ctx.globalAlpha = shipAlpha;

      // Engine trail
      const trailLength = 3;
      for (let t = 0; t < trailLength; t++) {
        const tx = shipX - 14 - t * 8;
        const tAlpha = (1 - t / trailLength) * 0.4;
        ctx.fillStyle = `rgba(251,191,36,${tAlpha})`;
        ctx.beginPath();
        ctx.arc(tx, s.shipY, 3 - t * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ship emoji
      ctx.font = `${SHIP_SIZE}px serif`;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 15;
      ctx.fillText(shipEmoji, shipX, s.shipY);
      ctx.shadowBlur = 0;

      // Shield bubble
      if (s.hasShield) {
        ctx.strokeStyle = `rgba(56,189,248,${0.4 + Math.sin(s.time * 0.1) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(shipX, s.shipY, SHIP_SIZE / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // --- Particles ---
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Score popup zone ---
      // Subtle left-edge danger marker
      ctx.fillStyle = 'rgba(244,63,94,0.05)';
      ctx.fillRect(0, 0, 10, H);

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      s.running = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [started, done, shipEmoji, rockEmoji, crystalEmoji, shieldEmoji, bgColor,
      theme, spawnExplosion, submit, onComplete]);

  const handleClick = useCallback(() => {
    if (!started) setStarted(true);
  }, [started]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {'❤️'.repeat(Math.max(0, lives))}
          {hasShield ? ' 🛡️' : ''}
        </span>
        {cfg && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{cfg.title}</span>
        )}
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleClick}
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
          Click to start. Move mouse/finger to dodge!<br />
          Collect {crystalEmoji} (+15pts) and {shieldEmoji} for protection.
        </p>
      )}
      {done && (
        <p style={{ fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          Game Over! Final: {score} pts
        </p>
      )}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
