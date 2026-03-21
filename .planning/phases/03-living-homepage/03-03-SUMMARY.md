---
phase: 03-living-homepage
plan: 03
subsystem: ui
tags: [react, view-transitions, today-rail, daily-content, framer-motion, lucide-react]

# Dependency graph
requires:
  - "03-01: dailySeed.js, astro.js, dailyPrompts.js (daily content rotation, moon phase, time-of-day)"
  - "03-02: Starseed hub at /starseed (CTA target for creative prompt card)"
provides:
  - "TodayRail component with 3 living cards (Today State, Glint Invitation, Creative Prompt)"
  - "viewTransitions.js: navigateWithTransition, withViewTransition, setupGlobalViewTransitions"
  - "Global View Transitions API interceptor wrapping all React Router Link navigations"
  - "::view-transition-old/new CSS animations with reduced-motion support"
affects: [04-glint-operator, 05-starseed-content, daily-engine, homepage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global click interceptor for View Transitions (capture phase, delegated)"
    - "data-no-view-transition attribute as opt-out escape hatch"
    - "TodayRail daily content via dailyPick with namespaced rotation"

key-files:
  created:
    - src/components/TodayRail.jsx
    - src/components/TodayRail.css
    - src/utils/viewTransitions.js
  modified:
    - src/pages/Home.jsx
    - src/pages/Home.css
    - src/App.jsx

key-decisions:
  - "3 cards instead of 4: Glint Thought and Progress Signal are Phase 4/6 -- combined into a Glint Invitation placeholder"
  - "Global view transition interceptor at document level (capture phase) rather than per-Link wrapping"
  - "View transition CSS in Home.css since it is always loaded (move to global app.css if one is created)"

patterns-established:
  - "TodayRail pattern: useMemo for daily content selection, stable for session, re-mounts on reload"
  - "View Transitions pattern: setupGlobalViewTransitions(navigate) in AppContent useEffect"
  - "Opt-out pattern: data-no-view-transition attribute on any anchor to skip view transition"

requirements-completed: [TODAY-01, TODAY-07, DAILY-02]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 03 Plan 03: Today Rail + View Transitions Summary

**3-card Today Rail (date/holiday/featured node + Glint invitation + creative prompt with mode chip) above bento grid, plus global View Transitions API cross-fade on all React Router navigations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T05:34:02Z
- **Completed:** 2026-03-21T05:37:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Built TodayRail component with 3 living cards: Today State (date, holiday, featured constellation node), Glint Invitation (daily-rotating line, Ask Glint CTA), Creative Prompt (dailyPick from 60 prompts, mode chip, Start in Starseed CTA)
- Created viewTransitions.js utility with navigateWithTransition, withViewTransition, and setupGlobalViewTransitions (global click interceptor)
- Integrated TodayRail above bento grid in Home.jsx, hidden during tour cinematic mode
- Wired global View Transitions into AppContent (App.jsx) so ALL React Router Link clicks get cross-fade animation on supported browsers

## Task Commits

Each task was committed atomically:

1. **Task 1: Build TodayRail component with 3 living cards** - `781b932` (feat)
2. **Task 2: Integrate TodayRail into homepage and add global View Transitions** - `12b57c1` (feat)

## Files Created/Modified
- `src/components/TodayRail.jsx` - Today Rail component with 3 living cards (Today State, Glint Invitation, Creative Prompt)
- `src/components/TodayRail.css` - Glass card styling, responsive breakpoints (3-col/2-col/stacked), mode chip colors, focus-visible, reduced-motion
- `src/utils/viewTransitions.js` - View Transitions API wrapper with global click interceptor, graceful fallback
- `src/pages/Home.jsx` - TodayRail import and render above bento-container (guarded by !tourCinematic)
- `src/pages/Home.css` - Reduced bento-container top padding, ::view-transition animations, reduced-motion support
- `src/App.jsx` - useNavigate + setupGlobalViewTransitions useEffect in AppContent

## Decisions Made
- Used 3 cards instead of 4 as specified in plan: Glint Thought (Phase 4) and Progress Signal (Phase 6) are future requirements, so Card 2 is a Glint Invitation placeholder
- Global view transition interceptor uses capture phase on document for maximum coverage of all Link clicks
- View transition CSS placed in Home.css since it is always loaded; can be moved to a global CSS file if one is created later
- Reduced bento-container top padding from 4rem to 2rem to accommodate TodayRail visual space above the grid

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TodayRail is ready for Phase 4 to replace Glint Invitation card with real Glint Thought of the Day
- viewTransitions.js exports are available for imperative navigate() calls to opt in via navigateWithTransition
- Creative Prompt card CTA links to /starseed, ready for Phase 5 to wire to scratchpad/canvas with prompt pre-loaded
- FEATURED_NODES array is hardcoded -- Phase 5 can replace with real constellation data pull

## Self-Check: PASSED

- All 4 created files verified present on disk
- Both task commits (781b932, 12b57c1) verified in git history

---
*Phase: 03-living-homepage*
*Completed: 2026-03-21*
