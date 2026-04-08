# Plan 15-02 Summary: Progress-Threshold Narrative Triggers

**Phase**: 15 — Memory Flight Controller
**Status**: Complete
**Duration**: ~5 min
**Tasks**: 2/2

## What Was Done

### Task 1: Threshold fields in memoryScenes.js
Added `threshold` fields (0-1 float) to all four narrative entries in the syros-cave
particle-memory scene:
- Card 1 (Place): threshold 0.15
- Card 2 (Feeling): threshold 0.40
- Card 3 (Meaning): threshold 0.65
- Card 4 (Gratitude): threshold 0.85

Time-based `delay` fields preserved for backward compatibility. Placeholder-scene and
test-capsule entries left unchanged (no thresholds).

### Task 2: Progress-threshold trigger path in CapsuleShell.jsx
Added dual-path narrative triggering:
- **Progress-threshold path**: For particle-memory scenes with `threshold` fields. Uses
  `requestAnimationFrame` to poll `flightProgressRef.current` and fires cards when
  progress >= threshold. Set-based tracking prevents re-triggering.
- **Time-based path**: Preserved unchanged for splat, displaced-mesh, and parallax scenes.

Added `flightProgressRef` (useRef(0)) and passed it as prop to ParticleFieldRenderer,
where the flight controller (Plan 15-01) will write scroll-driven progress values.

## Files Changed
- `src/data/memoryScenes.js` — 4 threshold fields added to syros-cave narrative
- `src/pages/CapsuleShell.jsx` — flightProgressRef, dual-path narrative useEffect, prop pass-through

## Requirements Addressed
- **FLIGHT-03** (partial): Narrative cards driven by normalized progress (0-1), not time. Full
  completion requires Plan 15-01 (flight controller writing progress to the ref).

## Verification
- Build succeeds (`npx vite build`)
- Time-based narrative preserved for non-particle-memory scenes
- Threshold values span 0.15-0.85 range, giving breathing room at both ends
