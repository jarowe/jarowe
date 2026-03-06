import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

/** Theme-based color palette (primary motif → color) */
const THEME_COLORS = {
  love:        '#f472b6',   // pink
  family:      '#fb923c',   // orange
  fatherhood:  '#fb923c',   // orange (family group)
  career:      '#60a5fa',   // blue
  craft:       '#38bdf8',   // sky blue
  growth:      '#a78bfa',   // purple
  reflection:  '#c084fc',   // lavender
  adventure:   '#2dd4bf',   // teal
  travel:      '#2dd4bf',   // teal (adventure group)
  greece:      '#2dd4bf',   // teal (adventure group)
  celebration: '#fbbf24',   // gold
  friendship:  '#818cf8',   // indigo
  nature:      '#34d399',   // emerald
  food:        '#f97316',   // amber
  nostalgia:   '#d4a574',   // warm tan
  faith:       '#e2c6ff',   // soft purple
  home:        '#86efac',   // light green
};

/**
 * Get IDs of nodes connected to a given node (from edges).
 */
function getConnectedIds(nodeId, edges) {
  const connected = new Set();
  connected.add(nodeId);
  for (const edge of edges) {
    if (edge.source === nodeId) connected.add(edge.target);
    if (edge.target === nodeId) connected.add(edge.source);
  }
  return connected;
}

/**
 * Get IDs of nodes matching a filter entity.
 * Supports theme filter (type='theme') and title-based entity filter.
 */
function getFilteredNodeIds(filterEntity, nodes, edges) {
  if (!filterEntity) return null;
  const matching = new Set();

  // Theme-based aliases for grouping related themes
  const themeAliases = { adventure: ['adventure', 'travel', 'greece'], family: ['family', 'fatherhood'] };

  for (const node of nodes) {
    let isMatch = false;
    if (filterEntity.type === 'theme') {
      const group = themeAliases[filterEntity.value] || [filterEntity.value];
      isMatch = group.includes(node.theme);
    } else {
      isMatch = node.title === filterEntity.value;
    }

    if (isMatch) {
      matching.add(node.id);
      // For non-theme filters, also include connected nodes
      if (filterEntity.type !== 'theme') {
        for (const edge of edges) {
          if (edge.source === node.id) matching.add(edge.target);
          if (edge.target === node.id) matching.add(edge.source);
        }
      }
    }
  }

  return matching.size > 0 ? matching : null;
}

/**
 * Instanced mesh rendering all constellation nodes.
 * Uses Three.js instanceColor (setColorAt) for per-instance colors.
 * Breathing pulse animation via useFrame.
 * Focus dimming: non-connected nodes dim to ~15% on focus.
 */
export default function NodeCloud({ nodes, gpuConfig }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const count = nodes.length;

  const focusNode = useConstellationStore((s) => s.focusNode);
  const setHoveredNode = useConstellationStore((s) => s.setHoveredNode);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const storeEdges = useConstellationStore((s) => s.edges);
  const storeNodes = useConstellationStore((s) => s.nodes);

  // Pre-compute base scales for breathing animation
  const baseScales = useMemo(
    () => nodes.map((n) => n.size),
    [nodes]
  );

  // Set initial instance transforms and per-instance colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodes.forEach((node, i) => {
      // Position + scale
      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(node.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Per-instance color scaled by significance-based brightness
      const sig = node.significance ?? 0.5;
      const brightness = 0.3 + sig * 1.5; // range 0.3 to 1.8
      tempColor.set(THEME_COLORS[node.theme] || '#94a3b8').multiplyScalar(brightness);
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [nodes]);

  // Focus dimming and entity filter dimming
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.instanceColor) return;

    let activeIds = null;

    if (focusedNodeId) {
      activeIds = getConnectedIds(focusedNodeId, storeEdges);
    } else if (filterEntity) {
      activeIds = getFilteredNodeIds(filterEntity, storeNodes, storeEdges);
    }

    for (let i = 0; i < count; i++) {
      const nodeId = nodes[i].id;
      let dimFactor = 1.0;

      if (activeIds) {
        if (!activeIds.has(nodeId)) {
          dimFactor = 0.15; // Ghost non-connected/non-matching nodes
        } else if (nodeId === focusedNodeId) {
          dimFactor = 1.3; // Brighter for focused node
        }
      }

      const sig = nodes[i].significance ?? 0.5;
      const brightness = 0.3 + sig * 1.5;
      tempColor.set(THEME_COLORS[nodes[i].theme] || '#94a3b8');
      tempColor.multiplyScalar(dimFactor * brightness);
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceColor.needsUpdate = true;

    // Update emissive intensity scaled by focus state
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = focusedNodeId ? 2.0 : 1.0;
    }
  }, [focusedNodeId, filterEntity, nodes, count, storeEdges, storeNodes]);

  // Breathing pulse animation
  useFrame(({ clock }) => {
    if (!gpuConfig.pulseAnimation || !meshRef.current) return;

    const time = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const sig = nodes[i].significance ?? 0.5;
      const pulseAmp = 0.02 + sig * 0.06; // 0.02 for low, 0.08 for high
      const breathe = Math.sin(time * 0.5 + i * 0.3) * pulseAmp + 1.0;
      const scale = baseScales[i] * breathe;

      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < nodes.length) {
      focusNode(nodes[e.instanceId].id);
    }
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      setHoveredNode(e.instanceId);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredNode(null);
    document.body.style.cursor = 'default';
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry
        args={[1, gpuConfig.sphereSegments, gpuConfig.sphereSegments]}
      />
      <meshStandardMaterial
        ref={materialRef}
        color={[1.8, 1.8, 1.8]}
        emissive={[0.15, 0.15, 0.15]}
        emissiveIntensity={1}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
