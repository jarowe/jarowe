import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHoliday } from '../context/HolidayContext';
import { GAMES } from '../data/gameRegistry';
import confetti from 'canvas-confetti';
import GlintBeam from './GlintBeam';
import './HolidayBanner.css';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function HolidayBanner({ onTriviaLaunch, onGameLaunch }) {
  const { holiday, tier, isBirthday } = useHoliday();
  const confettiFired = useRef(false);
  const [showFact, setShowFact] = useState(false);
  const [triviaCompleted, setTriviaCompleted] = useState(() => {
    return !!localStorage.getItem(`jarowe_trivia_${getTodayKey()}`);
  });
  const [glintNudge, setGlintNudge] = useState({ active: false, glintX: 0, glintY: 0 });
  const [dayCardHovered, setDayCardHovered] = useState(false);
  const nudgeTimerRef = useRef(null);
  const bannerRef = useRef(null);
  const factTimerRef = useRef(null);

  // DAY card ↔ banner connection — subtle glow when day card is hovered
  useEffect(() => {
    const onHover = () => setDayCardHovered(true);
    const onUnhover = () => setDayCardHovered(false);
    window.addEventListener('day-card-hover', onHover);
    window.addEventListener('day-card-unhover', onUnhover);
    return () => {
      window.removeEventListener('day-card-hover', onHover);
      window.removeEventListener('day-card-unhover', onUnhover);
    };
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

  // T1 fact crossfade (greeting → fact after 15s, stays on fact)
  useEffect(() => {
    if (tier !== 1 || !holiday?.fact || isBirthday || triviaCompleted) return;
    factTimerRef.current = setTimeout(() => setShowFact(true), 15000);
    return () => { if (factTimerRef.current) clearTimeout(factTimerRef.current); };
  }, [tier, holiday, isBirthday, triviaCompleted]);

  // Listen for trivia completion — poll localStorage when trivia modal closes
  useEffect(() => {
    const checkCompletion = () => {
      if (localStorage.getItem(`jarowe_trivia_${getTodayKey()}`)) {
        setTriviaCompleted(true);
      }
    };
    // Check on storage events (cross-tab) and on focus (same-tab after modal closes)
    window.addEventListener('storage', checkCompletion);
    window.addEventListener('focus', checkCompletion);
    // Also poll briefly after trivia launches to catch same-tab completion
    const interval = setInterval(checkCompletion, 2000);
    return () => {
      window.removeEventListener('storage', checkCompletion);
      window.removeEventListener('focus', checkCompletion);
      clearInterval(interval);
    };
  }, []);

  const handleBannerClick = useCallback(() => {
    // Launch trivia — banner stays visible until quiz is completed
    if (onTriviaLaunch) onTriviaLaunch();
  }, [onTriviaLaunch]);

  // Compute beam geometry from Glint position → banner center
  const beamCoords = (() => {
    if (!glintNudge.active || !bannerRef.current) return null;
    const rect = bannerRef.current.getBoundingClientRect();
    const bannerCX = rect.left + rect.width / 2;
    const bannerCY = rect.top + rect.height / 2;
    const cfg = window.__prismConfig || {};
    const beamDuration = cfg.bannerNudgeBeamDuration ?? 1200;
    return {
      startX: glintNudge.glintX,
      startY: glintNudge.glintY,
      endX: bannerCX,
      endY: bannerCY,
      duration: beamDuration,
    };
  })();

  const gameInfo = holiday?.game ? GAMES[holiday.game] : null;

  // Birthday has its own banner — don't render ours
  if (isBirthday || !holiday) return null;
  if (tier <= 0) return null;
  // Hide once today's trivia is completed
  if (triviaCompleted) return null;

  // ── T1: Persistent Toast (stays until trivia completed) ──
  if (tier === 1) {
    return (
      <>
        <motion.div
          ref={bannerRef}
          className={`holiday-banner holiday-banner-t1${glintNudge.active ? ' holiday-banner-glint-glow' : ''}${dayCardHovered ? ' holiday-banner--day-hover' : ''}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
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
          <div className="holiday-banner-t1-actions">
            {gameInfo && onGameLaunch && (
              <span
                className="holiday-banner-play holiday-banner-play-game"
                onClick={(e) => { e.stopPropagation(); onGameLaunch(); }}
                aria-label={`Play ${gameInfo.name}`}
              >
                🎮
              </span>
            )}
            {(holiday.trivia || onTriviaLaunch) && (
              <span className="holiday-banner-play" aria-label="Play trivia">
                ▸
                {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
              </span>
            )}
          </div>
        </motion.div>
        {glintNudge.active && beamCoords && <GlintBeam {...beamCoords} />}
      </>
    );
  }

  // ── T2: Glass panel with trivia click ──
  if (tier === 2) {
    return (
      <>
        <motion.div
          ref={bannerRef}
          className={`holiday-banner holiday-banner-t2 glass-panel${glintNudge.active ? ' holiday-banner-glint-glow' : ''}${dayCardHovered ? ' holiday-banner--day-hover' : ''}`}
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
              <div className="holiday-banner-t2-actions">
                {gameInfo && onGameLaunch && (
                  <span
                    className="holiday-banner-play holiday-banner-play-t2 holiday-banner-play-game"
                    onClick={(e) => { e.stopPropagation(); onGameLaunch(); }}
                  >
                    🎮 Play {gameInfo.name}
                  </span>
                )}
                {(holiday.trivia || onTriviaLaunch) && (
                  <span className="holiday-banner-play holiday-banner-play-t2">
                    ▸ Play Trivia
                    {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        {glintNudge.active && beamCoords && <GlintBeam {...beamCoords} />}
      </>
    );
  }

  // ── T3: "THE SITE IS CELEBRATING" ──
  return (
    <>
      <motion.div
        ref={bannerRef}
        className={`holiday-banner holiday-banner-t3 glass-panel${glintNudge.active ? ' holiday-banner-glint-glow' : ''}${dayCardHovered ? ' holiday-banner--day-hover' : ''}`}
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
          <div className="holiday-banner-t3-actions">
            {gameInfo && onGameLaunch && (
              <span
                className="holiday-banner-play holiday-banner-play-t3 holiday-banner-play-game holiday-banner-play-game-t3"
                onClick={(e) => { e.stopPropagation(); onGameLaunch(); }}
              >
                🎮 Play {gameInfo.name}
              </span>
            )}
            {(holiday.trivia || onTriviaLaunch) && (
              <span className="holiday-banner-play holiday-banner-play-t3">
                ▸ Play Trivia
                {glintNudge.active && <span className="glint-challenge-badge">Glint Challenge!</span>}
              </span>
            )}
          </div>
        </div>
      </motion.div>
      {glintNudge.active && beamCoords && <GlintBeam {...beamCoords} />}
    </>
  );
}
