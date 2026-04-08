# Phase 17-02 Summary: Capsule Audio Ducking & Soundscape Wiring

**Status:** Complete
**Duration:** ~8 min
**Commits:** 3

## Tasks Completed

### Task 1: Per-instance capsule ducking in AudioContext.jsx
- Added `duckForCapsule()` / `restoreFromCapsuleDuck()` methods
- Fades music Howl instance to 15% volume over 1.2s (not Howler.volume global)
- Uses `capsuleDuckedRef` to prevent double-duck
- Exported in context value for consumer use

### Task 2: useSoundscape hook + memoryScenes data
- Created `src/hooks/useSoundscape.js` — manages up to 3 Howl instances per scene
  - Lazy Howl creation on first `start()`, auto-unload on unmount
  - Per-layer volume, loop, fadeIn/fadeOut envelopes
  - Handles AudioContext suspension gracefully
- Created `src/data/memoryScenes.js` — scene registry with `syros-cave` entry
  - 3 soundscape layers: ambient drips (0.6), ocean waves (0.35), ambient pad (0.2)
  - Narrative text overlays with time-based sequencing
  - Portal color, description, future splat placeholder
- Created placeholder MP3 files in `public/audio/soundscapes/syros-cave/`

### Task 3: CapsuleShell page + route wiring
- Created `src/pages/CapsuleShell.jsx` — full-screen memory capsule viewer
  - Click gate: shows scene title/subtitle, requires user interaction before audio
  - `soundscapeActive` state gates both soundscape start and music ducking
  - On activate: calls `duckForCapsule()` + `useSoundscape.start()`
  - On unmount: calls `stop()` + `restoreFromCapsuleDuck()`
  - Narrative text sequencer runs scene.narrative entries on timed intervals
  - Audio status indicator (green dot when active)
  - Back link + graceful 404 for unknown scenes
- Added lazy-loaded `/memory/:sceneId` route to `src/App.jsx`

## Files Changed
- `src/context/AudioContext.jsx` — +26 lines (capsule ducking)
- `src/hooks/useSoundscape.js` — new (106 lines)
- `src/data/memoryScenes.js` — new (80 lines)
- `src/pages/CapsuleShell.jsx` — new (213 lines)
- `src/App.jsx` — +6 lines (lazy import + route)
- `public/audio/soundscapes/syros-cave/` — 3 placeholder MP3s

## Build Verification
- `npx vite build` succeeds (11.94s, no errors)
- CapsuleShell code-splits into its own chunk

## Architecture Notes
- Ducking is per-Howl-instance (soundRef.current.fade), never touches Howler.volume()
- useSoundscape is decoupled from AudioContext — it manages its own Howls
- CapsuleShell consumes both useSoundscape and useAudio independently
- Soundscape layers are additive (each plays at its own volume)
- No dependency on actual audio files — placeholder empty MP3s prevent 404 errors
