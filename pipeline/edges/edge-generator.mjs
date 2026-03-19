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
 *      Milestone nodes get a higher cap (12) as spine-defining hub nodes.
 *   This produces a target density of 3-6 meaningful connections per node.
 *
 * Edge quality metrics are tracked for pipeline-status.json reporting.
 * Output: Sorted deterministically for byte-identical results.
 */

import { calculateSignals, EDGE_THRESHOLD } from './signals.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('edges');

/** Max edges per node per entity name for shared-entity/shared-identity signals. */
const MAX_EDGES_PER_ENTITY_PER_NODE = 3;

/** Max edges per node per signal type (prevents one signal type from dominating). */
const MAX_EDGES_PER_SIGNAL_TYPE = 6;

/** Max total edges per node (target: 3-6 meaningful connections). */
const MAX_EDGES_PER_NODE = 6;

/** Max total edges for milestone nodes (spine-defining, serve as connection hubs). */
const MAX_EDGES_PER_MILESTONE = 12;

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

  // ── Build spine-edge set: edges where both endpoints are manual milestones ──
  // These are protected from phases 0 and 1 pruning to preserve the narrative spine.
  // Phase 2 handles them with dedicated spine-slot reservation.
  const nodeInfoMap = new Map();
  for (const n of sorted) {
    nodeInfoMap.set(n.id, { type: n.type, source: n.source });
  }

  const spineEdgeIndices = new Set();
  for (let idx = 0; idx < allEdges.length; idx++) {
    const edge = allEdges[idx];
    const srcInfo = nodeInfoMap.get(edge.source);
    const tgtInfo = nodeInfoMap.get(edge.target);
    if (srcInfo?.type === 'milestone' && srcInfo?.source === 'manual' &&
        tgtInfo?.type === 'milestone' && tgtInfo?.source === 'manual') {
      spineEdgeIndices.add(idx);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRUNING PHASE 0: Per-entity cap for shared-entity/shared-identity
  // Prevents a single person (e.g. "Maria") from connecting 15+ nodes.
  // Top N strongest edges per entity name per node survive.
  // ══════════════════════════════════════════════════════════════════════════

  const ENTITY_SIGNALS = new Set(['shared-entity', 'shared-identity']);

  // Extract entity names from an edge's evidence descriptions
  function extractEntityNames(evidence) {
    const names = new Set();
    for (const ev of evidence) {
      if (!ENTITY_SIGNALS.has(ev.signal)) continue;
      // Descriptions follow patterns like:
      //   "United by Maria & Derek in both stories"
      //   "Maria — wife — threads through both memories"
      //   "Maria & Derek connect these memories"
      //   "Maria present in both moments"
      const desc = ev.description;
      // Pattern 1: "United by X in both stories"
      let match = desc.match(/^United by (.+?) in both/);
      if (match) {
        for (const n of match[1].split(/\s*&\s*/)) names.add(n.trim().toLowerCase());
        continue;
      }
      // Pattern 2: "X — relationship — threads through both memories"
      match = desc.match(/^(.+?)\s*—/);
      if (match) {
        names.add(match[1].trim().toLowerCase());
        continue;
      }
      // Pattern 3: "X connect(s) these memories" or "X present in both moments"
      match = desc.match(/^(.+?)\s+(?:connects?|present)/);
      if (match) {
        for (const n of match[1].split(/\s*&\s*/)) names.add(n.trim().toLowerCase());
        continue;
      }
    }
    return names;
  }

  // Build index: nodeId -> entityName -> [edge indices sorted by weight desc]
  const nodeEntityEdges = new Map();

  for (let edgeIdx = 0; edgeIdx < allEdges.length; edgeIdx++) {
    const edge = allEdges[edgeIdx];
    const hasEntitySignal = edge.evidence.some(ev => ENTITY_SIGNALS.has(ev.signal));
    if (!hasEntitySignal) continue;

    const entityNames = extractEntityNames(edge.evidence);
    if (entityNames.size === 0) continue;

    for (const nodeId of [edge.source, edge.target]) {
      if (!nodeEntityEdges.has(nodeId)) nodeEntityEdges.set(nodeId, new Map());
      const entityMap = nodeEntityEdges.get(nodeId);
      for (const name of entityNames) {
        if (!entityMap.has(name)) entityMap.set(name, []);
        entityMap.get(name).push(edgeIdx);
      }
    }
  }

  // Collect removal candidates: edge removed only if BOTH endpoints want it gone
  const nodeWantsRemovedP0 = new Map();

  for (const [nodeId, entityMap] of nodeEntityEdges) {
    const wantsRemoved = new Set();
    for (const [, edgeIndices] of entityMap) {
      if (edgeIndices.length <= MAX_EDGES_PER_ENTITY_PER_NODE) continue;
      const sortedIndices = [...edgeIndices].sort(
        (a, b) => allEdges[b].weight - allEdges[a].weight
      );
      for (let k = MAX_EDGES_PER_ENTITY_PER_NODE; k < sortedIndices.length; k++) {
        wantsRemoved.add(sortedIndices[k]);
      }
    }
    nodeWantsRemovedP0.set(nodeId, wantsRemoved);
  }

  const phase0Remove = new Set();
  for (let idx = 0; idx < allEdges.length; idx++) {
    if (spineEdgeIndices.has(idx)) continue; // spine edges protected from phase 0
    const edge = allEdges[idx];
    const sourceWants = nodeWantsRemovedP0.get(edge.source)?.has(idx) ?? false;
    const targetWants = nodeWantsRemovedP0.get(edge.target)?.has(idx) ?? false;
    if (sourceWants && targetWants) {
      phase0Remove.add(idx);
    }
  }

  const afterPhase0 = allEdges.length - phase0Remove.size;

  // ══════════════════════════════════════════════════════════════════════════
  // PRUNING PHASE 1: Per-signal-type cap (top N per node per signal type)
  // ══════════════════════════════════════════════════════════════════════════

  // Build index: nodeId -> signalType -> [edge indices]
  const nodeSignalEdges = new Map();

  for (let edgeIdx = 0; edgeIdx < allEdges.length; edgeIdx++) {
    if (phase0Remove.has(edgeIdx)) continue; // already pruned in Phase 0
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

  // Only remove edge if BOTH endpoints want it removed (spine edges protected)
  const phase1Remove = new Set();
  for (let idx = 0; idx < allEdges.length; idx++) {
    if (spineEdgeIndices.has(idx)) continue; // spine edges protected from phase 1
    const edge = allEdges[idx];
    const sourceWants = nodeWantsRemoved.get(edge.source)?.has(idx) ?? false;
    const targetWants = nodeWantsRemoved.get(edge.target)?.has(idx) ?? false;
    if (sourceWants && targetWants) {
      phase1Remove.add(idx);
    }
  }

  let edges = allEdges.filter((_, idx) => !phase0Remove.has(idx) && !phase1Remove.has(idx));
  const afterPhase1 = edges.length;

  // ══════════════════════════════════════════════════════════════════════════
  // PRUNING PHASE 2: Overall cap (top N per node, highest weight wins)
  // Milestone nodes get a higher cap (MAX_EDGES_PER_MILESTONE) as they are
  // spine-defining hub nodes that should connect broadly to related content.
  // Edges connecting TO a milestone are also protected: a non-milestone node
  // can only vote to remove an edge if the other endpoint is not a milestone.
  // ══════════════════════════════════════════════════════════════════════════

  // Build node type lookup for milestone protection
  const nodeTypeMap = new Map();
  for (const n of sorted) {
    nodeTypeMap.set(n.id, n.type);
  }

  // Build node -> edges index
  const nodeEdgeMap = new Map();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    for (const nid of [e.source, e.target]) {
      if (!nodeEdgeMap.has(nid)) nodeEdgeMap.set(nid, []);
      nodeEdgeMap.get(nid).push(i);
    }
  }

  // Collect per-node removal candidates.
  // Manual milestone nodes (source: 'manual') reserve SPINE_RESERVED_SLOTS
  // specifically for other manual milestone connections to keep the narrative
  // spine interconnected even when non-milestone edges compete for slots.
  const SPINE_RESERVED_SLOTS = 3;
  const nodeWantsRemovedP2 = new Map(); // nodeId -> Set<edgeIdx>

  // Build source lookup for spine reservation
  const nodeSourceMap = new Map();
  for (const n of sorted) {
    nodeSourceMap.set(n.id, n.source);
  }

  for (const [nodeId, edgeIndices] of nodeEdgeMap) {
    const isMilestone = nodeTypeMap.get(nodeId) === 'milestone';
    const isManualMilestone = isMilestone && nodeSourceMap.get(nodeId) === 'manual';
    const cap = isMilestone ? MAX_EDGES_PER_MILESTONE : MAX_EDGES_PER_NODE;

    if (edgeIndices.length <= cap) continue;

    if (isManualMilestone) {
      // Split edges: manual-milestone partners (spine) vs everything else
      const spineEdges = [];
      const otherEdges = [];
      for (const idx of edgeIndices) {
        const edge = edges[idx];
        const partnerId = edge.source === nodeId ? edge.target : edge.source;
        const partnerIsManualMilestone = nodeTypeMap.get(partnerId) === 'milestone'
          && nodeSourceMap.get(partnerId) === 'manual';
        if (partnerIsManualMilestone) {
          spineEdges.push(idx);
        } else {
          otherEdges.push(idx);
        }
      }

      // Sort each group by weight descending
      spineEdges.sort((a, b) => edges[b].weight - edges[a].weight);
      otherEdges.sort((a, b) => edges[b].weight - edges[a].weight);

      // Reserve slots for spine (manual milestone) edges, fill rest with best others
      const reservedCount = Math.min(SPINE_RESERVED_SLOTS, spineEdges.length);
      const otherCap = cap - reservedCount;
      const kept = new Set([
        ...spineEdges.slice(0, reservedCount),
        ...otherEdges.slice(0, otherCap),
      ]);

      // If we have leftover cap, fill with remaining spine edges
      if (kept.size < cap) {
        for (const idx of spineEdges.slice(reservedCount)) {
          if (kept.size >= cap) break;
          kept.add(idx);
        }
      }
      // Then fill with remaining other edges
      if (kept.size < cap) {
        for (const idx of otherEdges.slice(otherCap)) {
          if (kept.size >= cap) break;
          kept.add(idx);
        }
      }

      const wantsRemoved = new Set();
      for (const idx of edgeIndices) {
        if (!kept.has(idx)) wantsRemoved.add(idx);
      }
      nodeWantsRemovedP2.set(nodeId, wantsRemoved);
    } else {
      // Non-manual-milestone: simple top-N by weight (milestone cap if milestone type)
      const sortedIndices = [...edgeIndices].sort(
        (a, b) => edges[b].weight - edges[a].weight
      );
      const wantsRemoved = new Set();
      for (let k = cap; k < sortedIndices.length; k++) {
        wantsRemoved.add(sortedIndices[k]);
      }
      nodeWantsRemovedP2.set(nodeId, wantsRemoved);
    }
  }

  // Milestone-aware removal logic:
  //   - Non-milestone ↔ non-milestone: remove if EITHER endpoint wants it gone (original)
  //   - Milestone ↔ non-milestone: remove if the MILESTONE wants it gone (milestone controls
  //     its own cap), but do NOT remove just because the non-milestone wants it gone
  //     (protects milestones from being pruned by well-connected partners)
  //   - Milestone ↔ milestone: remove if BOTH want it gone (bilateral)
  const phase2Remove = new Set();
  for (let idx = 0; idx < edges.length; idx++) {
    const edge = edges[idx];
    const sourceWants = nodeWantsRemovedP2.get(edge.source)?.has(idx) ?? false;
    const targetWants = nodeWantsRemovedP2.get(edge.target)?.has(idx) ?? false;

    if (!sourceWants && !targetWants) continue; // neither wants removal

    const sourceIsMilestone = nodeTypeMap.get(edge.source) === 'milestone';
    const targetIsMilestone = nodeTypeMap.get(edge.target) === 'milestone';

    if (sourceIsMilestone && targetIsMilestone) {
      // Both milestones: bilateral agreement required
      if (sourceWants && targetWants) {
        phase2Remove.add(idx);
      }
    } else if (sourceIsMilestone || targetIsMilestone) {
      // One milestone: milestone controls its own cap, non-milestone cannot force removal
      const milestoneWants = sourceIsMilestone ? sourceWants : targetWants;
      if (milestoneWants) {
        phase2Remove.add(idx);
      }
    } else {
      // Non-milestone edges: remove if either endpoint wants it gone (original behavior)
      phase2Remove.add(idx);
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
    `After pruning: ${edges.length} edges (phase0/entity-cap: -${edgesBeforePruning - afterPhase0}, phase1: -${afterPhase0 - afterPhase1}, phase2: -${afterPhase1 - edges.length})`
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
