import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useConstellationStore } from '../store';

/** Linear interpolation. */
function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Connection lines between related constellation nodes.
 *
 * Three visual tiers:
 * T1 = helix backbone (handled by HelixBackbone component)
 * T2 = helix-to-helix connections (brighter, thicker)
 * T3 = connections involving particle nodes (very subtle)
 *
 * Focus-aware: connected lines brighten, non-connected lines fade.
 * Entity-filter-aware: only edges involving the filtered entity are visible.
 */
export default function ConnectionLines({ positions }) {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const storeEdges = useConstellationStore((s) => s.edges);
  const storeNodes = useConstellationStore((s) => s.nodes);

  // Build a map from node ID to position for O(1) lookups
  const positionMap = useMemo(() => {
    const map = new Map();
    for (const node of positions) {
      map.set(node.id, [node.x, node.y, node.z]);
    }
    return map;
  }, [positions]);

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

  // Pre-compute connected IDs for focused node
  const connectedToFocus = useMemo(() => {
    if (!focusedNodeId) return null;
    const set = new Set();
    set.add(focusedNodeId);
    for (const edge of storeEdges) {
      if (edge.source === focusedNodeId) set.add(edge.target);
      if (edge.target === focusedNodeId) set.add(edge.source);
    }
    return set;
  }, [focusedNodeId, storeEdges]);

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

  // Build line data with computed opacity and width
  const lines = useMemo(() => {
    const result = [];

    for (const edge of storeEdges) {
      const sourcePos = positionMap.get(edge.source);
      const targetPos = positionMap.get(edge.target);
      if (!sourcePos || !targetPos) continue;

      // Classify connection tier
      const sourceIsHelix = helixNodeIds.has(edge.source);
      const targetIsHelix = helixNodeIds.has(edge.target);
      const isHelixToHelix = sourceIsHelix && targetIsHelix;
      const involvesParticle = !sourceIsHelix || !targetIsHelix;

      // Weight-driven baseline opacity and width
      const w = (edge.weight || 1) / 2.0;

      let opacity, lineWidth;

      if (focusedNodeId) {
        // Focus mode: brighten connected, dim non-connected
        const isConnected =
          edge.source === focusedNodeId || edge.target === focusedNodeId;
        if (isConnected) {
          opacity = isHelixToHelix ? lerp(0.5, 0.9, w) : lerp(0.2, 0.4, w);
          lineWidth = isHelixToHelix ? lerp(1.0, 2.0, w) : lerp(0.5, 1.0, w);
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
        } else {
          opacity = 0.01;
          lineWidth = 0.3;
        }
      } else {
        // Default: tier-based visual hierarchy
        if (isHelixToHelix) {
          // T2: helix-to-helix — moderate visibility
          opacity = lerp(0.05, 0.15, w);
          lineWidth = lerp(0.6, 1.5, w);
        } else if (involvesParticle) {
          // T3: involves particle node — very subtle
          opacity = lerp(0.015, 0.04, w);
          lineWidth = lerp(0.3, 0.6, w);
        }
      }

      result.push({
        key: `${edge.source}-${edge.target}`,
        points: [sourcePos, targetPos],
        opacity,
        lineWidth,
      });
    }

    return result;
  }, [positionMap, helixNodeIds, focusedNodeId, filteredNodeIds, storeEdges]);

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={[1.5, 1.5, 2.0]}
          lineWidth={line.lineWidth}
          transparent
          opacity={line.opacity}
          toneMapped={false}
        />
      ))}
    </group>
  );
}
