/**
 * Memory Portal — Scene Registry
 *
 * Each entry describes a volumetric memory capsule: its 3D splat data,
 * narrative text, soundtrack, and camera placement.
 *
 * Adding a new scene = adding an entry here. The MemoryPortal page
 * resolves scenes by id via getSceneById().
 *
 * Paths are relative to public/ — the consuming component prefixes
 * with import.meta.env.BASE_URL at render time.
 */

const scenes = [
  {
    id: 'placeholder-scene',
    title: 'A Place That Matters',
    location: 'Memory Lane',
    coordinates: { lat: 0, lng: 0 },
    // Remote demo asset — replaced with a real captured .spz file later
    splatUrl:
      'https://huggingface.co/datasets/mkkellogg/gaussian-splat-data/resolve/main/bonsai/bonsai_trimmed.ksplat',
    splatIsRemote: true,
    previewImage: '/images/memory/placeholder-preview.jpg',
    soundtrack: null, // no placeholder audio — Howl creation is conditional
    narrative: [
      { text: 'Some places hold more than what you see.', delay: 2000 },
      {
        text: 'They hold the feeling of being exactly where you belong.',
        delay: 6000,
      },
      { text: 'This is one of those places.', delay: 11000 },
    ],
    cameraPosition: { x: 0, y: 1.5, z: 5 },
    cameraTarget: { x: 0, y: 0.5, z: 0 },
  },
];

/**
 * Look up a scene by id. Falls back to the first scene if not found.
 * @param {string} id
 * @returns {object}
 */
export function getSceneById(id) {
  return scenes.find((s) => s.id === id) || scenes[0];
}

export default scenes;
