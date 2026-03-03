import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playClickSound } from '../utils/sounds';
import './BirthdaySlingshot.css';

const GRAVITY = 0.3;
const MAX_DRAG = 120;
const PROJ_RADIUS = 15;
const GROUND_PAD = 60;
const BLOCK_EMOJIS = ['\uD83C\uDF82', '\uD83C\uDF81', '\uD83C\uDF88', '\uD83E\uDD73', '\u2B50', '\uD83C\uDF89'];
const BLOCK_COLORS = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e', '#ef4444', '#a78bfa', '#f97316'];
const MAX_SHOTS = 3;
const WIN_THRESHOLD = 0.6; // 60% of blocks cleared = win

function buildBlocks(cw, ch) {
  const ground = ch - GROUND_PAD;
  const bw = 40, bh = 40;
  const baseX = cw * 0.62;
  const blocks = [];
  // Pyramid: 4 bottom, 3, 2, 1 = 10 blocks
  const rows = [4, 3, 2, 1];
  let id = 0;
  rows.forEach((count, row) => {
    const rowWidth = count * (bw + 4);
    const startX = baseX - rowWidth / 2;
    for (let i = 0; i < count; i++) {
      blocks.push({
        id: id++,
        x: startX + i * (bw + 4),
        y: ground - (row + 1) * bh,
        w: bw, h: bh,
        vx: 0, vy: 0,
        alive: true,
        hit: false,
        emoji: BLOCK_EMOJIS[id % BLOCK_EMOJIS.length],
        color: BLOCK_COLORS[id % BLOCK_COLORS.length],
      });
    }
  });
  return blocks;
}

export default function BirthdaySlingshot({ onClose }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('intro'); // intro | playing | win | lose
  const [shotsLeft, setShotsLeft] = useState(MAX_SHOTS);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  // Game state refs (used in animation loop, avoid re-renders)
  const blocksRef = useRef([]);
  const projRef = useRef(null);      // { x, y, vx, vy, active }
  const dragRef = useRef(null);       // { startX, startY, curX, curY }
  const isDragging = useRef(false);
  const shotsRef = useRef(MAX_SHOTS);
  const scoreRef = useRef(0);
  const totalBlocks = useRef(0);
  const shakeRef = useRef(0);
  const gameStateRef = useRef('intro');
  const animFrameRef = useRef(null);
  const containerRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { shotsRef.current = shotsLeft; }, [shotsLeft]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // ESC to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Slingshot origin position (left side)
  const getSlingshotPos = useCallback((cw, ch) => ({
    x: cw * 0.15,
    y: ch - GROUND_PAD - 60,
  }), []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width, ch = canvas.height;
    const blocks = buildBlocks(cw, ch);
    blocksRef.current = blocks;
    totalBlocks.current = blocks.length;
    projRef.current = null;
    dragRef.current = null;
    isDragging.current = false;
    shotsRef.current = MAX_SHOTS;
    scoreRef.current = 0;
    shakeRef.current = 0;
    setShotsLeft(MAX_SHOTS);
    setScore(0);
    setMessage('');
    setSent(false);
    setGameState('playing');
  }, []);

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

  // Mouse / touch handlers
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
      if (projRef.current?.active) return; // projectile in flight
      if (shotsRef.current <= 0) return;
      const pos = getPos(e);
      const sling = getSlingshotPos(canvas.width, canvas.height);
      const dx = pos.x - sling.x, dy = pos.y - sling.y;
      if (Math.sqrt(dx * dx + dy * dy) < 100) {
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
      const dist = Math.sqrt(dx * dx + dy * dy);
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

    const onUp = (e) => {
      if (!isDragging.current || !dragRef.current) return;
      isDragging.current = false;
      const d = dragRef.current;
      const dx = d.startX - d.curX;
      const dy = d.startY - d.curY;
      const power = Math.sqrt(dx * dx + dy * dy);
      if (power < 10) { dragRef.current = null; return; } // too small

      const speed = power * 0.15;
      const angle = Math.atan2(dy, dx);
      projRef.current = {
        x: d.startX, y: d.startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        active: true,
      };
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

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const cw = canvas.width, ch = canvas.height;
      const ground = ch - GROUND_PAD;
      const sling = getSlingshotPos(cw, ch);

      // Apply screen shake
      ctx.save();
      if (shakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * shakeRef.current * 2;
        const sy = (Math.random() - 0.5) * shakeRef.current * 2;
        ctx.translate(sx, sy);
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // Clear
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, 'rgb(15, 10, 30)');
      grad.addColorStop(1, 'rgb(0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      // Ground
      ctx.fillStyle = 'rgba(40, 25, 60, 0.8)';
      ctx.fillRect(0, ground, cw, GROUND_PAD);
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground);
      ctx.lineTo(cw, ground);
      ctx.stroke();

      // Draw slingshot Y-shape
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      // Left prong
      ctx.beginPath();
      ctx.moveTo(sling.x - 15, sling.y - 40);
      ctx.lineTo(sling.x - 5, sling.y);
      ctx.stroke();
      // Right prong
      ctx.beginPath();
      ctx.moveTo(sling.x + 15, sling.y - 40);
      ctx.lineTo(sling.x + 5, sling.y);
      ctx.stroke();
      // Base
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(sling.x, sling.y);
      ctx.lineTo(sling.x, sling.y + 50);
      ctx.stroke();

      // Rubber band + drag preview
      if (isDragging.current && dragRef.current) {
        const d = dragRef.current;
        // Rubber band lines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sling.x - 15, sling.y - 40);
        ctx.lineTo(d.curX, d.curY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sling.x + 15, sling.y - 40);
        ctx.lineTo(d.curX, d.curY);
        ctx.stroke();

        // Cupcake at drag point
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uD83E\uDDC1', d.curX, d.curY);

        // Trajectory preview dots
        const dx = d.startX - d.curX;
        const dy = d.startY - d.curY;
        const power = Math.sqrt(dx * dx + dy * dy);
        const speed = power * 0.15;
        const angle = Math.atan2(dy, dx);
        let px = d.startX, py = d.startY;
        let pvx = Math.cos(angle) * speed;
        let pvy = Math.sin(angle) * speed;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
          px += pvx;
          py += pvy;
          pvy += GRAVITY;
          if (py > ground) break;
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (gameStateRef.current === 'playing' && !projRef.current?.active && shotsRef.current > 0) {
        // Idle slingshot - show cupcake at rest
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uD83E\uDDC1', sling.x, sling.y - 40);
        // Rubber band at rest
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sling.x - 15, sling.y - 40);
        ctx.lineTo(sling.x, sling.y - 35);
        ctx.lineTo(sling.x + 15, sling.y - 40);
        ctx.stroke();
      }

      // Update & draw projectile
      const proj = projRef.current;
      if (proj?.active) {
        proj.vy += GRAVITY;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Ground collision
        if (proj.y + PROJ_RADIUS > ground) {
          proj.active = false;
          shakeRef.current = 3;
        }
        // Off screen
        if (proj.x > cw + 50 || proj.x < -50 || proj.y > ch + 50) {
          proj.active = false;
        }

        // Block collisions
        if (proj.active) {
          blocksRef.current.forEach(b => {
            if (!b.alive || b.hit) return;
            // Circle vs AABB
            const cx = Math.max(b.x, Math.min(proj.x, b.x + b.w));
            const cy = Math.max(b.y, Math.min(proj.y, b.y + b.h));
            const dx = proj.x - cx, dy = proj.y - cy;
            if (dx * dx + dy * dy < PROJ_RADIUS * PROJ_RADIUS) {
              b.hit = true;
              b.vx = proj.vx * 0.6;
              b.vy = proj.vy * 0.5 - 2;
              shakeRef.current = 6;

              // Chain reaction: push blocks above
              blocksRef.current.forEach(other => {
                if (other === b || !other.alive || other.hit) return;
                const overlapX = Math.abs((b.x + b.w / 2) - (other.x + other.w / 2)) < b.w * 1.2;
                const isAbove = other.y < b.y && other.y > b.y - b.h * 3;
                if (overlapX && isAbove) {
                  other.hit = true;
                  other.vx = proj.vx * 0.3 + (Math.random() - 0.5) * 3;
                  other.vy = -3 - Math.random() * 2;
                }
              });
            }
          });
        }

        // Draw projectile
        if (proj.active) {
          ctx.font = '28px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\uD83E\uDDC1', proj.x, proj.y);
        }

        // Check end-of-shot state
        if (!proj.active) {
          const aliveCount = blocksRef.current.filter(b => b.alive).length;
          const cleared = totalBlocks.current - aliveCount;
          scoreRef.current = cleared * 100;
          setScore(scoreRef.current);

          const clearRatio = cleared / totalBlocks.current;
          if (clearRatio >= WIN_THRESHOLD) {
            setGameState('win');
          } else if (shotsRef.current <= 0) {
            // Wait a beat for blocks to settle, then check
            setTimeout(() => {
              const finalAlive = blocksRef.current.filter(b => b.alive).length;
              const finalCleared = totalBlocks.current - finalAlive;
              const finalRatio = finalCleared / totalBlocks.current;
              setScore(finalCleared * 100);
              if (finalRatio >= WIN_THRESHOLD) {
                setGameState('win');
              } else {
                setGameState('lose');
              }
            }, 1200);
          }
        }
      }

      // Update & draw blocks
      blocksRef.current.forEach(b => {
        if (!b.alive) return;
        if (b.hit) {
          b.vy += GRAVITY;
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= 0.99;

          // Ground collision for blocks
          if (b.y + b.h > ground) {
            b.y = ground - b.h;
            b.vy *= -0.3;
            b.vx *= 0.8;
            if (Math.abs(b.vy) < 1) {
              b.vy = 0;
              b.vx = 0;
            }
          }

          // Remove if off-screen
          if (b.x > cw + 100 || b.x < -100 || b.y > ch + 100) {
            b.alive = false;
            const aliveCount = blocksRef.current.filter(bl => bl.alive).length;
            const cleared = totalBlocks.current - aliveCount;
            scoreRef.current = cleared * 100;
            setScore(scoreRef.current);
          }
        }

        if (b.alive) {
          // Block gradient
          const bGrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
          bGrad.addColorStop(0, b.color);
          bGrad.addColorStop(1, b.color + '99');
          ctx.fillStyle = bGrad;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          // Border
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          // Emoji on block
          ctx.font = '18px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.emoji, b.x + b.w / 2, b.y + b.h / 2);
        }
      });

      ctx.restore();
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [getSlingshotPos]);

  // Win confetti
  useEffect(() => {
    if (gameState !== 'win') return;
    const colors = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'];
    const end = Date.now() + 2500;
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [gameState]);

  const handleSend = () => {
    if (!message.trim()) return;
    try {
      const cards = JSON.parse(localStorage.getItem('jarowe_birthday_cards') || '[]');
      cards.push({ message: message.trim(), date: Date.now() });
      localStorage.setItem('jarowe_birthday_cards', JSON.stringify(cards));
    } catch { /* ignore */ }
    setSent(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#fbbf24', '#f472b6', '#7c3aed'] });
    setTimeout(() => { if (onClose) onClose(); }, 3000);
  };

  const shotsDisplay = Array.from({ length: MAX_SHOTS }, (_, i) =>
    i < shotsLeft ? '\uD83E\uDDC1' : '\u2B1C'
  ).join(' ');

  return (
    <motion.div
      className="slingshot-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="slingshot-container" ref={containerRef}>
        <button className="slingshot-close-btn" onClick={onClose} title="Close (ESC)">&times;</button>
        <canvas ref={canvasRef} className="slingshot-canvas" />

        {gameState === 'playing' && (
          <div className="slingshot-hud">
            <div className="slingshot-shots">{shotsDisplay}</div>
            <div className="slingshot-score">{score} pts</div>
          </div>
        )}

        <AnimatePresence>
          {gameState === 'intro' && (
            <motion.div
              className="slingshot-intro"
              key="intro"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h2>Birthday Card Launcher!</h2>
              <p>Pull back the slingshot to launch cupcakes at the birthday tower. Knock down the blocks to write Jared a birthday card!</p>
              <p style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                You get 3 shots. Drag from the slingshot and release!
              </p>
              <button className="slingshot-launch-btn" onClick={startGame}>LAUNCH!</button>
            </motion.div>
          )}

          {gameState === 'win' && (
            <motion.div
              className="slingshot-win"
              key="win"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              {!sent ? (
                <>
                  <h2>Happy Birthday Jared!</h2>
                  <p style={{ color: '#fbbf24' }}>Score: {score} pts</p>
                  <div className="slingshot-card-preview">
                    <p style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Write a birthday card:
                    </p>
                    <textarea
                      className="slingshot-message-input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Happy birthday! Hope it's amazing..."
                      maxLength={280}
                      autoFocus
                    />
                  </div>
                  <button className="slingshot-send-btn" onClick={handleSend} disabled={!message.trim()}>
                    SEND CARD
                  </button>
                </>
              ) : (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
                >
                  <p className="slingshot-sent-msg">Card sent!</p>
                  <p style={{ color: '#a1a1aa' }}>Thanks for the birthday wishes!</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameState === 'lose' && (
            <motion.div
              className="slingshot-lose"
              key="lose"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <h2>So Close!</h2>
              <p>Score: {score} pts. Knock down more blocks to unlock the birthday card!</p>
              <button className="slingshot-retry-btn" onClick={startGame}>TRY AGAIN</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
