import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameTimer, useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const WORD_POOLS = {
  food:      ['PIZZA', 'TACO', 'SUSHI', 'BREAD', 'CANDY', 'PASTA', 'SALAD', 'STEAK', 'CURRY', 'DONUT'],
  space:     ['ORBIT', 'SOLAR', 'COMET', 'LUNAR', 'STARS', 'PLUTO', 'VENUS', 'QUASAR', 'NEBULA', 'EARTH'],
  tech:      ['PIXEL', 'CLOUD', 'CODEC', 'DEBUG', 'FLASH', 'STACK', 'BYTES', 'CACHE', 'QUERY', 'ASYNC'],
  nature:    ['OCEAN', 'FLORA', 'RIVER', 'CORAL', 'BLOOM', 'SEEDS', 'FROST', 'CLIFF', 'CREEK', 'GROVE'],
  music:     ['TEMPO', 'CHORD', 'LYRIC', 'BEATS', 'SONIC', 'PIANO', 'DRUMS', 'VINYL', 'BASS', 'NOTES'],
  family:    ['BONDS', 'TRUST', 'UNITY', 'GRACE', 'PEACE', 'HEART', 'HAPPY', 'LAUGH', 'HUGS', 'SHARE'],
  scifi:     ['ROBOT', 'CLONE', 'WARP', 'ALIEN', 'CYBER', 'NEXUS', 'LASER', 'PHASE', 'POWER', 'MECHA'],
  humor:     ['JOKES', 'LAUGH', 'SILLY', 'FUNNY', 'PRANK', 'COMIC', 'TRICK', 'MIRTH', 'GOOFY', 'ZANY'],
  adventure: ['QUEST', 'CLIMB', 'BRAVE', 'TRAIL', 'SCOUT', 'NORTH', 'DRIFT', 'ROAM', 'HIKER', 'PEAKS'],
  arts:      ['PAINT', 'MURAL', 'CRAFT', 'STAGE', 'FILMS', 'PROSE', 'BRUSH', 'PRINT', 'CANVAS', 'DRAMA'],
  spooky:    ['GHOST', 'SCARY', 'WITCH', 'SKULL', 'HAUNT', 'FRIGHT', 'CRYPT', 'BONES', 'RAVEN', 'EERIE'],
  winter:    ['FROST', 'SLEIGH', 'SNOWY', 'CHEER', 'COCOA', 'JOLLY', 'CANDY', 'GIFTS', 'ANGEL', 'BELLS'],
  default:   ['SPARK', 'PRISM', 'LIGHT', 'DREAM', 'BUILD', 'MAGIC', 'POWER', 'QUEST', 'BLOOM', 'SHINE'],
};

function scramble(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  // Ensure it's actually scrambled
  return result === word ? scramble(word) : result;
}

function pickWords(category, count = 5) {
  const pool = [...(WORD_POOLS[category] || WORD_POOLS.default)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const VARIANTS = {
  pi: {
    words: ['EULER', 'PRIME', 'THETA', 'SIGMA', 'PROOF', 'RATIO', 'GRAPH', 'AXIOM', 'LIMIT', 'COSINE'],
    headerText: '3.14159...',
  },
};

export default function WordScramble({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const [words] = useState(() => {
    if (cfg?.words) {
      const pool = [...cfg.words];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, 5);
    }
    return pickWords(holiday?.category);
  });
  const [current, setCurrent] = useState(0);
  const [scrambled, setScrambled] = useState(() => scramble(words[0]));
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('word-scramble');
  const inputRef = useRef(null);
  const scoreRef = useRef(0);

  const { timeLeft, start, running } = useGameTimer(60, {
    onExpire: () => {
      setDone(true);
      submit(scoreRef.current);
      onComplete(scoreRef.current);
    },
  });

  // Auto-start and focus
  useEffect(() => {
    start();
    inputRef.current?.focus();
  }, [start]);

  const checkGuess = useCallback(() => {
    if (!guess.trim()) return;
    const correct = guess.trim().toUpperCase() === words[current];

    if (correct) {
      playGameSound('correct');
      const pts = Math.max(10, 50 - (60 - timeLeft)); // faster = more points
      setScore(s => {
        const n = s + pts;
        scoreRef.current = n;
        return n;
      });
      setFeedback({ type: 'correct', text: `+${pts}` });

      if (current + 1 >= words.length) {
        // All words done!
        setDone(true);
        playGameSound('win');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        submit(scoreRef.current);
        setTimeout(() => onComplete(scoreRef.current), 1000);
      } else {
        setTimeout(() => {
          setCurrent(c => c + 1);
          setScrambled(scramble(words[current + 1]));
          setGuess('');
          setFeedback(null);
          inputRef.current?.focus();
        }, 500);
      }
    } else {
      playGameSound('wrong');
      setFeedback({ type: 'wrong', text: 'Try again!' });
      setTimeout(() => setFeedback(null), 800);
    }
  }, [guess, words, current, timeLeft, theme, submit, onComplete]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') checkGuess();
  }, [checkGuess]);

  if (done) return null; // GameLauncher shows results

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{
          color: timeLeft <= 10 ? '#f43f5e' : 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          fontWeight: timeLeft <= 10 ? 700 : 400,
        }}>
          {timeLeft}s
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          {current + 1}/{words.length}
        </span>
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          {score} pts
        </span>
      </div>

      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>
          Unscramble this word:
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.4rem',
          marginBottom: '1.25rem',
        }}>
          {scrambled.split('').map((letter, i) => (
            <motion.span
              key={`${current}-${i}`}
              initial={{ opacity: 0, y: -10, rotate: -20 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22)`,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={words[current]?.length || 10}
            autoFocus
            placeholder="Type your answer..."
            style={{
              flex: 1,
              maxWidth: '14rem',
              padding: '0.6rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.6rem',
              color: '#fff',
              fontSize: '1rem',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              outline: 'none',
            }}
          />
          <button
            onClick={checkGuess}
            style={{
              padding: '0.6rem 1.25rem',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              border: 'none',
              borderRadius: '0.6rem',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: feedback.type === 'correct' ? '#22c55e' : '#f43f5e',
                marginTop: '0.5rem',
              }}
            >
              {feedback.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
