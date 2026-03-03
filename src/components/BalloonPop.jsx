import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playBalloonPopSound, playComboSound } from '../utils/sounds';
import './BalloonPop.css';

const BALLOON_COLORS = ['#ff6b6b', '#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e', '#ff8c42', '#a78bfa'];
const BASE_DURATION = 60;
const COMBO_WINDOW = 1200;

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

function getDifficulty(round) {
  const r = Math.min(round, 10);
  return {
    spawnInterval: Math.max(300, 600 - r * 30),
    balloonSpeed: Math.max(1.8, 3 - r * 0.12),
    balloonSpeedRange: Math.max(1.5, 4 - r * 0.2),
    maxBalloons: Math.min(20, 15 + r),
    roundMultiplier: 1 + r * 0.25,
    balloonSize: Math.max(40, 55 - r * 1.5),
    balloonSizeRange: Math.max(25, 40 - r),
  };
}

function getScores() {
  try { return JSON.parse(localStorage.getItem('jarowe_balloon_scores') || '[]'); }
  catch { return []; }
}

function saveScore(initials, score, round, bestCombo) {
  const scores = getScores();
  scores.push({ initials: initials.toUpperCase(), score, round, bestCombo, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 20);
  try { localStorage.setItem('jarowe_balloon_scores', JSON.stringify(top)); } catch {}
  return top;
}

export default function BalloonPop({ targetCount = 40, onClose, onComplete, onLaunchCard }) {
  // complete-screen sub-state: 'score' -> 'leaderboard' -> 'next-or-done'
  const [gameState, setGameState] = useState('ready');
  const [completeStep, setCompleteStep] = useState('score');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_DURATION);
  const [balloons, setBalloons] = useState([]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [comboLabel, setComboLabel] = useState('');
  const [bestCombo, setBestCombo] = useState(0);
  const [feverMode, setFeverMode] = useState(false);
  const [round, setRound] = useState(1);
  const [initials, setInitials] = useState('');
  const [topScores, setTopScores] = useState(() => getScores());
  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const gameTimer = useRef(null);
  const lastPopTime = useRef(0);
  const hasCompleted = useRef(false);
  const feverTimer = useRef(null);
  const roundScore = useRef(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const diff = getDifficulty(round);

  const startGame = useCallback(() => {
    setGameState('playing');
    setCompleteStep('score');
    setScore(prev => gameState === 'ready' ? 0 : prev);
    if (gameState === 'ready') roundScore.current = 0;
    setTimeLeft(BASE_DURATION);
    setBalloons([]);
    setCombo(0);
    setMultiplier(1);
    setComboLabel('');
    setBestCombo(prev => gameState === 'ready' ? 0 : prev);
    setFeverMode(false);
    setInitials('');
    nextId.current = 0;
    lastPopTime.current = 0;
    hasCompleted.current = false;
    if (feverTimer.current) clearTimeout(feverTimer.current);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const d = getDifficulty(round);
    const spawn = () => {
      setBalloons(prev => {
        if (prev.length >= d.maxBalloons) return prev;
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

        const size = d.balloonSize + Math.random() * d.balloonSizeRange;
        const left = 3 + Math.random() * 90;
        const speed = d.balloonSpeed + Math.random() * d.balloonSpeedRange;
        const sway = 20 + Math.random() * 40;
        return [...prev, { id, color, size, left, speed, sway, type, emoji, basePoints }];
      });
    };
    spawn();
    spawnTimer.current = setInterval(spawn, d.spawnInterval);
    return () => clearInterval(spawnTimer.current);
  }, [gameState, round]);

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

  useEffect(() => {
    if (gameState === 'playing' && roundScore.current >= targetCount) {
      clearInterval(gameTimer.current);
      clearInterval(spawnTimer.current);
      setGameState('complete');
    }
  }, [score, targetCount, gameState]);

  // Confetti + XP on first win — does NOT auto-close
  useEffect(() => {
    if (gameState !== 'complete') return;
    if (hasCompleted.current) return;

    if (roundScore.current >= targetCount) {
      hasCompleted.current = true;
      const end = Date.now() + 2000;
      const colors = ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'];
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      // Award XP but do NOT auto-transition — let user interact with leaderboard first
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
    const d = getDifficulty(round);
    setCombo(newCombo);
    setMultiplier(tier.multiplier);
    setComboLabel(tier.label);
    setBestCombo(prev => Math.max(prev, newCombo));

    if (newCombo >= 3) playComboSound(newCombo);
    else playBalloonPopSound();

    if (newCombo >= 20 && !feverMode) {
      setFeverMode(true);
      if (feverTimer.current) clearTimeout(feverTimer.current);
      feverTimer.current = setTimeout(() => setFeverMode(false), 5000);
    }

    if (balloon.type === 'bomb') {
      const currentBalloons = [...balloons];
      setBalloons([]);
      const bombPoints = Math.round(currentBalloons.length * tier.multiplier * d.roundMultiplier);
      setScore(prev => prev + bombPoints);
      roundScore.current += currentBalloons.length;
      confetti({ particleCount: 60, spread: 100, origin: { x, y }, colors: ['#ef4444', '#fbbf24', '#ff6b6b'], startVelocity: 25, gravity: 1.2 });
      return;
    }

    if (balloon.type === 'confetti') {
      confetti({ particleCount: 50, spread: 80, origin: { x, y }, colors: ['#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e'], startVelocity: 20, gravity: 0.8, scalar: 1.2 });
    }

    if (balloon.type === 'time') setTimeLeft(prev => prev + 5);

    const points = Math.round(balloon.basePoints * tier.multiplier * d.roundMultiplier);

    confetti({
      particleCount: 8, spread: 40, origin: { x, y },
      colors: balloon.type === 'golden' ? ['#fbbf24', '#f59e0b', '#fde68a'] : ['#fbbf24', '#f472b6', '#7c3aed'],
      startVelocity: 15, gravity: 1.5, scalar: 0.6,
    });

    setBalloons(prev => prev.filter(b => b.id !== balloon.id));
    setScore(prev => prev + points);
    roundScore.current += 1;
  }, [combo, feverMode, balloons, round]);

  const handleAnimationEnd = useCallback((id) => {
    setBalloons(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleNextRound = () => {
    setRound(prev => prev + 1);
    roundScore.current = 0;
    startGame();
  };

  const handleSaveScore = () => {
    if (initials.trim().length < 1) return;
    const scores = saveScore(initials.trim(), score, round, bestCombo);
    setTopScores(scores);
    setCompleteStep('leaderboard');
  };

  const won = roundScore.current >= targetCount;

  return (
    <motion.div
      className={`balloon-pop-overlay${feverMode ? ' fever-active' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
            <p>You have {BASE_DURATION} seconds. Click balloons before they float away!</p>
            <p style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
              Pop fast for combos! Each round gets harder but scores higher!
            </p>
            {topScores.length > 0 && (
              <div className="balloon-leaderboard" style={{ marginBottom: '0.5rem' }}>
                <h3>Leaderboard</h3>
                {topScores.slice(0, 5).map((s, i) => (
                  <div key={i} className="balloon-leaderboard-row">
                    <span className="balloon-leaderboard-label">{i + 1}. {s.initials}</span>
                    <span className="balloon-leaderboard-value">{s.score} <span style={{ color: '#71717a', fontSize: '0.65rem' }}>R{s.round}</span></span>
                  </div>
                ))}
              </div>
            )}
            <button className="balloon-start-btn" onClick={startGame}>LET'S GO!</button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="balloon-hud">
              <div className="balloon-score">{score} <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>({roundScore.current}/{targetCount})</span></div>
              {multiplier > 1 && (
                <div className="balloon-multiplier" key={multiplier}>x{multiplier}</div>
              )}
              <div className="balloon-timer">{timeLeft}s</div>
              {round > 1 && <div className="balloon-round-badge">R{round}</div>}
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
            <AnimatePresence mode="wait">
              {/* Step 1: Score + Initials */}
              {completeStep === 'score' && (
                <motion.div key="score-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {won ? (
                    <>
                      <h2>{round > 1 ? `Round ${round} Clear!` : 'Party Animal!'}</h2>
                      <p>Score: <strong style={{ color: '#fbbf24' }}>{score}</strong> {round > 1 && <span style={{ color: '#a78bfa' }}>(x{diff.roundMultiplier.toFixed(2)} bonus)</span>}</p>
                      {bestCombo >= 3 && <p style={{ color: '#f472b6' }}>Best combo: {bestCombo}x</p>}
                      {round === 1 && <p className="balloon-xp-award">+200 XP</p>}
                    </>
                  ) : (
                    <>
                      <h2>Time's Up!</h2>
                      <p>Score: <strong style={{ color: '#fbbf24' }}>{score}</strong> ({roundScore.current} / {targetCount})</p>
                      {bestCombo >= 3 && <p style={{ color: '#f472b6' }}>Best combo: {bestCombo}x</p>}
                    </>
                  )}
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Enter your initials for the leaderboard:</p>
                  <div className="balloon-initials-form">
                    <input
                      className="balloon-initials-input"
                      type="text"
                      maxLength={4}
                      value={initials}
                      onChange={e => setInitials(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="ABCD"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveScore(); }}
                    />
                    <button className="balloon-initials-save" onClick={handleSaveScore} disabled={initials.trim().length < 1}>
                      Save
                    </button>
                  </div>
                  <button className="balloon-skip-btn" onClick={() => setCompleteStep('leaderboard')}>
                    Skip
                  </button>
                </motion.div>
              )}

              {/* Step 2: Leaderboard + Next Round / Card Launcher / Done */}
              {completeStep === 'leaderboard' && (
                <motion.div key="lb-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '2rem' }}>{won ? 'Nice One!' : 'Good Try!'}</h2>
                  <p style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.5rem' }}>{score} pts</p>
                  {topScores.length > 0 && (
                    <div className="balloon-leaderboard">
                      <h3>Top Scores</h3>
                      {topScores.slice(0, 5).map((s, i) => (
                        <div key={i} className="balloon-leaderboard-row">
                          <span className="balloon-leaderboard-label" style={i === 0 ? { color: '#fbbf24' } : undefined}>
                            {i + 1}. {s.initials || '???'}
                          </span>
                          <span className="balloon-leaderboard-value" style={i === 0 ? { color: '#fbbf24' } : undefined}>
                            {s.score} <span style={{ color: '#71717a', fontSize: '0.65rem' }}>R{s.round}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Birthday Card Launcher */}
                  {onLaunchCard && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
                      className="balloon-card-launcher-cta"
                    >
                      <span className="balloon-card-icon">{'\uD83C\uDF82'}</span>
                      <span className="balloon-card-text">Send Jared a birthday card!</span>
                      <button className="balloon-card-btn" onClick={() => { onClose(); setTimeout(() => onLaunchCard(), 300); }}>
                        Launch Card!
                      </button>
                    </motion.div>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {won && (
                      <button className="balloon-start-btn balloon-next-round-btn" onClick={handleNextRound}>
                        Round {round + 1} (Harder!)
                      </button>
                    )}
                    <button className="balloon-start-btn" onClick={onClose} style={won ? { background: 'rgba(255,255,255,0.15)', boxShadow: 'none' } : undefined}>
                      {won ? 'Continue' : 'Close'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
