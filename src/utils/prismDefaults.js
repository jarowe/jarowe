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
  canvasSize: 1200,
  featherInner: 9,
  featherOuter: 71,
  sceneCenterX: 50,
  sceneCenterY: 50,

  // Beam / rays
  beamOpacity: 1.0,
  rayOpacity: 0.85,

  // Light source + dispersion physics
  lightSourceX: -5.0,
  lightSourceY: 0.5,
  lightSourceZ: 3.0,
  baseDispersionAngle: 0.35,
  rotationDispersionMod: 0.5,
  rotationFanShift: 0.3,
  incidenceEffect: 0.4,
  beamAudioPulse: 0.3,
  rayAudioSpread: 0.15,

  // Beam / ray length (geometry scale)
  beamLength: 14,
  rayLength: 14,

  // Mouse proximity → dispersion
  mouseProximityEnabled: true,
  mouseProximityMin: 0.05,
  mouseProximityMax: 0.8,
  mouseProximitySpreadMin: 0.5,
  mouseProximitySpreadMax: 2.0,

  // Saber effects on white beam
  saberEnabled: true,
  saberCoreWidth: 1.0,
  saberGlowWidth: 1.0,
  saberPulseSpeed: 2.0,
  saberPulseIntensity: 0.5,
  saberFlickerSpeed: 8.0,
  saberFlickerIntensity: 0.15,
  saberColorTemp: 0.0,
  saberHDRIntensity: 2.0,
  saberStreakSpeed: 1.0,
  saberStreakIntensity: 0.6,
  saberGlowRadius: 2.5,
  saberGlowOpacity: 0.3,

  // Ray motion control
  rayJitter: 1.0,              // 0=rays perfectly still, 1=full rotation-driven motion
  portalExitSpread: 1.5,       // extra angular spread during portal exit (0=none)
  portalExitWiden: 1.0,        // individual ray width boost during portal exit

  // Edge glow
  edgeGlowOpacity: 0.7,

  // Vertex highlights
  vertexHighlightScale: 0.35,
  vertexHighlightPulse: 0.15,

  // Character scale
  characterScale: 0.3,

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

  // Bop counter position
  bopCounterOffsetX: 44,
  bopCounterOffsetY: -75,

  // Bubble controls
  bubbleOffsetX: 0,
  bubbleOffsetY: 0,
  bubbleFontSize: 0.8,
  bubbleMaxWidth: 260,
  bubblePadding: 14,
  bubbleThinkingEnabled: true,
  bubbleThinkingMs: 1200,
  bubbleAnimSpeed: 1.0,
  // Bubble position: 'auto' flips below when character is near top, 'above', 'below'
  bubblePosition: 'auto',
  // Lock bubble & counter to Glint's body (moves with character, tight positioning)
  bubbleLocked: true,

  // Peek animation lock ('' = random)
  lockedPeekStyle: 'portal',
  // Exit animation lock ('' = random, 'portal-exit' = always portal out)
  lockedExitStyle: '',
  // Always use portal exit when entrance was portal
  portalAlwaysExits: true,

  // Nebula backdrop opacity
  nebulaOpacity: 0.59,

  // Canvas masking
  canvasMask: true,

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
  portalColor2: [0.22, 0.741, 0.91],
  portalColor3: [0.957, 0.447, 0.722],
  portalConfettiEnabled: true,
  portalConfettiCount: 60,
  portalGatherMs: 500,
  portalRuptureMs: 500,
  portalEmergeMs: 900,
  portalResidualMs: 1800,
  portalFlashIntensity: 1.0,

  // Canvas portal VFX settings
  portalRingRadius: 60,
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
  showSpawnMarkers: true,

  // Hitbox (bop click target)
  hitboxShape: 'rect',   // 'circle' | 'rect'
  hitboxSize: 90,           // used for circle diameter
  hitboxWidth: 162,          // used for rect width
  hitboxHeight: 120,        // used for rect height
  hitboxBorderRadius: 16,   // used for rect corner rounding
  hitboxOffsetX: 0,
  hitboxOffsetY: 0,
  hitboxDebug: false,

  // Hover reaction
  hoverScale: 1.25,
  hoverExpression: 'surprised', // scared look on hover
  hoverGlowBoost: 0.65,
  hoverTremble: 0.35,

  // Angular physics
  angularDamping: 0.94,          // velocity decay per frame (higher = more floaty)
  angularBopStrength: 0.5,       // directional bop impulse strength
  angularBopZTorque: 0.15,       // diagonal corner twist amount
  angularDragSensitivity: 0.008, // drag-to-spin sensitivity
  angularWobbleAmp: 0.12,        // subtle X wobble amplitude
  portalSuckSpinMult: 6.0,       // spin acceleration during portal suck
  portalSuckDamping: 0.98,       // reduced friction during suck

  // Bop +1 effect
  bopPlusFontSize: 2.4,         // rem
  bopPlusGlowSize: 12,          // px shadow blur
  bopPlusGlowIntensity: 0.8,    // 0-1
  bopPlusDuration: 1.2,         // seconds
  bopPlusDistance: 140,          // px float upward
  bopPlusScale: 1.8,            // final scale multiplier
  bopPlusRandomColor: true,     // cycle through prismatic colors each bop
  bopPlusColor: '#fbbf24',      // base color (used when randomColor is off)
};
