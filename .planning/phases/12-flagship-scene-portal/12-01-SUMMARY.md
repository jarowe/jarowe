---
phase: 12-flagship-scene-portal
plan: 01
subsystem: ui
tags: [glsl, gsap, three.js, shader, r3f, memory-capsule]

# Dependency graph
requires:
  - phase: 11-cinematic-polish
    provides: CapsuleShell with DisplacedMeshRenderer, CinematicCamera, AtmosphericParticles, CapsulePostProcessing, soundtrack ducking
provides:
  - SAM mask-driven layer separation in displaced mesh shader (foreground/background at different depth scales)
  - Experience arc system: awakening (depth 0->target) and recession (depth target->0 + warm white fade) via GSAP
  - DisplacedPlane forwardRef exposing uniforms for external animation
  - Scene registry arc configuration (timing, easing, fade color per scene)
affects: [12-02, 12-03, 13-integration-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ArcController component: GSAP timeline pair (awakening + recession) animating shader uniforms from R3F Canvas tree"
    - "forwardRef + useImperativeHandle to expose shader uniforms from DisplacedPlane to parent components"
    - "SAM mask uniform with smoothstep blending for soft foreground/background depth separation"

key-files:
  created: []
  modified:
    - src/data/memoryScenes.js
    - src/pages/CapsuleShell.jsx

key-decisions:
  - "SAM mask blending uses smoothstep(0.4, 0.6, mask) for soft edge transition between foreground/background depth multipliers"
  - "Recession fade implemented in fragment shader (mix toward uRecessionColor) rather than postprocessing pass for tighter per-scene control"
  - "ArcController uses two separate GSAP timelines (awakening + recession) rather than one sequential timeline, enabling independent cleanup"

patterns-established:
  - "ArcController pattern: GSAP timeline animating shader uniforms via forwardRef, with cleanup on unmount"
  - "Scene arc config: per-scene awakening/recession timing, easing, and fade color in memoryScenes.js"

requirements-completed: [ARC-01, ARC-02, ARC-03]

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 12 Plan 01: Experience Arc Summary

**SAM mask layer separation in vertex shader with GSAP-driven awakening (depth 0->target) and recession (depth->0 + warm white fade) experience arc**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T14:22:16Z
- **Completed:** 2026-03-23T14:30:29Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Scene registry extended with samMaskUrl, layerSeparation config, and arc timing/easing/color per scene
- Vertex shader gains SAM mask-driven foreground (1.2x) / background (0.8x) depth separation with soft smoothstep blending
- Fragment shader gains recession fade uniform mixing toward warm white (ARC-03)
- DisplacedPlane wrapped with forwardRef, exposes uniforms via useImperativeHandle for external GSAP animation
- ArcController component drives awakening (0->target depth over 3.5s) and recession (target->0 + fade after 20s delay) as separate GSAP timelines
- CapsuleShell tracks recessionDone state for future portal exit logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SAM mask support and layer separation fields to memoryScenes.js** - `9b9efd1` (feat)
2. **Task 2: Add SAM mask uniform and layer separation to displaced mesh shader** - `16ddacd` (feat)
3. **Task 3: Implement awakening and recession GSAP animations in CapsuleShell** - `8b2a616` (feat)

## Files Created/Modified
- `src/data/memoryScenes.js` - Added samMaskUrl, layerSeparation, arc fields to test-capsule; null defaults to placeholder-scene; JSDoc updated
- `src/pages/CapsuleShell.jsx` - SAM mask + recession uniforms in shaders, forwardRef on DisplacedPlane, ArcController component, recessionDone state in CapsuleShell

## Decisions Made
- SAM mask blending uses smoothstep(0.4, 0.6) for soft edge (not hard threshold) -- prevents visible seam between foreground/background depth zones
- Recession fade in fragment shader (not postprocessing) for per-scene color control
- Two separate GSAP timelines (awakening + recession) for independent lifecycle management

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Experience arc (ARC-01/02/03) fully wired and animatable
- DisplacedPlane uniforms accessible via ref for future editor/tuning (Phase 13)
- recessionDone state ready for portal exit logic in Plan 12-03
- Ready for Plan 12-02 (narrative text overlay system)

---
*Phase: 12-flagship-scene-portal*
*Completed: 2026-03-23*
