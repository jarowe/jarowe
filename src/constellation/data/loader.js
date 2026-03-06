/**
 * Constellation data loader.
 *
 * Fetches real pipeline output when available, falls back to mock data
 * and client-side helix layout in development.
 *
 * All 7 constellation components can switch from:
 *   import mockData from './mock-constellation.json'
 * to:
 *   const data = await loadConstellationData()
 *
 * without structural changes -- the output shape is identical.
 *
 * IMPORTANT: Do NOT modify the 7 consuming components yet. The loader
 * is created now so the interface is ready for when real data is verified.
 */

import mockData from './mock-constellation.json';
import { computeHelixLayout } from '../layout/helixLayout.js';

/**
 * Load constellation data from the pipeline output or fall back to mock data.
 *
 * When the pipeline has been run (build-time), fetches:
 *   /data/constellation.graph.json  (nodes, edges, epochs)
 *   /data/constellation.layout.json (positions, helixParams, bounds)
 *
 * When pipeline output is not available (dev mode, no pipeline run):
 *   Falls back to mock-constellation.json + client-side helix layout.
 *
 * @returns {Promise<{nodes: Object[], edges: Object[], epochs: Object[]}>}
 *   Nodes include x, y, z position fields merged from layout data.
 */
export async function loadConstellationData() {
  try {
    const [graphRes, layoutRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/constellation.graph.json`),
      fetch(`${import.meta.env.BASE_URL}data/constellation.layout.json`),
    ]);

    if (!graphRes.ok || !layoutRes.ok) {
      throw new Error(`Fetch failed: graph=${graphRes.status}, layout=${layoutRes.status}`);
    }

    const graph = await graphRes.json();
    const layout = await layoutRes.json();

    // Merge layout positions (+ optional strand/phase metadata) into node data
    const nodesWithPositions = graph.nodes.map(node => {
      const pos = layout.positions[node.id];
      if (pos) {
        const merged = { ...node, x: pos.x, y: pos.y, z: pos.z };
        if (pos.strand !== undefined) merged.strand = pos.strand;
        if (pos.phase !== undefined) merged.phase = pos.phase;
        // Prefer layout tier (computed from positions), fall back to node tier
        if (pos.tier) merged.tier = pos.tier;
        return merged;
      }
      return node;
    });

    return {
      nodes: nodesWithPositions,
      edges: graph.edges,
      epochs: graph.epochs,
    };
  } catch {
    // Fall back to mock data + client-side layout
    const nodesWithPositions = computeHelixLayout(mockData.nodes);

    return {
      nodes: nodesWithPositions,
      edges: mockData.edges,
      epochs: mockData.epochs || [],
    };
  }
}

export default loadConstellationData;
