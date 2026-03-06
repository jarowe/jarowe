import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const TOTAL_ROUNDS = 10;
const EARLY_PENALTY = 500; // ms added for early taps
const MIN_DELAY = 1000;
const MAX_DELAY = 4000;

const TARGET_EMOJIS = {
  food:      '🍕',
  space:     '🚀',
  tech:      '⚡',
  nature:    '🌸',
  music:     '🎵',
  family:    '💖',
  scifi:     '🤖',
  humor:     '🎉',
  adventure: '🗺️',
  arts:      '🎨',
  spooky:    '👻',
  winter:    '❄️',
  default:   '⭐',
};

const RANK_THRESHOLDS = [
  { min: 4000, title: 'Ninja',  emoji: '🥷', color: '#22c55e' },
  { min: 3000, title: 'Cat',    emoji: '🐱', color: '#06b6d4' },
  { min: 2000, title: 'Human',  emoji: '🧑', color: '#f59e0b' },
  { min: -Infinity, title: 'Sloth', emoji: '🦥', color: '#f43f5e' },
];

const VARIANTS = {
  ninja: {
    targetEmoji: '⭐',
    hitEffect: 'slash',
    rankThresholds: [
      { min: 4000, title: 'Shogun',  emoji: '🏯', color: '#22c55e' },
      { min: 3000, title: 'Samurai', emoji: '⚔️', color: '#06b6d4' },
      { min: 2000, title: 'Genin',   emoji: '🥷', color: '#f59e0b' },
      { min: -Infinity, title: 'Peasant', emoji: '🌾', color: '#f43f5e' },
    ],
  },
};

function getRank(score, variant) {
  const cfg = variant ? VARIANTS[variant] : null;
  const thresholds = cfg?.rankThresholds || RANK_THRESHOLDS;
  for (const rank of thresholds) {
    if (score >= rank.min) return rank;
  }
  return thresholds[thresholds.length - 1];
}

export default function ReactionTest({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const category = holiday?.category || 'default';
  const targetEmoji = cfg?.targetEmoji || TARGET_EMOJIS[category] || TARGET_EMOJIS.default;

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('ready');   // ready | waiting | target | result | early | done
  const [totalMs, setTotalMs] = useState(0);
  const [lastMs, setLastMs] = useState(null);
  const [penalties, setPenalties] = useState(0);
  const [times, setTimes] = useState([]);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('reaction-test');
  const timerRef = useRef(null);
  const targetTimeRef = useRef(0);
  const phaseRef = useRef('ready');
  phaseRef.current = phase;

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startRound = useCallback(() => {
    setPhase('waiting');
    setLastMs(null);
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timerRef.current = setTimeout(() => {
      targetTimeRef.current = performance.now();
      setPhase('target');
      playGameSound('pop');
    }, delay);
  }, []);

  const finishGame = useCallback((finalMs) => {
    const score = Math.max(0, 5000 - finalMs);
    setDone(true);
    setPhase('done');
    const rank = getRank(score, variant);
    if (score >= 3000) {
      playGameSound('win');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, rank.color] });
    } else {
      playGameSound('tick');
    }
    submit(score);
    setTimeout(() => onComplete(score), 1800);
  }, [variant, theme, submit, onComplete]);

  const handleTap = useCallback(() => {
    if (phase === 'ready') {
      // Start the first round
      startRound();
      return;
    }

    if (phase === 'waiting') {
      // Early tap!
      clearTimeout(timerRef.current);
      setPenalties(p => p + 1);
      setTotalMs(t => t + EARLY_PENALTY);
      setLastMs(null);
      setPhase('early');
      playGameSound('wrong');

      // Auto-advance after showing penalty
      setTimeout(() => {
        const nextRound = round + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          finishGame(totalMs + EARLY_PENALTY);
        } else {
          setRound(nextRound);
          startRound();
        }
      }, 800);
      return;
    }

    if (phase === 'target') {
      const reactionMs = Math.round(performance.now() - targetTimeRef.current);
      const newTotal = totalMs + reactionMs;
      setTotalMs(newTotal);
      setLastMs(reactionMs);
      setTimes(prev => [...prev, reactionMs]);
      setPhase('result');
      playGameSound(reactionMs < 250 ? 'correct' : 'tick');

      // Slash effect for ninja variant
      if (cfg?.hitEffect === 'slash') {
        playGameSound('pop');
      }

      // Auto-advance
      setTimeout(() => {
        const nextRound = round + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          finishGame(newTotal);
        } else {
          setRound(nextRound);
          startRound();
        }
      }, 700);
      return;
    }

    // If in result/early phase, ignore extra taps
  }, [phase, round, totalMs, startRound, cfg, finishGame]);

  const finalScore = Math.max(0, 5000 - totalMs);
  const rank = getRank(finalScore, variant);

  // Time color coding
  function getTimeColor(ms) {
    if (ms < 200) return '#22c55e';
    if (ms < 300) return '#06b6d4';
    if (ms < 400) return '#f59e0b';
    return '#f43f5e';
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Round {Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
        </span>
        {penalties > 0 && (
          <span style={{ color: '#f43f5e', fontSize: '0.7rem' }}>
            {penalties} early {penalties === 1 ? 'tap' : 'taps'}
          </span>
        )}
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          {finalScore} pts
        </span>
      </div>

      {/* Main tap area */}
      <motion.div
        onClick={handleTap}
        animate={{
          backgroundColor:
            phase === 'target' ? 'rgba(34,197,94,0.15)' :
            phase === 'early' ? 'rgba(244,63,94,0.15)' :
            phase === 'result' ? 'rgba(6,182,212,0.08)' :
            phase === 'done' ? 'rgba(124,58,237,0.1)' :
            'rgba(255,255,255,0.03)',
        }}
        transition={{ duration: 0.15 }}
        style={{
          width: '100%',
          minHeight: '14rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '1rem',
          border: `1px solid ${
            phase === 'target' ? 'rgba(34,197,94,0.3)' :
            phase === 'early' ? 'rgba(244,63,94,0.3)' :
            'rgba(255,255,255,0.06)'
          }`,
          cursor: 'pointer',
          gap: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Ready state */}
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>{targetEmoji}</p>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: '0 0 0.25rem' }}>
                Reaction Test
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Tap to begin
              </p>
            </motion.div>
          )}

          {/* Waiting state */}
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 0.25rem' }}>
                Wait...
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                Do not tap yet
              </p>
              {/* Subtle pulsing dots to keep tension */}
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ fontSize: '1.5rem', marginTop: '0.75rem', color: 'rgba(255,255,255,0.2)' }}
              >
                ...
              </motion.div>
            </motion.div>
          )}

          {/* Target appeared! */}
          {phase === 'target' && (
            <motion.div
              key="target"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              style={{ textAlign: 'center' }}
            >
              <motion.p
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{ fontSize: '3.5rem', margin: '0 0 0.25rem' }}
              >
                {targetEmoji}
              </motion.p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e', margin: 0 }}>
                TAP NOW!
              </p>
            </motion.div>
          )}

          {/* Result for this round */}
          {phase === 'result' && lastMs !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center' }}
            >
              {cfg?.hitEffect === 'slash' && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0.8 }}
                  animate={{ scaleX: 1, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    right: '10%',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #fff, transparent)',
                    transform: 'translateY(-50%) rotate(-5deg)',
                  }}
                />
              )}
              <p style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: getTimeColor(lastMs),
                margin: '0 0 0.25rem',
                fontFamily: 'monospace',
              }}>
                {lastMs}ms
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}>
                {lastMs < 200 ? 'Lightning!' : lastMs < 300 ? 'Quick!' : lastMs < 400 ? 'Decent' : 'Slow...'}
              </p>
            </motion.div>
          )}

          {/* Early tap penalty */}
          {phase === 'early' && (
            <motion.div
              key="early"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: '2rem', margin: '0 0 0.25rem' }}>
                {cfg?.hitEffect === 'slash' ? '💨' : '😬'}
              </p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f43f5e', margin: '0 0 0.25rem' }}>
                Too early!
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                +{EARLY_PENALTY}ms penalty
              </p>
            </motion.div>
          )}

          {/* Final results */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: '2.5rem', margin: '0 0 0.25rem' }}>
                {rank.emoji}
              </p>
              <p style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: rank.color,
                margin: '0 0 0.15rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {rank.title}
              </p>
              <p style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 0.25rem',
                fontFamily: 'monospace',
              }}>
                {finalScore}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Total: {totalMs}ms across {TOTAL_ROUNDS} rounds
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Round history dots */}
      {times.length > 0 && phase !== 'done' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.35rem',
          marginTop: '0.5rem',
          flexWrap: 'wrap',
        }}>
          {times.map((ms, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: getTimeColor(ms),
                opacity: 0.7,
              }}
              title={`${ms}ms`}
            />
          ))}
          {/* Show penalty dots */}
          {Array.from({ length: penalties }).map((_, i) => (
            <motion.div
              key={`p-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: '#f43f5e',
                opacity: 0.4,
                border: '1px solid #f43f5e',
              }}
              title="Early tap penalty"
            />
          ))}
        </div>
      )}

      {/* Average display */}
      {times.length > 0 && phase !== 'done' && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.35)',
          marginTop: '0.25rem',
        }}>
          Avg: {Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms
        </p>
      )}

      {/* Best score */}
      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
