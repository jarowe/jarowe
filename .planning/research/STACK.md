# Stack Research: v2.2 Particle Memory Flight

**Domain:** 80K-150K particle point cloud rendering from photo+depth, scroll-driven camera flight on rails, dreamstate portal transitions (dissolve/reform), progress-reactive ambient soundscape
**Researched:** 2026-03-23
**Confidence:** HIGH

---

## Executive Summary

The v2.2 Particle Memory Flight milestone replaces the displaced-mesh renderer in CapsuleShell with a luminous particle field you fly through via scroll. The existing stack (Three.js 0.183, R3F 9.5, drei 10.7, postprocessing 6.39, GSAP 3.14, Howler 2.2) covers ~90% of what is needed. **Zero new npm dependencies are required.** The analysis below recommends native solutions for every feature using what is already installed, explains why external scroll libraries and Tone.js are unnecessary, and defines performance budgets.

### Key Decision: No New Dependencies

| Feature | Solution | Why No New Dep |
|---------|----------|----------------|
| 80K-150K particles | `THREE.Points` + custom `ShaderMaterial` | Already used in ParticleCloud.jsx and AtmosphericParticles. BufferGeometry + ShaderMaterial is the proven pattern at this scale. |
| GPU particle physics | `GPUComputationRenderer` from `three/examples/jsm/misc/` | Ships with Three.js 0.183. Already available at `three/examples/jsm/misc/GPUComputationRenderer.js`. |
| Scroll normalization | Native `wheel`/`touchmove` + `requestAnimationFrame` damping | Purpose-built is cleaner than adapting Lenis/Locomotive to an R3F Canvas context. See rationale below. |
| Camera on rails | GSAP timeline scrubbed by scroll progress (0-1) | GSAP 3.14 is already installed. `tl.progress(scrollNorm)` is one line. |
| Wire connections | `THREE.LineSegments` + custom `ShaderMaterial` | Built-in Three.js primitive. drei `Line` or `Segments` also available. |
| Glow/bloom | `postprocessing` `BloomEffect` via `@react-three/postprocessing` | Already installed (v6.39). `SelectiveBloomEffect` available. Currently used for constellation. |
| Portal dissolve/reform | Vertex shader animation on existing particle `ShaderMaterial` | Uniform-driven dissolve factor, no library needed. |
| Ambient soundscape | Howler.js (existing) + Web Audio API gain nodes | Howler already manages playback. Web Audio API `GainNode` crossfades between layers based on scroll progress. No Tone.js needed. |
| Wireframe overlay | `three/examples/jsm/lines/Wireframe.js` + `WireframeGeometry2` | Ships with Three.js. GPU-accelerated wireframe with variable width. |

---

## Existing Stack (DO NOT ADD)

Validated capabilities the particle flight system builds on:

| Package | Installed | Particle Flight Role |
|---------|-----------|---------------------|
| `three` | 0.183.2 | `THREE.Points`, `BufferGeometry`, `ShaderMaterial`, `GPUComputationRenderer`, `LineSegments`, `Wireframe`, `DataTexture` |
| `@react-three/fiber` | 9.5.0 | `Canvas`, `useFrame`, `useThree`, `useLoader`. Hosts the entire particle scene. |
| `@react-three/drei` | 10.7.7 | `Points`, `PointMaterial`, `Sparkles`, `Line`, `CatmullRomLine`, `Trail`, `useTexture`. All optional convenience wrappers. |
| `@react-three/postprocessing` | 3.0.4 | `EffectComposer`, `Bloom`, `DepthOfField`, `Vignette`, `Noise`, `ChromaticAberration`. Portal transitions can layer `GlitchEffect`, `ShockWaveEffect`. |
| `postprocessing` | 6.39.0 | Underlying engine. `SelectiveBloomEffect` for making particles glow without blowing out narrative cards. |
| `gsap` | 3.14.2 | Timeline scrubbed by scroll progress. Camera position, FOV, postprocessing uniforms all animated via GSAP proxy objects. |
| `howler` | 2.2.4 | Audio file loading/decoding/playback. `Howler.ctx` exposes the Web Audio `AudioContext` for gain routing. |
| `maath` | 0.10.8 | `easing.damp3` for frame-rate-independent camera smoothing in `useFrame`. |
| `zustand` | 5.0.12 | Scene state store (scroll progress, active phase, transition state). |
| `framer-motion` | 12.38.0 | Narrative card entrance/exit animations, UI overlays. |

---

## Feature-by-Feature Stack Analysis

### 1. Particle Rendering (80K-150K particles)

**Recommendation: `THREE.Points` + custom `ShaderMaterial` with `BufferGeometry`**

#### Why Not InstancedMesh

| Approach | Draw Calls | Per-Particle Cost | Max Practical Count | Verdict |
|----------|-----------|-------------------|---------------------|---------|
| `THREE.Points` + `ShaderMaterial` | **1** | 1 vertex, 1 gl_Point | 500K+ at 60fps | **Use this** |
| `THREE.InstancedMesh` | **1** | 16 floats (4x4 matrix) per instance | ~50K at 60fps | Overkill for points. Matrix overhead is 16x. |
| drei `<Points>` | 1 | Wrapper around `THREE.Points` | Same as raw Points | Fine but adds abstraction. Raw is clearer for custom shaders. |
| drei `<Instances>` | 1 | InstancedMesh wrapper | ~50K | Same issue as InstancedMesh. |

**Points wins decisively.** At 150K particles, a single `THREE.Points` draw call with `AdditiveBlending` is standard practice. The codebase already uses this exact pattern in two places:
- `src/constellation/scene/ParticleCloud.jsx`: ~2000 shaped particles with custom vertex/fragment shaders, per-particle color/size/shape attributes
- `src/pages/CapsuleShell.jsx` (`AtmosphericParticles`): 175 particles with drift animation

#### Particle Attribute Layout

For a 150K particle photo-to-point-cloud system, each particle needs:

```
position     (Float32, 3)  — x, y, z from photo UV + depth
color        (Float32, 3)  — r, g, b sampled from photo pixel
size         (Float32, 1)  — base particle size (varied by depth)
random       (Float32, 1)  — per-particle phase for drift/twinkle
originalPos  (Float32, 3)  — home position (for dissolve/reform lerp)
```

Total per-particle: 11 floats = 44 bytes
At 150K particles: **6.6MB** GPU buffer. Well within budget.

#### Vertex Shader (conceptual)

```glsl
uniform float uTime;
uniform float uDissolve;     // 0 = formed image, 1 = fully scattered
uniform float uScrollProgress;
uniform vec3 uCameraTarget;

attribute float aRandom;
attribute vec3 aOriginalPos;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;

  // Dissolve: lerp between original position and scattered position
  vec3 scattered = aOriginalPos + normalize(aOriginalPos) * (2.0 + aRandom * 3.0);
  scattered += vec3(
    sin(uTime * 0.5 + aRandom * 6.28) * 0.3,
    cos(uTime * 0.3 + aRandom * 3.14) * 0.2,
    sin(uTime * 0.4 + aRandom * 1.57) * 0.25
  );
  vec3 pos = mix(aOriginalPos, scattered, uDissolve);

  // Gentle drift when formed
  pos += vec3(
    sin(uTime * 0.2 + aRandom * 6.28) * 0.01,
    cos(uTime * 0.15 + aRandom * 3.14) * 0.008,
    0.0
  ) * (1.0 - uDissolve);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (300.0 / -mvPos.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 12.0);
  gl_Position = projectionMatrix * mvPos;

  // Alpha: depth-fade + dissolve-fade
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(20.0, 2.0, dist) * (1.0 - uDissolve * 0.5);
}
```

#### Performance Budget: 150K Points

| Metric | Target | Notes |
|--------|--------|-------|
| Draw calls | 1 (points) + 1-3 (wire lines) + 1-3 (postprocessing) | Total <10 draw calls |
| GPU memory | ~7MB attributes + ~4MB textures | Well under 256MB mobile budget |
| Vertex shader ops | Simple: mix, sin, clamp | No texture lookups in VS for base path |
| Frame time | <8ms GPU on GTX 1060 | Leaves 8ms for postprocessing + compose |
| Mobile (simplified) | 50K particles, no bloom, DPR 1.0 | `getGpuTier()` gates to simplified/parallax |

#### Optional: GPU Compute for Advanced Physics

`GPUComputationRenderer` from `three/examples/jsm/misc/GPUComputationRenderer.js` is available but **NOT recommended for v2.2 initial implementation.** Reasons:

- CPU-side attribute updates in `useFrame` at 150K particles cost ~0.5ms/frame (acceptable)
- GPU compute adds complexity (ping-pong FBOs, GLSL compute shaders, data readback)
- Dissolve/reform and gentle drift are simple enough for vertex shader uniforms
- **Reserve GPU compute for v2.3+ if adding turbulence, flocking, or inter-particle forces**

If needed later, the path is clear: `GPUComputationRenderer` creates `DataTexture` render targets that feed into the particle vertex shader as sampler uniforms. No new dependencies.

---

### 2. Scroll-Driven Camera on Rails

**Recommendation: Native scroll capture + GSAP timeline `.progress()` scrubbing**

#### Why NOT Lenis / Locomotive Scroll / ScrollTrigger

| Library | Why Skip It |
|---------|-------------|
| **Lenis** (0.23, ~8KB) | Designed for DOM scroll smoothing on HTML pages. The particle scene is a full-viewport R3F `<Canvas>` with no scrollable DOM content. Lenis would need an artificial scrollable container, adding complexity for a worse result than direct wheel/touch capture. |
| **Locomotive Scroll** (5.0, ~25KB) | Same DOM-centric issue. Heavier. Designed for parallax websites, not WebGL camera control. |
| **GSAP ScrollTrigger** (~15KB) | Couples to DOM scroll position. Would need a fake scrollable div. GSAP timeline `.progress(n)` already does what we need without ScrollTrigger's DOM dependency. |
| **react-scroll** | DOM scrolling utility, irrelevant to R3F camera control. |

#### Native Scroll Normalization Architecture

```
User Input (wheel / touchmove / trackpad)
  |
  v
ScrollAccumulator (raw delta capture, inertia damping)
  |
  v
scrollProgress: 0.0 → 1.0 (normalized, clamped)
  |
  v
GSAP timeline.progress(scrollProgress)
  |
  v
Camera position/rotation/FOV proxy objects updated by GSAP
  |
  v
useFrame: damp3 camera toward proxy (maath easing)
```

**Implementation approach:**

```javascript
// In a React ref or zustand store
const scrollState = {
  rawDelta: 0,
  velocity: 0,
  progress: 0,       // 0-1 normalized
  totalLength: 5000,  // "virtual scroll distance" in px-equivalents
};

// Capture wheel events on the Canvas container
function onWheel(e) {
  e.preventDefault();
  scrollState.rawDelta += e.deltaY;
}

// In useFrame (every render frame):
function updateScroll(delta) {
  // Apply damping (smooth trackpad inertia)
  scrollState.velocity += (scrollState.rawDelta - scrollState.velocity) * 0.12;
  scrollState.rawDelta *= 0.85; // decay raw input

  // Accumulate into progress
  scrollState.progress += scrollState.velocity / scrollState.totalLength;
  scrollState.progress = Math.max(0, Math.min(1, scrollState.progress));
  scrollState.velocity *= 0.92; // friction

  // Scrub GSAP timeline to this progress
  timeline.progress(scrollState.progress);
}
```

**Touch support:** Same pattern. `touchstart` captures initial Y, `touchmove` computes deltaY, feeds into the same accumulator. `touchend` lets inertia decay naturally.

**Keyboard support:** Arrow up/down add fixed delta pulses. Spacebar advances one "section."

#### GSAP Timeline as Camera Rail

GSAP 3.14's `timeline.progress(n)` accepts 0-1 and interpolates all tweens accordingly. This turns a time-based timeline into a scroll-scrubbed rail:

```javascript
const tl = gsap.timeline({ paused: true }); // paused = manually scrubbed

// Camera path keyframes
tl.to(cameraProxy, { x: 0, y: 0.5, z: 2.0, duration: 3, ease: 'power2.inOut' })
  .to(cameraProxy, { x: -0.5, y: 0.2, z: 1.0, duration: 4, ease: 'sine.inOut' })
  .to(cameraProxy, { x: 0.3, y: -0.1, z: 0.5, duration: 3, ease: 'power1.inOut' });

// FOV animation (dolly zoom effect)
tl.to(fovProxy, { value: 35, duration: 5, ease: 'power1.inOut' }, 0);

// Postprocessing uniforms (bloom intensity ramps up mid-flight)
tl.to(bloomProxy, { intensity: 1.5, duration: 2, ease: 'power2.in' }, 3);

// In useFrame:
tl.progress(scrollProgress);
camera.position.lerp(cameraProxy, dampFactor);
```

This pattern is already validated in CapsuleShell's `CinematicCamera` component, which uses GSAP timelines to drive camera position through keyframes. The only change is driving by scroll progress instead of time.

---

### 3. Particle Dissolve / Reform Portal Transitions

**Recommendation: Vertex shader uniform `uDissolve` (0-1) + postprocessing effects**

No new library needed. The dissolve is a vertex shader operation:

#### Dissolve Architecture

```
DreamPortalTransition phases:
  1. REALITY     — Scene at rest, particles in photo formation
  2. DISSOLVING  — uDissolve 0→1 over ~1.5s, particles scatter outward
  3. TUNNEL      — Camera flies through scattered particle tunnel
  4. REFORMING   — uDissolve 1→0 over ~2s, particles converge into new photo
  5. MEMORY      — New scene at rest
```

Each particle's scatter direction is deterministic (based on `aRandom` + `aOriginalPos`), so the dissolve is fully reversible. GSAP animates `uDissolve` uniform:

```javascript
// Dissolve out
gsap.to(uniforms.uDissolve, { value: 1, duration: 1.5, ease: 'power2.in' });

// Reform in (after camera reaches new scene)
gsap.to(uniforms.uDissolve, { value: 0, duration: 2.0, ease: 'power2.out' });
```

#### Portal VFX Layers (postprocessing, no new deps)

| Effect | Package | Role |
|--------|---------|------|
| `ChromaticAberration` | postprocessing 6.39 | Lens distortion during tunnel phase |
| `ShockWaveEffect` | postprocessing 6.39 | Radial pulse at dissolve/reform moment |
| `Bloom` | postprocessing 6.39 | Particles glow brighter during transition |
| `Noise` | postprocessing 6.39 | Film grain increases during dreamstate |
| `GlitchEffect` | postprocessing 6.39 | Subtle digital interference at phase boundaries |

The existing `PortalVFX.jsx` (canvas-based portal ring effect) can overlay the R3F scene during transitions. It is already positioned at `z-index: 499` with `pointer-events: none`.

---

### 4. Wire Connections Between Particles

**Recommendation: `THREE.LineSegments` + custom `ShaderMaterial` for selective neighbor connections**

#### Why Not drei `<Line>` or `<Segments>`

drei `<Line>` uses `Line2` from Three.js examples (fat lines with round caps). Beautiful but expensive for 1000+ line segments. `THREE.LineSegments` with `GL_LINES` is the right primitive for wireframe-style connections at scale.

#### Approach: Nearest-Neighbor Wire Mesh

Not all 150K particles connect to neighbors. Select ~5000-10000 particles based on depth edges/feature regions, connect each to 2-4 nearest neighbors:

```javascript
// Build connection buffer (CPU, once on scene load)
const linePositions = new Float32Array(connectionCount * 6); // 2 vertices per segment, 3 floats each
const lineAlphas = new Float32Array(connectionCount * 2);    // alpha per vertex

// Fill from pre-computed neighbor indices
for (let i = 0; i < connectionCount; i++) {
  const a = particles[connections[i].from];
  const b = particles[connections[i].to];
  linePositions[i*6+0] = a.x; linePositions[i*6+1] = a.y; linePositions[i*6+2] = a.z;
  linePositions[i*6+3] = b.x; linePositions[i*6+4] = b.y; linePositions[i*6+5] = b.z;
}
```

**Alternative: `Wireframe` from `three/examples/jsm/lines/Wireframe.js`**

Three.js ships a GPU-accelerated wireframe that supports variable line width (unlike raw `GL_LINES` which are always 1px on most hardware). Use this if visible wire thickness matters:

```javascript
import { Wireframe } from 'three/examples/jsm/lines/Wireframe.js';
import { WireframeGeometry2 } from 'three/examples/jsm/lines/WireframeGeometry2.js';
```

Both are already in `node_modules/three/examples/jsm/lines/`.

#### Performance

At 10K line segments: ~120KB GPU buffer, 1 draw call. Negligible compared to the particle system.

---

### 5. Glow / Bloom Effects

**Recommendation: `@react-three/postprocessing` `Bloom` (already installed)**

The postprocessing library (6.39.0) has `BloomEffect` and `SelectiveBloomEffect`. Currently used in the constellation scene. For particle memory flight:

```jsx
<EffectComposer disableNormalPass>
  <Bloom
    luminanceThreshold={0.6}
    luminanceSmoothing={0.3}
    intensity={1.5}
    mipmapBlur
  />
  <DepthOfField
    focusDistance={0.01}
    focalLength={0.02}
    bokehScale={2}
  />
  <Vignette offset={0.3} darkness={0.6} />
  <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.03} />
</EffectComposer>
```

Bloom intensity can be animated by GSAP keyed to scroll progress (brighter during tunnel phase, softer during memory rest).

The `mipmapBlur` option (added in postprocessing 6.35+) produces physically-based bloom that is both faster and more cinematic than the older kernel-based approach.

---

### 6. Progress-Reactive Ambient Soundscape

**Recommendation: Howler.js (existing) + Web Audio API `GainNode` crossfading**

#### Why NOT Tone.js

| Factor | Tone.js | Howler + Web Audio API |
|--------|---------|----------------------|
| Bundle size | **~150KB** minified | **0KB** (already installed) |
| What it adds | Synth engines, Transport clock, scheduling, effects chain | Not needed. We are crossfading pre-recorded audio layers, not synthesizing sound. |
| Web Audio access | Wraps Web Audio API | Howler exposes `Howler.ctx` (the AudioContext) and `Howler.masterGain` directly |
| Learning curve | New API to learn | Already proven in codebase (`AudioContext.jsx`, `sounds.js`) |

**Tone.js is designed for music synthesis and sequencing.** The particle flight soundscape is **layered ambient audio files** (e.g., deep drone, wind, sparkle textures) with gain crossfading. This is a standard Web Audio API pattern.

#### Soundscape Architecture

```
Layer 0: Deep drone          (always playing, gain 0.3-0.8 based on scroll)
Layer 1: Wind/breath texture  (fades in at 20% scroll, peaks at 50%)
Layer 2: Sparkle/chime        (fades in at 60% scroll during memory formation)
Layer 3: Heartbeat/pulse      (tunnel phase only, 40-60% scroll)
```

Each layer is a Howl instance with `loop: true`:

```javascript
const layers = [
  new Howl({ src: ['soundscape/drone.mp3'], loop: true, volume: 0 }),
  new Howl({ src: ['soundscape/wind.mp3'], loop: true, volume: 0 }),
  new Howl({ src: ['soundscape/sparkle.mp3'], loop: true, volume: 0 }),
  new Howl({ src: ['soundscape/pulse.mp3'], loop: true, volume: 0 }),
];

// Start all layers (silent)
layers.forEach(l => l.play());

// On scroll progress update (in useFrame or scroll handler):
function updateSoundscape(progress) {
  layers[0].volume(0.3 + progress * 0.5);                    // drone: grows
  layers[1].volume(Math.max(0, (progress - 0.2) * 2.5));     // wind: 0.2-0.6
  layers[2].volume(Math.max(0, (progress - 0.6) * 2.5));     // sparkle: 0.6-1.0
  layers[3].volume(bellCurve(progress, 0.5, 0.15));           // pulse: centered at 0.5
}
```

**Important:** The existing `AudioContext.jsx` already manages Howler playback and exposes `Howler.ctx`. The soundscape layers should respect the existing mute state (`sounds.js` `isMuted`) and duck when the global music player is active (existing pattern in CapsuleShell's soundtrack ducking).

#### Web Audio API Direct (for procedural elements)

The existing `sounds.js` already uses direct Web Audio API for synthesized sounds (oscillators, noise buffers, filters). For the soundscape, procedural elements (e.g., resonant tones that shift pitch with scroll) can use the same pattern:

```javascript
// Continuous resonant tone that shifts with scroll
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = 'sine';
osc.frequency.value = 100; // updates with scroll
gain.gain.value = 0;       // updates with scroll
osc.connect(gain).connect(ctx.destination);
osc.start();

// In scroll handler:
osc.frequency.linearRampToValueAtTime(100 + progress * 200, ctx.currentTime + 0.1);
gain.gain.linearRampToValueAtTime(progress * 0.15, ctx.currentTime + 0.1);
```

---

## Integration Points with Existing Architecture

### CapsuleShell.jsx

The particle renderer slots into the existing renderer routing:

```
CapsuleShell
  ├── GPU tier detection (getGpuTier() — existing)
  ├── Renderer selection:
  │   ├── 'full' tier    → ParticleMemoryRenderer (NEW, replaces DisplacedMeshRenderer for flagship)
  │   ├── 'simplified'   → DisplacedMeshRenderer (existing, kept for non-flagship scenes)
  │   └── 'parallax'     → ParallaxFallback (existing, kept for low-end)
  ├── PortalVFX overlay (existing)
  ├── Narrative cards (existing)
  ├── Soundtrack / Soundscape (existing + new layers)
  └── Chrome: back link, mute (existing)
```

### memoryScenes.js

Add `renderMode: 'particle-flight'` to the scene registry:

```javascript
{
  id: 'syros-cave',
  renderMode: 'particle-flight',  // NEW — routes to ParticleMemoryRenderer
  particleConfig: {
    count: 120000,          // particle count (tier-adjusted at runtime)
    sizeBase: 2.0,
    sizeDepthScale: 1.5,
    wireConnectionRadius: 0.05,
    wireMaxConnections: 4,
    dissolveScatterRadius: 3.0,
    dissolveNoise: 0.3,
  },
  flightPath: [
    { position: [0, 0, 4], target: [0, 0, 0], fov: 50, progress: 0.0 },
    { position: [0.5, 0.3, 2], target: [0, 0, 0], fov: 45, progress: 0.3 },
    { position: [-0.3, 0.1, 0.8], target: [0, 0, -0.5], fov: 35, progress: 0.7 },
    { position: [0, 0, 0.3], target: [0, 0, -1], fov: 30, progress: 1.0 },
  ],
  soundscapeLayers: [
    { src: 'soundscape/drone.mp3', gainCurve: [[0, 0.3], [0.5, 0.6], [1, 0.8]] },
    { src: 'soundscape/wind.mp3', gainCurve: [[0, 0], [0.2, 0.5], [0.6, 0.3], [1, 0]] },
  ],
  // ...existing fields (photoUrl, depthMapUrl, narrative, etc.)
}
```

### GPU Tier Gating

The existing `getGpuTier()` in `src/utils/gpuCapability.js` returns `'full'` | `'simplified'` | `'parallax'`. For particle flight:

| Tier | Particle Count | Wire Connections | Postprocessing | DPR |
|------|---------------|-----------------|----------------|-----|
| `full` | 120K-150K | Yes (10K segments) | Bloom + DOF + Vignette + Noise | [1, 2] |
| `simplified` | 50K-80K | No | Vignette only (CSS overlay) | [1, 1] |
| `parallax` | 0 (fallback to CSS parallax) | No | No | N/A |

### Zustand Store (existing pattern)

Use a zustand store for flight state, following the constellation store pattern:

```javascript
const useFlightStore = create((set) => ({
  scrollProgress: 0,
  phase: 'reality',        // reality | dissolving | tunnel | reforming | memory
  soundscapeEnabled: true,
  setScrollProgress: (p) => set({ scrollProgress: p }),
  setPhase: (p) => set({ phase: p }),
}));
```

---

## What NOT to Add

| Library | Why Skip | Use Instead |
|---------|----------|-------------|
| **Lenis** (`lenis@^1.2`, ~8KB) | DOM scroll smoother. The particle scene is a full-viewport Canvas, not a scrollable page. Lenis hijacks `document.scrollingElement` which is irrelevant here. | Native `wheel`/`touchmove` event capture with manual damping in `useFrame`. |
| **Locomotive Scroll** (`locomotive-scroll@^5`, ~25KB) | Same DOM-centric problem. Designed for parallax HTML sections. Would need a fake scrollable container wrapping the Canvas. | Same native approach. |
| **GSAP ScrollTrigger** (~15KB plugin) | Requires a DOM scroll position to trigger from. Adding a fake scrollable `<div>` is a workaround, not a solution. | `timeline.progress(scrollNorm)` achieves the same result without DOM coupling. |
| **Tone.js** (`tone@^15`, ~150KB) | Full synthesis/sequencing engine. We are crossfading pre-recorded audio layers, not generating tones. Massive bundle addition for a simple gain-crossfade pattern. | Howler.js `volume()` per-layer + Web Audio API `GainNode` for procedural elements. |
| **three-custom-shader-material** (CSM, ~15KB) | Previously recommended for v2.1 displaced-mesh PBR extension. Particle flight uses raw `ShaderMaterial` (no PBR lighting needed for luminous points). CSM's value is extending `MeshStandardMaterial`; particle `Points` don't use standard materials. | Direct `THREE.ShaderMaterial` with custom vertex/fragment GLSL. |
| **Theatre.js** (~200KB) | Visual timeline editor. Overkill for scroll-scrubbed camera paths definable in config arrays. | GSAP timeline with `.progress()` scrubbing. |
| **react-spring** | Competing animation library. Project uses GSAP + Framer Motion. Third system adds inconsistency. | GSAP for 3D, Framer Motion for UI (established pattern). |
| **GPU particle libraries** (e.g., `three-nebula`, `three-quarks`) | Add abstraction over what is a straightforward `Points` + `ShaderMaterial` setup. These libraries are designed for emitter-based VFX (fire, smoke, sparks), not photo-derived point clouds. | Direct `THREE.Points` with custom shaders. |
| **WebGPU compute** | Not yet broadly supported (Chrome only, behind flag on some platforms). Three.js 0.183 has experimental WebGPU backend but R3F 9.5 targets WebGL2. | `GPUComputationRenderer` (WebGL2 GPGPU) if compute is needed later. |

---

## Performance Targets

| Metric | Desktop (full) | Desktop (simplified) | Mobile (parallax) |
|--------|---------------|---------------------|-------------------|
| Particle count | 120K-150K | 50K-80K | 0 (CSS fallback) |
| Draw calls | <10 | <5 | 0 |
| GPU memory | <15MB | <8MB | <1MB |
| Frame time | <12ms (83+ fps) | <16ms (60 fps) | N/A |
| JS heap | <20MB | <12MB | <5MB |
| Asset load | <4MB (photo+depth+audio) | <3MB | <1MB (photo only) |
| Time to interactive | <2s after mount | <1.5s | <0.5s |

### Frame Time Breakdown (150K particles, full tier)

| Stage | Budget |
|-------|--------|
| Scroll input processing | <0.5ms |
| GSAP timeline scrub | <0.2ms |
| Particle attribute updates (if CPU-side) | <1.0ms |
| Points draw call | <2.0ms |
| Wire segments draw call | <0.5ms |
| Postprocessing (Bloom + DOF + Vignette) | <4.0ms |
| Compose + present | <1.0ms |
| **Total** | **<9.2ms** |

At 150K particles with no per-frame CPU attribute updates (all animation in vertex shader via uniforms), the CPU cost drops to near zero and the GPU handles everything in the draw call + postprocessing budget.

---

## Photo-to-Particle Pipeline (offline, build time)

The photo + depth map are converted to particle data at scene initialization (not at build time). This keeps the asset pipeline simple:

```
Scene Load (runtime, ~200ms):
  1. Load photo texture (JPEG/WebP, ~1MB)
  2. Load depth map texture (PNG grayscale, ~300KB)
  3. Sample both at regular UV grid intervals:
     - For 120K particles on a 16:9 image: ~400x300 sample grid
     - position.x = (u - 0.5) * aspectRatio
     - position.y = (v - 0.5)
     - position.z = depthSample * depthScale
     - color.rgb = photoSample.rgb
     - size = baseSz + depthSample * depthRange
  4. Build BufferGeometry with Float32Array attributes
  5. Optional: compute nearest-neighbor connections for wire mesh
```

This reuses the same `photoUrl` + `depthMapUrl` assets already defined in `memoryScenes.js`. No new asset pipeline step is needed.

---

## Version Compatibility Matrix

| Package A | Package B | Compatibility |
|-----------|-----------|---------------|
| Three.js 0.183.2 | GPUComputationRenderer (bundled) | Ships together, always compatible |
| Three.js 0.183.2 | Wireframe/WireframeGeometry2 (bundled) | Ships together |
| R3F 9.5.0 | Three.js 0.183.2 | Peer dep `>=0.159` satisfied |
| drei 10.7.7 | Three.js 0.183.2 | Peer dep `>=0.159` satisfied |
| postprocessing 6.39.0 | Three.js 0.183.2 | Peer dep satisfied (6.39 released March 2026) |
| GSAP 3.14.2 | R3F 9.5.0 | No peer dep. GSAP is framework-agnostic. Timeline.progress() stable since GSAP 3.0. |
| Howler 2.2.4 | Web Audio API | Howler exposes `Howler.ctx` (AudioContext) since 2.0. Stable API. |
| zustand 5.0.12 | React 19.2 | Peer dep `>=18` satisfied |

---

## Summary: Installation Command

```bash
# No new packages needed.
# The entire particle memory flight system builds on the existing stack.
```

If later phases require GPU particle physics (turbulence, inter-particle forces):
```bash
# GPUComputationRenderer is already in node_modules:
# three/examples/jsm/misc/GPUComputationRenderer.js
# Just import it — no install needed.
```

---

*Stack research for: JAROWE v2.2 Particle Memory Flight -- photo-to-particle cloud, scroll-driven camera, dreamstate portals, reactive soundscape*
*Researched: 2026-03-23*
