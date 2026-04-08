---
phase: 12-flagship-scene-portal
plan: "03"
subsystem: ui
tags: [portal, vfx, gsap, react-router, capsule, transitions, sessionStorage]

# Dependency graph
requires:
  - phase: 12-flagship-scene-portal (plans 01-02)
    provides: ArcController with awakening/recession, SAM layer separation, narrative glass cards, recessionDone state, PortalVFX component
provides:
  - Full portal entry VFX sequence for memory capsule navigation (seep->gathering->rupture->emerging->residual)
  - Reverse portal exit VFX triggered by recession completion
  - Direct-access detection via sessionStorage flag for graceful awakening shortening
  - Dev test button for end-to-end portal flow verification
affects: [13-integration-expansion, flagship-photo-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sessionStorage flag for distinguishing portal entry from direct URL access"
    - "Reverse portal phases (residual->emerging->rupture->gathering) for exit transitions"
    - "Navigation at rupture moment — threshold beat pattern for both entry and exit"

key-files:
  created: []
  modified:
    - src/pages/Home.jsx
    - src/pages/CapsuleShell.jsx
    - src/data/memoryScenes.js

key-decisions:
  - "Portal entry navigates at rupture phase (not before), matching existing Glint portal pattern"
  - "Exit portal uses center origin (50%,50%) since there is no click point for exit"
  - "Back button on arc-enabled scenes triggers setRecessionDone(true) for two-stage exit"
  - "Direct URL access shortens awakening to 1.5s with 0 delay (vs 3.5s with 0.5s delay via portal)"

patterns-established:
  - "sessionStorage jarowe_portal_entry flag: set before portal sequence, read+cleared on CapsuleShell mount"
  - "Conditional Back link: arc scenes use button+recession, non-arc scenes use Link"

requirements-completed: [PORT-03]

# Metrics
duration: 7min
completed: 2026-03-23
---

# Phase 12 Plan 03: Portal Entry/Exit Transitions Summary

**Full PortalVFX entry/exit wired into capsule navigation with sessionStorage direct-access detection and dev test button**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-23T14:46:14Z
- **Completed:** 2026-03-23T14:53:29Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Portal entry uses full 5-phase PortalVFX sequence before navigating to capsule route; navigation fires at the rupture moment
- Reverse portal exit triggered after recession completes (two-stage: content fades via recession, then portal closes)
- Direct URL access vs portal entry distinguished via sessionStorage flag, with shortened awakening for direct access
- Dev-only test button in bottom-left for end-to-end portal flow verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire portal entry transition for memory capsule navigation** - `a142a51` (feat)
2. **Task 2: Add portal exit transition triggered by recession completion** - `f7d9dfc` (feat)
3. **Task 3: Add portalEntry flag to scene registry for entry detection** - `9594f97` (feat)

## Files Created/Modified
- `src/pages/Home.jsx` - handleMemoryPointClick now runs full portal VFX sequence; dev test button added
- `src/pages/CapsuleShell.jsx` - Portal exit state, reverse portal after recession, conditional Back button, directAccess prop threading
- `src/data/memoryScenes.js` - portalEntry boolean field on scene entries, JSDoc update

## Decisions Made
- Portal entry navigates at rupture phase (not before), matching the existing Glint portal pattern
- Exit portal uses center origin (50%, 50%) since exit has no specific click point
- Back button on arc-enabled scenes triggers recession -> portal exit flow rather than immediate navigation
- Direct URL access shortens awakening to 1.5s with 0 delay (vs 3.5s + 0.5s delay when entered via portal)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 is now complete (all 3 plans done)
- The full capsule experience arc works end-to-end: portal entry -> awakening -> narrative -> recession -> portal exit -> home
- Ready for Phase 13 (Integration + Expansion) or milestone completion
- Real flagship photo can be swapped in by replacing test-capsule assets and updating memoryScenes.js

---
*Phase: 12-flagship-scene-portal*
*Completed: 2026-03-23*
