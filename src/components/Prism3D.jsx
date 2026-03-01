import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

/* ═══════════ GLOBAL PRISM CONFIG (GlobeEditor writes, Prism3D reads) ═══════════ */
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
  sceneCenterX: 50,  // % - CSS mask anchor X
  sceneCenterY: 50,  // % - CSS mask anchor Y
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
  glassMode: 'shader',    // 'shader' | 'mtm' | 'hybrid'
  mtmThickness: 1.0,
  mtmRoughness: 0.05,
  mtmIOR: 1.5,
  mtmChromatic: 1.0,
  mtmTransmission: 1.0,
  mtmBackside: true,
  hybridMtmScale: 1.06,
  hybridBlend: 0.5,         // 0 = pure shader, 1 = pure MTM
  hybridEnvIntensity: 0.4,  // environment map brightness for MTM refraction content
  hybridShaderAdd: 0.6,     // how much shader effect overlays additively onto MTM
  // Bubble controls
  bubbleOffsetX: 0,
  bubbleOffsetY: 0,
  bubbleFontSize: 0.8,
  bubbleMaxWidth: 260,
  bubblePadding: 14,
  // Peek animation lock ('' = random)
  lockedPeekStyle: '',
  // Canvas masking (off = no clipping)
  canvasMask: false,
  // Wireframe / edge controls
  wireframeOpacity: 0.2,
  edgeThresholdAngle: 20,
  // Music reactivity
  musicReactivity: 0.5,
  musicScalePulse: 0.15,
  musicRotationBoost: 0.3,
  musicGlowPulse: 0.5,
};

/* ═══════════ GLASS PRESETS (built-in per mode) ═══════════ */
export const GLASS_PRESETS = [
  // ── Custom Shader presets ──
  {
    name: 'Default',
    description: 'Factory default — the proven look',
    glassMode: 'shader',
    glassIOR: 0.67, causticIntensity: 1.0, iridescenceIntensity: 1.0,
    chromaticSpread: 1.0, glassAlpha: 0.22, streakIntensity: 1.0,
  },
  {
    name: 'Prismatic Crystal',
    description: 'Default balanced look',
    glassMode: 'shader',
    glassIOR: 0.67, causticIntensity: 1.0, iridescenceIntensity: 1.0,
    chromaticSpread: 1.0, glassAlpha: 0.22, streakIntensity: 1.0,
  },
  {
    name: 'Diamond Fire',
    description: 'Intense caustics + high streaks',
    glassMode: 'shader',
    glassIOR: 0.45, causticIntensity: 2.5, iridescenceIntensity: 0.6,
    chromaticSpread: 1.8, glassAlpha: 0.18, streakIntensity: 2.2,
  },
  {
    name: 'Opal Glow',
    description: 'Max iridescence, soft',
    glassMode: 'shader',
    glassIOR: 0.8, causticIntensity: 0.5, iridescenceIntensity: 2.5,
    chromaticSpread: 2.0, glassAlpha: 0.30, streakIntensity: 0.4,
  },
  {
    name: 'Dark Amethyst',
    description: 'Deep interior, sharp edges',
    glassMode: 'shader',
    glassIOR: 0.35, causticIntensity: 1.8, iridescenceIntensity: 1.2,
    chromaticSpread: 0.5, glassAlpha: 0.45, streakIntensity: 1.5,
  },
  // ── Real Glass (MTM) presets ──
  {
    name: 'Clear Crystal',
    description: 'Clean glass refraction',
    glassMode: 'mtm',
    mtmThickness: 0.8, mtmRoughness: 0.02, mtmIOR: 1.5,
    mtmChromatic: 0.8, mtmTransmission: 1.0, mtmBackside: true,
  },
  {
    name: 'Frosted Glass',
    description: 'Blurred refraction',
    glassMode: 'mtm',
    mtmThickness: 2.0, mtmRoughness: 0.35, mtmIOR: 1.4,
    mtmChromatic: 0.3, mtmTransmission: 0.9, mtmBackside: true,
  },
  {
    name: 'Prism Rainbow',
    description: 'Maximum chromatic dispersion',
    glassMode: 'mtm',
    mtmThickness: 1.5, mtmRoughness: 0.03, mtmIOR: 2.0,
    mtmChromatic: 3.0, mtmTransmission: 1.0, mtmBackside: true,
  },
  {
    name: 'Heavy Crystal',
    description: 'Thick dense glass',
    glassMode: 'mtm',
    mtmThickness: 4.0, mtmRoughness: 0.08, mtmIOR: 1.8,
    mtmChromatic: 1.5, mtmTransmission: 0.85, mtmBackside: true,
  },
  // ── Hybrid presets ──
  {
    name: 'Perfect Blend',
    description: 'THE hand-tuned ideal — real glass clarity + colorful shader overlay',
    glassMode: 'hybrid',
    hybridBlend: 0.6, hybridShaderAdd: 0.8, hybridEnvIntensity: 0.7, hybridMtmScale: 1.0,
    // Shader side: moderate effects, low alpha so additive overlay enhances without overpowering
    glassIOR: 0.55, causticIntensity: 1.5, iridescenceIntensity: 1.4,
    chromaticSpread: 1.4, glassAlpha: 0.12, streakIntensity: 1.0,
    // MTM side: clear glass with strong chromatic for rainbow splitting
    mtmThickness: 1.0, mtmRoughness: 0.02, mtmIOR: 1.7,
    mtmChromatic: 2.0, mtmTransmission: 0.95, mtmBackside: true,
  },
  {
    name: 'Glass + Fire',
    description: 'MTM base with intense caustic overlay',
    glassMode: 'hybrid',
    hybridBlend: 0.7, hybridShaderAdd: 1.0, hybridEnvIntensity: 0.8, hybridMtmScale: 1.0,
    glassIOR: 0.45, causticIntensity: 2.5, iridescenceIntensity: 0.6,
    chromaticSpread: 1.8, glassAlpha: 0.14, streakIntensity: 2.2,
    mtmThickness: 0.8, mtmRoughness: 0.02, mtmIOR: 1.5,
    mtmChromatic: 0.8, mtmTransmission: 1.0, mtmBackside: true,
  },
  {
    name: 'Ethereal',
    description: 'Soft dreamy refraction + iridescence',
    glassMode: 'hybrid',
    hybridBlend: 0.4, hybridShaderAdd: 0.5, hybridEnvIntensity: 1.0, hybridMtmScale: 1.0,
    glassIOR: 0.8, causticIntensity: 0.4, iridescenceIntensity: 2.2,
    chromaticSpread: 1.6, glassAlpha: 0.2, streakIntensity: 0.3,
    mtmThickness: 1.8, mtmRoughness: 0.2, mtmIOR: 1.4,
    mtmChromatic: 0.5, mtmTransmission: 0.9, mtmBackside: true,
  },
  {
    name: 'Holographic',
    description: 'Max chromatic on both layers',
    glassMode: 'hybrid',
    hybridBlend: 0.5, hybridShaderAdd: 0.9, hybridEnvIntensity: 0.5, hybridMtmScale: 1.0,
    glassIOR: 0.5, causticIntensity: 1.0, iridescenceIntensity: 1.8,
    chromaticSpread: 3.0, glassAlpha: 0.16, streakIntensity: 1.2,
    mtmThickness: 1.2, mtmRoughness: 0.03, mtmIOR: 1.8,
    mtmChromatic: 3.0, mtmTransmission: 1.0, mtmBackside: true,
  },
];

// Live config object - editor mutates this, prism reads each frame
if (!window.__prismConfig) {
  window.__prismConfig = { ...PRISM_DEFAULTS };
}
const cfg = window.__prismConfig;

/* ═══════════ Mouse tracking (window-level) ═══════════ */
const mousePos = new THREE.Vector2(0, 0);
const mouseVel = { current: 0 };

/* ═══════════ Audio reactivity (reads global analyser from Home.jsx) ═══════════ */
const audioDataArray = new Uint8Array(64);
let audioBass = 0, audioMid = 0;
function sampleAudio() {
  if (!window.globalAnalyser) { audioBass = 0; audioMid = 0; return; }
  window.globalAnalyser.getByteFrequencyData(audioDataArray);
  let bassSum = 0, midSum = 0;
  for (let i = 0; i < 16; i++) bassSum += audioDataArray[i];
  for (let i = 16; i < 40; i++) midSum += audioDataArray[i];
  audioBass = (bassSum / 16) / 255;
  audioMid = (midSum / 24) / 255;
}

/* ═══════════ SHADERS ═══════════ */

const simpleVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ── CUSTOM GLASS SHADER (replaces MTM - no FBO, no black, always colorful) ── */
const glassVert = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const glassFrag = `
  uniform float uTime;
  uniform float uIsSide;
  uniform float uIOR;
  uniform float uCausticIntensity;
  uniform float uIridescenceIntensity;
  uniform float uChromaticSpread;
  uniform float uGlassAlpha;
  uniform float uStreakIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float NdotV = abs(dot(N, V));
    float t = uTime * 0.15;

    // ── CHROMATIC ABERRATION: each color channel refracts differently ──
    float cspr = uChromaticSpread;
    float fresnelR = pow(1.0 - NdotV, 2.8 - 0.8 * cspr);
    float fresnelG = pow(1.0 - NdotV, 2.8);
    float fresnelB = pow(1.0 - NdotV, 2.8 + 0.8 * cspr);
    float fresnel = pow(1.0 - NdotV, 2.8);

    // ── REFRACTED SAMPLING POSITION ──
    vec3 refracted = refract(-V, N, uIOR);
    vec3 samplePos = vWorldPos + refracted * 1.5;

    // ── INTERNAL CAUSTIC PATTERNS (bright rainbow light swimming inside) ──
    float c1 = vnoise(samplePos.xy * 3.0 + t * 0.6);
    float c2 = vnoise(samplePos.yz * 4.0 - t * 0.8 + 5.0);
    float c3 = vnoise(samplePos.xz * 2.5 + t * 0.4 + 10.0);
    float causticBright = pow(abs(sin(c1 * 8.0 + c2 * 5.0)), 3.0) * 0.6 * uCausticIntensity;
    float causticBright2 = pow(abs(sin(c2 * 6.0 + c3 * 4.0 + 2.0)), 3.0) * 0.4 * uCausticIntensity;

    // ── LIGHT STREAKS (vertical caustics through crystal) ──
    float streaks = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float sx = sin(samplePos.x * (6.0 + fi * 3.0) + t * (1.0 + fi * 0.4) + fi * 1.7);
      streaks += pow(max(0.0, sx * 0.5 + 0.5), 14.0) * 0.2 * uStreakIntensity;
    }

    // ── DOUBLE THIN-FILM IRIDESCENCE ──
    float angle = acos(clamp(NdotV, 0.0, 1.0));
    float iri1 = angle * 4.0 + t * 2.0;
    float iri2 = angle * 6.5 - t * 1.2;
    vec3 iridescence = vec3(
      0.5 + 0.5 * sin(iri1 * 4.0),
      0.5 + 0.5 * sin(iri1 * 4.0 + 2.094),
      0.5 + 0.5 * sin(iri1 * 4.0 + 4.189)
    );
    vec3 iri2Color = vec3(
      0.5 + 0.5 * sin(iri2 * 3.0 + 1.0),
      0.5 + 0.5 * sin(iri2 * 3.0 + 3.094),
      0.5 + 0.5 * sin(iri2 * 3.0 + 5.189)
    );
    iridescence = mix(iridescence, iri2Color, 0.4);

    // ── CAUSTIC RAINBOW COLORS (light patterns refracted inside) ──
    vec3 causticColor = vec3(
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5),
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5 + 2.094),
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5 + 4.189)
    ) * causticBright;

    vec3 causticColor2 = vec3(
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 1.0),
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 3.094),
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 5.189)
    ) * causticBright2;

    // ── SPECULAR HIGHLIGHTS (very sharp, glass-like) ──
    vec3 L1 = normalize(vec3(-1.0, 0.7, 0.8));
    vec3 L2 = normalize(vec3(1.0, 0.3, 0.5));
    vec3 L3 = normalize(vec3(0.0, -0.8, 0.6));
    vec3 L4 = normalize(vec3(sin(t * 0.5) * 0.7, 0.5, 0.7));
    float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 200.0);
    float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 120.0);
    float spec3 = pow(max(dot(reflect(-L3, N), V), 0.0), 80.0);
    float spec4 = pow(max(dot(reflect(-L4, N), V), 0.0), 150.0);
    float specTotal = spec1 + spec2 * 0.7 + spec3 * 0.5 + spec4 * 0.5;

    // ── COMPOSITE ──
    // Interior: deep dark purple-blue with caustic rainbow patterns swimming through
    vec3 interior = vec3(0.08, 0.05, 0.18);
    interior += causticColor + causticColor2;
    interior += vec3(0.6, 0.5, 1.0) * streaks;

    // Mix: interior visible face-on, iridescent reflection at edges
    vec3 color = mix(interior, iridescence * 1.5, fresnel * 0.6 * uIridescenceIntensity);

    // Chromatic fringing at edges (the prismatic effect!)
    color.r += fresnelR * 0.35 * cspr;
    color.b += fresnelB * 0.3 * cspr;

    // Sharp specular sparkle
    color += vec3(1.0, 0.98, 0.95) * specTotal * 1.3;

    // Strong bright rim
    color += vec3(0.8, 0.7, 1.0) * pow(fresnel, 2.5) * 0.9;

    // ── ALPHA ──
    // BackSide (inner) layer: more opaque for depth illusion
    float baseAlpha = uIsSide > 0.5 ? uGlassAlpha * 1.59 : uGlassAlpha;
    float alpha = baseAlpha + fresnel * 0.6 + specTotal * 0.2 + (causticBright + causticBright2) * 0.15;
    alpha = min(alpha, 0.92);

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── CONVERGING BEAM SHADER (tapers toward prism) ── */
const beamFrag = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    // Beam tapers as it converges toward prism (vUv.x: 0=far left, 1=at prism)
    float taper = 1.0 - vUv.x * vUv.x * 0.75;
    float d = abs(vUv.y - 0.5) * 2.0 / max(taper, 0.05);

    // Core gets tighter + brighter near prism
    float core = exp(-d * d * 20.0);
    float glow = exp(-d * d * 2.5) * taper;
    float convergeBright = 0.4 + vUv.x * 0.6;

    float intensity = (core * 1.5 + glow * 0.35) * convergeBright;
    float shimmer = 0.93 + 0.07 * sin(vUv.x * 30.0 - uTime * 6.0);

    // Near prism, start showing spectral hints
    float spectralHint = vUv.x * vUv.x * 0.15;
    vec3 hint = vec3(
      1.0 + sin(vUv.y * 12.0 + uTime) * spectralHint,
      1.0 + sin(vUv.y * 12.0 + uTime + 2.0) * spectralHint,
      1.0 - spectralHint * 0.3
    );

    vec3 color = vec3(1.0, 0.98, 0.93) * hint * (1.0 + core * 0.6);
    float alpha = intensity * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── SPREADING RAY SHADER (widens from prism) ── */
const rayFrag = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Ray widens as it spreads from prism (vUv.x: 0=at prism, 1=far right)
    float spread = 0.25 + vUv.x * 0.75;
    float d = abs(vUv.y - 0.5) * 2.0 / max(spread, 0.05);

    float fade = pow(1.0 - vUv.x, 0.6);
    float core = exp(-d * d * 25.0);
    float glow = exp(-d * d * 3.5);

    float intensity = (core * 1.4 + glow * 0.45) * fade;
    float shimmer = 0.88 + 0.12 * sin(vUv.x * 20.0 + uTime * 3.0);

    vec3 color = uColor * (1.6 + core * 0.8);
    float alpha = intensity * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── EDGE GLOW SHADER (bright white glass etching) ── */
const edgeGlowVert = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const edgeGlowFrag = `
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    float NdotV = abs(dot(vWorldNormal, vViewDir));
    float fresnel = pow(1.0 - NdotV, 2.0);

    float shimmer = 0.7 + 0.3 * sin(uTime * 2.0 + vWorldPos.y * 4.0 + vWorldPos.x * 3.0);

    // Subtle prismatic shift at edges
    float hue = uTime * 0.15 + fresnel * 2.0;
    vec3 prismatic = vec3(
      0.5 + 0.5 * sin(hue),
      0.5 + 0.5 * sin(hue + 2.094),
      0.5 + 0.5 * sin(hue + 4.189)
    );

    // Mostly bright white with prismatic hint
    vec3 color = mix(vec3(1.0), prismatic, fresnel * 0.35);

    // Catch-light
    vec3 lightDir = normalize(vec3(sin(uTime * 0.3) * 0.5, 0.7, 0.6));
    float catchLight = pow(max(0.0, dot(reflect(-vViewDir, vWorldNormal), lightDir)), 6.0);
    color += vec3(1.0, 0.97, 0.92) * catchLight * 0.5;

    float alpha = (0.3 + fresnel * 0.5 + catchLight * 0.3) * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ═══════════ TEXTURE GENERATORS ═══════════ */

function createEyeTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  // Big white sclera
  const scleraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 56);
  scleraGrad.addColorStop(0, 'rgba(255,255,255,0.99)');
  scleraGrad.addColorStop(0.7, 'rgba(245,240,255,0.97)');
  scleraGrad.addColorStop(1, 'rgba(210,205,230,0.9)');
  ctx.beginPath();
  ctx.ellipse(cx, cy, 56, 48, 0, 0, Math.PI * 2);
  ctx.fillStyle = scleraGrad;
  ctx.fill();

  // BIG vibrant iris
  const irisGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 30);
  irisGrad.addColorStop(0, '#0f0033');
  irisGrad.addColorStop(0.2, '#4c1d95');
  irisGrad.addColorStop(0.45, '#7c3aed');
  irisGrad.addColorStop(0.7, '#8b5cf6');
  irisGrad.addColorStop(1, '#c4b5fd');
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.fill();

  // Iris fibers
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10);
    ctx.lineTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    ctx.strokeStyle = i % 4 === 0 ? '#e9d5ff' : i % 3 === 0 ? '#c4b5fd' : '#8b5cf6';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // BIG pupil
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#020010';
  ctx.fill();

  // Big main highlight (googly eye!)
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 12, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fill();

  // Second highlight
  ctx.beginPath();
  ctx.arc(cx - 9, cy + 9, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  // Tiny sparkle
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 18, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createStarTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.08, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(220,200,255,0.35)');
  grad.addColorStop(1, 'rgba(200,180,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.5;
  for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    ctx.lineTo(cx - Math.cos(angle) * 28, cy - Math.sin(angle) * 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════ VIVID NEBULA BACKDROP TEXTURE ═══════════ */
function createNebulaTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  // Rich dark-indigo base
  const baseGrad = ctx.createLinearGradient(0, 0, size, size);
  baseGrad.addColorStop(0, '#0f0a3e');
  baseGrad.addColorStop(0.3, '#1a0e4a');
  baseGrad.addColorStop(0.6, '#0d1a3f');
  baseGrad.addColorStop(1, '#150a35');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  const blobs = [
    { x: 100, y: 100, r: 200, color: [147, 51, 234], a: 0.7 },
    { x: 400, y: 120, r: 180, color: [56, 189, 248], a: 0.65 },
    { x: 256, y: 400, r: 200, color: [244, 114, 182], a: 0.6 },
    { x: 80,  y: 370, r: 160, color: [34, 197, 94],  a: 0.5 },
    { x: 420, y: 380, r: 150, color: [250, 204, 21],  a: 0.5 },
    { x: 256, y: 220, r: 250, color: [124, 58, 237],  a: 0.6 },
    { x: 180, y: 280, r: 180, color: [99, 102, 241],  a: 0.55 },
    { x: 370, y: 260, r: 160, color: [236, 72, 153],  a: 0.55 },
  ];

  blobs.forEach(b => {
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a})`);
    grad.addColorStop(0.4, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a * 0.7})`);
    grad.addColorStop(0.7, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a * 0.35})`);
    grad.addColorStop(1, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

  // Bright center glow
  const centerGlow = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
  centerGlow.addColorStop(0, 'rgba(220, 200, 255, 0.5)');
  centerGlow.addColorStop(0.3, 'rgba(160, 120, 255, 0.35)');
  centerGlow.addColorStop(0.6, 'rgba(100, 60, 200, 0.2)');
  centerGlow.addColorStop(1, 'rgba(20, 10, 60, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════ GEOMETRY HOOK (shape selection) ═══════════ */
function usePrismGeometry(shape) {
  return useMemo(() => {
    switch (shape) {
      case 'rounded-prism': {
        const triShape = new THREE.Shape();
        const r = 1;
        const bevelR = 0.15;
        const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI / 3), Math.PI / 2 + (4 * Math.PI / 3)];
        const pts = angles.map(a => [Math.cos(a) * r, Math.sin(a) * r]);

        for (let i = 0; i < 3; i++) {
          const curr = pts[i];
          const next = pts[(i + 1) % 3];
          const prev = pts[(i + 2) % 3];

          const toNext = [next[0] - curr[0], next[1] - curr[1]];
          const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
          const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
          const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);

          const dnx = toNext[0] / lenNext, dny = toNext[1] / lenNext;
          const dpx = toPrev[0] / lenPrev, dpy = toPrev[1] / lenPrev;

          const pA = [curr[0] + dnx * bevelR * 2, curr[1] + dny * bevelR * 2];
          const pB = [curr[0] + dpx * bevelR * 2, curr[1] + dpy * bevelR * 2];

          if (i === 0) {
            triShape.moveTo(pB[0], pB[1]);
          } else {
            triShape.lineTo(pB[0], pB[1]);
          }
          triShape.quadraticCurveTo(curr[0], curr[1], pA[0], pA[1]);
        }
        triShape.closePath();

        const geo = new THREE.ExtrudeGeometry(triShape, {
          depth: 1.8,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.08,
          bevelSegments: 4,
        });
        geo.center();
        geo.computeVertexNormals();
        return geo;
      }
      case 'pyramid':
        return new THREE.ConeGeometry(1, 2, 4);
      case 'crystal':
        return new THREE.OctahedronGeometry(1.2, 0);
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'gem':
        return new THREE.DodecahedronGeometry(1, 0);
      case 'prism':
      default:
        return new THREE.CylinderGeometry(1, 1, 1.8, 3);
    }
  }, [shape]);
}

/* ═══════════ NEBULA BACKDROP ═══════════ */
function NebulaBackdrop({ texture }) {
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial map={texture} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

/* ═══════════ PRISM BODY (dual-layer glass + edges) ═══════════ */
function PrismBody({ geometry }) {
  const groupRef = useRef();
  const outerMatRef = useRef();
  const innerMatRef = useRef();
  const edgeMatRef = useRef();

  // Stable uniform objects - avoids R3F reconciler replacing them on re-render
  const innerUniforms = useMemo(() => ({
    uTime: { value: 0 }, uIsSide: { value: 1.0 },
    uIOR: { value: cfg.glassIOR }, uCausticIntensity: { value: cfg.causticIntensity },
    uIridescenceIntensity: { value: cfg.iridescenceIntensity },
    uChromaticSpread: { value: cfg.chromaticSpread },
    uGlassAlpha: { value: cfg.glassAlpha }, uStreakIntensity: { value: cfg.streakIntensity },
  }), []);

  const outerUniforms = useMemo(() => ({
    uTime: { value: 0 }, uIsSide: { value: 0.0 },
    uIOR: { value: cfg.glassIOR }, uCausticIntensity: { value: cfg.causticIntensity },
    uIridescenceIntensity: { value: cfg.iridescenceIntensity },
    uChromaticSpread: { value: cfg.chromaticSpread },
    uGlassAlpha: { value: cfg.glassAlpha }, uStreakIntensity: { value: cfg.streakIntensity },
  }), []);

  // Reactive edge geometry - rebuilds when threshold changes
  const edgesGeoRef = useRef(null);
  const lastThreshold = useRef(cfg.edgeThresholdAngle ?? 20);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, cfg.edgeThresholdAngle ?? 20), [geometry]);
  edgesGeoRef.current = edgesGeo;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Rebuild edges if threshold changed
    const thresh = cfg.edgeThresholdAngle ?? 20;
    if (thresh !== lastThreshold.current) {
      edgesGeoRef.current = new THREE.EdgesGeometry(geometry, thresh);
      lastThreshold.current = thresh;
    }

    // Music reactivity
    sampleAudio();
    const react = cfg.musicReactivity ?? 0;
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react : 0;
    const musicGlow = react > 0 ? audioBass * (cfg.musicGlowPulse ?? 0.5) * react : 0;

    groupRef.current.rotation.y += delta * cfg.rotationSpeed + musicRotBoost * delta;
    groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    groupRef.current.rotation.y += mousePos.x * delta * cfg.rotationMouseInfluence;
    groupRef.current.rotation.x += mousePos.y * delta * (cfg.rotationMouseInfluence * 0.6);

    // Squash & stretch from bop
    const squashTs = window.__prismSquash;
    if (squashTs && Date.now() - squashTs < 600) {
      const progress = (Date.now() - squashTs) / 600;
      let sx, sy, sz;
      if (progress < 0.15) {
        const p = progress / 0.15;
        sx = 1 + 0.3 * p; sy = 1 - 0.3 * p; sz = 1 + 0.3 * p;
      } else if (progress < 0.35) {
        const p = (progress - 0.15) / 0.2;
        sx = 1.3 - 0.45 * p; sy = 0.7 + 0.55 * p; sz = 1.3 - 0.45 * p;
      } else {
        const p = (progress - 0.35) / 0.65;
        const spring = Math.sin(p * Math.PI * 3) * (1 - p) * 0.12;
        sx = 0.85 + 0.15 * p + spring; sy = 1.25 - 0.25 * p - spring; sz = 0.85 + 0.15 * p + spring;
      }
      groupRef.current.scale.set(sx, sy, sz);
    } else {
      const breath = 1 + Math.sin(t * cfg.breathingSpeed) * cfg.breathingAmp + musicScale;
      groupRef.current.scale.setScalar(breath);
    }

    // Update glass shader uniforms on both layers (stable refs, no reconciler issues)
    [innerUniforms, outerUniforms].forEach(u => {
      u.uTime.value = t;
      u.uIOR.value = cfg.glassIOR;
      u.uCausticIntensity.value = cfg.causticIntensity * (1 + musicGlow);
      u.uIridescenceIntensity.value = cfg.iridescenceIntensity;
      u.uChromaticSpread.value = cfg.chromaticSpread;
      u.uGlassAlpha.value = cfg.glassAlpha;
      u.uStreakIntensity.value = cfg.streakIntensity * (1 + musicGlow * 0.5);
    });
    // Update edge glow shader
    if (edgeMatRef.current) {
      edgeMatRef.current.uniforms.uTime.value = t;
      edgeMatRef.current.uniforms.uOpacity.value = cfg.edgeGlowOpacity;
    }
  });

  return (
    <group ref={groupRef}>
      {/* INNER glass layer (BackSide) - creates depth illusion, slightly smaller */}
      <mesh geometry={geometry} scale={0.82} renderOrder={0}>
        <shaderMaterial
          ref={innerMatRef}
          vertexShader={glassVert}
          fragmentShader={glassFrag}
          uniforms={innerUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* OUTER glass layer (FrontSide) - the main surface you see */}
      <mesh geometry={geometry} renderOrder={1}>
        <shaderMaterial
          ref={outerMatRef}
          vertexShader={glassVert}
          fragmentShader={glassFrag}
          uniforms={outerUniforms}
          transparent
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>

      {/* Edge glow on EdgesGeometry */}
      <lineSegments geometry={edgesGeoRef.current} renderOrder={2}>
        <shaderMaterial
          ref={edgeMatRef}
          vertexShader={edgeGlowVert}
          fragmentShader={edgeGlowFrag}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: cfg.edgeGlowOpacity },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Wireframe overlay */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={cfg.wireframeOpacity ?? 0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════ PRISM BODY MTM (MeshTransmissionMaterial - real glass refraction) ═══════════ */
function PrismBodyMTM({ geometry }) {
  const groupRef = useRef();
  const edgeMatRef = useRef();
  const edgesGeoRef = useRef(null);
  const lastThreshold = useRef(cfg.edgeThresholdAngle ?? 20);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, cfg.edgeThresholdAngle ?? 20), [geometry]);
  edgesGeoRef.current = edgesGeo;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    const thresh = cfg.edgeThresholdAngle ?? 20;
    if (thresh !== lastThreshold.current) {
      edgesGeoRef.current = new THREE.EdgesGeometry(geometry, thresh);
      lastThreshold.current = thresh;
    }

    sampleAudio();
    const react = cfg.musicReactivity ?? 0;
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react : 0;

    groupRef.current.rotation.y += delta * cfg.rotationSpeed + musicRotBoost * delta;
    groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    groupRef.current.rotation.y += mousePos.x * delta * cfg.rotationMouseInfluence;
    groupRef.current.rotation.x += mousePos.y * delta * (cfg.rotationMouseInfluence * 0.6);
    const squashTs = window.__prismSquash;
    if (squashTs && Date.now() - squashTs < 600) {
      const progress = (Date.now() - squashTs) / 600;
      let sx, sy, sz;
      if (progress < 0.15) { const p = progress / 0.15; sx = 1 + 0.3 * p; sy = 1 - 0.3 * p; sz = 1 + 0.3 * p; }
      else if (progress < 0.35) { const p = (progress - 0.15) / 0.2; sx = 1.3 - 0.45 * p; sy = 0.7 + 0.55 * p; sz = 1.3 - 0.45 * p; }
      else { const p = (progress - 0.35) / 0.65; const spring = Math.sin(p * Math.PI * 3) * (1 - p) * 0.12; sx = 0.85 + 0.15 * p + spring; sy = 1.25 - 0.25 * p - spring; sz = 0.85 + 0.15 * p + spring; }
      groupRef.current.scale.set(sx, sy, sz);
    } else {
      groupRef.current.scale.setScalar(1 + Math.sin(t * cfg.breathingSpeed) * cfg.breathingAmp + musicScale);
    }
    if (edgeMatRef.current) { edgeMatRef.current.uniforms.uTime.value = t; edgeMatRef.current.uniforms.uOpacity.value = cfg.edgeGlowOpacity; }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <MeshTransmissionMaterial backside={cfg.mtmBackside} thickness={cfg.mtmThickness} roughness={cfg.mtmRoughness}
          transmission={cfg.mtmTransmission} ior={cfg.mtmIOR} chromaticAberration={cfg.mtmChromatic} anisotropy={0.1} color="#a78bfa" />
      </mesh>
      <lineSegments geometry={edgesGeoRef.current} renderOrder={2}>
        <shaderMaterial ref={edgeMatRef} vertexShader={edgeGlowVert} fragmentShader={edgeGlowFrag}
          uniforms={{ uTime: { value: 0 }, uOpacity: { value: cfg.edgeGlowOpacity } }}
          transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <mesh geometry={geometry}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={cfg.wireframeOpacity ?? 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═══════════ PRISM BODY HYBRID (true blend: MTM base + shader overlay + environment) ═══════════ */
function PrismBodyHybrid({ geometry }) {
  const groupRef = useRef();
  const mtmMatRef = useRef();
  const overlayInnerRef = useRef();
  const overlayOuterRef = useRef();
  const edgeMatRef = useRef();

  // Shader overlay uniforms - these render ADDITIVELY over the MTM base
  const overlayInnerUni = useMemo(() => ({
    uTime: { value: 0 }, uIsSide: { value: 1.0 },
    uIOR: { value: cfg.glassIOR }, uCausticIntensity: { value: cfg.causticIntensity },
    uIridescenceIntensity: { value: cfg.iridescenceIntensity },
    uChromaticSpread: { value: cfg.chromaticSpread },
    uGlassAlpha: { value: cfg.glassAlpha }, uStreakIntensity: { value: cfg.streakIntensity },
  }), []);
  const overlayOuterUni = useMemo(() => ({
    uTime: { value: 0 }, uIsSide: { value: 0.0 },
    uIOR: { value: cfg.glassIOR }, uCausticIntensity: { value: cfg.causticIntensity },
    uIridescenceIntensity: { value: cfg.iridescenceIntensity },
    uChromaticSpread: { value: cfg.chromaticSpread },
    uGlassAlpha: { value: cfg.glassAlpha }, uStreakIntensity: { value: cfg.streakIntensity },
  }), []);
  const edgesGeoRef = useRef(null);
  const lastThreshold = useRef(cfg.edgeThresholdAngle ?? 20);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, cfg.edgeThresholdAngle ?? 20), [geometry]);
  edgesGeoRef.current = edgesGeo;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    const thresh = cfg.edgeThresholdAngle ?? 20;
    if (thresh !== lastThreshold.current) {
      edgesGeoRef.current = new THREE.EdgesGeometry(geometry, thresh);
      lastThreshold.current = thresh;
    }

    sampleAudio();
    const react = cfg.musicReactivity ?? 0;
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react : 0;
    const musicGlow = react > 0 ? audioBass * (cfg.musicGlowPulse ?? 0.5) * react : 0;

    groupRef.current.rotation.y += delta * cfg.rotationSpeed + musicRotBoost * delta;
    groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    groupRef.current.rotation.y += mousePos.x * delta * cfg.rotationMouseInfluence;
    groupRef.current.rotation.x += mousePos.y * delta * (cfg.rotationMouseInfluence * 0.6);
    const squashTs = window.__prismSquash;
    if (squashTs && Date.now() - squashTs < 600) {
      const progress = (Date.now() - squashTs) / 600;
      let sx, sy, sz;
      if (progress < 0.15) { const p = progress / 0.15; sx = 1 + 0.3 * p; sy = 1 - 0.3 * p; sz = 1 + 0.3 * p; }
      else if (progress < 0.35) { const p = (progress - 0.15) / 0.2; sx = 1.3 - 0.45 * p; sy = 0.7 + 0.55 * p; sz = 1.3 - 0.45 * p; }
      else { const p = (progress - 0.35) / 0.65; const spring = Math.sin(p * Math.PI * 3) * (1 - p) * 0.12; sx = 0.85 + 0.15 * p + spring; sy = 1.25 - 0.25 * p - spring; sz = 0.85 + 0.15 * p + spring; }
      groupRef.current.scale.set(sx, sy, sz);
    } else {
      groupRef.current.scale.setScalar(1 + Math.sin(t * cfg.breathingSpeed) * cfg.breathingAmp + musicScale);
    }

    // Scale shader overlay intensity by hybridShaderAdd (blend control)
    const addAmount = cfg.hybridShaderAdd ?? 0.6;
    const blend = cfg.hybridBlend ?? 0.5;
    [overlayInnerUni, overlayOuterUni].forEach(u => {
      u.uTime.value = t; u.uIOR.value = cfg.glassIOR;
      u.uCausticIntensity.value = cfg.causticIntensity * addAmount * (1 + musicGlow);
      u.uIridescenceIntensity.value = cfg.iridescenceIntensity * addAmount;
      u.uChromaticSpread.value = cfg.chromaticSpread;
      u.uGlassAlpha.value = cfg.glassAlpha * (1.0 - blend * 0.7);
      u.uStreakIntensity.value = cfg.streakIntensity * addAmount * (1 + musicGlow * 0.5);
    });

    // Update MTM properties live
    if (mtmMatRef.current) {
      mtmMatRef.current.thickness = cfg.mtmThickness;
      mtmMatRef.current.roughness = cfg.mtmRoughness;
      mtmMatRef.current.ior = cfg.mtmIOR;
      mtmMatRef.current.chromaticAberration = cfg.mtmChromatic;
      mtmMatRef.current.transmission = cfg.mtmTransmission * blend;
    }

    if (edgeMatRef.current) { edgeMatRef.current.uniforms.uTime.value = t; edgeMatRef.current.uniforms.uOpacity.value = cfg.edgeGlowOpacity; }
  });

  const mtmScale = cfg.hybridMtmScale ?? 1.06;

  return (
    <group ref={groupRef}>
      {/* LAYER 1: MTM real-glass base - provides actual refraction of scene content */}
      <mesh geometry={geometry} renderOrder={0}>
        <MeshTransmissionMaterial ref={mtmMatRef} backside={cfg.mtmBackside}
          thickness={cfg.mtmThickness} roughness={cfg.mtmRoughness}
          transmission={cfg.mtmTransmission * (cfg.hybridBlend ?? 0.5)}
          ior={cfg.mtmIOR} chromaticAberration={cfg.mtmChromatic}
          anisotropy={0.1} color="#c4b5fd" distortionScale={0.2} temporalDistortion={0.1} />
      </mesh>

      {/* LAYER 2: Custom shader ADDITIVE overlay - caustics, iridescence, streaks, chromatic */}
      <mesh geometry={geometry} scale={0.99} renderOrder={1}>
        <shaderMaterial ref={overlayInnerRef} vertexShader={glassVert} fragmentShader={glassFrag}
          uniforms={overlayInnerUni} transparent side={THREE.BackSide}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} scale={1.005} renderOrder={2}>
        <shaderMaterial ref={overlayOuterRef} vertexShader={glassVert} fragmentShader={glassFrag}
          uniforms={overlayOuterUni} transparent side={THREE.FrontSide}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* LAYER 3: Subtle outer shell for depth haze (only when scale > 1.005) */}
      {mtmScale > 1.005 && (
        <mesh geometry={geometry} scale={mtmScale} renderOrder={3}>
          <meshPhysicalMaterial transparent opacity={0.08} roughness={0.4}
            color="#c4b5fd" transmission={0.6} thickness={0.3} ior={1.2}
            depthWrite={false} side={THREE.FrontSide} />
        </mesh>
      )}

      {/* Edge glow + wireframe */}
      <lineSegments geometry={edgesGeoRef.current} renderOrder={4}>
        <shaderMaterial ref={edgeMatRef} vertexShader={edgeGlowVert} fragmentShader={edgeGlowFrag}
          uniforms={{ uTime: { value: 0 }, uOpacity: { value: cfg.edgeGlowOpacity } }}
          transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <mesh geometry={geometry} renderOrder={5}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={cfg.wireframeOpacity ?? 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═══════════ RICH SCENE CONTENT FOR MTM/HYBRID (gives MTM things to refract) ═══════════ */
function MTMSceneContent() {
  return (
    <>
      {/* Colorful lights positioned close for MTM to refract */}
      <pointLight position={[-1.5, 1, -1]} color="#7c3aed" intensity={4} distance={6} />
      <pointLight position={[1.5, -0.5, -1]} color="#38bdf8" intensity={3} distance={6} />
      <pointLight position={[0, 1.5, -0.8]} color="#f472b6" intensity={2.5} distance={5} />
      <pointLight position={[-1, -1, -0.5]} color="#22c55e" intensity={2} distance={5} />
      <pointLight position={[1, 0.5, -1.5]} color="#fbbf24" intensity={2} distance={5} />

      {/* Environment map for MTM to reflect/refract */}
      <Environment preset="night" environmentIntensity={cfg.hybridEnvIntensity ?? 0.4} />
    </>
  );
}

/* ═══════════ MOUSE DRIFT GROUP ═══════════ */
function MouseDriftGroup({ children }) {
  const groupRef = useRef();
  const driftTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current) return;
    driftTarget.current.set(
      mousePos.x * cfg.driftStrength,
      mousePos.y * (cfg.driftStrength * 0.75),
      mouseVel.current * 0.3
    );
    groupRef.current.position.lerp(driftTarget.current, cfg.driftSpeed);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z, mousePos.x * -cfg.driftTiltX, 0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mousePos.y * cfg.driftTiltY, 0.04
    );
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ═══════════ EXPRESSIVE CARTOON EYE (full personality!) ═══════════ */
function GlassOrbEye() {
  const groupRef = useRef();
  const eyeSpriteRef = useRef();
  const eyeTexture = useMemo(() => createEyeTexture(), []);
  const expressionRef = useRef('normal');
  const expressionTimer = useRef(0);
  const dartTimer = useRef(0);
  const dartTarget = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const lerpFactor = cfg.eyeTrackSpeed + Math.min(mouseVel.current * 3, 0.15);

    let extraYOffset = 0;
    let eyeScaleX = 0.9, eyeScaleY = 0.76;
    const expr = expressionRef.current;

    // Expression-specific eye modifications
    if (expr === 'curious') {
      eyeScaleX = 0.95; eyeScaleY = 0.82; // slightly wider
    } else if (expr === 'surprised') {
      eyeScaleX = 1.05; eyeScaleY = 0.92; // wide-eyed!
    } else if (expr === 'happy' || expr === 'excited') {
      eyeScaleY = 0.62; // squished happy squint
      extraYOffset = 0.05;
    } else if (expr === 'love') {
      eyeScaleX = 0.95; eyeScaleY = 0.85;
    } else if (expr === 'angry') {
      eyeScaleY = 0.58; // angry squint
      extraYOffset = -0.04;
    } else if (expr === 'thinking') {
      extraYOffset = 0.08; // looking up
    } else if (expr === 'mischief') {
      eyeScaleY = 0.65; // sly squint
      extraYOffset = -0.02;
    }

    // Cycle expressions (more states, faster cycling for personality)
    if (t - expressionTimer.current > 4 + Math.random() * 3) {
      expressionTimer.current = t;
      const states = [
        'normal', 'normal', 'curious', 'happy', 'normal', 'surprised',
        'excited', 'thinking', 'mischief', 'normal', 'love', 'normal',
      ];
      const newExpr = states[Math.floor(Math.random() * states.length)];
      expressionRef.current = newExpr;
      window.__prismExpression = newExpr;
      if (newExpr === 'surprised') window.__prismSquash = Date.now();
    }

    // Dramatic darting look-arounds (more frequent, bigger movements)
    if (t - dartTimer.current > 2 + Math.random() * 3) {
      dartTimer.current = t;
      if (Math.random() < 0.5) {
        // Dart to random position
        dartTarget.current.x = (Math.random() - 0.5) * 0.6;
        dartTarget.current.y = (Math.random() - 0.5) * 0.4;
      } else {
        // Reset to follow mouse
        dartTarget.current.x = 0;
        dartTarget.current.y = 0;
      }
    }

    // Smooth look-around with dart offset
    const lookX = mousePos.x * cfg.eyeTrackRange + dartTarget.current.x;
    const lookY = mousePos.y * cfg.eyeTrackRange + dartTarget.current.y + extraYOffset;

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, lookY, lerpFactor
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, lookX, lerpFactor
    );

    // Eye scale animation (smooth transitions between expression sizes)
    if (eyeSpriteRef.current) {
      const curScale = eyeSpriteRef.current.scale;
      curScale.x = THREE.MathUtils.lerp(curScale.x, eyeScaleX, 0.08);
      curScale.y = THREE.MathUtils.lerp(curScale.y, eyeScaleY, 0.08);
      // Subtle pulse
      const pulse = 1 + Math.sin(t * 2.5) * 0.02;
      curScale.x *= pulse;
      curScale.y *= pulse;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.08, 0.3]}>
      {/* Eye sprite - faces camera, googly style */}
      <sprite ref={eyeSpriteRef} scale={[0.9, 0.76, 1]} position={[0, 0, 0.56]}>
        <spriteMaterial map={eyeTexture} transparent depthWrite={false} />
      </sprite>
      <MouthExpression />
    </group>
  );
}

/* ═══════════ EYELID TEXTURE (soft semicircle, not a hard rectangle) ═══════════ */
function createEyelidTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  // Soft semicircle eyelid (top half = opaque, bottom = soft fade)
  const grad = ctx.createRadialGradient(size / 2, size * 0.35, 0, size / 2, size * 0.35, size * 0.55);
  grad.addColorStop(0, 'rgba(10, 10, 46, 0.95)');
  grad.addColorStop(0.6, 'rgba(10, 10, 46, 0.85)');
  grad.addColorStop(0.85, 'rgba(10, 10, 46, 0.3)');
  grad.addColorStop(1, 'rgba(10, 10, 46, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════ EYELID (big dramatic blinks - soft sprite) ═══════════ */
function Eyelid() {
  const spriteRef = useRef();
  const blinkState = useRef({ nextBlink: 2, phase: 0, doubleBlink: false });
  const eyelidTex = useMemo(() => createEyelidTexture(), []);

  useFrame((state, delta) => {
    if (!spriteRef.current) return;
    const bs = blinkState.current;

    bs.nextBlink -= delta;
    if (bs.nextBlink <= 0) {
      bs.phase = 1;
      bs.doubleBlink = Math.random() < 0.25;
      const mouseProximity = Math.sqrt(mousePos.x * mousePos.x + mousePos.y * mousePos.y);
      bs.nextBlink = 2.5 + Math.random() * 3 - mouseProximity * 2;
      if (bs.nextBlink < 1.2) bs.nextBlink = 1.2;
    }

    if (bs.phase > 0) {
      bs.phase += delta * 7;
      let scaleY;
      if (bs.phase < 1.5) {
        scaleY = Math.min(1, (bs.phase - 1) * 2);
      } else if (bs.phase < 2.5) {
        scaleY = Math.max(0, 1 - (bs.phase - 1.5) * 2);
      } else if (bs.doubleBlink && bs.phase < 3.5) {
        scaleY = Math.min(1, (bs.phase - 2.5) * 2);
      } else if (bs.doubleBlink && bs.phase < 4.5) {
        scaleY = Math.max(0, 1 - (bs.phase - 3.5) * 2);
      } else {
        scaleY = 0;
        bs.phase = 0;
      }
      spriteRef.current.scale.set(0.9, 0.5 * scaleY, 1);
    } else {
      spriteRef.current.scale.set(0.9, 0, 1);
    }
  });

  return (
    <sprite ref={spriteRef} position={[0, 0.18, 0.58]}>
      <spriteMaterial map={eyelidTex} transparent depthWrite={false} />
    </sprite>
  );
}

/* ═══════════ CARTOON MOUTH (canvas sprite sheets) ═══════════ */
function createMouthTexture(type) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'smile': {
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = '#1a0a30';
      ctx.lineWidth = 4;
      ctx.stroke();
      // Pink mouth interior
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 20, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.quadraticCurveTo(cx, cy + 16, cx - 19, cy - 8 + 20 * Math.sin(0.2 * Math.PI));
      ctx.fillStyle = '#ff6b9d';
      ctx.fill();
      break;
    }
    case 'open': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a30';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 9, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4488';
      ctx.fill();
      break;
    }
    case 'talk1': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a30';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 10, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b9d';
      ctx.fill();
      break;
    }
    case 'talk2': {
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.quadraticCurveTo(cx, cy + 6, cx + 16, cy);
      ctx.strokeStyle = '#1a0a30';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      break;
    }
    case 'excited': {
      // Big toothy grin
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 24, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.lineTo(cx - 23, cy - 4);
      ctx.fillStyle = '#1a0a30';
      ctx.fill();
      // Teeth
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(cx - 18, cy - 10, 36, 7);
      // Tongue
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + 8, 9, 7, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4488';
      ctx.fill();
      break;
    }
    case 'love': {
      // Kissy lips
      ctx.beginPath();
      ctx.arc(cx - 6, cy, 8, 0.3, Math.PI * 2 - 0.3);
      ctx.arc(cx + 6, cy, 8, Math.PI + 0.3, Math.PI * 3 - 0.3);
      ctx.fillStyle = '#ff4488';
      ctx.fill();
      ctx.strokeStyle = '#cc2266';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'angry': {
      // Wavy grumpy line
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 2);
      ctx.bezierCurveTo(cx - 8, cy - 6, cx - 3, cy + 6, cx, cy);
      ctx.bezierCurveTo(cx + 3, cy - 6, cx + 8, cy + 6, cx + 16, cy - 2);
      ctx.strokeStyle = '#1a0a30';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }
    case 'thinking': {
      // Small off-center pucker
      ctx.beginPath();
      ctx.arc(cx + 8, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a30';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 8, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#cc6699';
      ctx.fill();
      break;
    }
    case 'neutral':
    default: {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.quadraticCurveTo(cx, cy + 3, cx + 10, cy);
      ctx.strokeStyle = '#1a0a30';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function MouthExpression() {
  const spriteRef = useRef();
  const currentMouth = useRef('neutral');

  const textures = useMemo(() => ({
    neutral: createMouthTexture('neutral'),
    smile: createMouthTexture('smile'),
    open: createMouthTexture('open'),
    talk1: createMouthTexture('talk1'),
    talk2: createMouthTexture('talk2'),
    excited: createMouthTexture('excited'),
    love: createMouthTexture('love'),
    angry: createMouthTexture('angry'),
    thinking: createMouthTexture('thinking'),
  }), []);

  useFrame((state) => {
    if (!spriteRef.current) return;
    const t = state.clock.elapsedTime;
    const expr = window.__prismExpression || 'normal';
    const isTalking = window.__prismTalking;

    // Live position/scale from editor config
    spriteRef.current.position.set(cfg.mouthX, cfg.mouthY, cfg.mouthZ);
    spriteRef.current.scale.set(cfg.mouthScaleX, cfg.mouthScaleY, 1);

    let mouthType = 'neutral';
    if (isTalking) {
      mouthType = Math.floor(t * 8) % 2 === 0 ? 'talk1' : 'talk2';
    } else if (expr === 'excited' || expr === 'happy') {
      mouthType = 'excited';
    } else if (expr === 'surprised') {
      mouthType = 'open';
    } else if (expr === 'love') {
      mouthType = 'love';
    } else if (expr === 'curious' || expr === 'thinking') {
      mouthType = 'thinking';
    } else if (expr === 'angry') {
      mouthType = 'angry';
    } else if (expr === 'mischief') {
      mouthType = 'smile';
    }

    if (mouthType !== currentMouth.current) {
      currentMouth.current = mouthType;
      spriteRef.current.material.map = textures[mouthType];
      spriteRef.current.material.needsUpdate = true;
    }
  });

  return (
    <sprite ref={spriteRef} position={[0, -0.32, 0.58]} scale={[0.42, 0.32, 1]}>
      <spriteMaterial map={textures.neutral} transparent depthWrite={false} />
    </sprite>
  );
}

/* ═══════════ CONVERGING WHITE BEAM (Pink Floyd style) ═══════════ */
function IncomingBeam() {
  const matRef = useRef();
  const meshRef = useRef();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 1);
    g.translate(-3.5, 0, 0); // extends from x=-7 to x=0
    return g;
  }, []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uOpacity.value = cfg.beamOpacity;
    if (meshRef.current) {
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        0.05 + mousePos.y * cfg.beamTrackAmount,
        0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.04]} rotation={[0, 0, 0.05]} geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={simpleVert}
        fragmentShader={beamFrag}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: cfg.beamOpacity },
        }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ═══════════ RAINBOW FAN (spreads from prism - light splitting!) ═══════════ */
const RAINBOW_BANDS = [
  { color: new THREE.Color('#ff1a1a'), angle: -0.35 },
  { color: new THREE.Color('#ff7700'), angle: -0.23 },
  { color: new THREE.Color('#ffdd00'), angle: -0.12 },
  { color: new THREE.Color('#22dd44'), angle: 0.00 },
  { color: new THREE.Color('#2288ff'), angle: 0.12 },
  { color: new THREE.Color('#5533ff'), angle: 0.23 },
  { color: new THREE.Color('#aa22ff'), angle: 0.35 },
];

function RainbowFan() {
  const raysRef = useRef([]);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 0.5);
    g.translate(3.5, 0, 0); // extends from x=0 to x=7
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mouseSpread = mousePos.x * cfg.rayBendAmount;
    const mouseVertical = mousePos.y * cfg.rayVerticalBend;
    raysRef.current.forEach((mesh, i) => {
      if (!mesh?.material?.uniforms) return;
      const wave = Math.sin(t * 0.8 + i * 0.9) * 0.01;
      mesh.rotation.z = RAINBOW_BANDS[i].angle + wave + mouseSpread;
      mesh.rotation.x = mouseVertical;
      mesh.material.uniforms.uOpacity.value = cfg.rayOpacity + Math.sin(t * 1.8 + i * 1.3) * 0.15;
      mesh.material.uniforms.uTime.value = t;
    });
  });

  return (
    <group position={[0, 0, 0.04]}>
      {RAINBOW_BANDS.map((band, i) => (
        <mesh
          key={i}
          ref={el => (raysRef.current[i] = el)}
          rotation={[0, 0, band.angle]}
          geometry={geo}
        >
          <shaderMaterial
            vertexShader={simpleVert}
            fragmentShader={rayFrag}
            uniforms={{
              uColor: { value: band.color },
              uOpacity: { value: cfg.rayOpacity },
              uTime: { value: 0 },
            }}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════ VERTEX STAR-BURSTS ═══════════ */
function VertexHighlights() {
  const starTex = useMemo(() => createStarTexture(), []);
  const spritesRef = useRef([]);

  const vertices = useMemo(() => {
    const r = 1, h = 0.9;
    const s = Math.sin((2 * Math.PI) / 3) * r;
    const c2 = Math.cos((2 * Math.PI) / 3) * r;
    return [
      [r, h, 0], [c2, h, s], [c2, h, -s],
      [r, -h, 0], [c2, -h, s], [c2, -h, -s],
    ];
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    spritesRef.current.forEach((sprite, i) => {
      if (!sprite) return;
      const pulse = cfg.vertexHighlightScale + Math.sin(t * 3.5 + i * 1.1) * cfg.vertexHighlightPulse;
      sprite.scale.set(pulse, pulse, 1);
    });
  });

  return (
    <>
      {vertices.map((pos, i) => (
        <sprite
          key={i}
          ref={el => (spritesRef.current[i] = el)}
          position={pos}
          scale={[0.35, 0.35, 1]}
        >
          <spriteMaterial
            map={starTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}

/* ═══════════ INTERNAL COLOR-CYCLING GLOW ═══════════ */
function InternalGlow() {
  const lightRef = useRef();

  useFrame((state) => {
    if (!lightRef.current) return;
    const hue = (state.clock.elapsedTime * 0.08) % 1;
    lightRef.current.color.setHSL(hue, 0.8, 0.6);
    lightRef.current.intensity = cfg.internalGlowIntensity + mouseVel.current * 5;
    lightRef.current.distance = cfg.internalGlowDistance;
  });

  return <pointLight ref={lightRef} position={[0, 0, 0]} intensity={cfg.internalGlowIntensity} distance={cfg.internalGlowDistance} />;
}

/* ═══════════ SCENE LIGHTS ═══════════ */
function SceneLights() {
  const ambRef = useRef();
  const keyRef = useRef();
  const fillRef = useRef();

  useFrame(() => {
    if (ambRef.current) ambRef.current.intensity = cfg.ambientIntensity;
    if (keyRef.current) keyRef.current.intensity = cfg.keyLightIntensity;
    if (fillRef.current) fillRef.current.intensity = cfg.fillLightIntensity;
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={cfg.ambientIntensity} />
      <pointLight ref={keyRef} position={[-4, 3, 3]} color="#ffffff" intensity={cfg.keyLightIntensity} />
      <pointLight ref={fillRef} position={[3, -1, 4]} color="#9333ea" intensity={cfg.fillLightIntensity} />
    </>
  );
}

/* ═══════════ LIGHT SPILL ═══════════ */
function LightSpill() {
  const lightRef = useRef();

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    lightRef.current.position.set(
      Math.sin(t * 0.7) * 2 + mousePos.x * 1.5,
      Math.cos(t * 0.5) * 2 + mousePos.y * 1.5,
      2
    );
    lightRef.current.intensity = (1.5 + mouseVel.current * 5) * cfg.lightSpillIntensity;
    const hue = (t * 0.05) % 1;
    lightRef.current.color.setHSL(hue, 0.7, 0.6);
  });

  return <pointLight ref={lightRef} color="#a855f7" distance={6} />;
}

/* ═══════════ CHARACTER SCALE (overall size from editor) ═══════════ */
function CharacterScaleGroup({ children }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.scale.setScalar(cfg.characterScale ?? 1);
  });
  return <group ref={ref}>{children}</group>;
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function Prism3D() {
  const nebulaTex = useMemo(() => createNebulaTexture(), []);
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const [glassMode, setGlassMode] = useState(cfg.glassMode || 'shader');

  const [shape, setShape] = useState(cfg.shape || 'rounded-prism');
  const geometry = usePrismGeometry(shape);

  useEffect(() => {
    const handler = () => setShape(cfg.shape || 'rounded-prism');
    window.addEventListener('prism-shape-change', handler);
    const glassModeHandler = () => setGlassMode(cfg.glassMode || 'shader');
    window.addEventListener('prism-glass-mode-change', glassModeHandler);
    const interval = setInterval(() => {
      if (cfg.shape !== shape) setShape(cfg.shape || 'rounded-prism');
      if (cfg.glassMode !== glassMode) setGlassMode(cfg.glassMode || 'shader');
    }, 500);
    return () => {
      window.removeEventListener('prism-shape-change', handler);
      window.removeEventListener('prism-glass-mode-change', glassModeHandler);
      clearInterval(interval);
    };
  }, [shape, glassMode]);

  useEffect(() => {
    const handler = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      const dx = nx - prevMouseRef.current.x;
      const dy = ny - prevMouseRef.current.y;
      mouseVel.current = Math.sqrt(dx * dx + dy * dy);
      mousePos.x = nx;
      mousePos.y = ny;
      prevMouseRef.current.set(nx, ny);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const size = cfg.canvasSize;
  const fi = cfg.featherInner;
  const fo = cfg.featherOuter;
  const canvasMargin = -(size - 420) / 2;

  return (
    <div
      className="prism-3d-canvas-wrapper"
      style={{
        width: size,
        height: size,
        margin: canvasMargin,
        pointerEvents: 'none',
        ...(cfg.canvasMask ? {
          WebkitMaskImage: `radial-gradient(ellipse at ${cfg.sceneCenterX}% ${cfg.sceneCenterY}%, black ${fi}%, transparent ${fo}%)`,
          maskImage: `radial-gradient(ellipse at ${cfg.sceneCenterX}% ${cfg.sceneCenterY}%, black ${fi}%, transparent ${fo}%)`,
        } : {}),
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'default', premultipliedAlpha: false }}
        dpr={Math.min(1.5, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1)}
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <SceneLights />
        <LightSpill />
        <NebulaBackdrop texture={nebulaTex} />
        {(glassMode === 'mtm' || glassMode === 'hybrid') && <MTMSceneContent />}

        <MouseDriftGroup>
          <Float speed={cfg.floatSpeed} rotationIntensity={cfg.rotationIntensity} floatIntensity={cfg.floatIntensity}>
            <CharacterScaleGroup>
              {glassMode === 'hybrid' ? <PrismBodyHybrid geometry={geometry} /> : glassMode === 'mtm' ? <PrismBodyMTM geometry={geometry} /> : <PrismBody geometry={geometry} />}
              <GlassOrbEye />
              <InternalGlow />
              <VertexHighlights />
              <IncomingBeam />
              <RainbowFan />

              <Sparkles
                count={cfg.sparkleCount}
                scale={[4, 4, 4]}
                size={cfg.sparkleSize}
                speed={cfg.sparkleSpeed}
                opacity={cfg.sparkleOpacity}
                color="#c4b5fd"
                noise={2}
              />
            </CharacterScaleGroup>
          </Float>
        </MouseDriftGroup>
      </Canvas>
    </div>
  );
}
