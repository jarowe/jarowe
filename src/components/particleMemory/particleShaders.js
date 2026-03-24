/**
 * Particle Memory Field — GLSL Shaders
 *
 * Vertex shader handles dual buffer interpolation (Phase 16 ready),
 * depth-correlated breathing animation, and perspective-corrected sizing.
 * Fragment shader renders soft-circle particles with shader halo glow.
 */

export const PARTICLE_MEMORY_VERT = /* glsl */ `
uniform float uTime;
uniform float uBreathSpeed;
uniform float uBreathAmplitude;
uniform float uMorphProgress;  // 0 = scattered, 1 = photo-formed (Phase 16)

attribute vec3 aPhotoPosition;
attribute vec3 aScatteredPosition;
attribute float aSize;
attribute float aDepthValue;
attribute float aPhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vBreathPhase;

void main() {
  // Dual buffer interpolation (INTEG-02 — Phase 16 ready)
  vec3 basePos = mix(aScatteredPosition, aPhotoPosition, uMorphProgress);

  // Depth-correlated breathing wave (D-08)
  // Foreground (low depth) breathes first, wave rolls backward into the scene
  float breathPhase = uTime * uBreathSpeed - aDepthValue * 3.14159;
  breathPhase += aPhase * 0.5;  // organic jitter per particle
  float breath = sin(breathPhase) * uBreathAmplitude;

  // Breathing displaces along Z — foreground breathes more
  vec3 pos = basePos;
  pos.z += breath * (1.0 - aDepthValue * 0.5);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

  // Size: depth + luminance driven (D-10), perspective-corrected
  // Size breathing — particle size oscillates with the same depth-correlated wave
  float breathScale = 1.0 + sin(breathPhase) * 0.12; // +/- 12% size oscillation
  gl_PointSize = aSize * breathScale * (200.0 / max(-mvPos.z, 0.5));
  gl_PointSize = clamp(gl_PointSize, 1.0, 25.0);

  // Pass to fragment
  vColor = aColor;
  vDepth = aDepthValue;
  vBreathPhase = breathPhase;

  // Depth-based alpha: foreground slightly brighter
  vAlpha = 0.75 + (1.0 - aDepthValue) * 0.25;

  gl_Position = projectionMatrix * mvPos;
}
`;

export const PARTICLE_MEMORY_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vBreathPhase;

void main() {
  // Distance from center of point sprite
  float d = length(gl_PointCoord - 0.5) * 2.0;

  // Soft circle core (D-04)
  float core = smoothstep(0.8, 0.0, d);

  // Shader halo — secondary low-alpha glow ring (D-09, all tiers)
  float halo = smoothstep(1.0, 0.3, d) * 0.15;

  float alpha = max(core, halo) * vAlpha;

  if (alpha < 0.01) discard;

  // Direct pixel color from photo (D-03)
  // Breathing brightness oscillation (D-08)
  float brightnessPulse = 1.0 + sin(vBreathPhase) * 0.1;
  vec3 color = vColor * 1.05 * brightnessPulse;

  gl_FragColor = vec4(color, alpha);
}
`;
