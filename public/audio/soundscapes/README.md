# Soundscape Audio Assets

This directory holds ambient audio layers for memory scene soundscapes.

## File Naming Convention

```
{scene-id}-{layer-id}.mp3
```

Example for the `syros-cave` scene:
- `syros-cave-drone.mp3` — Low continuous ambient bed
- `syros-cave-water.mp3` — Mid-layer water texture
- `syros-cave-drips.mp3` — Foreground cave drip accents

## Asset Requirements

### General
- Format: MP3 (128-192 kbps) for production, WAV for source/editing
- Sample rate: 44.1 kHz
- Channels: Stereo preferred, mono acceptable for detail layers
- Duration: 30-120 seconds (loops seamlessly)
- Loop points: Clean crossfade or seamless loop — no clicks or pops at the boundary

### Layer Types

**Drone (ambient bed)**
- Character: Deep, warm, continuous tone. Could be a synth pad, wind, or room tone.
- For `syros-cave`: Reverberant cave resonance with subtle low-frequency warmth.
  Think: the sound of standing in a large stone chamber near the sea.
  Frequency range: mostly 60-400 Hz with some harmonic content up to 2 kHz.

**Texture (environmental detail)**
- Character: Recognizable environmental sound that establishes the location.
- For `syros-cave`: Gentle water lapping against stone. Irregular but rhythmic.
  Not crashing waves — more like a calm bay or grotto where water gently moves.
  Some low splashes, the hollow echo of water against rock walls.

**Detail (foreground accents)**
- Character: Sporadic, specific sounds that add realism and depth.
- For `syros-cave`: Occasional water drips from the cave ceiling. Irregular timing.
  Each drip should have a slight reverb tail suggesting a large stone space.
  Could include occasional distant bird calls or the faint echo of voices.

## Placeholder Generation

To generate minimal placeholder audio files for development:

```bash
node scripts/generate-soundscape-placeholders.mjs
```

This creates simple synthesized tones as stand-ins. Replace with real ambient
recordings or high-quality synthesized soundscapes for production.

## Recommended Sources for Real Assets

- **Freesound.org** — CC-licensed field recordings (search "cave ambience", "water drips", "sea cave")
- **BBC Sound Effects** — High-quality environmental recordings
- **Custom synthesis** — Use a DAW (Ableton, Logic, Reaper) to layer field recordings with synth pads
- **AI generation** — Tools like ElevenLabs Sound Effects or Stable Audio can generate ambient textures

## Integration

Soundscape config lives in `src/data/memoryScenes.js`. The `useSoundscape` hook
in `src/hooks/useSoundscape.js` loads these files via Howler.js in Web Audio mode
and manages gain envelopes for smooth transitions.
