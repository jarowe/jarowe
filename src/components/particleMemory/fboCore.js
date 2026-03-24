// fboCore.js — FBO Ping-Pong GPU Particle System
// Ported from Amina's fbo-particles.ts to plain JS for jarowe.
//
// Uses GPUComputationRenderer from Three.js for fully GPU-driven particle simulation.
// Two data textures: position (xyz + life) and velocity (xyz + mass)
// Supports: turbulence, gravity, wind, drag, target attraction, bounce, respawn,
//           mouse repulsion, breathing wave, scroll cohesion

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

// ────────────────────────────────────────────────────────────
// GLSL: Shared noise functions injected into compute shaders
// ────────────────────────────────────────────────────────────
const GLSL_NOISE = /* glsl */ `
float hash(float n) { return fract(sin(n) * 43758.5453123); }

float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 157.0 + i.z * 113.0;
  return mix(
    mix(mix(hash(n), hash(n + 1.0), f.x),
        mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
    mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
        mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y),
    f.z
  );
}

vec3 noise3v(vec3 p) {
  return vec3(
    noise3d(p),
    noise3d(p + vec3(31.416, -47.853, 12.679)),
    noise3d(p + vec3(-93.217, 61.452, -27.138))
  );
}

vec3 curlNoise(vec3 p) {
  float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 py1 = noise3v(p + dy);
  vec3 py0 = noise3v(p - dy);
  vec3 pz1 = noise3v(p + dz);
  vec3 pz0 = noise3v(p - dz);
  vec3 px1 = noise3v(p + dx);
  vec3 px0 = noise3v(p - dx);
  float inv2e = 1.0 / (2.0 * e);
  return vec3(
    (py1.z - py0.z) * inv2e - (pz1.y - pz0.y) * inv2e,
    (pz1.x - pz0.x) * inv2e - (px1.z - px0.z) * inv2e,
    (px1.y - px0.y) * inv2e - (py1.x - py0.x) * inv2e
  );
}
`;

// ────────────────────────────────────────────────────────────
// GLSL: Velocity update compute shader
// ────────────────────────────────────────────────────────────
const velocityShader = /* glsl */ `
uniform float uDeltaTime;
uniform float uTime;

// Physics uniforms
uniform float uTurbulenceScale;
uniform float uTurbulenceStrength;
uniform float uTurbulenceSpeed;
uniform float uTurbulenceOctaves;
uniform float uGravity;
uniform float uDrag;
uniform vec3  uWind;

// Attractor
uniform float uAttractorStrength;
uniform float uAttractorRadius;
uniform float uAttractorFalloff;

// Target attraction (SDF / target positions)
uniform float uSDFAttractStrength;
uniform float uSDFAttractSmooth;
uniform float uSDFSpring;
uniform float uSDFNoiseDisturb;
uniform float uConvergence;

// Vortex
uniform float uVortexStrength;

// Curl noise
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uCurlSpeed;

// Bounce
uniform float uBounceFloorY;
uniform float uBounceEnabled;
uniform float uBounceStrength;
uniform float uBounceFriction;
uniform float uBounceAbsorb;

// Mouse repulsion — particles push away from a 3D mouse position
uniform vec3  uMousePos;
uniform float uMouseRepulsion;   // strength
uniform float uMouseRadius;      // influence radius

// Breathing wave — sinusoidal z-displacement rolled by y-position
uniform float uBreathingWave;    // amplitude

// Scroll cohesion — spring strength scalar (0 = free drift, 1 = tight lock)
uniform float uScrollCohesion;

// Target texture (target positions)
uniform sampler2D tTargets;

${GLSL_NOISE}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(tPosition, uv);
  vec4 velData = texture2D(tVelocity, uv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;
  float mass = velData.w;

  // Skip dead particles (life <= 0) — they'll be respawned in position shader
  if (life <= 0.0) {
    gl_FragColor = velData;
    return;
  }

  float dt = uDeltaTime;
  float invMass = 1.0 / max(mass, 0.1);

  // ── Gravity ──
  vel.y -= uGravity * dt * invMass;

  // ── Wind ──
  vel += uWind * dt * invMass;

  // ── Multi-octave turbulence (curl noise for divergence-free flow) ──
  if (uTurbulenceStrength > 0.001) {
    vec3 turbPos = pos * uTurbulenceScale + uTime * uTurbulenceSpeed;
    vec3 turbForce = vec3(0.0);
    float amplitude = 1.0;
    float frequency = 1.0;
    float totalAmp = 0.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uTurbulenceOctaves) break;
      turbForce += curlNoise(turbPos * frequency) * amplitude;
      totalAmp += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    turbForce /= max(totalAmp, 1.0);
    vel += turbForce * uTurbulenceStrength * dt * invMass;
  }

  // ── Curl noise force field ──
  if (uCurlStrength > 0.001) {
    vec3 curlSample = pos * uCurlScale + uTime * uCurlSpeed * 2.0;
    vec3 curlForce = curlNoise(curlSample) * uCurlStrength;
    vel += curlForce * dt * invMass;
  }

  // ── Vortex (rotation around Y axis) ──
  if (uVortexStrength > 0.001) {
    float distXZ = length(vec2(pos.x, pos.z));
    if (distXZ > 0.01) {
      // Tangential force perpendicular to radial direction in XZ plane
      vec3 tangent = normalize(vec3(-pos.z, 0.0, pos.x));
      vel += tangent * uVortexStrength * dt * invMass;
    }
  }

  // ── Origin attractor ──
  if (uAttractorStrength > 0.001) {
    vec3 toOrigin = -pos;
    float dist = length(toOrigin);
    if (dist > 0.01) {
      float influence = 1.0 - smoothstep(0.0, uAttractorRadius, dist);
      float falloffPow = pow(influence, uAttractorFalloff);
      vec3 attractForce = normalize(toOrigin) * falloffPow * uAttractorStrength;
      vel += attractForce * dt * invMass;
    }
  }

  // ── Target Attraction (spring toward target positions) ──
  if (uSDFAttractStrength > 0.001) {
    vec4 targetData = texture2D(tTargets, uv);
    vec3 target = targetData.xyz;
    float hasTarget = targetData.w; // 1.0 if valid target, 0.0 if none

    if (hasTarget > 0.5) {
      vec3 toTarget = target - pos;
      float dist = length(toTarget);

      if (dist > 0.001) {
        vec3 dir = toTarget / dist;

        // Spring force with smooth onset, scaled by scrollCohesion
        float springForce = uSDFAttractStrength * smoothstep(0.0, uSDFAttractSmooth + 0.5, dist);
        springForce *= uConvergence;
        springForce *= max(uScrollCohesion, 0.05); // scrollCohesion modulates spring tightness

        // Damping: higher spring = more damping = less overshoot
        float dampingFactor = 1.0 / (1.0 + uSDFSpring * 2.0);

        // Dampen velocity component along spring direction (critical damping)
        float velAlongSpring = dot(vel, dir);
        vel -= dir * velAlongSpring * uSDFSpring * 0.5 * dt;

        // Apply spring force
        vel += dir * springForce * dampingFactor * dt * invMass;

        // Curl noise disturbance for organic feel
        if (uSDFNoiseDisturb > 0.001) {
          vec3 disturbNoise = curlNoise(pos * 2.0 + uTime) * uSDFNoiseDisturb * 0.5;
          disturbNoise *= (1.0 - uConvergence * 0.8);
          vel += disturbNoise * dt * invMass;
        }
      }
    }
  }

  // ── Mouse repulsion ──
  if (uMouseRepulsion > 0.001) {
    vec3 toParticle = pos - uMousePos;
    float dist = length(toParticle);
    if (dist < uMouseRadius && dist > 0.01) {
      float pushStrength = (1.0 - dist / uMouseRadius);
      pushStrength = pushStrength * pushStrength; // quadratic falloff
      vec3 pushDir = normalize(toParticle);
      vel += pushDir * pushStrength * uMouseRepulsion * dt * invMass;
    }
  }

  // ── Breathing wave — sinusoidal z-displacement based on y-position ──
  if (uBreathingWave > 0.001) {
    float wave = sin(pos.y * 1.5 + uTime * 0.8) * uBreathingWave;
    vel.z += wave * dt * invMass;
  }

  // ── Drag (velocity damping) ──
  vel *= (1.0 - uDrag * dt);

  // ── Bounce off floor ──
  if (uBounceEnabled > 0.5) {
    // Predict next position
    vec3 nextPos = pos + vel * dt;
    if (nextPos.y < uBounceFloorY && vel.y < 0.0) {
      // Reflect velocity
      vel.y = -vel.y * uBounceStrength * (1.0 - uBounceAbsorb * hash(pos.x * 13.7 + pos.z * 7.3));
      // Apply friction to horizontal velocity
      vel.x *= (1.0 - uBounceFriction);
      vel.z *= (1.0 - uBounceFriction);
    }
  }

  gl_FragColor = vec4(vel, mass);
}
`;

// ────────────────────────────────────────────────────────────
// GLSL: Position integration + respawn compute shader
// ────────────────────────────────────────────────────────────
const positionShader = /* glsl */ `
uniform float uDeltaTime;
uniform float uTime;
uniform float uLifeMin;
uniform float uLifeMax;
uniform float uBounceFloorY;
uniform float uBounceEnabled;
uniform float uScatterRadius;

// Emitter controls
uniform float uEmitterShape;
uniform float uEmitterRadius;
uniform float uEmitterSpread;
uniform float uEmitterVelocity;
uniform vec3  uEmitterDirection;

// Target texture for respawn near targets
uniform sampler2D tTargets;

${GLSL_NOISE}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(tPosition, uv);
  vec4 velData = texture2D(tVelocity, uv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;

  float dt = uDeltaTime;

  // ── Respawn logic ──
  if (life <= 0.0) {
    // Generate pseudo-random seed from texel coordinate
    float seed = hash(uv.x * 1337.0 + uv.y * 7919.0 + uTime * 3.14159);
    float seed2 = hash(seed * 4721.0 + uTime * 2.718);
    float seed3 = hash(seed2 * 6151.0 + uTime);

    // Randomize new lifetime
    life = uLifeMin + (uLifeMax - uLifeMin) * seed;

    // Spawn position based on emitter shape
    if (uEmitterShape < 0.5) {
      // Default: scattered sphere around origin
      float theta = seed * 6.283185;
      float phi = acos(2.0 * seed2 - 1.0);
      float r = pow(seed3, 0.333) * uScatterRadius;
      pos = vec3(
        r * sin(phi) * cos(theta),
        r * sin(phi) * sin(theta),
        r * cos(phi)
      );
    } else if (uEmitterShape < 1.5) {
      // Sphere emitter
      float theta = seed * 6.283185;
      float phi = acos(2.0 * seed2 - 1.0);
      float r = pow(seed3, 0.333) * uEmitterRadius;
      pos = vec3(
        r * sin(phi) * cos(theta),
        r * sin(phi) * sin(theta),
        r * cos(phi)
      );
    } else if (uEmitterShape < 2.5) {
      // Box emitter
      pos = vec3(
        (seed - 0.5) * uEmitterRadius * 2.0,
        (seed2 - 0.5) * uEmitterRadius * 2.0,
        (seed3 - 0.5) * uEmitterRadius * 2.0
      );
    } else {
      // Disc emitter
      float angle = seed * 6.283185;
      float r = sqrt(seed2) * uEmitterRadius;
      pos = vec3(cos(angle) * r, 0.0, sin(angle) * r);
    }

    // Give new velocity based on emitter direction
    vec3 newVel = uEmitterDirection * uEmitterVelocity;
    // Add spread
    newVel += vec3(
      (hash(seed * 111.0) - 0.5) * uEmitterSpread,
      (hash(seed * 222.0) - 0.5) * uEmitterSpread,
      (hash(seed * 333.0) - 0.5) * uEmitterSpread
    );

    gl_FragColor = vec4(pos, life);
    return;
  }

  // ── Euler integration ──
  pos += vel * dt;

  // ── Floor clamp (if bounce is on, position is clamped above floor) ──
  if (uBounceEnabled > 0.5 && pos.y < uBounceFloorY) {
    pos.y = uBounceFloorY + 0.001;
  }

  // ── Decrease life ──
  life -= dt;

  gl_FragColor = vec4(pos, life);
}
`;

// ────────────────────────────────────────────────────────────
// GLSL: Render vertex shader (reads FBO textures)
// ────────────────────────────────────────────────────────────
export const fboRenderVertexShader = /* glsl */ `
uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform sampler2D tTargets;
uniform float uPointScale;
uniform float uPixelRatio;
uniform float uLifeMax;
uniform float uMinSize;
uniform float uMaxSize;
uniform float uConvergence;
uniform float uColorBrightness;

attribute vec2 aReference; // UV coordinates into FBO textures

varying float vLife;
varying float vLifeNorm;   // 0 = just born, 1 = about to die
varying float vSpeed;
varying float vDistToTarget;
varying float vActivation;

void main() {
  vec4 posData = texture2D(tPosition, aReference);
  vec4 velData = texture2D(tVelocity, aReference);
  vec4 targetData = texture2D(tTargets, aReference);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;
  vec3 target = targetData.xyz;
  float hasTarget = targetData.w;

  // Dead particles: hide them
  if (life <= 0.0) {
    gl_Position = vec4(99999.0, 99999.0, 99999.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  // Life normalized: 0 when full life, 1 when about to die
  vLife = life;
  vLifeNorm = 1.0 - clamp(life / max(uLifeMax, 0.1), 0.0, 1.0);

  // Speed for color mapping
  vSpeed = length(vel);

  // Distance to target for convergence glow
  vDistToTarget = hasTarget > 0.5 ? length(pos - target) : 10.0;

  // Activation based on life and convergence
  vActivation = clamp(1.0 - vLifeNorm * 0.5, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Size: larger when young, fading when old
  float lifeSize = 1.0 - vLifeNorm * 0.6;
  float baseSize = mix(uMinSize, uMaxSize, lifeSize) * uPointScale;
  baseSize = clamp(baseSize, uMinSize, uMaxSize);

  // Proximity boost: particles near their target glow bigger
  if (hasTarget > 0.5 && uConvergence > 0.01) {
    float proxBoost = exp(-vDistToTarget * vDistToTarget * 2.0) * uConvergence * 0.5;
    baseSize *= (1.0 + proxBoost);
  }

  gl_PointSize = baseSize * (50.0 * uPixelRatio / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// ────────────────────────────────────────────────────────────
// GLSL: Render fragment shader
// ────────────────────────────────────────────────────────────
export const fboRenderFragmentShader = /* glsl */ `
precision highp float;

uniform float uConvergence;
uniform float uBloomIntensity;
uniform float uOpacityMin;
uniform float uOpacityMax;
uniform float uColorBrightness;
uniform float uColorSaturation;
uniform float uColorMode;

// Neutral palette colors (no brand-specific references)
uniform vec3 uColorDormant;     // deep / idle color
uniform vec3 uColorAwakening;   // transitional color
uniform vec3 uColorActive;      // active / alive color
uniform vec3 uColorBright;      // highlight / peak color
uniform vec3 uColorAccentA;     // accent A (e.g. warm)
uniform vec3 uColorAccentB;     // accent B (e.g. cool)

varying float vLife;
varying float vLifeNorm;
varying float vSpeed;
varying float vDistToTarget;
varying float vActivation;

void main() {
  // Circular point with soft edge
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float softEdge = 1.0 - smoothstep(0.2, 0.45, dist);
  float coreGlow = exp(-dist * 10.0);

  // ── Color by mode ──
  vec3 baseColor;

  if (uColorMode < 0.5) {
    // Mode 0: Lifecycle-based (default)
    float t = vActivation;
    baseColor = mix(uColorDormant, uColorAwakening, smoothstep(0.0, 0.3, t));
    baseColor = mix(baseColor, uColorActive, smoothstep(0.3, 0.7, t));
    baseColor = mix(baseColor, uColorBright, smoothstep(0.8, 1.0, t) * uConvergence);
  } else if (uColorMode < 1.5) {
    // Mode 1: Height-based
    float heightT = clamp((vLifeNorm + 0.5) * 0.5, 0.0, 1.0);
    baseColor = mix(vec3(0.02, 0.08, 0.25), vec3(0.05, 0.65, 0.65), heightT);
  } else if (uColorMode < 2.5) {
    // Mode 2: Speed-based
    float speedT = clamp(vSpeed * 2.0, 0.0, 1.0);
    baseColor = mix(vec3(0.02, 0.06, 0.18), vec3(0.35, 0.55, 0.90), speedT);
  } else if (uColorMode < 3.5) {
    // Mode 3: Activation-based
    baseColor = mix(vec3(0.02, 0.04, 0.10), vec3(0.20, 0.33, 0.86), vActivation);
  } else {
    // Mode 4: Energy / velocity
    float energyT = clamp(vSpeed * 3.0, 0.0, 1.0);
    baseColor = mix(vec3(0.02, 0.08, 0.25), vec3(1.0, 0.27, 0.0), energyT);
  }

  // ── Convergence glow (particles near targets brighten) ──
  float proxGlow = exp(-vDistToTarget * vDistToTarget * 1.5) * uConvergence;
  baseColor = mix(baseColor, uColorBright, proxGlow * 0.4);

  // ── Emissive boost ──
  float emissive = mix(0.5, 1.8, vActivation);
  emissive += coreGlow * vActivation * uBloomIntensity * 0.2;
  vec3 finalColor = baseColor * emissive;

  // ── Saturation & brightness ──
  vec3 luminance = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
  finalColor = mix(luminance, finalColor, uColorSaturation);
  finalColor *= uColorBrightness;

  // ── Channel clamp ──
  finalColor = min(finalColor, vec3(0.85));

  // ── Alpha ──
  float alpha = softEdge * vActivation;
  // Fade out at end of life
  float lifeFade = smoothstep(0.0, 0.15, vLife);
  alpha *= lifeFade;
  // Fade in at birth
  float birthFade = smoothstep(0.85, 0.7, vLifeNorm);
  alpha *= birthFade;

  alpha = clamp(alpha * 0.25, uOpacityMin, uOpacityMax);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ────────────────────────────────────────────────────────────
// FBOCore class — GPU particle system manager
// ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FBOUniforms
 * @property {number} deltaTime
 * @property {number} time
 *
 * @property {number} turbulenceScale
 * @property {number} turbulenceStrength
 * @property {number} turbulenceSpeed
 * @property {number} turbulenceOctaves
 * @property {number} gravity
 * @property {number} drag
 * @property {number} windX
 * @property {number} windY
 * @property {number} windZ
 *
 * @property {number} attractorStrength
 * @property {number} attractorRadius
 * @property {number} attractorFalloff
 *
 * @property {number} sdfAttractStrength
 * @property {number} sdfAttractSmooth
 * @property {number} sdfSpring
 * @property {number} sdfNoiseDisturb
 * @property {number} convergence
 *
 * @property {number} vortexStrength
 * @property {number} curlScale
 * @property {number} curlStrength
 * @property {number} curlSpeed
 *
 * @property {number} bounceFloorY
 * @property {number} bounceEnabled
 * @property {number} bounceStrength
 * @property {number} bounceFriction
 * @property {number} bounceAbsorb
 *
 * @property {number} lifeMin
 * @property {number} lifeMax
 * @property {number} scatterRadius
 *
 * @property {number} emitterShape
 * @property {number} emitterRadius
 * @property {number} emitterSpread
 * @property {number} emitterVelocity
 * @property {number} emitterDirectionX
 * @property {number} emitterDirectionY
 * @property {number} emitterDirectionZ
 *
 * @property {number} mouseX       - 3D mouse position X
 * @property {number} mouseY       - 3D mouse position Y
 * @property {number} mouseZ       - 3D mouse position Z
 * @property {number} mouseRepulsion - repulsion strength
 * @property {number} mouseRadius  - repulsion influence radius
 *
 * @property {number} breathingWave - breathing wave amplitude
 * @property {number} scrollCohesion - 0 = free drift, 1 = tight convergence to targets
 */

class FBOCore {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {number} particleCount
   * @param {Float32Array | null} targetPositions  — xyz per particle, or null
   */
  constructor(renderer, particleCount, targetPositions) {
    // Compute texture dimensions (square, ceil to next integer side)
    const side = Math.ceil(Math.sqrt(particleCount));
    /** @type {number} */
    this.textureWidth = side;
    /** @type {number} */
    this.textureHeight = side;
    const totalTexels = side * side;

    /** @type {boolean} */
    this._disposed = false;

    // ── Create GPUComputationRenderer ──
    /** @type {GPUComputationRenderer} */
    this.gpuCompute = new GPUComputationRenderer(side, side, renderer);

    // Check float texture support
    if (!renderer.capabilities.isWebGL2) {
      const ext = renderer.extensions.get('OES_texture_float');
      if (!ext) {
        console.warn('FBOCore: Float textures not supported on this device');
      }
    }

    // ── Initialize data textures ──
    const posTexture = this.gpuCompute.createTexture();
    const velTexture = this.gpuCompute.createTexture();

    const posData = posTexture.image.data;
    const velData = velTexture.image.data;

    // Seeded PRNG for deterministic init
    let seed = 12345;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < totalTexels; i++) {
      const i4 = i * 4;

      // Random spherical scatter for initial positions
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = Math.pow(rand(), 0.333) * 8.0;

      posData[i4 + 0] = r * Math.sin(phi) * Math.cos(theta);
      posData[i4 + 1] = r * Math.sin(phi) * Math.sin(theta);
      posData[i4 + 2] = r * Math.cos(phi);
      posData[i4 + 3] = rand() * 4.0 + 1.0; // life: 1-5 seconds initially staggered

      // Small random initial velocity
      velData[i4 + 0] = (rand() - 0.5) * 0.5;
      velData[i4 + 1] = (rand() - 0.5) * 0.5;
      velData[i4 + 2] = (rand() - 0.5) * 0.5;
      velData[i4 + 3] = 0.5 + rand() * 1.0; // mass: 0.5-1.5
    }

    // ── Create target texture (target positions for attraction) ──
    const targetData = new Float32Array(totalTexels * 4);
    if (targetPositions) {
      const numTargets = Math.floor(targetPositions.length / 3);
      for (let i = 0; i < totalTexels; i++) {
        const i4 = i * 4;
        if (i < numTargets) {
          targetData[i4 + 0] = targetPositions[i * 3 + 0];
          targetData[i4 + 1] = targetPositions[i * 3 + 1];
          targetData[i4 + 2] = targetPositions[i * 3 + 2];
          targetData[i4 + 3] = 1.0; // has target
        } else {
          targetData[i4 + 0] = 0;
          targetData[i4 + 1] = 0;
          targetData[i4 + 2] = 0;
          targetData[i4 + 3] = 0.0; // no target
        }
      }
    }
    /** @type {THREE.DataTexture} */
    this.targetTexture = new THREE.DataTexture(
      targetData, side, side, THREE.RGBAFormat, THREE.FloatType,
    );
    this.targetTexture.needsUpdate = true;

    // ── Add compute variables ──
    this.positionVariable = this.gpuCompute.addVariable(
      'tPosition', positionShader, posTexture,
    );
    this.velocityVariable = this.gpuCompute.addVariable(
      'tVelocity', velocityShader, velTexture,
    );

    // Dependencies: both read from both
    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable, this.velocityVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.positionVariable, this.velocityVariable,
    ]);

    // ── Add uniforms to position shader ──
    const posUniforms = this.positionVariable.material.uniforms;
    posUniforms.uDeltaTime = { value: 0.016 };
    posUniforms.uTime = { value: 0 };
    posUniforms.uLifeMin = { value: 2.0 };
    posUniforms.uLifeMax = { value: 6.0 };
    posUniforms.uBounceFloorY = { value: -2.0 };
    posUniforms.uBounceEnabled = { value: 0 };
    posUniforms.uScatterRadius = { value: 8.0 };
    posUniforms.uEmitterShape = { value: 0 };
    posUniforms.uEmitterRadius = { value: 5.0 };
    posUniforms.uEmitterSpread = { value: 1.0 };
    posUniforms.uEmitterVelocity = { value: 0.0 };
    posUniforms.uEmitterDirection = { value: new THREE.Vector3(0, 1, 0) };
    posUniforms.tTargets = { value: this.targetTexture };

    // ── Add uniforms to velocity shader ──
    const velUniforms = this.velocityVariable.material.uniforms;
    velUniforms.uDeltaTime = { value: 0.016 };
    velUniforms.uTime = { value: 0 };
    velUniforms.uTurbulenceScale = { value: 2.0 };
    velUniforms.uTurbulenceStrength = { value: 0.0 };
    velUniforms.uTurbulenceSpeed = { value: 1.0 };
    velUniforms.uTurbulenceOctaves = { value: 3 };
    velUniforms.uGravity = { value: 0.0 };
    velUniforms.uDrag = { value: 0.0 };
    velUniforms.uWind = { value: new THREE.Vector3(0, 0, 0) };
    velUniforms.uAttractorStrength = { value: 0.0 };
    velUniforms.uAttractorRadius = { value: 3.0 };
    velUniforms.uAttractorFalloff = { value: 2.0 };
    velUniforms.uSDFAttractStrength = { value: 0.0 };
    velUniforms.uSDFAttractSmooth = { value: 0.5 };
    velUniforms.uSDFSpring = { value: 0.8 };
    velUniforms.uSDFNoiseDisturb = { value: 0.15 };
    velUniforms.uConvergence = { value: 0.0 };
    velUniforms.uVortexStrength = { value: 0.0 };
    velUniforms.uCurlScale = { value: 1.5 };
    velUniforms.uCurlStrength = { value: 0.0 };
    velUniforms.uCurlSpeed = { value: 1.0 };
    velUniforms.uBounceFloorY = { value: -2.0 };
    velUniforms.uBounceEnabled = { value: 0 };
    velUniforms.uBounceStrength = { value: 0.6 };
    velUniforms.uBounceFriction = { value: 0.3 };
    velUniforms.uBounceAbsorb = { value: 0.2 };
    velUniforms.tTargets = { value: this.targetTexture };

    // New jarowe-specific uniforms
    velUniforms.uMousePos = { value: new THREE.Vector3(0, 0, 0) };
    velUniforms.uMouseRepulsion = { value: 0.0 };
    velUniforms.uMouseRadius = { value: 2.0 };
    velUniforms.uBreathingWave = { value: 0.0 };
    velUniforms.uScrollCohesion = { value: 1.0 };

    // ── Initialize ──
    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error('FBOCore GPU init error:', error);
    }

    // ── Build render geometry with aReference attribute ──
    /** @type {THREE.BufferGeometry} */
    this.renderGeometry = new THREE.BufferGeometry();
    const references = new Float32Array(totalTexels * 2);
    for (let i = 0; i < totalTexels; i++) {
      const x = (i % side) / side + 0.5 / side;
      const y = Math.floor(i / side) / side + 0.5 / side;
      references[i * 2] = x;
      references[i * 2 + 1] = y;
    }
    this.renderGeometry.setAttribute('aReference', new THREE.BufferAttribute(references, 2));
    // Dummy position attribute required by Three.js
    const dummyPositions = new Float32Array(totalTexels * 3);
    this.renderGeometry.setAttribute('position', new THREE.BufferAttribute(dummyPositions, 3));
  }

  /**
   * Update target positions at runtime (e.g., when switching formations).
   * @param {Float32Array | null} targetPositions — xyz per particle, or null to clear
   */
  setTargetPositions(targetPositions) {
    if (this._disposed) return;

    const totalTexels = this.textureWidth * this.textureHeight;
    const data = this.targetTexture.image.data;

    if (targetPositions) {
      const numTargets = Math.floor(targetPositions.length / 3);
      for (let i = 0; i < totalTexels; i++) {
        const i4 = i * 4;
        if (i < numTargets) {
          data[i4 + 0] = targetPositions[i * 3 + 0];
          data[i4 + 1] = targetPositions[i * 3 + 1];
          data[i4 + 2] = targetPositions[i * 3 + 2];
          data[i4 + 3] = 1.0;
        } else {
          data[i4 + 0] = 0;
          data[i4 + 1] = 0;
          data[i4 + 2] = 0;
          data[i4 + 3] = 0.0;
        }
      }
    } else {
      data.fill(0);
    }

    this.targetTexture.needsUpdate = true;
  }

  /**
   * Update uniforms and run one compute step.
   * @param {FBOUniforms} uniforms
   */
  update(uniforms) {
    if (this._disposed) return;

    // Position shader uniforms
    const posU = this.positionVariable.material.uniforms;
    posU.uDeltaTime.value = uniforms.deltaTime;
    posU.uTime.value = uniforms.time;
    posU.uLifeMin.value = uniforms.lifeMin;
    posU.uLifeMax.value = uniforms.lifeMax;
    posU.uBounceFloorY.value = uniforms.bounceFloorY;
    posU.uBounceEnabled.value = uniforms.bounceEnabled;
    posU.uScatterRadius.value = uniforms.scatterRadius;
    posU.uEmitterShape.value = uniforms.emitterShape;
    posU.uEmitterRadius.value = uniforms.emitterRadius;
    posU.uEmitterSpread.value = uniforms.emitterSpread;
    posU.uEmitterVelocity.value = uniforms.emitterVelocity;
    posU.uEmitterDirection.value.set(
      uniforms.emitterDirectionX, uniforms.emitterDirectionY, uniforms.emitterDirectionZ,
    );

    // Velocity shader uniforms
    const velU = this.velocityVariable.material.uniforms;
    velU.uDeltaTime.value = uniforms.deltaTime;
    velU.uTime.value = uniforms.time;
    velU.uTurbulenceScale.value = uniforms.turbulenceScale;
    velU.uTurbulenceStrength.value = uniforms.turbulenceStrength;
    velU.uTurbulenceSpeed.value = uniforms.turbulenceSpeed;
    velU.uTurbulenceOctaves.value = uniforms.turbulenceOctaves;
    velU.uGravity.value = uniforms.gravity;
    velU.uDrag.value = uniforms.drag;
    velU.uWind.value.set(uniforms.windX, uniforms.windY, uniforms.windZ);
    velU.uAttractorStrength.value = uniforms.attractorStrength;
    velU.uAttractorRadius.value = uniforms.attractorRadius;
    velU.uAttractorFalloff.value = uniforms.attractorFalloff;
    velU.uSDFAttractStrength.value = uniforms.sdfAttractStrength;
    velU.uSDFAttractSmooth.value = uniforms.sdfAttractSmooth;
    velU.uSDFSpring.value = uniforms.sdfSpring;
    velU.uSDFNoiseDisturb.value = uniforms.sdfNoiseDisturb;
    velU.uConvergence.value = uniforms.convergence;
    velU.uVortexStrength.value = uniforms.vortexStrength;
    velU.uCurlScale.value = uniforms.curlScale;
    velU.uCurlStrength.value = uniforms.curlStrength;
    velU.uCurlSpeed.value = uniforms.curlSpeed;
    velU.uBounceFloorY.value = uniforms.bounceFloorY;
    velU.uBounceEnabled.value = uniforms.bounceEnabled;
    velU.uBounceStrength.value = uniforms.bounceStrength;
    velU.uBounceFriction.value = uniforms.bounceFriction;
    velU.uBounceAbsorb.value = uniforms.bounceAbsorb;

    // Mouse repulsion
    velU.uMousePos.value.set(
      uniforms.mouseX ?? 0,
      uniforms.mouseY ?? 0,
      uniforms.mouseZ ?? 0,
    );
    velU.uMouseRepulsion.value = uniforms.mouseRepulsion ?? 0;
    velU.uMouseRadius.value = uniforms.mouseRadius ?? 2.0;

    // Breathing wave
    velU.uBreathingWave.value = uniforms.breathingWave ?? 0;

    // Scroll cohesion
    velU.uScrollCohesion.value = uniforms.scrollCohesion ?? 1.0;

    // Run compute
    this.gpuCompute.compute();
  }

  /** Get the current position render target texture (for render shader) */
  getPositionTexture() {
    return this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
  }

  /** Get the current velocity render target texture (for render shader) */
  getVelocityTexture() {
    return this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;
  }

  /** Get the target texture */
  getTargetTexture() {
    return this.targetTexture;
  }

  /** Dispose GPU resources */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.gpuCompute.dispose();
    this.renderGeometry.dispose();
    this.targetTexture.dispose();
  }
}

export default FBOCore;
