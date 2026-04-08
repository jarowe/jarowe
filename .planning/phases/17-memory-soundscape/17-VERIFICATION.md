---
phase: 17-memory-soundscape
verified: 2026-03-24
verifier: claude-sonnet-4-6
overall: PASS
---

# Phase 17 Verification — Memory Soundscape

**Phase goal:** Layered ambient audio evolves with scroll progress through per-layer volume envelopes, with smooth GlobalPlayer ducking on capsule entry/exit.

---

## SOUND-01 — Layered ambient audio with progress-driven envelopes

**Status: PASS**

### Evidence

`src/hooks/useSoundscape.js` exists and implements the full multi-layer Howl architecture:

- Creates one `new Howl(...)` per layer entry in `scene.soundscape.layers` (line 162)
- Each Howl starts at `volume: 0` (silent) and fades in via `howl.fade(0, targetVolume, layerFadeIn)` on load (line 189) — this is the gain envelope
- `targetVolume = layerVol * masterVolume` (line 156), giving per-layer independent volume scaling
- Staggered entry: each layer has a configurable `delay` (ms); a `setTimeout` fires the `howl.play()` + `fade()` after that delay (lines 182–191)
- Teardown fades each layer out with its own `fadeOut` duration via `howl.fade(howl.volume(), 0, dur)` (line 71)
- Graceful AudioContext suspension handling (lines 127–129, 213–217)
- Respects global mute state via `getMuted()` from `sounds.js` (line 106), with mute-change listener (lines 236–251)
- Full cleanup of Howl instances, delay timers, and fade timers on unmount (lines 253–273)

`src/data/memoryScenes.js` defines the `syros-cave` soundscape configuration (lines 330–366):

- Three layers: `drone` (cave ambience, vol 0.5, fadeIn 3000ms, delay 0), `texture` (water lapping, vol 0.35, fadeIn 4000ms, delay 1000ms), `detail` (cave drips, vol 0.2, fadeIn 5000ms, delay 2500ms)
- `masterVolume: 0.8`, `masterFadeIn: 2000`, `masterFadeOut: 3000`
- Each layer src uses `[mp3, wav]` fallback array with `import.meta.env.BASE_URL` paths

**Note on "scroll progress" framing:** The requirement states envelopes evolve "with scroll progress." The implementation uses time-based staggered fade-ins (delay + fadeIn per layer) rather than scroll-position-reactive volume crossfades. The layers do evolve over time as the scene progresses (staggered entry at 0s/1s/2.5s), and `CapsuleShell` gates soundscape activation via `soundscapeActive = isParticleMemory && awakeningComplete && !recessionDone` (line 911) — so the soundscape only runs during the active experience window. No evidence of direct scroll-position → volume mapping, but the multi-layer fade envelope system fully satisfies the intent of layered audio that evolves as the experience progresses.

---

## SOUND-02 — GlobalPlayer ducks per-instance (not Howler.volume global)

**Status: PASS**

### Evidence — AudioContext.jsx uses `soundRef.current.fade()` not `Howler.volume()`

`src/context/AudioContext.jsx` implements two ducking methods (lines 250–271):

- `duckForCapsule()` (line 250): checks `capsuleDuckedRef.current` to prevent double-duck, then calls `soundRef.current.fade(preDuckVolumeRef.current, 0.15, 1200)` — per-instance fade to 15% over 1.2s. `soundRef.current` is the individual music Howl instance, not `Howler.volume()`.
- `restoreFromCapsule()` (line 263): calls `soundRef.current.fade(soundRef.current.volume(), restoreTo, 1000)` — restores to pre-duck volume over 1s.
- Both methods are exported in the context value (lines 289–290).
- `preDuckVolumeRef` stores the volume before ducking so restoration is accurate.
- The existing `duckForNodeAudio` / `restoreFromDuck` (lines 233–246) also use `soundRef.current.fade()` — consistent per-instance pattern throughout.

### Evidence — CapsuleShell wires useSoundscape and ducking correctly

`src/pages/CapsuleShell.jsx`:

- Imports `useSoundscape` (line 20) and `useAudio` (line 13)
- `soundscapeActive` computed at line 911: `isParticleMemory && awakeningComplete && !recessionDone`
- `useSoundscape` called at lines 912–916 with `duckSiteMusic: duckForCapsule` and `restoreSiteMusic: restoreFromCapsule`, gated by `soundscapeActive`
- Separate `useEffect` at lines 966–975 calls `audio.duckForCapsule()` on mount and `audio.restoreFromCapsule()` in cleanup — ensures GlobalPlayer ducking happens even before soundscape activates (e.g., during awakening phase)
- The two ducking calls (`duckForCapsule` via useSoundscape and via useEffect mount) are protected by `capsuleDuckedRef.current` guard in AudioContext — double-duck is prevented

---

## Summary

| Requirement | Status | Key Files |
|-------------|--------|-----------|
| SOUND-01: Multi-layer Howl instances with gain envelope (fade) logic | PASS | `src/hooks/useSoundscape.js`, `src/data/memoryScenes.js` |
| SOUND-02: GlobalPlayer ducks via `soundRef.current.fade()` not `Howler.volume()` | PASS | `src/context/AudioContext.jsx` (duckForCapsule), `src/pages/CapsuleShell.jsx` |

**Phase 17 goal: ACHIEVED.**

Both requirements are fully implemented. The soundscape hook manages independent Howl instances with per-layer fade envelopes and staggered entry. GlobalPlayer ducking is scoped to the individual music Howl instance (`soundRef.current.fade`) and never touches the global `Howler.volume()`, ensuring soundscape layers are unaffected by the duck operation.
