# Phase 12: Flagship Scene + Portal - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

One real Jared memory proven end-to-end as an unforgettable capsule — with SAM layer separation, emotional narrative, portal transitions, and the full experience arc from still image awakening to gentle recession. Uses test-capsule placeholder for wiring; real flagship photo swapped when chosen.

</domain>

<decisions>
## Implementation Decisions

### Flagship Photo + Narrative
- **D-01:** Flagship photo TBD — user will review photo library against criteria (depth layers, emotional charge, lighting, simplicity, narrative potential). Use `test-capsule` placeholder for all Phase 12 wiring. Real assets swapped into `public/memory/{scene-id}/` when chosen.
- **D-02:** Narrative tone: "Remembered thoughts, not captions" (ARC-01). First-person present-tense fragments. 3-4 glass cards. Builds emotional arc: place → feeling → meaning → gratitude.
- **D-03:** Narrative cards appear AFTER awakening completes (camera beat 1 starts). No text during the initial depth reveal — let the visual speak first.
- **D-04:** Cards sync to camera beats (2s/6s/11s/16s approximate timing).

### Experience Arc
- **D-05:** ARC-01 Awakening: Scene starts as flat still image. `depthScale` animates 0→1 over 3-4s via GSAP tween. Camera holds still during awakening — let the depth be the event. Must feel like something being remembered, not an effect being toggled.
- **D-06:** ARC-02 Layer separation: SAM mask generated offline (same pipeline as depth). Foreground displaced at 1.2x depthScale, background at 0.8x. Different drift speeds create "looking through a window" parallax.
- **D-07:** ARC-03 Recession: Reverse the awakening — depthScale 1→0 over 3s + camera slowly pulls back + scene fades to warm white. The memory returns to your mind, not a hard cut.
- **D-08:** Softness is paramount. Both awakening and recession must feel organic, not mechanical.

### Portal Transition
- **D-09:** PORT-03: Reuse PortalVFX (existing 5-phase system: seep → gathering → rupture → emerging → residual). Route changes during rupture phase. Origin at click coordinates.
- **D-10:** Portal exit: Memory recession completes first (ARC-03), then reverse portal phases. Two-stage exit: content fades, then portal closes.
- **D-11:** Entry trigger: Globe/constellation click dispatches portal + navigate. PortalVFX origin at click coordinates. Full globe/constellation integration deferred to Phase 13 — Phase 12 wires a test entry point.
- **D-12:** Placeholder wiring: Wire PortalVFX for test-capsule scene. Real flagship entry point wired when photo is chosen.

### Claude's Discretion
- Exact GSAP easing curves for awakening/recession (must feel soft/organic)
- SAM mask threshold values for foreground/background separation
- Portal phase timing (how long each PortalVFX phase lasts)
- Recession fade-to-white color temperature
- Test entry point location (e.g., temporary button on home page or direct URL)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 12 Requirements
- `.planning/REQUIREMENTS.md` §v2.1 — SHELL-04, PORT-01, PORT-03, ARC-01, ARC-02, ARC-03

### Phase 10-11 Code (build on top of)
- `src/pages/CapsuleShell.jsx` — Full cinematic stack: DisplacedMeshRenderer, CinematicCamera, AtmosphericParticles, CapsulePostProcessing, soundtrack, ducking
- `src/data/memoryScenes.js` — Scene registry with cameraKeyframes, mood, depthConfig, soundtrack
- `src/components/PortalVFX.jsx` — Existing 5-phase portal transition system

### Existing Patterns
- `src/pages/Home.jsx` — Globe click handlers for navigation
- `src/context/AudioContext.jsx` — AudioProvider with duck/restore

### Prior Phase Context
- `.planning/phases/10-foundation-asset-pipeline/10-CONTEXT.md` — Mesh, tiers, shell architecture
- `.planning/phases/11-cinematic-polish/11-CONTEXT.md` — Camera, atmosphere, soundtrack decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PortalVFX.jsx` — 5-phase portal canvas effect with configurable colors, ring radius, wobble, particles
- `CapsuleShell.jsx` — Full cinematic renderer ready for arc animations
- `memoryScenes.js` — Scene registry with test-capsule entry
- `validate-capsule.mjs` — Asset validation script

### Established Patterns
- GSAP timelines for multi-phase animations (CinematicCamera pattern)
- Window.__prismConfig for portal settings (PortalVFX reads from this)
- View Transitions API for route transitions (Phase 3)

### Integration Points
- `CapsuleShell.jsx` — Add awakening/recession GSAP animations on depthScale uniform
- `memoryScenes.js` — Add flagship scene entry when photo chosen
- `Home.jsx` or `App.jsx` — Wire PortalVFX as entry transition to /memory/:sceneId
- `PortalVFX.jsx` — No modifications needed, just wire it into the navigation flow

</code_context>

<specifics>
## Specific Ideas

- The awakening must feel like "something being remembered" — organic, soft, not mechanical or toggled
- SAM layer separation: foreground at 1.2x depth, background at 0.8x — creates "looking through a window" parallax
- Portal route change happens at the rupture moment — the threshold beat
- Recession → reverse portal is a two-stage exit: content fades first, then portal closes
- No narrative text during the initial depth reveal — the visual IS the first beat
- Test-capsule placeholder for all wiring; real assets swapped later

</specifics>

<deferred>
## Deferred Ideas

- Real flagship photo selection — user reviewing photo library (not blocked, wiring uses placeholder)
- Globe/constellation entry point integration — Phase 13 (PORT-05)
- CapsuleEditor (lil-gui) for live tuning — Phase 13 (ASSET-02)
- Multiple capsule scenes — future milestone

</deferred>

---

*Phase: 12-flagship-scene-portal*
*Context gathered: 2026-03-23*
