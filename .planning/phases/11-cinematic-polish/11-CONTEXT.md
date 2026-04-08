# Phase 11: Cinematic Polish - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

The displaced mesh transforms from a tech demo into a cinematic experience — constrained camera choreography via GSAP multi-beat keyframes, atmospheric particles (dust motes, bokeh, light drift), depth-of-field postprocessing with vignette and film grain, per-scene color grading, and soundtrack integration with GlobalPlayer ducking. Atmosphere must be restrained — subordinate to the photo, not piled on top.

</domain>

<decisions>
## Implementation Decisions

### Camera Choreography
- **D-01:** CinematicCamera component replaces SlowDrift in CapsuleShell. GSAP timeline with multi-beat keyframes (push-in, pause, slow drift) — no OrbitControls.
- **D-02:** Per-scene `cameraKeyframes` array stored in memoryScenes.js scene registry. Camera motion is part of the memory itself, not generic renderer behavior.
- **D-03:** Easing variety per beat: power2.inOut for drift, power1.out for push, sine.inOut for pause. No screensaver-like linear loops.
- **D-04:** Gentle loop back to start position with crossfade — no jarring reset. Subtle parallax response to mouse/gyro.

### Atmosphere & Postprocessing
- **D-05:** R3F Points with custom ShaderMaterial for 3 particle types: dust motes (slow drift), bokeh specks (depth-aware), light streaks (directional). Matches globe particle patterns.
- **D-06:** @react-three/postprocessing EffectComposer: DepthOfField (focus shift between foreground/background) + Vignette + Noise (film grain). Already in project deps.
- **D-07:** Per-scene color grading via fragment shader uniforms (warmth, saturation, tint) — no LUT textures needed.
- **D-08:** Tier adaptation: full = all effects + particles; simplified = particles + vignette only (skip DOF, grain); parallax = CSS vignette + grain only (already exists from Phase 10).
- **D-09:** Restraint is key — atmosphere must feel like memory waking up, not effects demonstration. Perceptible but subordinate to the photo.

### Soundtrack Integration
- **D-10:** Per-scene Howler.js instance (existing pattern from MemoryPortal). Muted by default, auto-play silent. First click/tap unmutes with 2s fade-in. Respects browser autoplay policy.
- **D-11:** GlobalPlayer ducking: on capsule entry, fade GlobalPlayer to 0.15 volume over 1s. On exit, restore previous volume over 1s. Use AudioProvider's volume controls. Non-destructive.
- **D-12:** No hard soundtrack-to-camera sync. Soundtrack loops independently; camera beats are visual-only. Mood matches scene but timing is free.
- **D-13:** Cross-fade on exit: capsule soundtrack fades out over 1.5s while GlobalPlayer fades back in — no audio gap.

### Claude's Discretion
- Exact particle counts and sizes per tier
- DOF focus distance and bokeh scale values
- Film grain intensity and animation speed
- Color grading default values for warm/cool/golden moods
- GSAP timeline duration defaults for camera beats

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 11 Requirements
- `.planning/REQUIREMENTS.md` §v2.1 — CINE-01, CINE-02, CINE-03, CINE-04, PORT-02, PORT-04

### Phase 10 Code (build on top of)
- `src/pages/CapsuleShell.jsx` — DisplacedMeshRenderer, ParallaxFallback, tier routing, SlowDrift camera (to be replaced)
- `src/data/memoryScenes.js` — Scene registry with depthConfig (extend with cameraKeyframes + mood)
- `src/utils/gpuCapability.js` — getGpuTier() for tier-adaptive effects

### Existing Patterns
- `src/pages/Home.jsx` — Globe particle system (R3F Points + ShaderMaterial pattern)
- `src/context/AudioContext.jsx` — Howler.js AudioProvider for volume ducking
- `src/components/GlobalPlayer.jsx` — Music player with volume controls

### Prior Phase Context
- `.planning/phases/10-foundation-asset-pipeline/10-CONTEXT.md` — Phase 10 decisions on mesh, tiers, shell architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CapsuleShell.jsx` — Shell with DisplacedMeshRenderer, narrative overlay, soundtrack stub — extend with CinematicCamera, particles, postprocessing
- `MemoryPortal.css` — Existing styles for capsule chrome — extend with atmosphere CSS
- `AudioContext.jsx` — Howler.js volume management — use for GlobalPlayer ducking
- Home.jsx particle system — R3F Points + custom ShaderMaterial pattern for dust motes

### Established Patterns
- GSAP + @gsap/react for timeline animations (used in Favorites, Vault, Workshop)
- @react-three/postprocessing EffectComposer (used in constellation scene)
- Per-scene config objects in memoryScenes.js (depthConfig pattern)
- `import.meta.env.BASE_URL` for asset paths

### Integration Points
- `CapsuleShell.jsx` — Add CinematicCamera, AtmosphericParticles, EffectComposer inside Canvas
- `memoryScenes.js` — Add cameraKeyframes, mood, soundtrack fields
- `AudioContext.jsx` — Add duck/restore volume methods

</code_context>

<specifics>
## Specific Ideas

- Camera keyframes are part of the memory itself, not generic renderer behavior — store with scene data
- Atmosphere should feel like "memory waking up" — restrained, subordinate to the photo
- GlobalPlayer should duck (0.15 volume), not pause — preserves the ritual of entering without fighting the audio system
- Cross-fade on exit prevents audio gap between capsule soundtrack and GlobalPlayer

</specifics>

<deferred>
## Deferred Ideas

- Soundtrack-to-camera beat sync — Phase 12+ if needed for flagship emotional arc
- Audio-reactive displacement (Web Audio analyser → shader uniforms) — future milestone
- User volume preferences for ducking ratio — future if needed

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-cinematic-polish*
*Context gathered: 2026-03-23*
