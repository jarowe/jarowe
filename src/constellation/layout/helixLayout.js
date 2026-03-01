import * as THREE from 'three';

/**
 * Seeded PRNG (mulberry32) for deterministic jitter.
 * Returns a function that produces values in [0, 1).
 */
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Groups nodes by epoch, preserving order.
 * @param {Array} nodes - Sorted nodes with epoch field
 * @returns {Array<Array>} Array of epoch groups (arrays of nodes)
 */
function groupByEpoch(nodes) {
  const epochMap = new Map();
  for (const node of nodes) {
    const epoch = node.epoch;
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
 * Continuous angle progression across all nodes, compact epoch bands,
 * low directional jitter. Mirrors pipeline/layout/helix.mjs.
 *
 * @param {Array} nodes - Array of node objects with { date, epoch, isHub, size, ... }
 * @param {Object} config - Layout configuration
 * @param {number} config.radius - Helix radius (default 34)
 * @param {number} config.turns - Total helix turns (default 6)
 * @param {number} config.verticalStep - Y distance per node (default 1.35)
 * @param {number} config.epochBandGap - Extra Y gap between epochs (default 1.8)
 * @param {number} config.jitterRadial - Radial jitter magnitude (default 0.6)
 * @param {number} config.jitterAxial - Axial (Y) jitter magnitude (default 0.25)
 * @param {number} config.seed - Seed for deterministic PRNG (default 42)
 * @returns {Array} Nodes with added x, y, z, strand, phase fields
 */
export function computeHelixLayout(nodes, config = {}) {
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

  const positions = [];
  let globalIndex = 0;
  let currentY = 0;

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
      const x = r * Math.cos(angle);
      const y = currentY + axialOffset;
      const z = r * Math.sin(angle);

      positions.push({ ...node, x, y, z, strand, phase: baseAngle });

      currentY += verticalStep;
      globalIndex++;
    });
  });

  return positions;
}

/**
 * Get the center point of the helix layout for camera targeting.
 * @param {Array} positions - Array of nodes with x, y, z fields
 * @returns {THREE.Vector3} Midpoint of the helix
 */
export function getHelixCenter(positions) {
  if (!positions.length) return new THREE.Vector3(0, 0, 0);

  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  for (const p of positions) {
    sumX += p.x;
    sumY += p.y;
    sumZ += p.z;
  }
  const n = positions.length;
  return new THREE.Vector3(sumX / n, sumY / n, sumZ / n);
}

/**
 * Get the vertical bounds of the helix for timeline scrubber mapping.
 * @param {Array} positions - Array of nodes with y field
 * @returns {{ minY: number, maxY: number }} Vertical extent
 */
export function getHelixBounds(positions) {
  if (!positions.length) return { minY: 0, maxY: 0 };

  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of positions) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minY, maxY };
}
