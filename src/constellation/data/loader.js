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
import { supabase } from '../../lib/supabase';

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
/**
 * Fetch all curation overrides from Supabase node_curation table.
 * Returns a Map of nodeId → override row. Silently returns empty Map on error.
 */
async function fetchCurationOverrides() {
  if (!supabase) return new Map();
  try {
    const { data, error } = await supabase
      .from('node_curation')
      .select('*');
    if (error) throw error;
    const map = new Map();
    for (const row of data || []) {
      map.set(row.node_id, row);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Apply curation overrides to nodes and filter hidden ones.
 */
function applyCurationOverrides(nodes, overrides) {
  if (overrides.size === 0) return nodes;

  return nodes
    .map(node => {
      const cur = overrides.get(node.id);
      if (!cur) return node;
      const merged = { ...node };
      if (cur.title_override) merged.title = cur.title_override;
      if (cur.description_override) merged.description = cur.description_override;
      if (cur.significance_override != null) merged.significance = cur.significance_override;
      if (cur.visibility && cur.visibility !== 'public') merged.visibility = cur.visibility;
      return merged;
    })
    .filter(node => {
      const cur = overrides.get(node.id);
      return !cur?.hidden;
    });
}

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
    let nodesWithPositions = graph.nodes.map(node => {
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

    // Apply curation overrides from Supabase (graceful degradation)
    const overrides = await fetchCurationOverrides();
    nodesWithPositions = applyCurationOverrides(nodesWithPositions, overrides);

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
