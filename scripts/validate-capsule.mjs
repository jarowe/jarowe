// Usage: node scripts/validate-capsule.mjs <scene-id>
//
// Validates a memory capsule asset folder at public/memory/{scene-id}/.
// Checks: file existence, total size budget, dimension match, depth grayscale.
// Exit code: 0 if all pass, 1 if any fail.

import { readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ── CLI argument ────────────────────────────────────────────────────────────
const sceneId = process.argv[2];
if (!sceneId) {
  console.error('\x1b[31m✗ Usage: node scripts/validate-capsule.mjs <scene-id>\x1b[0m');
  process.exit(1);
}

const baseDir = resolve(process.cwd(), 'public', 'memory', sceneId);

// ── Helpers ─────────────────────────────────────────────────────────────────
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let failures = 0;

function pass(msg) {
  console.log(`  ${PASS} ${msg}`);
}

function fail(msg) {
  console.log(`  ${FAIL} ${msg}`);
  failures++;
}

function warn(msg) {
  console.log(`  ${WARN} ${msg}`);
}

function getPngDimensions(filepath) {
  const buf = readFileSync(filepath);
  // PNG IHDR: width at offset 16 (4 bytes BE), height at offset 20 (4 bytes BE)
  if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error('Not a valid PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function getPngColorType(filepath) {
  const buf = readFileSync(filepath);
  // Color type byte at offset 25 in PNG IHDR
  return buf[25]; // 0 = grayscale, 2 = RGB, 4 = grayscale+alpha, 6 = RGBA
}

// ── Validation ──────────────────────────────────────────────────────────────
console.log(`\nValidating capsule: \x1b[36m${sceneId}\x1b[0m`);
console.log(`  Folder: ${baseDir}\n`);

// 1. Check folder exists
if (!existsSync(baseDir)) {
  fail(`Folder does not exist: ${baseDir}`);
  process.exit(1);
}

// 2. Check required files exist and have size > 0
// Accept either photo.png or photo.webp (context D-14: WebP for photo, PNG for depth)
const photoFile = existsSync(join(baseDir, 'photo.webp')) ? 'photo.webp' : 'photo.png';
const requiredFiles = [photoFile, 'depth.png', 'preview.jpg'];
const fileSizes = {};

for (const filename of requiredFiles) {
  const filepath = join(baseDir, filename);
  if (!existsSync(filepath)) {
    fail(`${filename} does not exist`);
    continue;
  }
  const stat = statSync(filepath);
  if (stat.size === 0) {
    fail(`${filename} is empty (0 bytes)`);
    continue;
  }
  fileSizes[filename] = stat.size;
  pass(`${filename} exists (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 3. Total size budget: < 512000 bytes (500KB)
const totalSize = Object.values(fileSizes).reduce((sum, s) => sum + s, 0);
const totalKB = (totalSize / 1024).toFixed(1);
if (totalSize < 512000) {
  pass(`Total size: ${totalKB} KB (under 500 KB limit)`);
} else {
  fail(`Total size: ${totalKB} KB (exceeds 500 KB limit of 512000 bytes)`);
}

// 4. Dimension match between photo and depth
if (fileSizes['photo.png'] && fileSizes['depth.png']) {
  try {
    const photoDims = getPngDimensions(join(baseDir, 'photo.png'));
    const depthDims = getPngDimensions(join(baseDir, 'depth.png'));

    console.log(`\n  Photo dimensions:  ${photoDims.width} x ${photoDims.height}`);
    console.log(`  Depth dimensions:  ${depthDims.width} x ${depthDims.height}`);

    if (photoDims.width === depthDims.width && photoDims.height === depthDims.height) {
      pass('Depth dimensions match photo dimensions');
    } else {
      fail(`Depth dimensions (${depthDims.width}x${depthDims.height}) do not match photo (${photoDims.width}x${photoDims.height})`);
    }
  } catch (err) {
    fail(`Failed to read PNG dimensions: ${err.message}`);
  }
}

// 5. Depth map grayscale check
if (fileSizes['depth.png']) {
  try {
    const colorType = getPngColorType(join(baseDir, 'depth.png'));
    const colorTypeNames = { 0: 'grayscale', 2: 'RGB', 4: 'grayscale+alpha', 6: 'RGBA' };
    const typeName = colorTypeNames[colorType] || `unknown (${colorType})`;

    if (colorType === 0) {
      pass(`Depth map is grayscale (color type: ${typeName})`);
    } else {
      warn(`Depth map is ${typeName} (not grayscale) — may work if R=G=B`);
    }
  } catch (err) {
    fail(`Failed to read depth PNG color type: ${err.message}`);
  }
}

// ── Result ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log(`\x1b[32m  All checks passed.\x1b[0m\n`);
  process.exit(0);
} else {
  console.log(`\x1b[31m  ${failures} check(s) failed.\x1b[0m\n`);
  process.exit(1);
}
