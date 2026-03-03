import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playClickSound, playBalloonPopSound } from '../utils/sounds';
import './BirthdaySlingshot.css';

const GRAVITY = 0.35;
const MAX_DRAG = 150;
const PROJ_RADIUS = 18;
const GROUND_Y_RATIO = 0.85; // ground at 85% of canvas height
const SLING_X_RATIO = 0.12;
const SLING_Y_OFFSET = 80; // above ground

// ─── LEVELS ───
const LEVELS = [
  {
    name: 'Birthday Tower',
    desc: 'Topple the tower!',
    shots: 5,
    build: (cx, gy) => {
      // Tall tower, 3 wide x 6 high
      const bw = 48, bh = 48, gap = 2;
      const baseX = cx - (3 * (bw + gap)) / 2;
      const blocks = [];
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          blocks.push({ x: baseX + col * (bw + gap), y: gy - (row + 1) * bh, w: bw, h: bh, hp: 1 });
        }
      }
      return blocks;
    },
  },
  {
    name: 'Gift Fortress',
    desc: 'Breach the walls!',
    shots: 6,
    build: (cx, gy) => {
      // Two walls with gap, platform on top
      const bw = 50, bh = 50, gap = 2;
      const blocks = [];
      // Left wall (4 high)
      for (let r = 0; r < 4; r++) {
        blocks.push({ x: cx - 120, y: gy - (r + 1) * bh, w: bw, h: bh, hp: r < 2 ? 2 : 1 });
      }
      // Right wall (4 high)
      for (let r = 0; r < 4; r++) {
        blocks.push({ x: cx + 70, y: gy - (r + 1) * bh, w: bw, h: bh, hp: r < 2 ? 2 : 1 });
      }
      // Platform on top (3 blocks)
      for (let c = 0; c < 3; c++) {
        blocks.push({ x: cx - 120 + c * (bw + gap + 20), y: gy - 5 * bh, w: bw, h: bh, hp: 1 });
      }
      // Crown block on platform
      blocks.push({ x: cx - 25, y: gy - 6 * bh, w: bw, h: bh, hp: 1 });
      return blocks;
    },
  },
  {
    name: 'Party Bridge',
    desc: 'Collapse the bridge!',
    shots: 5,
    build: (cx, gy) => {
      const bw = 44, bh = 44;
      const blocks = [];
      // Two pillars
      for (let r = 0; r < 3; r++) {
        blocks.push({ x: cx - 130, y: gy - (r + 1) * bh, w: bw, h: bh, hp: 2 });
        blocks.push({ x: cx + 90, y: gy - (r + 1) * bh, w: bw, h: bh, hp: 2 });
      }
      // Bridge deck (5 blocks across)
      for (let c = 0; c < 5; c++) {
        blocks.push({ x: cx - 130 + c * (bw + 8), y: gy - 4 * bh, w: bw, h: bh, hp: 1 });
      }
      // Stuff on bridge (3 blocks)
      blocks.push({ x: cx - 80, y: gy - 5 * bh, w: bw, h: bh, hp: 1 });
      blocks.push({ x: cx, y: gy - 5 * bh, w: bw, h: bh, hp: 1 });
      blocks.push({ x: cx + 80, y: gy - 5 * bh, w: bw, h: bh, hp: 1 });
      return blocks;
    },
  },
  {
    name: 'Candle Castle',
    desc: 'Blow out the candles!',
    shots: 6,
    build: (cx, gy) => {
      const bw = 46, bh = 46;
      const blocks = [];
      // Base layer (5 wide)
      for (let c = 0; c < 5; c++) {
        blocks.push({ x: cx - 120 + c * (bw + 4), y: gy - bh, w: bw, h: bh, hp: 2 });
      }
      // Second layer (4 wide, offset)
      for (let c = 0; c < 4; c++) {
        blocks.push({ x: cx - 96 + c * (bw + 4), y: gy - 2 * bh, w: bw, h: bh, hp: 1 });
      }
      // Third layer (3 wide)
      for (let c = 0; c < 3; c++) {
        blocks.push({ x: cx - 72 + c * (bw + 4), y: gy - 3 * bh, w: bw, h: bh, hp: 1 });
      }
      // Two candle towers
      blocks.push({ x: cx - 48, y: gy - 4 * bh, w: bw, h: bh, hp: 1 });
      blocks.push({ x: cx + 2, y: gy - 4 * bh, w: bw, h: bh, hp: 1 });
      // Candle flames (small)
      blocks.push({ x: cx - 38, y: gy - 5 * bh + 10, w: 26, h: 26, hp: 1 });
      blocks.push({ x: cx + 12, y: gy - 5 * bh + 10, w: 26, h: 26, hp: 1 });
      return blocks;
    },
  },
  {
    name: 'THE BIG 4-0',
    desc: 'The grand finale!',
    shots: 7,
    build: (cx, gy) => {
      const bw = 36, bh = 36;
      const blocks = [];
      // "4" shape (left side)
      const fourX = cx - 100;
      // Vertical left of 4
      for (let r = 0; r < 5; r++) blocks.push({ x: fourX, y: gy - (r + 1) * bh, w: bw, h: bh, hp: 1 });
      // Horizontal bar of 4
      for (let c = 1; c < 3; c++) blocks.push({ x: fourX + c * (bw + 2), y: gy - 3 * bh, w: bw, h: bh, hp: 1 });
      // Vertical right of 4
      for (let r = 0; r < 5; r++) blocks.push({ x: fourX + 3 * (bw + 2), y: gy - (r + 1) * bh, w: bw, h: bh, hp: r < 2 ? 2 : 1 });

      // "0" shape (right side)
      const zeroX = cx + 40;
      // Left side of 0
      for (let r = 0; r < 5; r++) blocks.push({ x: zeroX, y: gy - (r + 1) * bh, w: bw, h: bh, hp: 1 });
      // Right side of 0
      for (let r = 0; r < 5; r++) blocks.push({ x: zeroX + 3 * (bw + 2), y: gy - (r + 1) * bh, w: bw, h: bh, hp: 1 });
      // Top and bottom of 0
      for (let c = 1; c < 3; c++) {
        blocks.push({ x: zeroX + c * (bw + 2), y: gy - bh, w: bw, h: bh, hp: 2 });
        blocks.push({ x: zeroX + c * (bw + 2), y: gy - 5 * bh, w: bw, h: bh, hp: 2 });
      }
      return blocks;
    },
  },
];

const BLOCK_EMOJIS = ['\uD83C\uDF82', '\uD83C\uDF81', '\uD83C\uDF88', '\uD83E\uDD73', '\u2B50', '\uD83C\uDF89', '\uD83C\uDF70', '\uD83D\uDD25'];
const BLOCK_COLORS = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e', '#ef4444', '#a78bfa', '#f97316'];

export default function BirthdaySlingshot({ onClose }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('intro'); // intro | level-intro | playing | level-clear | all-clear | lose
  const [level, setLevel] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const blocksRef = useRef([]);
  const projRef = useRef(null);
  const trailRef = useRef([]); // projectile trail dots
  const particlesRef = useRef([]); // impact particles
  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const shotsRef = useRef(0);
  const scoreRef = useRef(0);
  const totalBlocksRef = useRef(0);
  const shakeRef = useRef(0);
  const gameStateRef = useRef('intro');
  const levelRef = useRef(0);
  const animFrameRef = useRef(null);
  const settleTimer = useRef(null);
  const starsRef = useRef([]);// background stars

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { shotsRef.current = shotsLeft; }, [shotsLeft]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Generate background stars once
  useEffect(() => {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random() * 0.8,
      r: 0.5 + Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
    }));
  }, []);

  const getGround = useCallback((ch) => Math.floor(ch * GROUND_Y_RATIO), []);
  const getSlingshotPos = useCallback((cw, ch) => ({
    x: Math.floor(cw * SLING_X_RATIO),
    y: getGround(ch) - SLING_Y_OFFSET,
  }), [getGround]);

  const initLevel = useCallback((lvlIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width, ch = canvas.height;
    const gy = getGround(ch);
    const centerX = cw * 0.55; // blocks centered right of middle
    const lvl = LEVELS[lvlIndex];
    const rawBlocks = lvl.build(centerX, gy);

    let id = 0;
    const blocks = rawBlocks.map(b => ({
      ...b, id: id++,
      vx: 0, vy: 0, angle: 0, va: 0,
      alive: true, hit: false, settled: true,
      emoji: BLOCK_EMOJIS[id % BLOCK_EMOJIS.length],
      color: BLOCK_COLORS[id % BLOCK_COLORS.length],
      maxHp: b.hp,
    }));

    blocksRef.current = blocks;
    totalBlocksRef.current = blocks.length;
    projRef.current = null;
    trailRef.current = [];
    particlesRef.current = [];
    dragRef.current = null;
    isDragging.current = false;
    shakeRef.current = 0;
    shotsRef.current = lvl.shots;
    scoreRef.current = 0;
    setShotsLeft(lvl.shots);
    setScore(0);
    setStars(0);
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, [getGround]);

  const startGame = useCallback(() => {
    setLevel(0);
    setTotalScore(0);
    setMessage('');
    setSent(false);
    initLevel(0);
    setGameState('level-intro');
  }, [initLevel]);

  const startLevel = useCallback(() => {
    setGameState('playing');
  }, []);

  const nextLevel = useCallback(() => {
    const next = level + 1;
    if (next >= LEVELS.length) {
      setGameState('all-clear');
    } else {
      setLevel(next);
      initLevel(next);
      setGameState('level-intro');
    }
  }, [level, initLevel]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mouse / touch handlers - drag from ANYWHERE on left half to aim
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    const onDown = (e) => {
      if (gameStateRef.current !== 'playing') return;
      if (projRef.current?.active) return;
      if (shotsRef.current <= 0) return;
      const pos = getPos(e);
      // Allow drag from anywhere on the left 40% of screen or near slingshot
      const sling = getSlingshotPos(canvas.width, canvas.height);
      if (pos.x < canvas.width * 0.4 || Math.hypot(pos.x - sling.x, pos.y - sling.y) < 150) {
        isDragging.current = true;
        dragRef.current = { startX: sling.x, startY: sling.y, curX: pos.x, curY: pos.y };
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!isDragging.current || !dragRef.current) return;
      const pos = getPos(e);
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_DRAG) {
        const scale = MAX_DRAG / dist;
        dragRef.current.curX = dragRef.current.startX + dx * scale;
        dragRef.current.curY = dragRef.current.startY + dy * scale;
      } else {
        dragRef.current.curX = pos.x;
        dragRef.current.curY = pos.y;
      }
      e.preventDefault();
    };

    const onUp = () => {
      if (!isDragging.current || !dragRef.current) return;
      isDragging.current = false;
      const d = dragRef.current;
      const dx = d.startX - d.curX;
      const dy = d.startY - d.curY;
      const power = Math.hypot(dx, dy);
      if (power < 15) { dragRef.current = null; return; }

      const speed = power * 0.18;
      const angle = Math.atan2(dy, dx);
      projRef.current = {
        x: d.startX, y: d.startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        active: true, bounces: 0,
      };
      trailRef.current = [];
      dragRef.current = null;
      shotsRef.current -= 1;
      setShotsLeft(shotsRef.current);
      playClickSound();
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [getSlingshotPos]);

  // Spawn impact particles
  const spawnParticles = useCallback((x, y, color, count = 6) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1, color, r: 2 + Math.random() * 3,
      });
    }
  }, []);

  // Check level completion
  const checkLevelEnd = useCallback(() => {
    const alive = blocksRef.current.filter(b => b.alive).length;
    const cleared = totalBlocksRef.current - alive;
    const ratio = cleared / totalBlocksRef.current;
    const pts = cleared * 150;
    scoreRef.current = pts;
    setScore(pts);

    if (ratio >= 0.7) {
      // WIN - calculate stars
      const s = ratio >= 1.0 ? 3 : ratio >= 0.85 ? 2 : 1;
      const bonusPts = shotsRef.current * 200; // bonus for remaining shots
      const finalScore = pts + bonusPts;
      scoreRef.current = finalScore;
      setScore(finalScore);
      setTotalScore(prev => prev + finalScore);
      setStars(s);
      setGameState('level-clear');
    } else if (shotsRef.current <= 0 && !projRef.current?.active) {
      // Check if blocks are still moving
      const moving = blocksRef.current.some(b => b.alive && b.hit && (Math.abs(b.vx) > 0.5 || Math.abs(b.vy) > 0.5));
      if (!moving) {
        // Recheck after settling
        const finalAlive = blocksRef.current.filter(b => b.alive).length;
        const finalRatio = (totalBlocksRef.current - finalAlive) / totalBlocksRef.current;
        if (finalRatio >= 0.7) {
          const s = finalRatio >= 1.0 ? 3 : finalRatio >= 0.85 ? 2 : 1;
          const finalPts = (totalBlocksRef.current - finalAlive) * 150 + shotsRef.current * 200;
          setScore(finalPts);
          setTotalScore(prev => prev + finalPts);
          setStars(s);
          setGameState('level-clear');
        } else {
          setGameState('lose');
        }
      }
    }
  }, []);

  // ─── GAME LOOP ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameCount = 0;

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      frameCount++;
      const cw = canvas.width, ch = canvas.height;
      const ground = getGround(ch);
      const sling = getSlingshotPos(cw, ch);

      ctx.save();
      if (shakeRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current * 2, (Math.random() - 0.5) * shakeRef.current * 2);
        shakeRef.current *= 0.82;
        if (shakeRef.current < 0.3) shakeRef.current = 0;
      }

      // ─── SKY + STARS ───
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, '#0a0618');
      sky.addColorStop(0.5, '#120a28');
      sky.addColorStop(1, '#1a0e35');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      // Twinkling stars
      starsRef.current.forEach(s => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(frameCount * s.speed + s.twinkle));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * cw, s.y * ch, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── GROUND ───
      const gGrad = ctx.createLinearGradient(0, ground, 0, ch);
      gGrad.addColorStop(0, '#2d1a4e');
      gGrad.addColorStop(0.3, '#1f1040');
      gGrad.addColorStop(1, '#0a0520');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, ground, cw, ch - ground);
      // Ground line glow
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground);
      ctx.lineTo(cw, ground);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ─── SLINGSHOT ───
      const sY = sling.y;
      const sX = sling.x;
      // Base
      ctx.strokeStyle = '#a0722b';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sX, sY + 10);
      ctx.lineTo(sX, ground);
      ctx.stroke();
      // Left prong
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(sX - 20, sY - 50);
      ctx.lineTo(sX - 6, sY + 10);
      ctx.stroke();
      // Right prong
      ctx.beginPath();
      ctx.moveTo(sX + 20, sY - 50);
      ctx.lineTo(sX + 6, sY + 10);
      ctx.stroke();
      // Prong tips glow
      ctx.fillStyle = '#d4a43a';
      ctx.beginPath(); ctx.arc(sX - 20, sY - 50, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sX + 20, sY - 50, 4, 0, Math.PI * 2); ctx.fill();

      // ─── RUBBER BAND + DRAG ───
      if (isDragging.current && dragRef.current) {
        const d = dragRef.current;
        // Rubber bands
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(sX - 20, sY - 50); ctx.lineTo(d.curX, d.curY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sX + 20, sY - 50); ctx.lineTo(d.curX, d.curY); ctx.stroke();

        // Projectile at drag point
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uD83E\uDDC1', d.curX, d.curY);

        // Power indicator glow
        const power = Math.hypot(d.startX - d.curX, d.startY - d.curY) / MAX_DRAG;
        ctx.strokeStyle = `rgba(${Math.floor(255 * power)}, ${Math.floor(255 * (1 - power))}, 0, 0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.startX, d.startY, 30 + power * 30, 0, Math.PI * 2);
        ctx.stroke();

        // Trajectory preview
        const dx = d.startX - d.curX, dy = d.startY - d.curY;
        const speed = Math.hypot(dx, dy) * 0.18;
        const angle = Math.atan2(dy, dx);
        let px = d.startX, py = d.startY;
        let pvx = Math.cos(angle) * speed, pvy = Math.sin(angle) * speed;
        for (let i = 0; i < 30; i++) {
          px += pvx; py += pvy; pvy += GRAVITY;
          if (py > ground || px > cw) break;
          const alpha = 0.5 * (1 - i / 30);
          ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (gameStateRef.current === 'playing' && !projRef.current?.active && shotsRef.current > 0) {
        // Idle — cupcake resting in sling
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uD83E\uDDC1', sX, sY - 50);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sX - 20, sY - 50);
        ctx.lineTo(sX, sY - 45);
        ctx.lineTo(sX + 20, sY - 50);
        ctx.stroke();
      }

      // ─── PROJECTILE ───
      const proj = projRef.current;
      if (proj?.active) {
        proj.vy += GRAVITY;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Trail
        trailRef.current.push({ x: proj.x, y: proj.y, life: 1 });
        if (trailRef.current.length > 20) trailRef.current.shift();

        // Ground
        if (proj.y + PROJ_RADIUS > ground) {
          proj.y = ground - PROJ_RADIUS;
          proj.vy *= -0.3;
          proj.vx *= 0.7;
          proj.bounces++;
          shakeRef.current = Math.max(shakeRef.current, 4);
          if (proj.bounces > 2 || Math.abs(proj.vy) < 1) proj.active = false;
        }
        // Off screen
        if (proj.x > cw + 50 || proj.x < -50 || proj.y > ch + 50) proj.active = false;

        // Block collisions — projectile pushes through, loses some speed
        if (proj.active) {
          blocksRef.current.forEach(b => {
            if (!b.alive) return;
            const cx = Math.max(b.x, Math.min(proj.x, b.x + b.w));
            const cy = Math.max(b.y, Math.min(proj.y, b.y + b.h));
            if (Math.hypot(proj.x - cx, proj.y - cy) < PROJ_RADIUS) {
              b.hp--;
              b.hit = true;
              b.settled = false;
              const pushX = proj.vx * 0.5;
              const pushY = proj.vy * 0.4 - 3;
              b.vx += pushX;
              b.vy += pushY;
              b.va = (Math.random() - 0.5) * 0.15;
              proj.vx *= 0.65;
              proj.vy *= 0.65;
              shakeRef.current = Math.max(shakeRef.current, 8);
              spawnParticles(proj.x, proj.y, b.color, 8);
              playBalloonPopSound();

              if (b.hp <= 0) {
                b.alive = false;
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);
              }

              // Chain reaction — push nearby blocks
              blocksRef.current.forEach(other => {
                if (other === b || !other.alive) return;
                const dist = Math.hypot((b.x + b.w / 2) - (other.x + other.w / 2), (b.y + b.h / 2) - (other.y + other.h / 2));
                if (dist < b.w * 2.5) {
                  other.hit = true;
                  other.settled = false;
                  other.vx += pushX * 0.3 + (Math.random() - 0.5) * 2;
                  other.vy += pushY * 0.2 - 1;
                  other.va = (Math.random() - 0.5) * 0.1;
                }
              });
            }
          });
        }

        // Draw trail
        trailRef.current.forEach((t, i) => {
          t.life -= 0.06;
          if (t.life > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${t.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3 * t.life, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        trailRef.current = trailRef.current.filter(t => t.life > 0);

        // Draw projectile
        if (proj.active) {
          // Glow
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 15;
          ctx.font = '36px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\uD83E\uDDC1', proj.x, proj.y);
          ctx.shadowBlur = 0;
        }

        // On projectile stop, schedule check
        if (!proj.active) {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => {
            if (gameStateRef.current === 'playing') checkLevelEnd();
          }, 1500);
        }
      }

      // ─── BLOCKS ───
      blocksRef.current.forEach(b => {
        if (!b.alive) return;
        if (b.hit && !b.settled) {
          b.vy += GRAVITY;
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= 0.98;
          b.angle += b.va;

          // Ground collision
          if (b.y + b.h > ground) {
            b.y = ground - b.h;
            b.vy *= -0.25;
            b.vx *= 0.7;
            b.va *= 0.5;
            if (Math.abs(b.vy) < 0.5 && Math.abs(b.vx) < 0.3) {
              b.vy = 0; b.vx = 0; b.va = 0; b.settled = true;
            }
          }

          // Block-on-block collision
          blocksRef.current.forEach(other => {
            if (other === b || !other.alive) return;
            const overlapX = b.x < other.x + other.w && b.x + b.w > other.x;
            const overlapY = b.y < other.y + other.h && b.y + b.h > other.y;
            if (overlapX && overlapY) {
              const dx = (b.x + b.w / 2) - (other.x + other.w / 2);
              const dy = (b.y + b.h / 2) - (other.y + other.h / 2);
              // Push apart + transfer velocity
              if (Math.abs(dx) > Math.abs(dy)) {
                b.vx += dx > 0 ? 1.5 : -1.5;
                other.vx += dx > 0 ? -0.8 : 0.8;
              } else {
                b.vy += dy > 0 ? 1.5 : -1.5;
                other.vy += dy > 0 ? -0.8 : 0.8;
              }
              other.hit = true;
              other.settled = false;
              other.va += (Math.random() - 0.5) * 0.05;
            }
          });

          // Off screen = destroyed
          if (b.x > cw + 100 || b.x < -100 || b.y > ch + 100) {
            b.alive = false;
            spawnParticles(cw / 2, ground, b.color, 4);
          }
        }

        // Draw block
        if (b.alive) {
          ctx.save();
          ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
          ctx.rotate(b.angle);

          // Block body
          const bGrad = ctx.createLinearGradient(-b.w / 2, -b.h / 2, -b.w / 2, b.h / 2);
          bGrad.addColorStop(0, b.color);
          bGrad.addColorStop(1, b.color + 'aa');
          ctx.fillStyle = bGrad;
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);

          // Damage indicator
          if (b.hp < b.maxHp) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            // Crack lines
            ctx.beginPath();
            ctx.moveTo(-b.w / 4, -b.h / 4);
            ctx.lineTo(b.w / 6, b.h / 6);
            ctx.moveTo(b.w / 4, -b.h / 3);
            ctx.lineTo(-b.w / 6, b.h / 4);
            ctx.stroke();
          }

          // Border
          ctx.strokeStyle = b.maxHp > 1 && b.hp === b.maxHp ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
          ctx.lineWidth = b.maxHp > 1 && b.hp === b.maxHp ? 2 : 1;
          ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);

          // Emoji
          ctx.font = `${Math.min(b.w, b.h) * 0.5}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.emoji, 0, 0);

          ctx.restore();
        }
      });

      // ─── PARTICLES ───
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.03;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [getGround, getSlingshotPos, checkLevelEnd, spawnParticles]);

  // Win confetti
  useEffect(() => {
    if (gameState !== 'level-clear' && gameState !== 'all-clear') return;
    const colors = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'];
    const end = Date.now() + (gameState === 'all-clear' ? 4000 : 2000);
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [gameState]);

  const handleSend = () => {
    if (!message.trim()) return;
    try {
      const cards = JSON.parse(localStorage.getItem('jarowe_birthday_cards') || '[]');
      cards.push({ message: message.trim(), score: totalScore, date: Date.now() });
      localStorage.setItem('jarowe_birthday_cards', JSON.stringify(cards));
    } catch { /* */ }
    setSent(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#fbbf24', '#f472b6', '#7c3aed'] });
    setTimeout(() => { if (onClose) onClose(); }, 3500);
  };

  const shotsDisplay = Array.from({ length: LEVELS[level]?.shots || 5 }, (_, i) =>
    i < shotsLeft ? '\uD83E\uDDC1' : '\u274C'
  ).join(' ');

  return (
    <motion.div className="slingshot-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="slingshot-container">
        <button className="slingshot-close-btn" onClick={onClose} title="Close (ESC)">&times;</button>
        <canvas ref={canvasRef} className="slingshot-canvas" />

        {gameState === 'playing' && (
          <div className="slingshot-hud">
            <div className="slingshot-level-badge">Level {level + 1}/{LEVELS.length}</div>
            <div className="slingshot-shots">{shotsDisplay}</div>
            <div className="slingshot-score">{score} pts</div>
          </div>
        )}

        {gameState === 'playing' && shotsLeft > 0 && !projRef.current?.active && (
          <div className="slingshot-hint">Drag from the left side to aim and release!</div>
        )}

        <AnimatePresence>
          {gameState === 'intro' && (
            <motion.div className="slingshot-intro" key="intro" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="slingshot-logo">&#x1F382;</div>
              <h2>Birthday Card Launcher!</h2>
              <p>Launch cupcakes to smash through 5 birthday levels! Clear the blocks to unlock Jared's birthday card!</p>
              <div className="slingshot-level-preview">
                {LEVELS.map((l, i) => (
                  <div key={i} className="slingshot-level-pip">
                    <span className="pip-num">{i + 1}</span>
                    <span className="pip-name">{l.name}</span>
                  </div>
                ))}
              </div>
              <button className="slingshot-launch-btn" onClick={startGame}>LET'S SMASH!</button>
            </motion.div>
          )}

          {gameState === 'level-intro' && (
            <motion.div className="slingshot-level-intro" key="lvl-intro" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -40 }} transition={{ type: 'spring', bounce: 0.4 }}>
              <div className="slingshot-level-num">Level {level + 1}</div>
              <h2>{LEVELS[level].name}</h2>
              <p>{LEVELS[level].desc}</p>
              <p style={{ color: '#fbbf24' }}>{LEVELS[level].shots} shots available</p>
              <button className="slingshot-launch-btn" onClick={startLevel}>GO!</button>
            </motion.div>
          )}

          {gameState === 'level-clear' && (
            <motion.div className="slingshot-level-clear" key="lvl-clear" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <h2>Level {level + 1} Clear!</h2>
              <div className="slingshot-stars">
                {[1, 2, 3].map(s => (
                  <motion.span
                    key={s}
                    className={`slingshot-star ${s <= stars ? 'earned' : ''}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: s * 0.2, type: 'spring', bounce: 0.5 }}
                  >
                    {s <= stars ? '\u2B50' : '\u2606'}
                  </motion.span>
                ))}
              </div>
              <p style={{ color: '#fbbf24', fontSize: '1.3rem', fontWeight: 800 }}>{score} pts</p>
              {shotsLeft > 0 && <p style={{ color: '#22c55e', fontSize: '0.9rem' }}>+{shotsLeft * 200} shot bonus!</p>}
              <button className="slingshot-launch-btn" onClick={nextLevel}>
                {level + 1 < LEVELS.length ? 'NEXT LEVEL!' : 'FINISH!'}
              </button>
            </motion.div>
          )}

          {gameState === 'all-clear' && (
            <motion.div className="slingshot-win" key="all-clear" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              {!sent ? (
                <>
                  <h2>All Levels Complete!</h2>
                  <p style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 900 }}>Total: {totalScore} pts</p>
                  <div className="slingshot-card-preview">
                    <div className="slingshot-card-header">Write Jared a Birthday Card!</div>
                    <textarea
                      className="slingshot-message-input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Happy birthday Jared! ..."
                      maxLength={280}
                      autoFocus
                    />
                  </div>
                  <button className="slingshot-send-btn" onClick={handleSend} disabled={!message.trim()}>
                    SEND CARD
                  </button>
                </>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '4rem' }}>&#x1F389;</div>
                  <p className="slingshot-sent-msg">Card Sent!</p>
                  <p style={{ color: '#a1a1aa' }}>Thanks for the birthday wishes!</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameState === 'lose' && (
            <motion.div className="slingshot-lose" key="lose" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <h2>Not Quite!</h2>
              <p>Clear 70% of blocks to advance. You got this!</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="slingshot-retry-btn" onClick={() => { initLevel(level); setGameState('playing'); }}>TRY AGAIN</button>
                <button className="slingshot-close-btn-text" onClick={onClose}>Quit</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
