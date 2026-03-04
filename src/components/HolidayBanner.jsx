import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useHoliday } from '../context/HolidayContext';
import confetti from 'canvas-confetti';
import './HolidayBanner.css';

// ── Holiday Simulator (only when ?editor=jarowe) ──
function HolidaySimulator({ currentKey }) {
  const [dateVal, setDateVal] = useState(currentKey || '');
  const params = new URLSearchParams(window.location.search);

  const handleChange = (e) => {
    const val = e.target.value;
    setDateVal(val);
    if (/^\d{2}-\d{2}$/.test(val)) {
      params.set('holiday', val);
      params.set('editor', 'jarowe');
      window.location.search = params.toString();
    }
  };

  return (
    <div className="holiday-simulator">
      <span className="holiday-sim-label">Holiday Sim</span>
      <input
        type="text"
        className="holiday-sim-input"
        value={dateVal}
        onChange={handleChange}
        placeholder="MM-DD"
        maxLength={5}
      />
    </div>
  );
}

export default function HolidayBanner() {
  const { holiday, tier, isBirthday } = useHoliday();
  const confettiFired = useRef(false);
  const params = new URLSearchParams(window.location.search);
  const isEditor = params.get('editor') === 'jarowe';

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

  // Birthday has its own banner — don't render ours
  if (isBirthday || !holiday) return (isEditor ? <HolidaySimulator currentKey={holiday?.key} /> : null);
  if (tier <= 0) return (isEditor ? <HolidaySimulator currentKey={holiday.key} /> : null);

  const categoryName = holiday.category || '';

  // ── T1: Visible "Daily Vibe" strip ──
  if (tier === 1) {
    return (
      <>
        {isEditor && <HolidaySimulator currentKey={holiday.key} />}
        <motion.div
          className="holiday-banner holiday-banner-t1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            '--hb-primary': holiday.accentPrimary,
            '--hb-secondary': holiday.accentSecondary,
            '--hb-glow': holiday.accentGlow,
          }}
        >
          <span className="holiday-banner-emoji holiday-emoji-breathe">{holiday.emoji}</span>
          <div className="holiday-banner-t1-content">
            <span className="holiday-banner-t1-name">{holiday.name}</span>
            <span className="holiday-banner-greeting">{holiday.greeting}</span>
          </div>
        </motion.div>
      </>
    );
  }

  // ── T2: "Wow, something is happening today!" ──
  if (tier === 2) {
    return (
      <>
        {isEditor && <HolidaySimulator currentKey={holiday.key} />}
        <motion.div
          className="holiday-banner holiday-banner-t2 glass-panel"
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
          style={{
            '--hb-primary': holiday.accentPrimary,
            '--hb-secondary': holiday.accentSecondary,
            '--hb-glow': holiday.accentGlow,
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
            <span className="holiday-category-tag">
              {holiday.emoji} {categoryName}
            </span>
          </div>
        </motion.div>
      </>
    );
  }

  // ── T3: "THE SITE IS CELEBRATING" ──
  return (
    <>
      {isEditor && <HolidaySimulator currentKey={holiday.key} />}
      <motion.div
        className="holiday-banner holiday-banner-t3 glass-panel"
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        style={{
          '--hb-primary': holiday.accentPrimary,
          '--hb-secondary': holiday.accentSecondary,
          '--hb-glow': holiday.accentGlow,
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
        </div>
      </motion.div>
    </>
  );
}
