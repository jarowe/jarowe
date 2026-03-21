// streaks.js — Visitor streak tracking with localStorage persistence
// Tracks consecutive daily visits, streak freeze, and milestone detection.

const STORAGE_KEY = 'jarowe_streak';
const MILESTONES = [3, 7, 14, 30];

/**
 * Returns today's date as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns yesterday's date as YYYY-MM-DD in the user's local timezone.
 */
export function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the integer number of days between two YYYY-MM-DD strings.
 */
export function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  const diffMs = Math.abs(d2 - d1);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Read and parse streak data from localStorage.
 * Returns defaults if missing or corrupt.
 */
export function getStreakData() {
  const defaults = {
    count: 0,
    lastVisit: null,
    freezeAvailable: true,
    freezeUsed: false,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Validate shape
    if (
      typeof parsed.count !== 'number' ||
      typeof parsed.freezeAvailable !== 'boolean' ||
      typeof parsed.freezeUsed !== 'boolean'
    ) {
      return defaults;
    }
    return {
      count: parsed.count,
      lastVisit: parsed.lastVisit || null,
      freezeAvailable: parsed.freezeAvailable,
      freezeUsed: parsed.freezeUsed,
    };
  } catch {
    return defaults;
  }
}

/**
 * Save streak data to localStorage.
 */
function saveStreakData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/**
 * Check and update the visitor's streak. Called once per page load.
 *
 * Returns: { count, isNew, milestone, frozeUsed }
 *   - count: current streak count
 *   - isNew: true if this is a new day (streak changed)
 *   - milestone: number (3, 7, 14, 30) if milestone reached, else null
 *   - frozeUsed: true if a freeze was consumed this visit
 */
export function checkStreak() {
  const data = getStreakData();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  // Same day — no change
  if (data.lastVisit === today) {
    return { count: data.count, isNew: false, milestone: null, frozeUsed: false };
  }

  let frozeUsed = false;

  if (data.lastVisit === yesterday) {
    // Consecutive day — increment
    data.count += 1;
  } else if (data.lastVisit === null) {
    // First visit ever
    data.count = 1;
  } else {
    // Gap of 2+ days
    const gap = daysBetween(data.lastVisit, today);
    if (gap >= 2) {
      if (data.freezeAvailable && !data.freezeUsed) {
        // Use the freeze to preserve streak
        data.freezeUsed = true;
        data.freezeAvailable = false;
        frozeUsed = true;
        // Keep count, just update the visit date
      } else {
        // Reset streak
        data.count = 1;
      }
    } else {
      // Shouldn't reach here, but treat as increment for safety
      data.count += 1;
    }
  }

  data.lastVisit = today;

  // Milestone detection
  let milestone = null;
  if (MILESTONES.includes(data.count)) {
    milestone = data.count;
  }

  // At 30-day milestone, recharge the freeze
  if (data.count === 30) {
    data.freezeAvailable = true;
    data.freezeUsed = false;
  }

  saveStreakData(data);

  return { count: data.count, isNew: true, milestone, frozeUsed };
}

/**
 * Manually use the streak freeze (for future UI).
 * Sets freeze as used. Returns updated streak data.
 */
export function useStreakFreeze() {
  const data = getStreakData();
  if (!data.freezeAvailable) return data;
  data.freezeAvailable = false;
  data.freezeUsed = true;
  saveStreakData(data);
  return data;
}
