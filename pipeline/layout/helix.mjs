/**
 * Double-helix layout computation for pipeline data (V3 — two-tier).
 *
 * V3 changes:
 * - Two-tier layout: helix-tier nodes on the spine, particle-tier as ambient cloud.
 * - Particle positions: random cylinder around helix, Y matched to date.
 * - Helix spine is denser with fewer nodes (better visual density).
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
 * Compute a two-tier layout for constellation nodes.
 *
 * HELIX tier: Positioned along a parametric double helix (the spine).
 * PARTICLE tier: Scattered in a cylindrical cloud around the helix,
 *   with Y positions matching their temporal position.
 *
 * @param {Object[]} nodes - Array of canonical nodes with { id, date, epoch, tier, size }
 * @param {Object} config - Layout configuration
 * @param {Object} tierConfig - Tier configuration (particle radius, etc.)
 * @returns {{ positions: Object, helixParams: Object, bounds: { minY: number, maxY: number } }}
 */
export function computePipelineLayout(nodes, config = {}, tierConfig = {}) {
  const {
    radius = 34,
    turns = 6,
    verticalStep = 1.35,
    epochBandGap = 1.8,
    jitterRadial = 0.6,
    jitterAxial = 0.25,
    seed = 42,
  } = config;

  const {
    particleRadiusMin = 1.2,
    particleRadiusMax = 2.2,
  } = tierConfig;

  const rng = mulberry32(seed);

  // Separate helix and particle tier nodes
  const helixNodes = nodes.filter(n => n.tier === 'helix');
  const particleNodes = nodes.filter(n => n.tier !== 'helix');

  // Sort helix nodes by date
  const sortedHelix = [...helixNodes].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Sort all nodes by date for temporal mapping (used for particle Y)
  const allSorted = [...nodes].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // ─── HELIX SPINE LAYOUT ──────────────────────────────────────────
  const epochs = groupByEpoch(sortedHelix);
  const totalHelixNodes = sortedHelix.length;
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
      const baseAngle = totalHelixNodes > 1
        ? (globalIndex / (totalHelixNodes - 1)) * totalAngle
        : 0;

      const strand = globalIndex % 2;
      const angle = baseAngle + strand * Math.PI;

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
        tier: 'helix',
      };

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      currentY += verticalStep;
      globalIndex++;
    });
  });

  // ─── PARTICLE CLOUD LAYOUT ───────────────────────────────────────
  // Map particle nodes to Y positions based on their date relative to the
  // overall helix time span, then scatter them in a cylindrical shell.

  if (particleNodes.length > 0 && totalHelixNodes > 0) {
    // Date range from helix nodes
    const helixDates = sortedHelix.map(n => new Date(n.date).getTime());
    const dateMin = helixDates[0];
    const dateMax = helixDates[helixDates.length - 1];
    const dateRange = dateMax - dateMin || 1;

    // Y range from helix layout
    const helixYMin = minY;
    const helixYMax = maxY;
    const yRange = helixYMax - helixYMin || 100;

    for (const node of particleNodes) {
      const nodeTime = new Date(node.date).getTime();
      // Map date to normalized position (0-1)
      const t = Math.max(0, Math.min(1, (nodeTime - dateMin) / dateRange));

      // Y position matches temporal position on helix
      const y = Number((helixYMin + t * yRange).toFixed(4));

      // Random angle (full 360)
      const angle = rng() * Math.PI * 2;

      // Random radius in cylindrical shell around helix
      const rMin = radius * particleRadiusMin;
      const rMax = radius * particleRadiusMax;
      const r = rMin + rng() * (rMax - rMin);

      const x = Number((r * Math.cos(angle)).toFixed(4));
      const z = Number((r * Math.sin(angle)).toFixed(4));

      positions[node.id] = {
        x,
        y,
        z,
        strand: -1, // not on a strand
        phase: 0,
        tier: 'particle',
      };

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  } else if (particleNodes.length > 0) {
    // Edge case: only particle nodes, no helix nodes — scatter in a sphere
    for (const node of particleNodes) {
      const angle = rng() * Math.PI * 2;
      const elevation = (rng() - 0.5) * Math.PI;
      const r = radius * (0.5 + rng() * 1.5);

      const x = Number((r * Math.cos(angle) * Math.cos(elevation)).toFixed(4));
      const y = Number((r * Math.sin(elevation) * 50).toFixed(4));
      const z = Number((r * Math.sin(angle) * Math.cos(elevation)).toFixed(4));

      positions[node.id] = { x, y, z, strand: -1, phase: 0, tier: 'particle' };

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

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
