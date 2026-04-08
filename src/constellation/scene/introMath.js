function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function normalizeWindow(progress, start, end) {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }
  return clamp01((progress - start) / (end - start));
}

/**
 * Smoothly reveals a channel within a specific segment of the intro.
 */
export function getIntroReveal(progress, start = 0, end = 1) {
  return smoothstep01(normalizeWindow(progress, start, end));
}

/**
 * Staggers reveal timing across many elements while keeping them inside
 * a shared phase window of the overall intro.
 */
export function getStaggeredReveal(
  progress,
  index = 0,
  total = 1,
  {
    start = 0,
    end = 1,
    staggerWindow = 0.2,
  } = {}
) {
  const safeTotal = Math.max(1, total);
  const phaseSpan = Math.max(0.0001, end - start);
  const clampedWindow = Math.min(Math.max(0.0001, staggerWindow), phaseSpan);
  const spread = Math.max(0, phaseSpan - clampedWindow);
  const orderT = safeTotal <= 1 ? 0 : clamp01(index / (safeTotal - 1));
  const localStart = start + spread * orderT;
  const localEnd = Math.min(end, localStart + clampedWindow);

  return getIntroReveal(progress, localStart, localEnd);
}
