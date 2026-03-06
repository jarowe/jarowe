/**
 * 3D layout for curated memory polaroids on the Universe page.
 *
 * Arranges epoch clusters in an arc through 3D space, with each
 * memory scattered within its epoch cluster. Uses seeded PRNG
 * for deterministic, reproducible positioning.
 */

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Five epoch cluster centers arranged in an arc
const EPOCH_CENTERS = {
  'Early Years': { x: -14, y: 2, z: -10 },
  'College': { x: -7, y: -1, z: -12 },
  'Career Start': { x: 0, y: 3, z: -14 },
  'Growth': { x: 7, y: 0, z: -12 },
  'Present': { x: 14, y: 2, z: -10 },
};

const SCATTER_RADIUS = 3.5;

/**
 * @param {Array} memories - Output from curateMemories()
 * @param {Object} [opts]
 * @param {number} [opts.seed=42] - PRNG seed for reproducible layout
 * @returns {Array<{...memory, position: [x,y,z], rotation: [rx,ry,rz]}>}
 */
export function layoutMemories(memories, opts = {}) {
  const { seed = 42 } = opts;
  const rand = mulberry32(seed);

  return memories.map((mem) => {
    const center = EPOCH_CENTERS[mem.epoch] || { x: 0, y: 0, z: -12 };

    // Scatter within cluster sphere
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = SCATTER_RADIUS * Math.cbrt(rand()); // cube root for uniform volume

    const x = center.x + r * Math.sin(phi) * Math.cos(theta);
    const y = center.y + r * Math.sin(phi) * Math.sin(theta);
    const z = center.z + r * Math.cos(phi);

    // Gentle random rotation for natural feel
    const rx = (rand() - 0.5) * 0.3;
    const ry = (rand() - 0.5) * 0.4;
    const rz = (rand() - 0.5) * 0.25;

    return {
      ...mem,
      position: [x, y, z],
      rotation: [rx, ry, rz],
    };
  });
}
