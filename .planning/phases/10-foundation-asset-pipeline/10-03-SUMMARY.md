---
phase: 10-foundation-asset-pipeline
plan: "03"
subsystem: ui
tags: [r3f, three.js, webgl, shader, depth-displacement, parallax, ken-burns, gyroscope]

# Dependency graph
requires:
  - phase: 10-foundation-asset-pipeline (Plan 01)
    provides: CapsuleShell with SplatRenderer, DisplacedMeshRenderer stub, ParallaxFallback placeholder
  - phase: 10-foundation-asset-pipeline (Plan 02)
    provides: memoryScenes registry with depthConfig shape, gpuCapability 3-tier detection
provides:
  - DisplacedMeshRenderer with custom ShaderMaterial (vertex displacement + fragment discard)
  - Multi-layer Ken Burns ParallaxFallback with gyroscope support
  - Explicit tier-based renderer routing (parallax → displaced-mesh → splat → fallback)
affects: [phase-11-cinematic-polish, phase-12-flagship-scene]

# Tech tracking
tech-stack:
  added: []
  patterns: [depth-displaced-mesh-shader, multi-layer-parallax-fallback, tier-based-renderer-routing]

key-files:
  created: []
  modified:
    - src/pages/CapsuleShell.jsx
    - src/pages/MemoryPortal.css

key-decisions:
  - "Fragment discard uses dFdx/dFdy screen-space derivatives with smoothstep alpha fade band for anti-aliased depth discontinuity edges"
  - "ParallaxFallback uses two layers from same image (dimmed background + brighter foreground) with differential parallax speeds for depth illusion"
  - "Tier routing uses explicit if/else chain (parallax → displaced-mesh → splat → unknown fallback) instead of derived boolean flags"

patterns-established:
  - "Depth displacement shader: vertex shader samples depth map + displaces Z, fragment shader discards edges via dFdx/dFdy"
  - "Multi-layer parallax: foreground moves ~2.3x faster than background for depth illusion without WebGL"

requirements-completed: [DEPTH-01, DEPTH-02, DEPTH-03, SHELL-03]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 10 Plan 03: Displaced Mesh Renderer + Parallax Fallback Summary

**Depth-displaced 3D mesh renderer with custom vertex/fragment shaders, multi-layer Ken Burns parallax fallback with gyroscope, and explicit tier-based renderer routing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T08:15:26Z
- **Completed:** 2026-03-23T08:19:50Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- DisplacedMeshRenderer creates a subdivided PlaneGeometry displaced along Z by depth map values, with per-scene tuning uniforms (depthScale, depthBias, depthContrast, discardThreshold)
- Fragment shader discards rubber-sheet edges at depth discontinuities using dFdx/dFdy derivatives with smoothstep alpha fade for anti-aliasing
- ParallaxFallback upgraded to multi-layer experience: background (dimmed, slower parallax) + foreground (brighter, faster parallax) with Ken Burns zoom oscillation and gyroscope support
- CapsuleShell render routing cleanly chains tier check → parallax → displaced-mesh → splat → unknown fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement DisplacedMeshRenderer with custom ShaderMaterial** - `7603e2b` (feat)
2. **Task 2: Upgrade ParallaxFallback to multi-layer Ken Burns** - `fcffe1b` (feat)
3. **Task 3: Wire displaced-mesh tier routing** - `8e17324` (feat)

## Files Created/Modified
- `src/pages/CapsuleShell.jsx` - DisplacedMeshRenderer (vertex/fragment shaders, DisplacedPlane, SlowDrift), upgraded ParallaxFallback (multi-layer, gyroscope), explicit tier routing
- `src/pages/MemoryPortal.css` - Multi-layer parallax CSS (.memory-portal__layer-bg, .memory-portal__layer-fg with mask-image)

## Decisions Made
- Fragment discard uses dFdx/dFdy screen-space derivatives with smoothstep alpha fade band -- provides anti-aliased edge transitions at depth discontinuities without hard cutoffs
- ParallaxFallback uses two layers from the same image with differential parallax speeds -- avoids need for pre-separated depth layers while still providing compelling depth illusion
- Tier routing refactored to explicit if/else chain -- clearer control flow with explicit unknown-renderMode fallback case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 complete (all 3 plans done) -- CapsuleShell, GPU tier detection, asset validation, displaced mesh renderer, and parallax fallback all in place
- Ready for Phase 11 (Cinematic Polish) -- camera choreography, atmosphere, particles, color grading can layer on top of the displaced mesh foundation
- SlowDrift camera provides visual validation; Phase 11 GSAP choreography will replace it

---
*Phase: 10-foundation-asset-pipeline*
*Completed: 2026-03-23*
