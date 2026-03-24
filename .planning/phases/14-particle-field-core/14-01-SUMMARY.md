---
phase: 14-particle-field-core
plan: 01
subsystem: renderer
tags: [three.js, r3f, shader, glsl, particles, webgl, memory-capsule]

# Dependency graph
requires:
  - phase: 12-flagship-scene-portal
    provides: CapsuleShell with renderer dispatch, scene registry, GPU tier system, CinematicCamera, AtmosphericParticles, postprocessing
provides:
  - ParticleMemoryField component: CPU-sampled photo+depth → 80K-150K luminous 3D particles
  - Dual position buffers (aPhotoPosition + aScatteredPosition) for Phase 16 dissolve/reform
  - uMorphProgress uniform interpolating between scattered and photo-formed positions
  - Depth-correlated breathing animation (foreground breathes first, wave rolls backward)
  - Shader-based halo glow (soft circle core + secondary low-alpha ring)
  - Spatial hash wire connections (dense at depth edges + sparse ambient KNN)
  - ParticleFieldRenderer wrapper in CapsuleShell dispatch (renderMode 'particle-memory')
  - Sparse CSS particle dot overlay for parallax fallback on particle-memory scenes
affects: [14-02, 14-03, 15-memory-flight-controller, 16-dream-portal-transition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CPU-side hybrid grid + Sobel edge-boost particle sampling from photo + depth map"
    - "Dual Float32Array position buffers (scattered + photo-formed) with vertex shader mix()"
    - "Spatial hash grid for O(n) wire connection precomputation (~10K LineSegments)"
    - "Depth-correlated breathing via sin(time - depth * 3.0) in vertex shader"
    - "Additive blending with soft-circle halo (core smoothstep + secondary low-alpha ring)"
    - "React.lazy() for ParticleMemoryField — code-split away from non-capsule routes"

key-files:
  created:
    - src/pages/ParticleMemoryField.jsx
  modified:
    - src/pages/CapsuleShell.jsx
    - src/data/memoryScenes.js
    - src/pages/MemoryPortal.css
---

# Plan 14-01 Summary — Particle Field Renderer + CapsuleShell Integration

## What was built

**ParticleMemoryField** (`src/pages/ParticleMemoryField.jsx`) — the core particle field renderer that decomposes a photo + depth map into a luminous 3D particle field:

1. **CPU-side particle sampling**: Loads photo + depth as Images, draws to offscreen canvas, getImageData(), computes Float32Arrays for positions, colors, sizes. Hybrid grid (~80K base) + Sobel edge-boost (~40-70K bonus at depth discontinuities).

2. **Dual position buffers**: `aPhotoPosition` (photo-formed) and `aScatteredPosition` (random spherical). `uMorphProgress` uniform (default 1.0) interpolates between them in the vertex shader — pre-allocated for Phase 16 dream dissolve/reform.

3. **Particle rendering**: Soft-circle fragment shader with secondary halo ring, AdditiveBlending, depth-correlated breathing (foreground breathes first, wave rolls into the scene), depth + luminance driven size variation.

4. **Wire connections**: Spatial hash grid for efficient neighbor lookup. Dense connections at depth edges (high Sobel gradient + distance threshold) + sparse ambient KNN connections. THREE.LineSegments with emissive color averaging and distance-faded alpha.

5. **Tier adaptation**: Full tier = 150K particles + wires + bloom-ready. Simplified = 50-60K grid only, no wires. Parallax = existing fallback + 12 sparse CSS-animated dots.

**CapsuleShell integration**: Added `renderMode: 'particle-memory'` dispatch, ParticleFieldRenderer wrapper component with Canvas/CinematicCamera/postprocessing, lazy-loaded ParticleMemoryField. Updated syros-cave to use particle-memory renderer.

## Tasks completed

| # | Task | Files | Commit |
|---|------|-------|--------|
| 1+2 | ParticleMemoryField with CPU sampling, dual buffers, breathing, wires | ParticleMemoryField.jsx | a976cdf |
| 3 | CapsuleShell dispatch + scene registry + CSS overlay | CapsuleShell.jsx, memoryScenes.js, MemoryPortal.css | c1b606c |

## Requirements addressed

- **INTEG-01**: `renderMode: 'particle-memory'` slots into CapsuleShell dispatch
- **INTEG-02**: Dual position buffers pre-allocated at init (aPhotoPosition + aScatteredPosition)
- **PART-01**: Photo + depth sampled into luminous particle field (80K-150K)
- **PART-02**: Wire connections via spatial hash (dense edges + sparse ambient)
- **PART-03** (partial): Breathing animation + shader halo glow
- **PART-04** (partial): Tier-adaptive counts + parallax CSS fallback

## Decisions made

- **Particle count**: ~78K grid base (280x280 sampling grid), up to ~150K with edge boost on full tier
- **Scattered distribution**: Random spherical, radius 2-8 units from center
- **Breathing**: `sin(time * 1.2 - depth * 3.0 + random * 0.8)` — depth-correlated, 1.2 Hz base
- **Wire connections**: ~10K max, 70% dense edge + 30% sparse ambient split
- **Spatial hash cell size**: 0.15 world units (tuned for depth-edge density)
- **Edge Sobel threshold**: 0.12 (catches depth discontinuities without noise)
- **Lazy loading**: ParticleMemoryField loaded via React.lazy() to avoid CapsuleShell bundle bloat
