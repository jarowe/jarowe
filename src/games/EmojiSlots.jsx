import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playGameSound, useHighScore } from './shared';
import confetti from 'canvas-confetti';

// Emoji pools by category
const EMOJI_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '☕', '🍣', '🍫'],
  space:     ['🚀', '🌍', '⭐', '🛸', '☄️', '🌙', '🪐', '🔭'],
  tech:      ['💻', '🤖', '⚡', '🔧', '📱', '🎮', '💡', '🔌'],
  nature:    ['🌲', '🌸', '🦋', '🌈', '🍃', '🐝', '🌻', '🦅'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺'],
  family:    ['❤️', '🤗', '👨‍👩‍👦', '🌟', '💝', '🏠', '🎁', '💑'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀', '🚀'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪', '😜', '🎈', '🤡'],
  adventure: ['🗺️', '🏔️', '🌊', '⛵', '🏕️', '🧗', '🏄', '🎒'],
  arts:      ['🎨', '🎬', '📚', '🎭', '✏️', '🖌️', '📖', '🎪'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️', '🐈‍⬛'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️'],
  default:   ['🎰', '⭐', '💎', '🔥', '🍀', '🎯', '✨', '🏆'],
};

function getPool(category) {
  return EMOJI_POOLS[category] || EMOJI_POOLS.default;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const VARIANTS = {
  vegas: {
    pool: ['🎰', '💰', '💎', '7️⃣', '🍒', '🃏', '👑', '🎲'],
    jackpotText: '🎰 JACKPOT! 🎰',
    pairText: 'Lucky Pair!',
  },
};

export default function EmojiSlots({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const pool = cfg?.pool || getPool(holiday?.category);
  const [reels, setReels] = useState([pool[0], pool[1], pool[2]]);
  const [spinning, setSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [totalScore, setTotalScore] = useState(0);
  const [result, setResult] = useState(null);
  const { best, submit } = useHighScore('emoji-slots');
  const containerRef = useRef(null);

  const spin = useCallback(() => {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true);
    setResult(null);
    playGameSound('spin');

    // Simulate spinning with rapid changes
    let ticks = 0;
    const maxTicks = 12;
    const interval = setInterval(() => {
      setReels([pickRandom(pool), pickRandom(pool), pickRandom(pool)]);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        // Final result
        const final = [pickRandom(pool), pickRandom(pool), pickRandom(pool)];
        setReels(final);
        setSpinning(false);
        setSpinsLeft(s => s - 1);

        // Score
        let pts = 0;
        let msg = '';
        if (final[0] === final[1] && final[1] === final[2]) {
          pts = 100;
          msg = cfg?.jackpotText || 'JACKPOT! 🎉';
          playGameSound('win');
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
          pts = 25;
          msg = cfg?.pairText || 'Pair! Nice!';
          playGameSound('correct');
        } else {
          msg = 'No match';
          playGameSound('wrong');
        }
        setTotalScore(s => s + pts);
        setResult(msg);
      }
    }, 80);
  }, [spinning, spinsLeft, pool, theme]);

  // Auto-complete when out of spins
  useEffect(() => {
    if (spinsLeft === 0 && !spinning && result) {
      const timer = setTimeout(() => {
        submit(totalScore);
        onComplete(totalScore);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spinsLeft, spinning, result, totalScore, submit, onComplete]);

  return (
    <div className="game-emoji-slots" ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Spins: {spinsLeft}
        </span>
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          Score: {totalScore}
        </span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.75rem',
        margin: '1.5rem 0',
      }}>
        {reels.map((emoji, i) => (
          <motion.div
            key={i}
            animate={spinning ? { y: [0, -8, 8, -4, 4, 0], scale: [1, 1.1, 0.95, 1.05, 1] } : {}}
            transition={{ duration: 0.15, repeat: spinning ? Infinity : 0 }}
            style={{
              width: '5rem',
              height: '5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              userSelect: 'none',
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      {result && (
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            textAlign: 'center',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: result.includes('JACKPOT') ? '#fbbf24' : result.includes('Pair') ? theme.primary : 'rgba(255,255,255,0.4)',
            margin: '0 0 0.75rem',
          }}
        >
          {result}
        </motion.p>
      )}

      {spinsLeft > 0 && (
        <button
          onClick={spin}
          disabled={spinning}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.7rem',
            background: spinning
              ? 'rgba(255,255,255,0.05)'
              : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '0.75rem',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: spinning ? 'wait' : 'pointer',
            opacity: spinning ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {spinning ? 'Spinning...' : 'Spin!'}
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
