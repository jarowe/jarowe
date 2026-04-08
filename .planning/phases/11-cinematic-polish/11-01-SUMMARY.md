---
phase: 11-cinematic-polish
plan: "01"
subsystem: ui
tags: [gsap, r3f, camera, animation, three.js]

# Dependency graph
requires:
  - phase: 10-foundation-asset-pipeline
    provides: DisplacedMeshRenderer, memoryScenes.js registry, SlowDrift camera stub
provides:
  - CinematicCamera component with GSAP multi-beat keyframe choreography
  - Per-scene cameraKeyframes and mood fields in scene registry
  - Mouse/gyro parallax response layered on camera keyframes
affects: [11-cinematic-polish, 12-flagship-scene-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GSAP timeline with repeat:-1 for infinite camera loop
    - Per-scene cameraKeyframes array in memoryScenes.js registry
    - Mouse/gyro parallax offset layered on GSAP-driven base position

key-files:
  created: []
  modified:
    - src/data/memoryScenes.js
    - src/pages/CapsuleShell.jsx

key-decisions:
  - "CinematicCamera uses GSAP timeline with repeat:-1 for gentle infinite loop — last keyframe transitions back to first with crossfade"
  - "Camera beat timing coarsely aligned to narrative card delays (2s, 6s, 11s) — camera motion changes coincide with card reveals"

patterns-established:
  - "Per-scene cameraKeyframes stored in memoryScenes.js — camera motion is part of the memory itself, not generic renderer behavior"
  - "Mouse/gyro parallax via PARALLAX_STRENGTH constant (0.05) added on top of GSAP base position in useFrame"

requirements-completed:
  - CINE-01
  - CINE-02

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 11 Plan 01: Cinematic Camera Choreography Summary

**GSAP-driven multi-beat CinematicCamera replaces SlowDrift with per-scene keyframe choreography, easing variety, infinite loop, and mouse/gyro parallax**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T08:45:56Z
- **Completed:** 2026-03-23T08:49:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended memoryScenes.js with cameraKeyframes (3 beats) and mood fields for both scene entries
- Replaced SlowDrift with CinematicCamera: GSAP timeline, multi-beat keyframes, easing variety (power1.out, power2.inOut, sine.inOut)
- Camera beat timing aligned to narrative card delays (2s, 6s, 11s)
- Mouse/gyro parallax layered on top of keyframe path
- Infinite loop with gentle crossfade back to start position

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend memoryScenes.js with cameraKeyframes and mood fields** - `f9b75b0` (feat)
2. **Task 2: Replace SlowDrift with CinematicCamera component using GSAP timeline** - `1a2b501` (feat)

## Files Created/Modified
- `src/data/memoryScenes.js` - Added cameraKeyframes array (3 beats) to test-capsule, mood fields to both scenes, JSDoc for keyframe shape
- `src/pages/CapsuleShell.jsx` - Replaced SlowDrift with CinematicCamera (GSAP timeline, parallax, no OrbitControls), added gsap import

## Decisions Made
- CinematicCamera uses GSAP timeline with repeat:-1 for gentle infinite loop — last keyframe transitions back to first
- Camera beat timing coarsely aligned to narrative card delays — not frame-exact, but camera motion changes feel coupled to card reveals
- PARALLAX_STRENGTH of 0.05 provides subtle mouse/gyro response without overwhelming the keyframe path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CinematicCamera component is ready for 11-02 (atmosphere particles + postprocessing) and 11-03 (soundtrack integration)
- DisplacedMeshRenderer will be rewritten in 11-02 Task 04 with particles, postprocessing, and vignette — CinematicCamera definition carries forward

---
*Phase: 11-cinematic-polish*
*Completed: 2026-03-23*
