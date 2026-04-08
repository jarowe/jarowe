---
phase: 03-living-homepage
plan: 02
subsystem: ui
tags: [react, react-router, framer-motion, lucide-react, campaign-shell, starseed]

# Dependency graph
requires: []
provides:
  - "/starseed branded hub route with campaign-shell pattern"
  - "Starseed visual identity (gold accent, warm dark background, distinct chrome)"
  - "Homepage cell pointing to /starseed"
  - "Navbar Starseed link with Sparkles icon"
affects: [05-starseed-content, starseed-labs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Campaign-shell pattern for branded sub-routes (own nav, hide main Navbar)"
    - "isStarseedRoute detection in AppContent for chrome hiding"

key-files:
  created:
    - src/pages/Starseed.jsx
    - src/pages/Starseed.css
  modified:
    - src/App.jsx
    - src/components/Navbar.jsx
    - src/components/Navbar.css
    - src/pages/Home.jsx

key-decisions:
  - "Hide main Navbar on /starseed routes via isStarseedRoute in AppContent (campaign-shell pattern)"
  - "Replace Workshop nav link with Starseed link using gold Sparkles icon"
  - "Rebrand homepage Workshop cell to Starseed with gold gradient badge and warm sepia filter"

patterns-established:
  - "Starseed visual identity: gold #dbb978 accent, warm dark #080810 background, gold-tinted glass panels"
  - "data-brand='starseed' attribute on shell root for CSS scoping"

requirements-completed: [STAR-01, STAR-03, STAR-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 03 Plan 02: Starseed Hub Summary

**Branded /starseed hub route with gold visual identity, campaign-shell chrome, 3 project cards, and homepage cell integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T05:22:35Z
- **Completed:** 2026-03-21T05:25:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created standalone Starseed branded hub page with distinct gold visual identity separate from jarowe.com purple
- Registered /starseed route with lazy loading and campaign-shell pattern (main Navbar hidden)
- Added Starseed link to Navbar with Sparkles icon and gold accent styling
- Rebranded homepage Workshop cell to Starseed ("Where ideas become real.")

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Starseed branded hub page with campaign-shell pattern** - `9e1a298` (feat)
2. **Task 2: Register Starseed route in App.jsx and add Starseed navigation link** - `a9728cd` (feat)

## Files Created/Modified
- `src/pages/Starseed.jsx` - Branded hub page with own nav chrome, hero, 3 project cards (BEAMY, AMINA, Labs), escape hatch
- `src/pages/Starseed.css` - Gold accent visual identity, warm dark background, responsive layout (217 lines)
- `src/App.jsx` - Lazy Starseed import, /starseed route with Suspense, isStarseedRoute Navbar hiding
- `src/components/Navbar.jsx` - Starseed link with Sparkles icon replacing Workshop link
- `src/components/Navbar.css` - .starseed-nav-link gold accent styles
- `src/pages/Home.jsx` - Workshop cell rebranded to Starseed with gold gradient badge

## Decisions Made
- Hide main Navbar on /starseed routes via isStarseedRoute check in AppContent, giving Starseed full page control with its own internal nav (proven campaign-shell pattern from ReleaseShell)
- Replaced Workshop link in Navbar rather than adding a separate Starseed link, since Starseed supersedes Workshop conceptually
- Kept tools-builds-bg.png as cell background image with sepia filter for warmer Starseed tone (proper hero image deferred to Phase 5)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /starseed route is ready for Phase 5 project cards and content population
- Starseed Labs and AMINA cards show "Coming soon" status, ready for future activation
- Campaign-shell pattern can be extended to nested /starseed/* sub-routes

---
*Phase: 03-living-homepage*
*Completed: 2026-03-21*
