# Feature Research

**Domain:** Single-photo 3D memory capsule experiences
**Researched:** 2026-03-23
**Confidence:** HIGH

## How Single-Photo 3D Memory Experiences Work

### The Core Technique: Depth-Displaced Mesh (2.5D)

A single photograph is turned into a navigable 3D scene through **depth estimation + mesh displacement**:

1. **Depth map generation** -- A monocular depth estimation model (MiDaS, Depth Anything V2, Marigold) produces a grayscale depth map from a single RGB photo. Closer regions are brighter; distant regions are darker.
2. **Mesh construction** -- A subdivided plane geometry (e.g., `PlaneGeometry(1, 1, 256, 256)`) is created. The original photo is applied as the color texture.
3. **Vertex displacement** -- Each vertex is pushed along the Z-axis by its corresponding depth value. This creates a relief surface: foreground pops out, background recedes.
4. **Constrained camera** -- A camera drifts slowly through the scene (dolly, orbit, parallax) but is never free-roam. The illusion breaks if the viewer moves too far off-axis, exposing stretched edges and depth discontinuities.
5. **Atmosphere** -- Particles, depth-of-field blur, vignette, subtle fog, and soundtrack sell the immersion. These mask seams and depth artifacts.

### What Makes It Feel Immersive vs. Gimmicky

**Immersive (the goal):**
- Constrained camera that drifts cinematically -- the viewer never controls rotation, only watches a carefully choreographed reveal
- Depth displacement is subtle (10-20% of scene depth, not extreme)
- Atmosphere carries the emotion: particles, light bloom, film grain, color grading
- Sound is the anchor -- ambient bed + soundtrack gives the scene emotional weight
- Narrative text appears timed, never all at once -- creates pacing
- Entry/exit are transitions, not page loads -- portal in, fade out
- The photo subject remains recognizable; 3D is additive, not distortive

**Gimmicky (the trap):**
- Full free-roam orbit revealing stretched edges and depth holes
- Extreme displacement that warps faces and objects beyond recognition
- No sound -- silent 3D displacement looks like a tech demo
- Instant load with no transition -- kills the sense of entering a space
- Infinite zoom that exposes pixelation
- Overuse of particles/effects that obscure the actual memory
- Multiple scenes auto-playing like a slideshow before the viewer connects with one

### Key Insight

The photo is not the experience. The photo is the **canvas**. The experience is the combination of constrained camera movement, atmosphere, sound, and narrative that makes the viewer feel like they are **inside a memory** rather than looking at a picture. The depth displacement is just the skeleton; everything else is the soul.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Depth-displaced mesh from single photo | Core promise of the capsule concept | MEDIUM | PlaneGeometry + depth texture displacement in vertex shader. Existing R3F stack supports this natively. |
| Cinematic constrained camera | Users expect a curated viewing experience, not a model viewer | MEDIUM | GSAP timeline or useFrame drift with clamped range. Proven pattern in globe/constellation camera work. |
| Smooth entry transition | Entering a memory should feel like a portal, not a page load | LOW-MEDIUM | Existing PortalVFX.jsx provides the entry. Fade-to-scene after portal rupture. |
| Smooth exit / back navigation | Users must feel safe to leave | LOW | Existing back-link pill pattern. Fade-out + portal residual on exit. |
| Narrative text overlay | Without text the scene has no context or story | LOW | Existing narrative card system in MemoryPortal.jsx. Timed delay-based reveal. |
| Soundtrack / ambient audio | Silent 3D looks like a tech demo; sound creates presence | LOW | Existing Howler.js integration in MemoryPortal.jsx. Fade-in on unmute. |
| Vignette + film grain | Basic cinematic framing expected in any "memory" experience | LOW | Already built in MemoryPortal.css (vignette, grain overlays). |
| Loading state with progress | 3D assets take time; users need feedback during load | LOW | Existing spinner pattern in MemoryPortal.jsx. Enhance with percentage. |
| Mobile fallback | Capsule must work on devices that cannot run 3D | MEDIUM | Existing parallax fallback in MemoryPortal.jsx (mouse-tracked background). Extend with CSS Ken Burns. |
| Responsive layout | Narrative cards, controls must work on all screen sizes | LOW | Existing responsive CSS in MemoryPortal.css covers this. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Atmospheric particles (dust, bokeh, light specks) | Transforms flat 3D relief into living space; particles sell depth | MEDIUM | R3F Points/PointMaterial (proven in UniversePage). Scene-specific particle configs (warm motes vs. cold snow). |
| Depth-of-field blur on displaced mesh | Cinematic rack focus draws attention to subject; masks depth seams | MEDIUM | Existing DepthOfField in postprocessing stack (proven in ConstellationCanvas). Apply to capsule R3F scene. |
| Per-scene color grading / mood | Each memory has distinct emotional tone (warm sunset, cool morning, golden hour) | LOW-MEDIUM | Uniform-driven color transform in fragment shader or postprocessing LUT. Scene config drives it. |
| Camera choreography system (keyframes, not just drift) | Multi-beat camera paths (slow push-in, pause, drift left) tell a story through movement | MEDIUM-HIGH | GSAP timeline with camera position/target keyframes. More complex than drift but dramatically more cinematic. |
| Timed narrative with typing/fade transitions | Text appears word-by-word or letter-by-letter with easing; creates intimacy | LOW-MEDIUM | Framer Motion letter animation or CSS typewriter. Builds on existing narrative card timing. |
| Edge-aware depth refinement | Clean depth boundaries prevent foreground/background bleeding | MEDIUM | Bilateral filter or guided filter on depth map as preprocessing step. Run at build-time in pipeline. |
| Soundtrack crossfade with global player | Scene music fades in while global player fades out; seamless audio landscape | LOW-MEDIUM | Howler volume ducking. GlobalPlayer already handles cross-page audio state. |
| Renderer-agnostic portal shell | Same chrome/narrative/soundtrack wraps displaced mesh now, gaussian splats later | MEDIUM | Abstract the 3D renderer behind a component boundary. Shell handles everything except the 3D content. |
| Haptic feedback on mobile (subtle vibration) | Physical sensation reinforces entry moment | LOW | `navigator.vibrate([50, 30, 50])` on portal entry. Trivial but memorable on mobile. |
| Photo metadata overlay (date, location) | Grounds the memory in real time/place | LOW | Pull from scene config. Subtle bottom-corner display like camera EXIF data. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free-roam camera / OrbitControls | "Let users explore the 3D scene freely" | Exposes depth artifacts, stretched edges, depth discontinuities at boundaries. Breaks the illusion instantly. | Constrained camera with subtle parallax on mouse/gyro. The viewer feels movement without seeing seams. |
| Client-side depth estimation (ML in browser) | "No manual workflow, auto-generate depth maps" | MiDaS/Depth Anything models are 30-400MB. Loading kills performance. Quality varies wildly. Mobile crashes. | Offline depth estimation pipeline. Generate depth maps at build time. Ship only the depth texture (tiny). |
| Extreme depth displacement | "Make it look MORE 3D" | Warps faces, distorts proportions, creates obvious geometric holes. 2.5D works best when subtle. | Keep displacement at 10-20% of scene scale. Atmosphere and camera movement create more depth perception than geometry. |
| Auto-playing multiple scenes in sequence | "Show all memories as a journey" | Viewer has no time to connect with any single memory. Slideshow fatigue. | One flagship capsule proven end-to-end. Multi-scene ("memory plasma") only as explicit stretch goal with user-controlled pacing. |
| Gaussian splat for capsules (now) | "Splats are more realistic than displaced mesh" | Requires physical capture (Polycam scan), 8-30MB per scene, WebGL2 compatibility issues (existing prototype struggles). Displaced mesh works from any existing photo. | Displaced mesh for v1 (any photo works). Splats for v2 when capture pipeline exists. Portal shell is renderer-agnostic to allow this upgrade. |
| AI-generated inpainting for edges | "Fill in the depth holes with AI" | Adds pipeline complexity, quality is unpredictable, introduces visual artifacts that can look worse than simple falloff | Use soft alpha falloff at depth discontinuity edges. Gentle fog masks the boundaries naturally. |
| Gyroscope-driven camera on mobile | "Natural phone tilt = camera movement" | Requires permission prompt (ruins first impression), many devices lack gyro, motion sensitivity concerns | Mouse/touch parallax is universal and works without permissions. Gyro as opt-in enhancement only. |

## Feature Dependencies

```
[Depth-Displaced Mesh Scene]
    |--requires--> [Depth Map Asset (pre-generated)]
    |--requires--> [Photo Asset (original image)]
    |--requires--> [R3F Canvas + ShaderMaterial]
    |--enhances--> [Existing MemoryPortal.jsx shell]

[Cinematic Camera System]
    |--requires--> [Depth-Displaced Mesh Scene]
    |--requires--> [GSAP or useFrame animation loop]
    |--enhances--> [Narrative timing (camera + text sync)]

[Atmospheric Effects (particles, DOF, color grading)]
    |--requires--> [R3F Canvas scene]
    |--enhances--> [Depth-Displaced Mesh Scene]
    |--reuses----> [UniversePage particle patterns]
    |--reuses----> [ConstellationCanvas DepthOfField setup]

[Narrative Overlay System]
    |--requires--> [Scene config (text + timing)]
    |--reuses----> [Existing narrative card system]
    |--enhances--> [Camera choreography sync]

[Per-Scene Soundtrack]
    |--requires--> [Howler.js audio (existing)]
    |--enhances--> [GlobalPlayer crossfade integration]

[Renderer-Agnostic Portal Shell]
    |--requires--> [Narrative Overlay System]
    |--requires--> [Per-Scene Soundtrack]
    |--requires--> [Entry/Exit transitions]
    |--enables---> [Future gaussian splat renderer swap]

[Portal Entry/Exit Transitions]
    |--reuses----> [PortalVFX.jsx phases]
    |--requires--> [Route integration (React Router)]

[Mobile Fallback]
    |--reuses----> [Existing parallax fallback]
    |--conflicts-> [Depth-Displaced Mesh (cannot run on low-end)]

[Memory Plasma (multi-scene sequencing)]
    |--requires--> [Multiple proven capsule scenes]
    |--requires--> [Scene transition system]
    |--conflicts-> [Single-flagship focus (dilution risk)]
```

### Dependency Notes

- **Depth-displaced mesh requires pre-generated depth maps:** Client-side ML estimation is too heavy. Depth maps must be generated offline and shipped as assets. This means a manual asset workflow (upload photo + depth map) is a prerequisite.
- **Camera choreography enhances narrative timing:** When camera movements sync with text reveals (push in during emotional line, pause during reflection), the effect is dramatically more powerful. These should share a timeline.
- **Atmospheric effects reuse existing patterns:** UniversePage already renders 8K particles + dust; ConstellationCanvas already uses DepthOfField + Vignette postprocessing. The infrastructure exists.
- **Renderer-agnostic shell enables splat upgrade:** By keeping the 3D content behind a component boundary, the shell (narrative, audio, chrome, transitions) can wrap displaced mesh now and gaussian splats later without rewriting the UX layer.
- **Mobile fallback conflicts with 3D rendering:** The existing `canRenderSplat()` GPU capability check can be adapted to `canRenderDepthMesh()` with lower thresholds (displaced mesh is far cheaper than splats). Devices that fail get the parallax fallback.
- **Memory plasma conflicts with flagship focus:** Building multiple scenes before one scene is proven dilutes effort. Stretch goal only after the flagship is emotionally validated.

## MVP Definition

### Launch With (v1)

Minimum viable product -- one unforgettable memory capsule, end-to-end.

- [ ] **Depth-displaced mesh renderer** -- PlaneGeometry + displacement ShaderMaterial in R3F. Photo texture + depth texture as uniforms. Vertex displacement in vertex shader.
- [ ] **Constrained cinematic camera** -- Slow drift/dolly via GSAP timeline or useFrame. No user camera control. Subtle mouse parallax for responsiveness.
- [ ] **Atmospheric particles** -- Warm dust motes or bokeh circles floating through the scene. R3F Points with PointMaterial, scene-specific config.
- [ ] **Narrative text overlay** -- Timed text cards appearing over the scene. Reuse/extend existing narrative system.
- [ ] **Per-scene soundtrack** -- Howler.js audio with fade-in. Reuse existing MemoryPortal audio system.
- [ ] **Portal entry transition** -- Use existing PortalVFX phases (seep -> gathering -> rupture -> scene reveals).
- [ ] **Mobile fallback** -- Parallax image with Ken Burns drift + vignette + grain for non-capable devices.
- [ ] **Scene configuration schema** -- JSON/JS config per scene: photo path, depth map path, camera keyframes, narrative text/timing, soundtrack, particle style, color mood.
- [ ] **1 flagship scene proven** -- A single real Jared memory with curated photo, depth map, narrative, and soundtrack that makes visitors say "I have never seen a personal site feel like this."

### Add After Validation (v1.x)

Features to add once the flagship capsule lands.

- [ ] **Camera choreography keyframes** -- Multi-beat GSAP timelines (push, pause, drift, retreat) instead of simple drift. Trigger: flagship feels flat with constant drift.
- [ ] **Depth-of-field postprocessing** -- Rack focus effect that follows camera movement. Trigger: scene looks sharp-everywhere-flat.
- [ ] **Per-scene color grading** -- Warm/cool/golden mood via uniform-driven color transform. Trigger: second capsule needs different emotional tone.
- [ ] **Edge-aware depth refinement** -- Bilateral filter on depth maps to clean foreground/background boundaries. Trigger: visible bleeding at depth edges in flagship.
- [ ] **Soundtrack crossfade with GlobalPlayer** -- Duck global music when entering capsule, restore on exit. Trigger: audio collision when user has music playing.
- [ ] **Typing/letter-reveal text animation** -- Word-by-word narrative appearance for intimacy. Trigger: timed card reveals feel too abrupt.
- [ ] **Constellation integration** -- Click a constellation node -> portal transition -> enter that memory's capsule. Trigger: constellation is shipped and has memory-type nodes.

### Future Consideration (v2+)

Features to defer until capsule concept is validated.

- [ ] **Memory plasma (multi-scene sequencing)** -- Scrollable or time-driven sequence of multiple capsules. Only if multiple capsules exist AND single capsule proves retention value.
- [ ] **Gaussian splat renderer swap** -- Replace displaced mesh with captured splat for scenes that have 3D scans. Requires physical capture pipeline (Polycam/PostShot).
- [ ] **Client-side depth estimation** -- Run MiDaS/Depth Anything in browser for user-uploaded photos. Requires WebGPU maturity + model optimization.
- [ ] **Audio-reactive displacement** -- Mesh pulses subtly with music beats. Requires Web Audio analyser integration (infrastructure exists in Howler setup).
- [ ] **Globe -> capsule transition** -- Click a location pin on the 3D globe -> fly into the memory capsule for that place. Requires both globe and capsule to be stable.
- [ ] **Glint narration inside capsules** -- Glint appears as guide inside the memory, adding conversational commentary. Requires Glint to work outside Home page.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Depth-displaced mesh renderer | HIGH | MEDIUM | P1 |
| Constrained cinematic camera | HIGH | LOW-MEDIUM | P1 |
| Atmospheric particles | HIGH | LOW-MEDIUM | P1 |
| Narrative text overlay | HIGH | LOW (reuse) | P1 |
| Per-scene soundtrack | HIGH | LOW (reuse) | P1 |
| Portal entry transition | MEDIUM-HIGH | LOW (reuse) | P1 |
| Mobile fallback | HIGH | LOW (extend) | P1 |
| Scene configuration schema | HIGH | LOW | P1 |
| 1 flagship scene | HIGH | MEDIUM | P1 |
| Camera choreography keyframes | MEDIUM-HIGH | MEDIUM | P2 |
| Depth-of-field postprocessing | MEDIUM | LOW-MEDIUM | P2 |
| Per-scene color grading | MEDIUM | LOW | P2 |
| Edge-aware depth refinement | MEDIUM | MEDIUM | P2 |
| Soundtrack crossfade w/ GlobalPlayer | MEDIUM | LOW | P2 |
| Typing text animation | LOW-MEDIUM | LOW | P2 |
| Constellation integration | MEDIUM | MEDIUM | P2 |
| Memory plasma | LOW-MEDIUM | HIGH | P3 |
| Gaussian splat swap | LOW | HIGH | P3 |
| Client-side depth estimation | LOW | HIGH | P3 |
| Audio-reactive displacement | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (one unforgettable capsule)
- P2: Should have, add when possible (enhance the experience)
- P3: Nice to have, future consideration (expand the system)

## Competitor Feature Analysis

| Feature | Apple Memories (iOS Photos) | Facebook 3D Photos | Luma AI Scene Explorer | NSTII.art Photo-to-3D | Our Approach |
|---------|---------------------------|--------------------|-----------------------|----------------------|--------------|
| Depth source | LiDAR + ML on-device | Dual-camera depth or ML | NeRF/3DGS from video | Monocular depth estimation | Offline monocular depth estimation (MiDaS/Depth Anything V2) |
| 3D method | Ken Burns + parallax layers | Foreground/background layer split | Full gaussian splat / NeRF | Depth-displaced mesh | Depth-displaced mesh with vertex shader |
| Camera control | Auto-choreographed, no user control | Slight gyro parallax, no orbit | Free-roam orbit | Constrained drift | Constrained cinematic drift (no free-roam) |
| Atmosphere | Music + transitions + color grading | None | None (raw 3D scene) | Particles, glow options | Particles + DOF + vignette + grain + color grading |
| Narrative | Auto-generated captions from ML | None | None | None | Hand-written timed narrative cards |
| Sound | Auto-selected from Apple Music library | None | None | None | Per-scene curated soundtrack via Howler.js |
| Entry experience | Smooth transition from Photos grid | Instant load | Page load | Page load | Portal VFX transition (seep -> rupture -> reveal) |
| Platform | iOS native only | Facebook app / web | Web (requires capture) | Web | Web (any browser, any device with fallback) |

## Existing Codebase Assets to Reuse

| Asset | File | What It Provides |
|-------|------|-----------------|
| Portal VFX | `src/components/PortalVFX.jsx` | 5-phase canvas portal effect (seep, gathering, rupture, emerging, residual). Direct reuse for capsule entry. |
| Memory Portal shell | `src/pages/MemoryPortal.jsx` | Route, narrative cards, soundtrack, mute/unmute, loading states, back button, mobile fallback. Refactor as renderer-agnostic shell. |
| Memory Portal CSS | `src/pages/MemoryPortal.css` | Vignette, grain, light leak, narrative card glass styling, responsive layout. Direct reuse. |
| Scene registry | `src/data/memoryScenes.js` | Scene config schema (id, title, location, camera, narrative, soundtrack). Extend with depth map path + particle config. |
| GPU capability check | `src/utils/gpuCapability.js` | WebGL2 + GPU tier detection. Adapt threshold for displaced mesh (lower than splat requirement). |
| R3F + drei + postprocessing | package.json | `@react-three/fiber@9.5.0`, `@react-three/drei@10.7.7`, `@react-three/postprocessing@3.0.4`. Full 3D pipeline ready. |
| Particle patterns | `src/pages/UniversePage.jsx` | 8K stars + dust cloud using Points/PointMaterial. Adapt for scene-specific atmospheric particles. |
| DepthOfField + Vignette | `src/constellation/scene/ConstellationCanvas.jsx` | EffectComposer with DepthOfField + Vignette postprocessing. Proven R3F postprocessing pattern. |
| GSAP camera animation | Globe/Constellation code | Camera position/target tweening with GSAP timelines. Proven constrained camera pattern. |
| Howler.js audio system | `src/context/AudioContext.jsx` | Global audio state, Howl instances, volume control. Reuse for capsule soundtrack. |

## Sources

- Apple iOS Memories -- Auto-generated photo/video montages with Ken Burns, music, ML captions. Gold standard for automated memory experiences. Weakness: no user narrative control.
- Facebook 3D Photos (2018-present) -- Dual-camera or ML depth for parallax effect. Simple but effective layered approach. No atmosphere or narrative.
- Luma AI / Polycam -- 3DGS/NeRF capture from video. Full volumetric scenes but require physical capture. Not applicable to existing single photos.
- NSTII.art / DepthFlow -- Open-source photo-to-3D with monocular depth. Demonstrates displaced mesh technique with particles and effects. Closest existing reference to our approach.
- Three.js examples -- `webgl_materials_displacementmap`, `webgl_buffergeometry_custom_attributes_particles`. Proven displacement + particle patterns.
- Awwwards 2025-2026 trends -- Scroll-driven narrative, cinematic camera choreography, atmospheric particles as differentiator in portfolio sites.
- Depth Anything V2 (2024, TikTok/ByteDance) -- State-of-the-art monocular depth estimation. MIT license, runs offline, supports fine-tuning. Recommended for depth map generation pipeline.
- MiDaS (Intel ISL) -- Earlier monocular depth model, simpler but lower quality. Good fallback if Depth Anything has issues.

---
*Feature research for: Single-photo 3D memory capsule experiences*
*Researched: 2026-03-23*
