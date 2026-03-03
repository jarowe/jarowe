import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playBalloonPopSound, playComboSound } from '../utils/sounds';
import './BalloonPop.css';

const BALLOON_COLORS = ['#ff6b6b', '#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e', '#ff8c42', '#a78bfa'];
const GAME_DURATION = 60;
const COMBO_WINDOW = 1200; // ms

// Combo tiers: [minCombo, multiplier, label]
const COMBO_TIERS = [
  [20, 5, 'FEVER MODE!'],
  [12, 3, 'ON FIRE!'],
  [7, 2, 'COMBO!'],
  [3, 1.5, 'Nice!'],
];

function getComboTier(combo) {
  for (const [min, mult, label] of COMBO_TIERS) {
    if (combo >= min) return { multiplier: mult, label };
  }
  return { multiplier: 1, label: '' };
}

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem('jarowe_balloon_leaderboard') || '{}');
  } catch { return {}; }
}

function updateLeaderboard(score, timeLeft, gameDuration, bestCombo) {
  const lb = getLeaderboard();
  const timeUsed = gameDuration - timeLeft;
  lb.bestScore = Math.max(lb.bestScore || 0, score);
  lb.bestTime = lb.bestTime ? Math.min(lb.bestTime, timeUsed) : timeUsed;
  lb.bestCombo = Math.max(lb.bestCombo || 0, bestCombo);
  lb.totalGames = (lb.totalGames || 0) + 1;
  try { localStorage.setItem('jarowe_balloon_leaderboard', JSON.stringify(lb)); } catch {}
  return lb;
}

export default function BalloonPop({ targetCount = 40, onClose, onComplete }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, complete
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [balloons, setBalloons] = useState([]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [comboLabel, setComboLabel] = useState('');
  const [bestCombo, setBestCombo] = useState(0);
  const [feverMode, setFeverMode] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const gameTimer = useRef(null);
  const lastPopTime = useRef(0);
  const hasCompleted = useRef(false);
  const feverTimer = useRef(null);

  // ESC key to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setBalloons([]);
    setCombo(0);
    setMultiplier(1);
    setComboLabel('');
    setBestCombo(0);
    setFeverMode(false);
    setLeaderboard(null);
    nextId.current = 0;
    lastPopTime.current = 0;
    hasCompleted.current = false;
    if (feverTimer.current) clearTimeout(feverTimer.current);
  }, []);

  // Spawn balloons with special types
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawn = () => {
      setBalloons(prev => {
        if (prev.length >= 15) return prev;
        const id = nextId.current++;
        const roll = Math.random();
        let type = 'normal';
        let color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        let emoji = '';
        let basePoints = 1;

        if (roll < 0.04) { type = 'golden'; emoji = '\u2B50'; basePoints = 5; }
        else if (roll < 0.07) { type = 'bomb'; emoji = '\uD83D\uDCA3'; basePoints = 0; }
        else if (roll < 0.10) { type = 'confetti'; emoji = '\uD83C\uDF89'; basePoints = 1; }
        else if (roll < 0.13) { type = 'time'; emoji = ''; basePoints = 1; }

        const size = 45 + Math.random() * 35;
        const left = 3 + Math.random() * 90;
        const speed = 3 + Math.random() * 4;
        const sway = 20 + Math.random() * 40;
        return [...prev, { id, color, size, left, speed, sway, type, emoji, basePoints }];
      });
    };
    spawn();
    spawnTimer.current = setInterval(spawn, 600);
    return () => clearInterval(spawnTimer.current);
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer.current);
          clearInterval(spawnTimer.current);
          setGameState('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(gameTimer.current);
  }, [gameState]);

  // Check win condition
  useEffect(() => {
    if (gameState === 'playing' && score >= targetCount) {
      clearInterval(gameTimer.current);
      clearInterval(spawnTimer.current);
      setGameState('complete');
    }
  }, [score, targetCount, gameState]);

  // Complete effect - fires once
  useEffect(() => {
    if (gameState !== 'complete') return;
    if (hasCompleted.current) return;

    const lb = updateLeaderboard(score, timeLeft, GAME_DURATION, bestCombo);
    setLeaderboard(lb);

    if (score >= targetCount) {
      hasCompleted.current = true;
      // Big win confetti
      const end = Date.now() + 2000;
      const colors = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'];
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      if (onComplete) onComplete();
    }
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const popBalloon = useCallback((e, balloon) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const now = Date.now();
    let newCombo = 0;
    if (now - lastPopTime.current < COMBO_WINDOW) {
      newCombo = combo + 1;
    }
    lastPopTime.current = now;

    const tier = getComboTier(newCombo);
    setCombo(newCombo);
    setMultiplier(tier.multiplier);
    setComboLabel(tier.label);
    setBestCombo(prev => Math.max(prev, newCombo));

    if (newCombo >= 3) {
      playComboSound(newCombo);
    } else {
      playBalloonPopSound();
    }

    // Fever mode at 20+ combo
    if (newCombo >= 20 && !feverMode) {
      setFeverMode(true);
      if (feverTimer.current) clearTimeout(feverTimer.current);
      feverTimer.current = setTimeout(() => setFeverMode(false), 5000);
    }

    // Handle special types
    if (balloon.type === 'bomb') {
      // Pop ALL on-screen balloons
      const currentBalloons = [...balloons];
      setBalloons([]);
      const bombPoints = currentBalloons.length;
      setScore(prev => prev + Math.round(bombPoints * tier.multiplier));
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { x, y },
        colors: ['#ef4444', '#fbbf24', '#ff6b6b'],
        startVelocity: 25,
        gravity: 1.2,
      });
      return;
    }

    if (balloon.type === 'confetti') {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { x, y },
        colors: ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'],
        startVelocity: 20,
        gravity: 0.8,
        scalar: 1.2,
      });
    }

    if (balloon.type === 'time') {
      setTimeLeft(prev => prev + 5);
    }

    const points = Math.round(balloon.basePoints * tier.multiplier);

    confetti({
      particleCount: 8,
      spread: 40,
      origin: { x, y },
      colors: balloon.type === 'golden' ? ['#fbbf24', '#f59e0b', '#fde68a'] : ['#fbbf24', '#f472b6', '#7c3aed'],
      startVelocity: 15,
      gravity: 1.5,
      scalar: 0.6,
    });

    setBalloons(prev => prev.filter(b => b.id !== balloon.id));
    setScore(prev => prev + points);
  }, [combo, feverMode, balloons]);

  const handleAnimationEnd = useCallback((id) => {
    setBalloons(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <motion.div
      className={`balloon-pop-overlay${feverMode ? ' fever-active' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={gameState === 'complete' ? onClose : undefined}
    >
      <div className="balloon-pop-container" onClick={e => e.stopPropagation()}>
        <button className="balloon-close-btn" onClick={onClose} title="Close (ESC)">&times;</button>
        {gameState === 'ready' && (
          <motion.div
            className="balloon-pop-start"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>Pop {targetCount} Balloons!</h2>
            <p>You have {GAME_DURATION} seconds. Click balloons before they float away!</p>
            <p style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
              Pop fast for combos! Look for special balloons!
            </p>
            <button className="balloon-start-btn" onClick={startGame}>LET'S GO!</button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="balloon-hud">
              <div className="balloon-score">{score} / {targetCount}</div>
              {multiplier > 1 && (
                <div className="balloon-multiplier" key={multiplier}>x{multiplier}</div>
              )}
              <div className="balloon-timer">{timeLeft}s</div>
            </div>
            {comboLabel && (
              <div className="balloon-combo-label" key={`${combo}-${comboLabel}`}>{comboLabel}</div>
            )}
            <div className="balloon-field">
              {balloons.map(b => (
                <div
                  key={b.id}
                  className={`balloon${b.type !== 'normal' ? ` balloon-${b.type}` : ''}`}
                  style={{
                    '--balloon-color': b.color,
                    '--balloon-size': `${b.size}px`,
                    '--balloon-left': `${b.left}%`,
                    '--balloon-speed': `${b.speed}s`,
                    '--balloon-sway': `${b.sway}px`,
                  }}
                  onClick={e => popBalloon(e, b)}
                  onAnimationEnd={() => handleAnimationEnd(b.id)}
                >
                  {b.emoji && <span style={{ pointerEvents: 'none' }}>{b.emoji}</span>}
                  {b.type === 'time' && <span className="balloon-time-label">+5s</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {gameState === 'complete' && (
          <motion.div
            className="balloon-pop-end"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            {score >= targetCount ? (
              <>
                <h2>Party Animal!</h2>
                <p>You popped {score} balloons!</p>
                {bestCombo >= 3 && <p style={{ color: '#f472b6' }}>Best combo: {bestCombo}x</p>}
                <p className="balloon-xp-award">+200 XP</p>
              </>
            ) : (
              <>
                <h2>Time's Up!</h2>
                <p>You popped {score} / {targetCount} balloons</p>
                {bestCombo >= 3 && <p style={{ color: '#f472b6' }}>Best combo: {bestCombo}x</p>}
                <p>So close! Try again?</p>
              </>
            )}
            {leaderboard && (
              <div className="balloon-leaderboard">
                <h3>Personal Best</h3>
                <div className="balloon-leaderboard-row">
                  <span className="balloon-leaderboard-label">Best Score</span>
                  <span className="balloon-leaderboard-value">{leaderboard.bestScore}</span>
                </div>
                <div className="balloon-leaderboard-row">
                  <span className="balloon-leaderboard-label">Fastest Win</span>
                  <span className="balloon-leaderboard-value">{leaderboard.bestTime ? `${leaderboard.bestTime}s` : '--'}</span>
                </div>
                <div className="balloon-leaderboard-row">
                  <span className="balloon-leaderboard-label">Best Combo</span>
                  <span className="balloon-leaderboard-value">{leaderboard.bestCombo || 0}x</span>
                </div>
                <div className="balloon-leaderboard-row">
                  <span className="balloon-leaderboard-label">Games Played</span>
                  <span className="balloon-leaderboard-value">{leaderboard.totalGames}</span>
                </div>
              </div>
            )}
            <button className="balloon-start-btn" onClick={onClose} style={{ marginTop: '1rem' }}>
              {score >= targetCount ? 'Awesome!' : 'Close'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
