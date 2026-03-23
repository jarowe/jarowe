# Architecture Research

**Domain:** Single-photo 3D memory capsule integration into existing Vite 7 + React 19 + R3F SPA
**Researched:** 2026-03-23
**Confidence:** HIGH

## System Overview

Memory Capsules transform a single photograph into an immersive 3D scene by displacing a mesh with a depth map, wrapping it in cinematic atmosphere (particles, bokeh, glow), narrative text overlays, and per-scene soundtrack. The system replaces the existing gaussian splat-based MemoryPortal with a renderer-agnostic shell designed for a mesh-first approach that can later upgrade to gaussian splats per-scene.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌────────────────────────────────────────────┐  │
│  │ Existing App │  │ Memory Capsule System                      │  │
│  │ (Home, Globe │  │                                            │  │
│  │  Constella-  │  │  ┌─────────────┐  ┌───────────────────┐   │  │
│  │  tion, etc.) │  │  │ CapsuleShell│  │  CapsuleScene     │   │  │
│  │              │  │  │ (route page)│→ │  (R3F Canvas)     │   │  │
│  └──────────────┘  │  └──────┬──────┘  │  ┌─────────────┐  │   │  │
│                    │         │         │  │DepthMesh    │  │   │  │
│                    │         │         │  │(displaced   │  │   │  │
│                    │         │         │  │ plane)      │  │   │  │
│                    │         │         │  ├─────────────┤  │   │  │
│                    │         │         │  │Atmosphere   │  │   │  │
│                    │         │         │  │(particles,  │  │   │  │
│                    │         │         │  │ bokeh, glow)│  │   │  │
│                    │         │         │  ├─────────────┤  │   │  │
│                    │         │         │  │CinemaCamera │  │   │  │
│                    │         │         │  │(choreography│  │   │  │
│                    │         │         │  │ controller) │  │   │  │
│                    │         │         │  └─────────────┘  │   │  │
│                    │  ┌──────┴──────┐  └───────────────────┘   │  │
│                    │  │NarrativeHUD │                           │  │
│                    │  │(text cards, │                           │  │
│                    │  │ mute, back) │                           │  │
│                    │  └─────────────┘                           │  │
│                    └────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Scene Registry (memoryScenes.js)                             │  │
│  │  Photo + depth map URLs, narrative, soundtrack, camera config  │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    ASSET LAYER (Static Files)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  public/memory/{scene-id}/                                    │  │
│  │    photo.jpg       — source photograph                        │  │
│  │    depth.png       — depth map (generated externally)         │  │
│  │    soundtrack.mp3  — scene audio (optional)                   │  │
│  │    preview.jpg     — OG/thumbnail (optional)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ (build-time or manual)
┌──────────────────────────────┴──────────────────────────────────────┐
│                  DEPTH ESTIMATION (External/Manual)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Option A: Local tool (Depth Anything V2, Marigold)                 │
│  Option B: API (Replicate, Hugging Face)                            │
│  Option C: Manual in-browser (future: Vercel Function)              │
│                                                                     │
│  Input: photo.jpg → Output: depth.png (grayscale 16-bit)           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **CapsuleShell** | Full-viewport route page: loads scene config, mounts R3F Canvas + HUD chrome, handles lifecycle | New page replacing `MemoryPortal.jsx` |
| **CapsuleScene** | R3F scene graph: depth mesh, atmosphere, camera choreography, postprocessing | New R3F component inside isolated `<Canvas>` |
| **DepthMesh** | Displaced plane geometry: loads photo texture + depth map, vertex displacement shader | New R3F component — core 3D technique |
| **CinemaCamera** | Constrained camera choreography: drift, dolly, parallax — NOT free OrbitControls | New R3F component using useFrame + refs |
| **AtmosphereVFX** | Floating particles, bokeh sprites, volumetric glow, dust motes | New R3F component(s) |
| **NarrativeHUD** | Timed text cards, mute button, back link — HTML overlay on top of Canvas | Extracted + enhanced from existing MemoryPortal chrome |
| **Scene Registry** | Scene configuration data: photo/depth URLs, camera paths, narrative, soundtrack | Extended `memoryScenes.js` |
| **Soundtrack** | Per-scene audio via Howler.js, fade in/out, mute toggle | Reuse existing pattern from MemoryPortal |

## Recommended Project Structure

```
src/
├── capsule/                        # Memory Capsule module (self-contained)
│   ├── CapsuleShell.jsx            # Route-level page (replaces MemoryPortal.jsx)
│   ├── CapsuleShell.css            # Full-viewport styles
│   ├── scene/
│   │   ├── CapsuleScene.jsx        # R3F Canvas wrapper + scene composition
│   │   ├── DepthMesh.jsx           # Displaced plane with photo + depth map
│   │   ├── CinemaCamera.jsx        # Choreographed camera controller
│   │   ├── AtmosphereParticles.jsx # Floating dust/bokeh/glow particles
│   │   └── depthShader.js          # GLSL vertex/fragment for depth displacement
│   ├── ui/
│   │   ├── NarrativeCards.jsx      # Timed text card overlay
│   │   ├── CapsuleChrome.jsx       # Back button, title, mute — shared layout
│   │   └── NarrativeCards.css      # Glass card styling
│   └── capsuleDefaults.js          # Default config values, tuning knobs
│
├── data/
│   └── memoryScenes.js             # MODIFIED — extended schema with depth fields
│
├── pages/
│   └── MemoryPortal.jsx            # REPLACED by capsule/CapsuleShell.jsx
│   └── MemoryPortal.css            # REMOVED (styles move to CapsuleShell.css)
│
├── utils/
│   └── gpuCapability.js            # MODIFIED — add canRenderDepthMesh() check
│
public/
├── memory/
│   └── {scene-id}/                 # Per-scene asset folder
│       ├── photo.jpg               # Source photograph
│       ├── depth.png               # Grayscale depth map
│       ├── soundtrack.mp3          # Optional per-scene audio
│       └── preview.jpg             # OG image / fallback thumbnail
```

### Structure Rationale

- **src/capsule/**: Self-contained module following the constellation module pattern (`src/constellation/`). Scene-level R3F components in `scene/`, HTML overlay in `ui/`, shared config in root. This isolation allows the module to evolve independently without touching existing code.
- **scene/ vs ui/ split**: R3F components (rendered inside Canvas) are strictly separated from DOM components (rendered as HTML siblings of Canvas). This is critical — React components cannot render HTML inside an R3F Canvas.
- **public/memory/{scene-id}/**: Per-scene folders keep assets organized. Scene ID in the folder name matches the route parameter (`/memory/:sceneId`). Assets are static files served by Vite/Vercel with no build processing needed.
- **Replaces MemoryPortal**: The existing MemoryPortal is a prototype with gaussian splat rendering. Memory Capsules supersede it with the depth-mesh approach. The route (`/memory/:sceneId`) stays the same.

## Architectural Patterns

### Pattern 1: Isolated R3F Canvas (Not Shared)

**What:** Each Memory Capsule mounts its own `<Canvas>` element, completely isolated from the globe's three.js renderer and the constellation's R3F Canvas.

**When to use:** When the 3D experience lives on a different route from other WebGL content. The globe (Home page) and constellation (/constellation) already have their own renderers.

**Trade-offs:**
- **Pro:** No WebGL context conflicts — the globe's renderer doesn't need to dispose before the capsule loads. No shared state bugs between scenes.
- **Pro:** The capsule can use R3F postprocessing (DepthOfField, Bloom, Vignette) independently.
- **Con:** Cannot share textures or geometries between the globe and capsule renderers (not needed — they're on different routes).

**Why not shared context:** The existing codebase already has this pattern — the globe uses react-globe.gl (its own THREE.js renderer), and the constellation uses a separate R3F `<Canvas>`. The Memory Portal prototype already delays 600ms on mount to let the globe's context release. An isolated Canvas per route is the proven safe pattern here.

**Example:**
```jsx
// src/capsule/scene/CapsuleScene.jsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';

export default function CapsuleScene({ scene }) {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: scene.cameraStart, fov: 50 }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('Capsule: WebGL context lost');
        });
      }}
    >
      <DepthMesh scene={scene} />
      <CinemaCamera choreography={scene.camera} />
      <AtmosphereParticles config={scene.atmosphere} />
      <EffectComposer>
        <DepthOfField focusDistance={0.02} focalLength={0.04} bokehScale={4} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
```

### Pattern 2: Depth-Displaced Plane Mesh

**What:** A subdivided `<planeGeometry>` with vertices displaced along the Z axis based on a grayscale depth map. The photo texture is applied as the diffuse color. The depth map drives vertex positions in the vertex shader.

**When to use:** When you have a single photo + depth map and want parallax 3D from a 2D image. This is the core technique that makes Memory Capsules work.

**Trade-offs:**
- **Pro:** Works on any WebGL2 device (no special extensions needed). Simple, well-understood.
- **Pro:** Cheap to render — a single mesh with two textures. Mobile-friendly.
- **Con:** Geometry is view-dependent — edges reveal stretching. Constrained camera (no full 360 rotation) is necessary.
- **Con:** Quality depends entirely on depth map accuracy.

**Example:**
```glsl
// depthShader.js — vertex shader
uniform sampler2D depthMap;
uniform float displacementScale;
uniform float displacementBias;

varying vec2 vUv;

void main() {
  vUv = uv;
  float depth = texture2D(depthMap, uv).r;
  vec3 displaced = position + normal * (depth * displacementScale + displacementBias);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

```jsx
// DepthMesh.jsx
function DepthMesh({ photoUrl, depthUrl, scale, segments }) {
  const [photoTex, depthTex] = useTexture([photoUrl, depthUrl]);

  return (
    <mesh>
      <planeGeometry args={[scale.x, scale.y, segments, segments]} />
      <shaderMaterial
        vertexShader={depthVertexShader}
        fragmentShader={depthFragmentShader}
        uniforms={{
          photoMap: { value: photoTex },
          depthMap: { value: depthTex },
          displacementScale: { value: 2.0 },
          displacementBias: { value: -1.0 },
        }}
      />
    </mesh>
  );
}
```

**Geometry subdivision budget:** 256x256 segments (65K vertices) is the sweet spot. Lower (128x128) for mobile. Higher (512x512) only if the image warrants it. This is configurable per scene via the registry.

### Pattern 3: Constrained Camera Choreography

**What:** The camera follows a scripted path (drift, slow dolly, gentle parallax) rather than free-roam OrbitControls. The visitor experiences a curated perspective, not a sandbox.

**When to use:** When the 3D content has view-dependent quality limits (depth-displaced meshes look wrong from extreme angles) and you want a cinematic feel over interactivity.

**Trade-offs:**
- **Pro:** Prevents revealing mesh-edge stretching from extreme angles. Maintains the cinematic atmosphere.
- **Pro:** Camera path can be choreographed to match narrative timing (text cards appear as camera reaches specific viewpoints).
- **Con:** Less interactive than free-roam. Users who want to explore may feel constrained.
- **Mitigation:** Allow subtle mouse/touch parallax within bounds — camera responds to input but within a tight constraint box.

**Example:**
```jsx
// CinemaCamera.jsx
function CinemaCamera({ choreography }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const mouseInfluence = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      mouseInfluence.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseInfluence.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const { path, parallaxStrength = 0.3, driftSpeed = 0.1 } = choreography;

    // Base position: slow drift along scripted path
    const baseX = Math.sin(t * driftSpeed) * path.amplitude.x;
    const baseY = Math.cos(t * driftSpeed * 0.7) * path.amplitude.y;
    const baseZ = path.startZ + Math.sin(t * driftSpeed * 0.3) * path.amplitude.z;

    // Mouse parallax offset (bounded)
    const mx = mouseInfluence.current.x * parallaxStrength;
    const my = mouseInfluence.current.y * parallaxStrength;

    camera.position.set(baseX + mx, baseY + my, baseZ);
    camera.lookAt(path.lookAt.x, path.lookAt.y, path.lookAt.z);
  });

  return null;
}
```

### Pattern 4: Renderer-Agnostic Shell (Mesh Now, Splat Later)

**What:** The CapsuleShell renders one of two scene implementations based on the scene's `renderer` field: `'depth-mesh'` (default) or `'splat'` (future). The shell provides the chrome (narrative, soundtrack, back button) regardless of which renderer is active.

**When to use:** When you want to ship depth-mesh capsules now but plan to add gaussian splat capsules later, potentially mixing both in the same scene registry.

**Trade-offs:**
- **Pro:** The upgrade path to splats requires zero changes to the shell, narrative system, or chrome. Just add a new scene entry with `renderer: 'splat'` and a `.spz` URL.
- **Pro:** The scene registry acts as a feature flag — scenes can be individually upgraded from mesh to splat without touching other scenes.
- **Con:** Slight abstraction cost (checking renderer type), but trivial.

**Example:**
```jsx
// CapsuleShell.jsx
const DepthMeshScene = lazy(() => import('./scene/CapsuleScene'));
const SplatScene = lazy(() => import('./scene/SplatScene')); // future

function CapsuleShell() {
  const { sceneId } = useParams();
  const scene = getSceneById(sceneId);

  const SceneComponent = scene.renderer === 'splat' ? SplatScene : DepthMeshScene;

  return (
    <div className="capsule-shell">
      <Suspense fallback={<CapsuleLoading />}>
        <SceneComponent scene={scene} />
      </Suspense>
      <NarrativeCards cards={scene.narrative} />
      <CapsuleChrome scene={scene} />
      <CapsuleSoundtrack src={scene.soundtrack} />
    </div>
  );
}
```

### Pattern 5: Existing Chrome Reuse

**What:** The narrative text cards, back button, mute toggle, and title overlay are extracted from the existing MemoryPortal and reused as standalone React components above the Canvas.

**When to use:** The existing MemoryPortal already has well-styled glass narrative cards, a back link pill, and a mute button. These work identically regardless of the 3D renderer underneath.

**Trade-offs:**
- **Pro:** No design rework for chrome elements. Proven CSS already responsive.
- **Pro:** Chrome renders as sibling HTML elements positioned `absolute` over the Canvas — stays outside the R3F tree.
- **Con:** Minor refactoring to extract from the monolithic MemoryPortal.jsx.

## Data Flow

### Scene Loading Flow

```
User navigates to /memory/greece-sunset
    |
[React Router] -> CapsuleShell mounts
    |
[getSceneById('greece-sunset')] -> Scene config from memoryScenes.js
    |
    +-> [CapsuleScene (R3F Canvas)]
    |       |
    |       +-> useTexture([photo.jpg, depth.png]) -> TextureLoader
    |       |       |
    |       |       +-> DepthMesh: creates PlaneGeometry + ShaderMaterial
    |       |               vertex shader displaces by depth map
    |       |
    |       +-> CinemaCamera: reads choreography config, starts drift
    |       |
    |       +-> AtmosphereParticles: spawns bokeh/dust based on config
    |       |
    |       +-> EffectComposer: DepthOfField + Vignette postprocessing
    |
    +-> [NarrativeCards] -> setTimeout per card.delay -> fade in cards
    |
    +-> [CapsuleSoundtrack] -> Howl(src) -> play() -> fade to 0.6 on unmute
    |
    +-> [CapsuleChrome] -> back link, title, mute toggle
```

### Depth Estimation Flow (Manual / Build-Time)

```
Source photo (photo.jpg)
    |
[External tool: Depth Anything V2 / Marigold / Replicate API]
    |
Output: depth.png (grayscale, 16-bit recommended)
    |
[Manual placement] -> public/memory/{scene-id}/depth.png
    |
[Update memoryScenes.js] -> Add scene entry with paths + config
    |
[Commit + deploy] -> Scene available at /memory/{scene-id}
```

### Future: Splat Upgrade Flow (Per-Scene)

```
Scene entry in memoryScenes.js:
  { renderer: 'depth-mesh', ... }  ->  { renderer: 'splat', splatUrl: '...spz', ... }

Shell behavior change:
  CapsuleShell lazy-loads SplatScene instead of CapsuleScene (DepthMesh)
  Chrome (narrative, soundtrack, back) stays identical
  Camera choreography may differ (splats allow wider viewing angles)
```

## Integration Points

### What Gets Created (New Files)

| File | Purpose |
|------|---------|
| `src/capsule/CapsuleShell.jsx` | Route page — replaces MemoryPortal.jsx |
| `src/capsule/CapsuleShell.css` | Full-viewport layout + responsive styles |
| `src/capsule/scene/CapsuleScene.jsx` | R3F Canvas wrapper with postprocessing |
| `src/capsule/scene/DepthMesh.jsx` | Displaced plane mesh (photo + depth) |
| `src/capsule/scene/CinemaCamera.jsx` | Choreographed camera controller |
| `src/capsule/scene/AtmosphereParticles.jsx` | Dust, bokeh, glow particles |
| `src/capsule/scene/depthShader.js` | GLSL vertex/fragment shaders |
| `src/capsule/ui/NarrativeCards.jsx` | Timed text card overlay (extracted from MemoryPortal) |
| `src/capsule/ui/CapsuleChrome.jsx` | Back button, title, mute toggle |
| `src/capsule/ui/NarrativeCards.css` | Glass card styling (extracted from MemoryPortal.css) |
| `src/capsule/capsuleDefaults.js` | Default displacement scale, camera params, particle configs |
| `public/memory/{first-scene}/` | Photo + depth map + optional soundtrack for flagship scene |

### What Gets Modified (Existing Files)

| File | Change |
|------|--------|
| `src/App.jsx` | Update lazy import: `MemoryPortal` -> `CapsuleShell` from `./capsule/CapsuleShell` |
| `src/data/memoryScenes.js` | Extended schema: add `renderer`, `depthUrl`, `camera` choreography config, `atmosphere` config. Remove splat-specific fields from default scenes |
| `src/utils/gpuCapability.js` | Add `canRenderDepthMesh()` — lighter check than `canRenderSplat()` (depth mesh needs only basic WebGL2, no heavy GPU requirements) |
| `src/pages/MemoryPortal.jsx` | DELETED (replaced by CapsuleShell) |
| `src/pages/MemoryPortal.css` | DELETED (styles extracted to CapsuleShell.css + NarrativeCards.css) |

### What Stays Untouched

| File/System | Why |
|-------------|-----|
| Home.jsx / Globe | Different route, different WebGL context. No interaction. |
| Constellation | Different route, different R3F Canvas. No interaction. |
| AudioContext / GlobalPlayer | Capsule uses its own Howl instance (same as existing MemoryPortal pattern). GlobalPlayer continues to manage site-wide music independently. |
| GameOverlay / XP | No XP integration for capsules (they're contemplative, not gamified). |
| Prism3D / Glint | No interaction with capsule system. |
| PortalVFX | Existing portal transition effect. Could optionally be used for capsule entry animation (stretch goal), but not required. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **CapsuleShell <-> CapsuleScene** | Props (scene config object) | Shell passes scene data down, scene renders it. No callbacks needed. |
| **CapsuleShell <-> NarrativeCards** | Props (cards array) | Cards are pure display components, timed internally via setTimeout. |
| **CapsuleShell <-> Soundtrack** | Props (src URL) + local state (muted) | Same Howl pattern as existing MemoryPortal. |
| **App.jsx <-> CapsuleShell** | React Router (route params) | Route `/memory/:sceneId` passes sceneId via useParams. |
| **Scene Registry <-> Everything** | Import (getSceneById) | Single source of truth for scene configuration. |

### WebGL Context Management

The existing codebase has three WebGL contexts that never coexist on the same route:

| Route | WebGL Context | Renderer |
|-------|---------------|----------|
| `/` (Home) | react-globe.gl (its own THREE.WebGLRenderer) | Globe shader system |
| `/constellation` | R3F `<Canvas>` (R3F-managed renderer) | Instanced meshes + postprocessing |
| `/memory/:id` | **New R3F `<Canvas>`** (R3F-managed renderer) | Depth mesh + postprocessing |

Because React Router unmounts the previous route before mounting the next, there is no context collision. The existing 600ms delay in MemoryPortal (waiting for the globe's context to release) should be preserved in CapsuleShell as a safety measure, but the isolated Canvas pattern means it is unlikely to be needed.

**Critical lesson from codebase:** The globe uses `react-globe.gl` which manages its own `THREE.WebGLRenderer` — it does NOT use R3F. The constellation uses R3F's `<Canvas>`. Memory Capsules should use R3F's `<Canvas>` (matching the constellation pattern), not the raw three.js approach.

## Extended Scene Registry Schema

The existing `memoryScenes.js` registry needs to expand:

```javascript
// src/data/memoryScenes.js — extended schema
const scenes = [
  {
    id: 'greece-sunset',
    title: 'Golden Hour in Syros',
    location: 'Syros, Greece',
    date: '2024-07-15',

    // Renderer selection (renderer-agnostic shell)
    renderer: 'depth-mesh',       // 'depth-mesh' | 'splat' (future)

    // Assets
    photoUrl: 'memory/greece-sunset/photo.jpg',
    depthUrl: 'memory/greece-sunset/depth.png',
    previewImage: 'memory/greece-sunset/preview.jpg',
    soundtrack: 'memory/greece-sunset/soundtrack.mp3',

    // Splat fields (used when renderer === 'splat')
    splatUrl: null,
    splatIsRemote: false,

    // Depth mesh config
    mesh: {
      segments: 256,                // Subdivision count (128 mobile, 256 desktop)
      displacementScale: 2.5,       // How much depth extrudes geometry
      displacementBias: -1.2,       // Offset (negative = push back)
      aspectRatio: 16 / 9,          // Photo aspect ratio -> plane dimensions
    },

    // Camera choreography
    camera: {
      startPosition: [0, 0, 3],     // Initial camera position
      lookAt: [0, 0, 0],            // Camera target
      driftSpeed: 0.08,             // How fast camera drifts
      amplitude: { x: 0.3, y: 0.15, z: 0.2 }, // Drift range per axis
      parallaxStrength: 0.25,       // Mouse influence (0 = none, 1 = full)
      fov: 50,                      // Field of view
    },

    // Atmosphere
    atmosphere: {
      particleCount: 200,           // Dust/bokeh sprites
      particleColor: '#fff8e7',     // Warm white default
      particleSize: [0.01, 0.04],   // Min/max size
      glowColor: '#ffa94d',         // Warm glow tint
      glowIntensity: 0.3,           // 0-1
      fogNear: 5,
      fogFar: 15,
      fogColor: '#1a1a2e',
    },

    // Narrative
    narrative: [
      { text: 'The light was different here.', delay: 2000 },
      { text: 'Three months of sunsets, each one unrepeatable.', delay: 6000 },
      { text: 'This one I remember.', delay: 11000 },
    ],
  },
];
```

## Anti-Patterns

### Anti-Pattern 1: Free-Roam Camera on Depth Mesh

**What people do:** Give the user full OrbitControls (rotate, pan, zoom) on a depth-displaced plane.
**Why it's wrong:** A depth-displaced plane is a 2.5D surface, not a true 3D object. Rotating beyond ~30 degrees reveals stretched edges, z-fighting, and the flat back of the plane. It breaks the illusion entirely.
**Do this instead:** Constrained camera choreography (Pattern 3). Allow mouse parallax within bounds. The camera stays in front of the mesh and never rotates past the comfort zone.

### Anti-Pattern 2: Sharing R3F Canvas Across Routes

**What people do:** Mount a single `<Canvas>` at the App level and swap scene content based on route.
**Why it's wrong:** The globe uses react-globe.gl (not R3F), so you cannot share a Canvas with it. Even between R3F routes (constellation, capsule), sharing a Canvas means all scenes' geometries, textures, and postprocessing effects persist in memory when switching. Disposal becomes a manual nightmare.
**Do this instead:** Isolated `<Canvas>` per route. React Router unmounts the old Canvas and mounts a new one. R3F handles disposal automatically on unmount.

### Anti-Pattern 3: Client-Side Depth Estimation

**What people do:** Run depth estimation (ML model) in the browser at runtime.
**Why it's wrong:** Depth estimation models (Depth Anything V2, MiDaS) are 100-400MB. Loading one client-side adds seconds of latency, megabytes of transfer, and competes with the R3F renderer for GPU memory. On mobile, it will crash or produce unusable results.
**Do this instead:** Generate depth maps offline (local tool or API) and commit them as static assets. The depth map is a small PNG (50-200KB) that loads instantly.

### Anti-Pattern 4: Over-Subdividing the Displacement Mesh

**What people do:** Set segments to 1024x1024 (1M+ vertices) for "maximum detail."
**Why it's wrong:** Beyond 256x256, the vertex density exceeds the depth map's information density (most depth maps are 512-1024px). Extra vertices add GPU cost with no visual improvement. On mobile, it tanks framerate.
**Do this instead:** 128x128 for mobile, 256x256 for desktop. Match segments to depth map resolution. If the depth map is 512px, 256 segments is the ceiling.

### Anti-Pattern 5: Using React State for Camera Position

**What people do:** `const [pos, setPos] = useState([0,0,3])` and update it in `useFrame`.
**Why it's wrong:** This causes 60 React re-renders per second, destroying performance. The entire React subtree re-renders on each camera move.
**Do this instead:** Mutate `camera.position` directly via refs in `useFrame`. This is a mutable operation that bypasses React's reconciliation — exactly how R3F is designed to work. (Same anti-pattern documented in the Constellation ARCHITECTURE.md.)

## Suggested Build Order

Dependencies flow downward — each phase depends on the one above it.

### Phase 1: Depth Mesh Core (Foundation)

**Goal:** A single photo rendered as a 3D displaced mesh in an R3F Canvas.

1. **depthShader.js** — Write vertex/fragment GLSL for depth displacement
2. **DepthMesh.jsx** — R3F component: PlaneGeometry + ShaderMaterial + useTexture
3. **CapsuleScene.jsx** — Minimal R3F Canvas wrapping DepthMesh + basic lighting
4. **Test harness** — Temporary route rendering CapsuleScene with a test photo + depth map

**Validation:** Navigate to test route, see photo extruded in 3D. Rotate dev camera (temporarily) to verify displacement.

**Dependencies:** None. Can start immediately.

### Phase 2: Camera Choreography

**Goal:** Remove free-roam camera, add constrained cinematic drift.

5. **CinemaCamera.jsx** — Drift + parallax controller using useFrame + refs
6. **capsuleDefaults.js** — Default camera config (drift speed, parallax strength, amplitude)
7. **Update CapsuleScene** — Replace OrbitControls with CinemaCamera

**Validation:** Camera slowly drifts. Mouse movement creates subtle parallax. No manual rotation possible.

**Dependencies:** Phase 1 (needs CapsuleScene to exist).

### Phase 3: Atmosphere Layer

**Goal:** Scene feels cinematic, not like a raw displaced plane.

8. **AtmosphereParticles.jsx** — Floating dust motes, bokeh sprites, volumetric glow
9. **Add postprocessing** — DepthOfField + Vignette via @react-three/postprocessing
10. **Scene fog** — THREE.Fog or custom shader fog for depth falloff

**Validation:** Particles float. Background blurs. Edges fade to black. Scene feels dreamlike.

**Dependencies:** Phase 2 (needs camera position to be stable for DOF focus distance).

### Phase 4: Shell + Chrome

**Goal:** Full page experience with narrative, soundtrack, and navigation.

11. **CapsuleShell.jsx** — Route page: mounts CapsuleScene + chrome layers
12. **NarrativeCards.jsx** — Timed glass text cards (extracted from MemoryPortal pattern)
13. **CapsuleChrome.jsx** — Back link, title, mute toggle (extracted from MemoryPortal)
14. **CapsuleShell.css** — Full-viewport positioning, responsive layout
15. **Soundtrack integration** — Howler.js per-scene audio (reuse existing pattern)
16. **Update App.jsx** — Replace MemoryPortal import with CapsuleShell

**Validation:** Navigate to `/memory/test-scene`. Full experience: 3D scene + floating text + music + back button.

**Dependencies:** Phase 3 (needs complete scene to wrap with chrome).

### Phase 5: Scene Registry + Flagship Scene

**Goal:** Extended registry schema. One real scene (not test data) proven end-to-end.

17. **Extend memoryScenes.js** — New schema with depth/camera/atmosphere fields
18. **Generate depth map** — Process flagship photo through Depth Anything V2
19. **Create scene assets** — photo.jpg + depth.png + soundtrack.mp3 in `public/memory/{id}/`
20. **Configure scene** — Tune displacement, camera, atmosphere, narrative for the flagship
21. **GPU capability check** — Update gpuCapability.js with canRenderDepthMesh()
22. **Fallback** — Graceful degradation to cinematic parallax image (reuse existing MemoryPortal fallback pattern)

**Validation:** The flagship scene is beautiful, performant, and emotionally resonant. Mobile fallback works.

**Dependencies:** Phase 4 (needs complete shell to configure a real scene within).

### Phase 6: Polish + Cleanup (Optional, if time allows)

23. **Remove old MemoryPortal** — Delete MemoryPortal.jsx + .css (replaced by CapsuleShell)
24. **Entry animation** — Fade-in or portal transition (optionally reuse PortalVFX)
25. **Per-scene color grading** — Custom postprocessing tint per scene
26. **Editor integration** — Add capsule tuning controls to GlintEditor (displacement, camera, particles)
27. **OG preview** — Dynamic OG image for `/memory/:sceneId` routes (already partially handled in App.jsx)

**Dependencies:** Phase 5 (flagship must be proven before polish).

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **Scene load (assets)** | <1.5s on broadband | Photo <500KB (JPEG 80%), depth map <200KB (PNG 8-bit grayscale), soundtrack streams |
| **First render** | <16ms (60fps) | 256x256 plane = 65K vertices, single draw call, two textures |
| **Sustained framerate** | 60fps desktop, 30fps mobile | Postprocessing disabled on mobile, particles reduced |
| **Memory** | <100MB GPU | Single mesh + two textures + 200 particle sprites + postprocessing buffers |
| **Mobile fallback** | Instant | Static image parallax (same as existing MemoryPortal fallback) |

## Depth Map Generation Options

| Option | Latency | Quality | Cost | Best For |
|--------|---------|---------|------|----------|
| **Depth Anything V2 (local)** | ~5s per image | Excellent | Free | Developer workstation with GPU |
| **Marigold (local)** | ~10s per image | Excellent (diffusion-based) | Free | Maximum quality, slower |
| **Replicate API** | ~15s per image | Excellent | ~$0.01/image | No local GPU needed |
| **Hugging Face Spaces** | ~20s per image | Good | Free | Quick testing |
| **Vercel Function (future)** | ~30s per image | Good | API cost | Admin UI "upload photo" workflow |

**Recommendation:** Start with local Depth Anything V2. It is free, fast, and produces excellent results. The manual workflow (generate locally, commit to git) is fine for the initial milestone target of 1-3 flagship scenes.

## Sources

- Three.js DisplacementMap: https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.displacementMap
- R3F useTexture (drei): https://drei.docs.pmnd.rs/loaders/use-texture
- R3F postprocessing: https://docs.pmnd.rs/react-postprocessing
- Depth Anything V2: https://github.com/DepthAnything/Depth-Anything-V2
- Existing codebase patterns: ConstellationCanvas.jsx (isolated R3F Canvas), MemoryPortal.jsx (splat viewer prototype), globeDefaults.js (shader uniform pattern)
- IMMERSIVE_TECH.md (.planning/future/) — strategic direction for splat/shader/portal work

---
*Architecture research for: Memory Capsules integration into jarowe.com*
*Researched: 2026-03-23*
