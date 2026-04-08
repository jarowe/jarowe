# Phase 14: Particle Field Core - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

A photo + depth map produces a luminous 3D particle field of 80K-150K points with selective wire connections, breathing animation, and tier-adaptive rendering — integrated into the existing CapsuleShell dispatch as `renderMode: 'particle-memory'` with dual position buffers (scattered + photo-formed) pre-allocated at init for Phase 16 dream portal transitions.

</domain>

<decisions>
## Implementation Decisions

### Particle Sampling Strategy
- **D-01:** Hybrid grid + edge boost. Base uniform UV grid (~80K particles) ensures the image is always recognizable from any angle. Edge-boost pass adds ~40-70K bonus particles along depth discontinuities detected by Sobel filter on the depth map. Two-pass CPU init: grid fill + edge supplement. For syros-cave, this concentrates density on bell, frame, figure, and cave contours rather than wasting budget on open water.
- **D-02:** CPU-side init. JavaScript reads photo + depth as Image, draws to offscreen canvas, `getImageData()`, computes all positions/colors/sizes into Float32Arrays, writes to BufferGeometry attributes once. Shader reads attributes — does not sample textures for positioning. Deterministic positions enable wire connection precompute, dual buffers, tier-specific budgets, and debugging.
- **D-03:** Direct pixel color. Each particle gets exact RGB from its photo pixel — the field IS the photo decomposed. Photo identity must survive first; dream treatment (luminance boost, saturation shift, optional mood tint) applied in the fragment shader as a secondary pass.
- **D-04:** Soft circle particles. `gl_PointSize` circles with `smoothstep` radial falloff in fragment shader. Cheapest at 150K, blooms cleanly, reads as light rather than UI confetti. Leaves room for wire structure and camera movement to carry the style.

### Wire Connection Rules & Style
- **D-05:** Hybrid connections — dense at depth edges + sparse ambient field. Dense connections form along depth contours (particles near high Sobel gradient AND within 3D distance threshold). Sparse KNN connections (K=1, long distance threshold) across flat regions add ambient web texture. Two visual layers: structural contours + whispering field. ~10K total connections pre-computed via spatial hash grid. Restraint on sparse field — it should whisper, not web the whole frame shut.
- **D-06:** Thin luminous LineSegments. `THREE.LineSegments` with a ShaderMaterial — emissive color averaged from connected particle colors, alpha fading with 3D distance between endpoints. Filaments of intelligence, not solid geometry competing with points.
- **D-07:** Static topology, dynamic alpha. Connection topology computed once at init via spatial hash. Particle positions update per-frame (breathing), so line endpoints follow. Alpha/opacity can pulse with breathing. Memory shimmers, doesn't rewire itself every frame.

### Breathing & Bloom Character
- **D-08:** Depth-correlated breathing waves. Breathing phase correlates with depth value — foreground breathes first, wave rolls backward into the scene. Creates a "memory breathing toward you" sensation. Small random phase jitter on top for organic feel. Base behavior is spatially intentional, not purely random noise.
- **D-09:** Layered glow. Shader-based halo extends the soft-circle falloff with a secondary low-alpha ring (all tiers get baseline luminous quality). Postprocessing bloom (UnrealBloom / @react-three/postprocessing Bloom) on full tier only for premium bleed and dream glow. Two glow systems: shader halo is universal, postprocessing bloom is premium.
- **D-10:** Depth + luminance driven size variation. Foreground particles slightly larger (closer = bigger, natural perspective). Brighter pixels get slightly larger particles (luminance-weighted). Small random jitter on top. Size variation should feel like optics and energy, not metadata about the sampling strategy.

### Tier Adaptation
- **D-11:** Full tier (desktop hero): 150K particles (80K grid + 70K edge boost), wire connections (~10K LineSegments), shader halo + postprocessing bloom, DPR up to 2.0, full breathing + size variation. The premium experience.
- **D-12:** Simplified tier (mid-range): 50-60K particles (grid only, no edge boost), NO wire connections, shader halo only (no postprocessing bloom), DPR 1.0, breathing + size variation preserved. Clean memory read without premium overhead.
- **D-13:** Parallax tier (low-end): Existing CSS ParallaxFallback (layered photo, Ken Burns drift, CSS vignette, film grain) PLUS a sparse CSS-animated particle overlay — a few drifting luminous dots over the photo. Hints at particle-memory identity without WebGL. Restrained — don't turn fallback into faux-premium clutter.

### Claude's Discretion
- Exact Sobel gradient threshold for edge detection
- Spatial hash grid cell size and KNN distance thresholds
- Breathing wave speed, amplitude, and jitter magnitude
- Bloom luminance threshold and intensity values
- Particle base size and size variation multipliers
- Wire alpha fade curve and pulse parameters
- Connection count split between edge-dense and sparse-ambient
- CSS particle overlay count and animation for parallax fallback
- Internal component decomposition (ParticleFieldRenderer, ParticleMemoryField, WireConnections, etc.)
- Scattered buffer distribution strategy (random spherical, random cylindrical, noise-based)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 14 Requirements
- `.planning/REQUIREMENTS.md` §v2.2 — PART-01, PART-02, PART-03, PART-04, INTEG-01, INTEG-02

### Existing Code (build on top of)
- `src/pages/CapsuleShell.jsx` — Renderer dispatch (renderMode routing), DisplacedMeshRenderer, ParallaxFallback, ArcController, CinematicCamera, AtmosphericParticles, soundtrack/ducking integration
- `src/data/memoryScenes.js` — Scene registry with renderMode, depthConfig, cameraKeyframes, mood, arc, soundtrack fields
- `src/utils/gpuCapability.js` — `getGpuTier()` returning 'full' | 'simplified' | 'parallax'

### Shader & Particle Patterns (follow these)
- `src/pages/CapsuleShell.jsx` AtmosphericParticles — R3F Points + ShaderMaterial with per-particle `aRandom` attribute, `uTime` uniform, drift math pattern
- `src/pages/CapsuleShell.jsx` DisplacedPlane — ShaderMaterial setup via `useMemo` + `useRef`, texture loading, uniform animation via `useImperativeHandle`
- `src/constellation/scene/ParticleCloud.jsx` — Large-scale Points system with gentle drift, per-particle phase randomization

### Prior Phase Context
- `.planning/phases/10-foundation-asset-pipeline/10-CONTEXT.md` — CapsuleShell architecture, GPU tier system, WebGL lifecycle, asset pipeline
- `.planning/phases/11-cinematic-polish/11-CONTEXT.md` — Camera, atmosphere, postprocessing, soundtrack, tier adaptation patterns
- `.planning/phases/12-flagship-scene-portal/12-CONTEXT.md` — ArcController, experience arc, PortalVFX integration

### Research Flags (from STATE.md)
- Wire connections: spatial hash grid, ~10K connections as pre-built LineSegments index buffer
- Asset weight: photo WebP q80 max 2048px, depth 8-bit single-channel max 1024px, <500KB total
- WebGL context: one at a time, previous contexts released before mounting particle Canvas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CapsuleShell.jsx` — Full cinematic stack (renderer dispatch, narrative overlay, soundtrack, ducking, camera, particles, postprocessing, arc controller). Phase 14 adds a new renderer path alongside existing DisplacedMeshRenderer.
- `memoryScenes.js` — Scene registry. Add `renderMode: 'particle-memory'` entry for syros-cave alongside existing displaced-mesh scenes.
- `gpuCapability.js` — `getGpuTier()` — reuse as-is for tier routing.
- `AtmosphericParticles` (in CapsuleShell) — R3F Points + ShaderMaterial boilerplate, drift math, tier-adapted counts. Reference for particle shader patterns.
- `ArcController` — GSAP uniform animation via `useImperativeHandle`. Reference for morphProgress / breathing uniform animation.
- `ParticleCloud.jsx` (constellation) — Large Points system with per-particle attributes, gentle drift, phase randomization.

### Established Patterns
- Custom ShaderMaterial with `useMemo` + `useRef` for uniforms (globe, displaced plane, atmospheric particles)
- React.lazy() + Suspense for heavy 3D components
- `import.meta.env.BASE_URL` for all asset paths
- GSAP for timeline-driven animations, Framer Motion for UI
- Glass-panel aesthetic for overlays
- Per-scene config objects in scene registry (depthConfig pattern)

### Integration Points
- `CapsuleShell.jsx` renderer dispatch (~line 976) — add `renderMode === 'particle-memory'` case routing to new ParticleFieldRenderer
- `memoryScenes.js` — add/update syros-cave entry with `renderMode: 'particle-memory'`
- Existing CinematicCamera, NarrativeOverlay, soundtrack integration — reusable from CapsuleShell for the particle renderer path

</code_context>

<specifics>
## Specific Ideas

- The field must be recognizable as "that exact memory" from any angle on the camera rail — photo identity survives through direct pixel color, not stylization
- Wire connections read as "filaments of intelligence" — light structure, not solid geometry competing with the particle field
- Breathing should feel intentional and spatial (memory forming toward the viewer), not generic ambient noise
- Simplified tier should preserve the core memory read cleanly rather than badly preserving every premium feature — cut structure, keep recognition
- Parallax fallback should hint at particle-memory identity (sparse CSS dots) without becoming faux-premium clutter
- Size variation should feel like optics (perspective, luminance) and energy, not like metadata advertising the sampling strategy
- Restraint on the sparse ambient wire connections — they whisper, they don't web the whole frame shut

</specifics>

<deferred>
## Deferred Ideas

- Scroll-driven camera flight through the particle field — Phase 15 (FLIGHT-01 through FLIGHT-04)
- Dream portal dissolve/reform transitions — Phase 16 (DREAM-01 through DREAM-04), consumes the dual position buffers allocated here
- Progress-reactive audio soundscape — Phase 17 (SOUND-01, SOUND-02)
- Audio-reactive particle displacement — future milestone (CAPSULE-04)
- GPU compute particles (GPUComputationRenderer) — future milestone (CAPSULE-06)
- Multiple flagship scenes — future milestone (CAPSULE-05)

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-particle-field-core*
*Context gathered: 2026-03-23*
