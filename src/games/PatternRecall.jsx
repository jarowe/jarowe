import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const QUADRANT_POSITIONS = [
  { label: 'TL', row: 0, col: 0 },
  { label: 'TR', row: 0, col: 1 },
  { label: 'BL', row: 1, col: 0 },
  { label: 'BR', row: 1, col: 1 },
];

const TONES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

const COLOR_SETS = {
  food:      ['#e74c3c', '#f39c12', '#2ecc71', '#3498db'],
  space:     ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b'],
  tech:      ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'],
  nature:    ['#22c55e', '#eab308', '#0ea5e9', '#f472b6'],
  music:     ['#ec4899', '#8b5cf6', '#f59e0b', '#22c55e'],
  family:    ['#f472b6', '#a78bfa', '#fbbf24', '#34d399'],
  scifi:     ['#6366f1', '#22d3ee', '#f43f5e', '#14b8a6'],
  humor:     ['#fbbf24', '#f43f5e', '#22c55e', '#8b5cf6'],
  adventure: ['#f97316', '#3b82f6', '#22c55e', '#eab308'],
  arts:      ['#c084fc', '#fb7185', '#67e8f9', '#4ade80'],
  spooky:    ['#f97316', '#a855f7', '#22c55e', '#eab308'],
  winter:    ['#38bdf8', '#e0f2fe', '#7dd3fc', '#a78bfa'],
  default:   ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b'],
};

const VARIANTS = {
  alien: {
    quadrantEmoji: ['\uD83D\uDC7D', '\uD83D\uDEF8', '\uD83C\uDF00', '\u26A1'],
    flashColor: '#22ff88',
    title: 'Decode the Signal',
    colors: ['#0f5132', '#198754', '#20c997', '#0dcaf0'],
  },
};

// Lightweight tone player using Web Audio
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let toneCtx = null;
function getToneCtx() {
  if (!toneCtx) toneCtx = new AudioCtx();
  if (toneCtx.state === 'suspended') toneCtx.resume();
  return toneCtx;
}

function playTone(index, duration = 0.25) {
  try {
    const c = getToneCtx();
    if (c.state === 'suspended') return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain).connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = TONES[index];
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) { /* audio not available */ }
}

export default function PatternRecall({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const colors = cfg?.colors || COLOR_SETS[holiday?.category] || COLOR_SETS.default;
  const title = cfg?.title || null;
  const quadrantEmoji = cfg?.quadrantEmoji || null;

  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | showing | input | gameover
  const [activeQuadrant, setActiveQuadrant] = useState(-1);
  const [playerFlash, setPlayerFlash] = useState(-1);
  const [feedback, setFeedback] = useState(null);
  const { best, submit } = useHighScore('pattern-recall');
  const timeoutRef = useRef(null);
  const sequenceRef = useRef([]);

  // Cleanup timeouts
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Flash duration decreases after round 5
  const getFlashDuration = useCallback(() => {
    if (round <= 3) return 600;
    if (round <= 5) return 500;
    if (round <= 8) return 400;
    if (round <= 12) return 300;
    return 200;
  }, [round]);

  const getPauseDuration = useCallback(() => {
    if (round <= 3) return 300;
    if (round <= 5) return 250;
    if (round <= 8) return 200;
    return 150;
  }, [round]);

  // Show the sequence to the player
  const showSequence = useCallback((seq) => {
    setPhase('showing');
    setPlayerIndex(0);
    let i = 0;
    const flashDur = round <= 3 ? 600 : round <= 5 ? 500 : round <= 8 ? 400 : round <= 12 ? 300 : 200;
    const pauseDur = round <= 3 ? 300 : round <= 5 ? 250 : round <= 8 ? 200 : 150;

    function showNext() {
      if (i >= seq.length) {
        setActiveQuadrant(-1);
        setPhase('input');
        return;
      }
      const idx = seq[i];
      setActiveQuadrant(idx);
      playTone(idx, flashDur / 1000);
      timeoutRef.current = setTimeout(() => {
        setActiveQuadrant(-1);
        i++;
        timeoutRef.current = setTimeout(showNext, pauseDur);
      }, flashDur);
    }

    // Small delay before starting playback
    timeoutRef.current = setTimeout(showNext, 500);
  }, [round]);

  // Start a new round
  const startRound = useCallback((prevSeq) => {
    const nextStep = Math.floor(Math.random() * 4);
    const nextSeq = [...prevSeq, nextStep];
    setSequence(nextSeq);
    sequenceRef.current = nextSeq;
    setRound(r => r + 1);
    showSequence(nextSeq);
  }, [showSequence]);

  // Start the game
  const handleStart = useCallback(() => {
    setRound(0);
    setSequence([]);
    setFeedback(null);
    startRound([]);
  }, [startRound]);

  // Player clicks a quadrant
  const handleQuadrantClick = useCallback((index) => {
    if (phase !== 'input') return;

    playTone(index, 0.2);
    setPlayerFlash(index);
    setTimeout(() => setPlayerFlash(-1), 150);

    const expected = sequenceRef.current[playerIndex];

    if (index === expected) {
      // Correct!
      const nextIndex = playerIndex + 1;

      if (nextIndex >= sequenceRef.current.length) {
        // Round complete!
        playGameSound('correct');
        setFeedback({ text: `Round ${round} complete!`, type: 'correct' });
        setPlayerIndex(0);
        setTimeout(() => {
          setFeedback(null);
          startRound(sequenceRef.current);
        }, 800);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      // Wrong!
      playGameSound('wrong');
      setPhase('gameover');
      const finalScore = (round - 1) * 15;
      setFeedback({
        text: round <= 1
          ? 'Wrong! Better luck next time.'
          : `Wrong! You reached round ${round - 1}.`,
        type: 'wrong',
        score: finalScore,
      });

      if (finalScore >= 60) {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.5 },
          colors: [theme.primary, theme.secondary, '#fbbf24'],
        });
      }

      submit(finalScore);
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, playerIndex, round, theme, startRound, submit, onComplete]);

  const quadSize = 'calc(min(120px, 30vw))';

  return (
    <div>
      {/* Title for variant */}
      {title && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: cfg?.flashColor || theme.secondary,
          marginBottom: '0.25rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
        }}>
          {phase === 'idle' ? 'Ready?' :
           phase === 'showing' ? 'Watch...' :
           phase === 'input' ? 'Your turn!' :
           'Game Over'}
        </span>
        <span style={{
          color: theme.primary,
          fontSize: '0.8rem',
          fontWeight: 600,
        }}>
          Round {round}
        </span>
      </div>

      {/* Sequence progress dots */}
      {phase === 'input' && sequence.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: '0.75rem',
        }}>
          {sequence.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i < playerIndex
                  ? theme.primary
                  : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Quadrant grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        maxWidth: '260px',
        margin: '0 auto',
      }}>
        {QUADRANT_POSITIONS.map((pos, i) => {
          const isActive = activeQuadrant === i;
          const isPlayerFlash = playerFlash === i;
          const isLit = isActive || isPlayerFlash;
          const baseColor = colors[i];
          const flashClr = cfg?.flashColor || '#ffffff';

          return (
            <motion.button
              key={pos.label}
              onClick={() => handleQuadrantClick(i)}
              disabled={phase !== 'input'}
              animate={{
                scale: isLit ? 1.05 : 1,
                opacity: phase === 'gameover' ? 0.4 : 1,
              }}
              whileTap={phase === 'input' ? { scale: 0.95 } : {}}
              transition={{ duration: 0.15 }}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: quadrantEmoji ? '2rem' : '1rem',
                background: isLit
                  ? baseColor
                  : `${baseColor}33`,
                border: `2px solid ${isLit ? baseColor : `${baseColor}55`}`,
                borderRadius: '1rem',
                cursor: phase === 'input' ? 'pointer' : 'default',
                userSelect: 'none',
                boxShadow: isLit
                  ? `0 0 24px ${baseColor}88, inset 0 0 20px ${baseColor}44`
                  : `0 2px 8px ${baseColor}22`,
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {quadrantEmoji ? (
                <span style={{
                  filter: isLit ? 'brightness(1.5)' : 'brightness(0.7)',
                  transition: 'filter 0.15s',
                }}>
                  {quadrantEmoji[i]}
                </span>
              ) : (
                <div style={{
                  width: '60%',
                  height: '60%',
                  borderRadius: '50%',
                  background: isLit
                    ? `radial-gradient(circle, ${flashClr}88, ${baseColor})`
                    : `radial-gradient(circle, ${baseColor}44, transparent)`,
                  transition: 'background 0.15s',
                }}/>
              )}

              {/* Shimmer overlay when lit */}
              {isLit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 30% 30%, white, transparent 60%)`,
                    borderRadius: '1rem',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Start button */}
      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginTop: '1rem' }}
        >
          <button
            onClick={handleStart}
            style={{
              padding: '0.6rem 2rem',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              border: 'none',
              borderRadius: '2rem',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start
          </button>
          <p style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.35)',
            marginTop: '0.5rem',
          }}>
            Watch the pattern, then repeat it
          </p>
        </motion.div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              marginTop: '0.75rem',
            }}
          >
            <p style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: feedback.type === 'correct' ? '#22c55e' : '#f43f5e',
            }}>
              {feedback.text}
            </p>
            {feedback.score !== undefined && (
              <p style={{
                fontSize: '0.75rem',
                color: theme.primary,
                marginTop: '0.25rem',
              }}>
                Score: {feedback.score}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {best > 0 && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '0.5rem',
        }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
