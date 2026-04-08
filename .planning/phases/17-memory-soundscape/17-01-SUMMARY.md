---
phase: 17-memory-soundscape
plan: 01
subsystem: audio
tags: [howler, web-audio, soundscape, ambient, gain-envelope, memory-scene]

# Dependency graph
requires: []
provides:
  - Memory scene registry (memoryScenes.js) with soundscape config for syros-cave
  - useSoundscape React hook with multi-layer gain envelope system
  - Placeholder audio assets (WAV) for syros-cave scene (drone, water, drips)
  - Placeholder generation script for development
affects: [portal-scene-components, memory-capsule-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-layer-howler-soundscape, gain-envelope-fade, staggered-layer-entry, music-ducking]

key-files:
  created:
    - src/data/memoryScenes.js
    - src/hooks/useSoundscape.js
    - public/audio/soundscapes/README.md
    - public/audio/soundscapes/syros-cave-drone.wav
    - public/audio/soundscapes/syros-cave-water.wav
    - public/audio/soundscapes/syros-cave-drips.wav
    - scripts/generate-soundscape-placeholders.mjs
  modified: []

key-decisions:
  - decision: "Use Howler.js Web Audio mode for soundscape layers (consistent with AudioContext.jsx)"
    rationale: "Never html5:true, never createMediaElementSource — follows established codebase patterns for reliable Web Audio graph integration"
  - decision: "WAV placeholders with MP3 fallback array in Howler src"
    rationale: "WAV can be generated without external tools; MP3 is the production target. Howler.js src array tries formats in order."
  - decision: "Three-layer soundscape model (drone/texture/detail) with staggered entry"
    rationale: "Creates depth and realism — drone establishes the space, texture adds environmental character, detail adds foreground specificity"
  - decision: "Duck site music via existing duckForNodeAudio/restoreFromDuck"
    rationale: "Reuses the proven pattern from constellation node audio, avoids competing audio sources"
---

# 17-01 Summary: Memory Soundscape Foundation

## What was built

### Task 17-01-01: memoryScenes.js scene registry
- Created `src/data/memoryScenes.js` with scene registry for memory capsules
- `syros-cave` scene fully configured with metadata, narrative beats, and soundscape layers
- Three-layer soundscape: drone (cave ambience), texture (water lapping), detail (cave drips)
- Each layer has independent volume, loop, fadeIn/fadeOut, and delay settings
- Exports: `memoryScenes`, `getScene(id)`, `getSceneIds()`

### Task 17-01-02: useSoundscape hook
- Created `src/hooks/useSoundscape.js` — React hook for ambient soundscape playback
- Multi-layer Howler.js management with gain envelope transitions
- Staggered layer entry via configurable delay timers
- Coordinated fade-out on unmount/scene change with per-layer fade durations
- Ducks site music via AudioContext `duckForNodeAudio`/`restoreFromDuck` callbacks
- Respects global mute state from `sounds.js getMuted()`
- Graceful error handling — missing audio files don't crash the scene
- Full cleanup of Howl instances, delay timers, and fade timers on unmount
- Returns: `{ isPlaying, isLoading, error, stop }`

### Task 17-01-03: Audio assets and placeholder generator
- Created `public/audio/soundscapes/` directory with README documenting asset specs
- Generated three 30-second placeholder WAV files via `scripts/generate-soundscape-placeholders.mjs`
  - `syros-cave-drone.wav` — Low sine wave with LFO modulation (cave resonance)
  - `syros-cave-water.wav` — Filtered noise with rhythmic amplitude modulation (water)
  - `syros-cave-drips.wav` — Sporadic percussive tones with decay (drips)
- README documents production asset requirements and recommended sources

## Build verification
- `npx vite build` succeeds with no errors
- No new dependencies added (Howler.js already in project)

## Usage example
```jsx
import { useSoundscape } from '../hooks/useSoundscape';
import { useAudio } from '../context/AudioContext';

function MemoryScene({ sceneId }) {
  const { duckForNodeAudio, restoreFromDuck } = useAudio();
  const { isPlaying, isLoading, error, stop } = useSoundscape(sceneId, {
    duckSiteMusic: duckForNodeAudio,
    restoreSiteMusic: restoreFromDuck,
  });
  // ...
}
```
