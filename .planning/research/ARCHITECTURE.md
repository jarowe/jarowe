# Architecture Research — v2.2 Particle Memory Flight

**Domain:** Particle-based photo decomposition renderer, scroll-driven camera, dreamstate transitions, and reactive audio — integrated into existing CapsuleShell system
**Researched:** 2026-03-23
**Confidence:** HIGH

---

## Existing System Snapshot

### CapsuleShell (src/pages/CapsuleShell.jsx)

The shell is a ~1100-line file containing the page component and all sub-renderers inline. Key architecture:

```
CapsuleShell (page component)
├── GPU tier detection via getGpuTier() → 'full' | 'simplified' | 'parallax'
├── renderMode dispatch (scene.renderMode × tier):
│   ├── 'displaced-mesh' + full/simplified → DisplacedMeshRenderer
│   ├── 'splat' + full/simplified → SplatRenderer
│   ├── any + parallax → ParallaxFallback
│   └── unknown → ParallaxFallback
├── Narrative overlay (AnimatePresence cards, gated behind awakening)
├── Soundtrack (Howl, volume 0 → fade on unmute, cross-fade on exit)
├── GlobalPlayer ducking (audio.duckForCapsule / restoreFromCapsule)
├── Experience arc (awakening → hold → recession → exit portal)
└── PortalVFX (canvas-based portal on exit, phase-driven)
```

**Data flow for current displaced-mesh path:**
1. `useParams()` → sceneId → `getSceneById(sceneId)` → scene object
2. `getGpuTier()` → tier state
3. renderMode × tier → boolean flags (showDisplaced, showSplat, showFallback)
4. DisplacedMeshRenderer creates own `<Canvas>` with:
   - DisplacedPlane (ShaderMaterial, depth displacement, color grading)
   - AtmosphericParticles (dust/bokeh/streaks, tier-adaptive counts)
   - CinematicCamera (GSAP timeline from keyframes, mouse parallax)
   - CapsulePostProcessing (DOF, vignette, grain — full tier only)
   - ArcController (GSAP: depthScale 0→target awakening, target→0 recession + fade)

**Key callbacks CapsuleShell expects from renderers:**
- `onRecessionComplete` → triggers exit portal phase sequence
- `onAwakeningComplete` → unblocks narrative card timers
- `directAccess` boolean → shortens awakening if no portal preceded

### Scene Registry (src/data/memoryScenes.js)

Current schema per scene entry:
```
{
  id, title, location, coordinates,
  renderMode: 'displaced-mesh' | 'splat' | 'parallax',
  photoUrl, depthMapUrl, depthConfig: { depthScale, depthBias, depthContrast, discardThreshold },
  splatUrl, splatIsRemote,
  previewImage, soundtrack,
  narrative: [{ text, delay }],
  cameraPosition, cameraTarget,
  mood: 'warm' | 'cool' | 'golden',
  cameraKeyframes: [{ position, target, duration, ease, hold }],
  samMaskUrl,
  layerSeparation: { foregroundDepthScale, backgroundDepthScale, foregroundDriftSpeed, backgroundDriftSpeed },
  arc: { awakeningDuration, awakeningEase, awakeningDelay, recessionDuration, recessionEase, recessionDelay, recessionFadeColor },
  portalEntry: boolean
}
```

### GPU Capability (src/utils/gpuCapability.js)

3-tier detection: WebGL2 + MAX_TEXTURE_SIZE + deviceMemory + mobile heuristic + low-end GPU blocklist. Synchronous, safe for mount-time call. Returns 'full' | 'simplified' | 'parallax'.

### PortalVFX (src/components/PortalVFX.jsx)

2D canvas-based portal effect with phase state machine: null → seep → gathering → rupture → emerging → residual → null. Draws wobble ring, cosmic interior, particles, shockwave. Used for exit transition in CapsuleShell.

### AudioContext (src/context/AudioContext.jsx)

Global Howler-based music state. Exposes `duckForCapsule()` (Howler.volume → 0.15) and `restoreFromCapsule()` for per-capsule soundtrack coexistence.

---

## Integration Plan: 4 New Modules

### 1. ParticleMemoryRenderer

**Type:** NEW component — `src/components/ParticleMemoryRenderer.jsx`
**Role:** New renderMode in CapsuleShell. Decomposes photo + depth into 80K-150K luminous 3D particles with selective wire connections and glow.

**Integration with CapsuleShell:**
- Added as a new branch in the renderMode dispatch (lines 976-993):
  ```
  } else if (renderMode === 'particle-memory') {
    showParticleMemory = true;
  }
  ```
- Must honor the same callback contract: `onRecessionComplete`, `onAwakeningComplete`, `directAccess`
- Creates its own `<Canvas>` (same pattern as DisplacedMeshRenderer)
- Does NOT use CinematicCamera — uses MemoryFlightController instead (see below)
- Does NOT use ArcController — particle awakening/recession is handled internally (particle spawn-in = awakening, particle dissolve = recession)

**Internal architecture:**
```
ParticleMemoryRenderer
├── <Canvas> (own R3F context, unmounts on route exit)
│   ├── ParticleField (instanced points, 80K-150K)
│   │   ├── Reads photo texture → samples color per particle
│   │   ├── Reads depth map → z displacement per particle
│   │   ├── Reads SAM mask → foreground/background layer separation
│   │   ├── Selective wire connections (nearest-neighbor within threshold)
│   │   └── Per-particle glow (additive blending, size attenuation)
│   ├── MemoryFlightController (scroll-driven camera — see module 2)
│   ├── PostProcessing (bloom/DOF/vignette — tier-adaptive)
│   └── Ambient lighting (subtle, mood-colored)
├── Progress state (0-1 float from MemoryFlightController)
└── Callback bridge to CapsuleShell
```

**Data flow:**
```
scene.photoUrl ──────→ TextureLoader ──→ color sampling per particle
scene.depthMapUrl ───→ TextureLoader ──→ z-position per particle
scene.samMaskUrl ────→ TextureLoader ──→ fg/bg layer assignment
scene.particleConfig → particle count, connection threshold, glow params
scroll/touch/wheel ──→ MemoryFlightController ──→ progress (0-1)
progress ────────────→ camera position on rail
progress ────────────→ particle opacity/scale envelope
progress ────────────→ MemorySoundscape layers
```

**Modified files:**
- `src/pages/CapsuleShell.jsx` — add renderMode branch, add `showParticleMemory` boolean, render `<ParticleMemoryRenderer>` conditionally
- `src/data/memoryScenes.js` — add `particleConfig` field to scene schema

### 2. MemoryFlightController

**Type:** NEW component — `src/components/MemoryFlightController.jsx`
**Role:** Replaces CinematicCamera for particle scenes. Scroll/trackpad/touch drives camera through particle field on a spline rail.

**Why separate from CinematicCamera:**
CinematicCamera is GSAP-timeline-driven (time-based, looping). MemoryFlightController is progress-driven (0-1 from scroll, non-looping, one-directional with scrub-back). Fundamentally different interaction model.

**Integration:**
- Used ONLY inside ParticleMemoryRenderer's `<Canvas>`
- Exposes progress (0-1) upward via callback prop: `onProgressChange(progress)`
- ParticleMemoryRenderer passes progress to MemorySoundscape and particle opacity envelope
- Progress also gates narrative cards (replaces the delay-based timing)

**Internal architecture:**
```
MemoryFlightController (R3F component, inside Canvas)
├── Scroll/wheel/touch listener (document-level, normalized)
├── Progress state (0-1, smoothed with spring/lerp)
├── Camera spline (CatmullRomCurve3 from scene.flightPath waypoints)
├── Camera lookAt target spline (separate CatmullRomCurve3)
├── Mouse/gyro parallax offset (same pattern as CinematicCamera)
├── useFrame: interpolate camera position/lookAt from progress on splines
└── Progress callbacks: onProgressChange, onFlightComplete (progress=1)
```

**Key design decisions:**
- Progress is clamped [0, 1] — no looping, reaching 1.0 triggers recession
- Scroll velocity is normalized across wheel/trackpad/touch (deltaY → progress delta)
- Spring smoothing prevents jerky camera (GSAP or manual lerp in useFrame)
- Mobile: touch drag vertical = progress, with momentum/deceleration
- Mouse parallax layered ON TOP of spline position (same 0.05 strength as CinematicCamera)

**Scene registry additions for flight path:**
```
flightPath: [
  { position: {x,y,z}, lookAt: {x,y,z} },  // start (progress=0)
  { position: {x,y,z}, lookAt: {x,y,z} },  // waypoint
  { position: {x,y,z}, lookAt: {x,y,z} },  // end (progress=1)
]
```

**Modified files:**
- `src/data/memoryScenes.js` — add `flightPath` array to scene schema

### 3. DreamPortalTransition

**Type:** NEW component — `src/components/DreamPortalTransition.jsx`
**Role:** Replaces PortalVFX for particle scenes. Reality dissolves into particles → tunnel/fall-through → particles reform into memory.

**Why separate from PortalVFX:**
PortalVFX is a 2D canvas sling-ring portal (entry and exit). DreamPortalTransition is a 3D R3F particle-based dissolve/reform effect that needs to coordinate with the particle field inside the Canvas. It cannot be a separate 2D canvas overlay — it must share the R3F scene graph.

**Integration with CapsuleShell:**
- For `renderMode === 'particle-memory'` scenes, CapsuleShell uses DreamPortalTransition INSTEAD of PortalVFX
- Entry transition: rendered by ParticleMemoryRenderer inside its Canvas (particles spawn from scattered → form photo)
- Exit transition: reverse (particles dissolve from photo → scatter), then CapsuleShell navigates home
- Phase state machine similar to PortalVFX but with different phases:
  ```
  null → 'dissolve-in' → 'tunnel' → 'reform' → 'settled' → ... → 'dissolve-out' → 'scatter' → null
  ```

**Internal architecture:**
```
DreamPortalTransition (R3F component, inside ParticleMemoryRenderer's Canvas)
├── Entry: particles start at random positions → GSAP/spring animate to photo positions
│   ├── 'dissolve-in': screen darkens, particles appear scattered
│   ├── 'tunnel': camera rushes forward through particle cloud
│   └── 'reform': particles settle into photo-sampled positions (= awakening complete)
├── Exit: particles leave photo positions → scatter and fade
│   ├── 'dissolve-out': particles drift away from positions
│   └── 'scatter': particles fully dispersed, screen fades (= recession complete)
└── Callbacks: onEntryComplete (→ CapsuleShell awakening), onExitComplete (→ recession)
```

**Key insight — shared particle buffer:**
The dream portal and the particle field are the SAME particles. DreamPortalTransition doesn't create separate particles — it animates the ParticleField's particles between scattered (portal) and photo-sampled (memory) positions. This means:
- ParticleField stores two position buffers: `scatteredPositions` and `photoPositions`
- A `morphProgress` uniform (0=scattered, 1=photo-formed) interpolates in the vertex shader
- DreamPortalTransition controls `morphProgress` via GSAP
- MemoryFlightController only activates after morphProgress reaches 1.0

**Modified files:**
- `src/pages/CapsuleShell.jsx` — conditional: use DreamPortalTransition phase management instead of PortalVFX for particle-memory scenes

### 4. MemorySoundscape

**Type:** NEW module — `src/components/MemorySoundscape.jsx`
**Role:** Layered ambient audio that evolves with scroll progress. Replaces the simple Howl soundtrack for particle scenes.

**Integration:**
- Rendered as a React component (no DOM output) OUTSIDE the Canvas, as a sibling within ParticleMemoryRenderer or within CapsuleShell
- Receives `progress` (0-1) from MemoryFlightController
- Manages its own Howl instances per layer
- Coordinates with CapsuleShell's existing GlobalPlayer ducking (uses same `audio.duckForCapsule()`)

**Internal architecture:**
```
MemorySoundscape (React component, no DOM)
├── Layer management: 2-4 Howl instances per scene
│   ├── Base ambient (always playing, volume envelope from progress)
│   ├── Mid layer (fades in at progress 0.3-0.7)
│   ├── Detail layer (fades in at progress 0.5-0.9)
│   └── Climax layer (fades in at progress 0.8-1.0)
├── Progress-to-volume mapping per layer (configurable envelopes)
├── Crossfade between layers based on progress
├── Mute state (inherited from CapsuleShell's muted state)
└── Cleanup: fade all layers on unmount
```

**Scene registry additions:**
```
soundscape: {
  layers: [
    { src: 'memory/syros-cave/ambient-waves.mp3', envelope: [[0, 0.6], [0.5, 0.8], [1, 0.4]] },
    { src: 'memory/syros-cave/wind.mp3', envelope: [[0, 0], [0.3, 0.5], [0.7, 0.5], [1, 0]] },
    { src: 'memory/syros-cave/detail-drips.mp3', envelope: [[0, 0], [0.5, 0.3], [0.9, 0.6], [1, 0.2]] },
    { src: 'memory/syros-cave/climax-choir.mp3', envelope: [[0, 0], [0.8, 0], [0.95, 0.7], [1, 0.5]] },
  ],
  masterVolume: 0.7,
  crossfadeDuration: 0.5,  // seconds
}
```

**Key design — envelope interpolation:**
Each layer has an `envelope` array of `[progress, volume]` control points. MemorySoundscape linearly interpolates between control points based on current progress. This gives full artistic control over when each layer appears/disappears.

**Modified files:**
- `src/pages/CapsuleShell.jsx` — for particle-memory scenes, render MemorySoundscape instead of the simple Howl soundtrack logic
- `src/data/memoryScenes.js` — add `soundscape` field to scene schema

---

## Complete Data Flow

```
User scrolls/swipes
       │
       ▼
MemoryFlightController
├── normalizes scroll → progress (0-1, spring-smoothed)
├── interpolates camera on spline rail
├── calls onProgressChange(progress)
       │
       ▼
ParticleMemoryRenderer
├── receives progress
├── updates particle opacity/scale envelope from progress
├── passes progress to MemorySoundscape
├── maps progress to narrative card visibility thresholds
│   (replaces delay-based timing)
       │
       ├──────────────────────┐
       ▼                      ▼
MemorySoundscape          CapsuleShell
├── interpolates per-     ├── narrative cards shown at
│   layer volumes from    │   progress thresholds
│   progress envelopes    ├── back button triggers
├── manages Howl          │   recession (dissolve-out)
│   instances             └── exit portal after recession
       │
       ▼
DreamPortalTransition
├── entry: morphProgress 0→1 (scattered→formed)
│   then hands control to MemoryFlightController
├── exit: morphProgress 1→0 (formed→scattered)
│   then CapsuleShell navigates home
```

---

## Scene Registry Schema Additions

New fields added to scene entries for `renderMode: 'particle-memory'`:

```javascript
{
  // ... existing fields (id, title, location, etc.) ...

  renderMode: 'particle-memory',  // NEW value

  // NEW: Particle configuration
  particleConfig: {
    count: 100000,               // total particles (80K-150K range)
    connectionThreshold: 0.05,   // max distance for wire connections
    connectionMaxCount: 3,       // max wires per particle
    glowIntensity: 0.4,         // per-particle glow strength
    glowColor: [1.0, 0.95, 0.85], // glow tint
    pointSize: { min: 1.0, max: 4.0 }, // screen-space point size range
    layerSeparationGap: 0.3,    // z-gap between fg/bg particle layers
  },

  // NEW: Flight path (replaces cameraKeyframes for particle scenes)
  flightPath: [
    { position: { x: 0, y: 0, z: 5 }, lookAt: { x: 0, y: 0, z: 0 } },
    { position: { x: 1, y: 0.5, z: 3 }, lookAt: { x: 0.2, y: 0, z: 0 } },
    { position: { x: -0.5, y: 0.3, z: 2 }, lookAt: { x: 0, y: 0, z: 0 } },
    { position: { x: 0, y: 0, z: 1.5 }, lookAt: { x: 0, y: 0, z: 0 } },
  ],

  // NEW: Soundscape (replaces soundtrack for particle scenes)
  soundscape: {
    layers: [
      { src: 'memory/syros-cave/ambient.mp3', envelope: [[0, 0.5], [1, 0.5]] },
      { src: 'memory/syros-cave/detail.mp3', envelope: [[0, 0], [0.4, 0.3], [0.8, 0.6], [1, 0.2]] },
    ],
    masterVolume: 0.7,
  },

  // NEW: Dream portal config
  dreamPortal: {
    scatterRadius: 8.0,         // how far particles scatter during portal
    entryDuration: 3.0,         // seconds for dissolve-in → reform
    exitDuration: 2.5,          // seconds for dissolve-out → scatter
    tunnelSpeed: 2.0,           // camera rush speed during tunnel phase
  },

  // NEW: Narrative progress thresholds (replaces delay-based timing)
  narrativeThresholds: [0.1, 0.35, 0.6, 0.85],
  // Card 0 appears at progress 0.1, card 1 at 0.35, etc.

  // Existing fields still used:
  // photoUrl, depthMapUrl, samMaskUrl — used for particle sampling
  // mood — used for color grading / glow tint
  // previewImage — used for loading state / parallax fallback
  // portalEntry — still respected (dream portal vs direct access)
}
```

**Backward compatibility:** Existing scenes with `renderMode: 'displaced-mesh'` or `'splat'` are unchanged. The new fields are only read when `renderMode === 'particle-memory'`. Parallax fallback still works for low-tier GPUs.

---

## New vs. Modified Files

### New Files (4)
| File | Purpose |
|------|---------|
| `src/components/ParticleMemoryRenderer.jsx` | R3F Canvas + particle field + integration shell |
| `src/components/MemoryFlightController.jsx` | Scroll-driven camera on spline rail (R3F component) |
| `src/components/DreamPortalTransition.jsx` | Particle morph between scattered/formed states (R3F component) |
| `src/components/MemorySoundscape.jsx` | Progress-reactive layered audio (React component, no DOM) |

### Modified Files (3)
| File | Changes |
|------|---------|
| `src/pages/CapsuleShell.jsx` | Add `'particle-memory'` branch to renderMode dispatch; conditionally use DreamPortalTransition phases instead of PortalVFX; conditionally use MemorySoundscape instead of simple Howl; pass progress to narrative threshold logic |
| `src/data/memoryScenes.js` | Add `particleConfig`, `flightPath`, `soundscape`, `dreamPortal`, `narrativeThresholds` fields; update `syros-cave` entry to `renderMode: 'particle-memory'`; update JSDoc header |
| `src/utils/gpuCapability.js` | No changes needed — existing 3-tier system works (particle-memory requires 'full', falls to 'simplified' with reduced particle count, falls to 'parallax' on low-end) |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/components/PortalVFX.jsx` | Still used for non-particle scenes (splat, displaced-mesh) |
| `src/context/AudioContext.jsx` | Ducking API already supports capsule use case |
| `src/App.jsx` | Route unchanged (`/memory/:sceneId` → CapsuleShell) |
| `src/pages/MemoryPortal.css` | Shared CSS classes still apply to chrome elements |

---

## Suggested Build Order

### Phase 1: ParticleField Core (no scroll, no portal, no audio)

**Build:** `ParticleMemoryRenderer.jsx` (core particle generation only)

**What it does:**
- Load photo + depth textures
- Sample colors and z-positions into Float32 buffers
- Render as instanced points with color, size attenuation, basic glow
- Static camera at scene.cameraPosition
- No scroll, no transitions, no audio

**Why first:**
- This is the visual foundation everything else depends on
- Can verify particle quality, performance, and appearance before adding interaction
- Tests GPU capability limits (80K-150K particles at 60fps)

**Dependencies:** None (reads textures, outputs points)

**Verification:** Navigate to `/memory/syros-cave`, see static particle field of the cave photo

### Phase 2: MemoryFlightController (scroll → camera)

**Build:** `MemoryFlightController.jsx`

**What it does:**
- Wheel/trackpad/touch listener → normalized progress (0-1)
- Spring-smoothed progress
- CatmullRomCurve3 interpolation for camera position + lookAt
- Mouse/gyro parallax layered on top

**Why second:**
- Requires ParticleField to exist (otherwise nothing to fly through)
- Independent of portal and audio — can test camera feel with static particles
- Progress value is the central data bus that portal and audio will consume

**Dependencies:** ParticleMemoryRenderer (Phase 1)

**Integration point:** Add `onProgressChange` callback prop; ParticleMemoryRenderer passes progress up to CapsuleShell for narrative card thresholds

**Verification:** Scroll through particle field, camera moves on spline, narrative cards appear at progress thresholds

### Phase 3: DreamPortalTransition (entry/exit morph)

**Build:** `DreamPortalTransition.jsx`

**What it does:**
- Dual position buffers in ParticleField (scattered + photo-sampled)
- `morphProgress` uniform interpolated in vertex shader
- Entry: particles scattered → reform into photo (GSAP timeline)
- Exit: particles formed → scatter and fade
- Callbacks to CapsuleShell: onEntryComplete (awakening), onExitComplete (recession)

**Why third:**
- Requires ParticleField's position buffers to exist (Phase 1)
- Requires MemoryFlightController to know when to activate (after entry complete, Phase 2)
- Does NOT require audio to function

**Dependencies:** ParticleMemoryRenderer (Phase 1), MemoryFlightController (Phase 2, for activation gating)

**Key modification to Phase 1:** ParticleField must be refactored to store dual position buffers and accept `morphProgress` uniform. This is a planned evolution, not a rewrite.

**Verification:** Enter capsule → particles reform from chaos → scroll becomes active → back button → particles scatter → navigate home

### Phase 4: MemorySoundscape (progress-reactive audio)

**Build:** `MemorySoundscape.jsx`

**What it does:**
- Create Howl instances per soundscape layer
- Interpolate volumes from progress using envelope control points
- Coordinate with CapsuleShell mute state
- Cleanup on unmount (fade all layers)

**Why last:**
- Audio is a polish layer, not a structural dependency
- Requires progress from MemoryFlightController (Phase 2) to be meaningful
- Can be tested independently by hardcoding progress values
- No other module depends on it

**Dependencies:** MemoryFlightController (Phase 2, for progress value)

**Integration:** CapsuleShell passes progress and muted state; MemorySoundscape rendered outside Canvas as sibling

**Verification:** Scroll through scene, hear ambient layers fade in/out with progress

---

## Dependency Graph

```
Phase 1: ParticleMemoryRenderer (core)
    │
    ├──→ Phase 2: MemoryFlightController
    │        │
    │        ├──→ Phase 3: DreamPortalTransition
    │        │
    │        └──→ Phase 4: MemorySoundscape
    │
    └──→ Phase 3 (also depends on Phase 1 for dual position buffers)
```

**Critical path:** Phase 1 → Phase 2 → Phase 3
**Parallel-safe after Phase 2:** Phase 3 and Phase 4 could theoretically be built in parallel, but Phase 3 modifies ParticleField's buffer structure which Phase 4's envelope testing depends on seeing correctly. Sequential is safer.

---

## Performance Considerations

- **Particle count tiers:** full=150K, simplified=80K, parallax=CSS fallback (no particles)
- **Connection lines:** Only for full tier; simplified skips wire connections entirely
- **PostProcessing:** Bloom + DOF + vignette for full tier only; CSS vignette overlay for simplified
- **DPR:** full=[1,2], simplified=[1,1] (same pattern as DisplacedMeshRenderer)
- **Buffer allocation:** Float32Array for positions (count × 3), colors (count × 3), sizes (count × 1) — at 150K particles: ~3.6MB GPU memory
- **Scroll normalization:** Must handle high-resolution trackpad (fractional deltaY) and coarse mouse wheel (large integer deltaY) differently

---

## Open Questions for Build Phase

1. **Wire connections algorithm:** Nearest-neighbor search over 150K particles is O(n²). Need spatial hash grid or KD-tree. Build-time precomputation preferred over runtime.
2. **Vertex shader morph:** Single shader with `mix(scattered, photo, morphProgress)` or separate materials? Single shader is simpler and avoids material swaps.
3. **Depth of field focus target:** Should DOF focus follow progress (focus on nearest particles) or stay fixed? Progress-driven is more cinematic.
4. **Soundscape asset creation:** Need 2-4 ambient audio layers per scene. Source from royalty-free libraries or generate with AI audio tools.
5. **Simplified tier portal:** Should simplified tier get the dream portal (fewer particles, shorter duration) or skip directly to formed state? Recommend: shortened dream portal (1.5s instead of 3s, 80K particles).
