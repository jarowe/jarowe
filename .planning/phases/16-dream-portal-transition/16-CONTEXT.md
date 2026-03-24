# Phase 16: Dream Portal Transition - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Entry to the capsule dissolves reality into scattered particles via the dual position buffer morph, streams through a directed memory current void, and reforms particles into the photo formation with depth-staggered convergence — exit reverses the grammar — replacing the existing PortalVFX with dream-logic transitions that feel like falling into and emerging from a memory.

</domain>

<decisions>
## Implementation Decisions

### Dissolve & Scatter Grammar
- **D-01:** Morph particles from photoPositions → scatteredPositions using `uMorphProgress` uniform (1.0→0.0) animated via GSAP over 1.5s. Uses the dual position buffers pre-allocated in Phase 14. The photo formation dissolves into chaos.
- **D-02:** Directional tunnel scatter — scattered positions biased into an elongated ellipsoid aligned with camera travel axis. The dissolve already points toward the tunnel phase instead of looking like an unrelated spherical explosion. The scatter field should read as "falling into a dream corridor."
- **D-03:** Dissolve starts immediately on capsule open. Route change fires at rupture point (~1s into dissolve). ROADMAP SC1: "visitor sees reality break apart, not a UI fade or instant teleport."
- **D-04:** ~3s total entry sequence: dissolve (1.5s) → tunnel void (1s) → reform (1.5-3s). Not rushed, not tedious.

### Tunnel Void Phase
- **D-05:** Reuse the scattered particle system — camera moves through the existing dissolved particles. No separate geometry or particle system. The same particles that dissolved now stream past during the void.
- **D-06:** Directed memory current visual character (NOT generic warp-speed). Particles stream past in layered depth bands. Some filaments/wire connections briefly appear and snap away. The field narrows toward a vanishing point. Brightness and density pulse with the forward motion. Dream descent, not sci-fi hyperspace.
- **D-07:** Auto-advance camera along tunnel axis at constant speed during void. No scroll control during transition. Smooth, dreamlike, automatic.
- **D-08:** Tunnel void duration ~1s. Brief luminous corridor between worlds — long enough to feel the void, short enough not to bore.

### Reform & Exit Grammar
- **D-09:** Reform via uMorphProgress 0.0→1.0 over 1.5-3s. Particles stream from scattered chaos into photo formation. GSAP ease "power2.out" for decelerating assembly. ROADMAP SC3: "the moment of recognition is the emotional peak."
- **D-10:** Convergence from tunnel direction into formation — particles arrive from the forward axis (tunnel direction) and settle into photo positions. Depth-staggered: foreground arrives first. Not a uniform morph.
- **D-11:** Exit reverses the dream grammar — photo dissolves back into scattered tunnel particles, same void/current, particles reform into origin page context. ROADMAP SC4: "it is NOT a different transition or a hard navigate."
- **D-12:** Store departure camera/progress state in sessionStorage on entry; restore on return. Makes return transitions feel intentional, not reset-driven.

### Claude's Discretion
- Exact GSAP timeline structure and easing curves
- Tunnel camera speed and path curvature
- Filament flash frequency and duration during void
- Vanishing point convergence shader math
- Depth-stagger timing curve for reform
- Brightness/density pulse frequency
- Scattered position distribution algorithm for directional tunnel shape
- How to handle the origin page context on exit (what "reforms" back)
- Whether to pre-render the destination or stream-assemble on arrival

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 16 Requirements
- `.planning/REQUIREMENTS.md` §v2.2 — DREAM-01, DREAM-02, DREAM-03, DREAM-04

### Existing Code (build on top of)
- `src/components/ParticleFieldRenderer.jsx` — Top-level renderer, FlightCamera, tier adaptation
- `src/components/particleMemory/ParticleMemoryField.jsx` — R3F Points with dual buffer attributes (aPhotoPosition, aScatteredPosition)
- `src/components/particleMemory/particleShaders.js` — Vertex/fragment shaders with uMorphProgress uniform
- `src/components/particleMemory/FlightCamera.jsx` — Scroll-driven camera with progress exposed via useImperativeHandle
- `src/pages/CapsuleShell.jsx` — PortalVFX integration, ArcController, experience arc, narrative system
- `src/data/memoryScenes.js` — Scene registry with flightPath, narrative, particleConfig

### Phase 14 Dual Buffers
- `src/components/particleMemory/particleSampler.js` — Generates both `photoPositions` and `scatteredPositions` Float32Arrays
- `uMorphProgress` uniform in particleShaders.js — `mix(aScatteredPosition, aPhotoPosition, uMorphProgress)` in vertex shader

### Prior Phase Context
- `.planning/phases/14-particle-field-core/14-CONTEXT.md` — Dual buffer architecture, scattered buffer strategy
- `.planning/phases/15-memory-flight-controller/15-CONTEXT.md` — FlightCamera, progress system, CapsuleShell integration
- `.planning/phases/12-flagship-scene-portal/12-CONTEXT.md` — PortalVFX, experience arc, portal entry/exit

### Research Flags (from STATE.md)
- Phase 16 (portal disorientation): Store departure globe camera state in sessionStorage on entry; restore on return. Pre-load memory scene photo during portal animation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uMorphProgress` uniform — already wired in particleShaders.js vertex shader. GSAP can animate this directly.
- `ArcController` in CapsuleShell — GSAP timeline for experience arc. Reference for GSAP timeline patterns.
- `PortalVFX` in CapsuleShell — existing portal entry/exit. Phase 16 REPLACES this with dream-logic transitions.
- `particleSampler.js` — generates `scatteredPositions`. Must be modified to produce directional tunnel scatter instead of current distribution.

### Established Patterns
- GSAP for timeline-driven animations (CinematicCamera, ArcController)
- `useImperativeHandle` for exposing animation controls (ArcController, FlightCamera)
- React Router navigation via `useNavigate` in CapsuleShell
- `sessionStorage` used elsewhere for first-visit detection

### Integration Points
- `CapsuleShell.jsx` PortalVFX — replace with DreamPortal transition system
- `particleSampler.js` scatteredPositions — modify distribution to be directional tunnel
- `ParticleFieldRenderer.jsx` — expose morph progress control for transition system
- `CapsuleShell.jsx` route navigation — delay navigation until rupture point in dissolve

</code_context>

<specifics>
## Specific Ideas

- The dissolve should read as "falling into a dream corridor," not as a spherical explosion
- Tunnel void is a "directed memory current" — layered depth bands, vanishing-point convergence, intermittent filament structures
- Reform has a "crystallization beat" — the moment the memory becomes recognizable is the emotional peak
- Exit reverses the same grammar — preserves the world's visual language
- sessionStorage camera state makes return feel intentional, not reset-driven
- The tunnel is dream descent, not sci-fi hyperspace

</specifics>

<deferred>
## Deferred Ideas

- Audio-reactive soundscape during transitions — Phase 17 (SOUND-01, SOUND-02)
- Multiple transition variations per mood — future milestone
- Origin page particle reform on exit (what exactly "reforms" on the home page) — simplified for v2.2, just navigate back

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-dream-portal-transition*
*Context gathered: 2026-03-24 via smart discuss*
