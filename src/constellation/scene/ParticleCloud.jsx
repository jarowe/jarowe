import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';

/** Theme-based color palette (matches NodeCloud) */
const THEME_COLORS = {
  love: '#f472b6', family: '#fb923c', fatherhood: '#fb923c',
  career: '#60a5fa', craft: '#38bdf8', growth: '#a78bfa',
  reflection: '#c084fc', adventure: '#2dd4bf', travel: '#2dd4bf',
  greece: '#2dd4bf', celebration: '#fbbf24', friendship: '#818cf8',
  nature: '#34d399', food: '#f97316', nostalgia: '#d4a574',
  faith: '#e2c6ff', home: '#86efac',
};

const TYPE_COLORS = {
  project: '#f59e0b', moment: '#f87171', person: '#a78bfa',
  place: '#2dd4bf', idea: '#22d3ee', milestone: '#fbbf24',
  track: '#34d399',
};

/** Diamond-shaped point shader */
const diamondVertexShader = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 24.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const diamondFragmentShader = `
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    // Diamond shape: |x| + |y| <= 1 in point-coord space centered at 0.5
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float diamond = abs(uv.x) + abs(uv.y);
    if (diamond > 1.0) discard;
    // Soft edge glow
    float alpha = smoothstep(1.0, 0.5, diamond) * uOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/**
 * Ambient particle cloud for particle-tier nodes.
 *
 * Renders diamond-shaped particles using a custom ShaderMaterial.
 * Each particle is color-coordinated by theme/type.
 * Gentle floating drift animation gives the cloud life.
 */
export default function ParticleCloud({ nodes, tunnelMode = false }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const focusNode = useConstellationStore((s) => s.focusNode);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const count = nodes.length;

  // Pre-compute geometry attributes
  const { positions, colors, sizes, basePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const base = new Float32Array(count * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      const x = node.x || 0;
      const y = node.y || 0;
      const z = node.z || 0;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;

      // Color: theme-based with type fallback
      const sig = node.significance ?? 0.2;
      const brightness = 0.3 + sig * 0.8; // range 0.3 to 1.1
      const color = (node.theme && THEME_COLORS[node.theme])
        || (node.type && TYPE_COLORS[node.type]) || '#94a3b8';
      tempColor.set(color).multiplyScalar(brightness);
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;

      // Size: small diamonds scaled by significance
      sz[i] = 2.5 + sig * 3.0; // range 2.5 to 5.5
    }

    return { positions: pos, colors: col, sizes: sz, basePositions: base };
  }, [nodes, count]);

  // Diamond shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: diamondVertexShader,
      fragmentShader: diamondFragmentShader,
      uniforms: {
        uOpacity: { value: 0.45 },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Set up geometry
  useEffect(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.computeBoundingSphere();
  }, [positions, colors, sizes]);

  // Focus dimming + tunnel mode dimming
  useEffect(() => {
    if (tunnelMode) {
      shaderMaterial.uniforms.uOpacity.value = 0.12;
    } else if (focusedNodeId) {
      shaderMaterial.uniforms.uOpacity.value = 0.1;
    } else {
      shaderMaterial.uniforms.uOpacity.value = 0.45;
    }
  }, [focusedNodeId, tunnelMode, shaderMaterial]);

  // Gentle floating drift animation
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;

    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      const phase = i * 0.73;
      arr[i * 3] = basePositions[i * 3] + Math.sin(time * 0.15 + phase) * 0.8;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(time * 0.1 + phase * 0.5) * 0.4;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(time * 0.12 + phase * 0.3) * 0.8;
    }

    posAttr.needsUpdate = true;
  });

  // Click handler for particle selection
  const handleClick = (e) => {
    e.stopPropagation();
    if (e.index !== undefined && e.index < nodes.length) {
      focusNode(nodes[e.index].id);
    }
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (e.index !== undefined) {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  if (count === 0) return null;

  return (
    <points
      ref={pointsRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      material={shaderMaterial}
    >
      <bufferGeometry />
    </points>
  );
}
