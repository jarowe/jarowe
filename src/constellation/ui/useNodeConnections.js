import { useMemo } from 'react';
import { useConstellationStore } from '../store';

/**
 * Reusable hook that derives connection groups and entity chips
 * for a focused constellation node.
 *
 * Extracted from DetailPanel so both DetailPanel (2D) and NodeCards (3D)
 * can share the same logic.
 */
export default function useNodeConnections() {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const storeNodes = useConstellationStore((s) => s.nodes);
  const storeEdges = useConstellationStore((s) => s.edges);

  return useMemo(() => {
    if (!focusedNodeId)
      return { node: null, connectionGroups: [], entities: [] };

    const foundNode = storeNodes.find((n) => n.id === focusedNodeId);
    if (!foundNode)
      return { node: null, connectionGroups: [], entities: [] };

    // Find all edges connected to this node
    const connectedEdges = storeEdges.filter(
      (e) => e.source === focusedNodeId || e.target === focusedNodeId
    );

    // Group edges by connected node, with node info and all evidence
    const groupMap = new Map();
    for (const edge of connectedEdges) {
      const otherId =
        edge.source === focusedNodeId ? edge.target : edge.source;
      const otherNode = storeNodes.find((n) => n.id === otherId);
      if (!otherNode) continue;

      if (!groupMap.has(otherId)) {
        groupMap.set(otherId, {
          nodeId: otherId,
          nodeTitle: otherNode.title,
          nodeType: otherNode.type,
          evidence: [],
        });
      }
      const group = groupMap.get(otherId);
      for (const ev of edge.evidence) {
        if (group.evidence.length < 5) {
          group.evidence.push({ ...ev, weight: edge.weight });
        }
      }
    }

    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      const avgA =
        a.evidence.reduce((sum, e) => sum + (e.weight || 0), 0) /
        a.evidence.length;
      const avgB =
        b.evidence.reduce((sum, e) => sum + (e.weight || 0), 0) /
        b.evidence.length;
      return avgB - avgA;
    });

    // Extract unique entities for chips
    const entityMap = new Map();
    for (const edge of connectedEdges) {
      const otherId =
        edge.source === focusedNodeId ? edge.target : edge.source;
      const otherNode = storeNodes.find((n) => n.id === otherId);
      if (!otherNode) continue;

      const key = `${otherNode.type}:${otherNode.title}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          type: otherNode.type,
          label: otherNode.title,
          count: 0,
        });
      }
      entityMap.get(key).count += 1;
    }

    const entityList = Array.from(entityMap.values()).map((entity) => {
      const entityNode = storeNodes.find(
        (n) => n.title === entity.label && n.type === entity.type
      );
      if (entityNode) {
        const totalEdges = storeEdges.filter(
          (e) => e.source === entityNode.id || e.target === entityNode.id
        );
        entity.count = totalEdges.length;
      }
      return entity;
    });

    entityList.sort((a, b) => {
      const typeOrder = {
        person: 0,
        place: 1,
        project: 2,
        track: 3,
        idea: 4,
        moment: 5,
        milestone: 6,
      };
      const aOrder = typeOrder[a.type] ?? 99;
      const bOrder = typeOrder[b.type] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.count - a.count;
    });

    return { node: foundNode, connectionGroups: groups, entities: entityList };
  }, [focusedNodeId, storeNodes, storeEdges]);
}
