import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';
import { getIntroReveal, getStaggeredReveal } from './introMath';

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

// ── Type identity ────────────────────────────────────────────────

const TYPE_VISUAL = {
  milestone: { emissive: '#886620', scaleKey: 'milestoneScale', roughness: 0.3,  metalness: 0.08 },
  project:   { emissive: '#3a4a66', scaleKey: 'projectScale',   roughness: 0.42, metalness: 0.06 },
  moment:    { emissive: '#444466', scaleKey: 'momentScale',     roughness: 0.6,  metalness: 0.1  },
};

function getTypeVisual(nodeType) {
  return TYPE_VISUAL[nodeType] || TYPE_VISUAL.moment;
}

/**
 * Unified brightness formula — one curve for all states.
 * Reads config every call so the editor can tune it live.
 */
function computeBrightness(sig) {
  return getCfg('nodeBrightnessBase')
    + sig * getCfg('nodeBrightnessRange')
    + sig * sig * sig * getCfg('significanceBrightnessBoost');
}

// ── TypedNodeMesh ────────────────────────────────────────────────
// One instancedMesh per node type. Scale and color are computed every
// frame in useFrame so all config changes (including identity knobs)
// take effect immediately in the editor.

function TypedNodeMesh({
  nodes,
  nodeType,
  gpuConfig,
  introRef,
  globalRevealOrder,
  globalNodeCount,
}) {
  const meshRef = useRef();
  const materialRef = useRef();
  const count = nodes.length;
  const visual = getTypeVisual(nodeType);

  const focusNode = useConstellationStore((s) => s.focusNode);
  const setHoveredNode = useConstellationStore((s) => s.setHoveredNode);
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const highlightedEdgeNodeId = useConstellationStore((s) => s.highlightedEdgeNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const storeEdges = useConstellationStore((s) => s.edges);
  const storeNodes = useConstellationStore((s) => s.nodes);

  // Snapshot focus/filter into refs so useFrame reads current values
  // without re-creating its closure on every state change.
  const focusedRef = useRef(focusedNodeId);
  focusedRef.current = focusedNodeId;
  const highlightedRef = useRef(highlightedEdgeNodeId);
  highlightedRef.current = highlightedEdgeNodeId;

  // Pre-compute active IDs (event-driven, not per-frame)
  const activeIdsRef = useRef(null);
  useEffect(() => {
    if (focusedNodeId) {
      activeIdsRef.current = getConnectedIds(focusedNodeId, storeEdges);
    } else if (filterEntity) {
      activeIdsRef.current = getFilteredNodeIds(filterEntity, storeNodes, storeEdges);
    } else {
      activeIdsRef.current = null;
    }
  }, [focusedNodeId, filterEntity, storeEdges, storeNodes]);

  const getNodeReveal = useCallback(
    (nodeId, progress) => {
      if (!introRef) return 1;
      const index = globalRevealOrder.get(nodeId) ?? 0;
      return getStaggeredReveal(progress, index, globalNodeCount, {
        start: 0.08, end: 0.72, staggerWindow: 0.22,
      });
    },
    [introRef, globalRevealOrder, globalNodeCount]
  );

  // Set initial positions + bounding sphere (positions don't change per-frame)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodes.forEach((node, i) => {
      dummy.position.set(node.x, node.y, node.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Initial color — will be overridden by first useFrame
      tempColor.set(getNodeColor(node));
      mesh.setColorAt(i, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [nodes, count]);

  // Per-frame: scale, color, emissive — all read live config
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = clock.getElapsedTime();
    const mat = materialRef.current;
    const introProgress = introRef?.current?.progress ?? 1;

    // ── Emissive animation ──
    if (mat) {
      const introGlow = getIntroReveal(introProgress, 0.16, 0.72);

      if (focusedRef.current) {
        const pulse = Math.sin(time * getCfg('nodeFocusedPulseSpeed')) * 0.3 + 0.7;
        mat.emissiveIntensity = getCfg('nodeFocusedEmissivePulse') * pulse * introGlow;
      } else {
        mat.emissiveIntensity =
          (getCfg('nodeEmissiveIntensity') + 0.5 * getCfg('nodeEmissiveRange')) * introGlow;
      }
    }

    // ── Read config once per frame ──
    const nodeBaseScale = getCfg('nodeBaseScale');
    const typeScale = getCfg(visual.scaleKey);
    const sigBoost = getCfg('significanceScaleBoost');
    const pulseSpeed = getCfg('nodePulseSpeed');
    const pulseAmpMin = getCfg('nodePulseAmpMin');
    const pulseAmpRange = getCfg('nodePulseAmpRange');
    const phaseSpread = getCfg('nodePhaseSpread');
    const doPulse = gpuConfig.pulseAnimation;

    const currentFocused = focusedRef.current;
    const currentHighlighted = highlightedRef.current;
    const activeIds = activeIdsRef.current;

    // ── Per-instance scale + color ──
    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      const sig = node.significance ?? 0.5;

      // Scale: type × significance × breathing × reveal
      const sigScale = 1 + sig * sig * sigBoost;
      let scale = node.size * nodeBaseScale * typeScale * sigScale;

      if (doPulse) {
        const pulseAmp = pulseAmpMin + sig * pulseAmpRange;
        scale *= Math.sin(time * pulseSpeed + i * phaseSpread) * pulseAmp + 1.0;
      }

      const reveal = getNodeReveal(node.id, introProgress);
      scale *= Math.max(0.0001, reveal);

      mesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Color: unified brightness formula × dimFactor
      let dimFactor = 1.0;
      if (activeIds) {
        if (!activeIds.has(node.id)) {
          dimFactor = getCfg('nodeFocusDim');
        } else if (node.id === currentFocused) {
          dimFactor = getCfg('nodeFocusBright');
        } else if (currentHighlighted) {
          dimFactor = node.id === currentHighlighted ? getCfg('nodeFocusBright') : 0.4;
        }
      }

      const brightness = computeBrightness(sig);
      tempColor.set(getNodeColor(node)).multiplyScalar(dimFactor * brightness);
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < count) {
      focusNode(nodes[e.instanceId].id);
    }
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < count) {
      const node = nodes[e.instanceId];
      setHoveredNode(e.instanceId, { x: e.clientX, y: e.clientY }, node.id);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredNode(null, null, null);
    document.body.style.cursor = 'default';
  };

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {nodeType === 'milestone' && <icosahedronGeometry args={[1, 1]} />}
      {nodeType === 'project' && <octahedronGeometry args={[1, 0]} />}
      {nodeType !== 'milestone' && nodeType !== 'project' && (
        <sphereGeometry args={[1, gpuConfig.sphereSegments, gpuConfig.sphereSegments]} />
      )}
      <meshStandardMaterial
        ref={materialRef}
        color="#ffffff"
        emissive={visual.emissive}
        emissiveIntensity={getCfg('nodeEmissiveIntensity')}
        roughness={visual.roughness}
        metalness={visual.metalness}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ── NodeCloud ────────────────────────────────────────────────────

export default function NodeCloud({ nodes, gpuConfig, introRef = null }) {
  const globalRevealOrder = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.y - b.y);
    return new Map(sorted.map((node, index) => [node.id, index]));
  }, [nodes]);

  const nodeGroups = useMemo(() => {
    const groups = {};
    for (const node of nodes) {
      const type = node.type || 'moment';
      const key = TYPE_VISUAL[type] ? type : 'moment';
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    }
    return groups;
  }, [nodes]);

  return (
    <>
      {Object.entries(nodeGroups).map(([type, typeNodes]) => (
        <TypedNodeMesh
          key={type}
          nodes={typeNodes}
          nodeType={type}
          gpuConfig={gpuConfig}
          introRef={introRef}
          globalRevealOrder={globalRevealOrder}
          globalNodeCount={nodes.length}
        />
      ))}
    </>
  );
}
