import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';

/**
 * Ambient particle cloud for particle-tier nodes.
 *
 * Uses THREE.Points (single draw call) for efficient rendering of
 * thousands of tiny semi-transparent particles scattered around the
 * helix spine. Each particle represents a lower-significance memory
 * that adds texture and depth without cluttering the main helix.
 *
 * Particles are clickable via raycasting threshold.
 * Gentle floating drift animation gives the cloud life.
 */
export default function ParticleCloud({ nodes, tunnelMode = false }) {
  const pointsRef = useRef();
  const focusNode = useConstellationStore((s) => s.focusNode);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const setHoveredNode = useConstellationStore((s) => s.setHoveredNode);
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

      // Color: theme-based with type fallback, dimmed by significance
      const sig = node.significance ?? 0.2;
      const brightness = 0.2 + sig * 0.6; // subtle: range 0.2 to 0.8
      const themeColors = {
        love: '#f472b6', family: '#fb923c', fatherhood: '#fb923c',
        career: '#60a5fa', craft: '#38bdf8', growth: '#a78bfa',
        reflection: '#c084fc', adventure: '#2dd4bf', travel: '#2dd4bf',
        greece: '#2dd4bf', celebration: '#fbbf24', friendship: '#818cf8',
        nature: '#34d399', food: '#f97316', nostalgia: '#d4a574',
        faith: '#e2c6ff', home: '#86efac',
      };
      const typeColors = {
        project: '#f59e0b', moment: '#f87171', person: '#a78bfa',
        place: '#2dd4bf', idea: '#22d3ee', milestone: '#fbbf24',
        track: '#34d399',
      };
      const color = (node.theme && themeColors[node.theme])
        || typeColors[node.type] || '#94a3b8';
      tempColor.set(color).multiplyScalar(brightness);
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;

      // Size: small but scaled slightly by significance
      sz[i] = 1.0 + sig * 1.5; // range 1.0 to 2.5 pixels
    }

    return { positions: pos, colors: col, sizes: sz, basePositions: base };
  }, [nodes, count]);

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
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material;
    if (tunnelMode) {
      mat.opacity = 0.1; // Reduced in tunnel to prevent visual clutter
    } else if (focusedNodeId) {
      mat.opacity = 0.08; // Nearly invisible when focusing on helix node
    } else {
      mat.opacity = 0.35; // Default ambient opacity
    }
    mat.needsUpdate = true;
  }, [focusedNodeId, tunnelMode]);

  // Gentle floating drift animation
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;

    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      // Gentle sine-wave drift (unique phase per particle)
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
    // Particles set a negative hoveredNode to distinguish from helix nodes
    // The HoverLabel component can check this
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
    >
      <bufferGeometry />
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
        size={2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
