import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const WORD_POOLS = {
  food:      ['pizza', 'sushi', 'tacos', 'bread', 'pasta', 'salad', 'steak', 'curry', 'donut', 'candy', 'cheese', 'waffle', 'ramen', 'mango', 'berry'],
  tech:      ['react', 'cloud', 'pixel', 'debug', 'cache', 'query', 'async', 'stack', 'bytes', 'proxy', 'linux', 'build', 'parse', 'merge', 'fetch'],
  space:     ['orbit', 'comet', 'lunar', 'stars', 'pluto', 'venus', 'solar', 'mars', 'earth', 'quasar', 'nebula', 'black', 'void', 'warp', 'light'],
  nature:    ['ocean', 'river', 'coral', 'bloom', 'seeds', 'frost', 'creek', 'grove', 'flora', 'cliff', 'trail', 'beach', 'storm', 'brook', 'maple'],
  music:     ['tempo', 'chord', 'lyric', 'beats', 'sonic', 'piano', 'drums', 'vinyl', 'notes', 'voice', 'rhythm', 'tune', 'bass', 'song', 'jazz'],
  family:    ['bonds', 'trust', 'unity', 'grace', 'peace', 'heart', 'happy', 'laugh', 'share', 'home', 'love', 'hugs', 'play', 'care', 'team'],
  humor:     ['jokes', 'laugh', 'silly', 'funny', 'prank', 'comic', 'trick', 'goofy', 'mirth', 'witty', 'irony', 'farce', 'spoof', 'zany', 'gag'],
  scifi:     ['robot', 'clone', 'alien', 'cyber', 'nexus', 'laser', 'phase', 'power', 'mecha', 'droid', 'force', 'hyper', 'warp', 'pulse', 'beam'],
  arts:      ['paint', 'mural', 'craft', 'stage', 'films', 'prose', 'brush', 'print', 'drama', 'dance', 'verse', 'opera', 'color', 'shape', 'form'],
  default:   ['spark', 'prism', 'light', 'dream', 'build', 'magic', 'power', 'quest', 'bloom', 'shine', 'swift', 'flash', 'brave', 'charm', 'blaze'],
};

function pickWords(category, count = 20) {
  const pool = [...(WORD_POOLS[category] || WORD_POOLS.default)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const VARIANTS = {
  music: {
    words: ['rhythm', 'melody', 'chorus', 'treble', 'tempo', 'guitar', 'drums', 'harmony', 'verse', 'bridge', 'encore', 'lyric', 'chord', 'album', 'vinyl', 'remix', 'dance', 'blues', 'jazz', 'soul'],
    headerText: 'Type the beat!',
  },
};

export default function TypingRace({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const [words] = useState(() => {
    if (cfg?.words) {
      const pool = [...cfg.words];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, 20);
    }
    return pickWords(holiday?.category);
  });
  const [activeWords, setActiveWords] = useState([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const wordIndex = useRef(0);
  const inputRef = useRef(null);
  const { best, submit } = useHighScore('typing-race');
  const scoreRef = useRef(0);
  const spawnInterval = useRef(null);

  const { timeLeft, start, running } = useGameTimer(45, {
    onExpire: () => {
      clearInterval(spawnInterval.current);
      submit(scoreRef.current);
      if (scoreRef.current > 100) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary] });
      }
      onComplete(scoreRef.current);
    },
  });

  // Start game + focus
  useEffect(() => {
    start();
    inputRef.current?.focus();
  }, [start]);

  // Spawn words at intervals
  useEffect(() => {
    if (!running) return;
    const spawn = () => {
      if (wordIndex.current >= words.length) wordIndex.current = 0;
      const word = words[wordIndex.current++];
      const id = Date.now() + Math.random();
      setActiveWords(prev => {
        if (prev.length >= 6) {
          // Oldest word missed
          setMisses(m => m + 1);
          setCombo(0);
          return [...prev.slice(1), { id, text: word, progress: 0 }];
        }
        return [...prev, { id, text: word, progress: 0 }];
      });
    };
    spawn();
    const baseInterval = 2200;
    spawnInterval.current = setInterval(spawn, baseInterval);
    return () => clearInterval(spawnInterval.current);
  }, [running, words]);

  const handleInput = useCallback((e) => {
    const val = e.target.value.trim().toLowerCase();
    setInput(val);

    // Check if typed word matches any active word
    const matchIdx = activeWords.findIndex(w => w.text === val);
    if (matchIdx >= 0) {
      const pts = 10 + combo * 2;
      setScore(s => { const n = s + pts; scoreRef.current = n; return n; });
      setCombo(c => c + 1);
      setActiveWords(prev => prev.filter((_, i) => i !== matchIdx));
      setInput('');
      setFeedback({ type: 'correct', text: `+${pts}`, id: Date.now() });
      playGameSound('correct');
      setTimeout(() => setFeedback(null), 600);
    }
  }, [activeWords, combo]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      // Check partial match — if nothing matches, wrong sound
      const val = input.trim().toLowerCase();
      if (val && !activeWords.some(w => w.text.startsWith(val))) {
        playGameSound('wrong');
        setCombo(0);
        setFeedback({ type: 'wrong', text: 'Miss!', id: Date.now() });
        setTimeout(() => setFeedback(null), 600);
      }
      setInput('');
    }
  }, [input, activeWords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{
          color: timeLeft <= 10 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontWeight: timeLeft <= 10 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        {combo > 1 && (
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.75rem' }}>
            {combo}x combo!
          </span>
        )}
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Word display area */}
      <div style={{
        minHeight: '8rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.75rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <AnimatePresence>
          {activeWords.map((w) => {
            const isPartial = input && w.text.startsWith(input.toLowerCase());
            return (
              <motion.span
                key={w.id}
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  padding: '0.35rem 0.75rem',
                  background: isPartial
                    ? `linear-gradient(135deg, ${theme.primary}33, ${theme.secondary}33)`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isPartial ? theme.primary + '66' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                {isPartial ? (
                  <>
                    <span style={{ color: theme.primary }}>{w.text.slice(0, input.length)}</span>
                    <span>{w.text.slice(input.length)}</span>
                  </>
                ) : w.text}
              </motion.span>
            );
          })}
        </AnimatePresence>
        {activeWords.length === 0 && (
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>Words incoming...</span>
        )}
      </div>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Type the words..."
          style={{
            width: '100%',
            padding: '0.7rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.6rem',
            color: '#fff',
            fontSize: '1.1rem',
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <AnimatePresence>
          {feedback && (
            <motion.span
              key={feedback.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: feedback.type === 'correct' ? '#22c55e' : '#f43f5e',
                pointerEvents: 'none',
              }}
            >
              {feedback.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
