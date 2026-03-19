/**
 * Evidence-based edge generation for the constellation pipeline.
 *
 * V2 MEANING ENGINE: Generates deeply meaningful, story-driven edges.
 *
 * Pruning strategy (V2):
 *   1. Drop temporal-only edges (need at least one non-temporal signal)
 *   2. Cross-source edges require weight >= 0.7
 *   3. Per-signal-type cap: top 6 edges per node per signal type
 *   4. Overall cap: top 6 edges per node (highest weight first)
 *   This produces a target density of 3-6 meaningful connections per node.
 *
 * Edge quality metrics are tracked for pipeline-status.json reporting.
 * Output: Sorted deterministically for byte-identical results.
 */

import { calculateSignals, EDGE_THRESHOLD } from './signals.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('edges');

/** Max edges per node per signal type (prevents one signal type from dominating). */
const MAX_EDGES_PER_SIGNAL_TYPE = 6;

/** Max total edges per node (target: 3-6 meaningful connections). */
const MAX_EDGES_PER_NODE = 6;

/**
 * Generate evidence-based edges between all node pairs.
 *
 * @param {Object[]} nodes - Array of canonical nodes (with _motifs populated)
 * @param {Object} [identityMap] - Optional identity registry for enriched signals
 * @returns {Promise<{edges: Object[], stats: Object}>}
 */
export async function generateEdges(nodes, identityMap) {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  const allEdges = [];
  let totalPairs = 0;

  // Generate edges for all unique pairs
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      totalPairs++;

      const signals = calculateSignals(sorted[i], sorted[j], identityMap);
      if (signals.length === 0) continue;

      const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
      if (totalWeight < EDGE_THRESHOLD) continue;

      // ── V2: Drop edges that have ONLY temporal signals ──
      // Every edge needs at least one non-temporal signal (semantic, spatial, thematic, identity, narrative)
      const TEMPORAL_SIGNALS = new Set(['life-chapter', 'temporal-proximity', 'seasonal-echo', 'same-day']);
      const hasNonTemporal = signals.some(s => !TEMPORAL_SIGNALS.has(s.signal));
      if (!hasNonTemporal) continue;

      // ── V2: Cross-source edges require higher threshold ──
      const srcA = sorted[i].source;
      const srcB = sorted[j].source;
      if (srcA && srcB && srcA !== srcB && totalWeight < 0.7) continue;

      allEdges.push({
        source: sorted[i].id,
        target: sorted[j].id,
        weight: Number(totalWeight.toFixed(2)),
        evidence: signals.map(s => ({
          type: s.type,
          signal: s.signal,
          description: s.description,
          weight: s.weight,
        })),
      });
    }
  }

  const edgesBeforePruning = allEdges.length;
  log.info(`Generated ${edgesBeforePruning} candidate edges from ${totalPairs} pairs`);

  // ══════════════════════════════════════════════════════════════════════════
  // PRUNING PHASE 1: Per-signal-type cap (top N per node per signal type)
  // ══════════════════════════════════════════════════════════════════════════

  // Build index: nodeId -> signalType -> [edge indices]
  const nodeSignalEdges = new Map();

  for (let edgeIdx = 0; edgeIdx < allEdges.length; edgeIdx++) {
    const edge = allEdges[edgeIdx];
    for (const nodeId of [edge.source, edge.target]) {
      if (!nodeSignalEdges.has(nodeId)) {
        nodeSignalEdges.set(nodeId, new Map());
      }
      const signalMap = nodeSignalEdges.get(nodeId);
      for (const ev of edge.evidence) {
        if (!signalMap.has(ev.signal)) {
          signalMap.set(ev.signal, []);
        }
        signalMap.get(ev.signal).push(edgeIdx);
      }
    }
  }

  // Collect per-node removal candidates (edge only removed if BOTH endpoints want it gone)
  // This prevents well-connected nodes from orphaning their less-connected neighbors
  const nodeWantsRemoved = new Map(); // nodeId -> Set<edgeIdx>

  for (const [nodeId, signalMap] of nodeSignalEdges) {
    const wantsRemoved = new Set();
    for (const [, edgeIndices] of signalMap) {
      if (edgeIndices.length <= MAX_EDGES_PER_SIGNAL_TYPE) continue;
      const sortedIndices = [...edgeIndices].sort(
        (a, b) => allEdges[b].weight - allEdges[a].weight
      );
      for (let k = MAX_EDGES_PER_SIGNAL_TYPE; k < sortedIndices.length; k++) {
        wantsRemoved.add(sortedIndices[k]);
      }
    }
    nodeWantsRemoved.set(nodeId, wantsRemoved);
  }

  // Only remove edge if BOTH endpoints want it removed
  const phase1Remove = new Set();
  for (let idx = 0; idx < allEdges.length; idx++) {
    const edge = allEdges[idx];
    const sourceWants = nodeWantsRemoved.get(edge.source)?.has(idx) ?? false;
    const targetWants = nodeWantsRemoved.get(edge.target)?.has(idx) ?? false;
    if (sourceWants && targetWants) {
      phase1Remove.add(idx);
    }
  }

  let edges = allEdges.filter((_, idx) => !phase1Remove.has(idx));
  const afterPhase1 = edges.length;

  // ══════════════════════════════════════════════════════════════════════════
  // PRUNING PHASE 2: Overall cap (top N per node, highest weight wins)
  // ══════════════════════════════════════════════════════════════════════════

  // Build node -> edges index
  const nodeEdgeMap = new Map();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    for (const nid of [e.source, e.target]) {
      if (!nodeEdgeMap.has(nid)) nodeEdgeMap.set(nid, []);
      nodeEdgeMap.get(nid).push(i);
    }
  }

  const phase2Remove = new Set();
  for (const [, edgeIndices] of nodeEdgeMap) {
    if (edgeIndices.length <= MAX_EDGES_PER_NODE) continue;
    const sortedIndices = [...edgeIndices].sort(
      (a, b) => edges[b].weight - edges[a].weight
    );
    for (let k = MAX_EDGES_PER_NODE; k < sortedIndices.length; k++) {
      phase2Remove.add(sortedIndices[k]);
    }
  }

  edges = edges.filter((_, idx) => !phase2Remove.has(idx));

  // Sort edges deterministically by source + target
  edges.sort((a, b) => {
    const cmp = a.source.localeCompare(b.source);
    if (cmp !== 0) return cmp;
    return a.target.localeCompare(b.target);
  });

  // ── Populate node connections arrays ──
  const connectionMap = new Map();
  for (const edge of edges) {
    if (!connectionMap.has(edge.source)) connectionMap.set(edge.source, new Set());
    if (!connectionMap.has(edge.target)) connectionMap.set(edge.target, new Set());
    connectionMap.get(edge.source).add(edge.target);
    connectionMap.get(edge.target).add(edge.source);
  }

  for (const node of nodes) {
    const conns = connectionMap.get(node.id);
    node.connections = conns ? [...conns].sort() : [];
  }

  // ── Quality metrics ──
  const connectionCounts = nodes.map(n => n.connections.length);
  const avgConnections = connectionCounts.length > 0
    ? connectionCounts.reduce((a, b) => a + b, 0) / connectionCounts.length
    : 0;
  const maxConnections = Math.max(0, ...connectionCounts);
  const minConnections = Math.min(Infinity, ...connectionCounts);
  const isolatedNodes = connectionCounts.filter(c => c === 0).length;

  // Cross-source edge count
  const crossSourceEdges = edges.filter(e => {
    const srcA = nodes.find(n => n.id === e.source)?.source;
    const srcB = nodes.find(n => n.id === e.target)?.source;
    return srcA && srcB && srcA !== srcB;
  }).length;

  // Signal type distribution
  const signalDist = {};
  for (const e of edges) {
    for (const ev of e.evidence) {
      signalDist[ev.signal] = (signalDist[ev.signal] || 0) + 1;
    }
  }

  const edgesPruned = edgesBeforePruning - edges.length;

  log.info(
    `After pruning: ${edges.length} edges (phase1: -${edgesBeforePruning - afterPhase1}, phase2: -${afterPhase1 - edges.length})`
  );
  log.info(
    `Connections per node: avg ${avgConnections.toFixed(1)}, ` +
    `range ${minConnections === Infinity ? 0 : minConnections}-${maxConnections}, ` +
    `${isolatedNodes} isolated`
  );
  log.info(`Cross-source edges: ${crossSourceEdges}/${edges.length} (${edges.length > 0 ? Math.round(crossSourceEdges / edges.length * 100) : 0}%)`);
  log.info(`Signal distribution: ${Object.entries(signalDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ')}`);

  return {
    edges,
    stats: {
      totalPairs,
      edgesCreated: edges.length,
      edgesPruned,
      avgConnectionsPerNode: Number(avgConnections.toFixed(1)),
      crossSourceEdges,
      crossSourceRatio: edges.length > 0 ? Number((crossSourceEdges / edges.length).toFixed(2)) : 0,
      signalDistribution: signalDist,
      isolatedNodes,
    },
  };
}
