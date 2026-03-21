// timeOfDay.js — Applies CSS custom properties for atmospheric shifts
// Each time-of-day phase defines a color palette that subtly tints
// glass panels, glow effects, and background washes across the homepage.

import { getTimeOfDayPhase } from './astro';

// Time-of-day color palettes
// Each phase defines overrides for CSS custom properties on :root
export const TIME_PHASES = {
  dawn: {
    '--tod-bg-wash':
      'radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.06) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)',
    '--tod-glass-tint': 'rgba(251,191,36,0.03)',
    '--tod-accent-glow-opacity': '0.15',
    '--tod-particle-brightness': '0.6',
    '--tod-text-glow': '0 0 20px rgba(251,191,36,0.08)',
    '--tod-hero-accent': '#fbbf24',
    '--tod-shadow-softness': '20px',
    '--tod-nebula-intensity': '0.4',
  },
  day: {
    '--tod-bg-wash':
      'radial-gradient(ellipse at 50% 30%, rgba(14,165,233,0.03) 0%, transparent 60%)',
    '--tod-glass-tint': 'rgba(255,255,255,0.02)',
    '--tod-accent-glow-opacity': '0.1',
    '--tod-particle-brightness': '0.5',
    '--tod-text-glow': 'none',
    '--tod-hero-accent': '#0ea5e9',
    '--tod-shadow-softness': '12px',
    '--tod-nebula-intensity': '0.3',
  },
  'golden-hour': {
    '--tod-bg-wash':
      'radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.04) 40%, transparent 70%)',
    '--tod-glass-tint': 'rgba(245,158,11,0.04)',
    '--tod-accent-glow-opacity': '0.2',
    '--tod-particle-brightness': '0.7',
    '--tod-text-glow': '0 0 24px rgba(245,158,11,0.1)',
    '--tod-hero-accent': '#f59e0b',
    '--tod-shadow-softness': '16px',
    '--tod-nebula-intensity': '0.5',
  },
  dusk: {
    '--tod-bg-wash':
      'radial-gradient(ellipse at 30% 70%, rgba(99,102,241,0.06) 0%, rgba(244,63,94,0.04) 40%, transparent 70%)',
    '--tod-glass-tint': 'rgba(99,102,241,0.03)',
    '--tod-accent-glow-opacity': '0.18',
    '--tod-particle-brightness': '0.75',
    '--tod-text-glow': '0 0 22px rgba(99,102,241,0.08)',
    '--tod-hero-accent': '#6366f1',
    '--tod-shadow-softness': '18px',
    '--tod-nebula-intensity': '0.55',
  },
  night: {
    '--tod-bg-wash':
      'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.05) 0%, transparent 60%)',
    '--tod-glass-tint': 'rgba(124,58,237,0.02)',
    '--tod-accent-glow-opacity': '0.25',
    '--tod-particle-brightness': '1.0',
    '--tod-text-glow': '0 0 30px rgba(124,58,237,0.12)',
    '--tod-hero-accent': '#a78bfa',
    '--tod-shadow-softness': '24px',
    '--tod-nebula-intensity': '0.7',
  },
};

// Apply time-of-day CSS custom properties to :root
export function applyTimeOfDay(date = new Date()) {
  const phase = getTimeOfDayPhase(date);
  const props = TIME_PHASES[phase];
  if (!props) return phase;
  const root = document.documentElement;
  Object.entries(props).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Also set the phase name as a data attribute for CSS selectors
  root.dataset.todPhase = phase;
  return phase;
}
