export function randomRange(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.random() * (hi - lo);
}

export function scheduleAmbientEvent(state, now, minInterval, maxInterval) {
  state.active = false;
  state.nextTime = now + randomRange(minInterval, maxInterval);
}

export function getAmbientEnvelope(now, startTime, duration) {
  if (duration <= 0) return 0;
  const progress = (now - startTime) / duration;
  if (progress <= 0 || progress >= 1) return 0;
  return Math.sin(progress * Math.PI);
}

export function gaussianFalloff(distance, radius) {
  if (radius <= 0) return distance === 0 ? 1 : 0;
  return Math.exp(-(distance * distance) / (2 * radius * radius));
}
