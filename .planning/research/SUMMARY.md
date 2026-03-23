# Project Research Summary

**Project:** JAROWE Memory Capsules v2.1
**Domain:** Single-photo 3D memory capsule experiences (depth-displaced mesh, cinematic camera, atmospheric portal UX)
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

Memory Capsules transform a single photograph into an immersive 3D scene by displacing a subdivided plane mesh with a pre-generated depth map, wrapping it in cinematic camera choreography, atmospheric particles, and per-scene soundtrack. The core insight from research is that the photo is the canvas, not the experience — depth displacement is just the skeleton; constrained camera movement, atmosphere, sound, and timed narrative are the soul. The effect is powerful when subtle (10-20% depth), and breaks instantly when pushed to extremes or viewed from off-axis angles.

The recommended approach requires only one new runtime dependency (`three-custom-shader-material@6.4.0`) since the full R3F + postprocessing + GSAP + Howler.js stack is already installed and proven. Depth maps are generated offline via Hugging Face Spaces (Depth Anything V2, free) and committed as static assets — no browser-side ML inference needed for v2.1. The existing `MemoryPortal.jsx` is replaced by a new `src/capsule/` module following the same self-contained pattern as `src/constellation/`.

The critical risk is WebGL context exhaustion: the site already runs three GPU-heavy renderers (react-globe.gl, Prism3D Canvas, ConstellationCanvas), and adding a fourth requires explicit renderer disposal on route exit. The second critical risk is depth discontinuity artifacts at foreground/background edges ("rubber sheet" problem), which must be handled in the initial vertex shader via depth gradient discarding — it cannot be retrofitted. Both risks must be addressed in Phase 1 before building any visual polish.

## Key Findings

### Recommended Stack

No significant new dependencies are needed. The entire stack (Three.js, R3F, drei, @react-three/postprocessing, GSAP, maath, Framer Motion, Howler.js) is already installed and proven. The one new addition is `three-custom-shader-material@6.4.0`, which extends `MeshStandardMaterial` with custom vertex displacement and edge-fade GLSL while preserving Three.js lighting, fog, and shadows. All peer deps are satisfied.

Depth maps are generated offline using Depth Anything V2 via free Hugging Face Spaces. A depth map validator script can be built using `sharp` (already in devDependencies). Scene config tuning uses `lil-gui` (already installed) following the same GlobeEditor/ConstellationEditor pattern.

**Core technologies:**
- `three-custom-shader-material@6.4.0`: Extend MeshStandardMaterial with vertex displacement GLSL + edge-fade fragment — the only new dependency (~15KB gzipped)
- `Depth Anything V2` (offline): Monocular depth estimation via Hugging Face Spaces — free, state-of-the-art, generates grayscale depth PNG from any photo
- `@react-three/postprocessing` DepthOfField + Bloom + Vignette: Already in ConstellationCanvas, proven pattern for cinematic atmosphere
- `gsap` timeline + `maath` easing.damp3: Camera choreography keyframes (already used in globe/constellation camera work)
- `drei` useTexture + Sparkles + Float: Parallel texture loading + atmospheric particles + mesh breathing motion

See [STACK.md](./STACK.md) for full compatibility matrix, GLSL snippets, camera choreography pattern, and asset workflow.

### Expected Features

The experience lives or dies on three things: constrained camera (free-roam exposes depth artifacts), atmosphere (particles/DOF/sound sell immersion), and narrative timing (text appears as a reveal, not a caption). These are table stakes, not differentiators.

**Must have (table stakes):**
- Depth-displaced mesh from single photo — the core technique
- Constrained cinematic camera — scripted drift/dolly, no OrbitControls
- Atmospheric particles — dust motes, bokeh specks; sell depth without geometry
- Narrative text overlay — timed cards (existing system, reuse directly)
- Per-scene soundtrack — Howler.js with fade-in (existing system, reuse)
- Portal entry/exit transition — existing PortalVFX phases, direct reuse
- Mobile fallback — parallax + Ken Burns for non-capable devices
- 1 flagship scene — one real Jared memory, end-to-end, that makes visitors say "I have never seen a personal site feel like this"

**Should have (competitive):**
- Camera choreography keyframes — multi-beat GSAP timelines (push, pause, drift) vs. simple drift
- Depth-of-field postprocessing — rack focus following camera; masks depth seams
- Per-scene color grading — warm/cool/golden mood via fragment uniform or postprocessing LUT
- Soundtrack crossfade with GlobalPlayer — duck global music on entry, restore on exit
- Constellation integration — constellation node click → portal → memory capsule

**Defer (v2+):**
- Memory plasma (multi-scene sequencing) — only after flagship proves single-capsule retention value
- Gaussian splat renderer swap — requires physical capture pipeline (Polycam/PostShot)
- Client-side depth estimation — needs WebGPU maturity + 99MB model optimization
- Audio-reactive displacement — Web Audio analyser infrastructure exists but this is an enhancement

See [FEATURES.md](./FEATURES.md) for full prioritization matrix, competitor comparison, and dependency graph.

### Architecture Approach

The capsule system lives in `src/capsule/` as a self-contained module (following `src/constellation/` pattern), replacing `src/pages/MemoryPortal.jsx` while keeping the `/memory/:sceneId` route. The module splits into `scene/` (R3F components inside Canvas) and `ui/` (HTML overlay above Canvas) — a hard boundary since React cannot render HTML inside an R3F Canvas. The 3D renderer is a concrete implementation, not an abstract interface; the "renderer-agnostic" quality is at the UX layer (shell, narrative, audio, chrome) with a simple `renderMode` conditional in the shell for future splat scenes.

**Major components:**
1. `CapsuleShell` — Full-viewport route page; loads scene config, mounts Canvas + HUD chrome, handles lifecycle
2. `CapsuleScene` — R3F Canvas: DepthMesh + CinemaCamera + AtmosphereParticles + EffectComposer postprocessing
3. `DepthMesh` — Displaced PlaneGeometry (256x256 segments) with photo + depth map textures; custom ShaderMaterial vertex displacement
4. `CinemaCamera` — Scripted drift/dolly via useFrame + GSAP timeline; mouse parallax within constrained ±15% cone
5. `AtmosphereVFX` — Floating particles (drei Sparkles) + bokeh sprites, scene-specific config
6. `NarrativeHUD` — Timed text card overlay extracted from existing MemoryPortal chrome
7. Scene Registry (`memoryScenes.js`) — Extended with `depthMap`, `displacementScale`, `camera.keyframes`, `atmosphere` fields

Assets live in `public/memory/{scene-id}/` per-scene folders: `photo.jpg`, `depth.png`, `soundtrack.mp3`, `preview.jpg`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete project structure, data flow diagram, pattern examples with code, and the renderer-agnostic shell implementation.

### Critical Pitfalls

1. **WebGL context exhaustion** — The site already runs 3 GPU renderers; a 4th on the memory route can silently kill the globe or Prism3D. Fix: implement explicit `globe.renderer().dispose()` + `forceContextLoss()` on home page route exit; wait for confirmed release before mounting CapsuleScene. Address in Phase 1.

2. **Depth discontinuity artifacts ("rubber sheet")** — At foreground/background edges, the displaced mesh stretches grotesquely when camera moves. Fix: in the fragment shader, discard pixels where `abs(dFdx(depth)) + abs(dFdy(depth)) > threshold`. Constrain camera to ±15-20 degree cone. Must be in the initial shader — cannot be retrofitted. Address in Phase 1.

3. **Depth map quality variance** — Models produce excellent results for landscapes but fail on group portraits, reflective surfaces, flat indoor scenes. Fix: establish a "capsule-worthy" photo checklist; provide per-scene `depthScale`/`depthBias`/`depthContrast` config knobs; histogram-equalize depth maps before use. Address in Phase 1 asset pipeline.

4. **Camera choreography that looks like a screensaver** — Linear interpolation + looping = mechanical. Fix: cubic bezier easing on all transitions; layer drift (8s), dolly (12s), focal breathing (20s) with different periods; add imperceptible micro-drift even at "static" moments; sync camera beats to narrative card timing. Address in Phase 2 before showing anyone.

5. **Mobile GPU collapse** — Existing site already pushes mobile; displaced mesh + particles + postprocessing tips it over. Fix: implement three GPU tiers (full / simplified / parallax fallback); cap DPR at 1.5; use existing `canRenderSplat()` detection adapted for depth mesh; measure 8ms fragment shader budget on mid-range Android. Address in Phase 1 (design budget before building).

6. **Asset size bloat** — Uncompressed depth maps (16-bit PNG) are 20-30MB. Fix: WebP photo at 80% quality, max 2048px longest side; 8-bit single-channel depth PNG, max 1024px; target <500KB total per capsule. Lazy-load during portal animation. Establish compression pipeline before committing any assets. Address in Phase 1.

7. **iOS audio desync** — `Howl.play()` after `await` is silently blocked on iOS. Fix: call `Howler.ctx.resume()` synchronously in the portal click handler before any async loading; integrate scene audio through existing AudioContext/GlobalPlayer system; start scene audio with first narrative card, not scene load. Address in Phase 2 (design integration in Phase 1).

8. **UV/depth alignment mismatch** — Depth model outputs at fixed resolution (e.g., 518x518); if photo is 4000x3000, displacement is spatially wrong. Fix: resize depth map to exactly match photo dimensions; validate alignment by overlaying at 50% opacity; store both dimensions in scene config and validate at load time. Address in Phase 1 asset pipeline.

See [PITFALLS.md](./PITFALLS.md) for full pitfall descriptions including warning signs and additional pitfalls (holes/z-fighting, portal disorientation, narrative readability, premature renderer abstraction).

## Implications for Roadmap

### Phase 1: Foundation + Asset Pipeline
**Rationale:** WebGL context management, depth artifact mitigation, asset compression, and GPU tier detection must all be designed before any visual polish is added. These constraints shape what can be built.
**Delivers:** Working displaced mesh renderer with proper depth discontinuity handling; asset pipeline with validated depth maps; GPU tier detection; renderer lifecycle management.
**Addresses:** Depth-displaced mesh (P1), mobile fallback (P1), scene configuration schema (P1)
**Avoids:** Context exhaustion (Pitfall 1), rubber-sheet artifacts (Pitfall 2), depth map quality failures (Pitfall 3), asset bloat (Pitfall 9), UV misalignment (Pitfall 7)

### Phase 2: Cinematic Polish
**Rationale:** Once the mesh renderer works and assets are validated, the camera choreography and atmospheric effects transform it from a tech demo into an experience. This is the difference between showing people something interesting and giving them something they will remember.
**Delivers:** Multi-beat GSAP camera choreography synced to narrative card timing; DOF postprocessing; atmospheric particles; per-scene color grading; Howler.js audio integration through existing AudioContext.
**Uses:** @react-three/postprocessing (DepthOfField, Bloom), gsap timeline + maath.easing.damp3, drei Sparkles, existing AudioContext/GlobalPlayer
**Implements:** CinemaCamera (Phase 2 keyframe version), AtmosphereVFX, CapsuleSoundtrack with GlobalPlayer crossfade
**Avoids:** Screensaver camera (Pitfall 4), audio desync on iOS (Pitfall 10), narrative readability against dynamic 3D (Pitfall 12)

### Phase 3: Flagship Scene + Portal Integration
**Rationale:** With the renderer polished, build one real Jared memory end-to-end: curate the photo, generate and tune the depth map, write the narrative, add the soundtrack. Then wire the full entry/exit portal transitions. The flagship validates whether the concept resonates before expanding.
**Delivers:** 1 flagship memory capsule (Syros or another strong candidate); full PortalVFX entry/exit integration with globe camera state preserved in sessionStorage; emotion validation from real visitors.
**Avoids:** Portal disorientation (Pitfall 6); multiple unfinished scenes diluting quality (anti-feature: auto-playing multiple scenes)

### Phase 4: Integration + Expansion
**Rationale:** After the flagship proves the experience, integrate with the constellation (memory-type nodes → capsule) and add additional scenes.
**Delivers:** Constellation node → portal → capsule navigation; 2-3 additional scenes; scene registry expansion.
**Uses:** Existing constellation camera fly-to pattern for transition choreography.

### Phase Ordering Rationale

- GPU/renderer lifecycle must come before visual features — adding Bloom to a renderer that crashes on mobile is wasted effort
- Camera choreography must come before the flagship — showing an unfinished screensaver experience to validate the concept gives a false negative
- One flagship before multiple scenes — depth map quality varies wildly per photo; establish that it works before multiplying the problem
- Portal integration after renderer is stable — the portal animation timing depends on knowing the scene loads in <2s, which depends on the asset pipeline being correct

### Research Flags

Phases that may need additional investigation during planning:
- **Phase 1 (WebGL context disposal):** The globe's internal renderer (`react-globe.gl`) does not expose a clean disposal API — the exact mechanism to force context release on route navigation needs validation against the current globe code in Home.jsx. May require a ref to the globe instance and calling `globe.renderer().dispose()`.
- **Phase 2 (iOS audio):** The interaction between `Howler.ctx.resume()` and the existing `AudioContext.jsx` synchronous call requirements needs to be mapped against the current AudioProvider implementation before building.
- **Phase 3 (sessionStorage globe state):** Globe camera state preservation requires the globe to read from sessionStorage on mount and restore to the stored position — this pattern doesn't currently exist and needs design before implementation.

Phases with standard patterns (lower research risk):
- **Phase 1 (displaced mesh shader):** Well-documented Three.js pattern; GLSL snippets in STACK.md are directly usable; three-custom-shader-material has excellent docs.
- **Phase 1 (asset pipeline):** Manual Hugging Face Spaces workflow is straightforward; validation script using sharp is trivial.
- **Phase 2 (DOF/particles):** DepthOfField + Vignette already proven in ConstellationCanvas; Sparkles already used in Prism3D.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages already installed and version-compatible; three-custom-shader-material peer deps verified against existing stack; GLSL patterns from official Three.js docs |
| Features | HIGH | Based on Apple Memories, Facebook 3D Photos, NSTII.art, Three.js examples, and Awwwards 2025-2026 trend analysis; feature dependencies clearly mapped |
| Architecture | HIGH | Follows established codebase patterns (constellation module structure, existing MemoryPortal shell); component responsibilities clear; data flow documented |
| Pitfalls | HIGH | Based on direct code analysis of existing codebase (globe renderer lifecycle, MemoryPortal.jsx race condition, Howler iOS patterns), Three.js community documentation, and known displaced mesh rendering limitations |

**Overall confidence:** HIGH

### Gaps to Address

- **Globe renderer disposal:** Exact API for calling `dispose()` + `forceContextLoss()` on the react-globe.gl renderer needs to be validated against the current globe instantiation pattern in Home.jsx during Phase 1 planning.
- **Depth map tuning effort:** Research identified that per-scene depth parameter tuning is required but the amount of manual tuning per photo is unknown until first real photos are tested. The lil-gui editor must be built early to enable this tuning loop.
- **Flagship photo selection:** The "capsule-worthy" checklist is defined, but which of Jared's actual photos are best candidates needs visual assessment (Syros sunset is the illustrative example and a strong candidate given outdoor scene, clear depth layers, and emotional resonance).

## Sources

### Primary (HIGH confidence)
- [Three.js MeshStandardMaterial.displacementMap docs](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.displacementMap) — displacement map API
- [three-custom-shader-material (GitHub)](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) — CSM v6.4.0 peer deps, API
- [Depth Anything V2 (GitHub)](https://github.com/DepthAnything/Depth-Anything-V2) — NeurIPS 2024, monocular depth estimation
- [Depth Anything V2 Hugging Face Space](https://huggingface.co/spaces/depth-anything/Depth-Anything-V2) — free online inference
- [react-postprocessing DepthOfField](https://react-postprocessing.docs.pmnd.rs/effects/depth-of-field) — DOF effect API
- [R3F basic animations](https://docs.pmnd.rs/react-three-fiber/tutorials/basic-animations) — useFrame patterns
- [maath (GitHub)](https://github.com/pmndrs/maath) — easing.damp3 for camera smoothing
- Existing codebase: `src/pages/MemoryPortal.jsx`, `src/constellation/scene/ConstellationCanvas.jsx`, `src/components/Prism3D.jsx`, `src/utils/gpuCapability.js`

### Secondary (MEDIUM confidence)
- [Camera animation in R3F (Medium)](https://medium.com/@zmommaerts/animate-a-camera-in-react-three-fiber-7398326dad5d) — GSAP + useFrame pattern
- [Three.js Forum: 3D from image parallax](https://discourse.threejs.org/t/3d-from-image-parallax-website/83291) — community examples
- NSTII.art / DepthFlow — open-source photo-to-3D reference implementation closest to this approach
- Awwwards 2025-2026 trend analysis — cinematic camera choreography, atmospheric particles as portfolio differentiators
- [Transformers.js v4 Preview](https://huggingface.co/blog/transformersjs-v4) — WebGPU runtime for future browser-side depth (not recommended for v2.1)

### Tertiary (LOW confidence)
- [Depth Anything V3 (ByteDance)](https://github.com/ByteDance-Seed/Depth-Anything-3) — ICLR 2026, next-gen model (emerging, not yet production-ready)
- [Theatre.js + R3F (Codrops)](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/) — alternative to GSAP for camera if choreography complexity grows substantially

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
