import { useMemo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useConstellationStore } from '../store';

/** Linear interpolation. */
function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Evidence-type color palette.
 * Each edge is tinted by its strongest (highest-weight) evidence type.
 */
const EVIDENCE_COLORS = {
  temporal: [0.376, 0.647, 0.98],   // #60a5fa  blue
  semantic: [0.655, 0.545, 0.98],    // #a78bfa  purple
  identity: [0.655, 0.545, 0.98],    // #a78bfa  purple (same family)
  thematic: [0.204, 0.827, 0.6],     // #34d399  green
  narrative: [0.984, 0.749, 0.141],  // #fbbf24  amber
  spatial: [0.984, 0.573, 0.235],    // #fb923c  orange
};

/** Fallback color (slightly blue-white, matches original) */
const DEFAULT_COLOR = [1.5, 1.5, 2.0];

/**
 * Determine the strongest evidence type on an edge.
 * Returns the type string whose evidence entry has the highest weight.
 */
function getStrongestEvidenceType(evidence) {
  if (!evidence || evidence.length === 0) return null;
  let bestType = null;
  let bestWeight = -Infinity;
  for (const ev of evidence) {
    if (ev.weight > bestWeight) {
      bestWeight = ev.weight;
      bestType = ev.type;
    }
  }
  return bestType;
}

/**
 * Get the tinted color for an edge based on its evidence type.
 * Blends the evidence color with white to keep it subtle.
 */
function getEdgeColor(evidence, isHighlighted) {
  const type = getStrongestEvidenceType(evidence);
  const base = EVIDENCE_COLORS[type] || null;
  if (!base) return DEFAULT_COLOR;

  // When highlighted (focused/filtered), show stronger tint; otherwise keep subtle
  const tintStrength = isHighlighted ? 0.6 : 0.35;
  return [
    lerp(1.5, base[0] * 2.5, tintStrength),
    lerp(1.5, base[1] * 2.5, tintStrength),
    lerp(2.0, base[2] * 2.5, tintStrength),
  ];
}

/**
 * AnimatedLine — a single connection line with dashed directional flow.
 * Receives a ref-setter callback so the parent can batch-animate dashOffset.
 */
function AnimatedLine({ points, color, lineWidth, opacity, lineKey, onRef, flowSpeed }) {
  const lineRef = useRef();

  // Register/unregister ref with parent for batch animation
  const setRef = useCallback(
    (node) => {
      lineRef.current = node;
      if (onRef) onRef(lineKey, node, flowSpeed);
    },
    [lineKey, onRef, flowSpeed]
  );

  return (
    <Line
      ref={setRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      toneMapped={false}
      dashed
      dashSize={1.8}
      gapSize={1.2}
      dashOffset={0}
    />
  );
}

/**
 * Connection lines between related constellation nodes.
 *
 * Three visual tiers:
 * T1 = helix backbone (handled by HelixBackbone component)
 * T2 = helix-to-helix connections (brighter, thicker)
 * T3 = connections involving particle nodes (very subtle)
 *
 * Features:
 * - Color tinted by strongest evidence type (temporal, thematic, narrative, etc.)
 * - Animated dash flow from older node to newer node (chronological direction)
 * - Focus-aware: connected lines brighten, non-connected lines fade.
 * - Entity-filter-aware: only edges involving the filtered entity are visible.
 */
export default function ConnectionLines({ positions }) {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const storeEdges = useConstellationStore((s) => s.edges);
  const storeNodes = useConstellationStore((s) => s.nodes);

  // Refs map for batch dash-offset animation: key → { node, speed }
  const lineRefsMap = useRef(new Map());

  // Callback for AnimatedLine to register itself
  const handleLineRef = useCallback((key, node, speed) => {
    if (node) {
      lineRefsMap.current.set(key, { node, speed });
    } else {
      lineRefsMap.current.delete(key);
    }
  }, []);

  // Single useFrame that batch-updates all dash offsets
  useFrame((_, delta) => {
    const map = lineRefsMap.current;
    if (map.size === 0) return;
    for (const entry of map.values()) {
      const { node, speed } = entry;
      if (node && node.material) {
        // Negative dashOffset = flow in the positive point-order direction
        // (which we set up as older → newer)
        node.material.dashOffset -= speed * delta;
      }
    }
  });

  // Build a map from node ID to position for O(1) lookups
  const positionMap = useMemo(() => {
    const map = new Map();
    for (const node of positions) {
      map.set(node.id, [node.x, node.y, node.z]);
    }
    return map;
  }, [positions]);

  // Build a map from node ID to date (epoch millis) for chronological ordering
  const dateMap = useMemo(() => {
    const map = new Map();
    for (const node of storeNodes) {
      if (node.date) {
        map.set(node.id, new Date(node.date).getTime());
      }
    }
    return map;
  }, [storeNodes]);

  // Build a set of helix node IDs for tier classification
  const helixNodeIds = useMemo(() => {
    const set = new Set();
    for (const node of storeNodes) {
      if (node.tier !== 'particle') {
        set.add(node.id);
      }
    }
    return set;
  }, [storeNodes]);

  // Pre-compute filtered node IDs for entity filter
  const filteredNodeIds = useMemo(() => {
    if (!filterEntity) return null;
    const matching = new Set();
    const themeAliases = { adventure: ['adventure', 'travel', 'greece'], family: ['family', 'fatherhood'] };

    for (const node of storeNodes) {
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
          for (const edge of storeEdges) {
            if (edge.source === node.id) matching.add(edge.target);
            if (edge.target === node.id) matching.add(edge.source);
          }
        }
      }
    }
    return matching.size > 0 ? matching : null;
  }, [filterEntity, storeNodes, storeEdges]);

  // Build line data with computed opacity, width, color, and direction
  const lines = useMemo(() => {
    const result = [];

    for (const edge of storeEdges) {
      let sourcePos = positionMap.get(edge.source);
      let targetPos = positionMap.get(edge.target);
      if (!sourcePos || !targetPos) continue;

      // Determine chronological direction: points go from older → newer
      const sourceDate = dateMap.get(edge.source) || 0;
      const targetDate = dateMap.get(edge.target) || 0;
      // If source is newer, swap so points[0] is always the older node
      let orderedPoints;
      if (sourceDate > targetDate) {
        orderedPoints = [targetPos, sourcePos];
      } else {
        orderedPoints = [sourcePos, targetPos];
      }

      // Classify connection tier
      const sourceIsHelix = helixNodeIds.has(edge.source);
      const targetIsHelix = helixNodeIds.has(edge.target);
      const isHelixToHelix = sourceIsHelix && targetIsHelix;
      const involvesParticle = !sourceIsHelix || !targetIsHelix;

      // Weight-driven baseline opacity and width
      const w = (edge.weight || 1) / 2.0;

      let opacity, lineWidth;
      let isHighlighted = false;

      if (focusedNodeId) {
        // Focus mode: brighten connected, dim non-connected
        const isConnected =
          edge.source === focusedNodeId || edge.target === focusedNodeId;
        if (isConnected) {
          opacity = isHelixToHelix ? lerp(0.5, 0.9, w) : lerp(0.2, 0.4, w);
          lineWidth = isHelixToHelix ? lerp(1.0, 2.0, w) : lerp(0.5, 1.0, w);
          isHighlighted = true;
        } else {
          opacity = 0.015;
          lineWidth = 0.3;
        }
      } else if (filteredNodeIds) {
        const sourceMatch = filteredNodeIds.has(edge.source);
        const targetMatch = filteredNodeIds.has(edge.target);
        if (sourceMatch && targetMatch) {
          opacity = isHelixToHelix ? lerp(0.4, 0.7, w) : lerp(0.15, 0.3, w);
          lineWidth = isHelixToHelix ? lerp(1.0, 2.0, w) : lerp(0.5, 1.0, w);
          isHighlighted = true;
        } else {
          opacity = 0.01;
          lineWidth = 0.3;
        }
      } else {
        // Default: tier-based visual hierarchy
        if (isHelixToHelix) {
          // T2: helix-to-helix — visible but secondary to backbone
          opacity = lerp(0.03, 0.10, w);
          lineWidth = lerp(0.4, 1.0, w);
        } else if (involvesParticle) {
          // T3: involves particle node — very subtle
          opacity = lerp(0.015, 0.04, w);
          lineWidth = lerp(0.3, 0.6, w);
        }
      }

      // Evidence-based color tinting
      const color = getEdgeColor(edge.evidence, isHighlighted);

      // Flow speed: faster when highlighted, very gentle otherwise
      const flowSpeed = isHighlighted ? 1.2 : 0.3;

      result.push({
        key: `${edge.source}-${edge.target}`,
        points: orderedPoints,
        opacity,
        lineWidth,
        color,
        flowSpeed,
      });
    }

    return result;
  }, [positionMap, dateMap, helixNodeIds, focusedNodeId, filteredNodeIds, storeEdges]);

  return (
    <group>
      {lines.map((line) => (
        <AnimatedLine
          key={line.key}
          lineKey={line.key}
          points={line.points}
          color={line.color}
          lineWidth={line.lineWidth}
          opacity={line.opacity}
          flowSpeed={line.flowSpeed}
          onRef={handleLineRef}
        />
      ))}
    </group>
  );
}
