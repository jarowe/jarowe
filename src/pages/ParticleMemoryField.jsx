/**
 * ParticleMemoryField — Luminous 3D particle field from photo + depth map
 *
 * Phase 14: Particle Field Core
 *
 * CPU-side sampling: loads photo + depth as Image, draws to offscreen canvas,
 * getImageData(), computes Float32Arrays for positions/colors/sizes.
 *
 * Hybrid grid + edge boost: base ~80K UV grid + Sobel edge detection on depth
 * for bonus particles at depth discontinuities.
 *
 * Dual position buffers: aPhotoPosition (formed) + aScatteredPosition (random).
 * uMorphProgress uniform interpolates between them (1.0 = photo, 0.0 = scattered).
 *
 * Wire connections: spatial hash grid, dense at depth edges + sparse ambient KNN.
 * THREE.LineSegments with distance-faded alpha.
 *
 * Tier-adaptive: full (150K + wires + bloom), simplified (50-60K, no wires, no bloom).
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uMorphProgress;
uniform float uBreathAmp;
uniform float uBreathSpeed;

attribute vec3 aPhotoPosition;
attribute vec3 aScatteredPosition;
attribute vec3 aColor;
attribute float aSize;
attribute float aDepth;
attribute float aRandom;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  // Interpolate between scattered and photo-formed positions
  vec3 pos = mix(aScatteredPosition, aPhotoPosition, uMorphProgress);

  // Breathing: depth-correlated wave (foreground breathes first)
  float breathPhase = uTime * uBreathSpeed - aDepth * 3.0 + aRandom * 0.8;
  float breath = sin(breathPhase) * uBreathAmp;

  // Apply breathing as subtle displacement along Z + size modulation
  pos.z += breath * 0.04;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

  // Size: base from sampling + depth perspective + breathing modulation
  float sizeScale = 1.0 + breath * 0.3;
  gl_PointSize = max(aSize * sizeScale * (120.0 / max(-mvPos.z, 0.5)), 0.5);

  // Alpha: depth-based fade + breathing luminance pulse
  float distFade = smoothstep(12.0, 1.0, length(mvPos.xyz));
  float breathAlpha = 1.0 + breath * 0.15;
  vAlpha = distFade * breathAlpha * (0.7 + aRandom * 0.3);

  vColor = aColor;
  vDepth = aDepth;

  gl_Position = projectionMatrix * mvPos;
}
`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  // Distance from center of point sprite
  float d = length(gl_PointCoord - 0.5) * 2.0;

  // Core soft circle
  float core = 1.0 - smoothstep(0.0, 0.7, d);

  // Halo ring — secondary low-alpha glow extending beyond core
  float halo = (1.0 - smoothstep(0.5, 1.0, d)) * 0.25;

  float alpha = (core + halo) * vAlpha;
  if (alpha < 0.005) discard;

  // Slight luminance boost for brighter particles (dream quality)
  vec3 color = vColor * (1.0 + core * 0.15);

  gl_FragColor = vec4(color, alpha);
}
`;

// Wire connection shaders
const WIRE_VERT = /* glsl */ `
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aWireAlpha;

varying vec3 vWireColor;
varying float vWireAlpha;

void main() {
  // Average color of connected particles
  vWireColor = mix(aColorA, aColorB, 0.5);
  vWireAlpha = aWireAlpha;

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPos;
}
`;

const WIRE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uWirePulse;

varying vec3 vWireColor;
varying float vWireAlpha;

void main() {
  // Gentle pulse on wire alpha
  float pulse = 1.0 + sin(uTime * 0.8) * uWirePulse;
  float alpha = vWireAlpha * pulse * 0.4;
  if (alpha < 0.005) discard;

  // Emissive — slightly brighter than particle colors
  vec3 color = vWireColor * 1.2;

  gl_FragColor = vec4(color, alpha);
}
`;

// ---------------------------------------------------------------------------
// Image loading utility
// ---------------------------------------------------------------------------
function loadImageToCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      resolve({ data, width: img.width, height: img.height });
    };
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

// ---------------------------------------------------------------------------
// Sobel edge detection on depth map
// ---------------------------------------------------------------------------
function computeSobelMagnitude(depthData, width, height) {
  const magnitude = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Sobel kernels
      const tl = depthData[(y - 1) * width + (x - 1)] / 255;
      const tc = depthData[(y - 1) * width + x] / 255;
      const tr = depthData[(y - 1) * width + (x + 1)] / 255;
      const ml = depthData[y * width + (x - 1)] / 255;
      const mr = depthData[y * width + (x + 1)] / 255;
      const bl = depthData[(y + 1) * width + (x - 1)] / 255;
      const bc = depthData[(y + 1) * width + x] / 255;
      const br = depthData[(y + 1) * width + (x + 1)] / 255;

      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return magnitude;
}

// ---------------------------------------------------------------------------
// Spatial hash grid for wire connections
// ---------------------------------------------------------------------------
class SpatialHash {
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
// CPU-side particle sampling
// ---------------------------------------------------------------------------
function sampleParticles(photoData, depthData, photoW, photoH, depthW, depthH, tier) {
  const isFullTier = tier === 'full';

  // Grid sampling parameters
  const gridDensity = isFullTier ? 280 : 230; // ~80K full, ~53K simplified
  const stepX = photoW / gridDensity;
  const stepY = photoH / gridDensity;

  // Compute Sobel magnitude on depth for edge boost
  // Depth map may be different resolution — sample at depth resolution
  const depthPixels = new Float32Array(depthW * depthH);
  for (let i = 0; i < depthW * depthH; i++) {
    depthPixels[i] = depthData.data[i * 4]; // red channel
  }
  const sobelMag = computeSobelMagnitude(depthPixels, depthW, depthH);

  // Collect grid particles
  const particles = [];
  const scaleX = 4.0; // world-space width
  const scaleY = (photoH / photoW) * scaleX; // maintain aspect ratio
  const depthScale = 2.0; // Z range from depth

  for (let gy = 0; gy < gridDensity; gy++) {
    for (let gx = 0; gx < gridDensity; gx++) {
      const px = Math.floor(gx * stepX);
      const py = Math.floor(gy * stepY);
      if (px >= photoW || py >= photoH) continue;

      const photoIdx = (py * photoW + px) * 4;
      const r = photoData.data[photoIdx] / 255;
      const g = photoData.data[photoIdx + 1] / 255;
      const b = photoData.data[photoIdx + 2] / 255;
      const a = photoData.data[photoIdx + 3] / 255;
      if (a < 0.1) continue; // skip transparent

      // Sample depth at corresponding UV
      const dx = Math.floor((px / photoW) * depthW);
      const dy = Math.floor((py / photoH) * depthH);
      const depthIdx = dy * depthW + dx;
      const depth = depthPixels[depthIdx] / 255;

      // UV to world position
      const worldX = (px / photoW - 0.5) * scaleX;
      const worldY = -(py / photoH - 0.5) * scaleY; // flip Y
      const worldZ = depth * depthScale;

      // Luminance for size variation
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Size: depth + luminance driven (closer/brighter = larger)
      const baseSize = 0.8;
      const depthFactor = 1.0 + depth * 0.4; // foreground slightly larger
      const lumFactor = 0.85 + lum * 0.35;
      const size = baseSize * depthFactor * lumFactor;

      particles.push({
        x: worldX, y: worldY, z: worldZ,
        r, g, b, size, depth,
        isEdge: false,
      });
    }
  }

  // Edge-boost pass (full tier only)
  if (isFullTier) {
    const edgeThreshold = 0.12; // Sobel gradient threshold
    const edgeStepX = depthW / 400;
    const edgeStepY = depthH / 400;

    for (let ey = 1; ey < depthH - 1; ey += Math.max(1, Math.floor(edgeStepY))) {
      for (let ex = 1; ex < depthW - 1; ex += Math.max(1, Math.floor(edgeStepX))) {
        const sobelIdx = ey * depthW + ex;
        if (sobelMag[sobelIdx] < edgeThreshold) continue;

        // Map depth UV back to photo UV
        const photoU = ex / depthW;
        const photoV = ey / depthH;
        const px = Math.floor(photoU * photoW);
        const py = Math.floor(photoV * photoH);
        if (px >= photoW || py >= photoH) continue;

        const photoIdx = (py * photoW + px) * 4;
        const r = photoData.data[photoIdx] / 255;
        const g = photoData.data[photoIdx + 1] / 255;
        const b = photoData.data[photoIdx + 2] / 255;

        const depth = depthPixels[sobelIdx] / 255;
        const worldX = (photoU - 0.5) * scaleX;
        const worldY = -(photoV - 0.5) * scaleY;
        const worldZ = depth * depthScale;

        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const size = 0.7 * (1.0 + depth * 0.3) * (0.85 + lum * 0.35);

        particles.push({
          x: worldX, y: worldY, z: worldZ,
          r, g, b, size, depth,
          isEdge: true,
        });
      }
    }
  }

  // Build typed arrays
  const count = particles.length;
  const photoPositions = new Float32Array(count * 3);
  const scatteredPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const depths = new Float32Array(count);
  const randoms = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = particles[i];

    // Photo-formed position
    photoPositions[i * 3] = p.x;
    photoPositions[i * 3 + 1] = p.y;
    photoPositions[i * 3 + 2] = p.z;

    // Scattered position: random spherical distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2 + Math.random() * 6;
    scatteredPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    scatteredPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    scatteredPositions[i * 3 + 2] = radius * Math.cos(phi);

    colors[i * 3] = p.r;
    colors[i * 3 + 1] = p.g;
    colors[i * 3 + 2] = p.b;

    sizes[i] = p.size;
    depths[i] = p.depth;
    randoms[i] = Math.random();
  }

  return { photoPositions, scatteredPositions, colors, sizes, depths, randoms, count, particles };
}

// ---------------------------------------------------------------------------
// Wire connection computation
// ---------------------------------------------------------------------------
function computeWireConnections(particles, photoPositions, colors, maxConnections = 10000) {
  const count = particles.length;
  if (count === 0) return null;

  const CELL_SIZE = 0.15;
  const EDGE_DIST_THRESHOLD = 0.2;
  const SPARSE_DIST_THRESHOLD = 0.8;

  const hash = new SpatialHash(CELL_SIZE);
  for (let i = 0; i < count; i++) {
    hash.insert(i, photoPositions[i * 3], photoPositions[i * 3 + 1], photoPositions[i * 3 + 2]);
  }

  const connections = [];
  const connectedSet = new Set();

  // Pass 1: Dense connections at depth edges
  for (let i = 0; i < count && connections.length < maxConnections * 0.7; i++) {
    if (!particles[i].isEdge) continue;

    const ax = photoPositions[i * 3];
    const ay = photoPositions[i * 3 + 1];
    const az = photoPositions[i * 3 + 2];

    const neighbors = hash.getNeighborCells(ax, ay, az);
    let edgeConnections = 0;

    for (const j of neighbors) {
      if (j <= i) continue; // avoid duplicates
      if (edgeConnections >= 3) break; // cap per-particle

      const bx = photoPositions[j * 3];
      const by = photoPositions[j * 3 + 1];
      const bz = photoPositions[j * 3 + 2];

      const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
      if (dist > EDGE_DIST_THRESHOLD) continue;

      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (connectedSet.has(key)) continue;
      connectedSet.add(key);

      // Alpha fades with distance
      const alpha = 1.0 - (dist / EDGE_DIST_THRESHOLD);

      connections.push({ a: i, b: j, alpha });
      edgeConnections++;
    }
  }

  // Pass 2: Sparse ambient connections (non-edge particles, longer range)
  const sparseStep = Math.max(1, Math.floor(count / 3000)); // sample subset
  for (let i = 0; i < count && connections.length < maxConnections; i += sparseStep) {
    if (particles[i].isEdge) continue; // already handled

    const ax = photoPositions[i * 3];
    const ay = photoPositions[i * 3 + 1];
    const az = photoPositions[i * 3 + 2];

    // Find nearest non-self neighbor in extended range
    const extHash = new SpatialHash(SPARSE_DIST_THRESHOLD);
    // Use original hash — check neighbors in wider radius
    let bestJ = -1;
    let bestDist = SPARSE_DIST_THRESHOLD;

    const neighbors = hash.getNeighborCells(ax, ay, az);
    for (const j of neighbors) {
      if (j === i) continue;
      const bx = photoPositions[j * 3];
      const by = photoPositions[j * 3 + 1];
      const bz = photoPositions[j * 3 + 2];
      const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
      if (dist < bestDist && dist > 0.03) {
        bestDist = dist;
        bestJ = j;
      }
    }

    if (bestJ >= 0) {
      const key = i < bestJ ? `${i}-${bestJ}` : `${bestJ}-${i}`;
      if (!connectedSet.has(key)) {
        connectedSet.add(key);
        const alpha = (1.0 - (bestDist / SPARSE_DIST_THRESHOLD)) * 0.5; // softer
        connections.push({ a: i, b: bestJ, alpha });
      }
    }
  }

  if (connections.length === 0) return null;

  // Build LineSegments geometry
  const lineCount = connections.length;
  const positions = new Float32Array(lineCount * 6); // 2 vertices per line, 3 components each
  const colorsA = new Float32Array(lineCount * 6);
  const colorsB = new Float32Array(lineCount * 6);
  const alphas = new Float32Array(lineCount * 2);

  for (let i = 0; i < lineCount; i++) {
    const conn = connections[i];
    const ai = conn.a;
    const bi = conn.b;

    // Positions (will be updated per-frame to follow breathing)
    positions[i * 6] = photoPositions[ai * 3];
    positions[i * 6 + 1] = photoPositions[ai * 3 + 1];
    positions[i * 6 + 2] = photoPositions[ai * 3 + 2];
    positions[i * 6 + 3] = photoPositions[bi * 3];
    positions[i * 6 + 4] = photoPositions[bi * 3 + 1];
    positions[i * 6 + 5] = photoPositions[bi * 3 + 2];

    // Colors
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

  return { positions, colorsA, colorsB, alphas, connections, lineCount };
}

// ---------------------------------------------------------------------------
// React component: ParticleMemoryField
// ---------------------------------------------------------------------------
export default function ParticleMemoryField({ scene, tier, onSamplingComplete }) {
  const [sampledData, setSampledData] = useState(null);
  const pointsRef = useRef(null);
  const linesRef = useRef(null);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uMorphProgress: { value: 1.0 },
    uBreathAmp: { value: 1.0 },
    uBreathSpeed: { value: 1.2 },
  });
  const wireUniformsRef = useRef({
    uTime: { value: 0 },
    uWirePulse: { value: 0.15 },
  });

  const isFullTier = tier === 'full';

  // Load images and sample particles
  useEffect(() => {
    let cancelled = false;

    async function sample() {
      try {
        const photoUrl = resolveAsset(scene.photoUrl);
        const depthUrl = resolveAsset(scene.depthMapUrl);
        if (!photoUrl || !depthUrl) return;

        const [photoResult, depthResult] = await Promise.all([
          loadImageToCanvas(photoUrl),
          loadImageToCanvas(depthUrl),
        ]);

        if (cancelled) return;

        const result = sampleParticles(
          photoResult.data, depthResult.data,
          photoResult.width, photoResult.height,
          depthResult.width, depthResult.height,
          tier,
        );

        // Compute wire connections (full tier only)
        let wireData = null;
        if (isFullTier) {
          wireData = computeWireConnections(
            result.particles, result.photoPositions, result.colors, 10000,
          );
        }

        if (!cancelled) {
          setSampledData({ ...result, wireData });
          if (onSamplingComplete) onSamplingComplete(result.count);
        }
      } catch (err) {
        console.error('[ParticleMemoryField] Sampling failed:', err);
      }
    }

    sample();
    return () => { cancelled = true; };
  }, [scene.photoUrl, scene.depthMapUrl, tier, isFullTier, onSamplingComplete]);

  // Build geometry
  const geometry = useMemo(() => {
    if (!sampledData) return null;

    const geo = new THREE.BufferGeometry();

    // Use photo positions as the rendered position (default morph = 1.0)
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array(sampledData.photoPositions), 3,
    ));
    geo.setAttribute('aPhotoPosition', new THREE.BufferAttribute(
      sampledData.photoPositions, 3,
    ));
    geo.setAttribute('aScatteredPosition', new THREE.BufferAttribute(
      sampledData.scatteredPositions, 3,
    ));
    geo.setAttribute('aColor', new THREE.BufferAttribute(
      sampledData.colors, 3,
    ));
    geo.setAttribute('aSize', new THREE.BufferAttribute(
      sampledData.sizes, 1,
    ));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(
      sampledData.depths, 1,
    ));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(
      sampledData.randoms, 1,
    ));

    return geo;
  }, [sampledData]);

  // Build wire geometry
  const wireGeometry = useMemo(() => {
    if (!sampledData?.wireData) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
      sampledData.wireData.positions, 3,
    ));
    geo.setAttribute('aColorA', new THREE.BufferAttribute(
      sampledData.wireData.colorsA, 3,
    ));
    geo.setAttribute('aColorB', new THREE.BufferAttribute(
      sampledData.wireData.colorsB, 3,
    ));
    geo.setAttribute('aWireAlpha', new THREE.BufferAttribute(
      sampledData.wireData.alphas, 1,
    ));

    return geo;
  }, [sampledData]);

  // Build materials
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const wireMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: wireUniformsRef.current,
      vertexShader: WIRE_VERT,
      fragmentShader: WIRE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniformsRef.current.uTime.value = t;
    wireUniformsRef.current.uTime.value = t;
  });

  if (!geometry) return null;

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={material} />
      {wireGeometry && (
        <lineSegments ref={linesRef} geometry={wireGeometry} material={wireMaterial} />
      )}
    </>
  );
}
