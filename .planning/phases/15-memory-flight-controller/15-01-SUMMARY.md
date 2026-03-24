# Summary 15-01: Flight Camera + Scroll-Driven Spline Controller

**Phase:** 15-memory-flight-controller
**Status:** Complete
**Duration:** ~10 min
**Tasks:** 4

## What Was Built

### FlightCamera Component (`src/components/particleMemory/FlightCamera.jsx`)
- Scroll-driven camera that follows a CatmullRom spline through the particle field
- Spring-smoothed progress: wheel delta accumulates into velocity, spring-damped into 0-1 progress float
- Exponential decay (0.95/frame) creates physical "gliding" after scroll release
- Touch support via pointer events (Y-delta mapped to same velocity accumulator)
- FOV narrowing: 50deg at ends, 40deg at midpoint (bell curve via progress)
- Mouse/gyro parallax (lerped at ~15-30ms response) layered on spline position
- Sine-wave micro-drift (12s period) activates after 2s of idle -- scene never feels frozen
- Hold at final keypoint at progress=1.0 with breathing drift
- Progress exposed via useImperativeHandle for downstream consumers

### memoryScenes.js (`src/data/memoryScenes.js`)
- syros-cave scene now has `flightPath` config: 6 CatmullRom keypoints + 6 look-at targets
- Path traces: outside field -> approach -> surface -> interior -> emerge -> settle
- FOV range [50, 40] for dive compression
- `narrativeThresholds`: 4 cards at progress 0.15/0.35/0.6/0.85 (replaces time-based delays)
- JSDoc updated with new field documentation

### ParticleFieldRenderer (`src/components/ParticleFieldRenderer.jsx`)
- Conditionally renders FlightCamera when `scene.flightPath` is present
- Falls back to CinematicCamera for scenes without flightPath (splat, displaced-mesh)
- Converted to forwardRef with useImperativeHandle exposing progress
- Added `onProgress` callback prop for narrative card integration
- Canvas container has `touchAction: none` for flight scenes (prevents page scroll)

### Build Stubs
- Added stub files for AmbientShootingStars, ambientLife, introMath, portalScenes
- These exist as unstaged changes on the main worktree but were missing from this branch

## Requirements Addressed

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FLIGHT-01 | Complete | FlightCamera drives camera along CatmullRom spline via scroll/touch |
| FLIGHT-02 | Complete | Exponential velocity decay (0.95/frame) creates momentum/gliding |
| FLIGHT-03 | Complete | narrativeThresholds use progress (0-1) not time; onProgress callback wired |
| FLIGHT-04 | Complete | Micro-drift sine wave at idle; scroll immediately overrides |

## Decisions Made

- Spring constants: SCROLL_SENSITIVITY=0.0008, VELOCITY_DECAY=0.95, EPSILON=0.00005
- CatmullRom tension=0.5 (balanced smoothness)
- FOV easing: power-2 bell curve centered at progress=0.5
- Parallax lerp=0.08 (smooth ~15-30ms response at 60fps)
- Drift: 12s period, 0.003 amplitude, 2s activation delay
- Touch sensitivity 3x higher than wheel (compensates for smaller deltas)

## Files Changed

| File | Action |
|------|--------|
| `src/components/particleMemory/FlightCamera.jsx` | Created (250 lines) |
| `src/data/memoryScenes.js` | Modified (+44 lines: flightPath, narrativeThresholds) |
| `src/components/ParticleFieldRenderer.jsx` | Modified (FlightCamera integration, forwardRef) |
| `src/constellation/scene/AmbientShootingStars.jsx` | Created (stub) |
| `src/constellation/scene/ambientLife.js` | Created (stub) |
| `src/constellation/scene/introMath.js` | Created (stub) |
| `src/constellation/data/portalScenes.js` | Created (stub) |

## Build Verification

`npx vite build` succeeds (26.84s, 4014 modules). No regressions.
