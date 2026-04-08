---
phase: 09-visual-cohesion
plan: 01
subsystem: ui
tags: [react, constellation, holiday-calendar, todayrail, deep-link]

# Dependency graph
requires:
  - phase: 01-constellation
    provides: constellation node IDs (ms-, cm-, ig-, fb- prefixes)
provides:
  - nodeId field on 20 T3+ holiday entries mapping to constellation nodes
  - conditional Explore deep-link in TodayRail Today State card
affects: [homepage, constellation, todayrail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional CTA rendering based on data availability (nodeId present vs absent)"
    - "Holiday-to-constellation mapping via nodeId field on calendar entries"

key-files:
  created: []
  modified:
    - src/data/holidayCalendar.js
    - src/components/TodayRail.jsx

key-decisions:
  - "Added 20 nodeId mappings (plan suggested 15-20), covering all major T3+ holidays with meaningful constellation connections"
  - "Removed FEATURED_NODES placeholder array entirely rather than keeping as fallback"

patterns-established:
  - "Holiday-constellation linking: T3+ entries with nodeId field drive conditional deep-links"
  - "Graceful degradation: nodeId -> deep-link, greeting -> text display, no holiday -> generic CTA"

requirements-completed: [VISUAL-01]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 09 Plan 01: TodayRail Holiday-to-Constellation Deep-Link Summary

**20 T3+ holidays mapped to constellation nodes with conditional "Explore in constellation" deep-link in TodayRail**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T03:40:02Z
- **Completed:** 2026-03-22T03:44:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added nodeId field to 20 T3+ holiday entries, each mapping to a verified constellation node ID
- Replaced static "Explore today" link with conditional deep-link: holidays with nodeId go directly to `/constellation/{nodeId}`
- Removed FEATURED_NODES placeholder array and featuredNode from todayData useMemo
- Graceful degradation: holidays without nodeId show greeting text; no-holiday state shows generic explore link

## Task Commits

Each task was committed atomically:

1. **Task 1: Add nodeId mappings to T3+ holidays** - `19b81e7` (feat)
2. **Task 2: Add conditional Explore link to TodayRail** - `c9d983a` (feat)

## Files Created/Modified
- `src/data/holidayCalendar.js` - Added nodeId field to 20 T3+ holiday entries (New Year, Valentine's, Birthday, Pi Day, Cosmonautics Day, Earth Day, Star Wars Day, Mother's Day, Geek Pride Day, Father's Day, Summer Solstice, Independence Day, Video Game Day, Moon Landing Day, Rollercoaster Day, Star Trek Day, Programmers' Day, Halloween, Thanksgiving, Christmas)
- `src/components/TodayRail.jsx` - Conditional constellation deep-link, removed FEATURED_NODES array and featuredNode reference

## Decisions Made
- Added 20 nodeId mappings (plan target was 15-20) -- all have meaningful thematic connections to constellation nodes
- Removed FEATURED_NODES placeholder entirely rather than retaining as additional fallback content
- Used holiday.greeting as fallback text for holidays without nodeId, preserving the card's content feel

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TodayRail now connects homepage to constellation for 20 major holidays
- Ready for Phase 09 Plan 02 (Starseed visual cohesion)

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 09-visual-cohesion*
*Completed: 2026-03-22*
