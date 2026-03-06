import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// Segment emojis by category
const SEGMENT_EMOJIS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '☕', '🍣', '🍫'],
  space:     ['🚀', '🌍', '⭐', '🛸', '☄️', '🌙', '🪐', '🔭'],
  tech:      ['💻', '🤖', '⚡', '🔧', '📱', '🎮', '💡', '🔌'],
  nature:    ['🌲', '🌸', '🦋', '🌈', '🍃', '🐝', '🌻', '🦅'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷', '🎺'],
  family:    ['❤️', '🤗', '🌟', '💝', '🏠', '🎁', '💑', '🧸'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀', '🚀'],
  humor:     ['😂', '🤣', '🎉', '🥳', '🤪', '😜', '🎈', '🤡'],
  adventure: ['🗺️', '🏔️', '🌊', '⛵', '🏕️', '🧗', '🏄', '🎒'],
  arts:      ['🎨', '🎬', '📚', '🎭', '✏️', '🖌️', '📖', '🎪'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️', '🐈‍⬛'],
  winter:    ['❄️', '⛄', '🎄', '🎅', '🧣', '☃️', '🛷', '🌨️'],
  default:   ['💎', '⭐', '🔥', '🍀', '🎯', '✨', '🏆', '👑'],
};

const BASE_SEGMENTS = [
  { points: 5,   color: '#475569' },
  { points: 10,  color: '#6366f1' },
  { points: 15,  color: '#8b5cf6' },
  { points: 20,  color: '#0ea5e9' },
  { points: 25,  color: '#10b981' },
  { points: 30,  color: '#f59e0b' },
  { points: 50,  color: '#ef4444' },
  { points: 100, color: '#fbbf24' },
];

// Variant overrides
const VARIANTS = {
  christmas: {
    segments: [
      { points: 5,   color: '#2d5a27', emoji: '🧦' },
      { points: 10,  color: '#b91c1c', emoji: '🎁' },
      { points: 15,  color: '#2d5a27', emoji: '🎄' },
      { points: 20,  color: '#b91c1c', emoji: '⭐' },
      { points: 25,  color: '#2d5a27', emoji: '🦌' },
      { points: 30,  color: '#b91c1c', emoji: '🎅' },
      { points: 50,  color: '#ca8a04', emoji: '🛷' },
      { points: 100, color: '#ca8a04', emoji: '🎊' },
    ],
    spinText: 'Ho Ho Spin!',
    colors: ['#b91c1c', '#2d5a27', '#ca8a04'],
  },
};

const NUM_SEGMENTS = 8;
const TOTAL_SPINS = 3;
const DEG_PER_SEGMENT = 360 / NUM_SEGMENTS;

function getEmojis(category) {
  return SEGMENT_EMOJIS[category] || SEGMENT_EMOJIS.default;
}

function buildSegments(category, cfg) {
  if (cfg?.segments) return cfg.segments;
  const emojis = getEmojis(category);
  return BASE_SEGMENTS.map((seg, i) => ({
    ...seg,
    emoji: emojis[i % emojis.length],
  }));
}

export default function LuckyWheel({ onComplete, holiday, theme, variant }) {
  const cfg = variant ? VARIANTS[variant] : null;
  const segments = buildSegments(holiday?.category, cfg);
  const spinText = cfg?.spinText || 'SPIN!';

  const [spinsLeft, setSpinsLeft] = useState(TOTAL_SPINS);
  const [totalScore, setTotalScore] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  const [results, setResults] = useState([]);
  const { best, submit } = useHighScore('lucky-wheel');
  const wheelRef = useRef(null);

  const spin = useCallback(() => {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true);
    setLastWin(null);
    playGameSound('spin');

    // Random target segment
    const targetIdx = Math.floor(Math.random() * NUM_SEGMENTS);
    // Calculate rotation: 4-7 full spins + offset to land on target
    // Segments are laid out clockwise; pointer is at top (0deg)
    // Segment i starts at i * DEG_PER_SEGMENT
    const extraSpins = (4 + Math.floor(Math.random() * 4)) * 360;
    const segmentCenter = targetIdx * DEG_PER_SEGMENT + DEG_PER_SEGMENT / 2;
    // We need the wheel to stop so that segmentCenter is at the top (pointer)
    // Since rotation is clockwise, we need to rotate so that -segmentCenter aligns with pointer
    const targetRotation = extraSpins + (360 - segmentCenter);

    setRotation(prev => prev + targetRotation);

    // Wait for spin to finish
    setTimeout(() => {
      const seg = segments[targetIdx];
      setLastWin(seg);
      setTotalScore(s => s + seg.points);
      setResults(prev => [...prev, seg]);
      setSpinsLeft(s => s - 1);
      setSpinning(false);

      if (seg.points >= 50) {
        playGameSound('win');
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: cfg?.colors || [theme.primary, theme.secondary, '#fbbf24'],
        });
      } else {
        playGameSound('correct');
      }
    }, 3200);
  }, [spinning, spinsLeft, segments, theme, cfg]);

  // Auto-complete when out of spins
  useEffect(() => {
    if (spinsLeft === 0 && !spinning && lastWin) {
      const timer = setTimeout(() => {
        submit(totalScore);
        onComplete(totalScore);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [spinsLeft, spinning, lastWin, totalScore, submit, onComplete]);

  // Build conic gradient for wheel
  const conicStops = segments.map((seg, i) => {
    const start = (i / NUM_SEGMENTS) * 100;
    const end = ((i + 1) / NUM_SEGMENTS) * 100;
    return `${seg.color} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          Spins: {spinsLeft}
        </span>
        <span style={{ color: theme.primary, fontSize: '0.8rem', fontWeight: 600 }}>
          Score: {totalScore}
        </span>
      </div>

      {/* Wheel container */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1rem 0',
        height: '14rem',
      }}>
        {/* Pointer triangle */}
        <div style={{
          position: 'absolute',
          top: '0.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '0.7rem solid transparent',
          borderRight: '0.7rem solid transparent',
          borderTop: `1.2rem solid ${theme.primary}`,
          zIndex: 2,
          filter: `drop-shadow(0 2px 4px ${theme.primary}66)`,
        }} />

        {/* Wheel */}
        <div
          ref={wheelRef}
          style={{
            width: '12rem',
            height: '12rem',
            borderRadius: '50%',
            background: `conic-gradient(${conicStops})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
              : 'none',
            position: 'relative',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Segment labels */}
          {segments.map((seg, i) => {
            const angle = i * DEG_PER_SEGMENT + DEG_PER_SEGMENT / 2;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 0,
                  height: 0,
                  transform: `rotate(${angle}deg) translateY(-3.8rem)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span style={{
                  fontSize: '1.2rem',
                  transform: `rotate(-${angle + rotation}deg)`,
                  display: 'block',
                  lineHeight: 1,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}>
                  {seg.emoji}
                </span>
                <span style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  transform: `rotate(-${angle + rotation}deg)`,
                  marginTop: '0.1rem',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}>
                  {seg.points}
                </span>
              </div>
            );
          })}

          {/* Center dot */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid rgba(255,255,255,0.2)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {lastWin && !spinning && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: lastWin.points >= 50 ? '#fbbf24' : theme.primary,
              margin: '0 0 0.5rem',
            }}
          >
            {lastWin.emoji} +{lastWin.points} pts!
          </motion.p>
        )}
      </AnimatePresence>

      {/* Spin history */}
      {results.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          {results.map((r, i) => (
            <div key={i} style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.4rem',
              fontSize: '0.8rem',
              color: r.points >= 50 ? '#fbbf24' : 'rgba(255,255,255,0.6)',
            }}>
              {r.emoji} {r.points}
            </div>
          ))}
        </div>
      )}

      {/* Spin button */}
      {spinsLeft > 0 && (
        <motion.button
          onClick={spin}
          disabled={spinning}
          whileTap={spinning ? {} : { scale: 0.92 }}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.7rem',
            background: spinning
              ? 'rgba(255,255,255,0.05)'
              : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '0.75rem',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: spinning ? 'wait' : 'pointer',
            opacity: spinning ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {spinning ? 'Spinning...' : spinText}
        </motion.button>
      )}

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
          Best: {best}
        </p>
      )}
    </div>
  );
}
