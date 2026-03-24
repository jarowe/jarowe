# Plan 14-02 Summary: Breathing, Bloom, and Visual Polish

**Status:** Complete
**Executed:** 2026-03-23
**Duration:** ~15 minutes

## Tasks Completed

### 14-02-01: Refine breathing animation in vertex shader with depth wave + brightness oscillation
- Enhanced particle vertex shader with `breathScale` for +/- 12% size oscillation synchronized with the depth-correlated breathing wave
- Added `vBreathPhase` varying to pass breathing phase from vertex to fragment shader
- Fragment shader uses `brightnessPulse` (sin-based) for coherent brightness modulation
- Removed old `vAlpha += sin(breathPhase) * 0.08` pattern; brightness now handled in fragment

### 14-02-02: Add postprocessing bloom for full tier
- Created `ParticlePostProcessing` component with `EffectComposer` + `Bloom` (intensity 1.4, luminanceThreshold 0.35, mipmapBlur) + `Vignette` (offset 0.2, darkness 0.6)
- Uses `HalfFloatType` framebuffer for HDR bloom
- Bloom renders conditionally on full tier only: `{tier === 'full' && <ParticlePostProcessing />}`
- Simplified tier gets CSS `capsule-vignette` overlay instead
- Also created prerequisite infrastructure (ParticleFieldRenderer, ParticleMemoryField, particleSampler, CapsuleShell dispatch, memoryScenes update)

### 14-02-03: Add CinematicCamera to ParticleFieldRenderer
- Exported `CinematicCamera` from `CapsuleShell.jsx` as named export (`export function CinematicCamera`)
- Imported and rendered `CinematicCamera` in `ParticleFieldRenderer.jsx` with `scene.cameraKeyframes` and `fallbackTarget`
- Camera drives multi-beat GSAP keyframe choreography with mouse parallax

## Files Modified
- `src/components/particleMemory/particleShaders.js` — Created with breathing wave, breathScale, vBreathPhase, brightnessPulse
- `src/components/ParticleFieldRenderer.jsx` — Created with Canvas, ParticlePostProcessing, CinematicCamera, tier-adaptive rendering
- `src/components/particleMemory/ParticleMemoryField.jsx` — Created (prerequisite from 14-01)
- `src/components/particleMemory/particleSampler.js` — Created (prerequisite from 14-01)
- `src/pages/CapsuleShell.jsx` — Added particle-memory dispatch + exported CinematicCamera
- `src/data/memoryScenes.js` — Updated syros-cave to particle-memory renderMode with particleConfig

## Key Decisions
- Breathing brightness modulation moved entirely to fragment shader via `vBreathPhase` varying for cleaner shader architecture
- Bloom luminanceThreshold at 0.35 ensures only bright foreground particles contribute to bloom
- CinematicCamera exported as named export from CapsuleShell (non-breaking: default export unchanged)
- CSS vignette fallback for simplified tier avoids postprocessing overhead on mid-range devices

## Acceptance Criteria Verified
- All grep checks pass for breathScale, vBreathPhase, brightnessPulse, 0.12, EffectComposer, Bloom, luminanceThreshold 0.35, mipmapBlur, Vignette, HalfFloatType, tier === 'full', capsule-vignette, ParticlePostProcessing, export function CinematicCamera, CinematicCamera import/usage, keyframes, fallbackTarget
