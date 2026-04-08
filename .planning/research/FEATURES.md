# Feature Research: Particle Memory Flight

**Domain:** Particle-field memory experiences with scroll-driven flight, dreamstate transitions, and reactive audio
**Researched:** 2026-03-23
**Confidence:** HIGH
**Milestone:** v2.2 Particle Memory Flight
**Reference:** Linkin Park "Lost" music video (pixel formations of memories with wire connections and glow)

---

## How Particle Memory Experiences Work

### The Core Technique: Photo-to-Particle Decomposition

A photograph is decomposed into a field of luminous 3D particles that retain the image's color and spatial structure while revealing depth and form:

1. **Image sampling** -- The source photo is sampled at regular or importance-weighted intervals. Each sample point extracts RGB color, XY position (normalized to scene space), and depth (from the pre-generated depth map). This produces a point cloud where each particle carries its original pixel color and a Z position derived from depth.

2. **Depth extrusion** -- The flat 2D sample grid is extruded into 3D using the depth map. Foreground particles push forward; background particles recede. The result is a volumetric point cloud shaped like the original scene but with visible gaps between particles -- the image becomes a constellation of colored light points suspended in space.

3. **Selective connections** -- A subset of nearby particles are connected by thin wire/line segments. These are not random: connections follow edges, contours, or regions of similar depth. The wires create a skeletal mesh that holds the image together visually while emphasizing its structure. Reference: the Linkin Park "Lost" video uses sparse wire connections between pixel formations to create a holographic memory feel.

4. **Glow and bloom** -- Each particle emits soft light (additive blending + bloom postprocessing). The glow bleeds between nearby particles, creating the illusion of a luminous field rather than discrete dots. Brighter particles (highlights in the photo) glow more intensely.

5. **Scroll-driven camera** -- The camera moves through the particle field on a rail, driven by scroll/trackpad/touch input. The visitor controls pacing but not direction. The flight path is authored per-scene as a spline through the particle volume.

### What the "Lost" Video Does Specifically

The Linkin Park "Lost" video (directed by Joe Hahn, 2023) demonstrates the target aesthetic:

- **Pixel-resolution particles:** Faces and scenes decompose into individual pixel-sized points with original photo color. Not random sparkles -- the image is recognizable from afar but reveals its particle nature up close.
- **Wire mesh connections:** Thin white/colored lines connect nearby particles, forming a mesh visible at the edges and silhouettes of figures. The wires are sparse (not every particle connected) and follow structural contours.
- **Depth layering:** Foreground figures are denser and brighter. Background elements are sparser and dimmer. The depth separation is clearly visible as you orbit or fly through.
- **Dissolve transitions:** Scenes transition by particles dispersing outward (explode/scatter), then reforming into the next image. The scatter-to-reform cycle IS the transition between memories.
- **Warm glow palette:** Despite being "pixel art," the palette leans warm amber/gold with cool blue accents. The glow creates an emotional temperature.
- **Camera passes through:** The camera doesn't orbit from outside -- it moves THROUGH the particle field, between layers, giving a sense of flying inside the memory rather than observing it.

### What Makes It Feel Like "Flying Through Memory" vs. a Tech Demo

**Living memory field (the goal):**
- Particles breathe -- subtle oscillation in position/size/brightness that makes the field feel alive, not static
- Camera moves THROUGH the field, not around it -- particles pass the viewer on both sides, creating parallax depth
- Sound reacts to progress -- ambient layers swell, shift, and bloom as you move deeper into the memory
- Wire connections pulse faintly, like synapses firing in a brain
- The image is recognizable from a distance but dissolves into individual luminous points as you approach
- Transitions between memories feel like dreams -- dissolve, drift, reform -- not hard cuts
- Scroll speed maps to emotional pacing: slow scroll = contemplative drift, fast scroll = rushing through
- Narrative text appears as part of the field, not overlaid on top

**Tech demo (the trap):**
- Particles are uniform size and brightness -- looks like a 3D scatter plot, not a memory
- Camera orbits from a fixed distance -- you observe the field rather than inhabiting it
- No connections between particles -- looks like a point cloud export, not a living structure
- Instant transitions -- scene A snaps to scene B with no dream logic
- No sound response to movement -- silent flight through pixels is just a WebGL demo
- Too many particles obscure the image -- you can't tell what the photo was
- Too few particles look broken -- sparse dots floating in space
- Scroll mapping is 1:1 linear -- no momentum, no easing, no breath

### The Density Sweet Spot

Particle count determines whether the experience reads as "image made of light" or "random scatter":

| Particle Count | Visual Quality | Performance | Verdict |
|---------------|---------------|-------------|---------|
| 10K-30K | Too sparse; image unrecognizable except at distance | Trivial | Insufficient |
| 40K-80K | Image reads clearly; individual particles visible up close; gaps between particles add depth | Good (instanced) | Viable minimum |
| 80K-150K | Dense enough to read as image at all distances; gaps only visible very close | Needs instancing + LOD | Target range |
| 150K-300K | Near-pixel fidelity; beautiful but performance-heavy | Needs WebGPU compute or aggressive LOD | Stretch on desktop |
| 300K+ | Diminishing returns; starts to look like the original photo again | Unrealistic for WebGL2 | Over-budget |

The target is 80K-150K particles for the flagship scene. This allows the image to read clearly from the starting camera position while revealing its particle nature as the camera flies closer.

---

## Feature Landscape

### Table Stakes (Must Have for the Experience to Work)

Missing any of these = the particle memory feels broken or incomplete.

| Feature | Why Required | Complexity | Dependency on Existing System |
|---------|-------------|------------|-------------------------------|
| **Photo-to-particle sampling** | Core technique: photo + depth map -> positioned, colored 3D particles | MEDIUM | Reuses existing depth map assets from v2.1 scene registry (`memoryScenes.js`). Needs new sampling logic. |
| **Instanced particle rendering** | 80K+ particles require InstancedMesh or InstancedBufferGeometry for 60fps | MEDIUM | R3F + THREE.js instancing. Existing `ParticleCloud.jsx` in constellation uses instanced points as reference. |
| **Scroll-driven camera on rails** | Visitor controls flight pacing via scroll; direction is authored per-scene | MEDIUM-HIGH | New component. CapsuleShell's `CinematicCamera` uses GSAP keyframes -- this replaces it with scroll-bound spline interpolation. |
| **Particle glow + bloom** | Particles must emit light and bleed into neighbors for the "luminous field" look | LOW-MEDIUM | Existing `CapsulePostProcessing` has bloom infrastructure (`@react-three/postprocessing`). Extend with UnrealBloomPass or SelectiveBloom. |
| **Entry transition (dissolve into particles)** | Scene must not "pop in" -- reality dissolves into the particle field | MEDIUM-HIGH | Extends existing `PortalVFX` concept but replaces ring portal with particle scatter/coalesce. New VFX component. |
| **Exit transition (particles reform or scatter)** | Clean exit back to origin (constellation/home) with particle animation | MEDIUM | Mirror of entry. Existing recession arc (ARC-03) pattern provides lifecycle model. |
| **GPU tier gating** | Only desktop-class GPUs get the particle experience; others get existing parallax fallback | LOW | Existing `getGpuTier()` already returns 'full'/'simplified'/'parallax'. Add 'particle' sub-tier check for full-tier devices. |
| **Scene registry extension** | Scenes need particle-specific config: density, connection rules, flight spline, soundscape layers | LOW | Extends existing `memoryScenes.js` schema with new fields alongside existing displaced-mesh config. |

### Differentiators (What Separates This from Every Other Particle Demo)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Selective wire connections** | Thin lines between nearby particles along edges/contours create the "holographic memory" look from the Lost video. Without these, it's just a point cloud. | MEDIUM-HIGH | GPU-side neighbor detection at sampling time. Store connections as line geometry. Pulse brightness over time for "synapse" feel. |
| **Particle breathing** | Subtle per-particle oscillation in position (0.01-0.03 units), size (5-15% variance), and brightness (10-20% variance) makes the field feel alive. Without breathing, the field is a static scatter. | LOW | Sinusoidal offsets per particle keyed to `aRandom` attribute (existing pattern from `AtmosphericParticles`). |
| **Progress-reactive audio** | Ambient soundscape layers evolve with scroll position: deeper = more layers/intensity. Creates emotional journey through sound as well as visuals. | MEDIUM-HIGH | New system. Must coordinate with existing Howler.js `AudioContext`. Multiple Howl instances with scroll-driven volume/filter envelopes. |
| **Dreamstate portal transition** | Instead of a ring portal, reality DISSOLVES into particles (existing displaced mesh -> scatter), then a tunnel/drift/fall-through, then particles coalesce into the memory. Dream logic, not sci-fi logic. | HIGH | Most complex single feature. Requires coordinating displaced mesh disposal, particle system initialization, and camera path seamlessly. |
| **Depth-aware particle density** | Foreground regions (closer in depth map) get higher particle density than background. This creates natural depth-of-field feeling where you can sense foreground/background separation without DOF blur. | MEDIUM | Importance sampling: use depth map gradient magnitude to allocate more samples at depth edges and foreground surfaces. |
| **Narrative as particles** | Text cards materialize from particles rather than fading in as flat HTML overlays. Words form from the particle field, read, then dissolve back. | HIGH | SDF text rendering in particle system or hybrid approach (HTML overlay with particle scatter transition). Significantly increases complexity. |
| **Scroll momentum and easing** | Scroll input has inertia: releasing the scroll wheel continues the camera drift for 0.5-1.5s before settling. Fast flicks = longer glide. Creates physical feel. | LOW-MEDIUM | Lerped scroll velocity tracking with exponential decay. Standard scroll-jacking pattern. |
| **Connection-line color sampling** | Wire connections inherit color from their endpoint particles (average of the two). Creates colored web that maps to the original image's palette. | LOW | Simple: average the RGB of connected particle pair. |

### Anti-Features (Commonly Attempted, Often Wrong)

| Feature | Why Attempted | Why Problematic | Better Alternative |
|---------|---------------|-----------------|-------------------|
| **Free-roam camera in particle field** | "Let users explore freely" | Particles are optimized for camera-facing; back-of-field looks empty. Free-roam reveals density gaps, LOD seams, and connection-line aliasing. Flight path is what creates the emotional arc. | Scroll-driven rail with subtle mouse/gyro parallax (same pattern as existing CinematicCamera). Visitor controls pacing, not direction. |
| **GPU-compute particle physics** | "Particles should have real physics, collide, flow" | WebGPU compute is not yet stable in R3F. Physics adds complexity without emotional value. Particles that bounce look like a screensaver, not a memory. | Breath-like sinusoidal motion + dissolve/reform via shader uniforms. No physics engine needed. |
| **Real-time photo sampling in browser** | "User uploads photo, instantly becomes particles" | Sampling 80K+ particles from a 4K image with importance weighting takes seconds. Depth estimation takes 30+ seconds. Loading ML models crashes mobile. | Pre-compute particle positions at build time or on first load with caching. Ship as compact binary buffer alongside the depth map. |
| **Full-resolution pixel particles (1:1)** | "Every pixel becomes a particle for ultimate fidelity" | A 4K photo = 8.3M particles. Even WebGPU cannot render this at 60fps with bloom and connections. Returns diminish past 150K -- it just looks like the photo. | 80K-150K importance-sampled particles. Visually identical to the source at viewing distance, reveals structure up close. |
| **Multiple simultaneous particle fields** | "Show all memories at once as a galaxy" | GPU budget for one field at 100K+ particles with connections and bloom is already substantial. Two fields at once halves the budget. | Sequential experience with dissolve transitions between fields. One memory at a time, full quality. |
| **Particle audio reactivity to music beats** | "Particles pulse with the music like a visualizer" | Transforms the memory into a music visualizer. The particle field should feel like a memory, not a waveform display. Beat reactivity pulls attention from the emotional content. | Subtle atmospheric response: ambient layers swell with progress, particles breathe slightly with low-frequency audio. Response is felt, not seen as a beat-sync. |
| **Scroll hijacking with no escape** | "Lock the page to the particle experience" | Users panic when scroll doesn't work normally. Accessibility failure. Mobile touch scroll conflicts. | Dedicated viewport section with clear boundaries. Normal scroll before and after. Progress indicator showing position in flight. Optional keyboard (arrow keys, space) for accessibility. |

---

## Feature Details by System

### 1. ParticleMemoryRenderer

**Purpose:** Transform photo + depth into a renderable particle field with wire connections.

**Sampling strategy:**
- Load photo texture and depth map texture into an offscreen canvas
- Sample at grid intervals (e.g., every 2-4 pixels depending on target density)
- For each sample point: extract RGB, compute XY position in scene space, read depth value for Z
- Apply importance weighting: more samples at high-gradient depth regions (edges, silhouettes) and bright foreground areas
- Store as Float32Arrays: positions (xyz), colors (rgb), sizes, connection indices

**Connection generation:**
- For each particle, find K nearest neighbors (K=3-6) within a distance threshold
- Filter connections: keep only those where depth difference between endpoints is below a threshold (connects within same depth layer, not across chasms)
- Emphasize edge connections: particles along depth discontinuities (high depth gradient) get more connections
- Store as index pairs in a Uint32Array for LineSegments geometry
- Total connections: roughly 2-4x particle count (each particle has 2-4 outgoing connections, deduplicated)

**Rendering:**
- Particles: `InstancedMesh` with small sphere geometry (4-6 segments) or `Points` with custom shader for billboarded quads
- Each particle: position from buffer, color from buffer, size modulated by depth (closer = larger) and breathing uniform
- Connections: `LineSegments` geometry with vertex colors from endpoints, subtle alpha (0.1-0.3)
- Bloom: `SelectiveBloom` or `UnrealBloomPass` applied to particle layer only (not UI)
- Additive blending on particles for glow bleeding

**Performance budget:**
- 100K particles at 60fps on desktop GPU with bloom: achievable with instanced rendering
- Connection lines (200K-400K segments): achievable with `LineSegments` and vertex colors
- Total draw calls: 1 (particles, instanced) + 1 (connections, single geometry) + postprocessing passes
- Memory: ~100K * (12 bytes position + 12 bytes color + 4 bytes size) = ~2.8MB for particle data

**Dependency on existing system:**
- Reuses depth map assets from `memoryScenes.js` (`depthMapUrl`, `photoUrl`)
- Reuses `resolveAsset()` from CapsuleShell for path resolution
- Lives alongside DisplacedMeshRenderer as a new `renderMode: 'particle-memory'` in the scene registry
- CapsuleShell dispatches to it via the existing renderMode switch

**Complexity: MEDIUM-HIGH** (sampling + connection generation + instanced rendering + bloom integration)

### 2. MemoryFlightController (Scroll-Driven Camera)

**Purpose:** Map scroll/trackpad/touch input to camera position along an authored spline through the particle field.

**Expected behavior:**

| Input | Response | Feel |
|-------|----------|------|
| Scroll wheel down | Camera advances along spline | Smooth, momentum-preserved |
| Scroll wheel up | Camera retreats along spline | Smooth reverse, same momentum |
| Trackpad two-finger scroll | Same as wheel, finer granularity | Natural, 1:1 with gesture speed |
| Touch drag (vertical) | Advances/retreats | Momentum on release |
| Arrow keys (up/down) | Discrete advance/retreat steps | Accessibility fallback |
| Space bar | Auto-advance at slow pace | "Lean back" mode |
| No input (idle 5s) | Gentle auto-advance begins | Prevents stalling |

**Scroll-to-progress mapping:**
- Track cumulative scroll delta (normalized across wheel/trackpad/touch)
- Apply momentum: on input stop, current velocity decays exponentially over 0.5-1.5s
- Clamp progress to [0, 1] range (start of flight to end)
- Ease the progress-to-position mapping with a slight smoothstep to prevent jarring starts/stops
- Map progress to spline interpolation: `spline.getPointAt(progress)` for position, `spline.getTangentAt(progress)` for look direction

**Spline authoring (per-scene config):**
```
flightPath: {
  points: [
    { x, y, z },  // Start: outside the field, looking at it
    { x, y, z },  // Entry: passing through the outer particle shell
    { x, y, z },  // Deep: inside the densest region
    { x, y, z },  // Intimate: very close to a focal point (face, object)
    { x, y, z },  // Pull-back: retreating to see the whole field
    { x, y, z },  // Exit: moving away, field recedes
  ],
  tension: 0.5,     // CatmullRom tension
  lookAhead: 0.05,  // How far ahead on spline the camera looks
}
```

**What feels good vs. bad:**

| Good | Bad |
|------|-----|
| Momentum on release -- camera glides to a stop | Instant stop on scroll end -- feels mechanical |
| Slight parallax on mouse/gyro perpendicular to flight direction | No parallax -- feels like a video, not 3D |
| Progress indicator (subtle bar or dots) so visitor knows position | No progress feedback -- visitor feels lost |
| Auto-advance after idle prevents "stuck" feeling | No auto-advance -- visitor scrolls once, thinks it's broken |
| Snap points at narrative beats (gentle magnetic pull toward key positions) | Hard snap -- progress lurches to fixed positions |
| Slow-in, slow-out at start and end of spline | Constant speed -- no emotional pacing |

**Dependency on existing system:**
- Replaces `CinematicCamera` for particle-mode scenes (GSAP keyframe camera is for displaced-mesh)
- Uses Three.js `CatmullRomCurve3` for spline (already available via three.js)
- Mouse parallax reuses existing pattern from CinematicCamera's `mouseOffset` ref
- Scene config spline points stored in `memoryScenes.js` alongside `cameraKeyframes`

**Complexity: MEDIUM-HIGH** (scroll normalization across input types + momentum physics + spline + progress mapping + snap points)

### 3. DreamPortalTransition

**Purpose:** Replace the sci-fi ring portal with a dreamstate transition that dissolves reality into particles, drifts through a tunnel/void, and reforms particles into the memory.

**Three phases:**

**Phase 1: Dissolve (2-3 seconds)**
- The existing displaced mesh (current memory or home page content) begins to break apart
- Mesh vertices scatter outward from center, preserving color, with increasing velocity
- Simultaneously, the particle field begins to appear at low opacity in the background
- Sound: low rumble crescendo, existing audio fades out
- Camera: very slow drift forward into the dissolving mesh
- Visual reference: like a sandcastle in wind, but the grains become luminous particles

**Phase 2: Tunnel/Drift (1-2 seconds)**
- Screen is fully in particle space -- scattered particles from Phase 1 stream past the camera
- Background glow shifts to scene mood color (warm amber, cool blue)
- Optional: particle streams converge ahead, suggesting a destination
- Sound: atmospheric wash, reverb-heavy, tonal shift toward the scene's soundtrack key
- Camera: accelerating forward through streaming particles
- Visual reference: hyperspace jump in Star Wars but with warm glowing particles instead of stars

**Phase 3: Reform (2-3 seconds)**
- Streaming particles decelerate and find their target positions in the new memory's particle field
- Particles arrive in waves: background first (farther, lower detail), foreground last (closer, higher detail)
- Wire connections fade in after particles settle (0.5s delay)
- Sound: scene soundtrack begins, fade from atmospheric wash into scene's ambient bed
- Camera: decelerating, settling onto the beginning of the flight spline
- Visual reference: Linkin Park "Lost" formation sequences where pixel clouds coalesce into recognizable images

**Coordination with existing systems:**
- Phase 1 needs access to the current renderer's geometry (displaced mesh vertices for scatter animation)
- If entering from the constellation or home page (no active displaced mesh), Phase 1 uses a generic particle scatter from screen edges
- PortalVFX's existing `phase` state machine (seep/gathering/rupture/emerging/residual) can be extended or paralleled with dream phases (dissolve/tunnel/reform)
- `sessionStorage.jarowe_portal_entry` flag currently tracks whether portal preceded the scene -- extend to track dream portal

**Complexity: HIGH** (coordinates across renderer disposal, new particle system initialization, camera handoff, audio crossfade, and three-phase state machine)

### 4. MemorySoundscape (Progress-Reactive Audio)

**Purpose:** Layered ambient audio that evolves with scroll progress, creating an emotional journey through sound that matches the visual journey through particles.

**Layer architecture:**

| Layer | Content | Scroll Behavior | Volume Range |
|-------|---------|-----------------|--------------|
| **Base drone** | Low-frequency sustained tone, scene-specific key | Always present; volume constant | 0.15-0.25 |
| **Ambient bed** | Environmental recording (wind, water, cave echo, city hum) | Fades in from progress 0.1, full at 0.3 | 0-0.35 |
| **Melodic fragment** | Short looped musical phrase, scene-specific | Fades in from progress 0.3, peaks at 0.6, softens past 0.8 | 0-0.20 |
| **Detail layer** | Subtle texture (chimes, crickets, distant voices, reverb hits) | Appears only in progress 0.4-0.7 (the "deep" part of the flight) | 0-0.15 |
| **Resolution** | Final sustained chord or fading tone | Fades in from progress 0.8, peaks at 1.0 | 0-0.20 |

**Audio design principles for progress-reactive soundscapes:**

1. **Continuous, not triggered.** Layers cross-fade smoothly based on progress position. No "event" sounds on scroll -- the soundscape is a continuous field that you move through. Triggered sounds (stings, hits) break the dream state.

2. **Hysteresis prevents flutter.** When scroll progress oscillates around a threshold (visitor scrolling back and forth), layers use wide crossfade zones (0.1 progress width) rather than hard on/off thresholds. Prevents audio "flickering."

3. **Reverb increases with depth.** Early in the flight (progress 0-0.3), audio is relatively dry. Deep in the flight (0.5-0.8), reverb tail increases. This creates an acoustic sense of "going deeper" that reinforces the visual depth.

4. **Low-pass filter tracks depth.** A subtle low-pass filter on the ambient bed opens as progress increases. At progress 0, the world sounds muffled/distant. At progress 0.7, it sounds clear and present. Reinforces "arriving" in the memory.

5. **Existing GlobalPlayer ducks, does not stop.** The GlobalPlayer music reduces volume (existing `duckForCapsule` pattern) but continues playing at ~10% volume. When the capsule exits, the global music restores. The soundscape and the global music coexist at different layers.

6. **Mute state is respected.** If the visitor has muted the site audio, no soundscape plays. The experience works without sound (particles + scroll are the primary channel), but sound elevates it significantly.

**Implementation approach:**
- Each layer is a separate Howl instance with `loop: true`
- A `SoundscapeController` component receives scroll progress as a prop
- On each progress change, it computes target volume for each layer based on the envelope curves
- Volumes are smoothed (lerped) to prevent zipper noise
- Low-pass filter applied via Web Audio API BiquadFilterNode (branch from Howl's internal nodes)
- Reverb via ConvolverNode with a short IR (0.5-1.5s), wet/dry mix driven by progress

**Scene config extension:**
```
soundscape: {
  baseDrone: '/memory/syros-cave/drone.mp3',
  ambientBed: '/memory/syros-cave/ambient.mp3',
  melodicFragment: '/memory/syros-cave/melody.mp3',
  detailLayer: '/memory/syros-cave/detail.mp3',
  resolution: '/memory/syros-cave/resolution.mp3',
  // Envelope curves (progress -> volume multiplier)
  envelopes: { ... }
}
```

**Dependency on existing system:**
- Uses Howler.js (existing, proven)
- Coordinates with `AudioContext.jsx` duck/restore system
- Web Audio API BiquadFilter and ConvolverNode require connecting to Howler's audio graph (same pattern as `connectAnalyser()` in AudioContext.jsx)
- Must respect global mute state from `AudioContext`

**Complexity: MEDIUM-HIGH** (multi-layer audio management + scroll-driven envelopes + Web Audio filter nodes + Howler coordination)

---

## Feature Dependencies

```
[ParticleMemoryRenderer]
    |--requires--> [Photo + Depth Map assets (existing from v2.1)]
    |--requires--> [R3F Canvas + instanced rendering]
    |--requires--> [Bloom postprocessing (existing infrastructure)]
    |--extends---> [Scene Registry (new renderMode: 'particle-memory')]
    |--replaces--> [DisplacedMeshRenderer for particle-capable scenes]
    |--preserved-> [DisplacedMeshRenderer still available for non-particle scenes]

[MemoryFlightController]
    |--requires--> [ParticleMemoryRenderer (needs a particle field to fly through)]
    |--requires--> [CatmullRomCurve3 spline (Three.js built-in)]
    |--requires--> [Scroll input normalization (new)]
    |--replaces--> [CinematicCamera for particle-mode scenes]
    |--preserved-> [CinematicCamera still used for displaced-mesh scenes]
    |--reuses----> [Mouse/gyro parallax pattern from CinematicCamera]

[DreamPortalTransition]
    |--requires--> [ParticleMemoryRenderer (reform target)]
    |--optional--> [DisplacedMeshRenderer (dissolve source, if transitioning from mesh)]
    |--extends---> [PortalVFX concept (new phases: dissolve/tunnel/reform)]
    |--replaces--> [PortalVFX ring portal for particle scenes]
    |--reuses----> [Session storage portal tracking pattern]
    |--coordinates-> [MemorySoundscape (audio crossfade during transition)]

[MemorySoundscape]
    |--requires--> [Audio assets (5 layers per scene)]
    |--requires--> [Scroll progress value from MemoryFlightController]
    |--reuses----> [Howler.js (existing)]
    |--reuses----> [AudioContext duck/restore pattern (existing)]
    |--reuses----> [Web Audio API graph pattern from connectAnalyser()]
    |--coordinates-> [DreamPortalTransition (crossfade during phase changes)]

[GPU Tier Gating]
    |--reuses----> [getGpuTier() from gpuCapability.js (existing)]
    |--gates-----> [ParticleMemoryRenderer (full tier only)]
    |--fallback--> [DisplacedMeshRenderer (simplified tier)]
    |--fallback--> [ParallaxFallback (parallax tier, existing)]

[CapsuleShell Integration]
    |--extends---> [CapsuleShell.jsx renderMode switch (add 'particle-memory' case)]
    |--preserves-> [All existing renderModes (displaced-mesh, splat, parallax)]
    |--preserves-> [Narrative overlay, mute controls, back button, exit flow]
    |--extends---> [Scene registry with particle + flight + soundscape config]
```

### Critical Ordering

1. **ParticleMemoryRenderer must come first.** Everything else depends on having a renderable particle field.
2. **MemoryFlightController second.** Without scroll-driven camera, the particles are just a static cloud.
3. **MemorySoundscape third.** Audio is emotionally critical but the visual experience must work first.
4. **DreamPortalTransition last.** Most complex, coordinates all other systems, can be simplified (fade-to-black) initially.

---

## Scroll Interaction Patterns: What Feels Good vs. Bad

### Good Patterns (validated in production experiences)

| Pattern | Why It Works | Example |
|---------|-------------|---------|
| **Momentum with exponential decay** | Feels physical, like pushing an object. Natural on trackpads where users expect inertia. Release finger = camera continues for 0.5-1.5s then settles. | Apple's scroll physics, GSAP ScrollTrigger momentum |
| **Soft snap to narrative beats** | Gentle magnetic pull toward key positions (where narrative text appears). Not hard snapping -- more like a valley the progress settles into. Scroll past with enough velocity and you skip the snap. | Figma prototype scroll-snap with momentum override |
| **Progress indicator (subtle)** | Thin vertical bar or dot sequence at screen edge showing position in flight. Reassures visitor they can go forward and backward. Disappears after 2s of no input. | Apple AirPods Pro spatial audio demo |
| **Auto-advance after idle** | If no scroll input for 5s, camera begins slow auto-advance. Any input immediately resumes manual control. Prevents "I scrolled once and nothing happened" abandonment. | Many scroll-driven WebGL experiences |
| **Speed-dependent detail** | Fast scroll = particles blur slightly (motion blur uniform), connections thin out. Slow scroll = full detail, connections pulse. Rewards slow exploration. | Awwwards-style portfolio sites |
| **Escape hatch** | Click/tap "skip" or press Escape at any time to jump to end or exit. No locked scroll. The experience is compelling enough that forcing it should never be needed. | YouTube VR experiences |

### Bad Patterns (validated failure modes)

| Pattern | Why It Fails | Alternative |
|---------|-------------|-------------|
| **Scroll hijacking without boundaries** | Visitor scrolls expecting the page to scroll; instead camera moves. Disorienting if unexpected. Panic when they can't scroll past the experience. | Dedicated viewport with clear visual boundaries. Normal scroll above and below. |
| **1:1 linear scroll mapping** | Every pixel of scroll = same camera distance. No momentum, no easing. Feels robotic. Touchpad users overshoot constantly. | Smoothed mapping with momentum decay and soft snaps. |
| **Scroll reversal** | Scroll down = camera retreats instead of advances. Violates spatial expectation. | Down = forward into the memory. Always. |
| **No reverse allowed** | Scroll only goes forward. Visitor wants to re-read a narrative card or revisit a section -- can't. Frustrating. | Full bidirectional scroll with momentum. |
| **Hard snap to discrete positions** | Progress jumps between fixed waypoints. Breaks the sense of continuous flight. Looks like a slideshow. | Continuous spline interpolation. Soft snaps (magnetic, not hard). |
| **Scroll-speed-dependent narrative** | Text appears faster if you scroll faster. Words blur past unread. | Narrative triggers at progress thresholds, not speed. Text has minimum display time regardless of scroll speed. |

---

## Audio Design Principles for Progress-Reactive Soundscapes

### 1. Sound Is Architecture, Not Decoration

The soundscape defines the emotional space. Without it, the particle field is a silent screensaver. With it, the particle field is a place you inhabit. Sound should feel like it was always there -- you're entering a space that has its own acoustic identity, not triggering sounds by scrolling.

### 2. Layers, Not Events

Progress-reactive audio must be layered and continuous, not event-driven. There are no "scroll sound effects." Instead, layers fade in and out based on position. The visitor should never consciously think "scrolling triggered a sound." They should feel "it sounds different here."

### 3. The Reverb Rule

Reverb tail is the most powerful depth cue in audio. Early in the flight (outside the particle field): dry, distant, thin. Deep in the field: wet, present, enveloping. This maps directly to the visual journey from outside to inside.

### 4. Frequency Follows Depth

Low frequencies = deep, internal, emotional. High frequencies = surface, detail, awareness. As the camera moves deeper into the particle field, the bass increases subtly and high-frequency detail thins. Pulling back reverses this. This is barely conscious but profoundly effective.

### 5. Silence Is a Layer

The soundscape should have moments of near-silence (just the base drone) at the beginning and end. The "full" soundscape lives in the middle of the flight. This creates an arc: quiet entry, rich middle, quiet resolution. Matches the emotional arc of entering and leaving a memory.

### 6. Never Fight the GlobalPlayer

The existing GlobalPlayer may be playing the visitor's chosen track. The soundscape ducks the global player (existing pattern) but never stops it. If the visitor has chosen silence (muted), the soundscape respects that completely. Sound is additive, never hostile.

### 7. Crossfade Zones, Not Switch Points

Every layer transition uses a crossfade zone of at least 10% of the progress range. Layer A fades out over progress 0.4-0.5 while Layer B fades in over 0.45-0.55. This prevents audio "clicking" at boundaries and accommodates scroll oscillation.

---

## MVP Definition for v2.2

### Launch With (Minimum Viable Particle Memory)

The minimum that delivers the "flying through a living memory field" promise:

- [ ] **ParticleMemoryRenderer** -- Photo + depth -> 80K-100K instanced particles with color and depth positioning. Soft glow via bloom. Billboarded quads or point sprites with custom shader.
- [ ] **Selective wire connections** -- 200K-300K line segments connecting nearby same-depth particles. Vertex-colored from source particles. Subtle alpha (0.15-0.25).
- [ ] **Particle breathing** -- Per-particle sinusoidal position/size/brightness oscillation. Keyed to random seed per particle.
- [ ] **MemoryFlightController** -- Scroll-driven camera on CatmullRomCurve3 spline. Momentum on release. Soft snaps at narrative beats. Auto-advance after 5s idle.
- [ ] **Basic soundscape** -- 2-3 audio layers (drone + ambient + resolution) with scroll-driven volume envelopes. Uses existing Howler.js.
- [ ] **GlobalPlayer ducking** -- Reuse existing `duckForCapsule`/`restoreFromCapsule` pattern.
- [ ] **Simple entry transition** -- Fade-to-black -> particles coalesce from scattered state. Not the full dreamstate (Phase 2 tunnel can be cut).
- [ ] **Simple exit transition** -- Particles scatter outward -> fade-to-black -> navigate home.
- [ ] **GPU tier gating** -- Full-tier devices get particles. Simplified-tier gets existing displaced mesh. Parallax-tier gets existing CSS fallback.
- [ ] **1 flagship scene** -- syros-cave as particle memory with authored flight spline, connection rules, and 2-3 soundscape layers.
- [ ] **Progress indicator** -- Subtle vertical dots or thin bar at screen edge.
- [ ] **Escape hatch** -- Skip/exit button always visible. Escape key works.

### Add After Validation

- [ ] **Full dreamstate portal** -- Three-phase dissolve/tunnel/reform replacing fade-to-black transitions
- [ ] **5-layer soundscape** -- Full drone + ambient + melodic + detail + resolution layer stack
- [ ] **Web Audio filters** -- Low-pass + reverb driven by scroll progress
- [ ] **Depth-aware density** -- Importance sampling for particle distribution
- [ ] **Narrative as particles** -- Text materializing from the particle field
- [ ] **Speed-dependent detail** -- Motion blur and connection density responding to scroll velocity
- [ ] **Additional scenes** -- Second and third particle memory scenes with different moods

### Defer (v2.3+)

- [ ] **WebGPU compute particles** -- 300K+ particle fields with GPU physics
- [ ] **Multi-scene sequencing** -- Flying between multiple particle memories in one session
- [ ] **Audio-reactive particle breathing** -- Particle oscillation driven by Web Audio analyser rather than sinusoidal
- [ ] **User-generated particle memories** -- Upload photo -> auto-generate particle field in browser

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|-----------|-------------------|----------|-----------|
| Photo-to-particle sampling | HIGH | MEDIUM | P1 | Depth map assets |
| Instanced particle rendering | HIGH | MEDIUM | P1 | Sampling |
| Selective wire connections | HIGH | MEDIUM-HIGH | P1 | Particle positions |
| Particle glow + bloom | HIGH | LOW-MEDIUM | P1 | Particle rendering |
| Particle breathing | MEDIUM-HIGH | LOW | P1 | Particle rendering |
| Scroll-driven camera (spline) | HIGH | MEDIUM-HIGH | P1 | Particle field |
| Scroll momentum + easing | MEDIUM-HIGH | LOW-MEDIUM | P1 | Scroll camera |
| Basic soundscape (2-3 layers) | HIGH | MEDIUM | P1 | Howler.js |
| GlobalPlayer ducking | HIGH | LOW (reuse) | P1 | AudioContext |
| Simple entry/exit transitions | HIGH | MEDIUM | P1 | Particle renderer |
| GPU tier gating | HIGH | LOW (reuse) | P1 | gpuCapability.js |
| Scene registry extension | MEDIUM | LOW | P1 | memoryScenes.js |
| Progress indicator | MEDIUM | LOW | P1 | Scroll controller |
| 1 flagship scene | HIGH | MEDIUM | P1 | All P1 features |
| Full dreamstate portal | MEDIUM-HIGH | HIGH | P2 | All P1 + mesh disposal |
| 5-layer soundscape | MEDIUM | MEDIUM | P2 | Basic soundscape |
| Web Audio filters (LP, reverb) | MEDIUM | MEDIUM | P2 | Soundscape |
| Depth-aware density | MEDIUM | MEDIUM | P2 | Sampling |
| Narrative as particles | LOW-MEDIUM | HIGH | P3 | SDF text or hybrid |
| Speed-dependent detail | LOW-MEDIUM | MEDIUM | P2 | Scroll controller |
| WebGPU compute particles | LOW | HIGH | P3 | WebGPU maturity |

**Priority key:**
- P1: Must have -- delivers the core "flying through memory" promise
- P2: Should have -- deepens the emotional and technical quality
- P3: Future -- significant effort, defer until P1 proves the concept

---

## Competitor / Reference Analysis

| Feature | Linkin Park "Lost" Video | Apple Memories | Three.js Particle Examples | Bruno Simon Portfolio | Our Approach |
|---------|-------------------------|---------------|--------------------------|---------------------|-------------|
| Particle source | Pre-rendered CG | N/A (Ken Burns) | Procedural geometry | Procedural | Photo + depth map sampling |
| Particle count | ~500K (offline rendered) | N/A | 10K-50K (real-time) | 20K-100K | 80K-150K (instanced) |
| Connections | Sparse wire mesh, edge-following | None | None | None | Depth-aware selective wires |
| Camera | Pre-animated, flies through | Auto-choreographed | OrbitControls (free) | Scroll-driven | Scroll-driven spline rail |
| Audio | Full produced track | Auto-selected music | None | Background music | Progress-reactive layered soundscape |
| Transitions | Scatter/reform between scenes | Crossfade | None | Scroll sections | Dreamstate dissolve/tunnel/reform |
| Interactivity | None (video) | None | Mouse orbit | Scroll position | Scroll flight + mouse parallax |
| Platform | Video (any player) | iOS native | Web (any browser) | Web (any browser) | Web (GPU tier gated) |

**Our unique position:** We are the only implementation combining photo-derived particle fields with scroll-driven flight AND progress-reactive audio AND wire connections. The Linkin Park "Lost" video is our aesthetic target but it's pre-rendered video with no interactivity. We're making it real-time and interactive.

---

## Existing Codebase Assets to Reuse

| Asset | File | What It Provides for v2.2 |
|-------|------|--------------------------|
| Depth map assets | `public/memory/syros-cave/depth.png` | Z-position data for particle extrusion. Same asset, different consumer. |
| Photo assets | `public/memory/syros-cave/photo.webp` | Color data for particle sampling. Same asset, different consumer. |
| Scene registry | `src/data/memoryScenes.js` | Extend with particle/flight/soundscape config. Existing schema preserved. |
| GPU tier detection | `src/utils/gpuCapability.js` | Gate particle renderer to full tier. Existing function, no changes needed. |
| CapsuleShell | `src/pages/CapsuleShell.jsx` | Add `renderMode: 'particle-memory'` case to existing switch. Shell chrome (narrative, mute, back) reused as-is. |
| CinematicCamera | `src/pages/CapsuleShell.jsx` (inner component) | Mouse/gyro parallax pattern. Replaced for particle scenes but pattern reused. |
| AtmosphericParticles | `src/pages/CapsuleShell.jsx` (inner component) | Shader patterns for point rendering (PARTICLE_VERT, PARTICLE_FRAG). Reference for breathing/drift. |
| Particle shaders | `src/constellation/scene/ParticleCloud.jsx` | Instanced point rendering with custom vertex/fragment shaders. Shape-based SDF patterns. |
| PortalVFX | `src/components/PortalVFX.jsx` | State machine pattern (phase-based transitions). Extend or parallel for dream phases. |
| ArcController | `src/pages/CapsuleShell.jsx` (inner component) | GSAP-driven lifecycle (awakening/recession). Pattern for entry/exit timing. |
| AudioContext | `src/context/AudioContext.jsx` | `duckForCapsule()`/`restoreFromCapsule()` pattern. `connectAnalyser()` pattern for Web Audio graph branching. |
| Bloom postprocessing | `@react-three/postprocessing` | Already installed and proven. EffectComposer + Bloom for particle glow. |
| CatmullRomCurve3 | `three` (built-in) | Spline for flight path. No new dependency. |
| Color grading | `CapsuleShell.jsx` COLOR_GRADING presets | Mood-based color transforms. Apply to particle field for consistent scene tone. |

---

*Feature research for: Particle Memory Flight (v2.2)*
*Researched: 2026-03-23*
*Reference: Linkin Park "Lost" music video — pixel formations, wire connections, glow*
