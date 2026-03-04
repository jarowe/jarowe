import { motion } from 'framer-motion';
import { useHoliday } from '../context/HolidayContext';
import './HolidayBanner.css';

export default function HolidayBanner() {
  const { holiday, tier, isBirthday } = useHoliday();

  // Birthday has its own banner — don't render ours
  if (isBirthday || !holiday) return null;

  if (tier <= 0) return null;

  // ── T1: Simple greeting strip ──
  if (tier === 1) {
    return (
      <motion.div
        className="holiday-banner holiday-banner-t1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <span className="holiday-banner-emoji">{holiday.emoji}</span>
        <span className="holiday-banner-greeting">{holiday.greeting}</span>
      </motion.div>
    );
  }

  // ── T2: Glass panel with accent border ──
  if (tier === 2) {
    return (
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
        <div className="holiday-banner-emoji-hero">{holiday.emoji}</div>
        <div className="holiday-banner-content">
          <div className="holiday-banner-name">{holiday.name}</div>
          <div className="holiday-banner-greeting">{holiday.greeting}</div>
        </div>
      </motion.div>
    );
  }

  // ── T3: Full animated banner ──
  return (
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
      <div className="holiday-banner-shimmer" />
      <div className="holiday-banner-emoji-large">{holiday.emoji}</div>
      <div className="holiday-banner-content">
        <div className="holiday-banner-name">{holiday.name}</div>
        <div className="holiday-banner-greeting">{holiday.greeting}</div>
      </div>
    </motion.div>
  );
}
