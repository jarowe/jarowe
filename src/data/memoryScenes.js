/**
 * Memory Capsule — Scene Registry
 *
 * Each entry describes a memory capsule: its rendering mode, asset paths,
 * narrative text, soundtrack, and camera placement.
 *
 * renderMode determines which renderer CapsuleShell routes to:
 *   'displaced-mesh' → DisplacedMeshRenderer (photo + depth map → 3D mesh)
 *   'splat'          → SplatRenderer (gaussian splats)
 *   'parallax'       → ParallaxFallback (CSS parallax + Ken Burns)
 */

const scenes = [
  {
    id: 'placeholder-scene',
    title: 'A Place That Matters',
    location: 'Memory Lane',
    coordinates: { lat: 0, lng: 0 },
    renderMode: 'splat',
    // Splat fields
    splatUrl: 'data/memory-scene.splat',
    splatIsRemote: false,
    // Displaced mesh fields (null for splat scenes)
    photoUrl: null,
    depthMapUrl: null,
    depthConfig: null,
    // Shared fields
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
  {
    id: 'test-capsule',
    title: 'Test Memory',
    location: 'Development',
    coordinates: { lat: 0, lng: 0 },
    renderMode: 'displaced-mesh',
    // Displaced mesh fields
    photoUrl: 'memory/test-capsule/photo.png',
    depthMapUrl: 'memory/test-capsule/depth.png',
    depthConfig: {
      depthScale: 2.0,
      depthBias: 0.0,
      depthContrast: 1.0,
      discardThreshold: 0.15,
    },
    // Splat fields (null for displaced-mesh scenes)
    splatUrl: null,
    splatIsRemote: false,
    // Shared fields
    previewImage: 'memory/test-capsule/preview.jpg',
    soundtrack: null,
    narrative: [
      { text: 'Some places hold more than what you see.', delay: 2000 },
      {
        text: 'They hold the feeling of being exactly where you belong.',
        delay: 6000,
      },
      { text: 'This is one of those places.', delay: 11000 },
    ],
    cameraPosition: { x: 0, y: 0, z: 3 },
    cameraTarget: { x: 0, y: 0, z: 0 },
  },
];

export function getSceneById(id) {
  return scenes.find((s) => s.id === id) || scenes[0];
}

/**
 * Returns default depth configuration for displaced-mesh scenes.
 * Used as a starting point when creating new scene entries.
 */
export function getDefaultDepthConfig() {
  return {
    depthScale: 2.0,
    depthBias: 0.0,
    depthContrast: 1.0,
    discardThreshold: 0.15,
  };
}

export default scenes;
