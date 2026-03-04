import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const ALL_TOPPINGS = [
  { id: 'sauce', emoji: '🍅', name: 'Sauce' },
  { id: 'cheese', emoji: '🧀', name: 'Cheese' },
  { id: 'pepperoni', emoji: '🔴', name: 'Pepperoni' },
  { id: 'mushroom', emoji: '🍄', name: 'Mushrooms' },
  { id: 'pepper', emoji: '🫑', name: 'Peppers' },
  { id: 'olive', emoji: '🫒', name: 'Olives' },
  { id: 'onion', emoji: '🧅', name: 'Onions' },
  { id: 'basil', emoji: '🌿', name: 'Basil' },
];

function generateOrder() {
  // Always starts with sauce + cheese, then 1-3 random toppings
  const base = ['sauce', 'cheese'];
  const extras = ALL_TOPPINGS.filter(t => !base.includes(t.id));
  const count = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...extras].sort(() => Math.random() - 0.5);
  return [...base, ...shuffled.slice(0, count).map(t => t.id)];
}

function getToppingInfo(id) {
  return ALL_TOPPINGS.find(t => t.id === id) || { id, emoji: '❓', name: id };
}

export default function PizzaMaker({ onComplete, holiday, theme }) {
  const [orders] = useState(() => [generateOrder(), generateOrder(), generateOrder()]);
  const [currentOrder, setCurrentOrder] = useState(0);
  const [placed, setPlaced] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [pizzaShake, setPizzaShake] = useState(false);
  const { best, submit } = useHighScore('pizza-maker');
  const scoreRef = useRef(0);

  const { timeLeft, start } = useGameTimer(90, {
    onExpire: () => {
      submit(scoreRef.current);
      onComplete(scoreRef.current);
    },
  });

  useEffect(() => { start(); }, [start]);

  const order = orders[currentOrder] || [];
  const nextNeeded = order[placed.length];

  const addTopping = useCallback((toppingId) => {
    if (currentOrder >= orders.length) return;

    if (toppingId === nextNeeded) {
      // Correct topping!
      const newPlaced = [...placed, toppingId];
      setPlaced(newPlaced);
      playGameSound('correct');

      if (newPlaced.length === order.length) {
        // Pizza complete!
        const bonus = Math.max(10, 50 - (90 - timeLeft));
        const pts = 30 + bonus;
        setScore(s => { const n = s + pts; scoreRef.current = n; return n; });
        setFeedback({ type: 'perfect', text: `Perfect Pizza! +${pts}`, id: Date.now() });
        playGameSound('win');

        if (currentOrder + 1 >= orders.length) {
          // All orders done!
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
          setTimeout(() => {
            submit(scoreRef.current);
            onComplete(scoreRef.current);
          }, 1000);
        } else {
          setTimeout(() => {
            setCurrentOrder(c => c + 1);
            setPlaced([]);
            setFeedback(null);
          }, 1000);
        }
      }
    } else {
      // Wrong topping!
      playGameSound('wrong');
      setPizzaShake(true);
      setFeedback({ type: 'wrong', text: `Need ${getToppingInfo(nextNeeded).name}!`, id: Date.now() });
      setTimeout(() => { setPizzaShake(false); setFeedback(null); }, 600);
    }
  }, [placed, nextNeeded, order, currentOrder, orders, timeLeft, theme, submit, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{
          color: timeLeft <= 15 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 15 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          Order {currentOrder + 1}/{orders.length}
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Order ticket */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.6rem',
        padding: '0.5rem 0.75rem',
      }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>
          Order #{currentOrder + 1}:
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {order.map((t, i) => {
            const info = getToppingInfo(t);
            const isDone = i < placed.length;
            const isNext = i === placed.length;
            return (
              <span
                key={i}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.4rem',
                  fontSize: '0.8rem',
                  background: isDone ? `${theme.primary}33` : isNext ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isDone ? theme.primary + '66' : isNext ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  color: isDone ? theme.primary : isNext ? '#fff' : 'rgba(255,255,255,0.3)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}
              >
                {info.emoji} {info.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pizza */}
      <motion.div
        animate={pizzaShake ? { x: [-4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.3 }}
        style={{
          width: '10rem',
          height: '10rem',
          margin: '0 auto',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #d4a373 0%, #bc8a5f 60%, #a0704c 100%)',
          border: '4px solid #8b6040',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.15rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Sauce layer */}
        {placed.includes('sauce') && (
          <div style={{
            position: 'absolute', inset: '8px', borderRadius: '50%',
            background: 'radial-gradient(circle, #c0392b 0%, #e74c3c 100%)',
            opacity: 0.8,
          }} />
        )}
        {/* Cheese layer */}
        {placed.includes('cheese') && (
          <div style={{
            position: 'absolute', inset: '12px', borderRadius: '50%',
            background: 'radial-gradient(circle, #f9ca24 0%, #f0932b 100%)',
            opacity: 0.7,
          }} />
        )}
        {/* Toppings */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.2rem', padding: '1.5rem' }}>
          <AnimatePresence>
            {placed.filter(t => t !== 'sauce' && t !== 'cheese').map((t, i) => (
              <motion.span
                key={t + i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                style={{ fontSize: '1.3rem' }}
              >
                {getToppingInfo(t).emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

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
              fontSize: '0.9rem',
              fontWeight: 600,
              color: feedback.type === 'perfect' ? '#22c55e' : '#f43f5e',
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topping buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.35rem',
      }}>
        {ALL_TOPPINGS.map(t => (
          <motion.button
            key={t.id}
            onClick={() => addTopping(t.id)}
            whileTap={{ scale: 0.9 }}
            style={{
              padding: '0.5rem 0.25rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.5rem',
              color: '#fff',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{t.emoji}</span>
            {t.name}
          </motion.button>
        ))}
      </div>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
