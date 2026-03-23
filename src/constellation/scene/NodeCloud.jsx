import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

/** Theme-based color palette (primary motif -> color) */
const THEME_COLORS = {
  love:            '#f472b6',   // pink
  family:          '#fb923c',   // orange
  fatherhood:      '#fb923c',   // orange (family group)
  brotherhood:     '#e0915a',   // warm sienna (family group)
  marriage:        '#f9a8d4',   // rose (family group)
  childhood:       '#fdba74',   // peach (family group)
  career:          '#60a5fa',   // blue
  craft:           '#38bdf8',   // sky blue
  filmmaking:      '#67e8f9',   // cyan (creative group)
  growth:          '#a78bfa',   // purple
  reflection:      '#c084fc',   // lavender
  adventure:       '#2dd4bf',   // teal
  travel:          '#2dd4bf',   // teal (adventure group)
  greece:          '#2dd4bf',   // teal (adventure group)
  worldschooling:  '#5eead4',   // bright teal (adventure group)
  celebration:     '#fbbf24',   // gold
  friendship:      '#818cf8',   // indigo
  nature:          '#34d399',   // emerald
  food:            '#f97316',   // amber
  nostalgia:       '#d4a574',   // warm tan
  faith:           '#e2c6ff',   // soft purple
  home:            '#86efac',   // light green
  health:          '#4ade80',   // green
  entrepreneurship:'#f59e0b',   // amber-gold
  technology:      '#22d3ee',   // cyan
};

/** Fallback: type-based colors when theme is not yet in the data */
const TYPE_COLORS = {
  project:   '#f59e0b',   // amber
  moment:    '#f87171',   // coral
  person:    '#a78bfa',   // violet
  place:     '#2dd4bf',   // teal
  idea:      '#22d3ee',   // cyan
  milestone: '#fbbf24',   // gold
  track:     '#34d399',   // emerald
};

/** Get the best color for a node: theme first, type fallback, then grey */
function getNodeColor(node) {
  if (node.theme && THEME_COLORS[node.theme]) return THEME_COLORS[node.theme];
  if (node.type && TYPE_COLORS[node.type]) return TYPE_COLORS[node.type];
  return '#94a3b8';
}

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
 * Uses MeshStandardMaterial with emissive glow for cinematic look.
 * Per-instance colors via instanceColor, emissive drives the bloom-like effect.
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

  // Pre-compute base scales for breathing animation (reads config at compute time)
  const baseScales = useMemo(
    () => nodes.map((n) => n.size * getCfg('nodeBaseScale')),
    [nodes]
  );

  // Set initial instance transforms and per-instance colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodes.forEach((node, i) => {
      // Position + scale
      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(node.size * getCfg('nodeBaseScale'));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Per-instance color scaled by significance-based brightness
      const sig = node.significance ?? 0.5;
      const brightness = getCfg('nodeBrightnessBase') + sig * getCfg('nodeBrightnessRange');
      tempColor.set(getNodeColor(node)).multiplyScalar(brightness);
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
          dimFactor = getCfg('nodeFocusDim');
        } else if (nodeId === focusedNodeId) {
          dimFactor = getCfg('nodeFocusBright');
        }
      }

      const sig = nodes[i].significance ?? 0.5;
      const brightness = 0.3 + sig * 1.5;
      tempColor.set(getNodeColor(nodes[i]));
      tempColor.multiplyScalar(dimFactor * brightness);
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceColor.needsUpdate = true;
  }, [focusedNodeId, filterEntity, nodes, count, storeEdges, storeNodes]);

  // Breathing pulse animation + emissive pulsing for focused node
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime();
    const mat = materialRef.current;

    // Animate emissive intensity: focused node pulses stronger
    if (mat) {
      const baseEmissive = getCfg('nodeEmissiveIntensity');
      const emissiveRange = getCfg('nodeEmissiveRange');
      const focusPulse = getCfg('nodeFocusedEmissivePulse');
      const focusPulseSpeed = getCfg('nodeFocusedPulseSpeed');

      if (focusedNodeId) {
        // When focused, pulse emissive more strongly
        const pulse = Math.sin(time * focusPulseSpeed) * 0.3 + 0.7;
        mat.emissiveIntensity = focusPulse * pulse;
      } else {
        // Ambient gentle glow
        mat.emissiveIntensity = baseEmissive + 0.5 * emissiveRange;
      }
    }

    if (!gpuConfig.pulseAnimation) return;

    const pulseSpeed = getCfg('nodePulseSpeed');
    const pulseAmpMin = getCfg('nodePulseAmpMin');
    const pulseAmpRange = getCfg('nodePulseAmpRange');
    const phaseSpread = getCfg('nodePhaseSpread');

    for (let i = 0; i < count; i++) {
      const sig = nodes[i].significance ?? 0.5;
      const pulseAmp = pulseAmpMin + sig * pulseAmpRange;
      const breathe = Math.sin(time * pulseSpeed + i * phaseSpread) * pulseAmp + 1.0;
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
      setHoveredNode(e.instanceId, { x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredNode(null, null);
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
        color="#ffffff"
        emissive="#444466"
        emissiveIntensity={getCfg('nodeEmissiveIntensity')}
        roughness={0.6}
        metalness={0.1}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
