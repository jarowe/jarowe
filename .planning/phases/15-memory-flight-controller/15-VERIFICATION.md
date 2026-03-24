# Phase 15 Verification: Memory Flight Controller

**Phase:** 15-memory-flight-controller
**Verification date:** 2026-03-23
**Status:** gaps_found

---

## Goal

Scroll/trackpad/touch input drives the camera along a 3D spline through the particle field
with momentum, inertial drift, and progress-normalized narrative card triggers — the visitor
flies through the memory at their own pace.

---

## Requirement Coverage

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| FLIGHT-01 | Scroll drives camera along CatmullRom spline | PASS | `FlightCamera.jsx` uses `THREE.CatmullRomCurve3`, `handleWheel` accumulates `deltaY * SCROLL_SENSITIVITY` into velocity, `getPointAt(t)` drives camera position every frame |
| FLIGHT-02 | Momentum with exponential decay | PASS | `VELOCITY_DECAY = 0.95` applied as `velocity.current *= VELOCITY_DECAY` each frame; `VELOCITY_EPSILON = 0.00005` cutoff; velocity clamped to `MAX_VELOCITY = 0.04`; touch and wheel use same accumulator |
| FLIGHT-03 | Progress-threshold narrative cards | PARTIAL — wiring gap (see below) | `memoryScenes.js` syros-cave has `narrativeThresholds` at 0.15/0.35/0.60/0.85 and `narrative[].threshold` fields; `CapsuleShell.jsx` polls `flightProgressRef.current` via rAF and fires cards on threshold crossing; BUT `flightProgressRef` is never written (see Gap 1) |
| FLIGHT-04 | Micro-drift when idle, scroll override | PASS | `DRIFT_AMPLITUDE = 0.003`, `DRIFT_PERIOD = 12s`, activates after `DRIFT_ACTIVATION_DELAY = 2.0s` of near-zero velocity; sine wave in both X and Y axes; `idleTime.current = 0` reset on any scroll/touch event |

---

## Success Criteria Check

| Criterion | Status | Notes |
|-----------|--------|-------|
| `FlightCamera.jsx` exists as a forwardRef R3F component | PASS | `src/components/particleMemory/FlightCamera.jsx` (250 lines) |
| Camera follows `CatmullRomCurve3` via `getPointAt(t)` | PASS | Position and look-at splines both use `getPointAt(progress.current)` |
| `onWheel` handler with `preventDefault()` | PASS | `{ passive: false }` on `wheel` listener; `e.preventDefault()` + `e.stopPropagation()` |
| Touch via pointer events (Y-delta to velocity) | PASS | `handlePointerMove` maps `e.clientY` delta to `velocity.current` at `TOUCH_SENSITIVITY = 0.003` |
| `VELOCITY_DECAY` constant present | PASS | `const VELOCITY_DECAY = 0.95` (line 26) |
| `Math.pow` / exponential decay logic | PASS | Implemented as direct multiplication: `velocity.current *= VELOCITY_DECAY` (equivalent to `Math.pow(0.95, frames)` — correct) |
| `fovRange` bell-curve | PASS | `fovT = 1 - Math.pow(2 * Math.abs(t - 0.5), FOV_EASE_POWER)` — narrows at midpoint, widens at ends |
| Sine/cosine micro-drift | PASS | `Math.sin(now * (2*PI / DRIFT_PERIOD))` for X, `Math.cos(...)` for Y |
| `idleTime` accumulates, resets on scroll | PASS | `idleTime.current += dt` when velocity below epsilon; set to 0 in both `handleWheel` and touch move |
| `useImperativeHandle` exposes `getProgress` | PASS | `getProgress: () => progress.current` in `FlightCamera.jsx` |
| `ParticleFieldRenderer` conditionally renders `FlightCamera` | PASS | `{hasFlightPath ? <FlightCamera ...> : <CinematicCamera ...>}` |
| `touchAction: none` on Canvas container for flight scenes | PASS | Applied conditionally via `hasFlightPath` check |
| syros-cave `flightPath` with 6 keypoints | PASS | `keypoints` and `lookAtKeypoints` both have 6 entries; `fovRange: [50, 40]` |
| syros-cave `narrativeThresholds` at 4 progress values | PASS | 0.15, 0.35, 0.60, 0.85 in `narrativeThresholds`; also mirrored as `threshold` on `narrative[]` entries |
| `flightProgressRef` written by flight controller | FAIL — Gap 1 | See below |
| Build succeeds | PASS | 15-01-SUMMARY.md: `npx vite build` succeeded (26.84s, 4014 modules) |

---

## Gaps Found

### Gap 1 — flightProgressRef never written (FLIGHT-03 broken)

**Severity:** High — narrative cards will never fire in flight mode

**Root cause:** A prop name mismatch between CapsuleShell and ParticleFieldRenderer.

- `CapsuleShell.jsx` line 1093 passes `flightProgressRef={flightProgressRef}` to `ParticleFieldRenderer`
- `ParticleFieldRenderer.jsx` line 68 destructures `{ ..., onProgress }` — it expects a **callback**, not a ref
- The `flightProgressRef` prop is silently ignored (React does not warn on extra props)
- No `onProgress` callback is ever passed from CapsuleShell to ParticleFieldRenderer
- Therefore `flightProgressRef.current` stays at 0 forever
- The rAF poll in CapsuleShell reads 0, no threshold is ever crossed, no cards fire

**Fix required:** One of:
- Option A (minimal): In CapsuleShell, replace `flightProgressRef={flightProgressRef}` with
  `onProgress={(p) => { flightProgressRef.current = p; }}` (matches existing ParticleFieldRenderer prop API)
- Option B (cleaner): Pass both; update ParticleFieldRenderer to accept and write a `flightProgressRef`
  prop directly (avoids the callback allocation on every frame)

Option A is a one-line fix and is the path of least resistance.

---

### Gap 2 — narrativeThresholds vs narrative[].threshold divergence (minor, non-blocking)

**Severity:** Low — cosmetic data redundancy, not a runtime failure

`memoryScenes.js` stores narrative card thresholds in two places for syros-cave:
- `narrative[i].threshold` (0.15, 0.40, 0.65, 0.85) — used by CapsuleShell rAF poll
- `narrativeThresholds[i].progress` (0.15, 0.35, 0.60, 0.85) — defined but not currently consumed

The values differ slightly (Card 2: 0.40 vs 0.35; Card 3: 0.65 vs 0.60). CapsuleShell reads
from `narrative[].threshold` so the thresholds in effect are 0.15/0.40/0.65/0.85. The
`narrativeThresholds` array appears to be a parallel structure intended for a different consumer
(possibly Phase 16/17 soundscape). This is not a blocking issue but should be reconciled.

---

## Human Verification Items (Visual / Browser Required)

The following cannot be verified from static code analysis and require browser testing:

1. **Scroll feel** — Does the camera glide smoothly with VELOCITY_DECAY=0.95 on a standard
   trackpad? On a high-DPI trackpad (macOS/Windows Precision), deltaY values can vary widely.
   Verify SCROLL_SENSITIVITY=0.0008 doesn't feel too slow or too fast.

2. **Touch swipe** — On a mobile device, does touch Y-delta drive camera forward/backward
   without the page scrolling? (Requires `touchAction: none` to be working as expected.)

3. **FOV bell curve** — Is the FOV narrowing at midpoint perceptible but not distracting?
   The range is 50°→40° which is subtle. Confirm the compression sensation reads as intended.

4. **Micro-drift** — After 2s of idle, does the camera visibly breathe? DRIFT_AMPLITUDE=0.003
   is very small; verify it reads as "alive" rather than imperceptible on actual hardware.

5. **Narrative cards post-fix** — After applying the Gap 1 fix, verify all 4 cards appear
   at the correct progress points (0.15, 0.40, 0.65, 0.85) when flying through syros-cave.

6. **spline smoothness** — Does the CatmullRom path through the 6 syros-cave keypoints feel
   organic? The keypoints were estimated from particle field geometry, not from live tuning.

7. **Boundary behavior** — At progress=0 and progress=1, does the camera stop cleanly
   (velocity killed at boundary) or does it feel abrupt?

8. **Fallback regression** — Confirm that non-flight scenes (test-capsule, placeholder-scene)
   still use CinematicCamera and narrative cards still fire on time-based delays.

---

## Summary

FLIGHT-01 (spline), FLIGHT-02 (momentum), and FLIGHT-04 (micro-drift) are fully implemented
and code-verified. FLIGHT-03 (narrative card triggers) has all the logic in place but is broken
by a one-line prop name mismatch in CapsuleShell.jsx — the `flightProgressRef` prop must be
replaced with an `onProgress` callback that writes to the ref. Once that fix is applied, all
four requirements are satisfied in code and the phase can be marked complete pending visual
verification of scroll feel, FOV, drift amplitude, and narrative card timing.
