// Sliding-window rate limiter (in-memory, resets on cold start — fine for Vercel)

const windows = new Map();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL = 5 * 60 * 1000; // clean every 5 min

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entries] of windows) {
    const fresh = entries.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) windows.delete(key);
    else windows.set(key, fresh);
  }
}

/**
 * Check rate limit for a given key.
 * @param {string} key - unique identifier (IP or user ID)
 * @param {number} limit - max requests per window
 * @returns {{ allowed: boolean, remaining: number, limit: number }}
 */
export function checkRateLimit(key, limit) {
  cleanup();
  const now = Date.now();
  const entries = (windows.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (entries.length >= limit) {
    windows.set(key, entries);
    return { allowed: false, remaining: 0, limit };
  }

  entries.push(now);
  windows.set(key, entries);
  return { allowed: true, remaining: limit - entries.length, limit };
}
