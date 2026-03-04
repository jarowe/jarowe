import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 380;
const BALL_R = 6;
const HOLE_R = 10;
const FRICTION = 0.985;
const MIN_SPEED = 0.15;
const MAX_POWER = 12;

const COURSES = [
  {
    name: 'Straight Shot',
    par: 2,
    ball: { x: 150, y: 330 },
    hole: { x: 150, y: 60 },
    walls: [
      { x: 40, y: 20, w: 5, h: 340 },
      { x: 255, y: 20, w: 5, h: 340 },
      { x: 40, y: 20, w: 220, h: 5 },
    ],
  },
  {
    name: 'The Bend',
    par: 3,
    ball: { x: 80, y: 330 },
    hole: { x: 220, y: 60 },
    walls: [
      { x: 40, y: 20, w: 5, h: 340 },
      { x: 255, y: 20, w: 5, h: 340 },
      { x: 40, y: 20, w: 220, h: 5 },
      { x: 130, y: 120, w: 5, h: 180 },
    ],
  },
  {
    name: 'Zigzag',
    par: 4,
    ball: { x: 80, y: 340 },
    hole: { x: 220, y: 50 },
    walls: [
      { x: 40, y: 20, w: 5, h: 340 },
      { x: 255, y: 20, w: 5, h: 340 },
      { x: 40, y: 20, w: 220, h: 5 },
      { x: 40, y: 260, w: 150, h: 5 },
      { x: 110, y: 160, w: 150, h: 5 },
      { x: 40, y: 90, w: 120, h: 5 },
    ],
  },
];

export default function MiniGolf({ onComplete, holiday, theme }) {
  const canvasRef = useRef(null);
  const [holeIndex, setHoleIndex] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [totalPar, setTotalPar] = useState(0);
  const [done, setDone] = useState(false);
  const [aiming, setAiming] = useState(false);
  const { best, submit } = useHighScore('mini-golf');

  const stateRef = useRef({
    ball: { ...COURSES[0].ball, vx: 0, vy: 0 },
    moving: false,
    aimStart: null,
    aimEnd: null,
  });
  const loopRef = useRef(null);

  const course = COURSES[holeIndex] || COURSES[0];

  // Reset ball for current hole
  useEffect(() => {
    const s = stateRef.current;
    s.ball = { ...course.ball, vx: 0, vy: 0 };
    s.moving = false;
    setStrokes(0);
  }, [holeIndex, course.ball]);

  // Canvas interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || done) return;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = W / rect.width;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
    };

    const onDown = (e) => {
      if (stateRef.current.moving) return;
      e.preventDefault();
      const pos = getPos(e);
      stateRef.current.aimStart = pos;
      stateRef.current.aimEnd = pos;
      setAiming(true);
    };

    const onMove = (e) => {
      if (!stateRef.current.aimStart) return;
      e.preventDefault();
      stateRef.current.aimEnd = getPos(e);
    };

    const onUp = (e) => {
      const s = stateRef.current;
      if (!s.aimStart) return;
      e.preventDefault();
      setAiming(false);

      const dx = s.aimStart.x - s.aimEnd.x;
      const dy = s.aimStart.y - s.aimEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist / 15, MAX_POWER);

      if (power > 0.5) {
        const angle = Math.atan2(dy, dx);
        s.ball.vx = Math.cos(angle) * power;
        s.ball.vy = Math.sin(angle) * power;
        s.moving = true;
        setStrokes(prev => prev + 1);
        playGameSound('pop');
      }

      s.aimStart = null;
      s.aimEnd = null;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [done]);

  // Game loop
  useEffect(() => {
    if (done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function tick() {
      const s = stateRef.current;
      const b = s.ball;

      if (s.moving) {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= FRICTION;
        b.vy *= FRICTION;

        // Wall collisions
        for (const w of course.walls) {
          if (b.x + BALL_R > w.x && b.x - BALL_R < w.x + w.w
            && b.y + BALL_R > w.y && b.y - BALL_R < w.y + w.h) {
            // Determine bounce direction
            const overlapLeft = (b.x + BALL_R) - w.x;
            const overlapRight = (w.x + w.w) - (b.x - BALL_R);
            const overlapTop = (b.y + BALL_R) - w.y;
            const overlapBottom = (w.y + w.h) - (b.y - BALL_R);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
              b.vx = -b.vx * 0.8;
              b.x += minOverlap === overlapLeft ? -overlapLeft : overlapRight;
            } else {
              b.vy = -b.vy * 0.8;
              b.y += minOverlap === overlapTop ? -overlapTop : overlapBottom;
            }
            playGameSound('tick');
          }
        }

        // Canvas bounds
        if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx) * 0.8; }
        if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy) * 0.8; }
        if (b.y + BALL_R > H) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy) * 0.8; }

        // Hole check
        const hx = course.hole.x, hy = course.hole.y;
        const dist = Math.sqrt((b.x - hx) ** 2 + (b.y - hy) ** 2);
        const speed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
        if (dist < HOLE_R && speed < 5) {
          // Sunk!
          s.moving = false;
          playGameSound('win');
          const holeStrokes = strokes + (s.moving ? 0 : 0); // strokes already updated
          setTotalStrokes(t => t + strokes);
          setTotalPar(t => t + course.par);

          if (holeIndex + 1 >= COURSES.length) {
            // Game complete
            const finalStrokes = totalStrokes + strokes;
            const finalPar = totalPar + course.par;
            const score = Math.max(0, 200 - (finalStrokes - finalPar) * 20);
            setDone(true);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
            submit(score);
            setTimeout(() => onComplete(score), 1000);
          } else {
            setTimeout(() => setHoleIndex(i => i + 1), 800);
          }
          return;
        }

        // Stop check
        if (speed < MIN_SPEED) {
          b.vx = 0;
          b.vy = 0;
          s.moving = false;
        }
      }

      // Draw
      ctx.fillStyle = '#1a472a'; // Green felt
      ctx.fillRect(0, 0, W, H);

      // Walls
      ctx.fillStyle = '#654321';
      for (const w of course.walls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }

      // Hole
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(course.hole.x, course.hole.y, HOLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flag
      ctx.fillStyle = theme.primary;
      ctx.fillRect(course.hole.x + 2, course.hole.y - 20, 1, 20);
      ctx.beginPath();
      ctx.moveTo(course.hole.x + 3, course.hole.y - 20);
      ctx.lineTo(course.hole.x + 15, course.hole.y - 15);
      ctx.lineTo(course.hole.x + 3, course.hole.y - 10);
      ctx.fill();

      // Aim line
      if (s.aimStart && s.aimEnd && !s.moving) {
        const dx = s.aimStart.x - s.aimEnd.x;
        const dy = s.aimStart.y - s.aimEnd.y;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER * 15);
        const angle = Math.atan2(dy, dx);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.cos(angle) * dist * 0.7, b.y + Math.sin(angle) * dist * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);

        // Power indicator
        const power = dist / (MAX_POWER * 15);
        ctx.fillStyle = power > 0.7 ? '#f43f5e' : power > 0.4 ? '#fbbf24' : '#22c55e';
        ctx.fillRect(W - 20, H - 10 - 100 * power, 10, 100 * power);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(W - 20, H - 110, 10, 100);
      }

      // Ball
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(loopRef.current);
  }, [holeIndex, done, course, strokes, totalStrokes, totalPar, theme, submit, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: W, maxWidth: '100%', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          Hole {holeIndex + 1}/{COURSES.length}: {course.name}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          Par {course.par} | Strokes: {strokes}
        </span>
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
          cursor: aiming ? 'grabbing' : 'grab',
        }}
      />
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
        {done ? `Total: ${totalStrokes} strokes (Par ${totalPar})` : 'Click & drag away from ball to aim, release to shoot'}
      </p>
      {best > 0 && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
