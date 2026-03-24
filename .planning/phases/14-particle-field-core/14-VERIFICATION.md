---
status: human_needed
phase: 14
verified: 2026-03-23
---

# Phase 14 Verification

## Automated Checks

| Check | Result | Evidence |
|-------|--------|----------|
| `src/components/particleMemory/particleSampler.js` exists | PASS | File found |
| `src/components/particleMemory/wireConnections.js` exists | PASS | File found |
| `src/components/particleMemory/particleShaders.js` exists | PASS | File found |
| `src/components/particleMemory/wireShaders.js` exists | PASS | File found |
| `src/components/particleMemory/ParticleMemoryField.jsx` exists | PASS | File found |
| `src/components/ParticleFieldRenderer.jsx` exists | PASS | File found |
| `src/pages/ParticleMemoryField.jsx` deleted (dead monolithic code) | PASS | `ls` returns "no such file" |
| `particleSampler.js` has grid + edge (Sobel) sampling | PASS | Lines 83-98 (grid), 101-143 (Sobel edge boost) |
| `particleSampler.js` returns `isEdgeFlags` Float32Array | PASS | Lines 155, 172, 185 |
| `wireConnections.js` exports `SpatialHash` class | PASS | Line 15 `export class SpatialHash` |
| `wireConnections.js` exports `computeWireConnections()` | PASS | Line 71 `export function computeWireConnections` |
| `wireConnections.js` uses spatial hash for neighbor lookup | PASS | Lines 83-86 (build hash), 100/141 (getNeighborCells) |
| `wireConnections.js` has 70% edge + 30% sparse dual pass | PASS | Lines 92 (edgeBudget = 70%), 128-164 (sparse pass) |
| `wireConnections.js` caps at 10K max connections | PASS | Line 75 `maxConnections = 10000` |
| `particleShaders.js` has `breathScale` (+/- 12% size oscillation) | PASS | Line 45 `float breathScale = 1.0 + sin(breathPhase) * 0.12` |
| `particleShaders.js` has `vBreathPhase` varying | PASS | Lines 25, 52, 65 |
| `particleShaders.js` has `brightnessPulse` in fragment shader | PASS | Line 83 `float brightnessPulse = 1.0 + sin(vBreathPhase) * 0.1` |
| `particleShaders.js` has `aPhotoPosition` attribute | PASS | Line 15 |
| `particleShaders.js` has `aScatteredPosition` attribute | PASS | Line 16 |
| `particleShaders.js` has `uMorphProgress` uniform | PASS | Line 13 |
| `particleShaders.js` interpolates positions with `mix()` | PASS | Line 29 `vec3 basePos = mix(aScatteredPosition, aPhotoPosition, uMorphProgress)` |
| `ParticleMemoryField.jsx` sets `aPhotoPosition` BufferAttribute | PASS | Line 39 |
| `ParticleMemoryField.jsx` sets `aScatteredPosition` BufferAttribute | PASS | Line 40 |
| `ParticleMemoryField.jsx` renders `<lineSegments>` when wireData present | PASS | Line 93 |
| `ParticleMemoryField.jsx` guards lineSegments behind wireData null check | PASS | Lines 50, 71 |
| `ParticleFieldRenderer.jsx` imports `EffectComposer`, `Bloom`, `Vignette` | PASS | Line 17 |
| `ParticleFieldRenderer.jsx` uses `HalfFloatType` framebuffer | PASS | Lines 19, 40 |
| `ParticleFieldRenderer.jsx` has `luminanceThreshold={0.35}` | PASS | Line 44 |
| `ParticleFieldRenderer.jsx` has `mipmapBlur` on Bloom | PASS | Line 47 |
| `ParticleFieldRenderer.jsx` gates bloom behind `tier === 'full'` | PASS | Line 150 `{isFullTier && <ParticlePostProcessing />}` |
| `ParticleFieldRenderer.jsx` sets simplified tier to 55K grid-only | PASS | Lines 75-78 |
| `ParticleFieldRenderer.jsx` skips wire computation for simplified | PASS | Line 90 `if (isFullTier && data.isEdgeFlags)` |
| `ParticleFieldRenderer.jsx` shows CSS vignette for non-full tier | PASS | Line 159 `{!isFullTier && particleData && <div className="capsule-vignette" />}` |
| `ParticleFieldRenderer.jsx` imports `CinematicCamera` from CapsuleShell | PASS | Line 23 |
| `ParticleFieldRenderer.jsx` renders `CinematicCamera` with keyframes | PASS | Lines 142-149 |
| `CapsuleShell.jsx` exports `CinematicCamera` as named export | PASS | Line 210 `export function CinematicCamera` |
| `CapsuleShell.jsx` has `renderMode === 'particle-memory'` dispatch case | PASS | Line 1018 |
| `CapsuleShell.jsx` lazy-loads `ParticleFieldRenderer` | PASS | Line 17 `React.lazy(() => import('../components/ParticleFieldRenderer'))` |
| `CapsuleShell.jsx` wraps ParticleFieldRenderer in `React.Suspense` | PASS | Lines 1051-1064 |
| `CapsuleShell.jsx` ParallaxFallback shows 12 CSS dots for particle-memory | PASS | Lines 816-834 |
| `memoryScenes.js` syros-cave has `renderMode: 'particle-memory'` | PASS | Line 169 |
| `memoryScenes.js` syros-cave has `photoUrl` | PASS | Line 171 `memory/syros-cave/photo.webp` |
| `memoryScenes.js` syros-cave has `depthMapUrl` | PASS | Line 172 `memory/syros-cave/depth.png` |
| `memoryScenes.js` syros-cave particleConfig `gridParticleCount: 80000` | PASS | Line 265 |
| `memoryScenes.js` syros-cave particleConfig `edgeBoostCount: 70000` | PASS | Line 267 |
| `wireShaders.js` has `uTime` wire alpha pulse | PASS | Line 36 `sin(uTime * 0.8) * uWirePulse` |
| Wire LineSegments use `AdditiveBlending` | PASS | `ParticleMemoryField.jsx` line 78 |
| Particles use `NormalBlending` (intentional — AdditiveBlending only on wires) | PASS | `ParticleMemoryField.jsx` line 66 |

---

## Requirement Coverage

| REQ-ID | Status | Evidence |
|--------|--------|----------|
| PART-01 | PASS (code) | `particleSampler.js` — grid pass (80K base) + Sobel edge boost (70K bonus) = up to 150K particles. `photoPositions` Float32Array maps pixel UV to 3D XY plane with Z from depth channel. Grid stride computed from `config.gridParticleCount`. |
| PART-02 | PASS (code) | `wireConnections.js` — `SpatialHash` class + `computeWireConnections()`. Dense edge pass (70% budget, edge particles within 0.06 world units) + sparse ambient pass (30% budget, sampled every N non-edge particles, threshold 0.15). Max 10K connections as `LineSegments`. Emissive colors averaged from connected particles with distance-faded alpha. |
| PART-03 | PASS (code) / HUMAN for visual | `particleShaders.js` — depth-correlated breathing: `sin(uTime * breathSpeed - aDepthValue * PI)` drives `breathScale` (+/- 12% size) and `brightnessPulse` (+/- 10% brightness) via `vBreathPhase` varying. `ParticleFieldRenderer.jsx` — `EffectComposer + Bloom(intensity=1.4, luminanceThreshold=0.35, mipmapBlur) + Vignette` on full tier. Shader halo ring on all tiers (fragment `smoothstep(1.0, 0.3, d) * 0.15`). Visual animation confirmation requires manual browser test. |
| PART-04 | PASS (code) / HUMAN for 60fps | Full tier: scene `particleConfig` 80K+70K=150K, wires, bloom, DPR [1,2]. Simplified tier: forced to 55K grid-only (`edgeBoostEnabled: false`), no wires (`isFullTier` gate), no bloom, DPR [1,1], CSS vignette. Parallax tier: `CapsuleShell` routes to `ParallaxFallback` (CSS Ken Burns + 12 animated dots). 60fps performance on simplified tier requires manual profiling. |
| INTEG-01 | PASS | `CapsuleShell.jsx` line 1018: `else if (renderMode === 'particle-memory') { showParticleMemory = true }`. `ParticleFieldRenderer` is `React.lazy()`-loaded and rendered in `React.Suspense`. Shell, route, narrative overlay, and fallback all unchanged. `memoryScenes.js` `syros-cave` entry updated to `renderMode: 'particle-memory'`. |
| INTEG-02 | PASS | `particleSampler.js` returns both `photoPositions` (Float32Array, 3 per particle) and `scatteredPositions` (Float32Array, deterministic spherical distribution, 3 per particle). `ParticleMemoryField.jsx` sets both as `BufferAttribute`. `particleShaders.js` vertex shader interpolates via `mix(aScatteredPosition, aPhotoPosition, uMorphProgress)`. `uMorphProgress` uniform exposed via `useImperativeHandle` for Phase 16 control. Default `uMorphProgress: 1.0` = photo-formed at Phase 14. |

---

## Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `/memory/syros-cave` renders recognizable 3D particle field | HUMAN | Code path complete: `renderMode: 'particle-memory'` in scene → `ParticleFieldRenderer` → CPU samples photo + depth → `ParticleMemoryField` renders as `<points>` with photo-UV positions in 3D. Visual recognition requires browser test with actual `photo.webp` + `depth.png` assets present at `public/memory/syros-cave/`. |
| 2 | Visible wire connections along depth edges | HUMAN | Code path complete: spatial hash + dual-pass connection computation → `<lineSegments>` with AdditiveBlending. Visual confirmation (luminous filaments along depth contours) requires browser test. |
| 3 | Particles breathe + bloom glow | HUMAN | Code path complete: `breathScale`, `vBreathPhase`, `brightnessPulse` in shaders; `EffectComposer + Bloom` on full tier. Temporal animation confirmation requires browser test (watch 5s). |
| 4 | Simplified tier 50-80K at 60fps, parallax CSS fallback | PARTIAL HUMAN | Simplified tier forces `gridParticleCount: 55000`, no wires, no bloom — code verified. Parallax falls to `ParallaxFallback` + CSS dots — code verified. 60fps performance requires GPU profiling on mid-range device. |
| 5 | Both scattered and photo position buffers exist at init | PASS | `particleSampler.js` allocates `photoPositions` (Float32Array, count*3) and `scatteredPositions` (Float32Array, count*3) in a single `sampleParticles()` call. Both set as `BufferAttribute` in `ParticleMemoryField.jsx` geometry before first render. |

---

## must_haves

From plan acceptance criteria — checked against actual code:

**14-01 must_haves:**
- [x] `ParticleMemoryField` component exports from modular path (`src/components/particleMemory/`)
- [x] CPU sampling via offscreen canvas + `getImageData()` (particleSampler.js lines 17-22)
- [x] `aScatteredPosition` and `aPhotoPosition` attributes present in BufferGeometry (ParticleMemoryField.jsx lines 39-40)
- [x] Vertex shader `mix(aScatteredPosition, aPhotoPosition, uMorphProgress)` (particleShaders.js line 29)
- [x] Fragment shader soft circles with halo glow (particleShaders.js lines 69-77)
- [x] Depth-correlated breathing (foreground breathes first via `aDepthValue * 3.14159` phase offset)
- [x] Wire connections via spatial hash — ported in 14-03 to modular `wireConnections.js`
- [x] `renderMode === 'particle-memory'` routes to `ParticleFieldRenderer` in CapsuleShell
- [x] `syros-cave` scene has `renderMode: 'particle-memory'`
- [x] ParallaxFallback shows 12 sparse CSS dots for particle-memory scenes

**14-02 must_haves:**
- [x] `breathScale` in `particleShaders.js` (line 45)
- [x] `vBreathPhase` varying in `particleShaders.js` (lines 25, 52, 65)
- [x] `brightnessPulse` in fragment shader (line 83)
- [x] `EffectComposer` + `Bloom` + `luminanceThreshold={0.35}` + `mipmapBlur` in `ParticleFieldRenderer.jsx`
- [x] `Vignette` postprocessing in `ParticleFieldRenderer.jsx`
- [x] `HalfFloatType` framebuffer for HDR bloom
- [x] Bloom conditionally on `tier === 'full'` only
- [x] `capsule-vignette` CSS class for simplified tier
- [x] `export function CinematicCamera` from `CapsuleShell.jsx`
- [x] `CinematicCamera` imported and rendered with `keyframes` + `fallbackTarget` in `ParticleFieldRenderer.jsx`

**14-03 must_haves:**
- [x] `wireConnections.js` exports `SpatialHash` class and `computeWireConnections()`
- [x] `wireShaders.js` exports `WIRE_VERT` and `WIRE_FRAG`
- [x] `particleSampler.js` returns `isEdgeFlags` Float32Array
- [x] `ParticleMemoryField.jsx` renders `<lineSegments>` when wireData is present
- [x] Wire lines have emissive color and distance-faded alpha
- [x] Wire alpha pulses with `uTime` (`sin(uTime * 0.8) * uWirePulse`)
- [x] `ParticleFieldRenderer.jsx` computes wires for full tier only
- [x] Simplified tier skips wire computation entirely (no CPU cycles wasted — not just hidden)
- [x] Dead monolithic `src/pages/ParticleMemoryField.jsx` (671 lines) deleted

---

## human_verification

The following items cannot be verified without a running browser session. They require navigating to `/memory/syros-cave` on a device with the `public/memory/syros-cave/` assets present (`photo.webp`, `depth.png`, `preview.jpg`, `mask.png`).

1. **PART-01 visual** — The particle field renders the syros cave as a recognizable 3D scene (not a flat texture or isolated dots). The cave arch, rock walls, and sea/sky through the opening should be identifiable from the default camera angle at `[0, 0.18, 3.4]`.

2. **PART-02 visual** — Visible luminous filaments (wire connections) appear along depth contours and edges in the particle field. Wires should be distinct from particles — thinner, dimmer, following depth boundaries.

3. **PART-03 visual** — Particles visibly breathe (size and brightness oscillation with a foreground-to-background wave) over 5 seconds of observation. Bloom glow halos visible on bright particles on a full-tier GPU.

4. **PART-04 60fps** — On a mid-range GPU (force simplified tier via `gpuCapability.js` or DevTools GPU throttle), the 55K particle scene renders at sustained 60fps. Verify in DevTools Performance tab or `stats.js`.

5. **PART-04 parallax** — On a low-end device (force parallax tier), the existing `ParallaxFallback` renders with photo + Ken Burns animation + 12 CSS particle dots floating over it.

6. **Asset presence** — Confirm `public/memory/syros-cave/photo.webp`, `depth.png`, `preview.jpg`, and `mask.png` exist. The renderer will silently fail to sample particles if assets are missing (console error logged but no UI crash — graceful).

---

## Summary

Phase 14 is **code-complete**. All 6 requirement IDs (PART-01, PART-02, PART-03, PART-04, INTEG-01, INTEG-02) are implemented across 6 modular files:

- `particleSampler.js` — CPU sampling pipeline (grid + Sobel edge boost, dual position buffers, isEdgeFlags)
- `wireConnections.js` — SpatialHash + dual-pass connection computation (10K max, 70/30 edge/sparse)
- `wireShaders.js` — Emissive wire GLSL with distance-faded alpha + breathing pulse
- `particleShaders.js` — Breathing vertex shader (breathScale, vBreathPhase, brightnessPulse) + soft-circle halo fragment
- `ParticleMemoryField.jsx` — R3F component rendering `<points>` + optional `<lineSegments>`
- `ParticleFieldRenderer.jsx` — Top-level renderer with Canvas, CinematicCamera, tier-adaptive postprocessing

The `CapsuleShell.jsx` dispatch correctly routes `renderMode: 'particle-memory'` to a lazily-loaded `ParticleFieldRenderer`, and `memoryScenes.js` syros-cave is configured with 80K grid + 70K edge boost (150K max full tier), 55K simplified tier, and full `particleConfig`. All dead code (monolithic 14-01 file) removed.

Status is **human_needed** because 4 of 5 success criteria require visual or performance browser verification that cannot be confirmed by static analysis alone. Code architecture is structurally sound — no gaps found.
