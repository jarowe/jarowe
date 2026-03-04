import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PRISM_DEFAULTS } from '../utils/prismDefaults';

// Re-export so existing imports from Prism3D still work
export { PRISM_DEFAULTS };

/* ═══════════ GLASS PRESETS (built-in per mode) ═══════════ */
export const GLASS_PRESETS = [
  // ── Custom Shader presets ──
  {
    name: 'Prismatic Clear',
    description: 'The signature look — clean prismatic glass with balanced everything',
    glassMode: 'shader',
    glassIOR: 0.67, causticIntensity: 1.0, iridescenceIntensity: 1.0,
    chromaticSpread: 1.0, glassAlpha: 0.22, streakIntensity: 1.0,
  },
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

/* ═══════════ BIRTHDAY PARTY HAT ═══════════ */
function createPartyHatTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Cone body with gradient
    const grad = ctx.createLinearGradient(size/2, 0, size/2, size);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(0.5, '#f472b6');
    grad.addColorStop(1, '#fbbf24');

    ctx.beginPath();
    ctx.moveTo(size/2, 8);
    ctx.lineTo(size - 20, size - 15);
    ctx.lineTo(20, size - 15);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Polka dots
    const dots = [[40, 60], [75, 55], [55, 85], [45, 40], [70, 75]];
    dots.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
    });

    // Pom-pom at tip
    ctx.beginPath();
    ctx.arc(size/2, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size/2 - 3, 5, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // Elastic band at bottom
    ctx.beginPath();
    ctx.moveTo(20, size - 15);
    ctx.quadraticCurveTo(size/2, size - 5, size - 20, size - 15);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

function PartyHat() {
    const ref = useRef();
    const texture = useMemo(() => createPartyHatTexture(), []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        // Subtle wobble
        ref.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.05;
        ref.current.rotation.x = Math.sin(clock.elapsedTime * 1.5) * 0.03;
    });

    return (
        <sprite ref={ref} position={[0, 1.1, 0.1]} scale={[0.7, 0.9, 1]}>
            <spriteMaterial map={texture} transparent depthWrite={false} />
        </sprite>
    );
}

/* ═══════════ Mouse tracking (window-level) ═══════════ */
const mousePos = new THREE.Vector2(0, 0);
const mouseVel = { current: 0 };

/* ═══════════ Light ray physics state ═══════════ */
const lightState = {
  beamAngle: Math.PI,        // direction beam comes FROM (radians)
  incidenceAngle: 0,         // angle vs prism face normal
  prismYRot: 0,              // smoothed Y rotation
  dispersionSpread: 0.35,    // current fan half-angle
  dispersionCenter: 0,       // fan center offset from rotation
  mouseProximityFactor: 1.0, // multiplied into dispersionSpread
  portalSuckProgress: 0,     // 0 = normal, 1 = fully sucked (for cascading ray death)
  portalSuckStartTime: 0,    // when portal suck started
};

/* ═══════════ Audio reactivity (reads global analyser from AudioContext.jsx) ═══════════ */
const audioDataArray = new Uint8Array(128); // fftSize=256 → 128 bins
let audioBass = 0, audioMid = 0;
let analyserZeroFrames = 0; // track consecutive zero-data frames
function sampleAudio() {
  // Try real analyser data first
  if (window.globalAnalyser) {
    window.globalAnalyser.getByteFrequencyData(audioDataArray);
    let bassSum = 0, midSum = 0;
    for (let i = 0; i < 20; i++) bassSum += audioDataArray[i];
    for (let i = 20; i < 60; i++) midSum += audioDataArray[i];
    const rawBass = (bassSum / 20) / 255;
    const rawMid = (midSum / 40) / 255;

    if (rawBass > 0.001 || rawMid > 0.001) {
      // Real data flowing — use it
      analyserZeroFrames = 0;
      audioBass = audioBass * 0.6 + rawBass * 0.4;
      audioMid = audioMid * 0.6 + rawMid * 0.4;
      return;
    }
    analyserZeroFrames++;
  }

  // Fallback: synthetic reactivity when music is playing but analyser returns zeros.
  // This handles HTML5 audio mode where Web Audio graph is bypassed.
  if (window.__musicPlaying) {
    const t = performance.now() / 1000;
    // Generate rhythmic pulsing from layered sine waves (simulates bass + mid)
    const synthBass = 0.35 + 0.25 * Math.sin(t * 2.1) + 0.15 * Math.sin(t * 4.3) + 0.1 * Math.sin(t * 0.7);
    const synthMid = 0.3 + 0.2 * Math.sin(t * 3.7 + 1.2) + 0.15 * Math.sin(t * 5.9 + 0.5) + 0.1 * Math.sin(t * 1.3 + 2.0);
    audioBass = audioBass * 0.7 + synthBass * 0.3;
    audioMid = audioMid * 0.7 + synthMid * 0.3;
    return;
  }

  // No music playing
  audioBass = audioBass * 0.9; // fade out
  audioMid = audioMid * 0.9;
}

/* ═══════════ ANGULAR MOMENTUM PHYSICS ═══════════ */
// Shared helper consumed by all 3 PrismBody variants.
// Base Y-axis spin + mouse tilt are DIRECT (like original behaviour).
// Only bop impulse, drag spin, and portal suck use the velocity system.
function applyAngularPhysics(groupRef, delta, t, musicRotBoost, angVelRef, portalSuckLerp) {
  const av = angVelRef.current;
  const rot = groupRef.current.rotation;

  // ── 0. Reset rotation on spawn (prevents drift-off-screen) ──
  if (window.__prismResetRotation) {
    rot.x = 0;
    rot.y = 0;
    rot.z = 0;
    av.x = 0;
    av.y = 0;
    av.z = 0;
    portalSuckLerp.current = 0;
    window.__prismResetRotation = false;
  }

  // ── 1. Direct base rotation (Y-axis steady spin — never compounds) ──
  rot.y += delta * cfg.rotationSpeed + musicRotBoost * delta;
  rot.y += mousePos.x * delta * cfg.rotationMouseInfluence;

  // ── 2. Direct X wobble + mouse tilt (like original) ──
  const wobble = cfg.angularWobbleAmp ?? 0.12;
  rot.x = Math.sin(t * 0.4) * wobble;
  rot.x += mousePos.y * delta * (cfg.rotationMouseInfluence * 0.6);

  // ── 3. Consume bop impulse (velocity-based — decays over time) ──
  const impulse = window.__prismBopImpulse;
  if (impulse) {
    av.x += impulse.x;
    av.y += impulse.y;
    av.z += impulse.z;
    window.__prismBopImpulse = null;
  }

  // ── 4. Consume drag spin (velocity-based) ──
  const drag = window.__prismDragSpin;
  if (drag) {
    const sens = cfg.angularDragSensitivity ?? 0.012;
    av.y += drag.x * sens;
    av.x += -drag.y * sens;
    window.__prismDragSpin = null;
  }

  // ── 5. Portal suck vortex — smooth ease-in spin with organic wobble ──
  const suckTarget = window.__prismPortalSuck ? 1 : 0;
  // Bop-exit: faster ramp (already spinning from bop), auto-exit: gentle ramp
  const isBopExit = !!window.__prismBopExit;
  const suckRampSpeed = isBopExit ? delta * 8 : delta * 3;
  portalSuckLerp.current = THREE.MathUtils.lerp(portalSuckLerp.current, suckTarget, suckRampSpeed);
  const suckLerp = portalSuckLerp.current;
  // Clear bop-exit flag when suck is done
  if (suckTarget === 0 && suckLerp < 0.01) window.__prismBopExit = false;
  if (suckLerp > 0.01) {
    // Ease-in curve: suckLerp² gives slow start, fast finish
    const eased = suckLerp * suckLerp;
    const suckSpeed = eased * (cfg.portalSuckSpinMult ?? 6.0);
    rot.y += suckSpeed * delta;
    // Organic wobble — subtle X/Z tumble that increases with suck intensity
    rot.x += Math.sin(t * 5.3) * eased * 0.12 * delta * 60;
    rot.z += Math.cos(t * 3.7) * eased * 0.06 * delta * 60;
  }

  // ── 6. Damping on impulse/drag velocity only ──
  const baseDamp = cfg.angularDamping ?? 0.96;
  const suckDamp = cfg.portalSuckDamping ?? 0.99;
  const damp = THREE.MathUtils.lerp(baseDamp, suckDamp, suckLerp);
  av.x *= damp;
  av.y *= damp;
  av.z *= damp;

  // ── 7. Apply impulse/drag velocity on top of direct rotation ──
  rot.x += av.x * delta * 60;
  rot.y += av.y * delta * 60;
  rot.z += av.z * delta * 60;

  // ── 8. Expose Y rotation for light ray physics ──
  window.__prismRotationY = rot.y;
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

/* ── CONVERGING BEAM SHADER — saber-style with ALPHA modulation for visible streaks ── */
const beamFrag = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIncidence;
  uniform float uCascadeFade;
  uniform float uSaberEnabled;
  uniform float uSaberCoreWidth;
  uniform float uSaberGlowWidth;
  uniform float uSaberPulseSpeed;
  uniform float uSaberPulseIntensity;
  uniform float uSaberFlickerSpeed;
  uniform float uSaberFlickerIntensity;
  uniform float uSaberColorTemp;
  uniform float uSaberHDRIntensity;
  uniform float uSaberStreakSpeed;
  uniform float uSaberStreakIntensity;
  varying vec2 vUv;

  void main() {
    float saber = uSaberEnabled;
    float narrowing = 1.0 - uIncidence * 0.2;
    float taper = (1.0 - vUv.x * vUv.x * 0.75) * narrowing;

    // ── Traveling energy streaks ──
    float spd = uSaberStreakSpeed;
    float sv1 = (fract(vUv.x * 2.0 - uTime * spd * 0.8) - 0.5) * 3.0;
    float sv2 = (fract(vUv.x * 3.5 - uTime * spd * 1.3) - 0.5) * 3.0;
    float sv3 = (fract(vUv.x * 1.2 + uTime * spd * 0.5) - 0.5) * 3.0;
    float st1 = exp(-sv1 * sv1 * 10.0);
    float st2 = exp(-sv2 * sv2 * 12.0);
    float st3 = exp(-sv3 * sv3 * 8.0);
    float rawStreaks = (st1 + st2 * 0.7 + st3 * 0.5) / 2.2;

    // Streaks WIDEN the beam (3x multiplier — visible on narrow beams)
    float widthMod = 1.0 + (rawStreaks - 0.3) * uSaberStreakIntensity * saber * 3.0;
    float d = abs(vUv.y - 0.5) * 2.0 / max(taper * widthMod, 0.05);

    // Multi-layer glow
    float coreSharp = uSaberCoreWidth * 30.0;
    float core = exp(-d * d * coreSharp);
    float midGlow = exp(-d * d * 8.0) * taper;
    float scatter = exp(-d * d * (1.5 / max(uSaberGlowWidth, 0.1))) * taper * 0.3;

    float convergeBright = 0.4 + vUv.x * 0.6;
    // Fade both ends: left (far) and right (prism center) — soft convergence at prism
    float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.82, vUv.x);

    float rawIntensity = (core * 2.0 + midGlow * 0.6 + scatter) * convergeBright * edgeFade;

    // ── CAP INTENSITY — critical for visible saber effects ──
    // With AdditiveBlending, any color*alpha > 1.0 clips to white in the framebuffer.
    // The uncapped center intensity is ~1.9, so saber alpha modulation (e.g. 0.5×)
    // still produces 0.95 contribution = indistinguishable from 1.0 = invisible.
    // Capping at 1.0 means saber alpha 0.15 → contribution 0.15, clearly visible.
    float intensity = min(rawIntensity, 1.0);

    // ── ALPHA MODULATION — the key to visible saber effects ──
    // Streak alpha: between streaks (rawStreaks~0) → alpha drops to ~15%, at peaks → 100%
    float streakAlpha = mix(1.0, mix(0.15, 1.0, rawStreaks), saber * uSaberStreakIntensity);

    // Pulse alpha: slow breathing between 55-100%
    float p1 = sin(vUv.x * 6.0 - uTime * uSaberPulseSpeed) * 0.5 + 0.5;
    float p2 = sin(vUv.x * 3.0 + uTime * uSaberPulseSpeed * 0.7) * 0.5 + 0.5;
    float pulseWave = p1 * p2;
    float pulseAlpha = mix(1.0, 0.55 + 0.45 * pulseWave, saber * uSaberPulseIntensity);

    // Micro-flicker — subtle organic instability on alpha
    float f1 = sin(uTime * uSaberFlickerSpeed * 17.3 + vUv.x * 50.0);
    float f2 = sin(uTime * uSaberFlickerSpeed * 31.7 + vUv.y * 80.0);
    float flickerAlpha = 1.0 - abs(f1 * f2) * uSaberFlickerIntensity * saber;

    // Color temperature
    vec3 coolTint = vec3(0.85, 0.92, 1.15);
    vec3 warmTint = vec3(1.15, 1.0, 0.85);
    vec3 tempTint = mix(coolTint, warmTint, uSaberColorTemp * 0.5 + 0.5);

    // Traveling color tint — warm at streak peaks, cool between (full strength, no dampener)
    vec3 streakWarm = vec3(1.15, 0.95, 0.82);
    vec3 streakCool = vec3(0.82, 0.95, 1.15);
    vec3 travelTint = mix(streakCool, streakWarm, rawStreaks);
    vec3 colorTint = mix(vec3(1.0), travelTint, uSaberStreakIntensity * saber);

    // Spectral hints near prism
    float spectralHint = vUv.x * vUv.x * (0.15 + uIncidence * 0.25);
    vec3 hint = vec3(
      1.0 + sin(vUv.y * 12.0 + uTime) * spectralHint,
      1.0 + sin(vUv.y * 12.0 + uTime + 2.0) * spectralHint,
      1.0 - spectralHint * 0.3
    );

    float hdrBoost = mix(1.0, uSaberHDRIntensity, core * saber);
    vec3 color = vec3(1.0, 0.98, 0.93) * tempTint * hint * hdrBoost * colorTint;

    // Portal cascade retraction
    float cascadeEdge = uCascadeFade * 1.4;
    float cascadeRetract = smoothstep(cascadeEdge, cascadeEdge + 0.2, 1.0 - vUv.x);
    float rg = ((1.0 - vUv.x) - cascadeEdge) * 8.0;
    float retractionGlow = exp(-rg * rg) * uCascadeFade;
    color += vec3(1.0, 0.95, 0.85) * retractionGlow;

    // Final alpha: intensity × opacity × cascade × streak × pulse × flicker
    float alpha = intensity * uOpacity * (1.0 - cascadeRetract) * streakAlpha * pulseAlpha * flickerAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── BEAM GLOW HALO — soft wide layer behind beam for fake bloom ── */
const beamGlowFrag = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSaberEnabled;
  uniform float uSaberPulseSpeed;
  uniform float uSaberStreakSpeed;
  uniform float uSaberStreakIntensity;
  uniform float uCascadeFade;
  varying vec2 vUv;

  void main() {
    float saber = uSaberEnabled;
    float d = abs(vUv.y - 0.5) * 2.0;

    // Soft wide Gaussian — decays fully within geometry (taller geo = more room)
    float glow = exp(-d * d * 4.0);

    // UV edge fade — ensures zero alpha at geometry boundary (no clipping)
    float yEdge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    float xEdge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    float convergeBright = 0.5 + vUv.x * 0.5;

    float brightness = glow * yEdge * xEdge * convergeBright;

    // Breathing (float multiplier, no branch)
    float breath = mix(1.0, 0.7 + 0.3 * sin(uTime * uSaberPulseSpeed), saber);
    brightness *= breath;

    // Traveling brightness bands in the halo
    float spd = uSaberStreakSpeed;
    float g1 = (fract(vUv.x * 1.5 - uTime * spd * 0.6) - 0.5) * 2.5;
    float g2 = (fract(vUv.x * 2.5 + uTime * spd * 0.4) - 0.5) * 2.5;
    float st = exp(-g1 * g1 * 6.0);
    float st2 = exp(-g2 * g2 * 8.0);
    float haloStreaks = (st + st2 * 0.5) / 1.5;
    // Alpha modulation on glow: dim between streaks, bright at peaks
    float haloAlpha = mix(1.0, mix(0.4, 1.3, haloStreaks), saber * uSaberStreakIntensity);
    brightness *= haloAlpha;

    // Portal cascade
    float cascadeRetract = smoothstep(uCascadeFade * 1.4, uCascadeFade * 1.4 + 0.2, 1.0 - vUv.x);

    float alpha = brightness * uOpacity * (1.0 - cascadeRetract);
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), alpha);
  }
`;

/* ── CONVERGENCE GLOW — iridescent sparkle where beam meets prism ── */
const convergenceGlowFrag = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIridescence;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;

    // Smooth circular mask — forces alpha to zero well before square geometry edge
    float circleMask = smoothstep(1.0, 0.5, r);

    // Soft radial Gaussian
    float glow = exp(-r * r * 6.0);

    // Iridescent color — integer angle multiplier avoids atan seam
    // (atan jumps -π→+π; sin(angle*0.5) is discontinuous there, sin(angle*1.0) is not)
    float angle = atan(c.y, c.x);
    vec3 iridColor = vec3(
      0.5 + 0.5 * sin(angle + uTime * 0.8),
      0.5 + 0.5 * sin(angle + uTime * 0.8 + 2.094),
      0.5 + 0.5 * sin(angle + uTime * 0.8 + 4.189)
    );
    // Pastel shift — push toward white for soft prismatic look
    iridColor = mix(vec3(1.0), iridColor, 0.6 * uIridescence);

    // Gentle radial pulse
    float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + r * 4.0);

    // Bright core hotspot
    float hotspot = exp(-r * r * 14.0) * 0.5;

    float alpha = (glow + hotspot) * uOpacity * pulse * circleMask;
    gl_FragColor = vec4(iridColor, alpha);
  }
`;

/* ── SPREADING RAY SHADER (widens from prism, dispersion-reactive, energy streaks) ── */
const rayFrag = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uDispersionWidth;  // 0-1+ : how wide dispersion is right now
  uniform float uCascadeFade;      // 0 = visible, 1 = fully faded (portal exit cascade)
  uniform float uPortalWiden;      // individual ray width boost during portal exit
  uniform float uFeathering;       // 0=sharp crisp rays, 1=soft glowy rays
  varying vec2 vUv;
  void main() {
    // Ray widens more dramatically when dispersion is wide
    float dispersionInfluence = 0.6 + uDispersionWidth * 0.8;
    // Portal exit: each ray physically widens as it retracts
    float cascadeWiden = 1.0 + uCascadeFade * uPortalWiden;
    float spread = (0.15 + vUv.x * 0.85) * dispersionInfluence * cascadeWiden;
    float d = abs(vUv.y - 0.5) * 2.0 / max(spread, 0.05);

    float fade = pow(1.0 - vUv.x, 0.6);
    // Fade both ends: prism origin (soft start) and far tip
    float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.75, vUv.x);

    // Core + glow layers — feathering shifts balance from tight core to soft glow
    float coreTight = mix(45.0, 12.0, uFeathering) + (1.0 - uDispersionWidth) * 20.0;
    float glowTight = mix(6.0, 2.0, uFeathering);
    float core = exp(-d * d * coreTight);
    float glow = exp(-d * d * glowTight);
    float coreWeight = mix(1.6, 0.8, uFeathering);
    float glowWeight = mix(0.3, 0.8, uFeathering);

    float intensity = (core * coreWeight + glow * glowWeight) * fade * edgeFade;

    // Shimmer
    float shimmer = 0.88 + 0.12 * sin(vUv.x * 20.0 + uTime * 3.0);

    // Traveling energy streaks — multiplicative modulation (x*x avoids GLSL pow UB)
    float r1 = fract(vUv.x - uTime * 0.5) * 4.0 - 1.0;
    float r2 = fract(vUv.x * 1.8 - uTime * 0.8) * 3.0 - 1.0;
    float r3 = fract(vUv.x * 0.7 + uTime * 0.3) * 3.5 - 1.0;
    float st1 = exp(-r1 * r1 * 6.0);
    float st2 = exp(-r2 * r2 * 8.0);
    float st3 = exp(-r3 * r3 * 5.0);
    float rawRayStreaks = st1 + st2 * 0.7 + st3 * 0.5;
    // Dims between streaks, brightens at peaks — visible on colored rays
    float rayStreakMod = mix(0.7, 1.3, rawRayStreaks / 2.2);

    // Breathing pulse
    float breath = 0.85 + 0.15 * sin(uTime * 1.8 + vUv.x * 2.0);

    vec3 color = uColor * (1.6 + core * 0.8) * rayStreakMod;

    // Portal cascade
    float cascadeEdge = 1.0 - uCascadeFade * 1.3;
    float cascadeRetract = smoothstep(cascadeEdge, cascadeEdge + 0.15, vUv.x);
    float rgv = (vUv.x - cascadeEdge) * 8.0;
    float retractionGlow = exp(-rgv * rgv) * uCascadeFade * 2.0;
    color += uColor * retractionGlow;

    float alpha = intensity * uOpacity * shimmer * breath * (1.0 - cascadeRetract);

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
      case 'rounded-pyramid': {
        // 4-sided pyramid base as a rounded square, extruded into a tapered shape
        const pyShape = new THREE.Shape();
        const pyR = 0.9;
        const pyBevel = 0.18;
        const pyPts = [[-pyR, -pyR], [pyR, -pyR], [pyR, pyR], [-pyR, pyR]];
        for (let i = 0; i < 4; i++) {
          const curr = pyPts[i];
          const next = pyPts[(i + 1) % 4];
          const prev = pyPts[(i + 3) % 4];
          const toN = [next[0] - curr[0], next[1] - curr[1]];
          const toP = [prev[0] - curr[0], prev[1] - curr[1]];
          const lN = Math.sqrt(toN[0] ** 2 + toN[1] ** 2);
          const lP = Math.sqrt(toP[0] ** 2 + toP[1] ** 2);
          const pA = [curr[0] + (toN[0] / lN) * pyBevel * 2, curr[1] + (toN[1] / lN) * pyBevel * 2];
          const pB = [curr[0] + (toP[0] / lP) * pyBevel * 2, curr[1] + (toP[1] / lP) * pyBevel * 2];
          if (i === 0) pyShape.moveTo(pB[0], pB[1]);
          else pyShape.lineTo(pB[0], pB[1]);
          pyShape.quadraticCurveTo(curr[0], curr[1], pA[0], pA[1]);
        }
        pyShape.closePath();
        const pyGeo = new THREE.ExtrudeGeometry(pyShape, {
          depth: 2.0, bevelEnabled: true, bevelThickness: 0.1,
          bevelSize: 0.1, bevelSegments: 4,
        });
        pyGeo.center();
        // Taper top vertices to form pyramid (pinch top half toward center)
        const pyPos = pyGeo.attributes.position;
        for (let i = 0; i < pyPos.count; i++) {
          const z = pyPos.getZ(i);
          if (z > 0) {
            const taper = 1 - (z / 1.2);  // 1 at bottom → 0 at top
            const t = Math.max(0.05, taper);
            pyPos.setX(i, pyPos.getX(i) * t);
            pyPos.setY(i, pyPos.getY(i) * t);
          }
        }
        pyPos.needsUpdate = true;
        pyGeo.computeVertexNormals();
        return pyGeo;
      }
      case 'pyramid': {
        // Rounded 4-sided pyramid (ConeGeometry with subdivision for soft edges)
        const geo = new THREE.ConeGeometry(1, 2, 4, 1);
        geo.computeVertexNormals();
        return geo;
      }
      case 'crystal': {
        // Rounded octahedron — higher subdivision for softer edges
        const geo = new THREE.OctahedronGeometry(1.2, 2);
        geo.computeVertexNormals();
        return geo;
      }
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'gem': {
        // Rounded dodecahedron — subdivision smooths the edges
        const geo = new THREE.DodecahedronGeometry(1, 1);
        geo.computeVertexNormals();
        return geo;
      }
      case 'prism':
      default: {
        // Rounded triangular prism (same technique as rounded-prism but no bevel label)
        const geo = new THREE.CylinderGeometry(1, 1, 1.8, 3, 1);
        geo.computeVertexNormals();
        return geo;
      }
    }
  }, [shape]);
}

/* ═══════════ NEBULA BACKDROP ═══════════ */
function NebulaBackdrop({ texture }) {
  const matRef = useRef();
  const currentOpacity = useRef(cfg.nebulaOpacity ?? 0.59);
  useFrame((_, delta) => {
    if (!matRef.current) return;
    const target = cfg.nebulaOpacity ?? 0.59;
    // Portal entrance: boost opacity briefly, then ease back to target
    const boost = window.__nebulaFlash ?? 0;
    const boostedTarget = Math.min(1, target + boost * 0.4);
    // Smooth lerp toward target (never instant-pop)
    currentOpacity.current += (boostedTarget - currentOpacity.current) * Math.min(1, delta * 3);
    matRef.current.opacity = currentOpacity.current;
    // Decay flash
    if (window.__nebulaFlash > 0.01) window.__nebulaFlash *= 0.94;
    else window.__nebulaFlash = 0;
  });
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={cfg.nebulaOpacity ?? 0.59} depthWrite={false} />
    </mesh>
  );
}

/* ═══════════ PRISM BODY (dual-layer glass + edges) ═══════════ */
function PrismBody({ geometry }) {
  const groupRef = useRef();
  const outerMatRef = useRef();
  const innerMatRef = useRef();
  const edgeMatRef = useRef();
  const wireMatRef = useRef();
  const hoverGlow = useRef(0);
  const angVelRef = useRef({ x: 0, y: 0, z: 0 });
  const portalSuckLerp = useRef(0);

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

    // Music reactivity — effects must be dramatic enough to notice
    sampleAudio();
    const react = cfg.musicReactivity ?? 0;
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react * 4 : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react * 6 : 0;
    const musicGlow = react > 0 ? audioBass * (cfg.musicGlowPulse ?? 0.5) * react * 3 : 0;

    applyAngularPhysics(groupRef, delta, t, musicRotBoost, angVelRef, portalSuckLerp);

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

    // Hover glow — smooth ramp for glass brightness on hover
    const hvTarget = window.__prismHovered ? 1 : 0;
    hoverGlow.current = THREE.MathUtils.lerp(hoverGlow.current, hvTarget, delta * 8);
    const hv = hoverGlow.current * (cfg.hoverGlowBoost ?? 0.5);

    // Update glass shader uniforms on both layers (stable refs, no reconciler issues)
    [innerUniforms, outerUniforms].forEach(u => {
      u.uTime.value = t;
      u.uIOR.value = cfg.glassIOR;
      u.uCausticIntensity.value = cfg.causticIntensity * (1 + musicGlow) + hv * 0.8;
      u.uIridescenceIntensity.value = cfg.iridescenceIntensity + hv * 0.6;
      u.uChromaticSpread.value = cfg.chromaticSpread + hv * 0.4;
      u.uGlassAlpha.value = cfg.glassAlpha + hv * 0.12;
      u.uStreakIntensity.value = cfg.streakIntensity * (1 + musicGlow * 0.5) + hv * 0.5;
    });
    // Update edge glow shader
    if (edgeMatRef.current) {
      edgeMatRef.current.uniforms.uTime.value = t;
      edgeMatRef.current.uniforms.uOpacity.value = cfg.edgeGlowOpacity;
    }
    // Update wireframe opacity live
    if (wireMatRef.current) wireMatRef.current.opacity = cfg.wireframeOpacity ?? 0.2;
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
          ref={wireMatRef}
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
  const wireMatRef = useRef();
  const angVelRef = useRef({ x: 0, y: 0, z: 0 });
  const portalSuckLerp = useRef(0);
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
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react * 4 : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react * 6 : 0;

    applyAngularPhysics(groupRef, delta, t, musicRotBoost, angVelRef, portalSuckLerp);
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
    if (wireMatRef.current) wireMatRef.current.opacity = cfg.wireframeOpacity ?? 0.2;
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
        <meshBasicMaterial ref={wireMatRef} wireframe color="#ffffff" transparent opacity={cfg.wireframeOpacity ?? 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
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
  const wireMatRef = useRef();
  const angVelRef = useRef({ x: 0, y: 0, z: 0 });
  const portalSuckLerp = useRef(0);

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
    const musicScale = react > 0 ? audioBass * (cfg.musicScalePulse ?? 0.15) * react * 4 : 0;
    const musicRotBoost = react > 0 ? audioMid * (cfg.musicRotationBoost ?? 0.3) * react * 6 : 0;
    const musicGlow = react > 0 ? audioBass * (cfg.musicGlowPulse ?? 0.5) * react * 3 : 0;

    applyAngularPhysics(groupRef, delta, t, musicRotBoost, angVelRef, portalSuckLerp);
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
    if (wireMatRef.current) wireMatRef.current.opacity = cfg.wireframeOpacity ?? 0.2;
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
        <meshBasicMaterial ref={wireMatRef} wireframe color="#ffffff" transparent opacity={cfg.wireframeOpacity ?? 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═══════════ HIT MESH — invisible raycast target for click detection on actual prism ═══════════ */
function PrismHitMesh({ geometry }) {
  return (
    <mesh
      geometry={geometry}
      scale={1.15}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('prism-bop', {
          detail: { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY }
        }));
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
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
      const birthdayExpressions = ['happy', 'excited', 'happy', 'love', 'excited', 'happy', 'mischief', 'excited', 'happy', 'surprised'];
      const defaultStates = [
        'normal', 'normal', 'curious', 'happy', 'normal', 'surprised',
        'excited', 'thinking', 'mischief', 'normal', 'love', 'normal',
      ];
      // Holiday mood weighting: T2+ holidays bias toward their category's glintMood
      const hm = window.__holidayMode;
      const holidayStates = (hm && hm.tier >= 2 && hm.glintMood && !window.__birthdayMode)
        ? [...defaultStates, hm.glintMood, hm.glintMood, hm.glintMood]
        : null;
      const states = window.__birthdayMode ? birthdayExpressions : (holidayStates || defaultStates);
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

/* ═══════════ DISPERSION PHYSICS TRACKER ═══════════ */
// Computes beam angle from config + dispersion breathing from prism rotation.
// Beams live in world space (WorldSpaceBeams) — they follow prism position but
// NOT rotation, because light travels in a fixed direction regardless of prism spin.
function LightDirectionTracker() {
  useFrame(() => {
    sampleAudio();

    // 1. Fixed beam angle from config (stable — only changes via editor sliders)
    //    atan2(Y,X) of light source position gives the direction toward the source.
    //    Beam geometry extends in -X, so we subtract π to get the rotation offset.
    const lx = cfg.lightSourceX ?? -5.0;
    const ly = cfg.lightSourceY ?? 0.5;
    lightState.beamAngle = Math.atan2(ly, lx);

    // 2. Smooth-read prism Y rotation for dispersion breathing
    //    beamDamping: 0=responsive (0.08 lerp), 1=very smooth (0.004 lerp)
    //    Normalize raw rotation to [-PI, PI] so accumulated spins don't cause chaos
    let rawY = window.__prismRotationY || 0;
    rawY = ((rawY % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const damping = cfg.beamDamping ?? 0.7;
    const lerpFactor = 0.08 * (1 - damping * 0.95);
    lightState.prismYRot += (rawY - lightState.prismYRot) * lerpFactor;
    const prismY = lightState.prismYRot;

    // 3. Incidence angle — how "head-on" the light hits the prism face
    lightState.incidenceAngle = Math.acos(Math.abs(Math.cos(prismY)));

    // 4. Dispersion spread — rotation modulates width (the breathing effect)
    const baseDisp = cfg.baseDispersionAngle ?? 0.35;
    const rotMod = cfg.rotationDispersionMod ?? 0.5;
    const incEff = cfg.incidenceEffect ?? 0.4;
    lightState.dispersionSpread = baseDisp
      * (1 + lightState.incidenceAngle * incEff)
      * (1 + Math.sin(2 * prismY) * rotMod * 0.5);

    // 5. Dispersion center — rotation sweeps the rainbow fan
    const fanShift = cfg.rotationFanShift ?? 0.3;
    lightState.dispersionCenter = Math.sin(prismY) * fanShift;

    // 6. Audio modulation — bass widens spread
    const rayAudioSpread = cfg.rayAudioSpread ?? 0.15;
    lightState.dispersionSpread *= (1 + audioBass * rayAudioSpread);

    // 7. Mouse proximity → dispersion spread
    if (cfg.mouseProximityEnabled) {
      const prismNDC = window.__prismNDC;
      if (prismNDC) {
        const dx = mousePos.x - prismNDC.x;
        const dy = mousePos.y - prismNDC.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pMin = cfg.mouseProximityMin ?? 0.05;
        const pMax = cfg.mouseProximityMax ?? 0.8;
        const sMin = cfg.mouseProximitySpreadMin ?? 0.5;
        const sMax = cfg.mouseProximitySpreadMax ?? 2.0;
        const t = Math.max(0, Math.min(1, (dist - pMin) / (pMax - pMin)));
        const factor = sMax + t * (sMin - sMax);
        lightState.mouseProximityFactor += (factor - lightState.mouseProximityFactor) * 0.08;
      }
      lightState.dispersionSpread *= lightState.mouseProximityFactor;
    }

    // 8. Portal suck cascade tracking
    const suckActive = !!window.__prismPortalSuck;
    const isEnteringNow = (window.__prismEnteringStart || 0) > 0 &&
      (performance.now() - window.__prismEnteringStart) < (window.__prismEnteringDuration || 1500);
    // Hard reset when entering — prevents stale exit progress from bleeding into entrance
    if (isEnteringNow && !suckActive) {
      lightState.portalSuckProgress = 0;
    }
    if (suckActive && lightState.portalSuckProgress === 0) {
      lightState.portalSuckStartTime = performance.now();
    }
    if (suckActive) {
      const elapsed = (performance.now() - lightState.portalSuckStartTime) / 600;
      lightState.portalSuckProgress = Math.min(elapsed, 1);
    } else {
      // Fast decay so beams settle quickly after exit
      lightState.portalSuckProgress = Math.max(0, lightState.portalSuckProgress - 0.08);
    }
  });

  return null;
}

/* ═══════════ CONVERGING WHITE BEAM (Pink Floyd style — from the left) ═══════════ */
function IncomingBeam() {
  const matRef = useRef();
  const glowMatRef = useRef();
  const groupRef = useRef();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 1);
    g.translate(-3.5, 0, 0);
    return g;
  }, []);
  const glowGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 8); // 8x taller — room for full Gaussian falloff
    g.translate(-3.5, 0, 0);
    return g;
  }, []);

  useFrame((state) => {
    if (!matRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Group-level transforms
    groupRef.current.rotation.z = lightState.beamAngle - Math.PI;
    groupRef.current.scale.x = (cfg.beamLength ?? 14) / 7;

    // Beam material uniforms
    const u = matRef.current.uniforms;
    u.uTime.value = t;
    const audioBoost = audioBass * (cfg.beamAudioPulse ?? 0.3);
    u.uOpacity.value = cfg.beamOpacity + audioBoost;
    u.uIncidence.value = lightState.incidenceAngle;
    u.uCascadeFade.value = lightState.portalSuckProgress;
    u.uSaberEnabled.value = (cfg.saberEnabled ?? true) ? 1.0 : 0.0;
    u.uSaberCoreWidth.value = cfg.saberCoreWidth ?? 1.0;
    u.uSaberGlowWidth.value = cfg.saberGlowWidth ?? 1.0;
    u.uSaberPulseSpeed.value = cfg.saberPulseSpeed ?? 2.0;
    u.uSaberPulseIntensity.value = cfg.saberPulseIntensity ?? 0.5;
    u.uSaberFlickerSpeed.value = cfg.saberFlickerSpeed ?? 8.0;
    u.uSaberFlickerIntensity.value = cfg.saberFlickerIntensity ?? 0.15;
    u.uSaberColorTemp.value = cfg.saberColorTemp ?? 0.0;
    u.uSaberHDRIntensity.value = cfg.saberHDRIntensity ?? 2.0;
    u.uSaberStreakSpeed.value = cfg.saberStreakSpeed ?? 1.0;
    u.uSaberStreakIntensity.value = cfg.saberStreakIntensity ?? 0.6;

    // Glow halo uniforms
    if (glowMatRef.current) {
      const gu = glowMatRef.current.uniforms;
      gu.uTime.value = t;
      gu.uOpacity.value = cfg.saberGlowOpacity ?? 0.3;
      gu.uSaberEnabled.value = (cfg.saberEnabled ?? true) ? 1.0 : 0.0;
      gu.uSaberPulseSpeed.value = cfg.saberPulseSpeed ?? 2.0;
      gu.uSaberStreakSpeed.value = cfg.saberStreakSpeed ?? 1.0;
      gu.uSaberStreakIntensity.value = cfg.saberStreakIntensity ?? 0.6;
      gu.uCascadeFade.value = lightState.portalSuckProgress;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0.04]}>
      {/* Glow halo — wider, behind the beam */}
      <mesh position={[0, 0, -0.01]} geometry={glowGeo}>
        <shaderMaterial
          ref={glowMatRef}
          vertexShader={simpleVert}
          fragmentShader={beamGlowFrag}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: cfg.saberGlowOpacity ?? 0.3 },
            uSaberEnabled: { value: (cfg.saberEnabled ?? true) ? 1.0 : 0.0 },
            uSaberPulseSpeed: { value: cfg.saberPulseSpeed ?? 2.0 },
            uSaberStreakSpeed: { value: cfg.saberStreakSpeed ?? 1.0 },
            uSaberStreakIntensity: { value: cfg.saberStreakIntensity ?? 0.6 },
            uCascadeFade: { value: 0 },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Main beam */}
      <mesh geometry={geo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={simpleVert}
          fragmentShader={beamFrag}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: cfg.beamOpacity },
            uIncidence: { value: 0 },
            uCascadeFade: { value: 0 },
            uSaberEnabled: { value: (cfg.saberEnabled ?? true) ? 1.0 : 0.0 },
            uSaberCoreWidth: { value: cfg.saberCoreWidth ?? 1.0 },
            uSaberGlowWidth: { value: cfg.saberGlowWidth ?? 1.0 },
            uSaberPulseSpeed: { value: cfg.saberPulseSpeed ?? 2.0 },
            uSaberPulseIntensity: { value: cfg.saberPulseIntensity ?? 0.5 },
            uSaberFlickerSpeed: { value: cfg.saberFlickerSpeed ?? 8.0 },
            uSaberFlickerIntensity: { value: cfg.saberFlickerIntensity ?? 0.15 },
            uSaberColorTemp: { value: cfg.saberColorTemp ?? 0.0 },
            uSaberHDRIntensity: { value: cfg.saberHDRIntensity ?? 2.0 },
            uSaberStreakSpeed: { value: cfg.saberStreakSpeed ?? 1.0 },
            uSaberStreakIntensity: { value: cfg.saberStreakIntensity ?? 0.6 },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ═══════════ RAINBOW FAN (dispersion breathing — exits right) ═══════════ */
const RAINBOW_BANDS = [
  { color: new THREE.Color('#ff1a1a') },
  { color: new THREE.Color('#ff7700') },
  { color: new THREE.Color('#ffdd00') },
  { color: new THREE.Color('#22dd44') },
  { color: new THREE.Color('#2288ff') },
  { color: new THREE.Color('#5533ff') },
  { color: new THREE.Color('#aa22ff') },
];

const BIRTHDAY_BANDS = [
  { color: new THREE.Color('#fbbf24') },
  { color: new THREE.Color('#ff1493') },
  { color: new THREE.Color('#7c3aed') },
  { color: new THREE.Color('#00e5ff') },
  { color: new THREE.Color('#22c55e') },
  { color: new THREE.Color('#ff6b35') },
  { color: new THREE.Color('#c084fc') },
];

// Holiday category band colors (T3 holidays get themed light bands)
const HOLIDAY_BAND_MAP = {
  spooky:    ['#ff6b00', '#22c55e', '#8b5cf6', '#ff6b00', '#22c55e', '#8b5cf6', '#ff6b00'],
  winter:    ['#38bdf8', '#e0f2fe', '#ffffff', '#93c5fd', '#bfdbfe', '#e0f2fe', '#38bdf8'],
  family:    ['#ec4899', '#f43f5e', '#f472b6', '#fb7185', '#fda4af', '#ec4899', '#f43f5e'],
  humor:     ['#eab308', '#ec4899', '#f97316', '#eab308', '#ec4899', '#f97316', '#eab308'],
  scifi:     ['#8b5cf6', '#6366f1', '#06b6d4', '#8b5cf6', '#6366f1', '#06b6d4', '#8b5cf6'],
  adventure: ['#f97316', '#eab308', '#22c55e', '#f97316', '#eab308', '#22c55e', '#f97316'],
};

function getHolidayBands() {
  const hm = window.__holidayMode;
  if (!hm || hm.tier < 3 || !HOLIDAY_BAND_MAP[hm.category]) return null;
  return HOLIDAY_BAND_MAP[hm.category].map(c => ({ color: new THREE.Color(c) }));
}

function RainbowFan() {
  const raysRef = useRef([]);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 0.5);
    g.translate(3.5, 0, 0); // extends from x=0 to x=7 (long rays to the right)
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const bandCount = RAINBOW_BANDS.length;

    // Rainbow exits OPPOSITE the beam: beam points toward source (upper-left),
    // so rainbow exits lower-right. beamAngle ≈ 174° → exitBase ≈ -6°.
    // Ray geometry extends in +X (0°), so exitBase is the rotation offset.
    const exitBase = lightState.beamAngle - Math.PI;
    const audioBoost = audioBass * (cfg.beamAudioPulse ?? 0.3);

    // Normalized dispersion for shader (0 = tight, 1+ = wide)
    const baseDisp = cfg.baseDispersionAngle ?? 0.35;
    const normalizedDisp = lightState.dispersionSpread / Math.max(baseDisp, 0.01);

    // Configurable ray length via scale (base geo is 7 wide)
    const rayScale = (cfg.rayLength ?? 14) / 7;

    // Separate controls: jitter = spread breathing, sweep = rotational center shaking
    // During entrance/exit, scale by excitement multiplier (0=calm, 1=full shake)
    // Entrance excitement fades smoothly from 1→0 over the duration (no hard cutoff pop)
    const enterStart = window.__prismEnteringStart || 0;
    const enterDur = window.__prismEnteringDuration || 1500;
    const enterElapsed = enterStart > 0 ? performance.now() - enterStart : enterDur + 1;
    const enterFade = Math.max(0, 1 - enterElapsed / enterDur); // 1→0 smooth fade
    const isEntering = enterFade > 0.01;
    const isExiting = lightState.portalSuckProgress > 0.01;
    let excitement = 1.0;
    // entranceBeamExcitement multiplies jitter/sweep: >1 = more lively, <1 = calmer
    // Smoothly interpolate from excited value back to 1.0 (normal) over entrance duration
    if (isEntering) excitement = THREE.MathUtils.lerp(1.0, cfg.entranceBeamExcitement ?? 1.4, enterFade);
    else if (isExiting) excitement = cfg.exitBeamExcitement ?? 0.6;

    const jitter = (cfg.rayJitter ?? 1.0) * excitement;
    const sweep = (cfg.raySweep ?? 0.5) * excitement;
    const jitteredCenter = lightState.dispersionCenter * sweep;
    const jitteredSpread = baseDisp + (lightState.dispersionSpread - baseDisp) * jitter;

    // Portal exit spread boost: rays fan apart as they retract (scaled by exit excitement)
    const portalSpread = lightState.portalSuckProgress * (cfg.portalExitSpread ?? 1.5) * (isExiting ? excitement : 1.0);

    // ── Beam feathering breathing — organic oscillation for "alive" feel ──
    const baseFeathering = cfg.beamFeathering ?? 0.5;
    const breathAmt = cfg.beamFeatherBreathing ?? 0.3;
    const breathSpd = cfg.beamFeatherBreathSpeed ?? 0.4;
    // Multi-frequency sine sum → non-repeating organic rhythm
    const featherBreath = Math.sin(t * breathSpd * 2.0) * 0.5
      + Math.sin(t * breathSpd * 3.7 + 1.3) * 0.3
      + Math.sin(t * breathSpd * 0.7 + 2.7) * 0.2;
    const featherVal = THREE.MathUtils.clamp(baseFeathering + featherBreath * breathAmt, 0, 1);

    const holidayBands = getHolidayBands();
    const activeBands = window.__birthdayMode ? BIRTHDAY_BANDS : (holidayBands || RAINBOW_BANDS);

    raysRef.current.forEach((mesh, i) => {
      if (!mesh?.material?.uniforms) return;

      // Swap beam colors based on birthday mode
      mesh.material.uniforms.uColor.value = activeBands[i].color;

      // Normalized position across spectrum: -1 (red) to +1 (violet)
      const normalizedPos = (i / (bandCount - 1)) * 2 - 1;

      // Ray angle: base + jittered motion + portal exit fan-out
      mesh.rotation.z = exitBase
        + jitteredCenter
        + normalizedPos * (jitteredSpread + portalSpread);

      // Ray length scaling
      mesh.scale.x = rayScale;

      // Opacity: subtle per-band intensity variation (outer bands slightly dimmer
      // when dispersed, simulating real light energy distribution across spectrum)
      const bandIntensity = 1.0 - Math.abs(normalizedPos) * 0.12 * normalizedDisp;
      mesh.material.uniforms.uOpacity.value = (cfg.rayOpacity + audioBoost) * bandIntensity;
      mesh.material.uniforms.uTime.value = t;
      mesh.material.uniforms.uDispersionWidth.value = normalizedDisp;
      mesh.material.uniforms.uPortalWiden.value = cfg.portalExitWiden ?? 1.0;
      mesh.material.uniforms.uFeathering.value = featherVal;

      // Cascading portal exit: rays smoothly retract violet-first → red-last
      const cascadeDelay = (bandCount - 1 - i) / bandCount * 0.5;
      const rayCascade = Math.max(0, (lightState.portalSuckProgress - cascadeDelay) / (1 - cascadeDelay));
      mesh.material.uniforms.uCascadeFade.value = Math.min(rayCascade, 1);
    });
  });

  return (
    <group position={[0, 0, 0.04]}>
      {RAINBOW_BANDS.map((band, i) => (
        <mesh
          key={i}
          ref={el => (raysRef.current[i] = el)}
          geometry={geo}
        >
          <shaderMaterial
            vertexShader={simpleVert}
            fragmentShader={rayFrag}
            uniforms={{
              uColor: { value: band.color },
              uOpacity: { value: cfg.rayOpacity },
              uTime: { value: 0 },
              uDispersionWidth: { value: 1.0 },
              uCascadeFade: { value: 0 },
              uPortalWiden: { value: cfg.portalExitWiden ?? 1.0 },
              uFeathering: { value: cfg.beamFeathering ?? 0.5 },
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

/* ═══════════ CONVERGENCE GLOW — iridescent cover at beam junction ═══════════ */
function ConvergenceGlow() {
  const matRef = useRef();
  const meshRef = useRef();
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uOpacity.value = cfg.convergenceGlowOpacity ?? 0.6;
    u.uIridescence.value = cfg.convergenceGlowIridescence ?? 1.0;
    // Live size from editor
    const s = cfg.convergenceGlowSize ?? 1.5;
    meshRef.current.scale.set(s, s, 1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.06]} geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={simpleVert}
        fragmentShader={convergenceGlowFrag}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: cfg.convergenceGlowOpacity ?? 0.6 },
          uIridescence: { value: cfg.convergenceGlowIridescence ?? 1.0 },
        }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ═══════════ WORLD-SPACE BEAMS (no rotation inheritance) ═══════════ */
// Light beams must NOT rotate with the prism — light travels in a fixed direction.
// This wrapper tracks the prism's world POSITION (so beams connect to the prism)
// but ignores rotation, Float bob-spin, MouseDrift tilt, and hover tremble.
function WorldSpaceBeams() {
  const groupRef = useRef();
  useFrame(() => {
    if (!groupRef.current) return;
    const wp = window.__prismWorldPos;
    if (wp) {
      groupRef.current.position.set(wp.x, wp.y, wp.z);
    }
  });
  return (
    <group ref={groupRef}>
      <IncomingBeam />
      <RainbowFan />
      <ConvergenceGlow />
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

/* ═══════════ CHARACTER SCALE (overall size from editor + hover boost) ═══════════ */
function CharacterScaleGroup({ children, groupRef }) {
  const ref = useRef();
  const hoverLerp = useRef(0);
  const tremblePhase = useRef(Math.random() * 100);
  useFrame((state, delta) => {
    if (!ref.current) return;
    // Expose ref for LightDirectionTracker
    if (groupRef) groupRef.current = ref.current;
    const hovered = !!window.__prismHovered;
    const target = hovered ? 1 : 0;
    hoverLerp.current = THREE.MathUtils.lerp(hoverLerp.current, target, delta * 8);
    const hv = hoverLerp.current;
    const hoverBoost = 1 + hv * ((cfg.hoverScale ?? 1.08) - 1);
    // Tremble — tiny rapid wobble when hovered
    const tremble = cfg.hoverTremble ?? 0.3;
    if (hv > 0.01 && tremble > 0) {
      tremblePhase.current += delta * 35;
      const t = tremblePhase.current;
      ref.current.rotation.z = Math.sin(t) * 0.015 * tremble * hv;
      ref.current.rotation.x += Math.cos(t * 1.3) * 0.008 * tremble * hv;
    } else {
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, delta * 12);
    }
    ref.current.scale.setScalar((cfg.characterScale ?? 1) * hoverBoost);
  });
  return <group ref={ref}>{children}</group>;
}

/* ═══════════ SCREEN POSITION TRACKER ═══════════ */
// Projects the prism's world-space position to viewport pixels every frame.
// Accounts for MouseDriftGroup, Float, and CharacterScaleGroup transforms.
// Result stored as window.__prismScreenPos = { x, y } for the bubble connector.
const _projVec = new THREE.Vector3();
function ScreenTracker() {
  const ref = useRef();
  useFrame(({ camera, gl }) => {
    if (!ref.current) return;
    ref.current.getWorldPosition(_projVec);
    // Expose 3D world position for world-space beams (before projection overwrites it)
    window.__prismWorldPos = { x: _projVec.x, y: _projVec.y, z: _projVec.z };
    _projVec.project(camera);
    window.__prismNDC = { x: _projVec.x, y: _projVec.y };
    const rect = gl.domElement.getBoundingClientRect();
    window.__prismScreenPos = {
      x: rect.left + (_projVec.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-_projVec.y * 0.5 + 0.5) * rect.height,
    };
  });
  return <group ref={ref} />;
}

/* ═══════════ GLASS MODE ERROR BOUNDARY ═══════════ */
// If MTM or Hybrid crashes (FBO issues, GPU limits), fall back to shader mode
class GlassErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('[Prism3D] Glass mode error, falling back to shader:', err.message);
    // Reset config to shader mode so editor stays in sync
    if (window.__prismConfig) window.__prismConfig.glassMode = 'shader';
    window.dispatchEvent(new CustomEvent('prism-glass-mode-change'));
  }
  componentDidUpdate(prevProps) {
    // Reset error state when glass mode changes so user can retry
    if (prevProps.glassMode !== this.props.glassMode) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      // Render shader body as fallback
      return <PrismBody geometry={this.props.geometry} />;
    }
    return this.props.children;
  }
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function Prism3D() {
  const nebulaTex = useMemo(() => createNebulaTexture(), []);
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const charGroupRef = useRef(null);
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
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <SceneLights />
        <LightSpill />
        <NebulaBackdrop texture={nebulaTex} />
        {(glassMode === 'mtm' || glassMode === 'hybrid') && <MTMSceneContent />}

        {/* Beams in world space — follow prism position but NOT rotation (light is fixed) */}
        <WorldSpaceBeams />

        <MouseDriftGroup>
          <Float speed={cfg.floatSpeed} rotationIntensity={cfg.rotationIntensity} floatIntensity={cfg.floatIntensity}>
            <CharacterScaleGroup groupRef={charGroupRef}>
              <GlassErrorBoundary glassMode={glassMode} geometry={geometry}>
                {glassMode === 'hybrid' ? <PrismBodyHybrid geometry={geometry} /> : glassMode === 'mtm' ? <PrismBodyMTM geometry={geometry} /> : <PrismBody geometry={geometry} />}
              </GlassErrorBoundary>
              <ScreenTracker />
              <GlassOrbEye />
              {window.__birthdayMode && <PartyHat />}
              <InternalGlow />
              <VertexHighlights />
              <LightDirectionTracker />

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
