/**
 * Particle Memory — CPU-side Sampling Pipeline
 *
 * Loads photo + depth map as HTMLImageElement, draws to offscreen canvas,
 * reads pixel data, and outputs Float32Arrays for the particle field.
 * Two-pass sampling: uniform grid + Sobel edge boost.
 */

/**
 * Load an image and return its pixel data via offscreen canvas.
 */
async function loadImageData(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { imageData: ctx.getImageData(0, 0, img.width, img.height), width: img.width, height: img.height };
}

/**
 * Compute Sobel edge magnitude for a depth map's R channel.
 * Returns Uint8Array of magnitudes (0-255 range, clamped).
 */
function computeSobelMagnitude(depthData, width, height) {
  const magnitudes = new Uint8Array(width * height);
  const data = depthData.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // 3x3 Sobel on R channel
      const tl = data[((y - 1) * width + (x - 1)) * 4];
      const tc = data[((y - 1) * width + x) * 4];
      const tr = data[((y - 1) * width + (x + 1)) * 4];
      const ml = data[(y * width + (x - 1)) * 4];
      const mr = data[(y * width + (x + 1)) * 4];
      const bl = data[((y + 1) * width + (x - 1)) * 4];
      const bc = data[((y + 1) * width + x) * 4];
      const br = data[((y + 1) * width + (x + 1)) * 4];

      const gx = (-tl + tr - 2 * ml + 2 * mr - bl + br);
      const gy = (-tl - 2 * tc - tr + bl + 2 * bc + br);
      const magnitude = Math.min(255, Math.abs(gx) + Math.abs(gy));
      magnitudes[y * width + x] = magnitude;
    }
  }
  return magnitudes;
}

/**
 * Sample particles from photo + depth map.
 *
 * @param {string} photoUrl - URL to the photo image
 * @param {string} depthMapUrl - URL to the depth map image
 * @param {object} config - particleConfig from scene registry
 * @returns {Promise<{photoPositions, scatteredPositions, colors, sizes, depthValues, phases, isEdgeFlags, count}>}
 */
export async function sampleParticles(photoUrl, depthMapUrl, config) {
  // Load images
  const [photoResult, depthResult] = await Promise.all([
    loadImageData(photoUrl),
    loadImageData(depthMapUrl),
  ]);

  const { imageData: photoData, width, height } = photoResult;
  const { imageData: depthData } = depthResult;

  // Validate dimensions match
  if (depthResult.width !== width || depthResult.height !== height) {
    console.warn('[ParticleSampler] Dimension mismatch: photo', width, 'x', height, 'depth', depthResult.width, 'x', depthResult.height);
  }

  const aspect = width / height;
  const totalPixels = width * height;

  // --- Grid pass ---
  const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / config.gridParticleCount)));
  const gridParticles = [];

  for (let py = 0; py < height; py += stride) {
    for (let px = 0; px < width; px += stride) {
      const idx = (py * width + px) * 4;
      const r = photoData.data[idx] / 255;
      const g = photoData.data[idx + 1] / 255;
      const b = photoData.data[idx + 2] / 255;
      const depth = depthData.data[(py * width + px) * 4] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const x = (px / width - 0.5) * aspect;
      const y = (1.0 - py / height - 0.5);
      const z = depth * (config.depthScale || 0.35);
      const size = (config.baseSize || 2.5) + lum * (config.sizeVariation || 1.5) * 0.5 + (1.0 - depth) * (config.sizeVariation || 1.5) * 0.5;

      gridParticles.push({ x, y, z, r, g, b, size, depth, phase: Math.random() * Math.PI * 2 });
    }
  }

  // --- Edge-boost pass ---
  let edgeParticles = [];
  if (config.edgeBoostEnabled) {
    const magnitudes = computeSobelMagnitude(depthData, width, height);
    const candidates = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (magnitudes[y * width + x] > (config.sobelThreshold || 40)) {
          candidates.push({ px: x, py: y });
        }
      }
    }

    // Tile density cap: 8x8 tiles
    const tilesX = Math.ceil(width / 8);
    const tilesY = Math.ceil(height / 8);
    const maxPerTile = Math.ceil((config.edgeBoostCount || 70000) / (tilesX * tilesY) * 4);
    const tileCounts = new Map();

    const edgeTarget = config.edgeBoostCount || 70000;
    const candidateStride = Math.max(1, Math.floor(candidates.length / edgeTarget));

    for (let ci = 0; ci < candidates.length && edgeParticles.length < edgeTarget; ci += candidateStride) {
      const { px, py } = candidates[ci];
      const tileKey = `${Math.floor(px / 8)},${Math.floor(py / 8)}`;
      const tileCount = tileCounts.get(tileKey) || 0;
      if (tileCount >= maxPerTile) continue;
      tileCounts.set(tileKey, tileCount + 1);

      const idx = (py * width + px) * 4;
      const r = photoData.data[idx] / 255;
      const g = photoData.data[idx + 1] / 255;
      const b = photoData.data[idx + 2] / 255;
      const depth = depthData.data[(py * width + px) * 4] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const x = (px / width - 0.5) * aspect;
      const y = (1.0 - py / height - 0.5);
      const z = depth * (config.depthScale || 0.35);
      const size = (config.baseSize || 2.5) + lum * (config.sizeVariation || 1.5) * 0.5 + (1.0 - depth) * (config.sizeVariation || 1.5) * 0.5;

      edgeParticles.push({ x, y, z, r, g, b, size, depth, phase: Math.random() * Math.PI * 2 });
    }
  }

  // --- Concatenate ---
  const allParticles = [...gridParticles, ...edgeParticles];
  const count = allParticles.length;

  const photoPositions = new Float32Array(count * 3);
  const scatteredPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const depthValues = new Float32Array(count);
  const phases = new Float32Array(count);
  const isEdgeFlags = new Float32Array(count); // 1.0 = edge-boost, 0.0 = grid

  const golden = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const p = allParticles[i];
    photoPositions[i * 3] = p.x;
    photoPositions[i * 3 + 1] = p.y;
    photoPositions[i * 3 + 2] = p.z;

    colors[i * 3] = p.r;
    colors[i * 3 + 1] = p.g;
    colors[i * 3 + 2] = p.b;

    sizes[i] = p.size;
    depthValues[i] = p.depth;
    phases[i] = p.phase;
    isEdgeFlags[i] = i >= gridParticles.length ? 1.0 : 0.0;

    // Scattered positions: deterministic spherical distribution (INTEG-02)
    const theta = 2 * Math.PI * i * golden;
    const phi = Math.acos(1 - 2 * ((i * 0.61803398875) % 1));
    const scatterR = (config.scatteredRadius || 3.5) * (0.4 + 0.6 * Math.cbrt(((i * 7.31) % 1)));
    scatteredPositions[i * 3] = scatterR * Math.sin(phi) * Math.cos(theta);
    scatteredPositions[i * 3 + 1] = scatterR * Math.sin(phi) * Math.sin(theta);
    scatteredPositions[i * 3 + 2] = scatterR * Math.cos(phi);
  }

  console.log(`[ParticleSampler] Grid: ${gridParticles.length}, Edge boost: ${edgeParticles.length}, Total: ${count}`);

  return { photoPositions, scatteredPositions, colors, sizes, depthValues, phases, isEdgeFlags, count };
}
