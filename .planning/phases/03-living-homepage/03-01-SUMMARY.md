---
phase: 03-living-homepage
plan: 01
subsystem: ui
tags: [daily-engine, time-of-day, moon-phase, glsl, css-custom-properties, atmosphere]

# Dependency graph
requires: []
provides:
  - "dailySeed.js: deterministic daily content rotation (dailySeed, dailyPick, dailyPickN, dailyShuffle)"
  - "astro.js: moon phase/illumination and time-of-day phase calculations"
  - "timeOfDay.js: CSS custom property application for 5 atmospheric phases"
  - "dailyPrompts.js: 60 creative prompts for daily rotation (4 modes)"
  - "uMoonIllumination uniform in globe shaders (particles + nebula)"
  - "--tod-* CSS custom property infrastructure on :root"
affects: [03-02, 03-03, living-homepage, today-layer, daily-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [daily-seed-rotation, time-of-day-css-vars, moon-phase-shader-uniform]

key-files:
  created:
    - src/utils/dailySeed.js
    - src/utils/astro.js
    - src/utils/timeOfDay.js
    - src/data/dailyPrompts.js
  modified:
    - src/index.css
    - src/pages/Home.jsx
    - src/pages/Home.css

key-decisions:
  - "Used djb2 hash + mulberry32 PRNG for daily seed -- zero dependencies, deterministic"
  - "Used box-shadow inset overlay for tod-glass-tint instead of color-mix() for broader browser support"
  - "Moon illumination modulates both nebula glow (0.6x-1.2x) and particle brightness (0.7x-1.15x) via shared uniform"

patterns-established:
  - "Daily seed pattern: dailyPick(array, namespace) for deterministic daily content selection"
  - "Time-of-day CSS custom properties: --tod-* vars set by JS, consumed by CSS for atmospheric shifts"
  - "Moon uniform pattern: uMoonIllumination shared uniform flows from sharedUniforms to all globe shaders"

requirements-completed: [TODAY-01, TODAY-02, TODAY-03, DAILY-01]

# Metrics
duration: 7min
completed: 2026-03-21
---

# Phase 03 Plan 01: Daily Engine & Time-of-Day Atmosphere Summary

**Deterministic daily seed rotation, 5-phase time-of-day CSS atmosphere, moon-phase-driven globe nebula/particle modulation, and 60 creative prompts for daily content rotation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-21T05:23:19Z
- **Completed:** 2026-03-21T05:30:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created dailySeed.js with djb2 hash + mulberry32 PRNG for deterministic "same day = same content" rotation
- Created astro.js with pure-math moon phase, illumination, and time-of-day phase calculations (no dependencies)
- Created timeOfDay.js with 5-phase CSS custom property system (dawn/day/golden-hour/dusk/night)
- Created 60 creative prompts across 4 modes (write/sketch/build/dream) for daily rotation
- Wired applyTimeOfDay() into Home.jsx with 60-second refresh interval for smooth transitions
- Added uMoonIllumination to globe sharedUniforms, particle shader, and prismGlow (nebula) shader
- Added --tod-* CSS custom property defaults, atmospheric wash pseudo-element, glass-panel tint, and reduced-motion support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dailySeed, astro, timeOfDay utility modules and daily prompts data** - `9b4a6ed` (feat)
2. **Task 2: Wire time-of-day atmosphere into homepage and moon phase into globe shader** - `84823e7` (feat)

## Files Created/Modified
- `src/utils/dailySeed.js` - Deterministic daily content rotation (djb2 + mulberry32 PRNG)
- `src/utils/astro.js` - Moon phase, illumination, time-of-day phase calculations
- `src/utils/timeOfDay.js` - CSS custom property application for 5 atmospheric phases
- `src/data/dailyPrompts.js` - Pool of 60 creative prompts (15 per mode)
- `src/index.css` - Added --tod-* defaults, .app-container::before wash, glass-panel tint, reduced-motion
- `src/pages/Home.jsx` - Imports, applyTimeOfDay useEffect, uMoonIllumination in shaders
- `src/pages/Home.css` - tod-shadow-softness on bento-cell, tod-text-glow on hero title, reduced-motion

## Decisions Made
- Used djb2 hash + mulberry32 PRNG for daily seed: zero dependencies, well-known deterministic algorithms
- Used box-shadow inset overlay for glass tint instead of color-mix(): broader browser compatibility while achieving the same visual effect
- Moon illumination modulates both nebula (prismGlow) and particles via shared uniform reference, keeping a single source of truth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- First vite build attempt hit EPERM on dist directory cleanup (likely contention with parallel agent); resolved on retry

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Daily seed infrastructure ready for Plan 02 (Today Rail) to use dailyPick for content selection
- Time-of-day CSS vars available for all future components to inherit atmospheric awareness
- Moon illumination uniform available for any future globe shader enhancements
- 60 creative prompts ready for the Creative Prompt card in the Today Rail

## Self-Check: PASSED

- All 5 created files verified present on disk
- Both task commits (9b4a6ed, 84823e7) verified in git history

---
*Phase: 03-living-homepage*
*Completed: 2026-03-21*
