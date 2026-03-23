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
 *
 * cameraKeyframes: Array<{ position: {x,y,z}, target: {x,y,z}, duration: number (sec),
 *   ease: string (GSAP ease), hold: number (sec pause at this beat) }> | null
 * mood: 'warm' | 'cool' | 'golden' | null — color grading preset (Phase 11 CINE-04)
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
    mood: 'cool',
    cameraKeyframes: null, // splat scenes use their own camera controls
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
    mood: 'warm',
    cameraKeyframes: [
      {
        // Beat 1: Push in — viewer is drawn into the memory
        // Starts immediately. Holds until ~2s when first narrative card appears.
        position: { x: 0, y: 0, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        duration: 2,
        ease: 'power1.out',
        hold: 0,
      },
      {
        // Beat 2: Slow drift right — card 1 visible at 2s, drift begins
        // 4s transition lands at ~6s when card 2 appears
        position: { x: 0.4, y: 0.1, z: 2.6 },
        target: { x: 0.1, y: 0, z: 0 },
        duration: 4,
        ease: 'power2.inOut',
        hold: 0,
      },
      {
        // Beat 3: Gentle pull back — card 2 visible at 6s, pull-back begins
        // 5s transition lands at ~11s when card 3 appears
        position: { x: -0.2, y: 0.15, z: 2.8 },
        target: { x: -0.05, y: 0.05, z: 0 },
        duration: 5,
        ease: 'sine.inOut',
        hold: 2,
      },
    ],
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
