// Central source of truth for all tunable globe shader parameters.
// Both the shaders (Home.jsx) and the editor (GlobeEditor.jsx) import from here.

export const GLOBE_DEFAULTS = {
  // ── Surface Day/Night ──
  dayStrengthMin: -0.77,
  dayStrengthMax: 0.41,

  // ── City Lights ──
  cityGateMin: 0.215,
  cityGateMax: 0.37,
  cityLightColor: [0.996, 0.706, 0.302],
  cityLightBoost: [0, 0, 0],
  cityGlowPow: 0.9,
  cityGlowMult: 1.5,

  // ── Land Material ──
  landFresnelPow: 5.9,
  landFresnelMult: 0.42,
  landSpecPow: 70.0,
  landSpecMult: 0.23,
  bumpStrength: 0.6,

  // ── Water ──
  waterThresholdMin: 0.3,
  waterThresholdMax: 0.7,
  deepSeaColor: [0.027451, 0.0352941, 0.0509804],
  midSeaColor: [0.02, 0.08, 0.22],
  shallowSeaColor: [0.06, 0.18, 0.38],
  waterSpecPow: 291.0,
  waterSpecMult: 1.3,
  waterGlarePow: 39.5,
  waterGlareMult: 0.3,
  waterFresnelPow: 8.5,
  waterWaveSpeed: 5,
  waterWaveScale: 3.0,
  waterCurrentStrength: 3.0,
  waterNormalStrength: 1.0,
  waterDetailScale: 1240.0,
  waterBigWaveScale: 565.0,
  waterCausticsStrength: 0.2,
  waterSunGlitter: 0.15,
  waterFoamStrength: 0.01,
  waterSubsurfaceColor: [0, 0.4, 0.3],
  waterSubsurfaceStrength: 0.16,

  // ── Surface Atmosphere ──
  atmosDayColor: [0.3, 0.7, 1],
  atmosTwilightColor: [0.74, 0.29, 0.04],
  atmosBlendMin: -0.25,
  atmosBlendMax: 0.75,
  atmosMixMin: -0.5,
  atmosMixMax: 1.0,
  atmosFresnelPow: 2.0,
  atmosStrength: 0.45,

  // ── Sunset/Terminator ──
  sunsetColor: [0.867, 0.447, 0.294],
  sunsetStrength: 0.14,
  terminatorSoftness: 0.35,
  terminatorGlow: 0.2,

  // ── Clouds ──
  cloudAlphaMin: 0.0,
  cloudAlphaMax: 1.0,
  cloudOpacity: 0.99,
  cloudLitColor: [1, 0.99, 0.96],
  cloudShadowColor: [0.15, 0.18, 0.25],
  cloudDayFactorMin: -0.15,
  cloudDayFactorMax: 0.5,
  cloudTerminatorColor: [1, 0.459, 0.102],
  cloudTerminatorMult: 2.0,
  cloudRimPow: 3.5,
  cloudRimStrength: 0.3,
  cloudSubsurfaceColor: [0.15, 0.12, 0.08],
  cloudSilverLiningColor: [1, 0.97, 0.93],

  // ── Atmosphere Rim ──
  rimRadius: 103,
  rimFresnelPow: 3.4,
  rimGlowMult: 1.5,
  rimDayColor: [0.3, 0.65, 1],
  rimTwilightColor: [0.85, 0.35, 0.06],
  rimNightColor: [0.05, 0.08, 0.2],
  rimNightToTwilightMin: -1.0,
  rimNightToTwilightMax: 0.0,
  rimTwilightToDayMin: 0.0,
  rimTwilightToDayMax: 0.6,
  rimSunMaskMin: -0.8,
  rimSunMaskMax: 0.6,
  rimBacklitMin: -0.3,
  rimBacklitMax: -0.05,
  rimBacklitFadeMin: -0.8,
  rimBacklitFadeMax: -0.3,
  rimBacklitWeight: 0.98,
  rimFadeout: 0.3,

  // ── Atmosphere Halo ──
  haloRadius: 108,
  haloFresnelPow: 4.1,
  haloGlowMult: 3.0,
  haloDayColor: [0.2, 0.5, 0.9],
  haloTwilightColor: [0.6, 0.25, 0.04],
  haloBlendMin: 0.2,
  haloBlendMax: 1.33,
  haloSunMaskMin: -0.2,
  haloSunMaskMax: 0.26,
  haloFadeout: 0.46,

  // ── Aurora Borealis ──
  auroraEnabled: true,
  auroraColor1: [0.1, 0.95, 0.3],
  auroraColor2: [0.2, 0.4, 0.95],
  auroraColor3: [0.6, 0.1, 0.8],
  auroraIntensity: 0.85,
  auroraSpeed: 0.45,
  auroraLatitude: 57.0,
  auroraWidth: 23.0,
  auroraNoiseScale: 4.2,
  auroraHeight: 101.5,
  auroraCurtainPow: 2.6,
  auroraEvolution: 1.05,
  auroraWaveSpeed: 0.8,

  // ── Prismatic Glow Layer ──
  prismGlowEnabled: true,
  prismGlowColor1: [0.2, 0.6, 1],
  prismGlowColor2: [0.5, 0.1, 0.9],
  prismGlowColor3: [0.1, 0.9, 0.4],
  prismGlowIntensity: 1.3,
  prismGlowSpeed: 0.6,
  prismGlowNoiseScale: 6.9,
  prismGlowFresnelPow: 2.0,
  prismGlowHeight: 101.2,
  prismGlowRotSpeed: 0.05,
  prismGlowTiltX: 0.0,
  prismGlowTiltZ: 0.0,

  // ── Environment Glow Layer ──
  envGlowEnabled: true,
  envGlowColor1: [0.1, 0.4, 1],
  envGlowColor2: [0.7, 0.1, 0.9],
  envGlowColor3: [0.1, 0.9, 0.5],
  envGlowIntensity: 0.62,
  envGlowSpeed: 0.25,
  envGlowNoiseScale: 4.9,
  envGlowHeight: 102.0,
  envGlowCoverage: 0.65,
  envGlowTiltX: 0.0,
  envGlowTiltZ: 0.0,

  // ── Lava Lamp Layer ──
  lavaLampEnabled: true,
  lavaLampColor1: [0.1, 0.8, 0.5],
  lavaLampColor2: [0.7, 0.1, 0.85],
  lavaLampColor3: [0.05, 0.3, 0.95],
  lavaLampIntensity: 0.305,
  lavaLampSpeed: 0.12,
  lavaLampScale: 2.3,
  lavaLampHeight: 102.5,
  lavaLampBlobSize: 2.7,
  lavaLampFeather: 2.81,

  // ── Shader Lighting ──
  shaderAmbient: 0.07,
  shaderSunMult: 1.15,

  // ── Scene Lights ──
  ambientIntensity: 0.4,
  sunIntensity: 5.8,

  // ── Particles: Stars ──
  starTwinkleBase: 0.63,
  starTwinkleDepth: 0.6,
  starTwinkleSpeed: 1.5,
  starSize: 1.8,

  // ── Particles: Dust ──
  dustSize: 0.4,
  dustSpeed: 1.5,
  dustAmplitude: 2.8,

  // ── Particles: Mouse ──
  mouseRippleRadius: 14.5,
  mouseRippleStrength: 1.0,       // multiplier for ripple push force (default was effectively 3.0, now scaled as strength * 3.0)

  // ── Particles: Wind (interactive fluid physics) ──
  windParticlesVisible: true,
  windParticleCount: 30000,
  windGravity: 15,
  windInfluenceRadius: 17.5,
  windDamping: 0.968,
  windEscapeVelocity: 1.26,
  windColorSpeed: 0.1,
  windTrailEffect: 0.999,
  windParticleSize: 0.05,
  windParticleOpacity: 0.2,
  windSpinInfluence: 0.55,
  windSpinSmoothing: 8,
  windSpinDecay: 0.941,
  windSpinMax: 6.5,
  windTurbulence: 2.05,
  windVortexStrength: 2.35,
  windHomeForce: 0.25,
  windMaxSpeed: 4.2,
  windShellInner: 101.0,
  windShellOuter: 110.0,

  // ── Cloud Mesh ──
  cloudMeshRadius: 100.8,
  cloudRotationSpeed: 0.012,

  // ── Camera ──
  cameraStartAlt: 3.2,
  cameraStartLatOffset: 25,
  cameraStartLngOffset: -50,
  cameraIntroAlt: 1.5,
  cameraIntroSpeed: 4000,
  cameraLocationAlt: 1.6,
  cameraLocationSpeed: 2500,
  cameraCycleInterval: 8000,
  cameraBopZoomPunch: 0.04,
  cameraBopShakeIntensity: 0.5,

  // ── Time Control ──
  timeOverrideHour: -1,

  // ── Animation ──
  animationPaused: false,

  // ── Globe Breakout (sphere pokes above bento card) ──
  globeBreakout: true,
  globeBreakoutPx: 200,
  glassClipTop: 0,
  glassClipFeather: 200,
  breakoutSoftBlend: 46,
  breakoutContentThreshold: 1,

  // ── Glass Border (PP shader liquid glass) ──
  glassThickness: 30,
  glassIntensity: 0.8,
  glassTintColor: [0.4, 0.6, 1],

  // ── Expedition Photo Card ──
  photoCardTop: 2,
  photoCardRight: -27,
  photoCardWidth: 160,

  // ── Message Bubble ──
  msgBubbleBottom: 68,
  msgBubbleRight: -12,

  // ── Visibility Toggles ──
  satellitesVisible: true,
  planesVisible: true,
  carsVisible: true,
  wispsVisible: true,
  cloudsVisible: true,
  lensFlareVisible: true,
  dustVisible: true,
  starsVisible: true,

  // ── CSS Overlay Layers ──
  fogLayerEnabled: true,
  particlesLayerEnabled: false,
  innerGlowEnabled: true,

  // ── Glass Edge Effect ──
  glassSweepEnabled: true,
  glassShimmerEnabled: false,
  glassSweepOpacity: 1.0,
  glassShimmerOpacity: 0.0,

  // ── Individual Lens Flare Components ──
  flareMainVisible: true,
  flareRaysVisible: true,
  flareHaloVisible: true,
  flareAnamorphicVisible: true,
  flareArtifactsVisible: true,

  // ── Object Speeds & Scales ──
  satelliteSpeed: 1.0,
  planeSpeed: 1.0,
  wispSpeed: 1.0,
  satelliteScale: 0.4,
  planeScale: 1.0,
  carScale: 1.0,
  wispScale: 1.0,

  // ── Overlay Graphics ──
  arcStroke: 0.5,
  arcDashLength: 0.4,
  arcDashGap: 0.2,
  arcDashAnimateTime: 2000,
  ringMaxRadius: 2.0,
  ringPropagationSpeed: 1.0,
  ringRepeatPeriod: 1000,
  labelSize: 1.2,
  labelDotRadius: 0.3,

  // ── Glint Effector ──
  bopDecayRate: 0.12,
  bopParticleBurst: 1.4,
  bopColorShift: 0.37,
  bopGlowBoost: 0.3,
  bopAuroraBoost: 1.6,
  bopCloudFlash: 0.3,
  bopWaterRipple: 0.62,
  bopStarBurst: 1.3,
  bopEnvGlowBoost: 1.1,
  bopLavaLampBoost: 1.5,
  bopLightShow: true,

  // ── Advanced Lens Flare ──
  flareEdgeDiffraction: 2.0,
  flareStarburstStrength: 0.67,
  flareAnamorphicStrength: 1.09,

  // ── Sun Rays (3D volumetric beams from sun) ──
  sunRaysEnabled: true,
  sunRaysIntensity: 0.04,
  sunRaysLength: 3.4,
  sunRaysCount: 12,
  sunRaysColor: [1, 0.95, 0.8],

  // ── God Rays (Screen-space PP radial blur) ──
  godRaysEnabled: true,
  godRaysDensity: 0.1,
  godRaysWeight: 0.05,
  godRaysDecay: 0.9,
  godRaysExposure: 0.25,
  godRaysSamples: 60,

  // ── Post-Processing ──
  ppEnabled: true,
  ppChromaticAberration: 0.009,
  ppVignetteStrength: 0.29,
  ppVignetteRadius: 1.0,
  ppBrightness: 0.03,
  ppContrast: 0.97,
  ppSaturation: 0.96,
  ppGamma: 1.0,
  ppTint: [0.949, 0.965, 0.969],
  ppFilmGrain: 0.016,
  ppScanLines: 0.17,
  ppScanLineSpeed: 1.1,

  // ── TV/Camera Effects ──
  tvEnabled: true,
  tvGlitch: 0.0,
  tvGlitchSpeed: 0.0,
  tvScanLineJitter: 0.03,
  tvColorBleed: 0.04,
  tvStaticNoise: 0.12,
  tvBarrelDistortion: 0.02,
  tvRGBShift: 0.16,

  // ── Map Badge (Location Bar) ──
  badgeBgOpacity: 0.31,
  badgeBlur: 12,
  badgeBorderOpacity: 0.18,
  badgeRadius: 20,
  badgeFontSize: 0.8,
  badgePadding: 0.35,
  badgeBottom: 1.0,
  badgeInset: 1.0,

  // ── Globe Tour ──
  globeTourEnabled: true,
  globeTourDwellTime: 6000,
  globeTourTransitTime: 2000,
  globeTourAltitude: 1.5,
  globeTourAutoAdvance: true,
  globeTourMarkerScale: 1.5,
  globeTourGlintOffsetX: -60,
  globeTourGlintOffsetY: 100,
};
