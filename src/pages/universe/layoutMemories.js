/**
 * 3D layout for curated memory polaroids on the Universe page.
 *
 * Distributes 5 epoch clusters spherically around the origin so
 * memories surround the viewer in all directions. Uses seeded PRNG
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

// Five epoch clusters distributed spherically around the origin
// Placed on a sphere of radius ~16, spread across all directions
const EPOCH_CENTERS = {
  'Early Years': { x: 0, y: 14, z: -8 },      // above + slightly behind
  'College': { x: -13, y: -4, z: -7 },         // left + below
  'Career Start': { x: 10, y: 6, z: 10 },      // right front + above
  'Growth': { x: -6, y: -10, z: 11 },          // left below + behind viewer
  'Present': { x: 8, y: -2, z: -14 },          // right + far back
};

// Also export for EpochNebulae in the main page
export { EPOCH_CENTERS };

const SCATTER_RADIUS = 4;

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
