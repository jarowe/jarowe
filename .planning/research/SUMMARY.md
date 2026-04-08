# Research Summary: v2.2 Particle Memory Flight

**Synthesized:** 2026-03-23
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Confidence:** HIGH

---

## 1. Stack Additions Needed

**Zero new npm dependencies.** The entire feature builds on the installed stack.

| Need | Solution | Package |
|------|----------|---------|
| 80K-150K particle rendering | `THREE.Points` + custom `ShaderMaterial` | `three` 0.183.2 (already installed) |
| Scroll-driven camera | GSAP `timeline.progress(scrollNorm)` — paused timeline scrubbed by scroll | `gsap` 3.14.2 |
| Camera spline | `CatmullRomCurve3` | `three` built-in |
| GPU compute (future only) | `GPUComputationRenderer` from `three/examples/jsm/misc/` | `three` (ships with it, no install) |
| Bloom / portal VFX | `BloomEffect`, `ShockWaveEffect`, `ChromaticAberration` | `postprocessing` 6.39.0 |
| Particle dissolve/reform | Vertex shader `uDissolve` uniform, GSAP-driven | no dep |
| Reactive soundscape | Howler `volume()` per-layer + Web Audio `GainNode` | `howler` 2.2.4 |

**Why the commonly-considered alternatives were rejected:**

- Lenis / Locomotive Scroll / ScrollTrigger — all DOM-scroll-centric; an R3F Canvas has no scrollable DOM content to attach to
- Tone.js (~150KB bundle) — full synthesis/sequencing engine; we only need gain crossfades on pre-recorded files; Howler already exposes `Howler.ctx`
- GPU particle libraries (three-nebula, three-quarks) — emitter-based VFX designed for fire/sparks, not photo-derived point clouds
- CSM (three-custom-shader-material) — only valuable for extending PBR materials; `Points` uses raw `ShaderMaterial`, no PBR needed

---

## 2. Feature Table Stakes vs. Differentiators

### Table Stakes (experience feels broken without these)

| Feature | Complexity |
|---------|------------|
| Photo + depth map → positioned, colored 3D particles (80K-150K) | MEDIUM |
| `THREE.Points` rendering at 60fps (single draw call) | MEDIUM |
| Scroll-driven camera on CatmullRom spline rail | MEDIUM-HIGH |
| Particle glow (additive blending + bloom postprocessing) | LOW-MEDIUM |
| Entry dissolve: particles scatter → reform into photo | MEDIUM-HIGH |
| Exit dissolve: photo → scatter, then recession arc | MEDIUM |
| GPU tier gating (full / simplified / parallax fallback) | LOW |
| `memoryScenes.js` schema extension (`particleConfig`, `flightPath`, `soundscape`) | LOW |

Density sweet spot: 80K-150K particles. Below 40K the image is unrecognizable up close; above 300K returns diminishing visual value and eventually looks like the unprocessed photo.

### Differentiators (what separates this from every other particle demo)

| Feature | What It Achieves | Complexity |
|---------|-----------------|------------|
| **Selective wire connections** along depth edges and contours | Produces "holographic memory" look (reference: Linkin Park "Lost" video); without this, it reads as a point-cloud scatter | MEDIUM-HIGH |
| **Particle breathing** (sinusoidal per-particle offset, position/size/brightness) | Field feels alive; prevents static-screenshot appearance | LOW |
| **Progress-reactive soundscape** with per-layer envelope control points | Emotional journey through sound as camera advances; silence through particles is just a WebGL demo | MEDIUM-HIGH |
| **Dreamstate portal transition** (reality dissolves → tunnel → particles reform) | Dream logic entry/exit rather than a sci-fi ring portal; highest user impact but also highest complexity | HIGH |
| **Depth-aware particle density** (importance sampling at depth edges) | Natural foreground/background separation without DOF blur | MEDIUM |
| **Scroll momentum and inertia** (velocity decay on input release) | Physical, inhabitable feel; 1:1 linear scroll mapping kills the "flying through memory" sensation | LOW-MEDIUM |

### Anti-Features to Avoid

- Free-roam camera: reveals density gaps, LOD seams, and connection aliasing at off-axis angles; the authored rail path is the emotional arc
- GPU physics / inter-particle forces: adds complexity, no emotional value; particles bouncing look like a screensaver
- Real-time browser-side depth estimation: seconds of processing; crashes mobile; pre-compute at build/load time
- Full 1:1 pixel-to-particle fidelity (>300K): diminishing returns; eventually just looks like the photo
- Beat-sync reactivity to music: turns memory into a visualizer, breaks emotional tone; subtle atmospheric response is sufficient

---

## 3. Architecture Integration Plan

### 4 New Modules, 3 Modified Files

**New components:**

| Module | File | Role |
|--------|------|------|
| ParticleMemoryRenderer | `src/components/ParticleMemoryRenderer.jsx` | R3F Canvas host; samples photo + depth into `BufferGeometry`; wire connection geometry; owns postprocessing; honors `onAwakeningComplete` / `onRecessionComplete` callbacks |
| MemoryFlightController | `src/components/MemoryFlightController.jsx` | Wheel/touch/trackpad → normalized progress (0-1); CatmullRom spline interpolation; mouse parallax layered on top; exposes `onProgressChange(progress)` |
| DreamPortalTransition | `src/components/DreamPortalTransition.jsx` | Controls `morphProgress` uniform (0=scattered, 1=photo-formed); dual position buffers live in ParticleField; GSAP-driven entry/exit phases |
| MemorySoundscape | `src/components/MemorySoundscape.jsx` | Howl instances per layer; linearly interpolates between `[progress, volume]` envelope control points; mute-state and GlobalPlayer ducking aware |

**Modified files:**

| File | Change |
|------|--------|
| `src/pages/CapsuleShell.jsx` | Add `'particle-memory'` branch to renderMode dispatch; conditional DreamPortalTransition instead of PortalVFX; conditional MemorySoundscape instead of simple Howl; narrative cards gated by progress thresholds instead of delay timers |
| `src/data/memoryScenes.js` | Add `particleConfig`, `flightPath`, `soundscape`, `dreamPortal`, `narrativeThresholds` fields; update `syros-cave` to `renderMode: 'particle-memory'` |
| `src/utils/gpuCapability.js` | No changes — existing 3-tier system maps directly: `full`=120-150K particles, `simplified`=50-80K no bloom, `parallax`=CSS fallback |

**Backward compatibility:** All existing `'displaced-mesh'` and `'splat'` scenes are unchanged. New fields are only read when `renderMode === 'particle-memory'`.

### Build Order (strict dependency chain)

```
Phase 1: ParticleMemoryRenderer (core particle field)
  Static: photo + depth → BufferGeometry. No scroll, no transitions, no audio.
  Gate: verify GPU performance at 80K-150K particles before adding interaction.
        allocate dual position buffers now to avoid Phase 3 rewrite.
    |
Phase 2: MemoryFlightController
  Scroll → progress (0-1) → camera on CatmullRom spline.
  Progress becomes the central data bus for all downstream systems.
  Gate: camera feel validated; narrative cards appear at progress thresholds.
    |
Phase 3: DreamPortalTransition
  morphProgress uniform interpolates scattered ↔ photo-formed positions.
  Requires Phase 1 buffers + Phase 2 activation gating.
  Gate: full entry/exit lifecycle; CapsuleShell callbacks correct.
    |
Phase 4: MemorySoundscape
  Audio polish. Receives progress from Phase 2; no downstream dependents.
  Gate: ambient layers audibly respond to scroll.
```

**Critical design decision — shared particle buffer:** DreamPortalTransition and ParticleField share the same `BufferGeometry`. `scatteredPositions` and `photoPositions` coexist in the buffer; the vertex shader interpolates between them via `morphProgress`. This eliminates geometry swaps during transitions and must be designed into Phase 1 even if Phase 3 is deferred.

---

## 4. Top Pitfalls with Prevention Strategies

### P1: WebGL Context Exhaustion (CRITICAL — Phase 1)

The site already runs three WebGL contexts (globe, Prism3D, constellation). A fourth risks silent context loss on mobile (browsers cap at 8-16). The existing MemoryPortal.jsx "fixes" this with a 600ms setTimeout — a race condition.

**Prevention:** Call `globe.renderer().dispose()` + `forceContextLoss()` explicitly on home page route exit. Memory Capsule route must confirm previous contexts are released before mounting — not a fixed timeout. Never render globe + particle scene simultaneously.

### P2: Depth Map / Photo UV Misalignment (HIGH — Phase 1 asset pipeline)

Depth estimation models output at fixed resolutions (e.g., 512x512 or 518x518). If the color texture is 4000x3000 and depth is 512x512, displacement is spatially incorrect — faces float above bodies.

**Prevention:** Always resize depth map to exactly match photo texture dimensions. Validate by overlaying at 50% opacity — edges must align exactly. Store both dimensions in scene config and validate at load time.

### P3: Mobile GPU Collapse from Cumulative Load (HIGH — establish budget in Phase 1)

Globe shader + constellation DOF + Prism3D glass shader + particle field + bloom = thermal throttling or context lost on mid-range Android within 10 seconds.

**Prevention:** Cap DPR at 1.5 on the particle Canvas. Enforce tier gating strictly: simplified tier = 50-80K particles, no bloom, no wire connections. Profile on real mid-range Android (not just iPhone). Particle draw call must complete in <8ms GPU time.

### P4: Nearest-Neighbor Wire Connection is O(n²) (MEDIUM — Phase 1 build decision)

Naively computing K-nearest neighbors over 150K particles blocks the main thread for seconds.

**Prevention:** Use a spatial hash grid (divide scene into fixed-size cells; compare only within cells and adjacent cells). Pre-compute once at scene load, not per-frame. Target ~10K connections, stored as a pre-built index buffer for a single `LineSegments` draw call.

### P5: Camera Choreography Feeling Mechanical (MEDIUM — Phase 2)

Linear spline interpolation at constant speed looks like a product demo rotation, not a memory journey.

**Prevention:** Spring-smooth the scroll progress value before it drives the spline (not just the camera). Never let the camera fully stop — imperceptible micro-drift always active. Layer three motion frequencies: spline progress (scroll-driven), mouse parallax (15-30ms), breathing micro-drift (8-20s sinusoidal period). Test at 2x speed: if natural at 2x, the base speed is right.

### P6: Asset Weight Bloat (MEDIUM — Phase 1 pipeline)

An unoptimized photo + depth map can be 25MB+. Multiple capsules can double total site asset weight, killing Lighthouse scores and destroying the portal animation mood.

**Prevention:** Photos: WebP quality 80, max 2048px longest side. Depth maps: 8-bit single-channel PNG/WebP, max 1024px. Target under 500KB total per capsule. Begin loading assets during portal animation (1-2s head start). Progressive loading: flat 2D photo first, depth displacement once depth map arrives.

### P7: Portal Entry/Exit Disorientation (MEDIUM — Phase 3)

Hard route navigation (`navigate('/memory/sceneId')`) is a visual teleport. Globe doesn't restore its camera state on return, leaving visitors spatially lost.

**Prevention:** Store departure globe camera state in `sessionStorage` on portal entry; restore exactly on return. Pre-load the memory scene photo texture during the portal animation. On return, portal ring contracts from the same screen region the user entered from.

---

## 5. Key Recommendations for the Roadmap

**1. Zero dependencies is a feature.** Every capability exists in the installed stack. Spend time that would go to dependency evaluation on shader quality and content instead. No package.json changes needed.

**2. Phase 1 is entirely about infrastructure, not visuals.** WebGL context lifecycle, asset UV alignment, compression targets, GPU tier gating, and the spatial-hash connection algorithm must all be correct before any visual polish. Rushing Phase 1 means Phase 2 is spent debugging structural failures.

**3. Wire connections are not optional polish.** Without connections between particles, the result reads as a point-cloud scatter — a tech demo, not a memory. The spatial-hash nearest-neighbor algorithm (MEDIUM-HIGH complexity) should be prioritized early in Phase 1, not deferred.

**4. Design the entire system around the progress float.** The `0-1` progress value from MemoryFlightController drives: camera spline position, particle opacity envelope, soundscape layer volumes, and narrative card visibility. This is the single data bus. All four modules are downstream consumers. Get the scroll normalization and spring-smoothing right in Phase 2 before anything else depends on it.

**5. Dual position buffers must be allocated in Phase 1 even if Phase 3 (dreamstate portal) is deferred.** DreamPortalTransition shares the same BufferGeometry as ParticleField and controls `morphProgress` in the vertex shader. If Phase 1 only allocates `photoPositions`, Phase 3 requires a destructive buffer layout refactor. Allocate both buffers upfront — the cost is just extra GPU memory for an unused buffer until Phase 3 activates it.

**6. Soundscape needs real audio assets before Phase 4 can be fully validated.** The MemorySoundscape architecture is well-defined and can be wired in Phase 4, but each scene needs 2-4 ambient layers (drone, wind, texture, climax). Source or commission royalty-free / AI-generated ambient audio during Phase 2/3 so Phase 4 has real content to test against envelope curves.

**7. Set mobile expectations explicitly and make simplified tier excellent.** On any mobile device, simplified tier (50-80K particles, no wire connections, no bloom) is the expected experience by design — not a failure mode. Invest in making simplified tier visually compelling on its own terms. The CSS parallax fallback handles everything below simplified tier with the existing MemoryPortal.jsx pattern.

---

*Synthesized from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Ready for: requirements definition and roadmap planning*
