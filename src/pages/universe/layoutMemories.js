/**
 * 3D layout for curated memory polaroids on the Universe page.
 *
 * Distributes all memories evenly on a sphere around the origin using
 * Fibonacci (golden angle) spiral for near-perfect spacing. Epochs get
 * adjacent slots on the spiral so they're loosely grouped but never
 * overlapping. Every direction has something to discover.
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

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.4 radians

/**
 * Fibonacci sphere: distributes N points nearly uniformly on a sphere.
 * Each point gets a unique index → near-perfect even spacing.
 */
function fibonacciSphere(index, total, radius) {
  const y = 1 - (index / (total - 1)) * 2; // -1 to 1
  const r = Math.sqrt(1 - y * y);
  const theta = GOLDEN_ANGLE * index;

  return {
    x: Math.cos(theta) * r * radius,
    y: y * radius,
    z: Math.sin(theta) * r * radius,
  };
}

// Epoch order for grouping adjacent slots on the spiral
const EPOCH_ORDER = ['Early Years', 'College', 'Career Start', 'Growth', 'Present'];

/**
 * @param {Array} memories - Output from curateMemories()
 * @param {Object} [opts]
 * @param {number} [opts.seed=42] - PRNG seed
 * @param {number} [opts.radius=16] - Sphere radius
 * @returns {Array<{...memory, position: [x,y,z], rotation: [rx,ry,rz]}>}
 */
export function layoutMemories(memories, opts = {}) {
  const { seed = 42, radius = 16 } = opts;
  const rand = mulberry32(seed);
  const total = memories.length;

  // Sort memories so epochs are grouped adjacently on the Fibonacci spiral
  const sorted = [...memories].sort((a, b) => {
    const ai = EPOCH_ORDER.indexOf(a.epoch);
    const bi = EPOCH_ORDER.indexOf(b.epoch);
    if (ai !== bi) return ai - bi;
    return b.significance - a.significance;
  });

  return sorted.map((mem, i) => {
    const base = fibonacciSphere(i, total, radius);

    // Small jitter so they're not robotically perfect
    const jx = (rand() - 0.5) * 2.5;
    const jy = (rand() - 0.5) * 2.5;
    const jz = (rand() - 0.5) * 2.5;

    const rx = (rand() - 0.5) * 0.3;
    const ry = (rand() - 0.5) * 0.4;
    const rz = (rand() - 0.5) * 0.25;

    return {
      ...mem,
      position: [base.x + jx, base.y + jy, base.z + jz],
      rotation: [rx, ry, rz],
    };
  });
}

/**
 * Compute epoch label positions — average of each epoch's memory positions.
 * Called after layoutMemories so labels sit at the centroid of their group.
 */
export function getEpochCentroids(laidMemories) {
  const sums = {};
  const counts = {};
  for (const mem of laidMemories) {
    if (!sums[mem.epoch]) {
      sums[mem.epoch] = [0, 0, 0];
      counts[mem.epoch] = 0;
    }
    sums[mem.epoch][0] += mem.position[0];
    sums[mem.epoch][1] += mem.position[1];
    sums[mem.epoch][2] += mem.position[2];
    counts[mem.epoch]++;
  }
  const centroids = {};
  for (const epoch of Object.keys(sums)) {
    const n = counts[epoch];
    centroids[epoch] = [sums[epoch][0] / n, sums[epoch][1] / n, sums[epoch][2] / n];
  }
  return centroids;
}
