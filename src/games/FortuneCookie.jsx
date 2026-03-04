import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playGameSound } from './shared';

const FORTUNES = {
  food:      [
    "A great meal awaits. But first, snacks.",
    "You will invent a recipe that amazes everyone.",
    "The secret ingredient is always butter.",
    "Tonight's dinner will be legendary.",
  ],
  tech:      [
    "Your next bug fix will lead to a breakthrough.",
    "The algorithm you seek is simpler than you think.",
    "A green build awaits at the end of this refactor.",
    "Your stack overflow answer will get 1000 upvotes.",
  ],
  space:     [
    "A cosmic opportunity orbits your way.",
    "The stars are aligned for your next launch.",
    "You will discover something the universe has been hiding.",
    "Your trajectory is set for greatness.",
  ],
  music:     [
    "A melody will come to you in a dream.",
    "Your playlist holds the answer you seek.",
    "Dance like nobody's watching. Deploy like everybody is.",
    "The rhythm of success is in your heartbeat.",
  ],
  family:    [
    "Someone close thinks you're a superhero.",
    "A hug is the best encryption—only you hold the key.",
    "Your family is your greatest feature release.",
    "The love you give returns as exponential growth.",
  ],
  humor:     [
    "Today's punchline will be better than yesterday's.",
    "Laughter is just happiness becoming audible.",
    "You will tell a joke so good it crashes the internet.",
    "The funniest people debug the fastest. Coincidence?",
  ],
  nature:    [
    "A walk outside will solve what screens cannot.",
    "Growth happens in seasons. This is yours.",
    "The tree outside your window is rooting for you.",
    "Nature called. It said you're doing great.",
  ],
  scifi:     [
    "In a parallel universe, you already shipped it.",
    "The future you're building is better than fiction.",
    "Your code will outlive the robots. Probably.",
    "A wormhole of creativity is opening near you.",
  ],
  adventure: [
    "Your next adventure is one decision away.",
    "The map is not the territory—explore anyway.",
    "Pack light. Think big. Ship often.",
    "The best stories start with 'let's try this.'",
  ],
  arts:      [
    "Your creative vision will inspire others.",
    "The masterpiece is already inside you. Just ship it.",
    "Art is debugging the human experience.",
    "Today, colors are on your side.",
  ],
  default:   [
    "Something amazing is about to happen.",
    "Your best idea is the next one.",
    "The code compiles. The dream deploys.",
    "Today is your day. Claim it.",
    "Behind every great website is someone exactly like you.",
    "Fortune favors the bold. And the well-caffeinated.",
  ],
};

function getFortune(category) {
  const pool = FORTUNES[category] || FORTUNES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function FortuneCookie({ onComplete, holiday, theme }) {
  const [phase, setPhase] = useState('whole'); // whole → cracking → revealed
  const [fortune, setFortune] = useState('');

  const crack = useCallback(() => {
    if (phase !== 'whole') return;
    setPhase('cracking');
    playGameSound('pop');

    setTimeout(() => {
      setFortune(getFortune(holiday?.category));
      setPhase('revealed');
      playGameSound('win');

      setTimeout(() => {
        onComplete(10);
      }, 3000);
    }, 600);
  }, [phase, holiday, onComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
      <AnimatePresence mode="wait">
        {phase === 'whole' && (
          <motion.div
            key="whole"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0, rotate: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={crack}
            style={{
              fontSize: '6rem',
              cursor: 'pointer',
              userSelect: 'none',
              filter: `drop-shadow(0 0 20px ${theme.glow})`,
              transition: 'transform 0.15s',
            }}
            whileHover={{ scale: 1.1, rotate: [-2, 2, -2] }}
            whileTap={{ scale: 0.9 }}
          >
            🥠
          </motion.div>
        )}

        {phase === 'cracking' && (
          <motion.div
            key="cracking"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: [1.3, 0.9, 1.1, 1], opacity: 1, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            style={{ fontSize: '6rem', userSelect: 'none' }}
          >
            💫
          </motion.div>
        )}

        {phase === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{ fontSize: '4rem' }}
            >
              🥠
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10, scaleY: 0 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                padding: '1.25rem 1.5rem',
                maxWidth: '20rem',
                textAlign: 'center',
              }}
            >
              <p style={{
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                lineHeight: 1.5,
                margin: 0,
              }}>
                "{fortune}"
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'whole' && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Tap the cookie to crack it open!
        </p>
      )}
    </div>
  );
}
