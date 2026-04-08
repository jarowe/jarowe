// meshToPoints.js — Sample N points uniformly on a mesh surface
// Ported from Amina's mesh-to-points.ts to plain JS for jarowe.
//
// Two modes:
//   1. Surface sampling: triangle-area-weighted random sampling (default)
//   2. Vertex sampling: use existing vertices with optional jitter
//
// Output is always centered at origin and normalized to fit within a
// bounding sphere of configurable radius.
//
// Supports optional color sampling: vertex colors or UV-mapped texture.

import * as THREE from 'three';

// ── Seeded PRNG (Mulberry32) ─────────────────────────────────
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
 * Sample N points from a BufferGeometry, normalize to a bounding sphere,
 * and center at origin. Optionally samples colors from vertex colors or a texture.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {Object} options
 * @param {number} options.count          — number of points to sample
 * @param {number} options.radius         — bounding sphere radius to normalize into
 * @param {'surface'|'vertex'} [options.mode='surface'] — sampling mode
 * @param {number} [options.jitter=0]     — jitter amount (fraction of radius) for vertex mode
 * @param {number} [options.seed=42]      — random seed for reproducibility
 * @param {THREE.Texture|null} [options.colorTexture=null] — if provided, sample colors from this texture via UVs
 * @param {number} [options.normalExtrusion=0] — shell thickness along interpolated normals
 * @param {number} [options.lateralJitter=0] — tangent jitter for smoke-like volume around the surface
 * @returns {{ positions: Float32Array, colors: Float32Array }}
 *   positions: flat [x,y,z,...], colors: flat [r,g,b,...] per point (0-1 range)
 */
export function samplePointsFromMesh(geometry, options) {
  const {
    count,
    radius,
    mode = 'surface',
    jitter = 0,
    seed = 42,
    colorTexture = null,
    normalExtrusion = 0,
    lateralJitter = 0,
  } = options;
  const rand = mulberry32(seed);

  let rawPoints;
  let rawUVs = null;   // Float32Array of [u,v,...] per sampled point (for texture color)
  let rawBary = null;  // barycentric data for vertex-color interpolation
  let rawNormals = null;

  if (mode === 'vertex') {
    const result = sampleFromVertices(geometry, count, jitter, rand);
    rawPoints = result.positions;
    rawUVs = result.uvs;
    rawBary = result.vertexIndices; // indices into vertex buffer for color lookup
    rawNormals = result.normals;
  } else {
    const result = sampleFromSurface(geometry, count, rand);
    rawPoints = result.positions;
    rawUVs = result.uvs;
    rawBary = result.baryData;
    rawNormals = result.normals;
  }

  // Center at origin
  centerPoints(rawPoints);

  // Normalize to bounding sphere
  normalizeToSphere(rawPoints, radius);

  // Add volume around the sampled surface so the memory reads as a 3D field,
  // not a single postcard-thin shell.
  if (rawNormals && (normalExtrusion > 0 || lateralJitter > 0)) {
    addVolumeAroundSurface(rawPoints, rawNormals, count, rand, normalExtrusion, lateralJitter);
  }

  // ── Sample colors ──
  const colors = new Float32Array(count * 3);

  if (colorTexture && rawUVs) {
    // Sample from texture at UV coordinates
    sampleColorsFromTexture(colorTexture, rawUVs, count, colors);
  } else if (rawBary && geometry.getAttribute('color')) {
    // Interpolate vertex colors
    sampleColorsFromVertexColors(geometry, rawBary, count, colors, mode);
  } else {
    // Default: white
    for (let i = 0; i < count * 3; i++) {
      colors[i] = 1.0;
    }
  }

  return { positions: rawPoints, colors };
}

// ── Surface sampling (triangle-area-weighted) ────────────────

/**
 * @param {THREE.BufferGeometry} geometry
 * @param {number} count
 * @param {() => number} rand
 * @returns {{ positions: Float32Array, uvs: Float32Array|null, baryData: Array|null, normals: Float32Array|null }}
 */
function sampleFromSurface(geometry, count, rand) {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) throw new Error('Geometry has no position attribute');

  const positions = posAttr.array;
  const index = geometry.index;
  const uvAttr = geometry.getAttribute('uv');
  const colorAttr = geometry.getAttribute('color');
  const normalAttr = geometry.getAttribute('normal');

  // Build triangle list
  const triangles = [];
  if (index) {
    const idx = index.array;
    for (let i = 0; i < idx.length; i += 3) {
      triangles.push([idx[i], idx[i + 1], idx[i + 2]]);
    }
  } else {
    const vertCount = posAttr.count;
    for (let i = 0; i < vertCount; i += 3) {
      triangles.push([i, i + 1, i + 2]);
    }
  }

  if (triangles.length === 0) {
    // Fallback to vertex sampling if no triangles
    return sampleFromVertices(geometry, count, 0, rand);
  }

  // Compute triangle areas for weighted sampling
  const areas = new Float64Array(triangles.length);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  let totalArea = 0;
  for (let i = 0; i < triangles.length; i++) {
    const [ia, ib, ic] = triangles[i];
    vA.fromArray(positions, ia * 3);
    vB.fromArray(positions, ib * 3);
    vC.fromArray(positions, ic * 3);
    ab.subVectors(vB, vA);
    ac.subVectors(vC, vA);
    areas[i] = ab.cross(ac).length() * 0.5;
    totalArea += areas[i];
  }

  // Build cumulative distribution for weighted selection
  const cdf = new Float64Array(triangles.length);
  cdf[0] = areas[0] / totalArea;
  for (let i = 1; i < triangles.length; i++) {
    cdf[i] = cdf[i - 1] + areas[i] / totalArea;
  }

  // Sample points
  const out = new Float32Array(count * 3);
  const uvs = uvAttr ? new Float32Array(count * 2) : null;
  const normals = normalAttr ? new Float32Array(count * 3) : null;
  // Store barycentric data for vertex color interpolation: [triIdx, u, v] per point
  const baryData = colorAttr ? [] : null;

  for (let i = 0; i < count; i++) {
    // Pick a triangle weighted by area
    const r = rand();
    let triIdx = binarySearch(cdf, r);
    if (triIdx >= triangles.length) triIdx = triangles.length - 1;

    const [ia, ib, ic] = triangles[triIdx];
    vA.fromArray(positions, ia * 3);
    vB.fromArray(positions, ib * 3);
    vC.fromArray(positions, ic * 3);

    // Random point in triangle (barycentric)
    let u = rand();
    let v = rand();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    out[i * 3]     = vA.x * w + vB.x * u + vC.x * v;
    out[i * 3 + 1] = vA.y * w + vB.y * u + vC.y * v;
    out[i * 3 + 2] = vA.z * w + vB.z * u + vC.z * v;

    // Interpolate UVs if available
    if (uvAttr && uvs) {
      const uA = uvAttr.getX(ia), vA2 = uvAttr.getY(ia);
      const uB = uvAttr.getX(ib), vB2 = uvAttr.getY(ib);
      const uC = uvAttr.getX(ic), vC2 = uvAttr.getY(ic);
      uvs[i * 2]     = uA * w + uB * u + uC * v;
      uvs[i * 2 + 1] = vA2 * w + vB2 * u + vC2 * v;
    }

    if (normalAttr && normals) {
      const nAx = normalAttr.getX(ia), nAy = normalAttr.getY(ia), nAz = normalAttr.getZ(ia);
      const nBx = normalAttr.getX(ib), nBy = normalAttr.getY(ib), nBz = normalAttr.getZ(ib);
      const nCx = normalAttr.getX(ic), nCy = normalAttr.getY(ic), nCz = normalAttr.getZ(ic);
      let nx = nAx * w + nBx * u + nCx * v;
      let ny = nAy * w + nBy * u + nCy * v;
      let nz = nAz * w + nBz * u + nCz * v;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;
      normals[i * 3] = nx;
      normals[i * 3 + 1] = ny;
      normals[i * 3 + 2] = nz;
    }

    // Store barycentric data for vertex color interpolation
    if (baryData) {
      baryData.push({ triIdx, ia, ib, ic, u, v, w });
    }
  }

  return { positions: out, uvs, baryData, normals };
}

/**
 * @param {Float64Array} cdf
 * @param {number} value
 * @returns {number}
 */
function binarySearch(cdf, value) {
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cdf[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// ── Vertex sampling ──────────────────────────────────────────

/**
 * @param {THREE.BufferGeometry} geometry
 * @param {number} count
 * @param {number} jitter
 * @param {() => number} rand
 * @returns {{ positions: Float32Array, uvs: Float32Array|null, vertexIndices: Uint32Array, normals: Float32Array|null }}
 */
function sampleFromVertices(geometry, count, jitter, rand) {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) throw new Error('Geometry has no position attribute');

  const positions = posAttr.array;
  const vertCount = posAttr.count;
  const uvAttr = geometry.getAttribute('uv');
  const normalAttr = geometry.getAttribute('normal');

  const out = new Float32Array(count * 3);
  const uvs = uvAttr ? new Float32Array(count * 2) : null;
  const vertexIndices = new Uint32Array(count);
  const normals = normalAttr ? new Float32Array(count * 3) : null;

  for (let i = 0; i < count; i++) {
    const vi = Math.floor(rand() * vertCount) % vertCount;
    vertexIndices[i] = vi;

    out[i * 3]     = positions[vi * 3]     + (jitter > 0 ? (rand() - 0.5) * 2 * jitter : 0);
    out[i * 3 + 1] = positions[vi * 3 + 1] + (jitter > 0 ? (rand() - 0.5) * 2 * jitter : 0);
    out[i * 3 + 2] = positions[vi * 3 + 2] + (jitter > 0 ? (rand() - 0.5) * 2 * jitter : 0);

    if (uvAttr && uvs) {
      uvs[i * 2]     = uvAttr.getX(vi);
      uvs[i * 2 + 1] = uvAttr.getY(vi);
    }

    if (normalAttr && normals) {
      normals[i * 3] = normalAttr.getX(vi);
      normals[i * 3 + 1] = normalAttr.getY(vi);
      normals[i * 3 + 2] = normalAttr.getZ(vi);
    }
  }

  return { positions: out, uvs, vertexIndices, normals };
}

function addVolumeAroundSurface(points, normals, count, rand, normalExtrusion, lateralJitter) {
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const alt = new THREE.Vector3(1, 0, 0);

  for (let i = 0; i < count; i++) {
    const base = i * 3;
    const nx = normals[base];
    const ny = normals[base + 1];
    const nz = normals[base + 2];

    // Shell thickness concentrated near the surface with a little asymmetry
    const shellOffset = (rand() * 2 - 1) * normalExtrusion * (0.35 + rand() * 0.65);
    points[base] += nx * shellOffset;
    points[base + 1] += ny * shellOffset;
    points[base + 2] += nz * shellOffset;

    if (lateralJitter > 0) {
      tangent.set(nx, ny, nz).cross(Math.abs(ny) < 0.9 ? up : alt);
      if (tangent.lengthSq() < 1e-5) tangent.set(1, 0, 0);
      tangent.normalize();
      bitangent.crossVectors(new THREE.Vector3(nx, ny, nz), tangent).normalize();

      const tx = (rand() * 2 - 1) * lateralJitter;
      const ty = (rand() * 2 - 1) * lateralJitter;

      points[base] += tangent.x * tx + bitangent.x * ty;
      points[base + 1] += tangent.y * tx + bitangent.y * ty;
      points[base + 2] += tangent.z * tx + bitangent.z * ty;
    }
  }
}

// ── Color sampling helpers ───────────────────────────────────

/**
 * Sample colors from a texture using UV coordinates.
 * Reads texture image data via a temporary canvas.
 *
 * @param {THREE.Texture} texture
 * @param {Float32Array} uvs — flat [u, v, ...] per point
 * @param {number} count
 * @param {Float32Array} outColors — flat [r, g, b, ...] per point (written in place)
 */
function sampleColorsFromTexture(texture, uvs, count, outColors) {
  const image = texture.image;
  if (!image) {
    // No image loaded yet — fill white
    for (let i = 0; i < count * 3; i++) outColors[i] = 1.0;
    return;
  }

  // Draw image to a temp canvas to read pixel data
  let width, height, pixelData;

  if (image instanceof ImageData) {
    width = image.width;
    height = image.height;
    pixelData = image.data;
  } else {
    // HTMLImageElement, HTMLCanvasElement, etc.
    const canvas = document.createElement('canvas');
    width = image.width || image.naturalWidth || 256;
    height = image.height || image.naturalHeight || 256;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    pixelData = ctx.getImageData(0, 0, width, height).data;
  }

  const inv255 = 1.0 / 255.0;

  for (let i = 0; i < count; i++) {
    let u = uvs[i * 2];
    let v = uvs[i * 2 + 1];

    // Wrap UVs to [0, 1]
    u = u - Math.floor(u);
    v = v - Math.floor(v);

    // Texture coordinate to pixel (flip Y — textures are bottom-up in GL)
    const px = Math.min(Math.floor(u * width), width - 1);
    const py = Math.min(Math.floor((1 - v) * height), height - 1);
    const idx = (py * width + px) * 4;

    outColors[i * 3]     = pixelData[idx]     * inv255;
    outColors[i * 3 + 1] = pixelData[idx + 1] * inv255;
    outColors[i * 3 + 2] = pixelData[idx + 2] * inv255;
  }
}

/**
 * Interpolate vertex colors using barycentric coordinates (surface mode)
 * or direct vertex lookup (vertex mode).
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {Array|Uint32Array} baryData
 * @param {number} count
 * @param {Float32Array} outColors
 * @param {'surface'|'vertex'} mode
 */
function sampleColorsFromVertexColors(geometry, baryData, count, outColors, mode) {
  const colorAttr = geometry.getAttribute('color');
  if (!colorAttr) return;

  if (mode === 'vertex') {
    // baryData is Uint32Array of vertex indices
    for (let i = 0; i < count; i++) {
      const vi = baryData[i];
      outColors[i * 3]     = colorAttr.getX(vi);
      outColors[i * 3 + 1] = colorAttr.getY(vi);
      outColors[i * 3 + 2] = colorAttr.getZ(vi);
    }
  } else {
    // baryData is array of { ia, ib, ic, u, v, w }
    for (let i = 0; i < count; i++) {
      const { ia, ib, ic, u, v, w } = baryData[i];

      const rA = colorAttr.getX(ia), gA = colorAttr.getY(ia), bA = colorAttr.getZ(ia);
      const rB = colorAttr.getX(ib), gB = colorAttr.getY(ib), bB = colorAttr.getZ(ib);
      const rC = colorAttr.getX(ic), gC = colorAttr.getY(ic), bC = colorAttr.getZ(ic);

      outColors[i * 3]     = rA * w + rB * u + rC * v;
      outColors[i * 3 + 1] = gA * w + gB * u + gC * v;
      outColors[i * 3 + 2] = bA * w + bB * u + bC * v;
    }
  }
}

// ── Normalization helpers ────────────────────────────────────

/**
 * @param {Float32Array} points
 */
function centerPoints(points) {
  const n = points.length / 3;
  if (n === 0) return;

  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += points[i * 3];
    cy += points[i * 3 + 1];
    cz += points[i * 3 + 2];
  }
  cx /= n;
  cy /= n;
  cz /= n;

  for (let i = 0; i < n; i++) {
    points[i * 3]     -= cx;
    points[i * 3 + 1] -= cy;
    points[i * 3 + 2] -= cz;
  }
}

/**
 * @param {Float32Array} points
 * @param {number} targetRadius
 */
function normalizeToSphere(points, targetRadius) {
  const n = points.length / 3;
  if (n === 0) return;

  // Find current bounding sphere radius
  let maxR2 = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i * 3];
    const y = points[i * 3 + 1];
    const z = points[i * 3 + 2];
    const r2 = x * x + y * y + z * z;
    if (r2 > maxR2) maxR2 = r2;
  }

  const currentRadius = Math.sqrt(maxR2);
  if (currentRadius < 1e-10) return; // degenerate

  const scale = targetRadius / currentRadius;
  for (let i = 0; i < points.length; i++) {
    points[i] *= scale;
  }
}
