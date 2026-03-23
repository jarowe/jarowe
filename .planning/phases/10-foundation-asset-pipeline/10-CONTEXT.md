# Phase 10: Foundation + Asset Pipeline - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

A depth-displaced 3D mesh renders from a single photo+depth pair without visual artifacts, with WebGL context lifecycle managed cleanly between globe and capsule routes, GPU tiers detected at 3 levels, and a validated asset pipeline producing compressed capsule assets under 500KB. The existing MemoryPortal is refactored into a renderer-agnostic CapsuleShell.

</domain>

<decisions>
## Implementation Decisions

### Depth Displacement Strategy
- **D-01:** Subdivided plane geometry (PlaneGeometry with 256x256 segments for full tier, 128x128 for simplified). Depth map sampled as texture in vertex shader, vertices displaced along Z by `depth * depthScale`. Photo texture sampled in fragment shader.
- **D-02:** Gradient-based fragment discard for depth discontinuity edges. `dFdx`/`dFdy` on depth value; fragments exceeding `discardThreshold` are discarded. Soft alpha fade band near threshold via `smoothstep`. Per-scene threshold override in scene config.
- **D-03:** Per-scene tuning uniforms: `depthScale`, `depthBias`, `depthContrast`, `discardThreshold`.

### CapsuleShell Architecture
- **D-04:** Replace MemoryPortal.jsx in-place with CapsuleShell.jsx. Same `/memory/:sceneId` route. Scene registry gets `renderMode` field (`'displaced-mesh'` | `'splat'` | `'parallax'`). Old splat viewer code becomes one rendering path inside the shell.
- **D-05:** CapsuleShell creates its own R3F `<Canvas>` internally. Self-contained renderer per capsule — no shared Canvas with globe or other pages.
- **D-06:** Scene registry shape evolves: `{ id, title, location, narrative, renderMode, photoUrl, depthMapUrl, depthConfig, previewImage, soundtrack, cameraPosition, cameraTarget, ... }`.

### WebGL Context Lifecycle
- **D-07:** Globe unmounts on route exit (React Router handles mount/unmount). When navigating to `/memory/:sceneId`, Home unmounts → globe Canvas disposed. CapsuleShell mounts → new Canvas created. On return, CapsuleShell unmounts → Home re-mounts → globe re-initializes. Never two WebGL contexts alive simultaneously.
- **D-08:** No custom disposal code for globe — rely on React unmount + garbage collection. Accept ~1-2s globe re-initialization cost on return. Browser/asset caching handles texture reloads.

### GPU Tier Detection
- **D-09:** Refactor `canRenderSplat()` in `gpuCapability.js` into `getGpuTier()` returning `'full'` | `'simplified'` | `'parallax'`. Same file, expanded logic with 3-tier thresholds instead of boolean.
- **D-10:** Tier criteria: `full` = WebGL2 + maxTexture >= 8192 + deviceMemory >= 6; `simplified` = WebGL2 + maxTexture >= 4096; `parallax` = everything else. Additional mobile/DPR heuristics to catch devices that pass capability checks but can't sustain postprocessing.
- **D-11:** `full` → DisplacedMeshRenderer (256² subdivisions, postprocessing, DPR up to 2.0, full particles). `simplified` → DisplacedMeshRenderer (128² subdivisions, no postprocessing, DPR 1.0, reduced particles). `parallax` → ParallaxFallback (no WebGL).

### Parallax Fallback
- **D-12:** Layered parallax with Ken Burns animation. Photo split into 2-3 depth layers via depth map thresholds, each layer moves at different speed on mouse/gyro input. Ken Burns slow zoom drift (1.0 → 1.05 over 20s). Vignette + film grain via CSS. Same narrative overlay + soundtrack as full experience. Intentional lower-power version of the same emotional contract, not a degraded substitute.

### Asset Pipeline
- **D-13:** Apple Depth Pro as primary depth estimation tool. Depth Anything V2 as fallback for images where Depth Pro struggles. Both produce grayscale depth maps.
- **D-14:** Asset format split: `photo.webp` (lossy, quality 80-85), `depth.png` (lossless — depth is control data, not presentation), `preview.jpg` (1200x630 for OG cards, quality 80).
- **D-15:** Per-scene folder structure: `public/memory/{scene-id}/photo.webp`, `depth.png`, `preview.jpg`, optional `layers/` for SAM masks. Self-contained per scene.
- **D-16:** Total asset payload per capsule < 500KB (photo ~150-250KB + depth ~40-100KB + preview ~30-50KB).
- **D-17:** Minimal validate-only Node.js script (`scripts/validate-capsule.mjs`): checks required files exist, depth dimensions match photo, total size < 500KB, depth is grayscale. Fails loudly. No conversion — just validation.

### Claude's Discretion
- Exact subdivision count tuning (256 vs other powers of 2) based on performance testing
- Specific smoothstep fade band width for edge discard
- Ken Burns easing curve and parallax layer speed multipliers
- Camera default position/FOV for the displaced mesh
- Internal component decomposition within CapsuleShell (how to split DisplacedMeshRenderer, ParallaxFallback, NarrativeOverlay)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 Requirements
- `.planning/REQUIREMENTS.md` §v2.1 — DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, SHELL-01, SHELL-02, SHELL-03, ASSET-01

### Existing Code (evolve, don't rewrite from scratch)
- `src/pages/MemoryPortal.jsx` — Current splat viewer to be refactored into CapsuleShell
- `src/pages/MemoryPortal.css` — Existing styles for narrative, chrome, fallback
- `src/data/memoryScenes.js` — Scene registry to be extended with renderMode + depth fields
- `src/utils/gpuCapability.js` — `canRenderSplat()` to be refactored into `getGpuTier()`

### Existing Patterns (follow these)
- `src/pages/Home.jsx` — Globe ShaderMaterial pattern (custom vertex/fragment shaders with uniforms)
- `src/App.jsx` — Lazy loading pattern and `/memory/:sceneId` route definition
- `src/context/AudioContext.jsx` — Howler.js AudioProvider for soundtrack integration

### Prior Phase Context
- `.planning/phases/07-immersive-portal/07-CONTEXT.md` — Phase 7 decisions on narrative overlay, soundtrack, mobile fallback, scene registry shape

### Research Flags (from STATE.md)
- react-globe.gl disposal API gap — resolved by unmount-on-route-exit strategy (D-07)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MemoryPortal.jsx` — Narrative card system, soundtrack Howl setup, fallback parallax, chrome (back button, title, mute) — all reusable in CapsuleShell
- `memoryScenes.js` — Scene registry pattern, `getSceneById()` — extend rather than replace
- `gpuCapability.js` — WebGL2 checks, GPU string detection, mobile heuristics — refactor into 3-tier
- `PortalVFX.jsx` — Portal transition canvas (Phase 12 will wire this in, not Phase 10)
- `globeDefaults.js` — Pattern for per-scene config objects with tunable parameters

### Established Patterns
- Custom ShaderMaterial with uniforms via `useMemo` + `useRef` (Home.jsx globe)
- React.lazy() + Suspense for heavy 3D components
- `import.meta.env.BASE_URL` for all asset paths
- Framer Motion for UI animations, GSAP for timeline-driven animations
- Glass-panel aesthetic for overlays (existing CSS patterns)
- `localStorage` for state persistence

### Integration Points
- `src/App.jsx` line 39 — Lazy import (rename MemoryPortal → CapsuleShell)
- `src/App.jsx` line 376 — Route element (update component reference)
- `api/og.js` — Memory OG template already exists (no changes needed in Phase 10)

</code_context>

<specifics>
## Specific Ideas

- Depth map is control data, not presentation — never apply lossy compression to depth (PNG lossless only)
- Parallax fallback must preserve the same emotional contract: foreground/background separation, slow cinematic motion, atmosphere, narrative, soundtrack — not a "sorry, your device can't handle this" message
- Camera will be constrained in Phase 11 (CINE-01), but Phase 10 should use a simple slow drift or static camera to validate the displaced mesh without free-roam controls
- The validate script is validation, not pipeline bureaucracy — small and fail-fast
- Don't rely only on WebGL capability checks for GPU tiers — also factor in practical mobile heuristics and DPR budget

</specifics>

<deferred>
## Deferred Ideas

- SAM layer separation for foreground/background — Phase 12 (ARC-02) will add this on top of the displaced mesh
- Cinematic camera choreography — Phase 11 (CINE-01, CINE-02)
- Atmospheric particles and postprocessing — Phase 11 (CINE-03)
- Color grading — Phase 11 (CINE-04)
- Portal entry/exit transitions — Phase 12 (PORT-03)
- CapsuleEditor (lil-gui) for live tuning — Phase 13 (ASSET-02)
- Full compression pipeline script (auto-resize, auto-compress) — future if needed

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-foundation-asset-pipeline*
*Context gathered: 2026-03-23*
