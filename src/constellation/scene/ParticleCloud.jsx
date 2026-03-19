import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';

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

/**
 * Shape IDs:
 * 0 = circle, 1 = diamond, 2 = square, 3 = heart, 4 = triangle, 5 = star
 *
 * Theme → shape mapping for themed nodes.
 * Unthemed nodes get a shape from a deterministic ID hash.
 */
const THEME_SHAPES = {
  love: 3, family: 3, fatherhood: 3,       // heart
  career: 2, craft: 2,                      // square
  adventure: 4, travel: 4, greece: 4, nature: 4, // triangle
  celebration: 5, friendship: 5,            // star
  growth: 1, reflection: 1, faith: 1,       // diamond
  nostalgia: 0, food: 0, home: 0,           // circle
};

/** Simple hash of string → 0..count */
function hashShape(id, count) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return ((h % count) + count) % count;
}

const vertexShader = `
  attribute float size;
  attribute float shape;
  varying vec3 vColor;
  varying float vShape;
  void main() {
    vColor = color;
    vShape = shape;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 40.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vShape;
  uniform float uOpacity;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d;
    int s = int(vShape + 0.5);

    if (s == 1) {
      // Diamond — rotated square
      d = (abs(uv.x) + abs(uv.y)) / 1.0;
    } else if (s == 2) {
      // Rounded square
      d = max(abs(uv.x), abs(uv.y)) / 0.78;
    } else if (s == 3) {
      // Heart — Inigo Quilez's exact heart SDF
      vec2 p = vec2(abs(uv.x), -uv.y - 0.1);
      float a = atan(p.x, p.y) / 3.14159;
      float r = length(p);
      float h = abs(a);
      float shape = (13.0 * h - 22.0 * h * h + 10.0 * h * h * h) / (6.0 - 5.0 * h);
      d = r / shape;
    } else if (s == 4) {
      // Triangle pointing UP — equilateral
      vec2 p = vec2(uv.x, -uv.y + 0.25);
      float k = 1.732; // sqrt(3)
      p.x = abs(p.x) - 0.7;
      p.y = p.y + 0.7 / k;
      if (p.x + k * p.y > 0.0) {
        p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
      }
      p.x -= clamp(p.x, -1.4, 0.0);
      d = -length(p) * sign(p.y);
      d = smoothstep(0.05, -0.05, d);
      d = 1.0 - d;
    } else if (s == 5) {
      // 4-point star / sparkle
      float r = length(uv);
      float a = atan(uv.y, uv.x);
      float f = abs(cos(a * 2.0));
      f = mix(0.3, 1.0, f);
      d = r / f;
    } else {
      // Circle
      d = length(uv);
    }

    if (d > 1.0) discard;
    float alpha = smoothstep(1.0, 0.55, d) * uOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/**
 * Ambient particle cloud for particle-tier nodes.
 * Renders shaped particles (circle, diamond, square, heart, triangle, star)
 * based on node type. Each particle is color-coordinated by theme/type.
 */
export default function ParticleCloud({ nodes, tunnelMode = false }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const focusNode = useConstellationStore((s) => s.focusNode);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const count = nodes.length;

  // Pre-compute geometry attributes
  const { positions, colors, sizes, shapes, basePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const sh = new Float32Array(count);
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
      const brightness = 0.5 + sig * 0.7;
      const color = (node.theme && THEME_COLORS[node.theme])
        || (node.type && TYPE_COLORS[node.type]) || '#94a3b8';
      tempColor.set(color).multiplyScalar(brightness);
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;

      // Size
      sz[i] = getCfg('particleSizeBase') + sig * getCfg('particleSizeRange');

      // Shape: theme-based if themed, otherwise deterministic from node ID
      if (node.theme && THEME_SHAPES[node.theme] !== undefined) {
        sh[i] = THEME_SHAPES[node.theme];
      } else {
        sh[i] = hashShape(node.id, 6);
      }
    }

    return { positions: pos, colors: col, sizes: sz, shapes: sh, basePositions: base };
  }, [nodes, count]);

  // Shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uOpacity: { value: getCfg('particleOpacity') },
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
    geo.setAttribute('shape', new THREE.BufferAttribute(shapes, 1));
    geo.computeBoundingSphere();
  }, [positions, colors, sizes, shapes]);

  // Focus dimming + tunnel mode dimming
  useEffect(() => {
    if (tunnelMode) {
      shaderMaterial.uniforms.uOpacity.value = getCfg('particleOpacityTunnel');
    } else if (focusedNodeId) {
      shaderMaterial.uniforms.uOpacity.value = getCfg('particleOpacityFocused');
    } else {
      shaderMaterial.uniforms.uOpacity.value = getCfg('particleOpacity');
    }
  }, [focusedNodeId, tunnelMode, shaderMaterial]);

  // Gentle floating drift animation (reads config every frame for live tuning)
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;

    const driftSX = getCfg('particleDriftSpeedX');
    const driftSY = getCfg('particleDriftSpeedY');
    const driftSZ = getCfg('particleDriftSpeedZ');
    const driftAX = getCfg('particleDriftAmplitudeX');
    const driftAY = getCfg('particleDriftAmplitudeY');
    const driftAZ = getCfg('particleDriftAmplitudeZ');

    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      const phase = i * 0.73;
      arr[i * 3] = basePositions[i * 3] + Math.sin(time * driftSX + phase) * driftAX;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(time * driftSY + phase * 0.5) * driftAY;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(time * driftSZ + phase * 0.3) * driftAZ;
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
