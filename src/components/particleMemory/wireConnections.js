/**
 * Wire Connections — Spatial hash + LineSegments geometry builder
 *
 * Computes wire connections between particles using a spatial hash grid.
 * Dense connections form along depth edges (high Sobel gradient particles).
 * Sparse ambient connections link non-edge particles at longer range.
 *
 * Static topology, dynamic alpha — connection pairs computed once at init,
 * positions follow breathing per-frame, alpha pulses with uTime.
 */

// ---------------------------------------------------------------------------
// Spatial hash grid for efficient neighbor lookup
// ---------------------------------------------------------------------------
export class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  _key(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  insert(index, x, y, z) {
    const key = this._key(x, y, z);
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key).push(index);
  }

  getNeighborCells(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.grid.get(key);
          if (cell) neighbors.push(...cell);
        }
      }
    }
    return neighbors;
  }
}

// ---------------------------------------------------------------------------
// Compute wire connections from sampled particle data
// ---------------------------------------------------------------------------

/**
 * Build wire connections from particle data.
 *
 * @param {Float32Array} photoPositions - particle photo-formed positions (3 per particle)
 * @param {Float32Array} colors - particle colors (3 per particle)
 * @param {Float32Array} isEdgeFlags - 1.0 for edge-boost particles, 0.0 for grid particles
 * @param {number} count - total particle count
 * @param {object} [opts] - optional config overrides
 * @param {number} [opts.maxConnections=10000] - max total connections
 * @param {number} [opts.cellSize=0.04] - spatial hash cell size in world units
 * @param {number} [opts.edgeDistThreshold=0.06] - max 3D distance for edge connections
 * @param {number} [opts.sparseDistThreshold=0.15] - max 3D distance for sparse ambient connections
 * @param {number} [opts.edgeConnectionCap=3] - max connections per edge particle
 * @returns {{ positions: Float32Array, colorsA: Float32Array, colorsB: Float32Array, alphas: Float32Array, lineCount: number } | null}
 */
export function computeWireConnections(photoPositions, colors, isEdgeFlags, count, opts = {}) {
  if (count === 0) return null;

  const {
    maxConnections = 10000,
    cellSize = 0.04,
    edgeDistThreshold = 0.06,
    sparseDistThreshold = 0.15,
    edgeConnectionCap = 3,
  } = opts;

  // Build spatial hash
  const hash = new SpatialHash(cellSize);
  for (let i = 0; i < count; i++) {
    hash.insert(i, photoPositions[i * 3], photoPositions[i * 3 + 1], photoPositions[i * 3 + 2]);
  }

  const connections = [];
  const connectedSet = new Set();

  // Pass 1: Dense connections at depth edges (~70% of budget)
  const edgeBudget = Math.floor(maxConnections * 0.7);
  for (let i = 0; i < count && connections.length < edgeBudget; i++) {
    if (isEdgeFlags[i] < 0.5) continue; // skip non-edge particles

    const ax = photoPositions[i * 3];
    const ay = photoPositions[i * 3 + 1];
    const az = photoPositions[i * 3 + 2];

    const neighbors = hash.getNeighborCells(ax, ay, az);
    let edgeConnections = 0;

    for (const j of neighbors) {
      if (j <= i) continue; // avoid duplicates
      if (edgeConnections >= edgeConnectionCap) break;

      const bx = photoPositions[j * 3];
      const by = photoPositions[j * 3 + 1];
      const bz = photoPositions[j * 3 + 2];

      const dx = ax - bx;
      const dy = ay - by;
      const dz = az - bz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > edgeDistThreshold || dist < 0.001) continue;

      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (connectedSet.has(key)) continue;
      connectedSet.add(key);

      // Alpha fades with distance
      const alpha = 1.0 - (dist / edgeDistThreshold);
      connections.push({ a: i, b: j, alpha });
      edgeConnections++;
    }
  }

  // Pass 2: Sparse ambient connections (~30% of budget, sampled subset)
  const sparseStep = Math.max(1, Math.floor(count / 3000));
  for (let i = 0; i < count && connections.length < maxConnections; i += sparseStep) {
    if (isEdgeFlags[i] > 0.5) continue; // already handled edges

    const ax = photoPositions[i * 3];
    const ay = photoPositions[i * 3 + 1];
    const az = photoPositions[i * 3 + 2];

    // Find nearest non-self neighbor
    let bestJ = -1;
    let bestDist = sparseDistThreshold;

    const neighbors = hash.getNeighborCells(ax, ay, az);
    for (const j of neighbors) {
      if (j === i) continue;
      const bx = photoPositions[j * 3];
      const by = photoPositions[j * 3 + 1];
      const bz = photoPositions[j * 3 + 2];
      const dx = ax - bx;
      const dy = ay - by;
      const dz = az - bz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < bestDist && dist > 0.005) {
        bestDist = dist;
        bestJ = j;
      }
    }

    if (bestJ >= 0) {
      const key = i < bestJ ? `${i}-${bestJ}` : `${bestJ}-${i}`;
      if (!connectedSet.has(key)) {
        connectedSet.add(key);
        const alpha = (1.0 - (bestDist / sparseDistThreshold)) * 0.5; // softer
        connections.push({ a: i, b: bestJ, alpha });
      }
    }
  }

  if (connections.length === 0) return null;

  // Build LineSegments typed arrays
  const lineCount = connections.length;
  const positions = new Float32Array(lineCount * 6); // 2 vertices * 3 components
  const colorsA = new Float32Array(lineCount * 6);
  const colorsB = new Float32Array(lineCount * 6);
  const alphas = new Float32Array(lineCount * 2);

  for (let i = 0; i < lineCount; i++) {
    const conn = connections[i];
    const ai = conn.a;
    const bi = conn.b;

    // Positions (follow photo-formed positions; will be updated per-frame for breathing)
    positions[i * 6] = photoPositions[ai * 3];
    positions[i * 6 + 1] = photoPositions[ai * 3 + 1];
    positions[i * 6 + 2] = photoPositions[ai * 3 + 2];
    positions[i * 6 + 3] = photoPositions[bi * 3];
    positions[i * 6 + 4] = photoPositions[bi * 3 + 1];
    positions[i * 6 + 5] = photoPositions[bi * 3 + 2];

    // Colors (averaged from connected particles)
    colorsA[i * 6] = colors[ai * 3];
    colorsA[i * 6 + 1] = colors[ai * 3 + 1];
    colorsA[i * 6 + 2] = colors[ai * 3 + 2];
    colorsA[i * 6 + 3] = colors[bi * 3];
    colorsA[i * 6 + 4] = colors[bi * 3 + 1];
    colorsA[i * 6 + 5] = colors[bi * 3 + 2];

    colorsB[i * 6] = colors[bi * 3];
    colorsB[i * 6 + 1] = colors[bi * 3 + 1];
    colorsB[i * 6 + 2] = colors[bi * 3 + 2];
    colorsB[i * 6 + 3] = colors[ai * 3];
    colorsB[i * 6 + 4] = colors[ai * 3 + 1];
    colorsB[i * 6 + 5] = colors[ai * 3 + 2];

    alphas[i * 2] = conn.alpha;
    alphas[i * 2 + 1] = conn.alpha;
  }

  console.log(`[WireConnections] Built ${lineCount} connections (edge pass + sparse ambient)`);

  return { positions, colorsA, colorsB, alphas, lineCount };
}
