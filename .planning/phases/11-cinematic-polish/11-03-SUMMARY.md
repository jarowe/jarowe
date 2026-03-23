---
phase: 11-cinematic-polish
plan: "03"
subsystem: audio
tags: [howler, audio-ducking, capsule, soundtrack, cross-fade]

# Dependency graph
requires:
  - phase: 11-cinematic-polish (plans 01-02)
    provides: CapsuleShell with CinematicCamera, AtmosphericParticles, CapsulePostProcessing, color grading
provides:
  - Capsule-level GlobalPlayer ducking (duckForCapsule/restoreFromCapsule) in AudioContext
  - Per-scene soundtrack with cross-fade on exit in CapsuleShell
  - Test-capsule scene with soundtrack path in memoryScenes.js
affects: [12-flagship-scene, capsule-shell, audio-system]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Capsule duck/restore pattern separate from node-level ducking", "Cross-fade cleanup with setTimeout-delayed unload"]

key-files:
  created: []
  modified:
    - src/context/AudioContext.jsx
    - src/data/memoryScenes.js
    - src/pages/CapsuleShell.jsx

key-decisions:
  - "Capsule ducking is separate from node-level ducking (duckForCapsule vs duckForNodeAudio) -- different target volumes (0.15 vs 0) and different lifecycle (route-level vs panel-level)"
  - "Use Howler.volume() getter instead of React state for pre-duck capture -- avoids stale closure bugs"
  - "Soundtrack unload delayed 1600ms after 1500ms fade-out to prevent audio cut"

patterns-established:
  - "Capsule duck/restore: route-level audio ducking via useEffect mount/cleanup"
  - "Cross-fade cleanup: fade out → setTimeout → unload prevents abrupt audio cut"

requirements-completed: [PORT-02, PORT-04]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 11 Plan 03: Soundtrack Integration + GlobalPlayer Ducking Summary

**Per-scene Howler.js soundtrack with user-intent fade-in, GlobalPlayer capsule ducking to 0.15, and cross-fade cleanup preventing audio gaps on exit**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T09:01:11Z
- **Completed:** 2026-03-23T09:04:43Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added capsule-level duck/restore methods to AudioContext (separate from node-level ducking, targets 0.15 volume not silence)
- Set test-capsule soundtrack path in memoryScenes.js enabling the full audio pipeline to be tested
- Integrated GlobalPlayer ducking lifecycle into CapsuleShell (duck on mount, restore on unmount) with null-safe audio context guards
- Improved soundtrack cleanup with 1.5s cross-fade out and delayed unload preventing abrupt audio cuts
- Added console warning on soundtrack load failure for debugging

## Task Commits

Each task was committed atomically:

1. **Task 01: Add duck/restore capsule methods to AudioContext** - `13d4ec9` (feat)
2. **Task 02: Add soundtrack field to test-capsule scene** - `7ded0ff` (feat)
3. **Task 03: Integrate GlobalPlayer ducking into CapsuleShell lifecycle** - `cecde9e` (feat)

## Files Created/Modified
- `src/context/AudioContext.jsx` - Added capsuleDuckedRef, preDuckVolumeRef, duckForCapsule(), restoreFromCapsule() and exported in context value
- `src/data/memoryScenes.js` - Set test-capsule soundtrack to 'memory/test-capsule/soundtrack.mp3'
- `src/pages/CapsuleShell.jsx` - Added useAudio import, ducking useEffect, improved soundtrack cleanup with cross-fade, delayed mute state on fade-out

## Decisions Made
- Capsule ducking uses separate refs from node-level ducking (capsuleDuckedRef vs duckedRef) because they serve different use cases with different target volumes
- Pre-duck volume captured via Howler.volume() getter rather than React `volume` state to avoid stale closure bugs
- Soundtrack unload delayed by 1600ms (100ms after 1500ms fade) to ensure audio fades completely before destroying the Howl instance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 (Cinematic Polish) is complete with all 3 plans done
- CapsuleShell now has: CinematicCamera, AtmosphericParticles, CapsulePostProcessing, color grading, soundtrack integration, and GlobalPlayer ducking
- Ready for Phase 12 (Flagship Scene + Portal) which validates the full capsule experience with a real Jared memory

---
*Phase: 11-cinematic-polish*
*Completed: 2026-03-23*
