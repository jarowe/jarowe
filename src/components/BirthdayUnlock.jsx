import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function BirthdayUnlock({ age, onClose }) {
  useEffect(() => {
    // Slow-fall gold confetti
    const end = Date.now() + 4000;
    const colors = ['#fbbf24', '#f59e0b', '#fde68a', '#fef3c7'];
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return; }
      confetti({
        particleCount: 3,
        spread: 60,
        origin: { x: Math.random(), y: 0 },
        colors,
        gravity: 0.4,
        scalar: 0.9,
        drift: (Math.random() - 0.5) * 0.5,
        ticks: 300,
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="birthday-unlock-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="birthday-unlock-card"
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
      >
        <div className="birthday-unlock-age">{age}</div>
        <div className="birthday-unlock-quote">
          <p>
            "As we are growing up, it's like the middle-aged version of ourselves is a stranger to us. Until we get here and realize it was just us all along."
          </p>
          <cite>&mdash; Jared Rowe</cite>
        </div>
        <button className="birthday-unlock-btn" onClick={onClose}>
          Cheers to {age} more
        </button>
      </motion.div>
    </motion.div>
  );
}
