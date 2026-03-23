/**
 * Memory Portal — Scene Registry
 *
 * Each entry describes a volumetric memory capsule: its 3D splat data,
 * narrative text, soundtrack, and camera placement.
 */

const scenes = [
  {
    id: 'placeholder-scene',
    title: 'A Place That Matters',
    location: 'Memory Lane',
    coordinates: { lat: 0, lng: 0 },
    // Remote splat with Access-Control-Allow-Origin: * (CORS safe)
    // antimatter15's train scene — outdoor environment, ~32MB
    // Note: Git LFS files don't deploy on Vercel, so remote URL is required
    splatUrl: 'https://antimatter15.com/splat-data/train.splat',
    splatIsRemote: true,
    previewImage: '/images/memory/placeholder-preview.jpg',
    soundtrack: null,
    narrative: [
      { text: 'Some places hold more than what you see.', delay: 2000 },
      {
        text: 'They hold the feeling of being exactly where you belong.',
        delay: 6000,
      },
      { text: 'This is one of those places.', delay: 11000 },
    ],
    // Camera for train scene — slightly elevated, looking along tracks
    cameraPosition: { x: -3.5, y: 0.5, z: 1.5 },
    cameraTarget: { x: 0, y: 0.2, z: -2 },
  },
];

export function getSceneById(id) {
  return scenes.find((s) => s.id === id) || scenes[0];
}

export default scenes;
