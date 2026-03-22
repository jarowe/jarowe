---
phase: 08-regression-fixes
plan: 01
subsystem: rendering, content
tags: [three.js, instanced-mesh, shader, glsl, onBeforeCompile, openai, journal]

# Dependency graph
requires:
  - phase: 01-constellation-scene
    provides: NodeCloud instanced mesh rendering with per-instance colors
  - phase: 03-starseed-today
    provides: TodayRail with Glint journal card and API endpoint
provides:
  - Per-instance emissive coloring via onBeforeCompile shader patch in NodeCloud
  - Capped journal entries at 2 sentences max (API prompt + fallback pool)
affects: [constellation, today-rail, glint]

# Tech tracking
tech-stack:
  added: []
  patterns: [onBeforeCompile shader injection for per-instance uniforms in InstancedMesh]

key-files:
  created: []
  modified:
    - src/constellation/scene/NodeCloud.jsx
    - api/glint-journal.js
    - src/data/glintJournal.js

key-decisions:
  - "Used onBeforeCompile with vColor.rgb multiplication rather than custom ShaderMaterial to preserve MeshStandardMaterial PBR lighting"
  - "Set emissive to #ffffff (white base) so per-instance color tinting produces pure theme colors"

patterns-established:
  - "onBeforeCompile pattern: inject vColor into emissive channel for per-instance InstancedMesh glow"

requirements-completed: [RENDER-01, CONTENT-01]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 8 Plan 1: Regression Fixes Summary

**Per-instance emissive shader patch for constellation node colors, plus 2-sentence cap on Glint journal entries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T02:27:28Z
- **Completed:** 2026-03-22T02:29:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Constellation helix nodes now glow in their theme-specific colors (pink for love, blue for career, teal for adventure, gold for celebration, etc.) instead of uniform grey-blue
- Glint journal API prompt updated to request 1-2 sentences with reinforcement language and reduced max_tokens
- All 30 fallback journal entries trimmed to 2 sentences max by combining clauses with dashes, semicolons, and conjunctions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix per-instance emissive colors in constellation NodeCloud** - `a9420aa` (fix)
2. **Task 2: Cap Glint journal entries at 2 sentences max** - `b6a015d` (fix)

## Files Created/Modified
- `src/constellation/scene/NodeCloud.jsx` - Added useCallback import, onBeforeCompile shader patch multiplying totalEmissiveRadiance by vColor.rgb, changed emissive from #444466 to #ffffff
- `api/glint-journal.js` - Updated system prompt from "2-3 sentence" to "1-2 sentence" with brevity reinforcement, reduced max_tokens from 150 to 100
- `src/data/glintJournal.js` - Rewrote 8 fallback entries exceeding 2 sentences, updated header comment

## Decisions Made
- Used onBeforeCompile with vColor.rgb multiplication rather than replacing the entire material with a custom ShaderMaterial -- this preserves all MeshStandardMaterial PBR lighting, roughness, metalness, and tone mapping behavior
- Set emissive base to #ffffff (white) so that multiplying by the per-instance color produces a pure theme-colored glow without any grey-blue tint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Constellation node rendering is visually correct with per-instance theme glow
- Journal content is concise for TodayRail card layout
- Ready for Phase 09 plans (explore card, Starseed polish)

## Self-Check: PASSED

All files exist. Both task commits verified (a9420aa, b6a015d).

---
*Phase: 08-regression-fixes*
*Completed: 2026-03-22*
