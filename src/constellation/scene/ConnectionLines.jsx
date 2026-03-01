import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useConstellationStore } from '../store';

/**
 * Connection lines between related constellation nodes.
 *
 * Renders thin luminous threads between nodes connected by edges.
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
    for (const node of storeNodes) {
      if (node.title === filterEntity.value) {
        matching.add(node.id);
        for (const edge of storeEdges) {
          if (edge.source === node.id) matching.add(edge.target);
          if (edge.target === node.id) matching.add(edge.source);
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

      let opacity = 0.08;
      let lineWidth = 1;

      if (focusedNodeId) {
        // Focus mode: brighten connected, dim non-connected
        const isConnected =
          edge.source === focusedNodeId || edge.target === focusedNodeId;
        if (isConnected) {
          opacity = 0.8;
          lineWidth = 1.5;
        } else {
          opacity = 0.03;
          lineWidth = 0.5;
        }
      } else if (filteredNodeIds) {
        // Entity filter mode: show only edges involving filtered entity
        const sourceMatch = filteredNodeIds.has(edge.source);
        const targetMatch = filteredNodeIds.has(edge.target);
        if (sourceMatch && targetMatch) {
          opacity = 0.6;
          lineWidth = 1.5;
        } else {
          opacity = 0.02;
          lineWidth = 0.5;
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
  }, [positionMap, focusedNodeId, filteredNodeIds, storeEdges]);

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
