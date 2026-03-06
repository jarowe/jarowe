import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// Prize pools by category
const PRIZE_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '☕', '🍣', '🍫', '🧁', '🍜'],
  space:     ['🚀', '🌍', '⭐', '🛸', '☄️', '🌙', '🪐', '🔭', '🌌', '💫'],
  tech:      ['💻', '🤖', '⚡', '🔧', '📱', '🎮', '💡', '🔌', '🖥️', '⌨️'],
  nature:    ['🌲', '🌸', '🦋', '🌈', '🍃', '🐝', '🌻', '🦅', '🌺', '🍀'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺', '🎻', '🪗'],
  family:    ['❤️', '🤗', '🌟', '💝', '🏠', '🎁', '💑', '👶', '🧸', '🫶'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀', '🚀', '🧪', '⚙️'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪', '😜', '🎈', '🤡', '🫠', '🙃'],
  adventure: ['🗺️', '🏔️', '🌊', '⛵', '🏕️', '🧗', '🏄', '🎒', '🧭', '⛰️'],
  arts:      ['🎨', '🎬', '📚', '🎭', '✏️', '🖌️', '📖', '🎪', '🎞️', '🖼️'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️', '🐈‍⬛', '⚰️', '🧟'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️', '🫕', '🧤'],
  default:   ['💎', '⭐', '🔥', '🍀', '🎯', '✨', '🏆', '👑', '🦄', '🌟'],
};

const RARITY_CONFIG = [
  { name: 'Common',     weight: 60, points: 5,  color: '#94a3b8', glow: 'rgba(148,163,184,0.3)' },
  { name: 'Rare',       weight: 30, points: 15, color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
  { name: 'Ultra-Rare', weight: 10, points: 50, color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
];

// Variant overrides
const VARIANTS = {
  pokemon: {
    capsuleEmoji: '\ud83d\udd34',
    revealText: (name) => `Wild ${name} appeared!`,
    rarityNames: ['Common', 'Uncommon', 'Rare'],
    prizes: ['\ud83d\udc09', '\ud83e\udd8e', '\ud83d\udc32', '\ud83e\udd85', '\ud83e\udda6', '\ud83d\udc22', '\ud83e\udd87', '\ud83d\udc3a', '\ud83e\udd8a', '\ud83e\udd89'],
  },
};

function getPool(category) {
  return PRIZE_POOLS[category] || PRIZE_POOLS.default;
}

function rollRarity() {
  const roll = Math.random() * 100;
  if (roll < RARITY_CONFIG[2].weight) return 2; // ultra-rare
  if (roll < RARITY_CONFIG[2].weight + RARITY_CONFIG[1].weight) return 1; // rare
  return 0; // common
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GachaPull({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const pool = cfg?.prizes || getPool(holiday?.category);
  const capsuleEmoji = cfg?.capsuleEmoji || '🎱';

  const [pullsLeft, setPullsLeft] = useState(3);
  const [totalScore, setTotalScore] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready, dropping, opening, revealed
  const [currentPrize, setCurrentPrize] = useState(null);
  const [currentRarity, setCurrentRarity] = useState(null);
  const [pulls, setPulls] = useState([]);
  const { best, submit } = useHighScore('gacha-pull');

  const pull = useCallback(() => {
    if (phase !== 'ready' || pullsLeft <= 0) return;
    playGameSound('spin');
    setPhase('dropping');

    // Capsule drop animation
    setTimeout(() => {
      setPhase('opening');
      playGameSound('pop');

      setTimeout(() => {
        const rarityIndex = rollRarity();
        const rarity = { ...RARITY_CONFIG[rarityIndex] };
        if (cfg?.rarityNames) rarity.name = cfg.rarityNames[rarityIndex];
        const prize = pickRandom(pool);

        setCurrentRarity(rarity);
        setCurrentPrize(prize);
        setPhase('revealed');
        setPullsLeft(p => p - 1);
        setTotalScore(s => s + rarity.points);
        setPulls(prev => [...prev, { prize, rarity }]);

        if (rarityIndex === 2) {
          playGameSound('win');
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.45 },
            colors: [theme.primary, theme.secondary, '#fbbf24'],
          });
        } else {
          playGameSound('correct');
        }
      }, 500);
    }, 600);
  }, [phase, pullsLeft, pool, theme, cfg]);

  const continueGame = useCallback(() => {
    if (pullsLeft > 0) {
      setPhase('ready');
      setCurrentPrize(null);
      setCurrentRarity(null);
    }
  }, [pullsLeft]);

  // Auto-complete when out of pulls
  useEffect(() => {
    if (pullsLeft === 0 && phase === 'revealed') {
      const timer = setTimeout(() => {
        submit(totalScore);
        onComplete(totalScore);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pullsLeft, phase, totalScore, submit, onComplete]);

  const revealText = currentPrize && currentRarity
    ? (cfg?.revealText
        ? cfg.revealText(currentPrize)
        : `${currentRarity.name}! ${currentRarity.points}pts`)
    : '';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Pulls: {pullsLeft}
        </span>
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          Score: {totalScore}
        </span>
      </div>

      {/* Capsule machine area */}
      <div style={{
        position: 'relative',
        height: '12rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem 0',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '0.25rem' }}>
                {capsuleEmoji}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>
                Pull the lever!
              </p>
            </motion.div>
          )}

          {phase === 'dropping' && (
            <motion.div
              key="dropping"
              initial={{ y: -80, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: [0, -15, 15, -8, 8, 0] }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              style={{ fontSize: '4.5rem', userSelect: 'none' }}
            >
              {capsuleEmoji}
            </motion.div>
          )}

          {phase === 'opening' && (
            <motion.div
              key="opening"
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.3, 1.5, 0.8, 1.2],
                rotate: [0, -20, 20, -10, 0],
              }}
              transition={{ duration: 0.5 }}
              style={{ fontSize: '4.5rem', userSelect: 'none' }}
            >
              {capsuleEmoji}
            </motion.div>
          )}

          {phase === 'revealed' && currentPrize && currentRarity && (
            <motion.div
              key="revealed"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                style={{
                  fontSize: '4rem',
                  filter: `drop-shadow(0 0 16px ${currentRarity.glow})`,
                }}
              >
                {currentPrize}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  color: currentRarity.color,
                  fontWeight: 700,
                  fontSize: '1rem',
                  margin: '0.5rem 0 0',
                  textShadow: `0 0 10px ${currentRarity.glow}`,
                }}
              >
                {revealText}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pull history */}
      {pulls.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          {pulls.map((p, i) => (
            <div key={i} style={{
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${p.rarity.color}44`,
              borderRadius: '0.5rem',
            }}>
              {p.prize}
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      {phase === 'ready' && pullsLeft > 0 && (
        <motion.button
          onClick={pull}
          whileTap={{ scale: 0.92 }}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.7rem',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '0.75rem',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Pull! ({pullsLeft} left)
        </motion.button>
      )}

      {phase === 'revealed' && pullsLeft > 0 && (
        <motion.button
          onClick={continueGame}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.7rem',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '0.75rem',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Next Pull! ({pullsLeft} left)
        </motion.button>
      )}

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
