import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound, shakeElement } from './shared';

const TARGETS = {
  food:      ['🍕', '🍔', '🌮', '🍩'],
  space:     ['👽', '🛸', '☄️', '🌙'],
  tech:      ['🤖', '💻', '🐛', '💡'],
  nature:    ['🌸', '🐝', '🍄', '🦋'],
  music:     ['🎵', '🥁', '🎸', '🎤'],
  scifi:     ['👽', '🤖', '🔮', '🧬'],
  humor:     ['🤡', '🎈', '😜', '🥳'],
  spooky:    ['🎃', '👻', '🕷️', '🦇'],
  winter:    ['⛄', '🎅', '🎄', '❄️'],
  default:   ['🐹', '🐹', '🐹', '💎'],
};

function getTargets(category) {
  return TARGETS[category] || TARGETS.default;
}

const GRID_SIZE = 9; // 3x3

const VARIANTS = {
  alien: {
    targets: ['👽', '🛸', '🌀', '🪐'],
    instructionText: 'Zap the aliens!',
  },
};

export default function WhackAMole({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const targets = cfg?.targets || getTargets(holiday?.category);
  const [score, setScore] = useState(0);
  const [holes, setHoles] = useState(Array(GRID_SIZE).fill(null));
  const [gameStarted, setGameStarted] = useState(false);
  const { best, submit } = useHighScore('whack-a-mole');
  const containerRef = useRef(null);
  const popTimerRef = useRef(null);
  const scoreRef = useRef(0);

  const { timeLeft, start } = useGameTimer(15, {
    onExpire: () => {
      clearTimeout(popTimerRef.current);
      setHoles(Array(GRID_SIZE).fill(null));
      submit(scoreRef.current);
      onComplete(scoreRef.current);
    },
  });

  const whack = useCallback((index) => {
    if (!holes[index]) return;
    playGameSound('pop');
    setScore(s => {
      const n = s + 10;
      scoreRef.current = n;
      return n;
    });
    setHoles(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, [holes]);

  // Pop moles up at random intervals
  useEffect(() => {
    if (!gameStarted) return;
    function popUp() {
      setHoles(prev => {
        const next = [...prev];
        // Clear old moles
        for (let i = 0; i < next.length; i++) {
          if (Math.random() < 0.3) next[i] = null;
        }
        // Pop new one
        const empty = next.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
        if (empty.length > 0) {
          const idx = empty[Math.floor(Math.random() * empty.length)];
          next[idx] = targets[Math.floor(Math.random() * targets.length)];
        }
        return next;
      });
      popTimerRef.current = setTimeout(popUp, 600 + Math.random() * 400);
    }
    popUp();
    return () => clearTimeout(popTimerRef.current);
  }, [gameStarted, targets]);

  const handleStart = useCallback(() => {
    setGameStarted(true);
    start();
  }, [start]);

  if (!gameStarted) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
          {cfg?.instructionText || `Tap the ${targets[0]} as fast as you can!`} 15 seconds.
        </p>
        <button
          onClick={handleStart}
          style={{
            padding: '0.6rem 2rem',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '2rem',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Start!
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{
          color: timeLeft <= 5 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontSize: '0.85rem',
          fontWeight: timeLeft <= 5 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{ color: theme.primary, fontSize: '0.85rem', fontWeight: 600 }}>
          {score} pts
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.5rem',
      }}>
        {holes.map((emoji, i) => (
          <motion.button
            key={i}
            onClick={() => whack(i)}
            whileTap={emoji ? { scale: 0.85 } : {}}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              background: emoji
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              cursor: emoji ? 'pointer' : 'default',
              transition: 'background 0.15s',
              userSelect: 'none',
            }}
          >
            <AnimatePresence>
              {emoji && (
                <motion.span
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -10, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  {emoji}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
