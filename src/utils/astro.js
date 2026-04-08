// astro.js — Moon phase and time-of-day calculations
// Pure math, no external dependencies. Provides lunar and solar awareness
// for the Living Homepage atmospheric system.

// Moon phase calculation using Julian Day method
// Returns 0-29.53 (synodic month days since new moon)
export function getMoonAge(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Julian day calculation
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Days since known new moon (Jan 6, 2000 18:14 UTC = JD 2451550.26)
  const daysSinceNewMoon = jd - 2451550.26;
  const synodicMonth = 29.53058770576;
  const age = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  return age;
}

// Moon phase name
export function getMoonPhase(date = new Date()) {
  const age = getMoonAge(date);
  if (age < 1.85) return 'new';
  if (age < 7.38) return 'waxing-crescent';
  if (age < 9.23) return 'first-quarter';
  if (age < 14.77) return 'waxing-gibbous';
  if (age < 16.61) return 'full';
  if (age < 22.15) return 'waning-gibbous';
  if (age < 23.99) return 'last-quarter';
  if (age < 27.68) return 'waning-crescent';
  return 'new';
}

// Moon illumination 0.0 (new) to 1.0 (full)
export function getMoonIllumination(date = new Date()) {
  const age = getMoonAge(date);
  const synodicMonth = 29.53058770576;
  // Illumination follows a cosine curve: 0 at new moon, 1 at full moon
  return (1 - Math.cos((age / synodicMonth) * 2 * Math.PI)) / 2;
}

// Time-of-day phase based on local hour
// Returns: 'dawn' | 'day' | 'golden-hour' | 'dusk' | 'night'
export function getTimeOfDayPhase(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 16.5) return 'day';
  if (hour >= 16.5 && hour < 18) return 'golden-hour';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night'; // 20:00 - 5:00
}

// Smooth blend factor within a phase (0.0 = phase start, 1.0 = phase end)
// Useful for gradual transitions rather than hard cuts
export function getPhaseProgress(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 7) return (hour - 5) / 2; // dawn: 2hr window
  if (hour >= 7 && hour < 16.5) return (hour - 7) / 9.5; // day: 9.5hr window
  if (hour >= 16.5 && hour < 18) return (hour - 16.5) / 1.5; // golden: 1.5hr
  if (hour >= 18 && hour < 20) return (hour - 18) / 2; // dusk: 2hr window
  // night: wraps around midnight
  if (hour >= 20) return (hour - 20) / 9;
  return (hour + 4) / 9; // 0:00-5:00 = continuing night
}
