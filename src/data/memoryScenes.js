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
 * samMaskUrl: string | null — SAM-generated binary mask PNG (white=foreground, black=background)
 * layerSeparation: { foregroundDepthScale, backgroundDepthScale, foregroundDriftSpeed, backgroundDriftSpeed } | null
 * arc: { awakeningDuration, awakeningEase, awakeningDelay, recessionDuration, recessionEase, recessionDelay, recessionFadeColor } | null
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
    // SAM layer separation (not used for splat scenes)
    samMaskUrl: null,
    layerSeparation: null,
    // Experience arc (not used for splat scenes)
    arc: null,
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
    soundtrack: 'memory/test-capsule/soundtrack.mp3',
    narrative: [
      {
        // Card 1: Place — where are we? (appears after awakening, synced to camera beat 2)
        text: 'The light here is different. It moves like it remembers something too.',
        delay: 2000,
      },
      {
        // Card 2: Feeling — what does it feel like? (synced to camera beat 3)
        text: 'Everything slowed down. The boys running ahead, Maria beside me. We were exactly where we were supposed to be.',
        delay: 6000,
      },
      {
        // Card 3: Meaning — why does it matter? (synced to camera pull-back)
        text: 'You spend your whole life building toward something. And then one afternoon, you realize you already have it.',
        delay: 11000,
      },
      {
        // Card 4: Gratitude — the final thought before recession
        text: 'This is what I want to remember.',
        delay: 16000,
      },
    ],
    cameraPosition: { x: 0, y: 0, z: 3 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    mood: 'warm',
    // SAM layer separation (ARC-02) — foreground at different depth rhythm than background
    samMaskUrl: 'memory/test-capsule/mask.png',
    layerSeparation: {
      foregroundDepthScale: 1.2,   // foreground displaced at 1.2x depthScale
      backgroundDepthScale: 0.8,   // background at 0.8x — "looking through a window"
      foregroundDriftSpeed: 1.0,    // relative drift speed for foreground
      backgroundDriftSpeed: 0.6,    // slower drift for background — different emotional rhythm
    },
    // Experience arc timing (ARC-01, ARC-03)
    arc: {
      awakeningDuration: 3.5,       // seconds for depthScale 0→1 (ARC-01)
      awakeningEase: 'power2.out',  // soft organic ease — "something being remembered"
      awakeningDelay: 0.5,          // brief pause before depth starts
      recessionDuration: 3.0,       // seconds for depthScale 1→0 (ARC-03)
      recessionEase: 'power2.in',   // gentle fade out
      recessionDelay: 20,           // seconds after mount before recession begins
      recessionFadeColor: [1.0, 0.98, 0.95], // warm white fade target
    },
    cameraKeyframes: [
      {
        // Beat 1: Awakening hold — camera still while depth wakes up
        position: { x: 0, y: 0, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        duration: 2,
        ease: 'power1.out',
        hold: 0,
      },
      {
        // Beat 2: Slow drift right — card 1 visible at 2s
        position: { x: 0.4, y: 0.1, z: 2.6 },
        target: { x: 0.1, y: 0, z: 0 },
        duration: 4,
        ease: 'power2.inOut',
        hold: 0,
      },
      {
        // Beat 3: Gentle pull back + slight rise — card 2 visible at 6s
        position: { x: -0.2, y: 0.2, z: 2.8 },
        target: { x: -0.05, y: 0.05, z: 0 },
        duration: 5,
        ease: 'sine.inOut',
        hold: 2,
      },
      {
        // Beat 4: Final settling — card 3 at 11s, card 4 at 16s, then recession
        position: { x: 0.1, y: 0.05, z: 2.9 },
        target: { x: 0, y: 0, z: 0 },
        duration: 4,
        ease: 'power1.inOut',
        hold: 3,
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
