// Globe Tour — State machine for guided globe tour with Glint narration
// Singleton module following glintAutonomy.js pattern.
// States: INACTIVE → STARTING → TOURING → ENDING → INACTIVE

const STATES = { INACTIVE: 0, STARTING: 1, TOURING: 2, ENDING: 3 };

let instance = null;

/**
 * Start a globe tour.
 * @param {Object} config
 * @param {Array} config.destinations - Array of expedition objects { lat, lng, name, region, ... }
 * @param {Function} config.pointOfView - (pov, duration) => void — controls globe camera
 * @param {Function} config.onNarration - ({ text, expression }) => void — show narration bubble
 * @param {Function} config.onDestinationChange - (destination, index) => void — destination changed
 * @param {Function} config.onComplete - () => void — tour ended
 * @param {Function} config.getIntroLine - () => { text, expression }
 * @param {Function} config.getDestinationLine - (name) => { text, expression }
 * @param {Function} config.getOutroLine - () => { text, expression }
 * @param {number} [config.dwellTime=6000] - ms to stay at each destination
 * @param {number} [config.transitTime=2000] - camera transit duration ms
 * @param {number} [config.altitude=1.5] - camera altitude during tour
 * @param {boolean} [config.autoAdvance=true] - auto-advance through destinations
 * @param {number} [config.startIndex=0] - destination to start at
 */
export function startTour(config) {
  if (instance) endTour();

  const {
    destinations,
    pointOfView,
    onNarration,
    onDestinationChange,
    onComplete,
    getIntroLine,
    getDestinationLine,
    getOutroLine,
    dwellTime = 6000,
    transitTime = 2000,
    altitude = 1.5,
    autoAdvance = true,
    startIndex = 0,
  } = config;

  instance = {
    state: STATES.STARTING,
    destinations,
    pointOfView,
    onNarration,
    onDestinationChange,
    onComplete,
    getIntroLine,
    getDestinationLine,
    getOutroLine,
    dwellTime,
    transitTime,
    altitude,
    autoAdvance,
    activeIndex: -1,
    timers: [],
  };

  // Show intro line
  const introLine = getIntroLine();
  onNarration(introLine);

  // After intro delay, navigate to first destination
  const t = setTimeout(() => {
    if (!instance || instance.state !== STATES.STARTING) return;
    instance.state = STATES.TOURING;
    navigateToDestination(startIndex);
  }, 1500);
  instance.timers.push(t);

  return instance;
}

/**
 * Navigate to a specific destination by index.
 */
export function navigateToDestination(index) {
  if (!instance || instance.state < STATES.TOURING) return;
  const { destinations, pointOfView, onNarration, onDestinationChange, getDestinationLine, dwellTime, transitTime, altitude, autoAdvance } = instance;

  if (index < 0 || index >= destinations.length) return;

  // Clear any pending auto-advance timers
  clearTimers();

  instance.activeIndex = index;
  const dest = destinations[index];

  // Move globe camera
  pointOfView({ lat: dest.lat, lng: dest.lng, altitude }, transitTime);

  // Notify destination change
  onDestinationChange(dest, index);

  // After camera arrives, show narration
  const narrateTimer = setTimeout(() => {
    if (!instance || instance.activeIndex !== index) return;
    const line = getDestinationLine(dest.name);
    onNarration(line);

    // Auto-advance to next destination after dwell
    if (autoAdvance) {
      const advanceTimer = setTimeout(() => {
        if (!instance || instance.activeIndex !== index) return;
        if (index < destinations.length - 1) {
          navigateToDestination(index + 1);
        } else {
          // Last destination — end tour after dwell
          finishTour();
        }
      }, dwellTime);
      if (instance) instance.timers.push(advanceTimer);
    }
  }, transitTime + 300);
  if (instance) instance.timers.push(narrateTimer);
}

/** Navigate to next destination */
export function nextDestination() {
  if (!instance) return;
  const next = instance.activeIndex + 1;
  if (next < instance.destinations.length) {
    navigateToDestination(next);
  } else {
    finishTour();
  }
}

/** Navigate to previous destination */
export function prevDestination() {
  if (!instance) return;
  const prev = instance.activeIndex - 1;
  if (prev >= 0) {
    navigateToDestination(prev);
  }
}

/** Skip to a specific destination */
export function skipToDestination(index) {
  navigateToDestination(index);
}

/** Internal: finish tour with outro */
function finishTour() {
  if (!instance) return;
  clearTimers();
  instance.state = STATES.ENDING;

  const { onNarration, getOutroLine, onComplete } = instance;
  const outroLine = getOutroLine();
  onNarration(outroLine);

  const t = setTimeout(() => {
    if (onComplete) onComplete();
    instance = null;
  }, 3000);
  if (instance) instance.timers.push(t);
}

/** End tour immediately */
export function endTour() {
  if (!instance) return;
  clearTimers();
  const { onComplete } = instance;
  instance.state = STATES.INACTIVE;
  instance = null;
  if (onComplete) onComplete();
}

/** Get current tour state */
export function getTourState() {
  if (!instance) return { state: STATES.INACTIVE, activeIndex: -1, destination: null, total: 0 };
  return {
    state: instance.state,
    activeIndex: instance.activeIndex,
    destination: instance.destinations[instance.activeIndex] || null,
    total: instance.destinations.length,
  };
}

/** Check if tour is active */
export function isTourActive() {
  return instance !== null && instance.state !== STATES.INACTIVE;
}

function clearTimers() {
  if (!instance) return;
  instance.timers.forEach(t => clearTimeout(t));
  instance.timers = [];
}

export const TOUR_STATES = STATES;
