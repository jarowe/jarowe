import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// ─── Category-themed objects & backgrounds ──────────────────────────
const THEMES = {
  space: {
    objects: ['🚀', '🌙', '⭐', '🪐', '🛸'],
    bg: 'radial-gradient(ellipse at 30% 20%, #1a0533 0%, #0d0d2b 50%, #050510 100%)',
    dots: 'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 80px 60px, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 150px 120px, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 220px 40px, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 40px 200px, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 260px 280px, rgba(255,255,255,0.3) 0%, transparent 100%)',
    label: 'Deep Space',
  },
  tech: {
    objects: ['💻', '🔧', '⚡', '📱', '🎮'],
    bg: 'linear-gradient(160deg, #0a0e1a 0%, #101828 50%, #0c1220 100%)',
    dots: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,255,150,0.03) 20px, rgba(0,255,150,0.03) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,255,150,0.03) 20px, rgba(0,255,150,0.03) 21px)',
    label: 'Circuit Board',
  },
  food: {
    objects: ['🍕', '🍔', '🌮', '🍰', '🍪'],
    bg: 'linear-gradient(170deg, #3d2b1f 0%, #5c3d2e 40%, #4a3228 100%)',
    dots: 'radial-gradient(circle at 50% 50%, rgba(255,200,100,0.05) 0%, transparent 70%)',
    label: 'Kitchen Counter',
  },
  nature: {
    objects: ['🌸', '🦋', '🐝', '🍄', '🌻'],
    bg: 'linear-gradient(160deg, #0a2e0a 0%, #1a4a1a 40%, #0f3a12 100%)',
    dots: 'radial-gradient(circle at 30% 80%, rgba(100,200,50,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 20%, rgba(200,255,100,0.05) 0%, transparent 40%)',
    label: 'Garden',
  },
  winter: {
    objects: ['⛄', '❄️', '🎁', '🧸', '🎄'],
    bg: 'linear-gradient(170deg, #b8d4e8 0%, #d5e8f0 40%, #e8f2f8 100%)',
    dots: 'radial-gradient(2px 2px at 40px 50px, rgba(255,255,255,0.8) 0%, transparent 100%), radial-gradient(2px 2px at 120px 150px, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(2px 2px at 200px 80px, rgba(255,255,255,0.7) 0%, transparent 100%), radial-gradient(2px 2px at 70px 250px, rgba(255,255,255,0.5) 0%, transparent 100%)',
    label: 'Snowfield',
  },
  spooky: {
    objects: ['👻', '🎃', '🕷️', '🦇', '💀'],
    bg: 'linear-gradient(170deg, #1a0a2e 0%, #2d1540 40%, #1f0d2a 100%)',
    dots: 'radial-gradient(circle at 20% 30%, rgba(255,100,0,0.06) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(160,0,255,0.05) 0%, transparent 40%)',
    label: 'Haunted Grounds',
  },
  default: {
    objects: ['⭐', '💎', '🔮', '🎯', '✨'],
    bg: 'radial-gradient(ellipse at 40% 30%, #1a0a30 0%, #0d0d1f 60%, #050510 100%)',
    dots: 'radial-gradient(1px 1px at 60px 80px, rgba(200,180,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 180px 40px, rgba(200,180,255,0.25) 0%, transparent 100%)',
    label: 'Cosmic Void',
  },
};

const SCENE_W = 300;
const SCENE_H = 350;
const OBJ_RADIUS = 25; // click detection radius
const MIN_DIST = 50;   // min distance between objects
const EDGE_PAD = 30;   // keep objects away from edges
const GAME_TIME = 60;
const POINTS_PER_FIND = 100;
const TIME_BONUS_MULT = 3;
const STREAK_BONUS = 25;
const HINT_DELAY = 20000; // ms without finding before hint

function getTheme(category) {
  return THEMES[category] || THEMES.default;
}

// Generate non-overlapping random positions
function generatePositions(count) {
  const positions = [];
  let attempts = 0;
  while (positions.length < count && attempts < 500) {
    const x = EDGE_PAD + Math.random() * (SCENE_W - EDGE_PAD * 2);
    const y = EDGE_PAD + Math.random() * (SCENE_H - EDGE_PAD * 2);
    const tooClose = positions.some(
      p => Math.hypot(p.x - x, p.y - y) < MIN_DIST
    );
    if (!tooClose) positions.push({ x, y });
    attempts++;
  }
  // Fallback: if we couldn't place all, force-grid them
  while (positions.length < count) {
    const idx = positions.length;
    positions.push({
      x: EDGE_PAD + ((idx * 60) % (SCENE_W - EDGE_PAD * 2)),
      y: EDGE_PAD + (Math.floor((idx * 60) / (SCENE_W - EDGE_PAD * 2)) * 60),
    });
  }
  return positions;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function getFeedback(distance) {
  if (distance < 20) return { label: 'Burning!', emoji: '🔥', color: '#ff4500' };
  if (distance < 50) return { label: 'Warm!', emoji: '🟡', color: '#ffc107' };
  if (distance < 100) return { label: 'Cold', emoji: '🔵', color: '#42a5f5' };
  return { label: 'Freezing!', emoji: '❄️', color: '#90caf9' };
}

export default function ScavengerHunt({ onComplete, holiday, theme }) {
  const category = holiday?.category || 'default';
  const sceneTheme = getTheme(category);
  const primary = theme?.primary || '#7c3aed';
  const secondary = theme?.secondary || '#06b6d4';

  // ─── State ─────────────────────────────────────────────────────
  const [objects] = useState(() => {
    const positions = generatePositions(5);
    return sceneTheme.objects.map((emoji, i) => ({
      id: i,
      emoji,
      x: positions[i].x,
      y: positions[i].y,
      found: false,
    }));
  });

  const [foundIds, setFoundIds] = useState(new Set());
  const [clicks, setClicks] = useState([]);        // ripple effects
  const [feedback, setFeedback] = useState(null);   // hot/cold indicator
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [hintId, setHintId] = useState(null);       // flash hint for one object
  const [revealedIds, setRevealedIds] = useState(new Set()); // pop-animated reveals

  const { best, submit } = useHighScore('scavenger-hunt');
  const lastFindTime = useRef(Date.now());
  const hintTimer = useRef(null);
  const feedbackTimer = useRef(null);
  const completedRef = useRef(false);
  const sceneRef = useRef(null);

  // ─── Timer ─────────────────────────────────────────────────────
  const handleExpire = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGameOver(true);
  }, []);

  const { timeLeft, start: startTimer, running } = useGameTimer(GAME_TIME, {
    onExpire: handleExpire,
  });

  // ─── Start game on first render ────────────────────────────────
  useEffect(() => {
    if (!started) {
      setStarted(true);
      startTimer();
      lastFindTime.current = Date.now();
    }
  }, [started, startTimer]);

  // ─── Hint system: flash an unfound object after inactivity ─────
  useEffect(() => {
    if (gameOver || foundIds.size >= 5) return;

    const scheduleHint = () => {
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => {
        const unfound = objects.filter(o => !foundIds.has(o.id));
        if (unfound.length > 0) {
          const target = unfound[Math.floor(Math.random() * unfound.length)];
          setHintId(target.id);
          setTimeout(() => setHintId(null), 1500);
        }
      }, HINT_DELAY);
    };

    scheduleHint();
    return () => clearTimeout(hintTimer.current);
  }, [foundIds, objects, gameOver]);

  // ─── End game when all found ───────────────────────────────────
  useEffect(() => {
    if (foundIds.size >= 5 && !completedRef.current) {
      completedRef.current = true;
      playGameSound('win');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: [primary, secondary, '#ffd700'],
      });
      setTimeout(() => setGameOver(true), 1200);
    }
  }, [foundIds.size, primary, secondary]);

  // ─── Call onComplete when game over ────────────────────────────
  useEffect(() => {
    if (!gameOver) return;
    const timeBonus = foundIds.size >= 5 ? timeLeft * TIME_BONUS_MULT : 0;
    const finalScore = score + timeBonus;
    const isNew = submit(finalScore);
    const timer = setTimeout(() => onComplete(finalScore), 2800);
    return () => clearTimeout(timer);
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click handler ─────────────────────────────────────────────
  const handleSceneClick = useCallback((e) => {
    if (gameOver || !running) return;

    const rect = sceneRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Add ripple
    const clickId = Date.now() + Math.random();
    setClicks(prev => [...prev.slice(-4), { id: clickId, x: cx, y: cy }]);

    // Check distance to all unfound objects
    let closestDist = Infinity;
    let closestObj = null;

    for (const obj of objects) {
      if (foundIds.has(obj.id)) continue;
      const d = dist(cx, cy, obj.x, obj.y);
      if (d < closestDist) {
        closestDist = d;
        closestObj = obj;
      }
    }

    // Found it!
    if (closestObj && closestDist <= OBJ_RADIUS) {
      playGameSound('correct');
      playGameSound('pop');
      const newStreak = streak + 1;
      const pts = POINTS_PER_FIND + (newStreak > 1 ? STREAK_BONUS * (newStreak - 1) : 0);
      setScore(s => s + pts);
      setStreak(newStreak);
      setFoundIds(prev => new Set([...prev, closestObj.id]));
      setRevealedIds(prev => new Set([...prev, closestObj.id]));
      lastFindTime.current = Date.now();

      // Show score feedback
      clearTimeout(feedbackTimer.current);
      setFeedback({
        x: cx, y: cy,
        label: `+${pts}`,
        emoji: closestObj.emoji,
        color: '#4caf50',
        isFind: true,
      });
      feedbackTimer.current = setTimeout(() => setFeedback(null), 1200);
      return;
    }

    // Hot/cold feedback
    playGameSound('tick');
    setStreak(0);
    if (closestObj) {
      const fb = getFeedback(closestDist);
      clearTimeout(feedbackTimer.current);
      setFeedback({ x: cx, y: cy, ...fb, isFind: false });
      feedbackTimer.current = setTimeout(() => setFeedback(null), 1000);
    }
  }, [gameOver, running, objects, foundIds, streak]);

  // ─── Cleanup timers ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(hintTimer.current);
      clearTimeout(feedbackTimer.current);
    };
  }, []);

  // ─── Computed ──────────────────────────────────────────────────
  const allFound = foundIds.size >= 5;
  const timeBonus = allFound ? timeLeft * TIME_BONUS_MULT : 0;
  const finalScore = score + timeBonus;
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : 'rgba(255,255,255,0.7)';
  const isWinterBg = category === 'winter';
  const textColor = isWinterBg ? '#1a2a3a' : '#fff';
  const subtextColor = isWinterBg ? 'rgba(20,40,60,0.5)' : 'rgba(255,255,255,0.4)';

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* ─── Header: Timer + Progress ─── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span style={{
            color: textColor, fontWeight: 700, fontSize: '0.95rem',
          }}>
            {foundIds.size}/5 found
          </span>
        </div>
        <div style={{
          color: timerColor, fontWeight: 700, fontSize: '0.95rem',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.3s',
        }}>
          {timeLeft}s
        </div>
        <div style={{
          color: subtextColor, fontSize: '0.8rem',
        }}>
          Score: <span style={{ color: primary, fontWeight: 700 }}>{score}</span>
        </div>
      </div>

      {/* ─── Scene Area ─── */}
      <div
        ref={sceneRef}
        onClick={handleSceneClick}
        style={{
          position: 'relative',
          width: SCENE_W,
          height: SCENE_H,
          margin: '0 auto',
          borderRadius: 16,
          overflow: 'hidden',
          background: sceneTheme.bg,
          cursor: gameOver ? 'default' : 'crosshair',
          boxShadow: `0 0 30px ${primary}33, inset 0 0 60px rgba(0,0,0,0.3)`,
          border: `1px solid ${primary}44`,
        }}
      >
        {/* Background pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: sceneTheme.dots,
          pointerEvents: 'none',
        }} />

        {/* Scene label */}
        <div style={{
          position: 'absolute', top: 8, left: 12,
          fontSize: '0.65rem', color: subtextColor,
          letterSpacing: '0.5px', textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          {sceneTheme.label}
        </div>

        {/* ─── Hidden Objects ─── */}
        {objects.map(obj => {
          const isFound = foundIds.has(obj.id);
          const isRevealed = revealedIds.has(obj.id);
          const isHinted = hintId === obj.id;

          return (
            <AnimatePresence key={obj.id}>
              <motion.div
                style={{
                  position: 'absolute',
                  left: obj.x,
                  top: obj.y,
                  transform: 'translate(-50%, -50%)',
                  fontSize: isFound ? '1.8rem' : '1.5rem',
                  pointerEvents: 'none',
                  zIndex: isFound ? 10 : 1,
                  filter: isFound ? 'none' : `blur(${isHinted ? 0 : 0.5}px)`,
                }}
                initial={false}
                animate={{
                  opacity: isFound ? 1 : isHinted ? 0.4 : 0.12,
                  scale: isRevealed ? [1, 1.8, 1.2] : isHinted ? 1.15 : 1,
                }}
                transition={
                  isRevealed
                    ? { duration: 0.4, ease: 'easeOut', times: [0, 0.4, 1] }
                    : { duration: 0.3 }
                }
              >
                {obj.emoji}
                {/* Checkmark badge on found */}
                {isFound && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                    style={{
                      position: 'absolute', bottom: -4, right: -8,
                      fontSize: '0.7rem',
                      background: '#4caf50',
                      borderRadius: '50%',
                      width: 16, height: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    ✓
                  </motion.div>
                )}
                {/* Glow ring on found */}
                {isFound && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      position: 'absolute', inset: -8,
                      borderRadius: '50%',
                      border: `2px solid ${primary}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          );
        })}

        {/* ─── Click Ripples ─── */}
        <AnimatePresence>
          {clicks.map(c => (
            <motion.div
              key={c.id}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: c.x - 10,
                top: c.y - 10,
                width: 20, height: 20,
                borderRadius: '50%',
                border: `2px solid ${primary}88`,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          ))}
        </AnimatePresence>

        {/* ─── Hot/Cold Feedback ─── */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={`fb-${feedback.x}-${feedback.y}`}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -30, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ duration: feedback.isFind ? 1.0 : 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: Math.min(Math.max(feedback.x, 40), SCENE_W - 40),
                top: Math.min(Math.max(feedback.y - 10, 20), SCENE_H - 40),
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 30,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: feedback.isFind ? '1.4rem' : '1.1rem' }}>
                {feedback.emoji}
              </span>
              <span style={{
                color: feedback.color,
                fontWeight: 800,
                fontSize: feedback.isFind ? '0.95rem' : '0.8rem',
                textShadow: `0 0 8px ${feedback.color}66`,
                whiteSpace: 'nowrap',
              }}>
                {feedback.label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Game Over Overlay ─── */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 50, borderRadius: 16,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                style={{ fontSize: '2.5rem', marginBottom: 8 }}
              >
                {allFound ? '🏆' : '⏰'}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  color: '#fff', fontWeight: 800, fontSize: '1.2rem',
                  marginBottom: 4,
                }}
              >
                {allFound ? 'All Found!' : 'Time\'s Up!'}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                  color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem',
                  textAlign: 'center', lineHeight: 1.6,
                }}
              >
                Found {foundIds.size}/5 objects
                {allFound && (
                  <span style={{ display: 'block', color: '#4caf50' }}>
                    Time bonus: +{timeBonus}
                  </span>
                )}
                <span style={{ display: 'block', color: primary, fontWeight: 700, fontSize: '1rem', marginTop: 4 }}>
                  Final Score: {finalScore}
                </span>
                {finalScore > 0 && finalScore >= best && (
                  <span style={{ display: 'block', color: '#ffd700', fontSize: '0.75rem', marginTop: 2 }}>
                    New High Score!
                  </span>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Object List (below scene) ─── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8,
        marginTop: 12, flexWrap: 'wrap',
      }}>
        {objects.map(obj => {
          const isFound = foundIds.has(obj.id);
          return (
            <motion.div
              key={obj.id}
              animate={{
                opacity: isFound ? 1 : 0.35,
                scale: isFound ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{
                width: 42, height: 42,
                borderRadius: 10,
                background: isFound
                  ? `linear-gradient(135deg, ${primary}33, ${secondary}33)`
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isFound ? primary + '66' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem',
                position: 'relative',
                filter: isFound ? 'none' : 'grayscale(0.8)',
              }}
            >
              {obj.emoji}
              {isFound && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#4caf50',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', color: '#fff', fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── Streak indicator ─── */}
      <AnimatePresence>
        {streak > 1 && !gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center', marginTop: 6,
              color: '#ffd700', fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            🔥 {streak}x streak! (+{STREAK_BONUS * (streak - 1)} bonus)
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Best score ─── */}
      {best > 0 && (
        <div style={{
          textAlign: 'center', marginTop: 6,
          color: subtextColor, fontSize: '0.7rem',
        }}>
          Best: {best}
        </div>
      )}
    </div>
  );
}
