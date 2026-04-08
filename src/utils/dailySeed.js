// dailySeed.js — Deterministic daily content rotation
// Uses simple hash + seeded PRNG for reproducible "same day = same content" behavior.
// No npm dependencies — pure JS math.

// Simple string hash (djb2 algorithm)
function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}

// Seeded PRNG (mulberry32) — deterministic sequence from a single seed
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get today's date key in YYYY-MM-DD format
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Create a seeded random function for today (or a given date key)
export function dailySeed(namespace = '', dateKey = todayKey()) {
  return mulberry32(hashCode(dateKey + ':' + namespace));
}

// Pick one item from an array deterministically for today
export function dailyPick(arr, namespace = 'default', dateKey = todayKey()) {
  if (!arr || arr.length === 0) return null;
  const rng = dailySeed(namespace, dateKey);
  return arr[Math.floor(rng() * arr.length)];
}

// Pick N unique items from an array deterministically
export function dailyPickN(arr, n, namespace = 'default', dateKey = todayKey()) {
  if (!arr || arr.length === 0) return [];
  const rng = dailySeed(namespace, dateKey);
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// Shuffle an array deterministically for today
export function dailyShuffle(arr, namespace = 'default', dateKey = todayKey()) {
  return dailyPickN(arr, arr.length, namespace, dateKey);
}
