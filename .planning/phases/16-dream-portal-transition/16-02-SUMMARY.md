# Summary: 16-02 — DreamTransition Component + GSAP Entry/Exit Timelines

**Status:** Complete
**Duration:** ~8 min
**Commits:** 5 (plan + 4 tasks)

## What was done

### Task 16-02-01: Add tunnel mode to FlightCamera
Added `setTunnelMode(enabled, speed)` and `getCamera()` to FlightCamera's `useImperativeHandle`. When tunnel mode is active:
- Scroll/touch input is ignored (velocity killed)
- Camera auto-advances at the specified speed (tunnelSpeed * dt)
- FOV bell-curve computation is skipped (GSAP controls FOV externally)

**File:** `src/components/particleMemory/FlightCamera.jsx`

### Task 16-02-02: Expose convenience accessors from ParticleFieldRenderer
Added `getCamera`, `setTunnelMode`, `getUniforms`, and `getWireUniforms` convenience methods to ParticleFieldRenderer's `useImperativeHandle`. These delegate to FlightCamera and ParticleMemoryField refs, allowing DreamTransition to access all transition-relevant controls through a single ref.

**File:** `src/components/ParticleFieldRenderer.jsx`

### Task 16-02-03: Create DreamTransition.jsx with GSAP 3-phase timelines
Created the DreamTransition component with:
- `buildDreamEntryTimeline`: dissolve (morph 1->0 over 1.5s + stagger ramp to 0.35) -> tunnel void (auto-advance camera at 0.15 progress/sec + FOV narrow to 30deg over 0.8s) -> reform (morph 0->1 over 2.0s with depth-staggered convergence + stagger settle + FOV restore)
- `buildDreamExitTimeline`: uniform dissolve (stagger reset to 0, morph 1->0) -> tunnel void (reverse camera at -0.15/sec + FOV narrow) -> navigate at rupture midpoint
- `useDreamTransition` hook: manages idle/entering/active/exiting phase lifecycle
- `storeDepartureState` / `retrieveDepartureState`: sessionStorage with 5-minute expiry for intentional return transitions

Total entry duration: ~4.5s (dissolve 1.5s + tunnel 1.0s + reform 2.0s)

**File:** `src/components/DreamTransition.jsx`

### Task 16-02-04: Integrate DreamTransition into CapsuleShell
Modified CapsuleShell to use DreamTransition for particle-memory scenes:
- Import DreamTransition utilities
- Added `particleRendererRef` passed to ParticleFieldRenderer
- `isParticleMemory` flag gates all dream transition behavior
- Departure state stored in sessionStorage on portal entry
- Dream entry triggered after particle awakening (non-direct access, 100ms delay for ref settlement)
- Back button triggers `dreamTransition.triggerExit()` for particle-memory scenes
- Dream exit navigates at tunnel rupture point via onExitNavigate callback
- PortalVFX conditionally skipped for particle-memory scenes (DreamTransition replaces it)
- Existing PortalVFX exit preserved for splat/displaced-mesh scenes

**File:** `src/pages/CapsuleShell.jsx`

### Task 16-02-05: Build verification
`npx vite build` succeeds (30.38s, no errors). All imports resolve correctly.

## Verification

- Build succeeds (`npx vite build` -- no errors)
- DreamTransition.jsx exists with buildDreamEntryTimeline and buildDreamExitTimeline
- FlightCamera has `setTunnelMode` and `getCamera` in useImperativeHandle
- CapsuleShell uses DreamTransition for particle-memory scenes (isParticleMemory flag)
- sessionStorage stores departure state (`jarowe_dream_departure` key)
- PortalVFX is conditionally skipped for particle-memory scenes
- Back button triggers dream exit (dissolve -> tunnel -> navigate) for particle-memory scenes

## Files Modified

| File | Change |
|------|--------|
| `src/components/particleMemory/FlightCamera.jsx` | Tunnel mode (auto-advance, FOV skip), getCamera(), setTunnelMode() |
| `src/components/ParticleFieldRenderer.jsx` | Convenience accessors (getCamera, setTunnelMode, getUniforms, getWireUniforms) |
| `src/components/DreamTransition.jsx` | **NEW** — GSAP 3-phase entry/exit timelines, useDreamTransition hook, sessionStorage |
| `src/pages/CapsuleShell.jsx` | DreamTransition integration, dream entry/exit wiring, PortalVFX conditional skip |
