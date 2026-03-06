// Globe Tour — Chapter-aware state machine for cinematic globe tour
// States: INACTIVE → STARTING → TOURING → ENDING → INACTIVE

const STATES = { INACTIVE: 0, STARTING: 1, TOURING: 2, ENDING: 3 };

let instance = null;

/**
 * Start a chapter-based globe tour.
 * @param {Object} config
 * @param {Array} config.chapters - Array of chapter objects from tourChapters.js
 * @param {Function} config.pointOfView - (pov, duration) => void
 * @param {Function} config.onNarration - ({ text, expression, attribution? }) => void
 * @param {Function} config.onChapterChange - (chapter, chapterIndex) => void
 * @param {Function} config.onComplete - () => void
 * @param {number} [config.transitTime=3500] - camera transit ms between chapters
 * @param {boolean} [config.autoAdvance=true]
 * @param {number} [config.startChapter=0]
 */
export function startTour(config) {
  if (instance) endTour();

  const {
    chapters,
    pointOfView,
    onNarration,
    onChapterChange,
    onComplete,
    transitTime = 3500,
    autoAdvance = true,
    startChapter = 0,
  } = config;

  instance = {
    state: STATES.STARTING,
    chapters,
    pointOfView,
    onNarration,
    onChapterChange,
    onComplete,
    transitTime,
    autoAdvance,
    activeChapter: -1,
    activeNarrationIndex: 0,
    timers: [],
  };

  // Jump straight to first chapter
  instance.state = STATES.TOURING;
  navigateToChapter(startChapter);

  return instance;
}

/**
 * Navigate to a specific chapter by index.
 */
export function navigateToChapter(index) {
  if (!instance || instance.state < STATES.TOURING) return;
  const { chapters, pointOfView, onNarration, onChapterChange, transitTime, autoAdvance } = instance;

  if (index < 0 || index >= chapters.length) return;

  clearTimers();

  instance.activeChapter = index;
  instance.activeNarrationIndex = 0;

  const chapter = chapters[index];
  const chapterAlt = chapter.camera?.altitude ?? 1.5;
  const chapterDwell = chapter.dwell ?? 10000;
  const chapterSpin = chapter.camera?.spin ?? false;

  // Notify chapter change
  onChapterChange(chapter, index);

  // Navigate camera to first destination (if any)
  if (chapter.destinations.length > 0) {
    const dest = chapter.destinations[0];
    pointOfView({ lat: dest.lat, lng: dest.lng, altitude: chapterAlt }, transitTime);
  } else if (chapterSpin) {
    // No destination — just set altitude for free-spin
    pointOfView({ altitude: chapterAlt }, transitTime);
  }

  // Start narration after camera settles
  const narrateDelay = chapter.destinations.length > 0 ? transitTime + 300 : 800;
  const narrateTimer = setTimeout(() => {
    if (!instance || instance.activeChapter !== index) return;
    startNarrationCycle(index);
  }, narrateDelay);
  instance.timers.push(narrateTimer);

  // If multi-destination chapter, navigate to second destination midway through dwell
  if (chapter.destinations.length > 1) {
    const midTimer = setTimeout(() => {
      if (!instance || instance.activeChapter !== index) return;
      const dest2 = chapter.destinations[1];
      pointOfView({ lat: dest2.lat, lng: dest2.lng, altitude: chapterAlt }, transitTime * 0.7);
    }, narrateDelay + Math.floor(chapterDwell * 0.45));
    instance.timers.push(midTimer);
  }

  // Auto-advance to next chapter after dwell
  if (autoAdvance) {
    const advanceTimer = setTimeout(() => {
      if (!instance || instance.activeChapter !== index) return;
      if (index < chapters.length - 1) {
        navigateToChapter(index + 1);
      } else {
        finishTour();
      }
    }, narrateDelay + chapterDwell);
    instance.timers.push(advanceTimer);
  }
}

/**
 * Cycle through narration lines within a chapter.
 */
function startNarrationCycle(chapterIndex) {
  if (!instance || instance.activeChapter !== chapterIndex) return;

  const chapter = instance.chapters[chapterIndex];
  const narration = chapter.narration;
  if (!narration || narration.length === 0) return;

  // Show first narration line
  const lineIdx = instance.activeNarrationIndex;
  if (lineIdx < narration.length) {
    instance.onNarration(narration[lineIdx]);
  }

  // Schedule subsequent lines
  if (narration.length > 1) {
    const chapterDwell = chapter.dwell ?? 10000;
    const interval = Math.floor(chapterDwell / narration.length);

    for (let i = 1; i < narration.length; i++) {
      const timer = setTimeout(() => {
        if (!instance || instance.activeChapter !== chapterIndex) return;
        instance.activeNarrationIndex = i;
        instance.onNarration(narration[i]);
      }, interval * i);
      instance.timers.push(timer);
    }
  }
}

/** Navigate to next chapter */
export function nextChapter() {
  if (!instance) return;
  const next = instance.activeChapter + 1;
  if (next < instance.chapters.length) {
    navigateToChapter(next);
  } else {
    finishTour();
  }
}

/** Navigate to previous chapter */
export function prevChapter() {
  if (!instance) return;
  const prev = instance.activeChapter - 1;
  if (prev >= 0) {
    navigateToChapter(prev);
  }
}

/** Internal: finish tour with outro */
function finishTour() {
  if (!instance) return;
  clearTimers();
  instance.state = STATES.ENDING;

  const { onComplete } = instance;
  const t = setTimeout(() => {
    if (onComplete) onComplete();
    instance = null;
  }, 2000);
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
  if (!instance) return { state: STATES.INACTIVE, activeChapter: -1, chapter: null, total: 0 };
  return {
    state: instance.state,
    activeChapter: instance.activeChapter,
    chapter: instance.chapters[instance.activeChapter] || null,
    total: instance.chapters.length,
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

// Legacy aliases for backward compat with Home.jsx pill handlers
export const nextDestination = nextChapter;
export const prevDestination = prevChapter;

export const TOUR_STATES = STATES;
