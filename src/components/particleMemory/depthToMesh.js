/**
 * depthToMesh.js — Create 3D BufferGeometry from a photo + depth map
 *
 * Loads photo.webp and depth.png as images, builds a PlaneGeometry with
 * vertices displaced by depth values to produce real 3D topology.
 * Vertex colors are sampled from the photo at each UV.
 *
 * Output: BufferGeometry with position, color, uv, and normal attributes
 * that can be fed to meshToPoints.samplePointsFromMesh().
 */

import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

/**
 * Load an image and return its pixel data via a canvas.
 * @param {string} url
 * @returns {Promise<{ width: number, height: number, data: Uint8ClampedArray }>}
 */
function loadImageData(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      resolve({ width: w, height: h, data: imageData.data });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Build a 3D BufferGeometry from photo + depth map.
 *
 * @param {string} photoUrl  — path to photo image (relative or absolute)
 * @param {string} depthUrl  — path to depth map image (relative or absolute)
 * @param {Object} [options]
 * @param {number} [options.maxSegments=256]  — max segments per axis (for performance)
 * @param {number} [options.depthScale=2.0]   — z-displacement range (0 to depthScale)
 * @param {number} [options.planeWidth=4.0]   — width of the plane in world units
 * @param {number} [options.planeHeight]      — height (auto from aspect ratio if omitted)
 * @returns {Promise<{ geometry: THREE.BufferGeometry, photoTexture: THREE.Texture }>}
 */
export async function buildMeshFromDepth(photoUrl, depthUrl, options = {}) {
  const {
    maxSegments = 256,
    depthScale = 2.0,
    planeWidth = 4.0,
    planeHeight = null,
  } = options;

  const resolvedPhoto = resolveAsset(photoUrl);
  const resolvedDepth = resolveAsset(depthUrl);

  // Load both images in parallel
  const [photoData, depthData] = await Promise.all([
    loadImageData(resolvedPhoto),
    loadImageData(resolvedDepth),
  ]);

  // Determine segment counts — use photo dimensions but cap for performance
  const aspect = photoData.width / photoData.height;
  const segX = Math.min(photoData.width, maxSegments);
  const segY = Math.min(photoData.height, maxSegments);
  const pWidth = planeWidth;
  const pHeight = planeHeight ?? (planeWidth / aspect);

  // Create PlaneGeometry — segments = subdivisions (vertices = segments + 1)
  const geometry = new THREE.PlaneGeometry(pWidth, pHeight, segX, segY);

  const posAttr = geometry.getAttribute('position');
  const uvAttr = geometry.getAttribute('uv');
  const vertCount = posAttr.count;

  // Add vertex colors attribute
  const colors = new Float32Array(vertCount * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const inv255 = 1.0 / 255.0;

  for (let i = 0; i < vertCount; i++) {
    // Get UV for this vertex
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);

    // Sample depth map at this UV (depth images are top-down, UV v=0 is bottom)
    const depthPx = Math.min(Math.floor(u * depthData.width), depthData.width - 1);
    const depthPy = Math.min(Math.floor((1 - v) * depthData.height), depthData.height - 1);
    const depthIdx = (depthPy * depthData.width + depthPx) * 4;
    const depthValue = depthData.data[depthIdx] * inv255; // 0-1 range

    // Displace Z — depth 1 (bright) = near/forward, depth 0 (dark) = far/back
    const z = depthValue * depthScale;
    posAttr.setZ(i, z);

    // Sample photo color at this UV
    const photoPx = Math.min(Math.floor(u * photoData.width), photoData.width - 1);
    const photoPy = Math.min(Math.floor((1 - v) * photoData.height), photoData.height - 1);
    const photoIdx = (photoPy * photoData.width + photoPx) * 4;

    colors[i * 3]     = photoData.data[photoIdx]     * inv255;
    colors[i * 3 + 1] = photoData.data[photoIdx + 1] * inv255;
    colors[i * 3 + 2] = photoData.data[photoIdx + 2] * inv255;
  }

  // Recompute normals for proper lighting / surface sampling
  geometry.computeVertexNormals();
  posAttr.needsUpdate = true;

  // Create a THREE.Texture from the photo for optional use by meshToPoints
  const photoTexture = await loadPhotoTexture(resolvedPhoto);

  return { geometry, photoTexture };
}

/**
 * Load a photo as a THREE.Texture (for color sampling in meshToPoints).
 * @param {string} url
 * @returns {Promise<THREE.Texture>}
 */
function loadPhotoTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      (err) => reject(new Error(`Failed to load texture: ${url}`)),
    );
  });
}

export default buildMeshFromDepth;
