// Centralized prism character defaults — imported by Prism3D.jsx & GlobeEditor.jsx
// Push-to-live targets this file when file === 'prism'

export const PRISM_DEFAULTS = {
  // Shape
  shape: 'rounded-prism',

  // Mouse reactivity
  driftStrength: 0.8,
  driftSpeed: 0.04,
  driftTiltX: 0.15,
  driftTiltY: 0.1,
  rayBendAmount: 0.12,
  rayVerticalBend: 0.06,
  beamTrackAmount: 0.12,
  eyeTrackSpeed: 0.06,
  eyeTrackRange: 0.5,
  rotationMouseInfluence: 0.5,

  // Particles
  sparkleCount: 30,
  sparkleSize: 2.5,
  sparkleSpeed: 0.5,
  sparkleOpacity: 0.8,

  // Lighting
  ambientIntensity: 0.4,
  keyLightIntensity: 3,
  fillLightIntensity: 1.5,
  internalGlowIntensity: 1.5,
  internalGlowDistance: 4,
  lightSpillIntensity: 1.0,

  // Animation
  floatSpeed: 2,
  rotationIntensity: 0.3,
  floatIntensity: 0.5,
  rotationSpeed: 0.2,
  breathingAmp: 0.02,
  breathingSpeed: 0.8,

  // Canvas / display
  canvasSize: 1600,
  featherInner: 5,
  featherOuter: 98,
  sceneCenterX: 50,
  sceneCenterY: 50,

  // Beam / rays
  beamOpacity: 1.0,
  rayOpacity: 0.85,

  // Edge glow
  edgeGlowOpacity: 0.7,

  // Vertex highlights
  vertexHighlightScale: 0.35,
  vertexHighlightPulse: 0.15,

  // Character scale
  characterScale: 1.0,

  // Mouth position / scale
  mouthX: 0,
  mouthY: -0.32,
  mouthZ: 0.58,
  mouthScaleX: 0.7,
  mouthScaleY: 0.55,

  // Glass refraction controls
  glassIOR: 0.67,
  causticIntensity: 1.0,
  iridescenceIntensity: 1.0,
  chromaticSpread: 1.0,
  glassAlpha: 0.22,
  streakIntensity: 1.0,

  // Glass mode
  glassMode: 'shader',
  mtmThickness: 1.0,
  mtmRoughness: 0.05,
  mtmIOR: 1.5,
  mtmChromatic: 1.0,
  mtmTransmission: 1.0,
  mtmBackside: true,
  hybridMtmScale: 1.06,
  hybridBlend: 0.5,
  hybridEnvIntensity: 0.4,
  hybridShaderAdd: 0.6,

  // Bubble controls
  bubbleOffsetX: 0,
  bubbleOffsetY: 0,
  bubbleFontSize: 0.8,
  bubbleMaxWidth: 260,
  bubblePadding: 14,
  bubbleThinkingEnabled: true,
  bubbleThinkingMs: 1200,
  bubbleAnimSpeed: 1.0,

  // Peek animation lock ('' = random)
  lockedPeekStyle: '',

  // Nebula backdrop opacity
  nebulaOpacity: 0.85,

  // Canvas masking
  canvasMask: false,

  // Wireframe / edge controls
  wireframeOpacity: 0.2,
  edgeThresholdAngle: 20,

  // Music reactivity
  musicReactivity: 0.5,
  musicScalePulse: 0.15,
  musicRotationBoost: 0.3,
  musicGlowPulse: 0.5,

  // ── Portal entrance effects ──
  portalColor1: [0.486, 0.227, 0.929],
  portalColor2: [0.220, 0.741, 0.910],
  portalColor3: [0.957, 0.447, 0.722],
  portalConfettiEnabled: true,
  portalConfettiCount: 60,
  portalGatherMs: 500,
  portalRuptureMs: 500,
  portalEmergeMs: 900,
  portalResidualMs: 1800,
  portalFlashIntensity: 1.0,

  // Canvas portal VFX settings
  portalRingRadius: 140,
  portalWobble: 1.0,
  portalGlowIntensity: 1.0,
  portalInteriorEnabled: true,
  portalParticleMultiplier: 1.0,

  // Rick & Morty seep pre-noise
  portalSeepEnabled: true,
  portalSeepDuration: 800,
  portalSeepColor: [0.133, 0.773, 0.349],
  portalSeepIntensity: 0.8,

  // Spawn
  spawnScale: 1.0,
  showSpawnMarkers: false,
};
