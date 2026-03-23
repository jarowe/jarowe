---
phase: 10-foundation-asset-pipeline
verified: 2026-03-23
verifier: claude-sonnet-4-6
verdict: PASS
---

# Phase 10 Verification Report

**Phase goal:** A depth-displaced 3D mesh renders from a single photo without visual artifacts, with WebGL context lifecycle managed, GPU tiers detected, and a validated asset pipeline producing compressed capsule assets.

**Requirement IDs under verification:** DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, SHELL-01, SHELL-02, SHELL-03, ASSET-01

**Plan-to-requirement mapping (from PLAN frontmatter):**
- 10-01-PLAN.md: DEPTH-04, SHELL-01, SHELL-02
- 10-02-PLAN.md: ASSET-01
- 10-03-PLAN.md: DEPTH-01, DEPTH-02, DEPTH-03, SHELL-03

All 8 phase-10 requirement IDs are accounted for across the 3 plans. No ID is unmapped or duplicated.

---

## Requirement Verdicts

### DEPTH-01 — Depth-displaced 3D mesh renderer
**Requirement:** Visitor sees a single photo rendered as a depth-displaced 3D mesh with foreground/background layer separation.

**Evidence:**
- `src/pages/CapsuleShell.jsx` contains `function DisplacedMeshRenderer({ scene, tier })` (line 252) — not a stub.
- Internally renders an R3F `<Canvas>` with `<DisplacedPlane>` (line 279), which creates a `THREE.PlaneGeometry` displaced along Z by depth map values via `DISPLACED_VERT` shader.
- Imports confirmed: `import { Canvas, useFrame, useThree } from '@react-three/fiber'` (line 6), `import * as THREE from 'three'` (line 7).
- `DisplacedPlane` loads `scene.photoUrl` and `scene.depthMapUrl` via `THREE.TextureLoader`, applies them as uniforms to a custom `THREE.ShaderMaterial`.

**Verdict: PASS**

---

### DEPTH-02 — Fragment shader edge discard via dFdx/dFdy
**Requirement:** Depth discontinuity edges handled via fragment shader discard — no rubber-sheet stretching artifacts.

**Evidence in `DISPLACED_FRAG` shader (lines 138–163):**
```glsl
float ddx = abs(dFdx(vDepth));
float ddy = abs(dFdy(vDepth));
float depthEdge = max(ddx, ddy);

if (depthEdge > uDiscardThreshold) {
  discard;
}

float edgeAlpha = 1.0 - smoothstep(uDiscardThreshold * 0.5, uDiscardThreshold, depthEdge);
```
- `dFdx` and `dFdy` screen-space derivatives detect depth discontinuities.
- Hard `discard` for edges above threshold.
- `smoothstep` fade band provides anti-aliased transition below threshold.

**Verdict: PASS**

---

### DEPTH-03 — Per-scene tuning uniforms
**Requirement:** Each scene has per-scene tuning knobs (depthScale, depthBias, depthContrast, discardThreshold).

**Evidence:**
- Vertex shader (`DISPLACED_VERT`) exposes `uDepthScale`, `uDepthBias`, `uDepthContrast` uniforms.
- Fragment shader (`DISPLACED_FRAG`) exposes `uDiscardThreshold` uniform.
- `DisplacedPlane` reads `scene.depthConfig` destructured as `{ depthScale, depthBias, depthContrast, discardThreshold }` with defaults (lines 188–193).
- All four values wired into `uniforms.current` (lines 207–214).
- `memoryScenes.js` test-capsule entry has `depthConfig: { depthScale: 2.0, depthBias: 0.0, depthContrast: 1.0, discardThreshold: 0.15 }`.
- `getDefaultDepthConfig()` exported from `memoryScenes.js` (line 84).

**Verdict: PASS**

---

### DEPTH-04 — 3-tier GPU capability detection
**Requirement:** GPU capability detected at 3 tiers (full / simplified / parallax-only fallback) based on device capability.

**Evidence in `src/utils/gpuCapability.js`:**
- `getGpuTier()` exported (line 32), returns exactly `'full'`, `'simplified'`, or `'parallax'`.
- `'full'` tier: WebGL2 + `MAX_TEXTURE_SIZE >= 8192` (line 66) + `deviceMemory >= 6` desktop / `>= 8` mobile (lines 69, 73).
- `'simplified'` tier: WebGL2 + `MAX_TEXTURE_SIZE >= 4096` (line 79).
- `'parallax'` tier: no WebGL2, low-end GPU list match, or mobile+low-memory.
- `WEBGL_lose_context` cleanup present (line 51).
- `canRenderSplat()` kept as deprecated wrapper calling `getGpuTier() !== 'parallax'` (line 93).
- Tier-driven subdivision count in `DisplacedMeshRenderer`: `tier === 'full' ? 256 : 128` (line 253).
- Tier-driven DPR: `tier === 'full' ? [1, 2] : [1, 1]` (line 254).

**Verdict: PASS**

---

### SHELL-01 — Renderer-agnostic CapsuleShell
**Requirement:** Renderer-agnostic CapsuleShell replaces MemoryPortal — displaced mesh now, splat swap later via renderMode per scene.

**Evidence:**
- `src/pages/CapsuleShell.jsx` exists and exports `default function CapsuleShell` (line 403).
- Routes on `scene.renderMode` x GPU tier via explicit if/else chain (lines 473–490):
  - `tier === 'parallax'` → `showFallback = true`
  - `renderMode === 'displaced-mesh'` → `showDisplaced = true`
  - `renderMode === 'splat'` → `showSplat = true`
  - unknown renderMode → `showFallback = true` (graceful fallback)
- `memoryScenes.js` has `renderMode` on all scene entries: `'splat'` for placeholder-scene, `'displaced-mesh'` for test-capsule.
- `src/App.jsx` line 39: `const CapsuleShell = lazyRetry(() => import('./pages/CapsuleShell'))`.
- `src/App.jsx` line 378: route renders `<CapsuleShell />`.
- No `import.*MemoryPortal` or `<MemoryPortal` in App.jsx (confirmed grep returns 0 matches).
- `MemoryPortal.jsx` still exists on disk (preserved as dead-code reference).
- Suspense fallback still reads `"Loading Memory..."` (App.jsx line 377).

**Verdict: PASS**

---

### SHELL-02 — WebGL context lifecycle managed
**Requirement:** Globe renderer disposed on route exit, capsule Canvas isolated.

**Evidence:**
- Globe lives on the `/` route (`Home.jsx`), CapsuleShell lives on `/memory/:sceneId`. React Router unmounts `Home` (and its globe Canvas) when navigating to `/memory/:sceneId` — they never coexist in the React tree.
- `DisplacedMeshRenderer` creates its own self-contained R3F `<Canvas>` (line 258); R3F disposes the WebGL context on unmount automatically.
- `SplatRenderer` has a 600ms delay before initialising (`setTimeout(initViewer, 600)`, line 92) — explicitly allows globe context to release before splat viewer starts.
- `SplatRenderer` calls `viewer.dispose()` in its cleanup function (lines 97–101).
- No shared Canvas or shared WebGL context between globe and capsule renderers.

**Verdict: PASS**

---

### SHELL-03 — Mobile parallax + Ken Burns fallback
**Requirement:** Mobile fallback provides parallax + Ken Burns experience for non-capable devices.

**Evidence in `ParallaxFallback` (lines 295–398):**
- Gyroscope support: `deviceorientation` event listener (line 309).
- Mouse parallax: `mousemove` listener with `handleMouseMove` (line 317).
- Two image layers:
  - Background: `memory-portal__layer-bg` class, offset `bgX = (mousePos.x - 0.5) * 12` (line 329).
  - Foreground: `memory-portal__layer-fg` class, offset `fgX = (mousePos.x - 0.5) * 28` (line 331) — ~2.3x faster.
- Ken Burns on background: `animate={{ scale: [1.0, 1.05, 1.0] }}` (line 346), `duration: 20` (line 348), `repeat: Infinity`.
- Atmospheric overlays preserved: `memory-portal__vignette`, `memory-portal__grain`, `memory-portal__light-leak`.
- CSS in `MemoryPortal.css`:
  - `.memory-portal__layer-bg` rule at line 252 (brightness + z-index).
  - `.memory-portal__layer-fg` rule at line 257 with `inset: -60px` and `mask-image` gradient.

**Verdict: PASS**

---

### ASSET-01 — Manual workflow with validated asset pipeline
**Requirement:** Manual workflow: upload photo, generate depth offline, compress to <500KB per capsule.

**Evidence:**
- `scripts/validate-capsule.mjs` exists; validates file existence, total size < 512000 bytes, PNG dimension match, and grayscale depth type via IHDR header parsing (no external deps).
- `scripts/generate-test-assets.mjs` exists; produces `photo.png`, `depth.png`, `preview.jpg` using only Node.js built-ins (`zlib.deflateSync`).
- `public/memory/test-capsule/` contains all three files: `photo.png` (7.7 KB), `depth.png` (0.2 KB), `preview.jpg` (0.3 KB).
- Live validation run: `node scripts/validate-capsule.mjs test-capsule` exits with code 0. All checks pass:
  - 64x64 photo and depth dimensions match.
  - Depth is grayscale (color type 0).
  - Total 8.2 KB (well under 500 KB limit).
- `"validate:capsule"` npm script registered in `package.json` (line 17).
- Per-capsule folder convention: `public/memory/{scene-id}/photo.png + depth.png + preview.jpg`.

**Verdict: PASS**

---

## Summary

| Requirement | Description | Verdict |
|-------------|-------------|---------|
| DEPTH-01 | Depth-displaced 3D mesh renderer | PASS |
| DEPTH-02 | Fragment shader discard via dFdx/dFdy | PASS |
| DEPTH-03 | Per-scene tuning uniforms (depthScale, depthBias, depthContrast, discardThreshold) | PASS |
| DEPTH-04 | 3-tier GPU detection (full/simplified/parallax) | PASS |
| SHELL-01 | Renderer-agnostic CapsuleShell with renderMode routing | PASS |
| SHELL-02 | WebGL context lifecycle managed (globe/capsule isolated) | PASS |
| SHELL-03 | Mobile parallax + Ken Burns fallback with gyroscope | PASS |
| ASSET-01 | Asset pipeline: validation script, test assets, <500KB budget | PASS |

**Overall verdict: PASS — all 8 phase-10 requirements met.**

---

## Key Files Verified

| File | Role |
|------|------|
| `src/utils/gpuCapability.js` | 3-tier getGpuTier() + canRenderSplat() wrapper |
| `src/data/memoryScenes.js` | Scene registry with renderMode + depthConfig fields |
| `src/pages/CapsuleShell.jsx` | Renderer-agnostic shell (SplatRenderer, DisplacedMeshRenderer, ParallaxFallback) |
| `src/pages/MemoryPortal.css` | Multi-layer parallax CSS (.memory-portal__layer-bg/fg) |
| `src/App.jsx` | CapsuleShell lazy route at /memory/:sceneId |
| `scripts/validate-capsule.mjs` | Asset validation (existence, size, dimensions, grayscale) |
| `scripts/generate-test-assets.mjs` | Zero-dependency test PNG/JPEG generator |
| `public/memory/test-capsule/` | photo.png (64x64 RGB), depth.png (64x64 grayscale), preview.jpg |

---

## Phase Goal Assessment

The phase goal is met in full:

- **"A depth-displaced 3D mesh renders from a single photo"** — DisplacedMeshRenderer with custom vertex shader (Z displacement from depth map) and subdivided PlaneGeometry confirmed.
- **"Without visual artifacts"** — Fragment shader discard via dFdx/dFdy with smoothstep fade band prevents rubber-sheet stretching at depth discontinuities.
- **"WebGL context lifecycle managed"** — Globe and capsule Canvas are on separate routes; splat viewer has 600ms delay + explicit dispose; R3F auto-disposes on unmount.
- **"GPU tiers detected"** — getGpuTier() returns 'full'|'simplified'|'parallax' with mobile heuristics and subdivision/DPR scaling.
- **"Validated asset pipeline producing compressed capsule assets"** — validate-capsule.mjs passes on test-capsule (8.2 KB, dimensions match, grayscale depth); npm script registered.

*Verified: 2026-03-23*
