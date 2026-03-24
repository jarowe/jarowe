# Phase 17: Memory Soundscape - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Layered ambient audio (drone, texture, detail) evolves with scroll progress through per-layer volume envelopes, with smooth GlobalPlayer ducking on capsule entry/exit — the flight has an emotional sound journey, not silence. Audio assets should feel real and scene-appropriate, not synthesized placeholders.

</domain>

<decisions>
## Implementation Decisions

### Soundscape Layers & Progress Envelopes
- **D-01:** Three audio layers — drone (low foundation), texture (mid atmosphere: wind, water echoes), detail (high highlights: bell tones, drips, stone resonance). Three gives depth without complexity.
- **D-02:** Short looping audio files loaded via Howler.js. Consistent with existing GlobalPlayer audio stack. 3 files, 10-30s loops each, ~100-200KB total per scene. Format: WebM/OGG for broad browser support.
- **D-03:** Per-layer gain curves mapped to flight progress 0→1. Drone starts loud, fades by 0.8. Texture peaks at 0.3-0.6. Detail peaks at 0.7-1.0. Curves defined per-scene in memoryScenes config. Creates evolving soundscape as you fly deeper.
- **D-04:** Smooth fade-in over 1.5s on capsule entry, fade-out over 1s on exit. No audio pop or abrupt start. ROADMAP SC2: "fades in smoothly on entry, fades out on exit."

### GlobalPlayer Ducking & Audio Coexistence
- **D-05:** Smooth volume reduction to 15% over 1s on capsule entry, restore over 1s on exit. Reuses existing `duckForCapsule`/`restoreFromCapsule` pattern from CapsuleShell Phase 11. Music still audible as a whisper underneath.
- **D-06:** Skip ducking if user has no music playing. Check Howler playing state before ducking. If no music, soundscape owns the audio space.
- **D-07:** Respect global mute toggle. If user muted audio via site's mute button, don't play soundscape layers. Consistent with existing audio system.
- **D-08:** Real-feeling ambient material for audio assets. Low drone bed can be synthesized. But texture and detail layers MUST be real-feeling ambient recordings: sea, cave air, stone resonance, distant bell/metal artifacts. Even rough sourced/processed placeholders are better than pure oscillator pads. The memory should feel embodied, not prototyped.

### Claude's Discretion
- Exact gain curve shapes (linear, exponential, custom)
- Loop crossfade technique (gapless looping)
- Howler pool configuration for 3 simultaneous sources
- Audio file format fallbacks
- Gain curve interpolation method (lerp vs smoothstep)
- How to source/create ambient audio assets for syros-cave (process existing samples, generate via AI tools, use royalty-free libraries)
- Internal component decomposition (useSoundscape hook vs SoundscapeManager)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 17 Requirements
- `.planning/REQUIREMENTS.md` §v2.2 — SOUND-01, SOUND-02

### Existing Code (build on top of)
- `src/pages/CapsuleShell.jsx` — duckForCapsule/restoreFromCapsule pattern, flightProgressRef, soundtrack integration
- `src/components/ParticleFieldRenderer.jsx` — onProgress callback exposes flight progress
- `src/components/particleMemory/FlightCamera.jsx` — Flight progress ref
- `src/data/memoryScenes.js` — Scene registry with soundtrack field (existing ducking pattern)
- `src/context/AudioContext.jsx` — Global audio state (mute, volume)
- `src/components/GlobalPlayer.jsx` — Howler-based music player

### Audio Patterns
- `src/data/sounds.js` — Web Audio API sine tones (for reference only — soundscape uses Howler)
- `src/context/AudioContext.jsx` — AudioProvider, mute state, global volume
- CapsuleShell.jsx soundtrack integration (lines ~500-550) — existing Howler-based per-scene audio

### Prior Phase Context
- `.planning/phases/15-memory-flight-controller/15-CONTEXT.md` — Flight progress system (0→1 float that drives soundscape)
- `.planning/phases/11-cinematic-polish/11-CONTEXT.md` — Soundtrack ducking pattern

### Research Flags (from STATE.md)
- Phase 17 (audio assets): Each scene needs 2-4 ambient layers (drone, wind, texture, climax). Source during Phase 15/16 so Phase 17 has real content.
- NEVER use createMediaElementSource — takes over audio output through separate AudioContext
- NEVER use html5: true with Howler for analyser — bypasses Web Audio graph
- Howler Web Audio mode (default): XHR download → BufferSource → masterGain → destination

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `duckForCapsule`/`restoreFromCapsule` in CapsuleShell — existing volume ducking for per-scene soundtracks. Phase 17 reuses this for GlobalPlayer ducking.
- `AudioContext.jsx` — Global mute state, audio provider wrapping app.
- `Howler.js` — Already used for GlobalPlayer, soundtrack per-scene audio. Phase 17 adds 3 more Howl instances per scene.
- `flightProgressRef` — Already exposed by CapsuleShell, written by FlightCamera via onProgress callback. Phase 17 reads this to drive gain envelopes.

### Established Patterns
- Howler in Web Audio mode (default) — XHR download, BufferSource, masterGain. NEVER html5:true.
- `Howler.ctx` resume in user-gesture callstack
- `duckForCapsule` pattern: Howler._howls volume tweening
- Per-scene config in memoryScenes.js (soundtrack field pattern)

### Integration Points
- `CapsuleShell.jsx` — Start/stop soundscape on capsule open/close, read flightProgressRef
- `memoryScenes.js` — Add soundscape config (layer URLs, gain curves) to scene entries
- `AudioContext.jsx` — Check mute state before playing layers

</code_context>

<specifics>
## Specific Ideas

- The soundscape should feel embodied — cave water, stone resonance, distant metal, not synth pads
- Three layers is enough to feel dimensional for one flagship scene
- Progress-mapped gain curves are the correct interactive primitive — sound evolves as you fly deeper
- Smooth entry/exit fades keep the capsule from fighting the rest of the site audio system
- Duck GlobalPlayer to a whisper (15%), don't mute it — maintains audio context
- Audio assets can be rough/processed but must feel scene-appropriate for syros-cave

</specifics>

<deferred>
## Deferred Ideas

- Audio-reactive particle displacement (Web Audio analyser → shader uniforms) — CAPSULE-04, future milestone
- Per-scene custom soundtracks — future milestone (soundtrack per scene exists, but curated ambient is different)
- Spatial audio (3D positioning of layers relative to camera) — future enhancement
- Multiple scene soundscapes — future milestone (one flagship first)

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-memory-soundscape*
*Context gathered: 2026-03-24 via smart discuss*
