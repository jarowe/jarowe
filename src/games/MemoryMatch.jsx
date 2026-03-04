import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const CARD_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '☕', '🍣', '🍫'],
  space:     ['🚀', '🌍', '⭐', '🛸', '☄️', '🌙', '🪐', '🔭'],
  tech:      ['💻', '🤖', '⚡', '🔧', '📱', '🎮', '💡', '🔌'],
  nature:    ['🌲', '🌸', '🦋', '🌈', '🍃', '🐝', '🌻', '🦅'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀', '🚀'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪', '😜', '🎈', '🤡'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️', '🐈‍⬛'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️'],
  default:   ['🎰', '⭐', '💎', '🔥', '🍀', '🎯', '✨', '🏆'],
};

function buildDeck(category) {
  const pool = CARD_POOLS[category] || CARD_POOLS.default;
  // Pick 8 for a 4x4 grid (8 pairs = 16 cards)
  const selected = pool.slice(0, 8);
  const pairs = [...selected, ...selected];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch({ onComplete, holiday, theme }) {
  const [cards, setCards] = useState(() => buildDeck(holiday?.category));
  const [selected, setSelected] = useState([]);
  const [matches, setMatches] = useState(0);
  const [flips, setFlips] = useState(0);
  const [locked, setLocked] = useState(false);
  const { best, submit } = useHighScore('memory-match');
  const startTime = useRef(Date.now());

  const flip = useCallback((index) => {
    if (locked) return;
    const card = cards[index];
    if (card.flipped || card.matched) return;

    playGameSound('tick');
    setFlips(f => f + 1);

    const next = cards.map((c, i) =>
      i === index ? { ...c, flipped: true } : c
    );
    setCards(next);

    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setLocked(true);
      const [a, b] = newSelected;
      if (next[a].emoji === next[b].emoji) {
        // Match!
        playGameSound('correct');
        setMatches(m => m + 1);
        setCards(prev => prev.map((c, i) =>
          i === a || i === b ? { ...c, matched: true } : c
        ));
        setSelected([]);
        setLocked(false);
      } else {
        // No match — flip back
        playGameSound('wrong');
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
          setLocked(false);
        }, 700);
      }
    }
  }, [cards, selected, locked]);

  // Win condition
  useEffect(() => {
    if (matches === 8) {
      const elapsed = Math.round((Date.now() - startTime.current) / 1000);
      // Score: fewer flips + faster time = higher score
      const score = Math.max(0, 200 - flips * 2 - elapsed);
      playGameSound('win');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
      submit(score);
      setTimeout(() => onComplete(score), 1200);
    }
  }, [matches, flips, theme, submit, onComplete]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Flips: {flips}
        </span>
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          {matches}/8 pairs
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.4rem',
      }}>
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            onClick={() => flip(i)}
            animate={{
              rotateY: card.flipped || card.matched ? 180 : 0,
              scale: card.matched ? 0.9 : 1,
              opacity: card.matched ? 0.5 : 1,
            }}
            transition={{ duration: 0.3 }}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              background: card.flipped || card.matched
                ? 'rgba(255,255,255,0.06)'
                : `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22)`,
              border: `1px solid ${card.matched ? theme.primary + '44' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '0.6rem',
              cursor: card.flipped || card.matched ? 'default' : 'pointer',
              userSelect: 'none',
              transformStyle: 'preserve-3d',
            }}
          >
            {(card.flipped || card.matched) ? (
              <span style={{ transform: 'rotateY(180deg)' }}>{card.emoji}</span>
            ) : (
              <span style={{ opacity: 0.3, fontSize: '1.2rem' }}>?</span>
            )}
          </motion.button>
        ))}
      </div>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
