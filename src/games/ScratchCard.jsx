import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// Symbol pools by category
const SYMBOL_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '☕', '🍣', '🍫'],
  space:     ['🚀', '🌍', '⭐', '🛸', '☄️', '🌙', '🪐', '🔭'],
  tech:      ['💻', '🤖', '⚡', '🔧', '📱', '🎮', '💡', '🔌'],
  nature:    ['🌲', '🌸', '🦋', '🌈', '🍃', '🐝', '🌻', '🦅'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺'],
  family:    ['❤️', '🤗', '🌟', '💝', '🏠', '🎁', '💑', '🧸'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀', '🚀'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪', '😜', '🎈', '🤡'],
  adventure: ['🗺️', '🏔️', '🌊', '⛵', '🏕️', '🧗', '🏄', '🎒'],
  arts:      ['🎨', '🎬', '📚', '🎭', '✏️', '🖌️', '📖', '🎪'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️', '🐈‍⬛'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️'],
  default:   ['💎', '⭐', '🔥', '🍀', '🎯', '✨', '🏆', '👑'],
};

// Variant overrides
const VARIANTS = {
  pirate: {
    overlayColor: '#8B7355',
    symbols: ['🏴‍☠️', '💰', '🗡️', '🦜', '🧭', '⚓', '🏝️', '💎'],
    revealText: 'X marks the spot!',
    bgPattern: 'treasure map',
  },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildGrid(pool) {
  // Bias toward creating matches — pick a dominant symbol
  const dominant = pickRandom(pool);
  const grid = [];
  for (let i = 0; i < 9; i++) {
    // ~40% chance dominant, 60% random
    grid.push(Math.random() < 0.4 ? dominant : pickRandom(pool));
  }
  return grid;
}

function countMatches(grid) {
  const counts = {};
  grid.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  let best = 0;
  Object.values(counts).forEach(c => { if (c > best) best = c; });
  return best;
}

export default function ScratchCard({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const pool = cfg?.symbols || SYMBOL_POOLS[holiday?.category] || SYMBOL_POOLS.default;
  const overlayColor = cfg?.overlayColor || '#4a4a5a';

  const [grid] = useState(() => buildGrid(pool));
  const [scratched, setScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [score, setScore] = useState(null);
  const { best, submit } = useHighScore('scratch-card');

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const scratchedPixelsRef = useRef(0);
  const totalPixelsRef = useRef(1);
  const hasRevealedRef = useRef(false);
  const gridRef = useRef(null);

  // Initialize canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const gridEl = gridRef.current;
    if (!canvas || !gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw shimmer lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < rect.width + rect.height; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - rect.height, rect.height);
      ctx.stroke();
    }

    // Draw "SCRATCH ME" text
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `bold ${Math.min(rect.width / 8, 18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg?.bgPattern === 'treasure map' ? 'SCRATCH THE MAP' : 'SCRATCH ME!', rect.width / 2, rect.height / 2);

    totalPixelsRef.current = rect.width * rect.height;
  }, [overlayColor, cfg]);

  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealedRef.current) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const cx = x - rect.left;
    const cy = y - rect.top;
    const radius = 24;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Track percentage
    scratchedPixelsRef.current += Math.PI * radius * radius;
    const pct = Math.min(100, (scratchedPixelsRef.current / totalPixelsRef.current) * 100);
    setScratchPercent(Math.round(pct));

    // Auto-reveal at ~70%
    if (pct >= 70 && !hasRevealedRef.current) {
      hasRevealedRef.current = true;
      reveal();
    }
  }, []);

  const reveal = useCallback(() => {
    if (scratched) return;
    setScratched(true);

    // Clear canvas entirely
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Calculate score
    const matchCount = countMatches(grid);
    let pts = 0;
    let isWin = false;
    if (matchCount >= 3) {
      pts = 100;
      isWin = true;
    } else if (matchCount >= 2) {
      pts = 25;
    }

    setScore(pts);

    if (isWin) {
      playGameSound('win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
        colors: [theme.primary, theme.secondary, '#fbbf24'],
      });
    } else if (pts > 0) {
      playGameSound('correct');
    } else {
      playGameSound('wrong');
    }

    submit(pts);
    setTimeout(() => onComplete(pts), 1800);
  }, [scratched, grid, theme, submit, onComplete]);

  // Mouse / touch handlers
  const handlePointerDown = useCallback((e) => {
    isDrawingRef.current = true;
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    scratch(clientX, clientY);
    playGameSound('tick');
  }, [scratch]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const { clientX, clientY } = e.touches ? e.touches[0] : e;
    scratch(clientX, clientY);
  }, [scratch]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const matchCount = countMatches(grid);
  const resultText = scratched
    ? (cfg?.revealText && matchCount >= 3 ? cfg.revealText
      : matchCount >= 3 ? 'Triple Match! Jackpot!'
      : matchCount >= 2 ? 'Double Match!'
      : 'No match...')
    : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          {scratched ? 'Revealed!' : `Scratched: ${scratchPercent}%`}
        </span>
        {score !== null && (
          <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
            {score} pts
          </span>
        )}
      </div>

      {/* Card area */}
      <div style={{
        position: 'relative',
        margin: '1rem 0',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        touchAction: 'none',
      }}>
        {/* Emoji grid underneath */}
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
            background: 'rgba(255,255,255,0.03)',
            padding: '0.5rem',
          }}
        >
          {grid.map((emoji, i) => (
            <div key={i} style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              background: scratched && countMatches(grid) >= 3 && grid.filter(g => g === emoji).length >= 3
                ? `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22)`
                : 'rgba(255,255,255,0.04)',
              borderRadius: '0.5rem',
              userSelect: 'none',
            }}>
              {emoji}
            </div>
          ))}
        </div>

        {/* Scratch canvas overlay */}
        {!scratched && (
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
              borderRadius: '0.75rem',
            }}
          />
        )}
      </div>

      {/* Result text */}
      <AnimatePresence>
        {resultText && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: matchCount >= 3 ? '#fbbf24' : matchCount >= 2 ? theme.primary : 'rgba(255,255,255,0.4)',
              margin: '0 0 0.5rem',
            }}
          >
            {resultText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Manual reveal button if stuck */}
      {!scratched && scratchPercent > 30 && (
        <button
          onClick={reveal}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.6rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Reveal All
        </button>
      )}

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
