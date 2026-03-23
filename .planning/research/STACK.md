# Stack Research

**Domain:** Single-photo 3D memory capsules with depth estimation, displaced mesh rendering, cinematic camera, and atmospheric portal UX
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

This stack analysis focuses on **adding** single-photo depth estimation, displaced mesh 3D scenes, cinematic camera choreography, and atmospheric particle/effects capabilities to the existing Vite 7 + React 19 + R3F + drei + postprocessing + GSAP + Howler.js site. The existing Memory Portal (`/memory/:sceneId`) already has a gaussian splat viewer, narrative card overlay system, soundtrack integration, and cinematic CSS fallback -- this milestone replaces the splat renderer with a depth-displaced mesh approach that works from any single photo.

**Key Finding:** No new runtime dependencies are required for the core displaced mesh renderer. Three.js's built-in `displacementMap` on `MeshStandardMaterial` (or a custom `ShaderMaterial`) with a high-segment `PlaneGeometry` handles displaced mesh rendering natively. Depth maps are generated offline (manual asset workflow) using Depth Anything V2 via Hugging Face Spaces or Replicate API. The existing `@react-three/postprocessing` (DepthOfField, Vignette already proven in ConstellationCanvas) and `maath` (easing/damping already installed) cover cinematic camera and atmospheric effects. GSAP handles camera choreography keyframes (already used for constellation fly-to animations). The only recommended addition is `three-custom-shader-material` for extending `MeshStandardMaterial` with custom vertex displacement and edge-fade GLSL without writing a full `ShaderMaterial` from scratch.

## What Already Exists (DO NOT ADD)

These are already installed and proven in the codebase. Listed here to prevent duplicate recommendations:

| Package | Version | Where Used | Capsule Role |
|---------|---------|------------|--------------|
| `three` | ^0.183.1 | Globe shader, Prism3D, Constellation | PlaneGeometry, ShaderMaterial, textures, displacement |
| `@react-three/fiber` | ^9.5.0 | Prism3D, Constellation, Universe | Canvas, useFrame, useThree for capsule scene |
| `@react-three/drei` | ^10.7.7 | Constellation (OrbitControls, Text, Billboard), Prism3D (Float, Sparkles), Universe (Stars, Points) | useTexture for loading photo+depth, Sparkles for particles, Float for subtle motion |
| `@react-three/postprocessing` | ^3.0.4 | ConstellationCanvas (EffectComposer, DepthOfField, Vignette) | Bokeh DOF, vignette, bloom for capsule atmosphere |
| `gsap` | ^3.14.2 | CameraController fly-to, Home.jsx animations | Camera dolly/drift keyframe timeline |
| `@gsap/react` | ^2.1.2 | Home.jsx useGSAP | React lifecycle integration for camera timeline |
| `maath` | ^0.10.8 | Existing easing/math utilities | easing.damp3 for smooth camera position interpolation |
| `framer-motion` | ^12.34.3 | MemoryPortal narrative cards, PortalVFX | Narrative card entrance/exit, portal transition |
| `howler` | ^2.2.4 | MemoryPortal soundtrack, GlobalPlayer | Per-scene soundtrack (already wired) |
| `zustand` | ^5.0.11 | Constellation store | Capsule scene state (optional, could use React state) |
| `postprocessing` | (peer dep) | Via @react-three/postprocessing | Underlying effect library |

## Recommended Stack

### Core Technologies (NEW additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **three-custom-shader-material** | `6.4.0` | Extend MeshStandardMaterial with custom vertex displacement + edge-fade fragment shader | Lets you inject GLSL vertex/fragment code into Three.js's existing PBR materials while keeping lighting, fog, and shadow support. Avoids writing a full ShaderMaterial from scratch (which loses PBR lighting). Peer deps: `three >=0.159`, `react >=18`, `@react-three/fiber >=8` -- all satisfied by existing stack. Used for: (1) vertex shader that reads depth texture and displaces Z, (2) fragment shader that fades edges to transparent for seamless blending into dark background. |

### Depth Estimation (OFFLINE tooling, not runtime dependencies)

| Tool | Purpose | Why Recommended |
|------|---------|-----------------|
| **Depth Anything V2 (Small)** via Hugging Face Spaces | Generate depth maps from single photos offline | State-of-the-art monocular depth estimation (NeurIPS 2024). Free to use via Hugging Face Space. Upload photo, download grayscale depth PNG. 24.8M param "small" model produces excellent results for this use case. Manual workflow matches PROJECT.md requirement ("upload photo + depth map + configure scene"). |
| **Replicate API** (depth-anything-v2) | Batch depth map generation via API | $0.0023/run. Useful if automating multiple capsule creation later. Has REST API for scripting. Not needed for v2.1 (manual workflow), but good upgrade path. |
| **Stability AI API** (depth endpoint) | Alternative cloud depth estimation | Credit-based pricing ($10/1000 credits). Higher cost but potentially better quality for some images. Keep as fallback option. |

**Why NOT browser-side depth estimation:**
- `@huggingface/transformers` (v3.8.1) can run `depth-anything-v2-small` ONNX model in-browser, but the model is ~99MB download, inference takes 2-5 seconds on good hardware, and adds significant bundle complexity.
- For v2.1 (manual asset workflow, 1 flagship scene), offline generation is simpler, faster, and produces identical results.
- Browser-side estimation is a valid **future** upgrade if the feature grows to user-uploaded photos.

### Supporting Libraries (already installed, guidance on capsule-specific usage)

| Library | Capsule Usage | Integration Notes |
|---------|---------------|-------------------|
| `@react-three/postprocessing` DepthOfField | Cinematic bokeh focus on foreground subject | Already proven in ConstellationCanvas. Use `focusDistance`, `focalLength`, `bokehScale` uniforms. Animate focus distance with GSAP for rack-focus effect. |
| `@react-three/postprocessing` Vignette | Dark edge framing for cinematic mood | Already in ConstellationCanvas. Tunable `offset` and `darkness`. |
| `@react-three/postprocessing` Bloom | Atmospheric glow on light-colored regions | Selective bloom (luminanceThreshold=1 default). Lift emissive on particles/light specks to trigger bloom. Not yet used in Memory Portal but proven pattern. |
| `@react-three/postprocessing` Noise | Film grain overlay for cinematic feel | Lightweight. Currently done via CSS in MemoryPortal (`.memory-portal__grain`); moving to postprocessing Noise gives GPU-native grain synced with DOF. |
| `drei` Sparkles | Atmospheric dust/light mote particles | Already imported in Prism3D. Configurable count, size, speed, opacity, color. Zero-effort atmospheric particles. |
| `drei` Float | Subtle mesh breathing/bobbing | Already in Prism3D. Wrap displaced mesh for gentle drift motion. |
| `drei` useTexture | Load photo texture + depth map texture | Drei's texture loader with suspend support. Load both textures in parallel. |
| `maath` easing.damp3 | Frame-rate-independent camera position smoothing | Already installed. Use in useFrame for smooth camera position/target interpolation during drift and dolly. |
| `gsap` timeline | Camera choreography keyframes (dolly in, drift, parallax shift) | Already used in CameraController.jsx for constellation fly-to. Create a gsap.timeline() with position/lookAt keyframes, elapsed time drives camera proxy, useFrame lerps camera to proxy. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Depth map validator script** | Verify depth map dimensions match photo dimensions | Simple Node.js script using `sharp` (already in devDependencies). Prevents mismatched texture sizes that cause UV mapping errors. |
| **Scene config editor** | Tune displacement scale, camera path, timing in real-time | Follow existing pattern: `lil-gui` (already installed ^0.21.0) with live parameter editing, like GlobeEditor and ConstellationEditor. |

## Installation

```bash
# Only ONE new runtime dependency needed:
npm install three-custom-shader-material@^6.4

# Everything else is already installed.
# No new dev dependencies needed (sharp, lil-gui already present).
```

## Architecture: Displaced Mesh Renderer

### Core Pattern

```
[Photo.jpg] + [DepthMap.png] (pre-generated offline)
  |
  v
[PlaneGeometry(aspect, 1, 256, 256)]  ← high segment count for smooth displacement
  |
  v
[CustomShaderMaterial extending MeshStandardMaterial]
  ├── vertex: sample depth texture → displace vertex Z position
  ├── fragment: edge-fade alpha (smooth falloff at mesh borders)
  └── uniforms: displacementScale, edgeFadeWidth, time (for subtle animation)
  |
  v
[Constrained camera] (no OrbitControls — scripted path only)
  ├── GSAP timeline: dolly forward, drift left/right, subtle parallax
  ├── useFrame: lerp camera.position → timeline proxy via maath.easing.damp3
  └── Mouse parallax: ±5% offset from mouse position (existing pattern in MemoryPortal)
  |
  v
[EffectComposer]
  ├── DepthOfField (animated focus distance for rack-focus)
  ├── Vignette (dark cinematic edges)
  ├── Bloom (selective, for light specks / atmospheric glow)
  └── Noise (film grain)
  |
  v
[Overlay: narrative cards + soundtrack + chrome]
  └── Existing MemoryPortal JSX (narrative timing, Howler, back link)
```

### PlaneGeometry Segments

The depth displacement effect quality depends directly on vertex count. Key guidance:

- **256x256 segments** = 65,536 vertices. Smooth displacement, ~1MB geometry. Good default.
- **128x128 segments** = 16,384 vertices. Acceptable for mobile. Visible faceting at close zoom.
- **512x512 segments** = 262,144 vertices. Diminishing returns. Only if camera gets very close.
- Match plane aspect ratio to photo aspect ratio (e.g., 16:9 photo = `PlaneGeometry(1.78, 1, 256, 144)`).

### Vertex Displacement GLSL

```glsl
// In CustomShaderMaterial vertex shader:
uniform sampler2D uDepthMap;
uniform float uDisplacementScale;
uniform float uDisplacementBias;

void main() {
  // Sample depth map (grayscale: white=close, black=far)
  float depth = texture2D(uDepthMap, uv).r;

  // Displace along normal (Z for front-facing plane)
  csm_Position += normal * (depth * uDisplacementScale + uDisplacementBias);
}
```

### Edge Fade GLSL

```glsl
// In CustomShaderMaterial fragment shader:
uniform float uEdgeFade;

void main() {
  // Fade alpha near UV edges for seamless blending into dark background
  float fadeX = smoothstep(0.0, uEdgeFade, uv.x) * smoothstep(0.0, uEdgeFade, 1.0 - uv.x);
  float fadeY = smoothstep(0.0, uEdgeFade, uv.y) * smoothstep(0.0, uEdgeFade, 1.0 - uv.y);
  csm_DiffuseColor.a *= fadeX * fadeY;
}
```

### Camera Choreography Pattern

```javascript
// GSAP timeline drives a proxy object, useFrame lerps camera to it
const cameraProxy = useRef({ x: 0, y: 0, z: 5, tx: 0, ty: 0, tz: 0 });

useEffect(() => {
  const tl = gsap.timeline({ repeat: -1, yoyo: true });
  tl.to(cameraProxy.current, { z: 3.5, duration: 8, ease: 'power1.inOut' })  // dolly in
    .to(cameraProxy.current, { x: 0.3, duration: 6, ease: 'sine.inOut' }, '<') // drift right
    .to(cameraProxy.current, { x: -0.2, duration: 10, ease: 'sine.inOut' })    // drift left
    .to(cameraProxy.current, { z: 4.5, duration: 8, ease: 'power1.inOut' });   // dolly out
  return () => tl.kill();
}, []);

useFrame((state, delta) => {
  const mouse = state.pointer; // ±1 range
  const target = {
    x: cameraProxy.current.x + mouse.x * 0.15,  // parallax offset
    y: cameraProxy.current.y + mouse.y * 0.08,
    z: cameraProxy.current.z,
  };
  easing.damp3(state.camera.position, [target.x, target.y, target.z], 0.25, delta);
  state.camera.lookAt(cameraProxy.current.tx, cameraProxy.current.ty, cameraProxy.current.tz);
});
```

### Renderer-Agnostic Portal Shell

The existing `MemoryPortal.jsx` already has the right architecture for renderer-agnostic design:

```
MemoryPortal (shell)
  ├── Renderer slot (currently: gaussian splat viewer OR parallax fallback)
  │   └── NEW: R3F Canvas with DisplacedMeshScene component
  ├── Narrative overlay (unchanged)
  ├── Soundtrack (unchanged)
  └── Chrome: back link, mute button, title (unchanged)
```

**Key integration point:** Replace the `containerRef` splat viewer div and the CSS parallax fallback with a single R3F `<Canvas>` containing the displaced mesh scene. The `capable` GPU check stays but now gates R3F (lighter requirement than splat rendering). The narrative card system, soundtrack, and chrome are unchanged.

**Future splat upgrade path:** The portal shell treats the 3D renderer as a swappable slot. When gaussian splat quality/tooling improves, the `<DisplacedMeshScene>` component can be replaced with a `<SplatScene>` component using the same capsule config data structure.

## Scene Configuration Schema

```javascript
// memoryScenes.js — enhanced for displaced mesh
{
  id: 'syros-sunset',
  title: 'Golden Hour in Syros',
  location: 'Syros, Greece',
  date: '2024-07-15',

  // Assets (pre-generated, committed to repo or Vercel Blob)
  photo: 'images/capsules/syros-sunset.jpg',
  depthMap: 'images/capsules/syros-sunset-depth.png',
  // Future: splatUrl for gaussian splat upgrade

  // Displacement
  displacementScale: 0.8,    // how far vertices push out
  displacementBias: -0.2,    // shift displacement center
  segments: 256,             // mesh resolution
  edgeFade: 0.08,            // UV-based edge fade width

  // Camera choreography
  camera: {
    initial: { x: 0, y: 0, z: 5 },
    keyframes: [
      { x: 0, y: 0.1, z: 3.5, duration: 8, ease: 'power1.inOut' },
      { x: 0.3, y: 0, z: 3.5, duration: 6, ease: 'sine.inOut' },
      { x: -0.2, y: -0.05, z: 4.0, duration: 10, ease: 'sine.inOut' },
    ],
    parallaxStrength: { x: 0.15, y: 0.08 },
    fov: 50,
  },

  // Atmosphere
  atmosphere: {
    particles: { count: 200, size: 0.02, speed: 0.3, color: '#ffe4b5' },
    bloom: { intensity: 0.5, luminanceThreshold: 0.9 },
    dof: { focusDistance: 0.5, focalLength: 0.05, bokehScale: 3 },
    vignette: { offset: 0.3, darkness: 0.6 },
    ambientLight: 0.4,
    directionalLight: { intensity: 0.8, position: [2, 3, 4] },
  },

  // Narrative (existing format, unchanged)
  narrative: [
    { text: 'The Aegean holds its breath at golden hour.', delay: 2000 },
    { text: 'Three months here changed everything.', delay: 6000 },
  ],

  // Soundtrack (existing format, unchanged)
  soundtrack: 'audio/syros-ambient.mp3',
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **three-custom-shader-material** (extend MeshStandardMaterial) | Raw `THREE.ShaderMaterial` | If you need absolute control over every rendering pass and don't need PBR lighting. CSM is better because it preserves Three.js lighting, fog, shadows, and tone mapping while injecting custom vertex/fragment code. |
| **three-custom-shader-material** | `MeshStandardMaterial.displacementMap` (built-in) | Built-in `displacementMap` works but lacks edge-fade fragment shader, custom animation uniforms, and fine control over displacement sampling. CSM adds these while keeping the MeshStandard base. If the edge-fade is not needed, built-in displacement is zero-dependency. |
| **Offline depth estimation** (Hugging Face Spaces) | `@huggingface/transformers` in-browser | If user wants real-time "upload any photo" UX. Browser model is ~99MB, 2-5s inference. Adds complexity. For v2.1 manual workflow, offline is correct. |
| **Depth Anything V2** | **MiDaS v3.1** | MiDaS is older but well-established. Depth Anything V2 produces finer details (trained on synthetic + 62M real images). MiDaS if you need TensorFlow.js browser inference (mature TFJS port exists). |
| **Depth Anything V2** | **Depth Pro** (Apple) | Depth Pro produces metric depth (absolute distances). Useful if you need real-world scale. For artistic displacement, relative depth (Depth Anything V2) is sufficient and more accessible. |
| **GSAP timeline for camera** | `@react-three/drei` CameraControls | CameraControls is for interactive user-driven camera. Memory capsules need **scripted** camera paths with no user control (constrained cinematic). GSAP timeline is the right tool for authored keyframes. |
| **GSAP timeline for camera** | Theatre.js | Theatre.js provides a visual timeline editor for camera animation. More powerful but heavyweight (adds ~200KB). Overkill for simple dolly/drift. Consider if camera choreography becomes complex (many capsules with unique paths). |
| **drei Sparkles** for particles | Custom instanced particle system | Custom particles give full control (gravity, wind, turbulence). drei Sparkles covers 90% of atmospheric dust/mote needs with zero code. Build custom only if specific physics needed. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **OrbitControls in capsule scene** | User should NOT freely orbit the displaced mesh. It's a flat plane -- side views reveal the illusion. Camera must be constrained to frontal arc. | Scripted GSAP timeline + mouse parallax offset (constrained to ~15% range) |
| **`@huggingface/transformers` at runtime** (for v2.1) | 99MB model download, 2-5s inference, complex web worker setup. Over-engineered for manual workflow with 1 flagship scene. | Offline depth estimation via Hugging Face Spaces (free, instant) |
| **`@mkkellogg/gaussian-splats-3d`** (for capsules) | Current Memory Portal uses this but it requires captured .splat files (not available for arbitrary photos). Splat rendering also has SharedArrayBuffer/COOP header issues. | Displaced mesh from photo + depth map. Keep splat library for future true-3D captured scenes. |
| **Separate WebGL context** for capsule | Memory Portal currently creates a standalone WebGL context (gaussian splat viewer). Adding another WebGL context alongside R3F's Canvas causes context-limit crashes. | Use a single R3F `<Canvas>` for the capsule scene. Lazy-load it (existing pattern). |
| **CSS parallax as primary renderer** | Current fallback uses CSS transforms for parallax (`transform: translate(${px}px, ${py}px)`). Looks flat compared to displaced mesh. | R3F displaced mesh is the primary renderer. CSS parallax remains as a degraded fallback for very low-end devices. |
| **Theatre.js** | Visual timeline editor adds ~200KB bundle. Dramatic overkill for simple dolly+drift camera paths definable in config objects. | GSAP timeline (already installed, 25KB, proven in codebase) |
| **react-spring for camera** | Competing animation library. Project already uses GSAP and Framer Motion. Adding a third animation system creates inconsistency and bundle bloat. | GSAP for 3D camera/timeline, Framer Motion for React UI transitions (existing pattern) |

## Stack Patterns by Variant

**If photo has strong foreground/background separation (portrait, landscape with subject):**
- Higher `displacementScale` (0.8-1.2) for dramatic depth
- Tighter DOF (`focalLength: 0.05, bokehScale: 4`) to blur background
- Camera dolly in toward subject face/center

**If photo is a wide scene (panorama, cityscape, nature):**
- Lower `displacementScale` (0.3-0.5) for subtle parallax
- Wide DOF or no DOF (everything in focus)
- Camera drift side-to-side (emphasize width)
- Higher segment count (256+) for fine terrain detail

**If mobile / low-end GPU:**
- Reduce segments to 128x128
- Disable Bloom and DOF postprocessing
- Reduce particle count to 50
- Simpler camera path (less keyframes)
- Detection: existing `canRenderSplat()` in `gpuCapability.js` can be adapted (check WebGL2 + texture size)

**If upgrading to gaussian splat later:**
- Scene config gains `splatUrl` field
- Renderer component swaps from `<DisplacedMeshScene>` to `<SplatScene>`
- Camera, narrative, soundtrack, atmosphere config remain identical
- Portal shell is unchanged

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| **three-custom-shader-material@6.4.0** | three >=0.159 (have 0.183.1), @react-three/fiber >=8 (have 9.5.0), react >=18 (have 19.2.0) | All peer deps satisfied. Tested and compatible. Bump mapping removed in 6.4.0 (not needed here). |
| **@react-three/postprocessing@3.0.4** | three 0.183.1, @react-three/fiber 9.5.0 | Already installed and proven in ConstellationCanvas. DepthOfField + Vignette + Bloom all work. |
| **gsap@3.14.2** | Any (no peer deps) | Already installed. Timeline API stable. Works inside R3F useEffect for camera choreography. |
| **maath@0.10.8** | @react-three/fiber 9.x | Already installed. easing.damp3 for camera smoothing in useFrame. |
| **drei@10.7.7** | three 0.183.1, @react-three/fiber 9.5.0 | Already installed. Sparkles, Float, useTexture all available. |

## Depth Map Asset Workflow

```
1. Select photo for capsule
   └── High-res preferred (2048px+), good foreground/background separation

2. Generate depth map
   ├── Option A: Hugging Face Space (https://huggingface.co/spaces/depth-anything/Depth-Anything-V2)
   │   └── Upload photo → download depth PNG (free, instant)
   ├── Option B: Replicate API (https://replicate.com) — depth-anything-v2
   │   └── API call → download depth PNG ($0.0023/run)
   └── Option C: Local Python script
       └── pip install transformers torch → run inference → save PNG

3. Validate + prepare
   ├── Ensure depth map matches photo dimensions exactly
   ├── Depth map format: grayscale PNG (white=close, black=far)
   ├── Optional: adjust contrast/levels in image editor for artistic control
   └── Run: node scripts/validate-capsule-assets.js syros-sunset

4. Configure scene
   └── Add entry to memoryScenes.js with displacement, camera, atmosphere settings

5. Place assets
   ├── public/images/capsules/{id}.jpg (photo)
   ├── public/images/capsules/{id}-depth.png (depth map)
   └── public/audio/{id}.mp3 (soundtrack, optional)

6. Test + tune
   └── Use lil-gui editor (like GlobeEditor) to adjust displacement, camera, effects in real-time
```

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **FPS (desktop)** | 60fps stable | Single displaced mesh (1 draw call) + particles (<5 draw calls) + postprocessing. Well under budget. |
| **FPS (mobile)** | 30fps acceptable | Reduce segments to 128, disable DOF+Bloom, fewer particles. |
| **Time to render** | <2s after Canvas mount | useTexture preloads photo+depth in parallel. Geometry creation is instant. |
| **Asset size per capsule** | <3MB total | Photo JPEG ~1-2MB, depth PNG ~200-500KB, soundtrack MP3 ~1MB. |
| **Bundle size increase** | ~15KB gzipped | three-custom-shader-material is the only new dependency. Lightweight wrapper. |

## Sources

### Depth Estimation
- [Depth Anything V2 (GitHub)](https://github.com/DepthAnything/Depth-Anything-V2) -- NeurIPS 2024, state-of-the-art monocular depth (HIGH confidence)
- [Depth Anything V2 Hugging Face Space](https://huggingface.co/spaces/depth-anything/Depth-Anything-V2) -- free online depth estimation (HIGH confidence)
- [onnx-community/depth-anything-v2-small](https://huggingface.co/onnx-community/depth-anything-v2-small) -- 99MB ONNX model for browser inference (MEDIUM confidence, not recommended for v2.1)
- [Depth Anything V3 (ByteDance)](https://github.com/ByteDance-Seed/Depth-Anything-3) -- next-gen model, ICLR 2026 (MEDIUM confidence, emerging)
- [MiDaS (GitHub)](https://github.com/isl-org/MiDaS) -- established monocular depth, TensorFlow.js browser port available (HIGH confidence)
- [Replicate depth-pro](https://replicate.com/ibrahimpenekli/depth-pro) -- Apple Depth Pro on Replicate API (MEDIUM confidence)

### Displaced Mesh Rendering
- [Three.js MeshStandardMaterial.displacementMap](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.displacementMap) -- official Three.js docs (HIGH confidence)
- [Three.js Displacement Map Tutorial](https://redstapler.co/three-js-displacement-map-from-single-image-tutorial/) -- practical implementation guide (HIGH confidence)
- [Displacement Map Segments Tutorial](https://sbcode.net/threejs/displacmentmap/) -- segment count guidance (HIGH confidence)
- [three-custom-shader-material (GitHub)](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) -- CSM v6.4.0, extends standard materials with GLSL (HIGH confidence)
- [three-custom-shader-material (npm)](https://www.npmjs.com/package/three-custom-shader-material) -- peer deps: three >=0.159, react >=18, r3f >=8 (HIGH confidence)
- [Three.js Forum: 3D from image parallax](https://discourse.threejs.org/t/3d-from-image-parallax-website/83291) -- community examples (MEDIUM confidence)

### Camera & Animation
- [R3F Basic Animations](https://docs.pmnd.rs/react-three-fiber/tutorials/basic-animations) -- useFrame patterns (HIGH confidence)
- [Camera Animation in R3F (Medium)](https://medium.com/@zmommaerts/animate-a-camera-in-react-three-fiber-7398326dad5d) -- GSAP + useFrame pattern (MEDIUM confidence)
- [maath (GitHub)](https://github.com/pmndrs/maath) -- easing.damp3 for frame-rate-independent smoothing (HIGH confidence)
- [Theatre.js + R3F (Codrops)](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/) -- alternative camera animation approach (MEDIUM confidence)

### Postprocessing & Atmosphere
- [react-postprocessing DepthOfField](https://react-postprocessing.docs.pmnd.rs/effects/depth-of-field) -- bokeh DOF documentation (HIGH confidence)
- [react-postprocessing Bloom](https://react-postprocessing.docs.pmnd.rs/effects/bloom) -- selective bloom documentation (HIGH confidence)
- [react-postprocessing (GitHub)](https://github.com/pmndrs/react-postprocessing) -- v3.0.4 (HIGH confidence)

### Transformers.js (future reference)
- [@huggingface/transformers (npm)](https://www.npmjs.com/package/@huggingface/transformers) -- v3.8.1 stable, v4 preview (HIGH confidence)
- [Transformers.js v4 Preview](https://huggingface.co/blog/transformersjs-v4) -- WebGPU runtime, March 2025 (MEDIUM confidence)
- [Transformers.js depth estimation issue #857](https://github.com/huggingface/transformers.js/issues/857) -- depth-anything-v2 browser support status (MEDIUM confidence)

---
*Stack research for: JAROWE Memory Capsules -- single-photo depth estimation, displaced mesh 3D scenes, cinematic camera, atmospheric portal UX*
*Researched: 2026-03-23*
