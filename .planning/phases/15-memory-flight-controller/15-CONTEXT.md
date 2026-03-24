# Phase 15: Memory Flight Controller - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Scroll/trackpad/touch input drives the camera along a 3D CatmullRom spline through the particle field with spring-smoothed momentum, inertial drift, and progress-normalized narrative card triggers — the visitor flies through the memory at their own pace, with the scene never feeling frozen or dead.

</domain>

<decisions>
## Implementation Decisions

### Scroll Input & Momentum Physics
- **D-01:** Spring-smoothed normalized progress. Raw scroll delta accumulated into a velocity, spring-damped into a smooth 0→1 progress float. Prevents jerky camera. Shared physics across wheel and touch keeps the experience coherent.
- **D-02:** Exponential decay (0.95 per frame) on scroll release. Velocity *= decayFactor each frame until below epsilon threshold. Physically intuitive "gliding" feel — the camera coasts, it doesn't snap-stop.
- **D-03:** Wheel down = fly deeper into memory (progress increases). Natural scroll = forward. Matches ROADMAP SC1: "wheel forward = deeper into the memory."
- **D-04:** Wheel event + touch swipe via pointer events. `onWheel` for desktop, touch `onPointerMove` with Y-delta for mobile. Same spring physics for both input methods.

### Camera Path & Visual Design
- **D-05:** CatmullRom spline through 5-7 keypoints per scene. Start outside looking at the field, sweep past the surface, dive through the interior, emerge on the other side. Points defined per-scene in memoryScenes.js cameraKeyframes. Reuses existing CinematicCamera infrastructure.
- **D-06:** Subtle FOV narrowing on dive. Start at 50°, narrow to ~40° at the deepest point (compression = speed sensation), widen back to 50° on exit. Driven by progress float, not separate animation.
- **D-07:** Hold at final keypoint at progress=1.0. Camera rests at the "emerged" position with gentle breathing drift. No loop, no reverse. Exit is via back button or portal.
- **D-08:** Subtle 15-30ms mouse parallax layered on top of spline position. Adds life without fighting scroll control. Three layers: spline progress (scroll), mouse parallax (15-30ms), breathing micro-drift (8-20s sine).

### Narrative Cards & Progress Triggers
- **D-09:** Progress-threshold card triggers (e.g., 0.25, 0.5, 0.75). Cards fire when progress crosses threshold, not time-based. ROADMAP SC3: "a visitor who scrolls slowly sees cards later in clock time." Reuses existing narrative card system from CapsuleShell.
- **D-10:** Glass cards fade in at screen edge, auto-dismiss after 4s. Don't block the flight. Cards appear as floating glass overlays at the bottom, fade in/out with Framer Motion. User can keep scrolling through them.
- **D-11:** Sine-wave micro-drift when user stops scrolling (8-20s period, tiny amplitude). Camera breathes imperceptibly. Next scroll input immediately overrides. ROADMAP SC4: "the scene never feels frozen."
- **D-12:** No visible progress bar. The flight IS the interface. Progress is felt through changing scenery, FOV, card triggers. A progress bar would break immersion.

### Claude's Discretion
- Exact spring stiffness and damping constants
- Epsilon threshold for velocity cutoff
- CatmullRom tension parameter
- Keypoint positions for syros-cave spline (based on particle field geometry)
- FOV easing curve (linear vs smoothstep)
- Mouse parallax offset calculation and clamping
- Micro-drift sine amplitude and frequency
- Card fade-in/out duration and positioning offsets
- Touch swipe sensitivity multiplier
- Internal component decomposition (FlightController hook vs component)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 15 Requirements
- `.planning/REQUIREMENTS.md` §v2.2 — FLIGHT-01, FLIGHT-02, FLIGHT-03, FLIGHT-04

### Existing Code (build on top of)
- `src/components/ParticleFieldRenderer.jsx` — Top-level renderer with Canvas, CinematicCamera, postprocessing, tier-adaptive rendering
- `src/components/particleMemory/ParticleMemoryField.jsx` — R3F Points component with BufferGeometry
- `src/pages/CapsuleShell.jsx` — CinematicCamera (export), narrative overlay, particle-memory dispatch, ArcController pattern
- `src/data/memoryScenes.js` — Scene registry with cameraKeyframes, narrative arrays, renderMode

### Camera & Animation Patterns
- `src/pages/CapsuleShell.jsx` CinematicCamera — GSAP-driven multi-beat keyframe choreography (lines 210-300)
- `src/pages/CapsuleShell.jsx` ArcController — useImperativeHandle for uniform animation (existing experience arc pattern)
- `src/pages/CapsuleShell.jsx` NarrativeOverlay — existing narrative card system with timed reveals

### Prior Phase Context
- `.planning/phases/14-particle-field-core/14-CONTEXT.md` — Particle field architecture, dual position buffers, tier adaptation
- `.planning/phases/11-cinematic-polish/11-CONTEXT.md` — CinematicCamera design, atmosphere, postprocessing patterns
- `.planning/phases/12-flagship-scene-portal/12-CONTEXT.md` — Experience arc, narrative cards, PortalVFX integration

### Research Flags (from STATE.md)
- Camera feel: Spring-smooth progress before it drives the spline. Never let camera fully stop. Layer: spline progress (scroll), mouse parallax (15-30ms), breathing micro-drift (8-20s sine). Test at 2x speed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CinematicCamera` (exported from CapsuleShell) — GSAP-driven keyframe camera. Phase 15 replaces GSAP timeline with scroll-driven progress along a CatmullRom spline.
- `NarrativeOverlay` in CapsuleShell — existing glass card system with timed delays. Phase 15 changes trigger from time-based to progress-threshold-based.
- `ArcController` pattern — useImperativeHandle for animating uniforms. Reference for exposing progress to child components.
- `ParticleFieldRenderer.jsx` — Already integrates CinematicCamera. Phase 15 replaces or augments this with scroll-driven flight.

### Established Patterns
- GSAP for timeline animations, Framer Motion for UI transitions
- `useFrame` for per-frame updates in R3F
- `useImperativeHandle` for exposing animation controls
- Glass-panel aesthetic for overlays
- Per-scene config in memoryScenes.js

### Integration Points
- `ParticleFieldRenderer.jsx` — Replace/augment CinematicCamera with FlightCamera driven by scroll progress
- `memoryScenes.js` — Add flightKeyframes (CatmullRom control points) and narrativeThresholds to scene config
- `CapsuleShell.jsx` — Wire scroll events from the capsule container to the flight controller

</code_context>

<specifics>
## Specific Ideas

- The flight should feel "discovered rather than operated" — narrative is subordinate to the flight experience
- Spring-smoothed progress avoids "scroll as scrubber" harshness
- Exponential decay gives the glide sensation — the camera coasts, it doesn't snap
- Light mouse parallax keeps it alive between scroll inputs without fighting the main flight controller
- FOV narrowing on dive adds intensity without becoming gimmicky
- Hold at the end gives the memory time to land
- No visible progress bar — progress is felt through changing scenery, FOV, and card triggers

</specifics>

<deferred>
## Deferred Ideas

- Dream portal dissolve/reform transitions — Phase 16 (consumes the dual position buffers + progress gating from this phase)
- Audio-reactive soundscape — Phase 17 (consumes the progress float from this phase)
- Particle cohesion states changing with progress — future enhancement
- Multiple spline paths per scene — future milestone

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-memory-flight-controller*
*Context gathered: 2026-03-24 via smart discuss*
