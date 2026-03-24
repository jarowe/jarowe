# Summary: 16-01 — Directional Tunnel Scatter + Morph Stagger Foundation

**Status:** Complete
**Duration:** ~5 min
**Commits:** 3

## What was done

### Task 16-01-01: Directional tunnel scatter in particleSampler.js
Replaced the spherical golden-ratio scattered position distribution with an elongated ellipsoid aligned to the Z-axis (camera travel direction). The new distribution uses:
- `tunnelStretch` config (default 3.5) to stretch Z-axis creating cigar-shaped scatter volume
- `tunnelForwardBias` config (default 0.3) to shift center of mass toward +Z (destination)
- Power-law radial distribution (`Math.sqrt`) biasing particles toward tunnel walls for layered depth bands
- Same golden-ratio angular distribution for deterministic, cluster-free placement

**File:** `src/components/particleMemory/particleSampler.js`

### Task 16-01-02: uMorphStagger uniform in particle shaders
Added `uMorphStagger` uniform to the vertex shader that computes per-particle effective morph progress:
```glsl
float staggerOffset = aDepthValue * uMorphStagger;
float effectiveMorph = clamp(uMorphProgress - staggerOffset, 0.0, 1.0);
```
Foreground particles (low depth) converge first during reform; background lags behind. When uMorphStagger=0.0 (default), behavior is unchanged from Phase 15.

**File:** `src/components/particleMemory/particleShaders.js`

### Task 16-01-03: Expose uMorphStagger + wireUniforms via ref
Added `uMorphStagger: { value: 0.0 }` to the particle uniforms ref. Expanded `useImperativeHandle` to expose both `uniforms` and `wireUniforms`, enabling downstream plans (16-02 DreamTransition, 16-03 wire flashes) to control all transition parameters via the field ref.

**File:** `src/components/particleMemory/ParticleMemoryField.jsx`

## Verification

- Build succeeds (`npx vite build` -- 29.80s, no errors)
- `tunnelStretch` present in particleSampler.js (directional distribution confirmed)
- `uMorphStagger` present in particleShaders.js (2 matches: uniform decl + effective morph usage)
- `wireUniforms` exposed in ParticleMemoryField.jsx useImperativeHandle
- Default behavior preserved (uMorphStagger=0.0 produces identical morph as before)
- Deterministic scatter (no Math.random -- golden ratio + modular arithmetic only)

## Files Modified

| File | Change |
|------|--------|
| `src/components/particleMemory/particleSampler.js` | Directional tunnel scatter replacing spherical distribution |
| `src/components/particleMemory/particleShaders.js` | uMorphStagger uniform + depth-staggered effective morph |
| `src/components/particleMemory/ParticleMemoryField.jsx` | uMorphStagger init + wireUniforms exposed via ref |
