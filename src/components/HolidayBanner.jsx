import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHoliday } from '../context/HolidayContext';
import confetti from 'canvas-confetti';
import './HolidayBanner.css';

// Timing constants (ms)
const GREETING_DURATION = 15000;   // 15s showing greeting
const FACT_DURATION = 15000;       // 15s showing fact
const OFFSCREEN_DURATION = 60000;  // 60s hidden before looping back

export default function HolidayBanner({ onTriviaLaunch }) {
  const { holiday, tier, isBirthday } = useHoliday();
  const confettiFired = useRef(false);
  const [visible, setVisible] = useState(true);
  const [showFact, setShowFact] = useState(false);
  const [clickedTrivia, setClickedTrivia] = useState(false);
  const timers = useRef([]);
  const [glintNudge, setGlintNudge] = useState({ active: false, glintX: 0, glintY: 0 });
  const nudgeTimerRef = useRef(null);
  const bannerRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }, []);

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
    return id;
  }, []);

  // T3 confetti burst on mount
  useEffect(() => {
    if (tier >= 3 && !isBirthday && holiday && !confettiFired.current) {
      confettiFired.current = true;
      const primary = holiday.accentPrimary || '#7c3aed';
      const secondary = holiday.accentSecondary || '#06b6d4';
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 },
          colors: [primary, secondary, '#ffffff', '#fbbf24'],
          gravity: 0.8,
          scalar: 1.1,
        });
      }, 600);
    }
  }, [tier, isBirthday, holiday]);

  // Listen for Glint nudge events
  useEffect(() => {
    const handler = (e) => {
      const { x = 0, y = 0 } = e.detail || {};
      setGlintNudge({ active: true, glintX: x, glintY: y });

      // Clear after glow duration
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      const cfg = window.__prismConfig || {};
      const glowDuration = cfg.bannerNudgeGlowDuration ?? 4000;
      nudgeTimerRef.current = setTimeout(() => {
        setGlintNudge({ active: false, glintX: 0, glintY: 0 });
      }, glowDuration);
    };
    window.addEventListener('glint-nudge-banner', handler);
    return () => {
      window.removeEventListener('glint-nudge-banner', handler);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  // T1 looping cycle: greeting 15s → fact 15s → hide 60s → repeat
  useEffect(() => {
    if (tier !== 1 || clickedTrivia || isBirthday || !holiday) return;

    function startCycle() {
      clearAllTimers();
      setShowFact(false);
      setVisible(true);

      // After 15s, crossfade to fact (if available)
      if (holiday.fact) {
        addTimer(() => setShowFact(true), GREETING_DURATION);
      }

      // After 30s total (or 15s if no fact), slide out
      const totalVisible = holiday.fact
        ? GREETING_DURATION + FACT_DURATION
        : GREETING_DURATION;
      addTimer(() => setVisible(false), totalVisible);

      // After offscreen period, loop back
      addTimer(() => startCycle(), totalVisible + OFFSCREEN_DURATION);
    }

    startCycle();
    return clearAllTimers;
  }, [tier, clickedTrivia, isBirthday, holiday, clearAllTimers, addTimer]);

  const handleBannerClick = useCallback(() => {
    // Cancel the loop
    clearAllTimers();
    setClickedTrivia(true);
    setVisible(false);

    // Launch trivia
    if (onTriviaLaunch) onTriviaLaunch();
  }, [onTriviaLaunch, clearAllTimers]);

  // Compute beam geometry from Glint position → banner center
  const beamStyle = (() => {
    if (!glintNudge.active || !bannerRef.current) return null;
    const rect = bannerRef.current.getBoundingClientRect();
    const bannerCX = rect.left + rect.width / 2;
    const bannerCY = rect.top + rect.height / 2;
    const dx = bannerCX - glintNudge.glintX;
    const dy = bannerCY - glintNudge.glintY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const cfg = window.__prismConfig || {};
    const beamDuration = cfg.bannerNudgeBeamDuration ?? 1200;
    return {
      '--beam-start-x': `${glintNudge.glintX}px`,
      '--beam-start-y': `${glintNudge.glintY}px`,
      '--beam-angle': `${angle}deg`,
      '--beam-length': `${length}px`,
      '--beam-duration': `${beamDuration}ms`,
    };
  })();

  // Birthday has its own banner — don't render ours
  if (isBirthday || !holiday) return null;
  if (tier <= 0) return null;

  // ── T1: Looping Smart Toast ──
  if (tier === 1) {
    return (
      <>
        <AnimatePresence>
          {visible && !clickedTrivia && (
            <motion.div
              ref={bannerRef}
              className={`holiday-banner holiday-banner-t1${glintNudge.active ? ' holiday-banner-glint-glow' : ''}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              onClick={handleBannerClick}
              style={{
                '--hb-primary': holiday.accentPrimary,
                '--hb-secondary': holiday.accentSecondary,
                '--hb-glow': holiday.accentGlow,
              }}
            >
              <span className="holiday-banner-emoji">{holiday.emoji}</span>
              <div className="holiday-banner-t1-content">
                <AnimatePresence mode="wait">
                  {!showFact ? (
                    <motion.div
                      key="greeting"
                      className="holiday-banner-t1-text"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="holiday-banner-t1-name">{holiday.name}</span>
                      <span className="holiday-banner-greeting">{holiday.greeting}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="fact"
                      className="holiday-banner-t1-text"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="holiday-banner-t1-name">This day in history</span>
                      <span className="holiday-banner-greeting">{holiday.fact}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {(holiday.trivia || onTriviaLaunch) && (
                <span className="holiday-banner-play" aria-label="Play trivia">
                  ▸
                  {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {glintNudge.active && beamStyle && <div className="glint-rainbow-beam" style={beamStyle} />}
      </>
    );
  }

  // ── T2: Glass panel with trivia click ──
  if (tier === 2) {
    return (
      <>
        <motion.div
          ref={bannerRef}
          className={`holiday-banner holiday-banner-t2 glass-panel${glintNudge.active ? ' holiday-banner-glint-glow' : ''}`}
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
          onClick={handleBannerClick}
          style={{
            '--hb-primary': holiday.accentPrimary,
            '--hb-secondary': holiday.accentSecondary,
            '--hb-glow': holiday.accentGlow,
            cursor: 'pointer',
          }}
        >
          <div className="holiday-banner-shimmer holiday-shimmer-t2" />
          <motion.div
            className="holiday-banner-emoji-hero"
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.6 }}
          >
            {holiday.emoji}
          </motion.div>
          <div className="holiday-banner-content">
            <div className="holiday-banner-name">{holiday.name}</div>
            <div className="holiday-banner-greeting">{holiday.greeting}</div>
            <div className="holiday-banner-t2-footer">
              <span className="holiday-category-tag">
                {holiday.emoji} {holiday.category || ''}
              </span>
              {(holiday.trivia || onTriviaLaunch) && (
                <span className="holiday-banner-play holiday-banner-play-t2">
                  ▸ Play Trivia
                  {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
                </span>
              )}
            </div>
          </div>
        </motion.div>
        {glintNudge.active && beamStyle && <div className="glint-rainbow-beam" style={beamStyle} />}
      </>
    );
  }

  // ── T3: "THE SITE IS CELEBRATING" ──
  return (
    <>
      <motion.div
        ref={bannerRef}
        className={`holiday-banner holiday-banner-t3 glass-panel${glintNudge.active ? ' holiday-banner-glint-glow' : ''}`}
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        onClick={handleBannerClick}
        style={{
          '--hb-primary': holiday.accentPrimary,
          '--hb-secondary': holiday.accentSecondary,
          '--hb-glow': holiday.accentGlow,
          cursor: 'pointer',
        }}
      >
        <div className="holiday-banner-shimmer holiday-shimmer-t3" />
        <div className="holiday-t3-gradient-border" />
        <div className="holiday-t3-center">
          <motion.div
            className="holiday-banner-emoji-large"
            initial={{ y: -60, opacity: 0, scale: 1.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.5 }}
          >
            <div className="holiday-emoji-halo" />
            {holiday.emoji}
          </motion.div>
          <div className="holiday-banner-name holiday-t3-name">{holiday.name}</div>
          <div className="holiday-banner-greeting">{holiday.greeting}</div>
          {(holiday.trivia || onTriviaLaunch) && (
            <span className="holiday-banner-play holiday-banner-play-t3">
              ▸ Play Trivia
              {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
            </span>
          )}
        </div>
      </motion.div>
      {glintNudge.active && beamStyle && <div className="glint-rainbow-beam" style={beamStyle} />}
    </>
  );
}
