import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const CONVEYOR_SPEED_START = 2.5; // seconds per item scroll
const CONVEYOR_ITEMS = 12; // number of items on belt
const ORDER_SIZE_DEFAULT = 3;

const INGREDIENT_POOLS = {
  food:      { label: 'Kitchen', items: ['🍅', '🧀', '🥬', '🍖', '🍳', '🧅', '🌶️', '🥚'] },
  tech:      { label: 'Gadget Assembly', items: ['⚡', '🔧', '🔩', '💡', '🔌', '📱', '🔋', '⚙️'] },
  space:     { label: 'Rocket Build', items: ['🚀', '🛸', '⭐', '🔭', '🌙', '💎', '🪐', '☄️'] },
  nature:    { label: 'Garden Mix', items: ['🌸', '🍃', '🌻', '🌿', '🦋', '🍄', '🌺', '🐝'] },
  music:     { label: 'Band Setup', items: ['🎵', '🎸', '🥁', '🎤', '🎹', '🎷', '🎺', '🎻'] },
  family:    { label: 'Gift Wrap', items: ['🎁', '🎀', '💝', '🧸', '🌟', '🎂', '🎈', '💐'] },
  scifi:     { label: 'Lab Mix', items: ['🧪', '🔬', '🧬', '⚗️', '🔮', '💊', '🧫', '⚙️'] },
  humor:     { label: 'Party Prep', items: ['🎉', '🎈', '🎊', '🤡', '🎭', '🎪', '🪅', '🎤'] },
  adventure: { label: 'Pack Gear', items: ['🎒', '🧭', '🗺️', '🔦', '🪝', '⛺', '🥾', '🧗'] },
  arts:      { label: 'Art Supply', items: ['🎨', '🖌️', '✏️', '📏', '🖍️', '📐', '✂️', '🧵'] },
  spooky:    { label: 'Potion Brew', items: ['🧪', '🕷️', '🦇', '💀', '🎃', '🕯️', '🐍', '🧙'] },
  winter:    { label: 'Cocoa Bar', items: ['☕', '🍫', '🧣', '❄️', '🎄', '🍪', '🧤', '⛄'] },
  default:   { label: 'Assembly', items: ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚪', '🟤'] },
};

// Variant overrides
const VARIANTS = {
  taco: {
    title: 'Taco Stand',
    ingredients: ['🌮', '🍅', '🧀', '🥬', '🌶️', '🥑', '🧅', '🍖'],
    orderSize: 4,
    bgGradient: 'linear-gradient(135deg, rgba(234,88,12,0.15), rgba(245,158,11,0.1))',
  },
};

function getPool(category) {
  return INGREDIENT_POOLS[category] || INGREDIENT_POOLS.default;
}

function generateOrder(items, size) {
  const order = [];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  for (let i = 0; i < size; i++) {
    order.push(shuffled[i % shuffled.length]);
  }
  return order;
}

function generateBelt(items, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i + Math.random(),
    emoji: items[Math.floor(Math.random() * items.length)],
    grabbed: false,
  }));
}

export default function ConveyorChef({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const pool = cfg ? { label: cfg.title, items: cfg.ingredients } : getPool(holiday?.category);
  const orderSize = cfg?.orderSize || ORDER_SIZE_DEFAULT;
  const items = pool.items;
  const label = cfg?.title || pool.label;

  const [score, setScore] = useState(0);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [order, setOrder] = useState(() => generateOrder(items, orderSize));
  const [collected, setCollected] = useState([]);
  const [belt, setBelt] = useState(() => generateBelt(items, CONVEYOR_ITEMS));
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong' | null
  const [feedback, setFeedback] = useState(null);
  const [conveyorSpeed, setConveyorSpeed] = useState(CONVEYOR_SPEED_START);
  const [streak, setStreak] = useState(0);
  const [perfectOrders, setPerfectOrders] = useState(0);
  const [lastGrabbed, setLastGrabbed] = useState(null); // for grab animation
  const scoreRef = useRef(0);
  const orderStartRef = useRef(Date.now());
  const mistakesThisOrder = useRef(0);
  const { best, submit } = useHighScore('conveyor-chef');

  const { timeLeft, start } = useGameTimer(90, {
    onExpire: () => {
      if (scoreRef.current > 0) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
      }
      submit(scoreRef.current);
      setTimeout(() => onComplete(scoreRef.current), 600);
    },
  });

  useEffect(() => { start(); }, [start]);

  // Replenish belt items periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setBelt(prev => {
        // Add a new item at the end
        const newItem = {
          id: Date.now() + Math.random(),
          emoji: items[Math.floor(Math.random() * items.length)],
          grabbed: false,
        };
        const updated = [...prev, newItem];
        // Keep max CONVEYOR_ITEMS * 1.5 to allow for removals
        if (updated.length > CONVEYOR_ITEMS * 2) {
          return updated.slice(updated.length - CONVEYOR_ITEMS * 2);
        }
        return updated;
      });
    }, conveyorSpeed * 300);
    return () => clearInterval(interval);
  }, [items, conveyorSpeed]);

  const grabItem = useCallback((beltItem) => {
    if (beltItem.grabbed) return;
    const nextNeeded = order[collected.length];
    if (!nextNeeded) return;

    if (beltItem.emoji === nextNeeded) {
      // Correct grab
      const newCollected = [...collected, beltItem.emoji];
      setCollected(newCollected);
      setStreak(s => s + 1);
      setLastGrabbed({ emoji: beltItem.emoji, id: Date.now() });
      playGameSound('correct');
      setFlash('correct');
      setTimeout(() => setFlash(null), 300);

      // Mark item as grabbed on belt
      setBelt(prev => prev.map(b => b.id === beltItem.id ? { ...b, grabbed: true } : b));

      if (newCollected.length === order.length) {
        // Order complete!
        const elapsed = (Date.now() - orderStartRef.current) / 1000;
        const speedBonus = Math.max(5, Math.round(50 - elapsed * 2));
        const noMistakes = mistakesThisOrder.current === 0;
        const perfectBonus = noMistakes ? 20 : 0;
        const streakBonus = Math.min(30, streak * 3);
        const pts = 30 + speedBonus + perfectBonus + streakBonus;
        scoreRef.current += pts;
        setScore(scoreRef.current);

        const bonusParts = [];
        if (speedBonus > 20) bonusParts.push('Speed!');
        if (noMistakes) { bonusParts.push('Perfect!'); setPerfectOrders(p => p + 1); }
        if (streakBonus > 10) bonusParts.push(`${streak}x Streak!`);
        const bonusText = bonusParts.length > 0 ? ` (${bonusParts.join(' ')})` : '';
        setFeedback({ type: 'perfect', text: `Order Done! +${pts}${bonusText}`, id: Date.now() });

        if (noMistakes && ordersCompleted > 0 && (ordersCompleted + 1) % 3 === 0) {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        }
        playGameSound('win');
        setOrdersCompleted(prev => {
          const next = prev + 1;
          // Speed up every 2 orders
          if (next % 2 === 0) {
            setConveyorSpeed(s => Math.max(1.0, s - 0.25));
          }
          return next;
        });

        // New order after brief delay
        setTimeout(() => {
          const newOrder = generateOrder(items, orderSize);
          setOrder(newOrder);
          setCollected([]);
          setFeedback(null);
          setLastGrabbed(null);
          mistakesThisOrder.current = 0;
          orderStartRef.current = Date.now();
        }, 800);
      }
    } else {
      // Wrong grab - penalty
      mistakesThisOrder.current++;
      setStreak(0);
      playGameSound('wrong');
      setFlash('wrong');
      setFeedback({ type: 'wrong', text: '-3s Penalty!', id: Date.now() });
      setTimeout(() => { setFlash(null); setFeedback(null); }, 500);
      // Mark as grabbed (wasted)
      setBelt(prev => prev.map(b => b.id === beltItem.id ? { ...b, grabbed: true } : b));
    }
  }, [order, collected, items, orderSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{
          color: timeLeft <= 15 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 15 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label} | Orders: {ordersCompleted}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Order ticket */}
      <div style={{
        background: flash === 'wrong' ? 'rgba(244,63,94,0.15)' : flash === 'correct' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${flash === 'wrong' ? 'rgba(244,63,94,0.3)' : flash === 'correct' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '0.6rem',
        padding: '0.5rem 0.75rem',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
          Order #{ordersCompleted + 1} - Collect in order:
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
          {order.map((item, i) => {
            const isDone = i < collected.length;
            const isNext = i === collected.length;
            return (
              <div
                key={i}
                style={{
                  width: '2.8rem',
                  height: '2.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  borderRadius: '0.5rem',
                  background: isDone
                    ? `${theme.primary}33`
                    : isNext
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${isDone ? theme.primary + '88' : isNext ? theme.secondary + '66' : 'rgba(255,255,255,0.06)'}`,
                  opacity: isDone ? 0.5 : 1,
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                {item}
                {isDone && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    fontSize: '0.7rem',
                    background: theme.primary,
                    borderRadius: '50%',
                    width: '1rem',
                    height: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                  }}>
                    ✓
                  </span>
                )}
                {isNext && (
                  <span style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.5rem',
                    color: theme.secondary,
                    fontWeight: 600,
                  }}>
                    NEXT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: feedback.type === 'perfect' ? '#22c55e' : '#f43f5e',
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conveyor belt */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.6rem',
        border: '1px solid rgba(255,255,255,0.08)',
        background: cfg?.bgGradient || 'rgba(255,255,255,0.02)',
      }}>
        {/* Belt tracks */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 30px)',
          animation: `conveyorScroll ${conveyorSpeed * 2}s linear infinite`,
          pointerEvents: 'none',
        }} />

        {/* Items container */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          padding: '0.75rem 0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          <style>{`
            @keyframes conveyorScroll {
              from { transform: translateX(0); }
              to { transform: translateX(-30px); }
            }
            @keyframes beltSlide {
              from { transform: translateX(60px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          {belt.filter(b => !b.grabbed).map((item) => {
            const isNeeded = item.emoji === order[collected.length];
            return (
              <motion.button
                key={item.id}
                onClick={() => grabItem(item)}
                whileTap={{ scale: 0.85, rotate: -10 }}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  width: '3.2rem',
                  height: '3.2rem',
                  minWidth: '3.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  background: isNeeded
                    ? `${theme.primary}22`
                    : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isNeeded ? theme.primary + '55' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '0.6rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxShadow: isNeeded ? `0 0 12px ${theme.primary}33` : 'none',
                }}
              >
                {item.emoji}
              </motion.button>
            );
          })}
        </div>

        {/* Belt edge markers */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1.5rem',
          height: '100%',
          background: 'linear-gradient(90deg, rgba(10,10,30,0.8), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '1.5rem',
          height: '100%',
          background: 'linear-gradient(-90deg, rgba(10,10,30,0.8), transparent)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Collected items tray */}
      {collected.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.3rem',
          padding: '0.35rem 0.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <AnimatePresence>
            {collected.map((item, i) => (
              <motion.span
                key={`${i}-${item}`}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                style={{
                  fontSize: '1.3rem',
                  filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))',
                }}
              >
                {item}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats row: speed + streak */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.65rem',
      }}>
        {/* Conveyor speed indicator */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          alignItems: 'center',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>Speed:</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              style={{
                width: '0.45rem',
                height: '0.45rem',
                borderRadius: '50%',
                background: i < Math.round((CONVEYOR_SPEED_START - conveyorSpeed + 1) * 2)
                  ? theme.secondary
                  : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Streak counter */}
        {streak > 1 && (
          <motion.span
            key={streak}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            style={{
              color: streak >= 10 ? '#fbbf24' : streak >= 5 ? theme.secondary : 'rgba(255,255,255,0.5)',
              fontWeight: 600,
            }}
          >
            {streak}x streak
          </motion.span>
        )}

        {/* Perfect orders */}
        {perfectOrders > 0 && (
          <span style={{ color: '#22c55e' }}>
            {perfectOrders} perfect
          </span>
        )}
      </div>

      {/* Tip */}
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
        Tap the right ingredient as it passes. Wrong grabs cost time!
      </p>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
