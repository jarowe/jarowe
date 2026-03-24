/**
 * memoryScenes.js — Registry of immersive memory-capsule scenes.
 *
 * Each entry describes a single memory location with its soundscape layers,
 * narrative overlays, and visual configuration. The `soundscape` object
 * defines up to 3 audio layers (ambient, detail, music) that useSoundscape
 * manages as independent Howl instances with gain envelopes.
 *
 * Audio files live in public/audio/soundscapes/<sceneId>/.
 */

const memoryScenes = {
  'syros-cave': {
    id: 'syros-cave',
    title: 'The Cave at Syros',
    subtitle: 'Cyclades, Greece — Summer 2024',
    description:
      'A hidden sea cave on the southern coast of Syros where turquoise water meets ancient limestone. The boys discovered it on a morning kayak trip.',
    // Soundscape: 3 layered audio tracks with individual gain envelopes.
    // Each layer has: src (relative to BASE_URL), volume (0-1), loop (bool),
    // fadeIn (ms), fadeOut (ms).
    soundscape: {
      layers: [
        {
          id: 'ambient',
          src: '/audio/soundscapes/syros-cave/cave-water-drips.mp3',
          volume: 0.6,
          loop: true,
          fadeIn: 2000,
          fadeOut: 1500,
        },
        {
          id: 'detail',
          src: '/audio/soundscapes/syros-cave/ocean-waves-echo.mp3',
          volume: 0.35,
          loop: true,
          fadeIn: 3000,
          fadeOut: 2000,
        },
        {
          id: 'music',
          src: '/audio/soundscapes/syros-cave/cave-ambience-pad.mp3',
          volume: 0.2,
          loop: true,
          fadeIn: 4000,
          fadeOut: 3000,
        },
      ],
    },
    // Narrative text overlays shown during the capsule experience
    narrative: [
      { time: 0, text: 'A hidden sea cave on the coast of Syros.' },
      { time: 5, text: 'The boys found it on a morning kayak trip.' },
      { time: 12, text: 'Turquoise water meeting ancient limestone.' },
    ],
    // Future: splat URL, camera path, visual FX config
    splat: null,
    portalColor: '#0ea5e9',
  },
};

export default memoryScenes;

/**
 * Get a scene by its ID.
 * @param {string} sceneId
 * @returns {object|null}
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
