/**
 * Double-helix layout computation for pipeline data (V2).
 *
 * V2 changes:
 * - Continuous angle progression across all nodes (no per-epoch reset).
 * - Compact epoch band separation instead of large hard jumps.
 * - Lower, directional jitter to preserve helix silhouette.
 * - Outputs strand/phase metadata per node.
 *
 * Uses mulberry32 PRNG from pipeline utils for deterministic jitter.
 */

import { mulberry32 } from '../utils/deterministic.mjs';

/**
 * Groups nodes by epoch, preserving date-sorted order within each group.
 *
 * @param {Object[]} nodes - Sorted nodes with epoch field
 * @returns {Array<Object[]>} Array of epoch groups
 */
function groupByEpoch(nodes) {
  const epochMap = new Map();
  for (const node of nodes) {
    const epoch = node.epoch || 'Unknown';
    if (!epochMap.has(epoch)) {
      epochMap.set(epoch, []);
    }
    epochMap.get(epoch).push(node);
  }
  return Array.from(epochMap.values());
}

/**
 * Compute a double-helix layout for constellation nodes (V2).
 *
 * Nodes are sorted by date, grouped by epoch, then positioned along a
 * parametric double helix with continuous angle progression and seeded jitter.
 *
 * Output is a positions map { [nodeId]: { x, y, z, strand, phase } }
 * separate from node data, for constellation.layout.json.
 *
 * @param {Object[]} nodes - Array of canonical nodes with { id, date, epoch, isHub, size }
 * @param {Object} config - Layout configuration
 * @param {number} config.radius - Helix radius (default 34)
 * @param {number} config.turns - Total helix turns across all nodes (default 6)
 * @param {number} config.verticalStep - Y distance per node (default 1.35)
 * @param {number} config.epochBandGap - Extra Y gap between epochs (default 1.8)
 * @param {number} config.jitterRadial - Radial jitter magnitude (default 0.6)
 * @param {number} config.jitterAxial - Axial (Y) jitter magnitude (default 0.25)
 * @param {number} config.seed - Seed for deterministic PRNG (default 42)
 * @returns {{ positions: Object, helixParams: Object, bounds: { minY: number, maxY: number } }}
 */
export function computePipelineLayout(nodes, config = {}) {
  const {
    radius = 34,
    turns = 6,
    verticalStep = 1.35,
    epochBandGap = 1.8,
    jitterRadial = 0.6,
    jitterAxial = 0.25,
    seed = 42,
  } = config;

  const rng = mulberry32(seed);

  // Sort nodes by date
  const sorted = [...nodes].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Group by epoch (preserves date-sorted order within each epoch)
  const epochs = groupByEpoch(sorted);

  // Flatten to get total count for continuous angle distribution
  const totalNodes = sorted.length;
  const totalAngle = turns * Math.PI * 2;

  const positions = {};
  let globalIndex = 0;
  let currentY = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  epochs.forEach((epochNodes, epochIndex) => {
    if (epochIndex > 0) {
      currentY += epochBandGap;
    }

    epochNodes.forEach((node) => {
      // Continuous angle across all nodes
      const baseAngle = totalNodes > 1
        ? (globalIndex / (totalNodes - 1)) * totalAngle
        : 0;

      // Balanced strand assignment (hubs stay large via size, not strand-pinned)
      const strand = globalIndex % 2;
      const angle = baseAngle + strand * Math.PI;

      // Seeded directional jitter (radial + axial)
      const radialOffset = (rng() - 0.5) * 2 * jitterRadial;
      const axialOffset = (rng() - 0.5) * 2 * jitterAxial;

      const r = radius + radialOffset;
      const x = Number((r * Math.cos(angle)).toFixed(4));
      const y = Number((currentY + axialOffset).toFixed(4));
      const z = Number((r * Math.sin(angle)).toFixed(4));

      positions[node.id] = {
        x,
        y,
        z,
        strand,
        phase: Number(baseAngle.toFixed(4)),
      };

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      currentY += verticalStep;
      globalIndex++;
    });
  });

  // Handle empty input
  if (Object.keys(positions).length === 0) {
    minY = 0;
    maxY = 0;
  }

  return {
    positions,
    helixParams: { radius, turns, verticalStep, epochBandGap, jitterRadial, jitterAxial, seed },
    bounds: { minY, maxY },
  };
}
