---
phase: 07-immersive-portal
plan: 01
subsystem: ui
tags: [gaussian-splats, 3d, webgl2, howler, framer-motion, immersive, volumetric]

# Dependency graph
requires: []
provides:
  - Gaussian splat memory portal page (MemoryPortal.jsx)
  - Scene registry pattern (memoryScenes.js) for extensible scene definitions
  - GPU capability detection utility (gpuCapability.js)
  - Mobile/low-end fallback rendering path
affects: [07-02-PLAN, constellation, app-routing]

# Tech tracking
tech-stack:
  added: ["@mkkellogg/gaussian-splats-3d ^0.4.7"]
  patterns: ["dynamic-import for heavy 3D libraries", "capability-based rendering fallback", "scene registry pattern"]

key-files:
  created:
    - src/data/memoryScenes.js
    - src/utils/gpuCapability.js
    - src/pages/MemoryPortal.jsx
    - src/pages/MemoryPortal.css
    - public/images/memory/placeholder-preview.jpg
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Dynamic import for splat library to avoid bundling heavy 3D code for fallback users"
  - "Remote demo asset URL for placeholder scene (Hugging Face bonsai ksplat) instead of local file"
  - "Separate Howl instance per scene rather than global AudioProvider for scene-specific soundtrack"
  - "Conditional Howl creation: soundtrack field null means no audio setup, avoids load errors"

patterns-established:
  - "Scene registry pattern: data files define metadata, component resolves paths at render time with BASE_URL"
  - "Capability-gated rendering: canRenderSplat() check drives splat vs fallback branch"
  - "resolveAsset() helper: remote URLs pass through, local paths get BASE_URL prefix"

requirements-completed: [PORTAL-01, PORTAL-03]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 07 Plan 01: Memory Portal Core Summary

**Gaussian splat memory portal with volumetric 3D viewer, sequential narrative cards, ambient soundtrack, and capability-based mobile fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T20:25:07Z
- **Completed:** 2026-03-21T20:29:37Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Full-viewport gaussian splat viewer using @mkkellogg/gaussian-splats-3d with orbit controls
- Sequential narrative text cards with Framer Motion AnimatePresence fade-in animations
- Howl-based scene soundtrack with muted autoplay and 2-second fade-in on unmute toggle
- GPU capability detection (WebGL2, texture size, GPU renderer string, mobile heuristic) with static image fallback
- Extensible scene registry -- adding scenes requires only a new entry in memoryScenes.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Scene registry, capability detection, and install splat library** - `fa514e7` (feat)
2. **Task 2: MemoryPortal page with splat viewer, narrative overlay, and soundtrack** - `cd7a965` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/data/memoryScenes.js` - Scene registry with placeholder scene (id, title, location, narrative, splat URL, camera)
- `src/utils/gpuCapability.js` - canRenderSplat() capability detection for WebGL2/GPU/mobile
- `src/pages/MemoryPortal.jsx` - Full memory portal page: splat viewer, narrative overlay, soundtrack, fallback (269 lines)
- `src/pages/MemoryPortal.css` - Immersive portal styles: glass narrative cards, loading spinner, fallback prompt (201 lines)
- `public/images/memory/placeholder-preview.jpg` - Placeholder preview image (greek-island.jpg copy)
- `package.json` / `package-lock.json` - Added @mkkellogg/gaussian-splats-3d dependency

## Decisions Made
- **Dynamic import for splat library:** The splat library (~2MB) is loaded via dynamic `import()` rather than static import. This means users on fallback devices never download the heavy library code.
- **Remote demo asset for placeholder:** Used the Hugging Face bonsai ksplat demo URL as the initial splat scene. Local `.spz` files will replace this when real captures are ready.
- **Separate Howl per scene:** Each scene gets its own Howl instance independent of the global AudioProvider. The memory soundtrack is scene-specific ambient audio, not a music track.
- **Conditional Howl creation:** If `scene.soundtrack` is null/falsy, no Howl is created. This avoids load errors for the placeholder scene which has no audio file.
- **splatIsRemote flag:** Scene entries with `splatIsRemote: true` bypass BASE_URL prefixing, enabling both local and CDN-hosted splat files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Conditional Howl creation for null soundtrack**
- **Found during:** Task 2
- **Issue:** Plan specified creating a placeholder MP3 file, but making Howl creation conditional on soundtrack existence is cleaner and avoids unnecessary empty audio files
- **Fix:** Made Howl creation guard on `scene.soundtrack` being truthy; set placeholder scene soundtrack to null
- **Files modified:** src/pages/MemoryPortal.jsx, src/data/memoryScenes.js
- **Verification:** Build passes, no runtime errors when soundtrack is null
- **Committed in:** cd7a965

**2. [Rule 2 - Missing Critical] Error handling for library and splat load failures**
- **Found during:** Task 2
- **Issue:** Plan showed basic catch, but library dynamic import can also fail; added dual error handling
- **Fix:** Wrapped both dynamic import and addSplatScene in proper error handling that falls back to static image
- **Files modified:** src/pages/MemoryPortal.jsx
- **Verification:** Build passes, error states correctly degrade to fallback view
- **Committed in:** cd7a965

---

**Total deviations:** 2 auto-fixed (2 missing critical functionality)
**Impact on plan:** Both fixes improve robustness. No scope creep.

## Issues Encountered
None - plan executed cleanly. Build warnings about large chunks are pre-existing (excalidraw, mermaid, globe).

## User Setup Required
None - no external service configuration required. The placeholder scene uses a remote demo splat file.

## Next Phase Readiness
- MemoryPortal page is built but not yet routed in App.jsx (07-02 handles routing and portal transition)
- Scene registry ready for real splat captures to replace the placeholder
- Soundtrack system ready once audio files are provided
- Mobile fallback verified through build

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (fa514e7, cd7a965) verified in git log.

---
*Phase: 07-immersive-portal*
*Completed: 2026-03-21*
