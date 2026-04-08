---
phase: 10-foundation-asset-pipeline
plan: 02
subsystem: tooling
tags: [node, png, jpeg, validation, asset-pipeline, zlib]

# Dependency graph
requires:
  - phase: 10-01
    provides: Scene registry with renderMode and depthConfig fields
provides:
  - Capsule asset validation script (validate-capsule.mjs)
  - Test capsule assets generator (generate-test-assets.mjs)
  - Per-scene folder structure at public/memory/{scene-id}/
  - npm script validate:capsule for pipeline integration
affects: [12-flagship-scene, 13-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [manual-png-construction-via-zlib, png-ihdr-header-parsing]

key-files:
  created:
    - scripts/validate-capsule.mjs
    - scripts/generate-test-assets.mjs
    - public/memory/test-capsule/photo.png
    - public/memory/test-capsule/depth.png
    - public/memory/test-capsule/preview.jpg
  modified:
    - package.json

key-decisions:
  - "PNG files for both photo and depth (not WebP) — keeps validation simple with uniform header parsing"
  - "Manual PNG/JPEG construction with Node.js zlib.deflateSync — zero external dependencies for asset generation"

patterns-established:
  - "Per-capsule folder structure: public/memory/{scene-id}/photo.png + depth.png + preview.jpg"
  - "PNG IHDR header parsing for dimension/colortype validation without image libraries"

requirements-completed: [ASSET-01]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 10 Plan 02: Asset Pipeline + Validation Script + Test Scene Assets Summary

**Capsule asset validation script and test assets with per-scene folder structure validated under 500KB budget using zero-dependency PNG header parsing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T08:09:33Z
- **Completed:** 2026-03-23T08:12:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Validation script checks file existence, size budget (512KB), dimension match, and grayscale depth via PNG IHDR header parsing
- Test capsule generator creates valid 64x64 PNG (photo + depth) and minimal JPEG (preview) using only Node.js built-ins
- All validation checks pass with 8.2 KB total payload (well under 500 KB limit)
- npm script `validate:capsule` registered for pipeline integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validate-capsule.mjs validation script** - `beba09c` (feat)
2. **Task 2: Create test-capsule assets in public/memory/test-capsule/** - `6d6138b` (feat)

## Files Created/Modified
- `scripts/validate-capsule.mjs` - Validates capsule asset folders (existence, size, dimensions, grayscale)
- `scripts/generate-test-assets.mjs` - Generates minimal test PNG/JPEG assets with Node.js zlib
- `public/memory/test-capsule/photo.png` - 64x64 RGB color gradient test photo
- `public/memory/test-capsule/depth.png` - 64x64 grayscale vertical gradient test depth map
- `public/memory/test-capsule/preview.jpg` - Minimal valid 8x8 JPEG preview
- `package.json` - Added validate:capsule npm script

## Decisions Made
- Used PNG format for photo (not WebP as in original context D-14) because the validation script and displaced mesh renderer both benefit from uniform PNG header parsing for dimension checks. WebP conversion can be added later if payload budget requires it.
- Built PNG files manually (signature + IHDR + IDAT + IEND) with Node.js built-in zlib.deflateSync rather than depending on sharp or canvas — keeps the generator script zero-dependency and portable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 Plan 03 is the final plan in this phase — ready to proceed
- Test capsule assets are available for DisplacedMeshRenderer development in Phase 11
- Validation pipeline can be used to check real capsule assets in Phase 12

---
*Phase: 10-foundation-asset-pipeline*
*Completed: 2026-03-23*
