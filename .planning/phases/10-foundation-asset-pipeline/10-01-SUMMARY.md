---
phase: 10-foundation-asset-pipeline
plan: "01"
subsystem: rendering
tags: [webgl, gpu-detection, capsule-shell, three-tier, scene-registry]

requires:
  - phase: 07-immersive-portal
    provides: MemoryPortal splat viewer, scene registry, GPU capability detection, parallax fallback
provides:
  - 3-tier GPU detection (full/simplified/parallax)
  - Renderer-agnostic CapsuleShell replacing MemoryPortal
  - Scene registry with renderMode and displaced-mesh depth fields
  - DisplacedMeshRenderer stub ready for Plan 10-03
affects: [10-02, 10-03, 11-cinematic-polish, 12-flagship-scene]

tech-stack:
  added: []
  patterns:
    - "3-tier GPU detection: getGpuTier() returns 'full' | 'simplified' | 'parallax'"
    - "Scene renderMode routing: CapsuleShell routes to SplatRenderer, DisplacedMeshRenderer, or ParallaxFallback"
    - "Backward-compat wrapper: canRenderSplat() delegates to getGpuTier()"

key-files:
  created:
    - src/pages/CapsuleShell.jsx
  modified:
    - src/utils/gpuCapability.js
    - src/data/memoryScenes.js
    - src/App.jsx

key-decisions:
  - "Extracted SplatRenderer, ParallaxFallback as internal components inside CapsuleShell rather than separate files — keeps capsule self-contained"
  - "Mobile full-tier requires deviceMemory >= 8 (stricter than desktop >= 6) to avoid sustained rendering issues on phones"

patterns-established:
  - "CapsuleShell pattern: renderer-agnostic shell with scene.renderMode x GPU tier routing"
  - "Scene registry shape: renderMode + photoUrl + depthMapUrl + depthConfig fields"

requirements-completed: [DEPTH-04, SHELL-01, SHELL-02]

duration: 5min
completed: 2026-03-23
---

# Phase 10 Plan 01: GPU Tier Detection + CapsuleShell Scaffold Summary

**3-tier GPU detection (full/simplified/parallax), renderer-agnostic CapsuleShell replacing MemoryPortal, and extended scene registry with displaced-mesh support**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T08:00:12Z
- **Completed:** 2026-03-23T08:05:41Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Refactored GPU detection from boolean canRenderSplat() to 3-tier getGpuTier() system with mobile-specific heuristics
- Created CapsuleShell as the renderer-agnostic replacement for MemoryPortal, routing to SplatRenderer, DisplacedMeshRenderer (stub), or ParallaxFallback based on scene.renderMode x GPU tier
- Extended scene registry with renderMode, photoUrl, depthMapUrl, and depthConfig fields plus a test-capsule entry
- Rewired App.jsx route from MemoryPortal to CapsuleShell; MemoryPortal preserved as dead code reference

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor gpuCapability.js to 3-tier getGpuTier** - `cbac1da` (feat)
2. **Task 2: Extend memoryScenes.js with renderMode and depth fields** - `2cc6393` (feat)
3. **Task 3: Create CapsuleShell.jsx** - `89fd3fe` (feat)
4. **Task 4: Rewire App.jsx to CapsuleShell** - `2314f80` (feat)

## Files Created/Modified
- `src/utils/gpuCapability.js` — 3-tier GPU detection: getGpuTier() returns 'full' | 'simplified' | 'parallax', canRenderSplat() kept as deprecated wrapper
- `src/data/memoryScenes.js` — Scene registry with renderMode field, test-capsule entry, getDefaultDepthConfig() export
- `src/pages/CapsuleShell.jsx` — Renderer-agnostic shell with SplatRenderer, DisplacedMeshRenderer stub, ParallaxFallback, shared chrome layer
- `src/App.jsx` — Lazy import and route changed from MemoryPortal to CapsuleShell

## Decisions Made
- Extracted SplatRenderer and ParallaxFallback as internal components inside CapsuleShell rather than separate files — keeps the capsule module self-contained and mirrors MemoryPortal's structure
- Mobile full-tier threshold set to deviceMemory >= 8 (vs desktop >= 6) to avoid sustained postprocessing load on phones with marginal GPU capability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CapsuleShell is wired and routing; DisplacedMeshRenderer stub is ready for Plan 10-02/10-03 to implement the actual depth-displaced mesh renderer
- Scene registry shape supports both splat and displaced-mesh scenes
- Build passes cleanly; backward compatibility preserved via canRenderSplat() wrapper
- Ready for Plan 10-02 (depth displacement shader + asset pipeline)

---
*Phase: 10-foundation-asset-pipeline*
*Completed: 2026-03-23*
