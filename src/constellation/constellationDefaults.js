// Centralized constellation visual defaults — imported by scene files & ConstellationEditor.
// Push-to-live targets this file when file === 'constellation'

export const CONSTELLATION_DEFAULTS = {
  // ── Camera ──
  autoRotateSpeed: 0.35,
  focusedRotateSpeed: 0.15,
  dampingFactor: 0.05,
  flyToDuration: 1.5,
  flyToStepDuration: 0.8,
  focusDistance: 35,
  focusYLift: 8,
  tunnelFocusDistance: 45,

  // ── Depth of Field & Post-processing ──
  focusedBokehScale: 6,
  unfocusedBokehScale: 1,
  focusedFocusRange: 12,
  unfocusedFocusRange: 80,
  unfocusedFocusDist: 120,
  dofLerpSpeed: 0.04,
  vignetteOffset: 0.15,
  vignetteDarkness: 0.5,
  ambientLightIntensity: 0.15,

  // ── Bloom ──
  bloomEnabled: true,
  bloomIntensity: 0.4,
  bloomThreshold: 0.6,
  bloomSmoothing: 0.9,
  bloomRadius: 0.8,

  // ── Chromatic Aberration ──
  chromaticEnabled: true,
  chromaticOffset: 0.0005,

  // ── Film Grain ──
  grainEnabled: true,
  grainOpacity: 0.04,

  // ── Tone Mapping ──
  toneMappingEnabled: true,

  // ── Connection Lines ──
  lineDashSize: 1.8,
  lineGapSize: 1.2,
  lineFlowSpeed: 0.3,
  lineFlowSpeedHighlight: 1.2,
  lineOpacityHelixMin: 0.03,
  lineOpacityHelixMax: 0.06,
  lineOpacityParticleMin: 0.015,
  lineOpacityParticleMax: 0.025,
  lineOpacityFocusedMin: 0.5,
  lineOpacityFocusedMax: 0.9,
  lineOpacityDim: 0.015,
  lineWidthHelixMin: 0.4,
  lineWidthHelixMax: 0.7,
  lineWidthFocusedMin: 1.0,
  lineWidthFocusedMax: 2.0,
  lineWidthDim: 0.3,
  lineTintStrength: 0.35,
  lineTintStrengthHighlight: 0.6,

  // ── Helix Nodes ──
  nodeBaseScale: 1.4,
  milestoneScale: 1.4,
  projectScale: 1.15,
  momentScale: 1.0,
  significanceScaleBoost: 0.5,
  significanceBrightnessBoost: 0.8,
  nodeBrightnessBase: 0.5,
  nodeBrightnessRange: 0.8,
  nodeFocusDim: 0.15,
  nodeFocusBright: 1.3,
  nodePulseAmpMin: 0.02,
  nodePulseAmpRange: 0.06,
  nodePulseSpeed: 0.5,
  nodePhaseSpread: 0.3,
  nodeEmissiveIntensity: 0.6,
  nodeEmissiveRange: 1.4,
  nodeFocusedEmissivePulse: 2.5,
  nodeFocusedPulseSpeed: 2.0,

  // ── Particle Cloud ──
  particleSizeBase: 6.0,
  particleSizeRange: 6.0,
  particleOpacity: 0.65,
  particleOpacityFocused: 0.5,
  particleOpacityTunnel: 0.12,
  particleDriftSpeedX: 0.15,
  particleDriftSpeedY: 0.1,
  particleDriftSpeedZ: 0.12,
  particleDriftAmplitudeX: 0.8,
  particleDriftAmplitudeY: 0.4,
  particleDriftAmplitudeZ: 0.8,

  // ── Helix Backbone ──
  strandColor0: '#4d99ff',
  strandColor1: '#ff66b2',
  strandOpacity: 0.42,
  strandWidth: 2.2,
  rungColor: '#b3b3ff',
  rungOpacity: 0.25,
  rungWidth: 1.0,
  markerSizeBase: 3.0,
  markerSizeRange: 4.0,
  markerBrightnessBase: 0.8,
  markerBrightnessRange: 0.8,
  markerGlowRadius: 0.6,
  markerGlowFalloff: 2.5,

  // ── Starfield ──
  starCount: 2200,
  starRadius: 200,
  starDepth: 100,
  starBrightness: 5,
  starTwinkleSpeed: 1.2,
  starColorVariation: 0.15,
  starWarmRatio: 0.3,
  ambientLifeEnabled: true,
  shootingStarsEnabled: true,
  shootingStarIntervalMin: 8,
  shootingStarIntervalMax: 14,
  shootingStarDuration: 0.85,
  shootingStarLength: 26,
  shootingStarBrightness: 0.9,
  connectionPulseEnabled: true,
  connectionPulseIntervalMin: 12,
  connectionPulseIntervalMax: 20,
  connectionPulseDuration: 1.5,
  connectionPulseOpacityBoost: 0.45,
  connectionPulseWidthBoost: 0.55,
  connectionPulseFlowBoost: 1.8,
  backboneEnergyEnabled: true,
  backboneEnergyIntervalMin: 10,
  backboneEnergyIntervalMax: 18,
  backboneEnergyDuration: 2.6,
  backboneEnergyBandSize: 18,
  backboneEnergyBoost: 0.6,

  // ── Nebula Fog ──
  nebulaEnabled: true,
  nebulaOpacity: 0.06,
  nebulaSecondaryOpacity: 0.04,
  nebulaAccentOpacity: 0.07,
  nebulaScale: 1.0,

  // ── Scene Fog ──
  fogEnabled: true,
  fogNear: 150,
  fogFar: 420,
  fogColor: '#080810',

  // ── Evidence Colors ──
  colorTemporal: '#60a5fa',
  colorSemantic: '#a78bfa',
  colorThematic: '#34d399',
  colorNarrative: '#fbbf24',
  colorSpatial: '#fb923c',
};

/** localStorage key for persisted config overrides */
export const CONSTELLATION_CONFIG_KEY = 'jarowe_constellation_config';

/**
 * Read a single config value.
 * Priority: window.__constellationConfig > localStorage > default.
 * Scene files call this every frame via useFrame for real-time editor updates.
 */
export function getConstellationConfig(key) {
  return window.__constellationConfig?.[key] ?? CONSTELLATION_DEFAULTS[key];
}

/**
 * Shorthand alias used inside scene components.
 */
export const getCfg = getConstellationConfig;
