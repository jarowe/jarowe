import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

// ─── Symbol pools by category ────────────────────────────────────────
const SYMBOL_POOLS = {
  food:      ['🍕', '🍔', '🌮', '🍩', '🍰', '🧁', '🍪'],
  space:     ['🚀', '🛸', '⭐', '🌙', '🪐', '☄️', '💫'],
  tech:      ['💻', '🎮', '📱', '🤖', '⚡', '🔧', '💡'],
  nature:    ['🌸', '🦋', '🍀', '🌻', '🐝', '🌺', '🍃'],
  humor:     ['😂', '🤣', '😜', '🤡', '🎪', '🃏', '🎭'],
  winter:    ['⛄', '❄️', '🎄', '🎁', '🧸', '🔔', '⭐'],
  music:     ['🎵', '🎸', '🎹', '🥁', '🎤', '🎶', '🎷'],
  spooky:    ['👻', '🎃', '🕷️', '🦇', '💀', '🧙', '🕯️'],
  scifi:     ['🤖', '👽', '🛸', '⚡', '🔮', '🧬', '🌀'],
  adventure: ['🗺️', '🏔️', '🌊', '⛵', '🏕️', '🧗', '🏄'],
  arts:      ['🎨', '🎬', '📚', '🎭', '✏️', '🖌️', '🎪'],
  family:    ['❤️', '🤗', '🌟', '💝', '🏠', '🎁', '💑'],
  default:   ['⭐', '💎', '🔥', '🍀', '✨', '🎯', '🌈'],
};

const REEL_COUNT = 5;
const SYMBOLS_PER_STRIP = 24;
const SYMBOL_HEIGHT = 64;           // px per symbol cell
const VISIBLE_ROWS = 3;
const TOTAL_SPINS = 10;
const STARTING_COINS = 100;
const BET_AMOUNT = 10;

function getPool(category) {
  return SYMBOL_POOLS[category] || SYMBOL_POOLS.default;
}

// Build a shuffled strip of symbols for a reel
function buildStrip(pool) {
  const strip = [];
  for (let i = 0; i < SYMBOLS_PER_STRIP; i++) {
    strip.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return strip;
}

// Count the most frequently occurring symbol across the middle row
function evaluatePayline(middleSymbols) {
  const counts = {};
  middleSymbols.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  return max;
}

// ─── Component ───────────────────────────────────────────────────────
export default function SlotMachine({ onComplete, holiday, theme }) {
  const pool = getPool(holiday?.category);
  const { best, submit } = useHighScore('slot-machine');

  // Build initial reel strips
  const [strips, setStrips] = useState(() =>
    Array.from({ length: REEL_COUNT }, () => buildStrip(pool))
  );
  // Target index for each reel (which symbol lands on the middle row)
  const [targets, setTargets] = useState(() =>
    Array.from({ length: REEL_COUNT }, () => 3)
  );

  const [spinning, setSpinning] = useState(false);
  const [reelsStopped, setReelsStopped] = useState(
    Array.from({ length: REEL_COUNT }, () => true)
  );
  const [coins, setCoins] = useState(STARTING_COINS);
  const [spinsLeft, setSpinsLeft] = useState(TOTAL_SPINS);
  const [winMsg, setWinMsg] = useState(null);
  const [winAmount, setWinAmount] = useState(0);
  const [jackpot, setJackpot] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);

  const coinsRef = useRef(STARTING_COINS);
  const containerRef = useRef(null);

  // Middle row symbols after spin
  const middleSymbols = useMemo(() => {
    return strips.map((strip, i) => strip[targets[i]]);
  }, [strips, targets]);

  // ─── Spin logic ──────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (spinning || gameOver || spinsLeft <= 0 || coins < BET_AMOUNT) return;

    setSpinning(true);
    setWinMsg(null);
    setWinAmount(0);
    setJackpot(false);
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 300);

    playGameSound('spin');

    // Deduct bet
    const newCoins = coins - BET_AMOUNT;
    setCoins(newCoins);
    coinsRef.current = newCoins;
    setSpinsLeft(s => s - 1);

    // Generate new strips and target positions
    const newStrips = Array.from({ length: REEL_COUNT }, () => buildStrip(pool));
    const newTargets = Array.from({ length: REEL_COUNT }, () =>
      Math.floor(Math.random() * (SYMBOLS_PER_STRIP - VISIBLE_ROWS - 2)) + 2
    );
    setStrips(newStrips);
    setTargets(newTargets);

    // Mark all reels as spinning
    setReelsStopped(Array.from({ length: REEL_COUNT }, () => false));

    // Stop reels sequentially
    REEL_COUNT && Array.from({ length: REEL_COUNT }).forEach((_, i) => {
      setTimeout(() => {
        playGameSound('tick');
        setReelsStopped(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        // After last reel stops, evaluate
        if (i === REEL_COUNT - 1) {
          setTimeout(() => {
            const middle = newStrips.map((strip, ri) => strip[newTargets[ri]]);
            const matchCount = evaluatePayline(middle);
            let payout = 0;
            let msg = '';
            let isJackpot = false;

            if (matchCount === 5) {
              payout = BET_AMOUNT * 50;
              msg = 'JACKPOT!!!';
              isJackpot = true;
            } else if (matchCount === 4) {
              payout = BET_AMOUNT * 20;
              msg = 'MEGA WIN!';
            } else if (matchCount === 3) {
              payout = BET_AMOUNT * 5;
              msg = 'Nice Win!';
            } else if (matchCount === 2) {
              payout = BET_AMOUNT * 2;
              msg = 'Small Win';
            } else {
              msg = 'No luck...';
            }

            const finalCoins = coinsRef.current + payout;
            setCoins(finalCoins);
            coinsRef.current = finalCoins;
            setWinMsg(msg);
            setWinAmount(payout);
            setJackpot(isJackpot);

            if (payout > 0) {
              playGameSound(isJackpot ? 'win' : 'correct');
              if (isJackpot) {
                confetti({
                  particleCount: 200,
                  spread: 100,
                  origin: { y: 0.4 },
                  colors: [theme.primary, theme.secondary, '#fbbf24', '#f472b6', '#34d399'],
                });
                setTimeout(() => {
                  confetti({
                    particleCount: 100,
                    spread: 60,
                    origin: { x: 0.2, y: 0.5 },
                    colors: [theme.primary, '#fbbf24'],
                  });
                  confetti({
                    particleCount: 100,
                    spread: 60,
                    origin: { x: 0.8, y: 0.5 },
                    colors: [theme.secondary, '#f472b6'],
                  });
                }, 400);
              } else if (matchCount >= 3) {
                confetti({
                  particleCount: 60,
                  spread: 50,
                  origin: { y: 0.5 },
                  colors: [theme.primary, theme.secondary],
                });
              }
            } else {
              playGameSound('wrong');
            }

            setSpinning(false);
          }, 150);
        }
      }, 600 + i * 320);
    });
  }, [spinning, gameOver, spinsLeft, coins, pool, theme]);

  // ─── Game over detection ─────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    if (!spinning && (spinsLeft <= 0 || coins < BET_AMOUNT) && winMsg !== null) {
      const timer = setTimeout(() => {
        setGameOver(true);
        const finalScore = coinsRef.current;
        submit(finalScore);
        onComplete(finalScore);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [spinning, spinsLeft, coins, winMsg, gameOver, submit, onComplete]);

  // ─── Reel rendering ──────────────────────────────────────────────
  const allStopped = reelsStopped.every(Boolean);
  const pri = theme.primary;
  const sec = theme.secondary;

  return (
    <div ref={containerRef} style={{ userSelect: 'none' }}>
      {/* Header: Coins + Spins */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        padding: '0 0.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🪙</span>
          <motion.span
            key={coins}
            initial={{ scale: 1.3, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#fff' }}
            transition={{ duration: 0.3 }}
            style={{ fontWeight: 700, fontSize: '1rem' }}
          >
            {coins}
          </motion.span>
        </div>
        <span style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.8rem',
        }}>
          Bet: {BET_AMOUNT} | Spins: {spinsLeft}
        </span>
        {best > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
            Best: {best}
          </span>
        )}
      </div>

      {/* Slot machine frame */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(20,20,40,0.95), rgba(10,10,25,0.98))',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: '1rem 0.75rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${pri}, ${sec}, ${pri})`,
          opacity: 0.7,
        }} />

        {/* Reel container */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.35rem',
          position: 'relative',
        }}>
          {/* Win line indicator */}
          <div style={{
            position: 'absolute',
            top: `${SYMBOL_HEIGHT}px`,
            left: 0,
            right: 0,
            height: `${SYMBOL_HEIGHT}px`,
            border: `2px solid ${allStopped && winAmount > 0 ? pri : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '0.5rem',
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'border-color 0.3s',
            boxShadow: allStopped && winAmount > 0
              ? `0 0 12px ${pri}44, inset 0 0 12px ${pri}22`
              : 'none',
          }} />

          {strips.map((strip, reelIndex) => {
            const stopped = reelsStopped[reelIndex];
            // Position: target should land on the middle (2nd) visible row
            const landY = -(targets[reelIndex] - 1) * SYMBOL_HEIGHT;
            // While spinning, animate far up (the strip cycles visually)
            const spinY = -(SYMBOLS_PER_STRIP - 4) * SYMBOL_HEIGHT;

            return (
              <div
                key={reelIndex}
                style={{
                  width: `${100 / REEL_COUNT - 2}%`,
                  maxWidth: '72px',
                  height: `${SYMBOL_HEIGHT * VISIBLE_ROWS}px`,
                  overflow: 'hidden',
                  borderRadius: '0.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                }}
              >
                {/* Gradient fade at top and bottom */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '20px',
                  background: 'linear-gradient(to bottom, rgba(10,10,25,0.9), transparent)',
                  zIndex: 5,
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '20px',
                  background: 'linear-gradient(to top, rgba(10,10,25,0.9), transparent)',
                  zIndex: 5,
                  pointerEvents: 'none',
                }} />

                <motion.div
                  animate={{
                    y: stopped ? landY : [0, spinY],
                  }}
                  transition={
                    stopped
                      ? {
                          type: 'spring',
                          stiffness: 200,
                          damping: 22,
                          mass: 0.8,
                        }
                      : {
                          duration: 0.35,
                          repeat: Infinity,
                          ease: 'linear',
                        }
                  }
                  style={{ willChange: 'transform' }}
                >
                  {strip.map((symbol, si) => (
                    <div
                      key={si}
                      style={{
                        height: `${SYMBOL_HEIGHT}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        lineHeight: 1,
                        filter: stopped && si === targets[reelIndex]
                          ? 'none'
                          : 'brightness(0.6)',
                        transition: 'filter 0.3s',
                      }}
                    >
                      {symbol}
                    </div>
                  ))}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Bottom accent bar */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${sec}, ${pri}, ${sec})`,
          opacity: 0.5,
        }} />
      </div>

      {/* Win message */}
      <AnimatePresence mode="wait">
        {winMsg && !spinning && (
          <motion.div
            key={winMsg + winAmount}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              textAlign: 'center',
              margin: '0.75rem 0 0.25rem',
            }}
          >
            {jackpot ? (
              <motion.div
                animate={{
                  scale: [1, 1.12, 1, 1.08, 1],
                  rotate: [0, -2, 2, -1, 0],
                }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  background: `linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa, #34d399, #fbbf24)`,
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                  letterSpacing: '0.1em',
                }}
              >
                {winMsg}
              </motion.div>
            ) : (
              <div style={{
                fontSize: winAmount > 0 ? '1.15rem' : '0.95rem',
                fontWeight: winAmount > 0 ? 700 : 500,
                color: winAmount > 0 ? pri : 'rgba(255,255,255,0.35)',
              }}>
                {winMsg}
              </div>
            )}
            {winAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontSize: jackpot ? '1.2rem' : '0.95rem',
                  fontWeight: 600,
                  color: '#fbbf24',
                  marginTop: '0.15rem',
                }}
              >
                +{winAmount} 🪙
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button + lever visual */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginTop: '0.75rem',
      }}>
        {/* Lever decoration */}
        <div style={{
          width: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <motion.div
            animate={{ y: leverPulled ? 12 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${pri}, ${sec})`,
              boxShadow: `0 0 8px ${pri}66`,
            }}
          />
          <motion.div
            animate={{ scaleY: leverPulled ? 0.6 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              width: '4px',
              height: '28px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              borderRadius: '2px',
              transformOrigin: 'bottom',
            }}
          />
          <div style={{
            width: '16px',
            height: '6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '0 0 4px 4px',
          }} />
        </div>

        {/* Spin button */}
        {!gameOver ? (
          <motion.button
            onClick={spin}
            disabled={spinning || spinsLeft <= 0 || coins < BET_AMOUNT}
            whileTap={!spinning ? { scale: 0.95 } : {}}
            whileHover={!spinning ? { scale: 1.02 } : {}}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: spinning || spinsLeft <= 0 || coins < BET_AMOUNT
                ? 'rgba(255,255,255,0.05)'
                : `linear-gradient(135deg, ${pri}, ${sec})`,
              border: 'none',
              borderRadius: '0.75rem',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: spinning ? 'wait' : 'pointer',
              opacity: spinning ? 0.5 : 1,
              transition: 'opacity 0.2s, background 0.3s',
              letterSpacing: '0.08em',
              boxShadow: spinning
                ? 'none'
                : `0 4px 16px ${pri}44`,
            }}
          >
            {spinning
              ? '🎰 Spinning...'
              : coins < BET_AMOUNT
                ? 'Out of coins!'
                : `SPIN`}
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.9rem',
            }}
          >
            Game over! Final: {coins} coins
          </motion.div>
        )}
      </div>

      {/* Payout legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.75rem',
        marginTop: '0.65rem',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.25)',
        flexWrap: 'wrap',
      }}>
        <span>5x = 500🪙</span>
        <span>4x = 200🪙</span>
        <span>3x = 50🪙</span>
        <span>2x = 20🪙</span>
      </div>
    </div>
  );
}
