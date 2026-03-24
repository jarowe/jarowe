/**
 * FBOPlexusLines — GPU-driven plexus connection lines
 *
 * Reads particle positions from an FBO position texture (GPU simulation output)
 * and draws line segments between nearby particles — the classic constellation /
 * network visualization look (After Effects Plexus plugin style).
 *
 * Ported from Amina's PlexusLines.tsx, adapted to:
 * - Read from FBO position DataTexture instead of geometry attributes
 * - Warm white/gold color scheme (jarowe palette)
 * - AdditiveBlending for glow
 * - 8000 max segments budget
 *
 * Performance approach:
 * - Sample every SAMPLE_STRIDE-th particle to keep the search set small
 * - Spatial hash grid for O(n) neighbor finding instead of O(n²)
 * - Hard cap of MAX_SEGMENTS line segments for smooth 60 fps
 * - Update every UPDATE_INTERVAL frames, not every frame
 * - CPU-side texture readback (the FBO is a DataTexture, so .image.data is available)
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_SEGMENTS = 8000;
const UPDATE_INTERVAL = 3;
const SAMPLE_STRIDE = 4;

// Warm white / gold in linear space (jarowe palette)
const DEFAULT_COLOR_R = 1.0;
const DEFAULT_COLOR_G = 0.85;
const DEFAULT_COLOR_B = 0.55;

// ── Spatial hash grid ────────────────────────────────────────────

function cellKey(ix, iy, iz) {
  return `${ix},${iy},${iz}`;
}

function buildGrid(positions, indices, cellSize) {
  const cells = new Map();
  for (const idx of indices) {
    const base = idx * 4; // RGBA texture: 4 floats per pixel
    const ix = Math.floor(positions[base] / cellSize);
    const iy = Math.floor(positions[base + 1] / cellSize);
    const iz = Math.floor(positions[base + 2] / cellSize);
    const key = cellKey(ix, iy, iz);
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(idx);
  }
  return { cells, cellSize };
}

function findPairs(positions, grid, indices, maxDist, maxPairs) {
  const distSq = maxDist * maxDist;
  const pairs = [];
  const distances = [];
  const { cells, cellSize } = grid;

  for (const idxA of indices) {
    if (pairs.length / 2 >= maxPairs) break;

    const baseA = idxA * 4;
    const ax = positions[baseA];
    const ay = positions[baseA + 1];
    const az = positions[baseA + 2];

    // Skip particles at origin / zero (dead or uninitialized)
    if (ax === 0 && ay === 0 && az === 0) continue;

    const cix = Math.floor(ax / cellSize);
    const ciy = Math.floor(ay / cellSize);
    const ciz = Math.floor(az / cellSize);

    // Check 3x3x3 neighborhood
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = cellKey(cix + dx, ciy + dy, ciz + dz);
          const bucket = cells.get(key);
          if (!bucket) continue;

          for (const idxB of bucket) {
            if (idxB <= idxA) continue; // avoid duplicates and self-links

            const baseB = idxB * 4;
            const bx = positions[baseB];
            const by = positions[baseB + 1];
            const bz = positions[baseB + 2];

            const ddx = ax - bx;
            const ddy = ay - by;
            const ddz = az - bz;
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz;

            if (d2 < distSq && d2 > 0.0001) {
              pairs.push(idxA, idxB);
              distances.push(Math.sqrt(d2));

              if (pairs.length / 2 >= maxPairs) return { pairs, distances };
            }
          }
        }
      }
    }
  }

  return { pairs, distances };
}

/**
 * @param {Object} props
 * @param {THREE.DataTexture} props.positionTexture - FBO position output (RGBA Float)
 * @param {number} props.particleCount - total particles in the simulation
 * @param {number} [props.distance=0.5] - max connection distance
 * @param {number} [props.opacity=0.35] - base line opacity
 * @param {string} [props.color] - hex color override (unused if default warm gold is fine)
 */
export default function FBOPlexusLines({
  positionTexture,
  particleCount,
  distance = 0.5,
  opacity = 0.35,
  color,
}) {
  const frameCounter = useRef(0);
  const lastUpdateFrame = useRef(-999);

  // Parse optional color override into linear-space RGB
  const lineColor = useMemo(() => {
    if (!color) return { r: DEFAULT_COLOR_R, g: DEFAULT_COLOR_G, b: DEFAULT_COLOR_B };
    const c = new THREE.Color(color);
    return { r: c.r, g: c.g, b: c.b };
  }, [color]);

  // Pre-compute the sampled particle index list (stable unless count changes)
  const sampledIndices = useMemo(() => {
    const indices = [];
    for (let i = 0; i < particleCount; i += SAMPLE_STRIDE) {
      indices.push(i);
    }
    return indices;
  }, [particleCount]);

  // Pre-allocate line segment geometry with MAX_SEGMENTS capacity
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(MAX_SEGMENTS * 2 * 3);
    const colorArr = new Float32Array(MAX_SEGMENTS * 2 * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 4));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  // Update lines every UPDATE_INTERVAL frames
  useFrame(() => {
    frameCounter.current += 1;
    const frame = frameCounter.current;

    if (Math.abs(frame - lastUpdateFrame.current) < UPDATE_INTERVAL) return;
    if (!positionTexture || !positionTexture.image || !positionTexture.image.data) return;
    if (sampledIndices.length === 0) return;

    lastUpdateFrame.current = frame;

    // Read current positions from the FBO DataTexture
    // DataTexture stores RGBA per pixel, so stride = 4 floats per particle
    const texData = positionTexture.image.data;

    // Build spatial grid
    const grid = buildGrid(texData, sampledIndices, distance);

    // Find pairs
    const { pairs, distances } = findPairs(texData, grid, sampledIndices, distance, MAX_SEGMENTS);

    // Fill line geometry buffers
    const posArr = lineGeometry.getAttribute('position').array;
    const colorArr = lineGeometry.getAttribute('color').array;

    const numPairs = pairs.length / 2;
    const { r, g, b } = lineColor;

    for (let i = 0; i < numPairs; i++) {
      const idxA = pairs[i * 2];
      const idxB = pairs[i * 2 + 1];
      const dist = distances[i];

      // Distance-based opacity falloff: full opacity at 0, fading to 0 at maxDist
      const t = 1.0 - dist / distance;
      const alpha = opacity * t * t; // quadratic falloff for smoother look

      // Vertex A — read from RGBA texture (stride 4)
      const baseA = idxA * 4;
      const v0 = i * 6;
      posArr[v0]     = texData[baseA];
      posArr[v0 + 1] = texData[baseA + 1];
      posArr[v0 + 2] = texData[baseA + 2];

      // Vertex B
      const baseB = idxB * 4;
      posArr[v0 + 3] = texData[baseB];
      posArr[v0 + 4] = texData[baseB + 1];
      posArr[v0 + 5] = texData[baseB + 2];

      // Color A (warm gold with distance-based alpha)
      const c0 = i * 8;
      colorArr[c0]     = r;
      colorArr[c0 + 1] = g;
      colorArr[c0 + 2] = b;
      colorArr[c0 + 3] = alpha;

      // Color B
      colorArr[c0 + 4] = r;
      colorArr[c0 + 5] = g;
      colorArr[c0 + 6] = b;
      colorArr[c0 + 7] = alpha;
    }

    // Zero out remaining buffer space
    const posEnd = numPairs * 6;
    const colEnd = numPairs * 8;
    for (let i = posEnd; i < posArr.length; i++) posArr[i] = 0;
    for (let i = colEnd; i < colorArr.length; i++) colorArr[i] = 0;

    lineGeometry.getAttribute('position').needsUpdate = true;
    lineGeometry.getAttribute('color').needsUpdate = true;
    lineGeometry.setDrawRange(0, numPairs * 2);
  });

  return (
    <lineSegments geometry={lineGeometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
