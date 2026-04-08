---
phase: 14-particle-field-core
plan: 03
subsystem: renderer
tags: [three.js, r3f, shader, glsl, particles, webgl, wire-connections, spatial-hash, tier-adaptation]

# Dependency graph
requires:
  - phase: 14-particle-field-core
    plan: 02
    provides: ParticleFieldRenderer, particleSampler, particleShaders, ParticleMemoryField (modular)
provides:
  - wireConnections.js: SpatialHash class + computeWireConnections() for ~10K LineSegments
  - wireShaders.js: emissive wire GLSL with distance-faded alpha + breathing pulse
  - isEdgeFlags in particleSampler output for dense vs sparse wire connection split
  - ParticleMemoryField now renders <lineSegments> alongside <points> when wireData present
  - ParticleFieldRenderer computes wires for full tier, skips for simplified
  - Parallax fallback verified: CSS particle dots render for particle-memory scenes
affects: [15-memory-flight-controller, 16-dream-portal-transition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spatial hash grid for O(n) wire connection precomputation"
    - "Dense edge + sparse ambient dual-pass wire connection strategy (70/30 budget)"
    - "Tier-gated wire computation: full tier only, simplified skips entirely"
    - "AdditiveBlending LineSegments with uTime alpha pulse"

key-files:
  created:
    - src/components/particleMemory/wireConnections.js
    - src/components/particleMemory/wireShaders.js
  modified:
    - src/components/particleMemory/particleSampler.js
    - src/components/particleMemory/ParticleMemoryField.jsx
    - src/components/ParticleFieldRenderer.jsx
  deleted:
    - src/pages/ParticleMemoryField.jsx (dead monolithic code from 14-01)
---

# Plan 14-03 Summary — Wire Connections + Tier Adaptation

## What was built

**Wire connection system** for the modular particle memory architecture:

1. **wireConnections.js** — `SpatialHash` class with O(n) neighbor lookup and `computeWireConnections()` that builds ~10K LineSegments from particle data. Two-pass strategy: dense connections at depth edges (70% budget, high Sobel gradient particles within distance threshold) + sparse ambient KNN connections (30% budget, sampled subset of non-edge particles).

2. **wireShaders.js** — GLSL vertex/fragment shaders for wire rendering. Emissive color averaged from connected particle colors, alpha fading with 3D distance between endpoints, gentle breathing pulse via uTime.

3. **ParticleMemoryField.jsx** — Updated to accept optional `wireData` prop. When present, renders `<lineSegments>` with AdditiveBlending alongside existing `<points>`. Wire material shares uTime animation loop.

4. **ParticleFieldRenderer.jsx** — After particle sampling, computes wire connections for full tier only. Simplified tier skips wire computation entirely (not just hidden — no CPU cycles wasted). Passes wireData to ParticleMemoryField.

5. **particleSampler.js** — Now returns `isEdgeFlags` Float32Array (1.0 for edge-boost particles, 0.0 for grid particles) needed by wire connection computation for dense vs sparse split.

6. **Cleanup** — Removed dead monolithic `src/pages/ParticleMemoryField.jsx` (671 lines, not imported anywhere since 14-02 extracted modular components).

## Tasks completed

| # | Task | Files | Commit |
|---|------|-------|--------|
| 1 | Wire connection module + shaders + sampler edge flags | wireConnections.js, wireShaders.js, particleSampler.js | 3e373ea |
| 2 | Integrate wires into ParticleMemoryField component | ParticleMemoryField.jsx | dbb4b52 |
| 3 | Compute wires in ParticleFieldRenderer, gate by tier | ParticleFieldRenderer.jsx | ee66d54 |
| 4 | Verify parallax fallback, build success, remove dead code | ParticleMemoryField.jsx (deleted) | 57804c5 |

## Requirements addressed

- **PART-02**: Wire connections via spatial hash (dense edges + sparse ambient) as LineSegments
- **PART-04**: Tier adaptation verified — full tier gets wires + bloom, simplified skips wires + bloom, parallax falls to CSS dots

## Decisions made

- **Wire cell size**: 0.04 world units (tuned for modular architecture's coordinate space)
- **Edge distance threshold**: 0.06 (dense connections at depth contours)
- **Sparse distance threshold**: 0.15 (ambient web whispers, not shuts frame)
- **Edge connection cap**: 3 per particle (restraint per context doc)
- **Max connections**: 10K (70% edge + 30% sparse, as specified in D-05)
- **Wire pulse**: sin(uTime * 0.8) * 0.15 — gentle, doesn't compete with particle breathing
- **Dead code**: Removed monolithic 14-01 file since modular components are the active path

## Verification

- `grep -r "LineSegments\|SpatialHash" src/components/particleMemory/` — passes
- `grep -r "simplified\|parallax" src/components/ParticleFieldRenderer.jsx` — passes
- `npx vite build` — succeeds with no errors
