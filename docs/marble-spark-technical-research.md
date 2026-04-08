# Marble (World Labs) & Spark: Technical Deep-Dive

**Researched:** 2026-03-27
**Confidence:** HIGH (primary sources: official docs, API spec, HN technical discussion, Spark source)

---

## 1. Marble's Generation Pipeline

### What World Labs Discloses

World Labs has **not published** a technical paper or disclosed their model architecture. Everything below about the internal pipeline is inferred from API behavior, output characteristics, community analysis, and adjacent research.

### Inferred Architecture

**Best hypothesis from community analysis and output characteristics:**

Marble is most likely a **multi-stage pipeline**, not a single end-to-end model:

1. **Panorama Generation Stage**: Input image/text/video is processed by a large generative model (likely diffusion-based) that produces a 360-degree equirectangular panorama. Evidence: the API returns `assets.imagery.pano_url` as one of its outputs, and panorama input bypasses this stage (cheaper: 1,500 credits vs 1,580 for standard images).

2. **Multi-View Synthesis Stage**: The panorama is sampled into multiple consistent views. This is likely where the "spatial intelligence" happens -- maintaining 3D consistency across viewpoints.

3. **3D Gaussian Reconstruction Stage**: The multi-view images are reconstructed into a 3D Gaussian splat scene. The output is a standard 3DGS representation (positions, scales, rotations, colors, spherical harmonics).

4. **Refinement/Upsampling**: The raw reconstruction is refined, densified, and cleaned. Output tiers (100K, 500K, 2M splats) suggest progressive downsampling from a high-density internal representation.

**What Marble is NOT:**
- NOT a real-time generative world model (unlike Google Genie 3 which generates frame-by-frame)
- NOT a NeRF -- output is explicit 3DGS, not an implicit neural representation
- NOT a single-shot model -- generation takes ~5 minutes (Marble 0.1-plus) or ~30-45s (Marble 0.1-mini)
- Hacker News technical consensus: "more of a glorified image generator" for "multiview stereo 360 panoramas" rather than a true world model with dynamics

### Input Modalities

| Input Type | Credits (Plus) | Credits (Mini) | Notes |
|-----------|---------------|---------------|-------|
| Text prompt | 1,580 | 230 | Generates world from description |
| Single image | 1,580 | 230 | Most common use case |
| Panorama | 1,500 | 150 | Cheapest -- skips pano generation stage |
| Multi-image (up to 4+text, 8 without) | 1,600 | 250 | Directional azimuth per image |
| Video (max 100MB, 30s) | 1,600 | 250 | Extracts spatial info from motion |

**File limits:** Images max 20MB, 1024px long side recommended. Panoramas 2:1 aspect, 2560px width optimal. Video max 100MB.

### Output Assets

The API returns a World object containing:

```
assets.splats.spz_urls: {
  "100k":     "https://...",    // ~1-2MB SPZ, lightweight web preview
  "500k":     "https://...",    // ~5-6MB SPZ, mobile/performance target
  "full_res": "https://...",    // 2M splats, ~18MB SPZ / ~180MB PLY
}
assets.mesh.collider_mesh_url    // GLB, 3-4MB, simplified physics geometry
assets.imagery.pano_url          // equirectangular panorama
assets.thumbnail_url             // preview image
assets.caption                   // AI-generated description
```

**High-quality mesh export** is available separately:
- ~600K triangles with texture maps OR ~1M triangles with vertex colors
- Takes up to 1 hour to generate (background processing)
- 100-200MB GLB file

### Generation Times

| Operation | Time |
|-----------|------|
| Marble 0.1-plus (full quality) | ~5 minutes |
| Marble 0.1-mini (draft) | ~30-45 seconds |
| World expansion | ~5 minutes |
| Panorama editing | ~20 seconds |
| High-quality mesh | ~1 hour |

### API Details

- **Base URL:** `https://api.worldlabs.ai/marble/v1`
- **Auth:** Header `WLT-Api-Key: YOUR_API_KEY`
- **Rate limit:** ~6 requests/minute
- **Pricing:** $1 USD = 1,250 credits (minimum $5 purchase)
- **Platform:** platform.worldlabs.ai

**Generate endpoint:** `POST /marble/v1/worlds:generate`
```json
{
  "display_name": "My World",
  "model": "Marble 0.1-plus",
  "world_prompt": {
    "type": "image",
    "image_prompt": {
      "source": "uri",
      "uri": "https://example.com/photo.jpg"
    },
    "text_prompt": "Optional style/description override"
  },
  "seed": 42
}
```

**Poll status:** `GET /marble/v1/operations/{operation_id}`
**Get world:** `GET /marble/v1/worlds/{world_id}`
**List worlds:** `POST /marble/v1/worlds:list`

**Local file upload workflow:**
1. `POST /marble/v1/media-assets:prepare_upload` -> get signed URL
2. `PUT` file to signed URL
3. Use returned `media_asset_id` in generation request

### Chisel Feature

Chisel decouples **structure** from **style**:

1. **Wall Tool (X):** Click-drag to define wall perimeters, adjust height, create doorways
2. **Extrude Tool (Z):** Extend surfaces inward/outward for depth/volume
3. **Import:** Upload GLB or FBX 3D models as layout primitives
4. **Panorama Camera:** Position viewpoint for generation
5. **Text prompt:** Describes desired aesthetic (e.g., "modern kitchen")
6. **Generate:** System produces detailed geometry matching both layout and prompt

Same coarse layout + different prompts = visually different worlds with identical spatial structure.

### Expand & Compose

**Expand:** Select a region of a generated world; Marble generates new content to fill it. Fixes artifact regions, adds detail to sparse areas (e.g., back of tables, far corners).

**Compose:** Stitch multiple independently-generated worlds into larger environments. Full user control over positioning and layout.

### Known Limitations

- Quality degrades farther from original viewpoint ("the more you move away from the original image, the less detailed objects become")
- **Dolly zoom artifact:** "things in the distance tend to stay in the distance, even as the camera moves" (parallax feels wrong)
- Mesh quality significantly lower than splat quality ("weird hole-like defects")
- No scene decomposition (objects are not separated from environment)
- Works best with photorealistic interior scenes; struggles with exteriors and stylized content
- The "back of objects not visible in the source" problem persists -- Expand tool is the workaround

---

## 2. Spark Renderer Architecture

### Core Design (v0.1.x -- current stable)

Spark is a **WebGL2 3D Gaussian Splatting renderer** built as a Three.js extension.

**Rendering pipeline:**
1. **Scene Traversal:** SparkRenderer walks the THREE.js scene graph, collecting all SplatMesh instances
2. **GPU Readback:** SparkViewpoint reads splat distances from GPU memory
3. **Bucket Sort:** Background WebWorker runs efficient bucket sort on distances
4. **Instanced Draw:** Single instanced geometry draw call renders all splats back-to-front

**Key constraint:** Sort order lags render by at least one frame (imperceptible in practice).

**Memory format:** PackedSplats stores splats in **16 bytes/splat** cache-efficient encoding.

### SplatMesh API

```javascript
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';

// Load from file
const mesh = new SplatMesh({ url: '/scene.spz' });
await mesh.initialized;
scene.add(mesh);

// Procedural creation
const mesh = new SplatMesh({
  constructSplats: (splats) => {
    for (let i = 0; i < count; i++) {
      splats.pushSplat(center, scales, quaternion, opacity, color);
    }
  }
});
```

**Key properties:**
- `recolor: THREE.Color` -- tint multiplier
- `opacity: number` -- global opacity
- `maxSh: number` -- spherical harmonics level (0-3)
- `skinning: SplatSkinning` -- dual-quaternion skeletal animation
- `objectModifier / worldModifier` -- custom Dyno modifier chains
- `edits: SplatEdit[]` -- RGBA-XYZ SDF edit pipeline

**Supported formats:** .ply, .splat, .ksplat, .spz (all via constructor `url` parameter)

### SparkRenderer Configuration

```javascript
const spark = new SparkRenderer({
  renderer: threeWebGLRenderer,  // IMPORTANT: antialias: false for performance
  maxStdDev: Math.sqrt(8),       // Gaussian extent (sqrt(5)-sqrt(9) range for perf tuning)
  minPixelRadius: 0.0,
  maxPixelRadius: 512.0,
  minAlpha: 0.5/255.0,           // Alpha cutoff
  enable2DGS: false,             // 2D Gaussian mode
  focalDistance: 0.0,            // DOF distance
  apertureAngle: 0.0,           // DOF aperture (radians)
});
scene.add(spark);
```

### Dyno Shader Graph System

Dynos are composable GPU computation blocks (JavaScript -> GLSL compilation):

```javascript
// Custom modifier: per-splat color shift based on time
class ColorPulse extends Dyno {
  constructor(gsplat, time) {
    super({
      inTypes: { gsplat: Gsplat, time: 'float' },
      outTypes: { gsplat: Gsplat },
      inputs: { gsplat, time },
      statements: [
        `${outputs.gsplat} = ${inputs.gsplat};`,
        `${outputs.gsplat}.rgba.r += sin(${inputs.time}) * 0.1;`
      ]
    });
  }
}
```

**Pipeline injection points:**
- `SplatMesh.objectModifier` -- object-space transforms
- `SplatMesh.worldModifier` -- world-space transforms
- `SplatGenerator` subclass -- full procedural generation

### Procedural Splat Generation

Built-in constructors:
- `constructGrid({ extents, stepSize, pointRadius })`
- `textSplats({ text, font, fontSize, color, dotRadius })`
- `imageSplats({ url, dotRadius, subXY, forEachSplat })`
- `constructSpherePoints({ origin, radius, maxDepth })`
- Snow/particle generators with deterministic trajectories

### R3F Integration

Official example at `github.com/sparkjsdev/spark-react-r3f`:

```jsx
import { extend } from '@react-three/fiber';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';

extend({ SplatMesh, SparkRenderer });

function Scene() {
  return (
    <Canvas>
      <sparkRenderer />
      <splatMesh url="/scene.spz" />
      <CameraControls />
    </Canvas>
  );
}
```

**WASM caveat:** Webpack users need `url: false` in JS parser config for WASM URL resolution.

### Performance Characteristics

- Targets 98%+ WebGL2 browser support
- Fast on low-powered mobile devices
- `antialias: false` critical (WebGL AA degrades splat rendering AND kills performance)
- 16 bytes/splat packed format
- Background worker sorting (non-blocking)

### Current Version & Compatibility

- **Stable:** v0.1.10
- **Three.js:** requires 0.178.0+ (project has 0.183.1 -- compatible)
- **License:** MIT
- **Install:** `npm install @sparkjsdev/spark`

---

## 3. Spark 2.0 Preview (Unreleased -- Developer Preview)

### Level-of-Detail System

The biggest architectural change in Spark 2.0 is hierarchical LOD rendering with a **fixed splat rendering budget**.

**LoD Splat Tree:**
- Input splats are merged into a hierarchy via recursive voxel grids
- Uses configurable non-integer base (default 1.5, not 2.0) for smoother transitions
- Each node stores: center, feature size, child count/index
- Tree is ~30% larger than original SPZ file

**Rendering budget:**
- Desktop default: **1.5M splats**
- Mobile default: **500K splats**
- Configurable via `lodSplatCount` or `lodSplatScale`
- Budget distributes globally across all SplatMesh instances via unified priority queue
- O(N log N) traversal where N = rendered splats (independent of total scene size)

**LOD slice computation:**
- Priority queue selects "frontier" through the tree
- Metric: `pixel_scale` from object-space size + view transform + frustum + foveation
- Supports foveation parameters: `outside_foveate`, `behind_foveate`

### Extended Splat Encoding (32 bytes/splat)

| Component | Bytes | Encoding |
|-----------|-------|----------|
| center.xyz | 12 | float32 (full precision) |
| alpha | 2 | float16 |
| RGB | 6 | float16 per channel |
| log(scales) | 6 | float16 per axis |
| orientation | 4 | 10+10+12-bit octahedral+angle |

Eliminates float16 quantization artifacts present in v1.x for large scenes.

### .RAD File Format (New)

- Extensible format storing precomputed LoD splat trees
- HTTP Range request streaming: splats loaded coarsest-first
- Automatic view-dependent chunk prioritization
- Enables 100M+ splat scenes on mobile via streaming

### Streaming Architecture

1. File URL sent to WebWorker
2. Chunks downloaded in background via ReadableStream
3. Rust->WASM decoder progressively decodes bytes to PackedSplats
4. Coarsest splats load first; detail prioritized by view position
5. Dedicated workers: `lodWorker` (tree traversal), `sortWorker` (draw order)

### New Features

- Multiple independent SparkRenderer instances with separate viewpoints
- LoD-on-load: `new SplatMesh({ url, lod: true })`
- On-demand: `mesh.createLodSplats()`
- CLI preprocessing: `build-lod` tool
- Covariance splats (non-uniform scaling)
- Experimental linear blend skinning
- Experimental real-time portals
- SparkXr wrapper for AR/VR with hand tracking
- Shared LRU "splat page table" for GPU memory management

### Opacity Encoding for Merged Splats

Extended range 0-5 (vs standard 0-1) to represent merged splat stacks:
```
D := sqrt(1 + e * ln(A))
D <= 1.0: standard Gaussian profile
D >  1.0: shifted Gaussian with steepened slope
```

---

## 4. SPZ File Format

### Specification (Version 4)

SPZ is Niantic's open-source (MIT) compressed Gaussian splat format. ~10x smaller than PLY with minimal visual loss (47.3 dB PSNR -- visually indistinguishable).

**Header (16 bytes, little-endian):**
```c
struct PackedGaussiansHeader {
  uint32_t magic;           // 0x5053474E
  uint32_t version;         // 1-4
  uint32_t numPoints;       // Gaussian count
  uint8_t  shDegree;        // 0-4
  uint8_t  fractionalBits;  // Fixed-point precision
  uint8_t  flags;           // 0x1=antialiasing, 0x2=vendor extensions
  uint8_t  reserved;        // 0
};
```

**Data encoding (attribute-major layout, gzipped):**

| Attribute | Encoding |
|-----------|----------|
| Positions | 24-bit fixed-point signed integer per axis |
| Scales | 8-bit log-encoded per axis |
| Rotations (v3-4) | Smallest-three: 10-bit signed per component + 2-bit index |
| Rotations (v2) | 8-bit signed per x/y/z |
| Alphas | 8-bit unsigned |
| Colors | 8-bit unsigned per R/G/B |
| Spherical Harmonics | 8-bit signed per coefficient |

**SH coefficient counts by degree:** 0 (deg 0), 9 (deg 1), 24 (deg 2), 45 (deg 3), 72 (deg 4)

**Quantization (PackOptions):**
- `sh1Bits`: 5-bit default for degree 1 (range 1-8)
- `shRestBits`: 4-bit default for degrees 2+ (range 1-8)
- Reduces entropy for better gzip compression

**Coordinate system:** RUB (OpenGL/Three.js). Conversion tools support RDF (PLY), LUF (GLB), RUF (Unity).

### Format Comparison

| Format | 500K scene | Compression | Progressive | SH Support |
|--------|-----------|-------------|-------------|------------|
| PLY | 118 MB | None | No | Full |
| SPLAT | 16.2 MB | 7.3x | No | Limited |
| SPZ | 11.8 MB | 10x | No | Full (deg 0-4) |
| KSPLAT | 11.4 MB | 10.4x | Yes (first frame 0.3s) | Limited |

**Web load times (M1 MacBook, Chrome, cold cache):**
- PLY: 8.2s
- SPLAT: 1.4s
- KSPLAT: 0.9s (progressive -- coarse at 0.3s)
- SPZ: 1.1s

**iPhone 15 Pro (Safari):**
- PLY: fails above 200MB (memory limit)
- SPLAT: 2.1s
- KSPLAT: 1.3s
- SPZ: 1.5s

### Standardization

Khronos Group added two glTF extensions (2025):
- `KHR_gaussian_splatting` -- embedding 3DGS in glTF
- `KHR_gaussian_splatting_compression_spz` -- SPZ as official compressed encoding

### Conversion Tools

- **Niantic spz repo:** C++ (native), Python (nanobind), TypeScript/WASM
- **PlayCanvas splat-transform CLI:** `npm install @playcanvas/splat-transform` -- PLY <-> SPZ
- **3DGS Converter:** Python CLI supporting N-to-N conversion (PLY, KSPLAT, SOG, SPZ, SPLAT, etc.)
- **Online:** spz-to-ply.netlify.app

---

## 5. Camera Controls & Navigation in Marble

### How Marble Handles Navigation

In the web viewer (marble.worldlabs.ai), navigation is:
- **Free-roam** within the generated world volume
- Mouse/touch controlled (orbit + pan + zoom)
- Quality is best near the original camera viewpoint
- Degrades progressively as you move farther from the source

### How They Prevent Artifacts

1. **Gaussian splat density:** 2M splats at full resolution provides dense coverage
2. **Expand tool:** Users can regenerate specific regions that show artifacts
3. **Compose tool:** Stitch multiple worlds for larger, consistently-detailed spaces
4. **Camera orbit limits:** SPZ format supports vendor extensions for orbit constraints (documented in the SPZ spec under vendor extension flags)
5. **Progressive quality:** 100K/500K/2M tiers let consumers pick the right density for their use case

### The "Backside" Problem

Marble generates plausible content for unseen regions, but quality is noticeably lower:
- "The back of a table or the far corner of a room is not as crisp as the room's center"
- The Expand tool is the primary mitigation
- Multi-image input (up to 8 images from different angles) significantly reduces this

### View-Dependent Effects

Splats inherently support view-dependent appearance via spherical harmonics (up to degree 3 in Spark). This provides:
- Specular highlights that shift with viewpoint
- Translucency effects
- View-dependent color variation

---

## 6. Quality Tricks

### How Marble Makes Single-Image Worlds Look Good

1. **High splat density:** 2M splats is very dense -- roughly equivalent to a 1414x1414 point cloud, each point with orientation, scale, color, and SH
2. **Panorama intermediate:** Generating a full 360 equirectangular before reconstruction ensures consistent lighting and style
3. **Multi-view consistency:** Whatever internal model they use for view synthesis maintains strong 3D consistency
4. **Spherical harmonics:** SH0-SH3 encode view-dependent appearance (specularity, subsurface)
5. **Style transfer:** The text prompt can override/enhance the visual style beyond what the source image shows

### What Spark Adds at Render Time

- **DOF:** `focalDistance` and `apertureAngle` parameters on SparkRenderer
- **Bloom/Glow:** Composable with Three.js postprocessing (EffectComposer)
- **Anti-aliasing:** `preBlurAmount` and `blurAmount` parameters smooth rendering
- **Mip-splatting:** `maxStdDev` controls Gaussian extent for alias reduction
- **2DGS mode:** `enable2DGS` for surface-aligned rendering
- **Env maps:** `renderEnvMap()` generates IBL from splat scene

---

## 7. What We Can Replicate with Open Tools

### Immediately Available (installed or installable)

| Capability | Tool | Status in jarowe |
|-----------|------|-----------------|
| Splat rendering | `@mkkellogg/gaussian-splats-3d` | Installed (v0.4.7) |
| Splat rendering (better) | `@sparkjsdev/spark` | Not installed, easy to add |
| PLY/SPZ loading | Both renderers | Available |
| Single-image 3DGS | Apple SHARP | Installed locally (`.venv-sharp`) |
| Single-image world model | WorldGen pipeline | In `_experiments/WorldGen` |
| Depth estimation | Various (MiDaS, Depth Anything) | Used in current pipeline |
| Inpainting (environment) | LaMa, FLUX | Used in current pipeline |
| PLY->SPZ conversion | `@playcanvas/splat-transform` | Referenced but not installed |
| Three.js postprocessing | `@react-three/postprocessing` | Installed |
| Procedural particles | THREE.Points + ShaderMaterial | Used (ParticleFieldRenderer) |

### Requires Marble API (proprietary)

| Capability | Why It's Hard to Replicate |
|-----------|---------------------------|
| Multi-view consistent panorama from single image | This is the core ML model -- not open-sourced |
| 2M splat dense world from single photo | End-to-end quality depends on their training data and model |
| Expand (region-specific regeneration) | Requires the same generative model |
| Chisel (layout -> world) | 3D-conditioned generation is cutting-edge research |
| ~5 minute turnaround | Optimized inference infrastructure |

### Best Open-Source Approximation Pipeline

```
Single Image
  |
  v
[1] Subject/Environment Separation (SAM2 / existing mask pipeline)
  |
  v
[2] Environment Inpainting (LaMa -> clean plate)
  |
  v
[3] Panorama Generation (FLUX pano fill / WorldGen / SD-XL outpainting)
  |
  v
[4] Multi-view Synthesis (Wonderland / VistaDream / camera-guided diffusion)
  |
  v
[5] 3DGS Reconstruction (SHARP for draft / gsplat / OpenSplat)
  |
  v
[6] Refinement (CompleteSplat for void filling / SuGaR for surface alignment)
  |
  v
[7] Compression (PLY -> SPZ via splat-transform)
  |
  v
[8] Rendering (Spark in browser)
```

**Current jarowe pipeline already implements steps 1-3 and 5.** The gaps are:
- Step 4: Multi-view synthesis (WorldGen is wired but blocked on FLUX weights)
- Step 6: Refinement (not implemented)
- Step 7: SPZ compression (tooling available, not integrated)
- Step 8: Spark rendering (not installed, using @mkkellogg instead)

---

## 8. Concrete Recommendations for jarowe

### Immediate Actions

1. **Install Spark:** `npm install @sparkjsdev/spark`
   - Replace `@mkkellogg/gaussian-splats-3d` in WorldMemoryRenderer
   - Spark has better performance, mobile support, Dyno system for particle effects, and is the standard renderer for Marble exports
   - Use the R3F integration pattern from `sparkjsdev/spark-react-r3f`
   - Requires `antialias: false` on the WebGLRenderer

2. **Install splat-transform:** `npm install @playcanvas/splat-transform`
   - Add PLY->SPZ conversion to `generate-memory-world.mjs` pipeline
   - SPZ is 10x smaller than PLY with no visual loss
   - Critical for mobile delivery (PLY fails above 200MB on iPhone)

3. **Use Marble API for hero scenes:**
   - At ~$1.26/world (Plus) or ~$0.18/world (Mini), it's cheap for curated memory worlds
   - Wire into existing `--generator marble` path in the pipeline
   - Download all three SPZ tiers (100K, 500K, full_res) for LOD fallback
   - Use 100K for mobile, 500K for desktop, 2M for "explore" mode

### Medium-Term

4. **Prepare for Spark 2.0:**
   - The LoD system with fixed rendering budget is exactly what memory worlds need
   - .RAD format with streaming would enable huge scenes on mobile
   - Keep an eye on v2.0.0 release (currently developer preview)
   - When it ships: pre-build LoD trees with `build-lod` CLI, serve .RAD files

5. **Hybrid pipeline: SHARP for draft, Marble for hero:**
   - SHARP (<1 second, local) for immediate preview/draft
   - Marble API (~5 min, cloud) for final hero quality
   - Both output PLY/SPZ, same renderer path

6. **Spark Dyno system for living particles:**
   - The Dyno shader graph can replace custom ShaderMaterial for particle effects
   - Procedural splats (`constructSplats`) can generate dream particles directly as splats
   - `imageSplats()` converts images to splat points -- could replace custom photo->particle sampling
   - `SplatSkinning` could animate subject splats with breath/sway

### What NOT to Build

- Do NOT try to replicate Marble's generative model -- it's a massive ML system with proprietary training
- Do NOT build a custom LOD system -- Spark 2.0 handles this
- Do NOT build a custom splat renderer -- both installed options are better than rolling your own
- Do NOT use .ply for web delivery -- always convert to .spz

---

## Sources

### World Labs / Marble
- [Marble App](https://marble.worldlabs.ai/)
- [Marble Documentation](https://docs.worldlabs.ai/)
- [Marble: A Multimodal World Model (blog)](https://www.worldlabs.ai/blog/marble-world-model)
- [Bigger and Better Worlds (blog)](https://www.worldlabs.ai/blog/bigger-better-worlds)
- [Announcing the World API (blog)](https://www.worldlabs.ai/blog/announcing-the-world-api)
- [Chisel Basics](https://docs.worldlabs.ai/marble/create/chisel-tools/chisel-basics)
- [Mesh Export](https://docs.worldlabs.ai/marble/export/mesh)
- [Marble Hacker News Discussion](https://news.ycombinator.com/item?id=45907541)
- [TechCrunch Launch Coverage](https://techcrunch.com/2025/11/12/fei-fei-lis-world-labs-speeds-up-the-world-model-race-with-marble-its-first-commercial-product/)
- [TechTalks Analysis](https://bdtechtalks.substack.com/p/what-to-know-about-world-labs-marble)
- [World API Skills Reference](https://playbooks.com/skills/cloudai-x/world-labs-skills/world-labs-api)

### Spark Renderer
- [Spark Home](https://sparkjs.dev/)
- [Getting Started](https://sparkjs.dev/docs/)
- [System Design](https://sparkjs.dev/docs/system-design/)
- [SplatMesh Reference](https://sparkjs.dev/docs/splat-mesh/)
- [SparkRenderer Reference](https://sparkjs.dev/docs/spark-renderer/)
- [Procedural Splats](https://sparkjs.dev/docs/procedural-splats/)
- [Dyno Overview](https://sparkjs.dev/docs/dyno-overview/)
- [Spark 2.0 LoD Deep Dive](https://sparkjs.dev/2.0.0-preview/docs/new-spark-renderer/)
- [Spark 2.0 New Features](https://sparkjs.dev/2.0.0-preview/docs/new-features-2.0/)
- [Spark GitHub](https://github.com/sparkjsdev/spark)
- [Spark R3F Example](https://github.com/sparkjsdev/spark-react-r3f)

### SPZ Format
- [Niantic SPZ GitHub](https://github.com/nianticlabs/spz)
- [SPZ Format Page](https://scaniverse.com/spz)
- [PlayCanvas splat-transform](https://github.com/playcanvas/splat-transform)
- [3DGS Format Converter](https://github.com/francescofugazzi/3dgsconverter)
- [Khronos glTF 3DGS Extensions](https://www.ogc.org/blog-article/ogc-khronos-and-geospatial-leaders-add-3d-gaussian-splats-to-the-gltf-asset-standard/)

### Open-Source Alternatives
- [Apple SHARP](https://www.uploadvr.com/apple-sharp-open-source-on-device-gaussian-splatting/)
- [OpenSplat](https://github.com/pierotofy/OpenSplat)
- [SuperSplat Editor](https://superspl.at/)
- [WorldGen](https://github.com/ZiYang-xie/WorldGen)
- [Splatter-360](https://3d-aigc.github.io/Splatter-360/)
- [PanSplat (CVPR 2025)](https://github.com/chengzhag/PanSplat)

### Research Referenced in Project
- [CompleteSplat](https://nianticspatial.github.io/completesplat/)
- [HumanSplat](https://humansplat.github.io/)
- [Diorama](https://3dlg-hcvc.github.io/diorama/)
- [Echo (Spaitial)](https://www.spaitial.ai/blog/echo-release)
- [Wonderland](https://snap-research.github.io/wonderland/)
- [Mip-Splatting](https://github.com/autonomousvision/mip-splatting)
- [SuGaR](https://github.com/Anttwo/SuGaR)
