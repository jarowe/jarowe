import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// ─── Category-themed prize emoji pools ───────────────────────────────
const PRIZE_POOLS = {
  food:    ['🍕','🍔','🌮','🍩','🍰','🧁','🍪','🍭'],
  space:   ['🚀','🛸','⭐','🌙','🪐','☄️','🌟','💫'],
  tech:    ['🎮','📱','💻','🤖','⌚','🔮','🕹️','💡'],
  nature:  ['🌸','🦋','🐝','🌻','🍀','🌺','🦜','🐚'],
  winter:  ['⛄','🎄','🎁','❄️','🧸','🎅','🦌','🔔'],
  family:  ['🧸','❤️','🎪','🎠','🎡','🎢','🏠','🌈'],
  default: ['⭐','💎','🎁','🧸','🎪','🌈','🔮','✨'],
};

const MAX_ATTEMPTS = 3;
const W = 280, H = 400;
const GRAB_RADIUS = 28;
const GRAB_SUCCESS_RATE = 0.72;
const CLAW_SPEED = 0.025;       // pendulum angular speed
const DROP_SPEED = 3.5;
const RETRACT_SPEED = 2.8;
const PRIZE_FLOOR_Y = 310;      // where prizes sit
const CLAW_REST_Y = 60;         // claw resting height
const CLAW_WIDTH_HALF = 110;    // pendulum swing half-width
const PRONG_LEN = 22;

// ─── Rarity tiers ────────────────────────────────────────────────────
const RARITIES = [
  { name: 'common',   weight: 5, points: 10, size: 22, glow: 0   },
  { name: 'uncommon', weight: 3, points: 25, size: 26, glow: 0.4 },
  { name: 'rare',     weight: 1, points: 50, size: 30, glow: 0.9 },
];

function pickRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return RARITIES[0];
}

function buildPrizes(pool) {
  const prizes = [];
  const count = 10 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const rarity = pickRarity();
    prizes.push({
      emoji: pool[Math.floor(Math.random() * pool.length)],
      x: 40 + Math.random() * (W - 80),
      y: PRIZE_FLOOR_Y + Math.random() * 50,
      rarity,
      grabbed: false,
    });
  }
  // sort so deeper prizes draw first
  prizes.sort((a, b) => a.y - b.y);
  return prizes;
}

// ─── Sparkle particle ────────────────────────────────────────────────
function spawnSparkles(state, x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    state.sparkles.push({
      x, y,
      vx: Math.cos(angle) * (1.5 + Math.random() * 2),
      vy: Math.sin(angle) * (1.5 + Math.random() * 2),
      life: 1.0,
      size: 2 + Math.random() * 3,
    });
  }
}

// ─── Score popup ─────────────────────────────────────────────────────
function spawnPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color, life: 1.0 });
}

export default function ClawMachine({ onComplete, holiday, theme }) {
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const stateRef = useRef(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [phase, setPhase] = useState('playing'); // playing | ended
  const { best, submit } = useHighScore('claw');

  const primary = theme?.primary || '#7c3aed';
  const secondary = theme?.secondary || '#06b6d4';
  const cat = holiday?.category || 'default';
  const pool = PRIZE_POOLS[cat] || PRIZE_POOLS.default;

  // ─── Initialize game state ──────────────────────────────────────
  const initState = useCallback(() => {
    return {
      // claw
      angle: 0,               // pendulum phase
      clawX: W / 2,
      clawY: CLAW_REST_Y,
      clawOpen: 1,             // 1 = open, 0 = closed
      clawState: 'swing',      // swing | dropping | grabbing | retracting | grabbed-retract
      dropTargetY: PRIZE_FLOOR_Y + 10,
      grabbedPrize: null,
      // prizes
      prizes: buildPrizes(pool),
      // effects
      sparkles: [],
      popups: [],
      // meta
      score: 0,
      attemptsLeft: MAX_ATTEMPTS,
      time: 0,
    };
  }, [pool]);

  // ─── Drop handler ───────────────────────────────────────────────
  const handleDrop = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.clawState !== 'swing' || s.attemptsLeft <= 0) return;
    s.clawState = 'dropping';
    s.clawOpen = 1;
    playGameSound('tick');
  }, []);

  // ─── Game loop ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    stateRef.current = initState();

    function update(s, dt) {
      s.time += dt;

      // pendulum swing
      if (s.clawState === 'swing') {
        s.angle += CLAW_SPEED * dt;
        s.clawX = W / 2 + Math.sin(s.angle) * CLAW_WIDTH_HALF;
        s.clawY = CLAW_REST_Y;
        s.clawOpen = 0.8 + Math.sin(s.time * 0.003) * 0.2; // gentle flex
      }

      // dropping
      if (s.clawState === 'dropping') {
        s.clawY += DROP_SPEED * (dt / 16);
        // smoothly close prongs partway during descent
        s.clawOpen = Math.max(0.3, 1 - (s.clawY - CLAW_REST_Y) / (s.dropTargetY - CLAW_REST_Y));
        if (s.clawY >= s.dropTargetY) {
          s.clawState = 'grabbing';
          s.grabTimer = 0;
        }
      }

      // grabbing animation — close prongs then decide
      if (s.clawState === 'grabbing') {
        s.grabTimer += dt;
        s.clawOpen = Math.max(0, 0.3 - s.grabTimer / 600);
        if (s.grabTimer > 400) {
          // check for nearby prize
          let closest = null, closestDist = Infinity;
          for (const p of s.prizes) {
            if (p.grabbed) continue;
            const dx = p.x - s.clawX;
            const dy = p.y - s.clawY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) { closestDist = dist; closest = p; }
          }
          if (closest && closestDist < GRAB_RADIUS + closest.rarity.size * 0.5) {
            if (Math.random() < GRAB_SUCCESS_RATE) {
              // success
              closest.grabbed = true;
              s.grabbedPrize = closest;
              s.clawState = 'grabbed-retract';
              s.clawOpen = 0;
              playGameSound('correct');
              spawnSparkles(s, s.clawX, s.clawY);
              const pts = closest.rarity.points;
              s.score += pts;
              setScore(s.score);
              spawnPopup(s, s.clawX, s.clawY - 20, `+${pts}`, '#fbbf24');
            } else {
              // slip!
              s.clawState = 'retracting';
              s.clawOpen = 0.6;
              playGameSound('wrong');
              spawnPopup(s, s.clawX, s.clawY - 10, 'Slipped!', '#f87171');
            }
          } else {
            // miss
            s.clawState = 'retracting';
            s.clawOpen = 0.6;
            playGameSound('wrong');
            spawnPopup(s, s.clawX, s.clawY - 10, 'Miss!', '#f87171');
          }
          s.attemptsLeft--;
          setAttempts(s.attemptsLeft);
        }
      }

      // retracting empty
      if (s.clawState === 'retracting') {
        s.clawY -= RETRACT_SPEED * (dt / 16);
        if (s.clawY <= CLAW_REST_Y) {
          s.clawY = CLAW_REST_Y;
          if (s.attemptsLeft <= 0) {
            endGame(s);
          } else {
            s.clawState = 'swing';
          }
        }
      }

      // retracting with prize
      if (s.clawState === 'grabbed-retract') {
        s.clawY -= RETRACT_SPEED * (dt / 16);
        if (s.grabbedPrize) {
          s.grabbedPrize.x = s.clawX;
          s.grabbedPrize.y = s.clawY + 18;
        }
        if (s.clawY <= CLAW_REST_Y) {
          s.clawY = CLAW_REST_Y;
          s.grabbedPrize = null;
          if (s.attemptsLeft <= 0) {
            endGame(s);
          } else {
            s.clawState = 'swing';
          }
        }
      }

      // sparkles
      for (let i = s.sparkles.length - 1; i >= 0; i--) {
        const sp = s.sparkles[i];
        sp.x += sp.vx; sp.y += sp.vy;
        sp.life -= 0.02;
        if (sp.life <= 0) s.sparkles.splice(i, 1);
      }
      // popups
      for (let i = s.popups.length - 1; i >= 0; i--) {
        const pp = s.popups[i];
        pp.y -= 0.8;
        pp.life -= 0.015;
        if (pp.life <= 0) s.popups.splice(i, 1);
      }
    }

    function endGame(s) {
      setPhase('ended');
      const finalScore = s.score;
      const isNew = submit(finalScore);
      if (finalScore >= 30) {
        playGameSound('win');
        confetti({ particleCount: finalScore >= 75 ? 120 : 60, spread: 70, origin: { y: 0.6 } });
      }
      setTimeout(() => onComplete(finalScore), 2200);
    }

    function draw(s) {
      ctx.clearRect(0, 0, W, H);

      // ── Machine body ──────────────────────────────────────────
      // Back wall
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#1a1028');
      bgGrad.addColorStop(1, '#0d0b14');
      ctx.fillStyle = bgGrad;
      roundRect(ctx, 10, 10, W - 20, H - 20, 12);
      ctx.fill();

      // Glass tint sides
      ctx.fillStyle = 'rgba(100,150,220,0.04)';
      ctx.fillRect(12, 12, 18, H - 24);
      ctx.fillRect(W - 30, 12, 18, H - 24);

      // Inner glow along top
      const topGlow = ctx.createLinearGradient(0, 10, 0, 80);
      topGlow.addColorStop(0, primary + '30');
      topGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = topGlow;
      ctx.fillRect(12, 12, W - 24, 68);

      // Rail at top
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, CLAW_REST_Y - 18);
      ctx.lineTo(W - 30, CLAW_REST_Y - 18);
      ctx.stroke();

      // ── Prizes ────────────────────────────────────────────────
      for (const p of s.prizes) {
        if (p.grabbed && p !== s.grabbedPrize) continue;
        // rarity glow
        if (p.rarity.glow > 0) {
          ctx.shadowColor = p.rarity.name === 'rare' ? '#fbbf24' : secondary;
          ctx.shadowBlur = 8 + p.rarity.glow * 10;
        }
        ctx.font = `${p.rarity.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.shadowBlur = 0;
      }

      // ── Chain/rope ────────────────────────────────────────────
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(s.clawX, CLAW_REST_Y - 18);
      ctx.lineTo(s.clawX, s.clawY - 6);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Claw ──────────────────────────────────────────────────
      drawClaw(ctx, s.clawX, s.clawY, s.clawOpen, primary);

      // ── Sparkles ──────────────────────────────────────────────
      for (const sp of s.sparkles) {
        ctx.globalAlpha = sp.life;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Popups ────────────────────────────────────────────────
      for (const pp of s.popups) {
        ctx.globalAlpha = pp.life;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, pp.x, pp.y);
      }
      ctx.globalAlpha = 1;

      // ── Machine frame (draws on top) ──────────────────────────
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 4;
      roundRect(ctx, 10, 10, W - 20, H - 20, 12);
      ctx.stroke();

      // Corner bolts
      const bolts = [[20, 20],[W-20, 20],[20, H-20],[W-20, H-20]];
      for (const [bx, by] of bolts) {
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── "INSERT COIN" sign if game over ───────────────────────
      if (s.attemptsLeft <= 0 && s.clawState === 'swing') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 15);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 15);
      }
    }

    function drawClaw(ctx, cx, cy, openness, color) {
      const spread = PRONG_LEN * 0.5 * openness;
      // Hub
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      // Left prong
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + 4);
      ctx.lineTo(cx - spread - 8, cy + PRONG_LEN);
      ctx.stroke();
      // Right prong
      ctx.beginPath();
      ctx.moveTo(cx + 3, cy + 4);
      ctx.lineTo(cx + spread + 8, cy + PRONG_LEN);
      ctx.stroke();
      // Center prong
      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, cy + PRONG_LEN - 2);
      ctx.stroke();

      // Tips (hooks)
      ctx.lineWidth = 2.5;
      // left hook
      ctx.beginPath();
      ctx.moveTo(cx - spread - 8, cy + PRONG_LEN);
      ctx.lineTo(cx - spread - 2, cy + PRONG_LEN + 5);
      ctx.stroke();
      // right hook
      ctx.beginPath();
      ctx.moveTo(cx + spread + 8, cy + PRONG_LEN);
      ctx.lineTo(cx + spread + 2, cy + PRONG_LEN + 5);
      ctx.stroke();
    }

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      const s = stateRef.current;
      if (!s) return;
      update(s, dt);
      draw(s);
      loopRef.current = requestAnimationFrame(loop);
    }
    loopRef.current = requestAnimationFrame(loop);

    // ── Input handlers ─────────────────────────────────────────
    function onClick() { handleDrop(); }
    function onKey(e) {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleDrop();
      }
    }
    canvas.addEventListener('pointerdown', onClick);
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(loopRef.current);
      canvas.removeEventListener('pointerdown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [initState, handleDrop, primary, secondary, onComplete, submit]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: W, fontSize: '0.85rem',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
          Drops: {Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
            i < attempts ? '🔵' : '⚫'
          ).join('')}
        </span>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>
          {score} pts {best > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.75rem' }}>
            (best: {best})
          </span>}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 12,
          cursor: phase === 'playing' ? 'pointer' : 'default',
          touchAction: 'none',
        }}
      />

      {/* Instructions */}
      {phase === 'playing' && (
        <p style={{
          color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0, textAlign: 'center',
        }}>
          Tap / click / spacebar to drop the claw
        </p>
      )}
    </div>
  );
}

// ─── Rounded rect helper ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
