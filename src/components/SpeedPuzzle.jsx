import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Timer, Unlock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound } from '../utils/sounds';
import './SpeedPuzzle.css';

/* Inline prismatic prism icon — matches Glint's triangular form */
function PrismIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="prismGrad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="30%" stopColor="#7c3aed" />
          <stop offset="60%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="prismInner" x1="12" y1="8" x2="36" y2="40">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="50%" stopColor="rgba(167,139,250,0.15)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0.2)" />
        </linearGradient>
      </defs>
      {/* Prism body */}
      <polygon points="24,4 42,40 6,40" fill="url(#prismInner)" stroke="url(#prismGrad)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Internal refraction lines */}
      <line x1="24" y1="4" x2="18" y2="40" stroke="rgba(167,139,250,0.25)" strokeWidth="1" />
      <line x1="24" y1="4" x2="30" y2="40" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
      {/* Light catch highlight */}
      <polygon points="24,8 30,26 18,26" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

const COLORS = [
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Blue', hex: '#38bdf8' },
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Gold', hex: '#fbbf24' },
];

const GAME_DURATION = 15; // seconds
const TOTAL_ROUNDS = 10;

export default function SpeedPuzzle({ onClose }) {
  const [phase, setPhase] = useState('ready'); // ready, playing, results
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targetColor, setTargetColor] = useState(null);
  const [options, setOptions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('jarowe_speed_highscore') || '0', 10);
  });
  const [isNewRecord, setIsNewRecord] = useState(false);
  const timerRef = useRef(null);

  const generateRound = useCallback(() => {
    const target = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Shuffle colors for options, always include the target
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    setTargetColor(target);
    setOptions(shuffled);
  }, []);

  const startGame = useCallback(() => {
    setPhase('playing');
    setScore(0);
    setRound(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(GAME_DURATION);
    setIsNewRecord(false);
    generateRound();
  }, [generateRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase('results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === 'results') {
      if (score > highScore) {
        setIsNewRecord(true);
        setHighScore(score);
        localStorage.setItem('jarowe_speed_highscore', String(score));
        // Grant a bonus cipher
        const current = parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10);
        localStorage.setItem('jarowe_bonus_ciphers', String(current + 1));
        confetti({
          particleCount: 200,
          spread: 140,
          origin: { y: 0.5 },
          colors: ['#7c3aed', '#38bdf8', '#f472b6', '#fbbf24', '#22c55e'],
        });
      }
    }
  }, [phase, score, highScore]);

  const handleChoice = useCallback((color) => {
    if (phase !== 'playing') return;
    playClickSound();

    if (color.name === targetColor.name) {
      const streakBonus = streak >= 3 ? 2 : streak >= 5 ? 3 : 1;
      const timeBonus = timeLeft > 10 ? 2 : 1;
      const points = 10 * streakBonus * timeBonus;
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setFeedback({ type: 'correct', points });
    } else {
      setStreak(0);
      setFeedback({ type: 'wrong' });
    }

    setTimeout(() => setFeedback(null), 400);
    setRound(prev => prev + 1);
    generateRound();
  }, [phase, targetColor, streak, bestStreak, timeLeft, generateRound]);

  return (
    <motion.div
      className="speed-puzzle-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="speed-puzzle-container"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        <button className="speed-close" onClick={onClose}><X size={20} /></button>

        {phase === 'ready' && (
          <div className="speed-ready">
            <div className="speed-icon-ring prism-icon-ring">
              <PrismIcon size={44} />
            </div>
            <h2>PRISM DASH</h2>
            <p className="speed-subtitle">Glint's Challenge</p>
            <p>Match the color as fast as you can! You have {GAME_DURATION} seconds.</p>
            <p className="speed-highscore">High Score: {highScore}</p>
            <button className="speed-start-btn" onClick={startGame}>
              <PrismIcon size={18} /> START
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="speed-playing">
            <div className="speed-hud">
              <div className="speed-hud-item">
                <Timer size={14} />
                <span className={timeLeft <= 5 ? 'time-critical' : ''}>{timeLeft}s</span>
              </div>
              <div className="speed-hud-item score">
                <Trophy size={14} />
                <span>{score}</span>
              </div>
              {streak >= 2 && (
                <motion.div
                  className="speed-streak"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={streak}
                >
                  {streak}x STREAK!
                </motion.div>
              )}
            </div>

            <div className="speed-prompt">
              <span>TAP</span>
              <div
                className="speed-target-swatch"
                style={{ background: targetColor?.hex }}
              />
              <span className="speed-target-name" style={{ color: targetColor?.hex }}>
                {targetColor?.name}
              </span>
            </div>

            <div className="speed-options">
              {options.map((color) => (
                <motion.button
                  key={color.name}
                  className="speed-option-btn"
                  style={{ background: color.hex }}
                  onClick={() => handleChoice(color)}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.08 }}
                />
              ))}
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div
                  className={`speed-feedback ${feedback.type}`}
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  {feedback.type === 'correct' ? `+${feedback.points}` : 'MISS'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {phase === 'results' && (
          <div className="speed-results">
            <Trophy size={48} color="#fbbf24" />
            <h2>GAME OVER</h2>
            <div className="speed-final-score">{score}</div>
            <div className="speed-stats">
              <div>Rounds: {round}</div>
              <div>Best Streak: {bestStreak}x</div>
              {score >= highScore && score > 0 && (
                <div className="speed-new-record">NEW HIGH SCORE!</div>
              )}
              {isNewRecord && (
                <motion.div
                  className="speed-bonus-unlocked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Unlock size={16} />
                  <span>SECRET CIPHER UNLOCKED!</span>
                </motion.div>
              )}
            </div>
            <div className="speed-results-actions">
              <button className="speed-start-btn" onClick={startGame}>
                <PrismIcon size={18} /> PLAY AGAIN
              </button>
              <button className="speed-done-btn" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
