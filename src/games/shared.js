import { useState, useEffect, useRef, useCallback } from 'react';
import { CATEGORIES } from '../data/holidayCalendar';

// ─── Game Timer Hook ─────────────────────────────────────────────────
// Countdown timer with pause/resume. Calls onExpire when it hits 0.
export function useGameTimer(seconds, { onExpire, autoStart = false } = {}) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, timeLeft]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback((t) => {
    setTimeLeft(t ?? seconds);
    setRunning(false);
  }, [seconds]);

  return { timeLeft, running, start, pause, reset };
}

// ─── High Score Hook ─────────────────────────────────────────────────
export function useHighScore(gameId) {
  const key = `jarowe_highscore_${gameId}`;
  const [best, setBest] = useState(() => {
    return parseInt(localStorage.getItem(key) || '0', 10);
  });

  const submit = useCallback((score) => {
    if (score > best) {
      setBest(score);
      localStorage.setItem(key, score.toString());
      return true; // new high score
    }
    return false;
  }, [best, key]);

  return { best, submit };
}

// ─── XP Award ────────────────────────────────────────────────────────
export function awardGameXP(amount, reason) {
  window.dispatchEvent(new CustomEvent('add-xp', {
    detail: { amount, reason }
  }));
}

// ─── Game Sound Effects ──────────────────────────────────────────────
// Lightweight Web Audio sine tones for game events
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let gameCtx = null;
function getGameCtx() {
  if (!gameCtx) gameCtx = new AudioCtx();
  if (gameCtx.state === 'suspended') gameCtx.resume();
  return gameCtx;
}

export function playGameSound(type) {
  try {
    const c = getGameCtx();
    if (c.state === 'suspended') return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain).connect(c.destination);
    const t = c.currentTime;

    switch (type) {
      case 'correct':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.08);
        osc.frequency.setValueAtTime(784, t + 0.16);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'wrong':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
        break;
      case 'tick':
        osc.type = 'sine';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      case 'win':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.1);
        osc.frequency.setValueAtTime(784, t + 0.2);
        osc.frequency.setValueAtTime(1047, t + 0.3);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        break;
      case 'pop':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      case 'spin':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.15);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
    }
  } catch (e) { /* audio not available */ }
}

// ─── Theme Helper ────────────────────────────────────────────────────
export function getGameTheme(holiday) {
  const cat = holiday?.category ? CATEGORIES[holiday.category] : null;
  return {
    primary: cat?.accentPrimary || holiday?.accentPrimary || '#7c3aed',
    secondary: cat?.accentSecondary || holiday?.accentSecondary || '#06b6d4',
    glow: cat?.accentGlow || holiday?.accentGlow || 'rgba(124,58,237,0.2)',
    emoji: holiday?.emoji || '🎮',
    name: holiday?.name || 'Game Time',
  };
}

// ─── Daily Completion Check ──────────────────────────────────────────
export function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isGameCompletedToday(gameId) {
  return !!localStorage.getItem(`jarowe_game_${gameId}_${getDateKey()}`);
}

export function markGameCompleted(gameId) {
  localStorage.setItem(`jarowe_game_${gameId}_${getDateKey()}`, 'true');
}

// ─── Screen Shake ────────────────────────────────────────────────────
export function shakeElement(el, intensity = 4, duration = 300) {
  if (!el) return;
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    if (elapsed > duration) {
      el.style.transform = '';
      return;
    }
    const decay = 1 - elapsed / duration;
    const x = (Math.random() - 0.5) * intensity * 2 * decay;
    const y = (Math.random() - 0.5) * intensity * 2 * decay;
    el.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
