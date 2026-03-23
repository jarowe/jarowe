# Phase 10: Foundation + Asset Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 10-foundation-asset-pipeline
**Areas discussed:** Depth displacement approach, WebGL context lifecycle, GPU tier detection, Asset pipeline workflow

---

## Depth Displacement Approach

### Mesh Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Subdivided plane | PlaneGeometry(256x256) with vertex displacement from depth map in ShaderMaterial. Simple, proven, matches globe patterns. | ✓ |
| Dual-layer planes (front/back) | Two separate displaced planes — foreground (SAM-masked) + background. Clean separation but more complex, needs SAM per scene. | |
| Point cloud from depth | Each pixel becomes a point sprite in 3D. Zero stretching but sparse, less photographic. | |

**User's choice:** Subdivided plane
**Notes:** Right Phase 10 choice. Matches milestone goal (reliable from single image, simple to tune, compatible with existing R3F/Three shader patterns). Pair with SAM-derived separation where needed, rely on fragment discard + constrained camera to manage edge stretch.

### Edge Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Gradient-based discard | Compute dFdx/dFdy on depth, discard above threshold. Soft alpha fade near cutoff. Per-scene threshold override. | ✓ |
| Depth delta discard | Sample 4 neighbors via texture fetches, discard on max delta. Simpler but more texture lookups. | |
| You decide | Claude picks best approach. | |

**User's choice:** Gradient-based discard
**Notes:** Reacts to actual discontinuity shape rather than single absolute depth jump. Gives right artistic control surface: discardThreshold, soft fade band, per-scene override.

### Shell Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Replace in-place | Refactor MemoryPortal.jsx → CapsuleShell.jsx. Scene registry gets renderMode field. Same route, same component, renderer dispatched per scene. | ✓ |
| New component, keep both | Create CapsuleShell alongside MemoryPortal. Route dispatches based on scene type. Safer but adds routing complexity. | |

**User's choice:** Replace in-place
**Notes:** MemoryPortal is already the semantic slot. Keeping both creates architectural ambiguity. Treat as evolution: keep route contract and scene model, upgrade engine underneath.

---

## WebGL Context Lifecycle

### Globe Disposal

| Option | Description | Selected |
|--------|-------------|----------|
| Unmount globe on route exit | Home unmounts on navigate, globe Canvas disposed by React. CapsuleShell creates new Canvas. On return, globe re-mounts (~1-2s). Never two contexts alive. | ✓ |
| Explicit dispose + recreate | Call globe.renderer().dispose() + loseContext() before unmount. More control but fragile, depends on react-globe.gl internals. | |
| Keep globe alive (hidden) | Globe stays mounted but hidden. Two WebGL contexts alive simultaneously. Risky on mobile, GPU memory cost. | |

**User's choice:** Unmount globe on route exit
**Notes:** Safest and most correct. Site already pushes GPU complexity hard enough. Clean mount/unmount boundary is worth the short re-entry cost. Optimize return experience later.

### Canvas Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Own Canvas per CapsuleShell | CapsuleShell creates its own <Canvas> internally. Self-contained, easy to dispose. | ✓ |
| Shared Canvas in App.jsx | Single <Canvas> in App.jsx, pages render different R3F children. Avoids creation cost but couples pages. | |

**User's choice:** Own Canvas per CapsuleShell
**Notes:** Right isolation boundary. Capsule renderer has its own lifecycle. Globe and capsule never compete for shared canvas ownership.

---

## GPU Tier Detection

### Tier Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Expand canRenderSplat into getGpuTier() | Refactor to return 'full' / 'simplified' / 'parallax'. Same checks with 3-tier thresholds. | ✓ |
| detect-gpu library | npm package with GPU benchmarks. More accurate but adds dependency + async init. | |
| You decide | Claude picks detection strategy. | |

**User's choice:** Expand canRenderSplat into getGpuTier()
**Notes:** Small, local capability function is better than another abstraction layer. Don't rely only on raw caps — factor in coarse mobile heuristics and DPR budget.

### Fallback UX

| Option | Description | Selected |
|--------|-------------|----------|
| Layered parallax with Ken Burns | Photo split into 2-3 depth layers, each moves at different speed. Ken Burns zoom drift. CSS vignette + grain. Same narrative + soundtrack. | ✓ |
| Simple parallax (current MemoryPortal style) | Single image with mouse-tracked CSS transform, vignette, grain, light leak. Already works but less depth illusion. | |

**User's choice:** Layered parallax with Ken Burns
**Notes:** Fallback must carry the same emotional contract. Foreground/background separation, slow cinematic motion, atmosphere, narrative, soundtrack. Lower-power version of the same experience, not a broken substitute.

---

## Asset Pipeline Workflow

### Depth Tool

| Option | Description | Selected |
|--------|-------------|----------|
| Depth Anything V2 | Open-source (Apache 2.0), local Python/PyTorch. Multiple model sizes. State-of-the-art monocular depth. | |
| Apple Depth Pro | Metric depth with sharp boundaries. Better edge quality. Research license. | ✓ |
| Either — you decide | Claude picks during research. | |

**User's choice:** Apple Depth Pro
**Notes:** Quality matters more than openness for this milestone. Flagship capsule lives or dies on depth quality, especially around edges. Depth Anything V2 remains backup path for difficult images.

### Asset Layout

| Option | Description | Selected |
|--------|-------------|----------|
| public/memory/{scene-id}/ | Per-scene folder. Self-contained. Clean, matches existing patterns. | ✓ |
| Flat public/memory/ directory | All files in one folder with naming convention. Simpler but messy with masks. | |

**User's choice:** public/memory/{scene-id}/
**Notes:** Right long-term shape even for one scene. Assets self-contained, future capsules slot in, optional masks have obvious home.

### Image Formats

| Option | Description | Selected |
|--------|-------------|----------|
| WebP for both | Excellent compression for photo and depth. | |
| AVIF for both | Better compression but riskier browser support. | |
| PNG depth + WebP photo | Lossless depth (control data), lossy photo (presentation). | ✓ |

**User's choice:** PNG depth + WebP photo
**Notes:** Depth map is control data, not presentation media. Lossy compression on depth introduces banding and false contours at the worst possible locations. Resize depth map before making it lossy if bytes are needed.

### Pipeline Script

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal validate-only script | Checks files exist, dimensions match, size < 500KB, depth is grayscale. Fails loudly. | ✓ |
| Full compress + validate pipeline | Takes raw inputs, resizes, compresses, validates. More automation but more scope. | |
| No script — manual checks | Eyeball it. Simple for 1 scene. | |

**User's choice:** Minimal validate-only script
**Notes:** Small and high-value — protects flagship scene from preventable asset mistakes. Validation, not pipeline bureaucracy.

---

## Claude's Discretion

- Exact subdivision count tuning (256 vs other powers of 2)
- Smoothstep fade band width for edge discard
- Ken Burns easing curve and parallax layer speed multipliers
- Camera default position/FOV for displaced mesh
- Internal component decomposition within CapsuleShell

## Deferred Ideas

- SAM layer separation → Phase 12
- Cinematic camera choreography → Phase 11
- Atmospheric particles/postprocessing → Phase 11
- Color grading → Phase 11
- Portal entry/exit transitions → Phase 12
- CapsuleEditor (lil-gui) → Phase 13
- Full compression pipeline script → future if needed
