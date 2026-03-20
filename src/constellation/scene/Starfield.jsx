import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCfg } from '../constellationDefaults';

/**
 * Seeded pseudo-random for deterministic star placement.
 */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Star vertex shader — twinkle via sin(time + phase) */
const starVertexShader = `
  attribute float size;
  attribute float phase;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uTwinkleSpeed;
  void main() {
    vColor = color;
    // Twinkle: oscillate brightness per-star
    vTwinkle = 0.65 + 0.35 * sin(uTime * uTwinkleSpeed + phase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.8, 6.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** Star fragment shader — soft circle with twinkle */
const starFragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, dist) * vTwinkle;
    // Slightly brighten the core
    vec3 col = vColor * (1.0 + smoothstep(0.3, 0.0, dist) * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Enhanced background star field with color variation.
 * Some stars are warm (yellowish/orange), some cool (blue-white),
 * most are neutral white. Creates a more realistic, cinematic look.
 */
export default function Starfield({ starCount }) {
  const pointsRef = useRef();

  const { geometry, material } = useMemo(() => {
    const count = starCount || 2200;
    const radius = getCfg('starRadius');
    const depth = getCfg('starDepth');
    const brightness = getCfg('starBrightness');
    const colorVar = getCfg('starColorVariation');
    const warmRatio = getCfg('starWarmRatio');

    const rng = seededRandom(42);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Distribute stars in a spherical shell
      const r = radius + rng() * depth;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Color variation: warm, cool, or neutral
      const roll = rng();
      if (roll < warmRatio * colorVar) {
        // Warm star (yellowish to orange)
        const warmth = 0.7 + rng() * 0.3;
        tempColor.setRGB(1.0, 0.85 * warmth, 0.6 * warmth);
      } else if (roll < (warmRatio + 0.4) * colorVar) {
        // Cool star (blue-white)
        const coolness = 0.7 + rng() * 0.3;
        tempColor.setRGB(0.8 * coolness, 0.85 * coolness, 1.0);
      } else {
        // Neutral white-ish
        const w = 0.9 + rng() * 0.1;
        tempColor.setRGB(w, w, w);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // Size: most small, few bright
      const sizeFactor = rng();
      sizes[i] = brightness * (0.3 + sizeFactor * sizeFactor * 0.7);

      // Random phase offset for twinkle desync
      phases[i] = rng() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTwinkleSpeed: { value: getCfg('starTwinkleSpeed') },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [starCount]);

  useFrame(({ clock }) => {
    if (!material) return;
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uTwinkleSpeed.value = getCfg('starTwinkleSpeed');
  });

  if (!starCount || starCount <= 0) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
    />
  );
}
