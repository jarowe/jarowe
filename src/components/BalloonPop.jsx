import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playBalloonPopSound } from '../utils/sounds';
import './BalloonPop.css';

const BALLOON_COLORS = ['#ff6b6b', '#fbbf24', '#f472b6', '#7c3aed', '#38bdf8', '#22c55e', '#ff8c42', '#a78bfa'];
const GAME_DURATION = 60;

export default function BalloonPop({ targetCount = 40, onClose, onComplete }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, complete
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [balloons, setBalloons] = useState([]);
  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const gameTimer = useRef(null);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setBalloons([]);
    nextId.current = 0;
  }, []);

  // Spawn balloons
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawn = () => {
      setBalloons(prev => {
        if (prev.length >= 15) return prev;
        const id = nextId.current++;
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        const size = 40 + Math.random() * 30;
        const left = 5 + Math.random() * 85;
        const speed = 3 + Math.random() * 4;
        const sway = 20 + Math.random() * 40;
        return [...prev, { id, color, size, left, speed, sway }];
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

  // Complete effect
  useEffect(() => {
    if (gameState !== 'complete') return;
    if (score >= targetCount) {
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
  }, [gameState, score, targetCount, onComplete]);

  const popBalloon = useCallback((e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    playBalloonPopSound();
    confetti({
      particleCount: 8,
      spread: 40,
      origin: { x, y },
      colors: ['#fbbf24', '#f472b6', '#7c3aed'],
      startVelocity: 15,
      gravity: 1.5,
      scalar: 0.6
    });

    setBalloons(prev => prev.filter(b => b.id !== id));
    setScore(prev => prev + 1);
  }, []);

  // Remove balloons that have floated off screen
  const handleAnimationEnd = useCallback((id) => {
    setBalloons(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <motion.div
      className="balloon-pop-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={gameState === 'complete' ? onClose : undefined}
    >
      <div className="balloon-pop-container" onClick={e => e.stopPropagation()}>
        {gameState === 'ready' && (
          <motion.div
            className="balloon-pop-start"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>Pop {targetCount} Balloons!</h2>
            <p>You have {GAME_DURATION} seconds. Click balloons before they float away!</p>
            <button className="balloon-start-btn" onClick={startGame}>LET'S GO!</button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="balloon-hud">
              <div className="balloon-score">{score} / {targetCount}</div>
              <div className="balloon-timer">{timeLeft}s</div>
            </div>
            <div className="balloon-field">
              {balloons.map(b => (
                <div
                  key={b.id}
                  className="balloon"
                  style={{
                    '--balloon-color': b.color,
                    '--balloon-size': `${b.size}px`,
                    '--balloon-left': `${b.left}%`,
                    '--balloon-speed': `${b.speed}s`,
                    '--balloon-sway': `${b.sway}px`,
                  }}
                  onClick={e => popBalloon(e, b.id)}
                  onAnimationEnd={() => handleAnimationEnd(b.id)}
                />
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
                <p className="balloon-xp-award">+200 XP</p>
              </>
            ) : (
              <>
                <h2>Time's Up!</h2>
                <p>You popped {score} / {targetCount} balloons</p>
                <p>So close! Try again?</p>
              </>
            )}
            <button className="balloon-start-btn" onClick={onClose}>
              {score >= targetCount ? 'Awesome!' : 'Close'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
