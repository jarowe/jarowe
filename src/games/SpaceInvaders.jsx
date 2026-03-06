import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 450;
const SHIP_W = 24;
const SHIP_H = 20;
const BULLET_W = 3;
const BULLET_H = 10;
const ENEMY_SIZE = 22;
const ENEMY_COLS = 7;
const ENEMY_ROWS = 4;
const ENEMY_PAD_X = (W - ENEMY_COLS * (ENEMY_SIZE + 8)) / 2;
const ENEMY_PAD_Y = 40;
const POWERUP_SIZE = 14;
const STAR_COUNT = 60;

const ENEMY_EMOJI = {
  space: '\u{1F47E}', tech: '\u{1F916}', food: '\u{1F354}', nature: '\u{1F41B}',
  scifi: '\u{1F6F8}', spooky: '\u{1F47B}', winter: '\u{2744}\u{FE0F}', music: '\u{1F3B5}',
  family: '\u{1F9F8}', default: '\u{1F47E}',
};

const SI_VARIANTS = {
  startrek: {
    enemyEmoji: '🛸',
    shipEmoji: '🚀',
    bulletColor: '#ef4444',
    bgStarColor: 'rgba(100,150,255,0.4)',
  },
};

const POWERUP_TYPES = [
  { type: 'shield', emoji: '\u{1F6E1}\u{FE0F}', dur: 0, color: '#38bdf8' },
  { type: 'rapid',  emoji: '\u{26A1}', dur: 3000, color: '#fbbf24' },
  { type: 'x2',     emoji: '\u{00D7}2', dur: 5000, color: '#a78bfa' },
];

function makeStars() {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.3,
    twinkle: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.3 + 0.1,
  }));
}

function buildEnemies(wave) {
  const enemies = [];
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: ENEMY_PAD_X + c * (ENEMY_SIZE + 8) + ENEMY_SIZE / 2,
        y: ENEMY_PAD_Y + r * (ENEMY_SIZE + 6) + ENEMY_SIZE / 2,
        row: r, col: c, alive: true,
        hp: wave >= 2 && r === 0 ? 2 : 1,
      });
    }
  }
  return enemies;
}

export default function SpaceInvaders({ onComplete, holiday, theme, variant }) {
  const siCfg = variant ? SI_VARIANTS[variant] : null;
  const canvasRef = useRef(null);
  const emoji = ENEMY_EMOJI[holiday?.category] || ENEMY_EMOJI.default;

  const stateRef = useRef({
    shipX: W / 2,
    bullet: null,            // { x, y }
    enemyBullets: [],        // [{ x, y }]
    enemies: buildEnemies(1),
    enemyDir: 1,             // 1 = right, -1 = left
    enemySpeed: 0.4,
    enemyDropTimer: 0,
    enemyShootTimer: 0,
    score: 0,
    lives: 3,
    wave: 1,
    running: false,
    powerups: [],            // [{ x, y, type, emoji, dur, color }]
    activePower: null,       // { type, until }
    hasShield: false,
    stars: makeStars(),
    particles: [],           // [{ x, y, dx, dy, life, color }]
    time: 0,
    waveFlash: 0,            // frames remaining for "WAVE 2!" text
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('spaceinvaders');
  const loopRef = useRef(null);
  const mouseXRef = useRef(W / 2);
  const keysRef = useRef({ left: false, right: false });

  // --- shoot via ref to avoid stale closures ---
  const shootRef = useRef(null);
  shootRef.current = () => {
    const s = stateRef.current;
    if (!s.running) return;
    const rapid = s.activePower?.type === 'rapid' && Date.now() < s.activePower.until;
    if (s.bullet && !rapid) return; // single bullet unless rapid-fire
    s.bullet = { x: s.shipX, y: H - 35 };
    playGameSound('tick');
  };
  const shoot = useCallback(() => shootRef.current(), []);

  // --- input: mouse/touch ---
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

  // --- input: keyboard ---
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = true;
      if (e.key === 'ArrowRight') keysRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        shoot();
      }
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // --- click/tap to start + shoot ---
  const handleClick = useCallback(() => {
    if (!started) { setStarted(true); return; }
    shoot();
  }, [started, shoot]);

  // --- spawn particles ---
  function spawnExplosion(x, y, color, count = 6) {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      s.particles.push({
        x, y,
        dx: Math.cos(angle) * (1.5 + Math.random() * 2),
        dy: Math.sin(angle) * (1.5 + Math.random() * 2),
        life: 1.0,
        color,
      });
    }
  }

  // --- game loop ---
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

      const now = Date.now();

      // --- keyboard movement ---
      if (keysRef.current.left) mouseXRef.current = Math.max(SHIP_W / 2, mouseXRef.current - 4);
      if (keysRef.current.right) mouseXRef.current = Math.min(W - SHIP_W / 2, mouseXRef.current + 4);

      // --- ship follows mouse ---
      const target = mouseXRef.current;
      s.shipX += (target - s.shipX) * 0.25;
      s.shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, s.shipX));

      // --- player bullet ---
      if (s.bullet) {
        s.bullet.y -= 6;
        if (s.bullet.y < -10) s.bullet = null;
      }

      // --- enemy movement ---
      let edgeHit = false;
      const aliveEnemies = s.enemies.filter(e => e.alive);
      for (const e of aliveEnemies) {
        e.x += s.enemyDir * s.enemySpeed;
        if (e.x < ENEMY_SIZE / 2 + 4 || e.x > W - ENEMY_SIZE / 2 - 4) edgeHit = true;
      }
      if (edgeHit) {
        s.enemyDir *= -1;
        for (const e of aliveEnemies) {
          e.y += 10;
          e.x += s.enemyDir * s.enemySpeed * 2; // nudge away from edge
        }
      }

      // --- enemy shooting ---
      s.enemyShootTimer++;
      const shootInterval = s.wave >= 2 ? 40 : 60;
      if (s.enemyShootTimer >= shootInterval && aliveEnemies.length > 0) {
        s.enemyShootTimer = 0;
        // pick random enemy from front row (highest y)
        const maxY = Math.max(...aliveEnemies.map(e => e.y));
        const frontRow = aliveEnemies.filter(e => e.y >= maxY - 10);
        const shooter = frontRow[Math.floor(Math.random() * frontRow.length)];
        if (shooter) {
          s.enemyBullets.push({ x: shooter.x, y: shooter.y + ENEMY_SIZE / 2 });
        }
      }

      // --- enemy bullets move ---
      for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
        s.enemyBullets[i].y += 3;
        if (s.enemyBullets[i].y > H + 10) s.enemyBullets.splice(i, 1);
      }

      // --- player bullet hits enemy ---
      if (s.bullet) {
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const dx = Math.abs(s.bullet.x - e.x);
          const dy = Math.abs(s.bullet.y - e.y);
          if (dx < ENEMY_SIZE / 2 + 2 && dy < ENEMY_SIZE / 2 + 2) {
            e.hp--;
            s.bullet = null;
            if (e.hp <= 0) {
              e.alive = false;
              const mult = (s.activePower?.type === 'x2' && now < s.activePower.until) ? 2 : 1;
              s.score += 10 * mult;
              setScore(s.score);
              playGameSound('pop');
              spawnExplosion(e.x, e.y, theme.primary);
              // chance to drop power-up (15%)
              if (Math.random() < 0.15) {
                const p = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                s.powerups.push({ x: e.x, y: e.y, ...p });
              }
            } else {
              playGameSound('tick');
            }
            break;
          }
        }
      }

      // --- power-ups fall + collect ---
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i];
        p.y += 1.5;
        if (p.y > H + 20) { s.powerups.splice(i, 1); continue; }
        const dx = Math.abs(p.x - s.shipX);
        const dy = Math.abs(p.y - (H - 30));
        if (dx < SHIP_W / 2 + POWERUP_SIZE / 2 && dy < SHIP_H / 2 + POWERUP_SIZE / 2) {
          s.powerups.splice(i, 1);
          s.score += 50;
          setScore(s.score);
          playGameSound('correct');
          if (p.type === 'shield') {
            s.hasShield = true;
          } else {
            s.activePower = { type: p.type, until: now + p.dur };
          }
        }
      }

      // --- expire active power ---
      if (s.activePower && now >= s.activePower.until) s.activePower = null;

      // --- enemy bullets hit player ---
      for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
        const b = s.enemyBullets[i];
        const dx = Math.abs(b.x - s.shipX);
        const dy = Math.abs(b.y - (H - 30));
        if (dx < SHIP_W / 2 + 3 && dy < SHIP_H / 2 + 3) {
          s.enemyBullets.splice(i, 1);
          if (s.hasShield) {
            s.hasShield = false;
            playGameSound('spin');
            spawnExplosion(s.shipX, H - 30, '#38bdf8', 8);
          } else {
            s.lives--;
            setLives(s.lives);
            playGameSound('wrong');
            spawnExplosion(s.shipX, H - 30, '#ef4444', 10);
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

      // --- enemies reach bottom ---
      for (const e of aliveEnemies) {
        if (e.y + ENEMY_SIZE / 2 >= H - 50) {
          s.running = false;
          setDone(true);
          playGameSound('wrong');
          submit(s.score);
          setTimeout(() => onComplete(s.score), 600);
          return;
        }
      }

      // --- wave clear ---
      if (aliveEnemies.length === 0) {
        s.score += 200;
        setScore(s.score);
        playGameSound('win');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        if (s.wave >= 2) {
          // game won after wave 2
          s.running = false;
          setDone(true);
          submit(s.score);
          setTimeout(() => onComplete(s.score), 800);
          return;
        }
        // advance to wave 2
        s.wave = 2;
        s.enemies = buildEnemies(2);
        s.enemySpeed = 0.7;
        s.enemyDir = 1;
        s.enemyBullets = [];
        s.bullet = null;
        s.powerups = [];
        s.waveFlash = 90;
      }

      // --- update particles ---
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life -= 0.03;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ==================== DRAW ====================
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(0, 0, W, H);

      // --- stars ---
      for (const star of s.stars) {
        star.twinkle += 0.02;
        const alpha = 0.3 + 0.4 * Math.sin(star.twinkle);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- enemies ---
      ctx.font = `${ENEMY_SIZE - 4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const e of s.enemies) {
        if (!e.alive) continue;
        // glow behind enemy
        ctx.shadowColor = theme.secondary;
        ctx.shadowBlur = e.hp > 1 ? 12 : 6;
        ctx.fillText(emoji, e.x, e.y + Math.sin(s.time * 0.05 + e.col) * 2);
        ctx.shadowBlur = 0;
      }

      // --- power-ups ---
      for (const p of s.powerups) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(p.emoji, p.x, p.y);
        // reset font for enemies
        ctx.font = `${ENEMY_SIZE - 4}px serif`;
      }

      // --- player ship (triangle) ---
      ctx.save();
      ctx.translate(s.shipX, H - 30);
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 12;
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.moveTo(0, -SHIP_H / 2);
      ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);
      ctx.lineTo(SHIP_W / 2, SHIP_H / 2);
      ctx.closePath();
      ctx.fill();
      // inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, -SHIP_H / 2 + 4);
      ctx.lineTo(-SHIP_W / 4, SHIP_H / 4);
      ctx.lineTo(SHIP_W / 4, SHIP_H / 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // shield indicator
      if (s.hasShield) {
        ctx.strokeStyle = 'rgba(56,189,248,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, SHIP_W / 2 + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // --- player bullet ---
      if (s.bullet) {
        ctx.shadowColor = theme.secondary;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.bullet.x - BULLET_W / 2, s.bullet.y, BULLET_W, BULLET_H);
        ctx.shadowBlur = 0;
      }

      // --- enemy bullets ---
      ctx.fillStyle = '#f87171';
      for (const b of s.enemyBullets) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 1.5, b.y, 3, 8);
      }
      ctx.shadowBlur = 0;

      // --- particles ---
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- active power HUD ---
      if (s.activePower && now < s.activePower.until) {
        const remaining = ((s.activePower.until - now) / 1000).toFixed(1);
        const label = s.activePower.type === 'rapid' ? '\u{26A1} Rapid' : '\u{00D7}2 Score';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} ${remaining}s`, W / 2, H - 6);
      }

      // --- wave indicator ---
      if (s.waveFlash > 0) {
        s.waveFlash--;
        const fadeAlpha = s.waveFlash / 90;
        ctx.fillStyle = `rgba(255,255,255,${(fadeAlpha * 0.8).toFixed(2)})`;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE 2!', W / 2, H / 2);
      }

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => { stateRef.current.running = false; cancelAnimationFrame(loopRef.current); };
  }, [started, done, holiday, theme, emoji, submit, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {'❤️'.repeat(Math.max(0, lives))}
          {stateRef.current.hasShield ? ' 🛡️' : ''}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>
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
          Click/tap to start. Move mouse &amp; click to shoot.<br />
          Arrows + Space on keyboard.
        </p>
      )}
      {done && (
        <p style={{ fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          {lives > 0 ? 'Victory!' : 'Game Over!'} Final: {score} pts
        </p>
      )}
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
