import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function MakeAWish({ onClose }) {
  const [wish, setWish] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wish.trim()) return;

    // Store wish secretly
    try {
      const wishes = JSON.parse(localStorage.getItem('jarowe_wishes') || '[]');
      wishes.push({ text: wish.trim(), date: new Date().toISOString() });
      localStorage.setItem('jarowe_wishes', JSON.stringify(wishes));
    } catch (err) { /* silent */ }

    // Gold shimmer confetti
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#fde68a', '#fef3c7'],
      gravity: 0.4,
      scalar: 0.8,
      drift: 0,
    });

    setSubmitted(true);

    // Auto close after 3 seconds
    setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
  };

  return (
    <motion.div
      className="balloon-pop-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ zIndex: 10001 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(15, 10, 30, 0.9)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '24px',
          padding: '2.5rem',
          maxWidth: '440px',
          width: '90%',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(251, 191, 36, 0.1)',
        }}
      >
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}
            >
              <div style={{ fontSize: '3rem' }}>&#x2728;</div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #fbbf24, #f472b6)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                margin: 0,
              }}>
                Make a Wish
              </h2>
              <input
                type="text"
                value={wish}
                onChange={e => setWish(e.target.value)}
                placeholder="Close your eyes and wish..."
                maxLength={200}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.8rem 1.2rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  color: '#fde68a',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                }}
              />
              <button
                type="submit"
                disabled={!wish.trim()}
                style={{
                  padding: '0.7rem 2rem',
                  background: wish.trim() ? 'linear-gradient(135deg, #fbbf24, #f472b6)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  cursor: wish.trim() ? 'pointer' : 'default',
                  opacity: wish.trim() ? 1 : 0.4,
                  transition: 'all 0.2s',
                }}
              >
                WISH
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -200, scale: 1.5 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              style={{
                fontSize: '1.3rem',
                color: '#fde68a',
                fontStyle: 'italic',
                fontWeight: 600,
                padding: '2rem',
              }}
            >
              {wish}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
