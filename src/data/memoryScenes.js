/**
 * memoryScenes.js — Memory scene registry
 *
 * Each scene represents a meaningful location from Jared's life that can be
 * experienced as an immersive memory capsule. Scenes define their visual
 * assets, narrative text, and ambient soundscape configuration.
 *
 * Soundscape layers:
 *   - drone:   Low continuous ambient bed (synth pad, wind, room tone)
 *   - texture: Mid-layer environmental detail (water, birds, crowd murmur)
 *   - detail:  Sporadic foreground accents (drips, footsteps, distant bells)
 *
 * Each layer specifies:
 *   - src:      Path to audio file (relative to public/)
 *   - volume:   Base volume 0-1 (before global volume scaling)
 *   - loop:     Whether the layer loops continuously
 *   - fadeIn:   Fade-in duration in ms when soundscape activates
 *   - fadeOut:  Fade-out duration in ms when soundscape deactivates
 *   - delay:    Optional delay in ms before this layer starts (staggered entry)
 */

const BASE = import.meta.env.BASE_URL;

export const memoryScenes = {
  'syros-cave': {
    id: 'syros-cave',
    title: 'The Cave at Syros',
    subtitle: 'Syros, Greece — Summer 2024',
    description:
      'A hidden sea cave on the coast of Syros where the family explored during their three-month worldschooling stay in Greece. The sound of lapping water echoes off ancient stone walls while light filters through the narrow entrance.',
    // Visual assets (to be populated when splat/media files are added)
    splat: null,
    thumbnail: null,
    // Narrative overlay beats
    narrative: [
      { time: 0, text: 'The cave mouth opens to the Aegean...' },
      { time: 8, text: 'Light dances on the water, painting the walls in shifting blues.' },
      { time: 18, text: 'The boys\' voices echo off ancient stone.' },
    ],
    // Soundscape configuration — three-layer ambient mix
    soundscape: {
      // Master gain for the entire soundscape (0-1)
      masterVolume: 0.8,
      // Fade durations for the overall soundscape envelope
      masterFadeIn: 2000,
      masterFadeOut: 3000,
      layers: [
        {
          id: 'drone',
          label: 'Cave Ambience',
          src: [`${BASE}audio/soundscapes/syros-cave-drone.mp3`, `${BASE}audio/soundscapes/syros-cave-drone.wav`],
          volume: 0.5,
          loop: true,
          fadeIn: 3000,
          fadeOut: 4000,
          delay: 0,
        },
        {
          id: 'texture',
          label: 'Water Lapping',
          src: [`${BASE}audio/soundscapes/syros-cave-water.mp3`, `${BASE}audio/soundscapes/syros-cave-water.wav`],
          volume: 0.35,
          loop: true,
          fadeIn: 4000,
          fadeOut: 3000,
          delay: 1000,
        },
        {
          id: 'detail',
          label: 'Cave Drips',
          src: [`${BASE}audio/soundscapes/syros-cave-drips.mp3`, `${BASE}audio/soundscapes/syros-cave-drips.wav`],
          volume: 0.2,
          loop: true,
          fadeIn: 5000,
          fadeOut: 2000,
          delay: 2500,
        },
      ],
    },
    // Portal transition config
    portal: {
      type: 'dissolve',
      duration: 1500,
    },
  },
};

/**
 * Look up a scene by ID.
 * @param {string} sceneId
 * @returns {object|null} Scene config or null if not found
 */
export function getScene(sceneId) {
  return memoryScenes[sceneId] ?? null;
}

/**
 * Get all scene IDs.
 * @returns {string[]}
 */
export function getSceneIds() {
  return Object.keys(memoryScenes);
}

export default memoryScenes;
