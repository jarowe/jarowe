import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function MakeAWish({ onClose }) {
  const [wish, setWish] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ESC to close
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wish.trim()) return;

    try {
      const wishes = JSON.parse(localStorage.getItem('jarowe_wishes') || '[]');
      wishes.push({ text: wish.trim(), date: new Date().toISOString() });
      localStorage.setItem('jarowe_wishes', JSON.stringify(wishes));
    } catch (err) { /* silent */ }

    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.15, y: 0.85 },
      colors: ['#fbbf24', '#f59e0b', '#fde68a', '#fef3c7'],
      gravity: 0.4,
      scalar: 0.8,
    });

    setSubmitted(true);
    setTimeout(() => { if (onClose) onClose(); }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '2rem',
        zIndex: 10001,
        background: 'rgba(15, 10, 30, 0.92)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '20px',
        padding: '1.8rem',
        maxWidth: '360px',
        width: 'calc(100% - 4rem)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(251, 191, 36, 0.1)',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '0.6rem', right: '0.8rem',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
        }}
      >&times;</button>
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
          >
            <div style={{ fontSize: '2rem' }}>&#x2728;</div>
            <h2 style={{
              fontSize: '1.2rem', fontWeight: 900,
              background: 'linear-gradient(135deg, #fbbf24, #f472b6)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              color: 'transparent', margin: 0,
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
                width: '100%', padding: '0.7rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px', color: '#fde68a',
                fontSize: '0.9rem', outline: 'none',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            />
            <button
              type="submit"
              disabled={!wish.trim()}
              style={{
                padding: '0.6rem 1.5rem',
                background: wish.trim() ? 'linear-gradient(135deg, #fbbf24, #f472b6)' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '50px',
                color: 'white', fontSize: '0.85rem',
                fontWeight: 800, letterSpacing: '2px',
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
            animate={{ opacity: 0, y: -100, scale: 1.3 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{
              fontSize: '1.1rem', color: '#fde68a',
              fontStyle: 'italic', fontWeight: 600,
              padding: '1rem', textAlign: 'center',
            }}
          >
            {wish}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
