import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// Category emojis for coin faces
const COIN_FACES = {
  food:      { heads: '🍕', tails: '🍔' },
  space:     { heads: '🚀', tails: '🌙' },
  tech:      { heads: '💻', tails: '🤖' },
  nature:    { heads: '🌸', tails: '🌲' },
  music:     { heads: '🎵', tails: '🎸' },
  family:    { heads: '❤️', tails: '🏠' },
  scifi:     { heads: '👽', tails: '🛸' },
  humor:     { heads: '🤣', tails: '🤪' },
  adventure: { heads: '🗺️', tails: '🏔️' },
  arts:      { heads: '🎨', tails: '🎭' },
  spooky:    { heads: '👻', tails: '🎃' },
  winter:    { heads: '❄️', tails: '⛄' },
  default:   { heads: '⭐', tails: '🌙' },
};

// Variant overrides
const VARIANTS = {
  newyear: {
    headsEmoji: '🎆',
    tailsEmoji: '🎊',
    flipText: 'Countdown flip!',
    perfectText: 'Happy New Year!',
  },
};

const TOTAL_ROUNDS = 5;
const POINTS_PER_CORRECT = 20;
const STREAK_THRESHOLD = 3;
const STREAK_MULTIPLIER = 1.5;
const PERFECT_BONUS = 50;

function getFaces(category) {
  return COIN_FACES[category] || COIN_FACES.default;
}

export default function CoinToss({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const faces = getFaces(holiday?.category);
  const headsEmoji = cfg?.headsEmoji || faces.heads;
  const tailsEmoji = cfg?.tailsEmoji || faces.tails;
  const flipText = cfg?.flipText || null;

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState('choose'); // choose, flipping, result
  const [guess, setGuess] = useState(null);
  const [result, setResult] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [flipRotation, setFlipRotation] = useState(0);
  const [history, setHistory] = useState([]);
  const { best, submit } = useHighScore('coin-toss');
  const scoreRef = useRef(0);

  const makeGuess = useCallback((choice) => {
    if (phase !== 'choose') return;
    setGuess(choice);
    setPhase('flipping');
    playGameSound('spin');

    // Determine outcome
    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    // Spin: 3-5 full rotations + final position
    const spins = (3 + Math.floor(Math.random() * 3)) * 360;
    const finalAngle = outcome === 'heads' ? 0 : 180;
    setFlipRotation(prev => prev + spins + finalAngle);

    setTimeout(() => {
      setResult(outcome);
      const correct = choice === outcome;
      setIsCorrect(correct);

      if (correct) {
        playGameSound('correct');
        const newStreak = streak + 1;
        setStreak(newStreak);
        let pts = POINTS_PER_CORRECT;
        if (newStreak >= STREAK_THRESHOLD) {
          pts = Math.round(pts * STREAK_MULTIPLIER);
        }
        setScore(s => {
          const n = s + pts;
          scoreRef.current = n;
          return n;
        });
        setHistory(prev => [...prev, { correct: true, outcome }]);
      } else {
        playGameSound('wrong');
        setStreak(0);
        setHistory(prev => [...prev, { correct: false, outcome }]);
      }

      setPhase('result');
      setRound(r => r + 1);
    }, 700);
  }, [phase, streak]);

  const nextRound = useCallback(() => {
    setPhase('choose');
    setGuess(null);
    setResult(null);
    setIsCorrect(null);
  }, []);

  // Game over
  useEffect(() => {
    if (round >= TOTAL_ROUNDS && phase === 'result') {
      const timer = setTimeout(() => {
        let finalScore = scoreRef.current;
        const allCorrect = history.length === TOTAL_ROUNDS && history.every(h => h.correct);
        if (allCorrect) {
          finalScore += PERFECT_BONUS;
          playGameSound('win');
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 },
            colors: [theme.primary, theme.secondary, '#fbbf24'],
          });
        }
        submit(finalScore);
        onComplete(finalScore);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [round, phase, history, theme, submit, onComplete]);

  const allCorrect = history.length === TOTAL_ROUNDS && history.every(h => h.correct);
  const coinEmoji = result === 'tails' ? tailsEmoji : headsEmoji;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Round: {Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
        </span>
        {streak >= STREAK_THRESHOLD && (
          <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
            Streak x{STREAK_MULTIPLIER}!
          </span>
        )}
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          {score} pts
        </span>
      </div>

      {/* Coin display */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '9rem',
        margin: '1rem 0',
      }}>
        <div style={{
          width: '7rem',
          height: '7rem',
          perspective: '600px',
        }}>
          <motion.div
            animate={{ rotateY: flipRotation }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))`,
              border: `2px solid ${phase === 'result' && isCorrect ? theme.primary : 'rgba(255,255,255,0.12)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              boxShadow: phase === 'result' && isCorrect
                ? `0 0 20px ${theme.primary}44`
                : '0 4px 20px rgba(0,0,0,0.3)',
              userSelect: 'none',
              transformStyle: 'preserve-3d',
            }}
          >
            {coinEmoji}
          </motion.div>
        </div>
      </div>

      {/* Flip text */}
      {flipText && phase === 'flipping' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            color: theme.secondary,
            fontSize: '0.85rem',
            fontWeight: 600,
            margin: '0 0 0.5rem',
          }}
        >
          {flipText}
        </motion.p>
      )}

      {/* Result feedback */}
      <AnimatePresence>
        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginBottom: '0.75rem' }}
          >
            <p style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: isCorrect ? '#22c55e' : '#f43f5e',
              margin: '0 0 0.25rem',
            }}>
              {isCorrect ? 'Correct!' : 'Wrong!'}
            </p>
            <p style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
            }}>
              It was {result === 'heads' ? `Heads ${headsEmoji}` : `Tails ${tailsEmoji}`}
            </p>
            {allCorrect && round >= TOTAL_ROUNDS && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  margin: '0.5rem 0 0',
                }}
              >
                {cfg?.perfectText || 'PERFECT! +50 bonus!'}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History dots */}
      {history.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.4rem',
          marginBottom: '0.75rem',
        }}>
          {history.map((h, i) => (
            <div key={i} style={{
              width: '0.6rem',
              height: '0.6rem',
              borderRadius: '50%',
              background: h.correct ? '#22c55e' : '#f43f5e',
              opacity: 0.7,
            }} />
          ))}
          {Array(TOTAL_ROUNDS - history.length).fill(0).map((_, i) => (
            <div key={`empty-${i}`} style={{
              width: '0.6rem',
              height: '0.6rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }} />
          ))}
        </div>
      )}

      {/* Action buttons */}
      {phase === 'choose' && round < TOTAL_ROUNDS && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <motion.button
            onClick={() => makeGuess('heads')}
            whileTap={{ scale: 0.92 }}
            style={{
              flex: 1,
              padding: '0.7rem',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}cc)`,
              border: 'none',
              borderRadius: '0.75rem',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            {headsEmoji} Heads
          </motion.button>
          <motion.button
            onClick={() => makeGuess('tails')}
            whileTap={{ scale: 0.92 }}
            style={{
              flex: 1,
              padding: '0.7rem',
              background: `linear-gradient(135deg, ${theme.secondary}, ${theme.secondary}cc)`,
              border: 'none',
              borderRadius: '0.75rem',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            {tailsEmoji} Tails
          </motion.button>
        </div>
      )}

      {phase === 'result' && round < TOTAL_ROUNDS && (
        <motion.button
          onClick={nextRound}
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
          Next Flip
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
