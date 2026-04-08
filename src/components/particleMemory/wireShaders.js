/**
 * Wire Connection Shaders — LineSegments rendering
 *
 * Thin luminous lines with emissive color averaged from connected
 * particle colors, alpha fading with 3D distance between endpoints.
 * Alpha pulses gently with uTime for breathing coherence.
 */

export const WIRE_VERT = /* glsl */ `
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aWireAlpha;

varying vec3 vWireColor;
varying float vWireAlpha;

void main() {
  // Average color of connected particles
  vWireColor = mix(aColorA, aColorB, 0.5);
  vWireAlpha = aWireAlpha;

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const WIRE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uWirePulse;
uniform float uWireTransitionAlpha;  // 1.0 = normal, 0.0 = hidden (Phase 16 transition control)

varying vec3 vWireColor;
varying float vWireAlpha;

void main() {
  // Gentle pulse on wire alpha — breathing coherence
  float pulse = 1.0 + sin(uTime * 0.8) * uWirePulse;
  float alpha = vWireAlpha * pulse * 0.4 * uWireTransitionAlpha;
  if (alpha < 0.005) discard;

  // Emissive — slightly brighter than particle colors (filaments of intelligence)
  vec3 color = vWireColor * 1.2;

  gl_FragColor = vec4(color, alpha);
}
`;
