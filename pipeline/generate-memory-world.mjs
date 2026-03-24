#!/usr/bin/env node

/**
 * generate-memory-world.mjs
 *
 * Generates a 3D world asset from a memory scene's source photo.
 *
 * Usage:
 *   node pipeline/generate-memory-world.mjs syros-cave
 *   node pipeline/generate-memory-world.mjs syros-cave --generator trellis
 *   node pipeline/generate-memory-world.mjs syros-cave --generator sharp
 *   node pipeline/generate-memory-world.mjs syros-cave --generator marble
 *
 * Pipeline:
 *   1. Read meta.json from public/memory/{scene-id}/
 *   2. Validate source photo exists
 *   3. Run generator (TRELLIS, SHARP, or Marble API)
 *   4. Post-process output (convert formats, optimize)
 *   5. Write world assets to public/memory/{scene-id}/world/
 *   6. Update meta.json with world asset info
 *
 * Asset contract:
 *   public/memory/{scene-id}/world/
 *     scene.ply     — Gaussian splat (PLY format, standard)
 *     scene.spz     — Gaussian splat (SPZ compressed, optional)
 *     scene.glb     — Triangulated mesh fallback (optional)
 *     bounds.json   — Axis-aligned bounding box + center
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEMORY_ROOT = join(ROOT, 'public', 'memory');

// ---------------------------------------------------------------------------
// Generator registry
// Each generator stub prints setup instructions and returns null.
// Real implementations replace the run() body only — interface stays the same.
// ---------------------------------------------------------------------------

const GENERATORS = {
  trellis: {
    name: 'TRELLIS',
    description: 'Microsoft TRELLIS — MIT licensed, image → Gaussian splat + mesh',
    requirements: 'Python 3.10+, CUDA GPU, trellis package',
    outputFormats: ['.ply', '.glb'],
    /**
     * @param {string} inputPhoto  Absolute path to source image
     * @param {string} outputDir   Absolute path to world/ output directory
     * @param {object} options     { sceneId, meta }
     * @returns {object|null}      Asset manifest or null on failure/stub
     */
    run: async (inputPhoto, outputDir, options) => {
      console.log('\n[TRELLIS] Generation stub — not yet wired up.');
      console.log('[TRELLIS] To set up:');
      console.log('  1. Install: pip install git+https://github.com/microsoft/TRELLIS.git');
      console.log('  2. Download model: huggingface-cli download microsoft/TRELLIS-image-large');
      console.log('  3. Run inference:');
      console.log(`       python -m trellis.generate \\`);
      console.log(`         --image "${inputPhoto}" \\`);
      console.log(`         --output "${outputDir}" \\`);
      console.log(`         --format ply glb`);
      console.log('[TRELLIS] Then re-run this script — it will detect the output and update meta.json.\n');
      return null;
    },
  },

  sharp: {
    name: 'SHARP',
    description: 'Apple SHARP — single image → Gaussian splat scene (research)',
    requirements: 'Python 3.10+, CUDA GPU, ml-sharp repo',
    outputFormats: ['.ply'],
    run: async (inputPhoto, outputDir, options) => {
      console.log('\n[SHARP] Generation stub — not yet wired up.');
      console.log('[SHARP] To set up:');
      console.log('  1. Clone: git clone https://github.com/apple/ml-sharp');
      console.log('  2. Install: pip install -r ml-sharp/requirements.txt');
      console.log('  3. Run inference:');
      console.log(`       python ml-sharp/inference.py \\`);
      console.log(`         --image "${inputPhoto}" \\`);
      console.log(`         --output "${outputDir}/scene.ply"`);
      console.log('[SHARP] Then re-run this script — it will detect the output and update meta.json.\n');
      return null;
    },
  },

  marble: {
    name: 'Marble (World Labs)',
    description: 'World Labs Marble API — commercial, highest quality, SPZ output',
    requirements: 'API key from worldlabs.ai, MARBLE_API_KEY env var',
    outputFormats: ['.spz', '.ply', '.glb'],
    run: async (inputPhoto, outputDir, options) => {
      const apiKey = process.env.MARBLE_API_KEY;
      console.log('\n[Marble] API integration stub — not yet wired up.');
      if (!apiKey) {
        console.log('[Marble] Missing: MARBLE_API_KEY environment variable');
      }
      console.log('[Marble] To set up:');
      console.log('  1. Get API key from https://worldlabs.ai');
      console.log('  2. export MARBLE_API_KEY=your_key_here');
      console.log('  3. Implement: POST https://api.worldlabs.ai/v1/worlds');
      console.log('     Body: { image: base64(inputPhoto), format: ["spz", "ply", "glb"] }');
      console.log('     Poll job status until complete, download assets to outputDir');
      console.log('[Marble] Then re-run this script — it will detect the output and update meta.json.\n');
      return null;
    },
  },
};

const DEFAULT_GENERATOR = 'trellis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const sceneId = args.find(a => !a.startsWith('--'));
  const genFlag = args.indexOf('--generator');
  const generator = genFlag !== -1 ? args[genFlag + 1] : DEFAULT_GENERATOR;
  return { sceneId, generator };
}

function readMeta(sceneDir) {
  const metaPath = join(sceneDir, 'meta.json');
  if (!existsSync(metaPath)) {
    throw new Error(`meta.json not found at: ${metaPath}`);
  }
  return { meta: JSON.parse(readFileSync(metaPath, 'utf8')), metaPath };
}

function writeMeta(metaPath, meta) {
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

/** Detect which world assets already exist in the world/ dir. */
function detectExistingAssets(worldDir) {
  const candidates = {
    splat: ['scene.ply', 'scene.spz'],
    mesh: ['scene.glb'],
    collider: ['collider.glb'],
    bounds: 'bounds.json',
  };
  const found = { splat: null, mesh: null, collider: null, bounds: null, format: null };

  for (const [key, names] of Object.entries(candidates)) {
    if (key === 'bounds') continue;
    const files = Array.isArray(names) ? names : [names];
    for (const f of files) {
      if (existsSync(join(worldDir, f))) {
        found[key] = f;
        if (key === 'splat') found.format = f.endsWith('.spz') ? 'spz' : 'ply';
        break;
      }
    }
  }
  if (existsSync(join(worldDir, 'bounds.json'))) {
    found.bounds = JSON.parse(readFileSync(join(worldDir, 'bounds.json'), 'utf8'));
  }
  return found;
}

function updateMetaWithAssets(meta, assets) {
  meta.source.generator = meta.source.generator || 'external';
  meta.source.generated = meta.source.generated || new Date().toISOString().split('T')[0];
  meta.world = {
    splat: assets.splat,
    mesh: assets.mesh,
    collider: assets.collider,
    format: assets.format,
    splatCount: null,       // TODO: parse from PLY header
    bounds: assets.bounds,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { sceneId, generator: generatorKey } = parseArgs();

  // Usage guard
  if (!sceneId) {
    console.log('Usage: node pipeline/generate-memory-world.mjs <scene-id> [--generator trellis|sharp|marble]');
    console.log('\nAvailable generators:');
    for (const [key, g] of Object.entries(GENERATORS)) {
      console.log(`  ${key.padEnd(8)} — ${g.description}`);
    }
    process.exit(1);
  }

  // Generator guard
  const generator = GENERATORS[generatorKey];
  if (!generator) {
    console.error(`Unknown generator: "${generatorKey}". Choose from: ${Object.keys(GENERATORS).join(', ')}`);
    process.exit(1);
  }

  const sceneDir = join(MEMORY_ROOT, sceneId);
  if (!existsSync(sceneDir)) {
    console.error(`Scene directory not found: ${sceneDir}`);
    process.exit(1);
  }

  // 1. Read meta.json
  const { meta, metaPath } = readMeta(sceneDir);
  console.log(`\nScene: ${meta.title} (${sceneId})`);
  console.log(`Generator: ${generator.name}`);

  // 2. Validate source photo
  const photoPath = join(sceneDir, meta.source.photo);
  if (!existsSync(photoPath)) {
    console.error(`Source photo not found: ${photoPath}`);
    process.exit(1);
  }
  console.log(`Source photo: ${meta.source.photo} ✓`);

  // 3. Ensure world/ output dir
  const worldDir = join(sceneDir, 'world');
  if (!existsSync(worldDir)) {
    mkdirSync(worldDir, { recursive: true });
    console.log(`Created: ${worldDir}`);
  }

  // 4. Check for existing assets (generated externally or by a previous run)
  const existingAssets = detectExistingAssets(worldDir);
  if (existingAssets.splat) {
    console.log(`\nExisting world assets detected in world/:`);
    console.log(`  splat:    ${existingAssets.splat}`);
    if (existingAssets.mesh) console.log(`  mesh:     ${existingAssets.mesh}`);
    if (existingAssets.collider) console.log(`  collider: ${existingAssets.collider}`);
    console.log('\nUpdating meta.json with detected assets...');
    updateMetaWithAssets(meta, existingAssets);
    writeMeta(metaPath, meta);
    console.log(`meta.json updated. World is ready.\n`);
    process.exit(0);
  }

  // 5. Run generator (stub — returns null until implemented)
  const result = await generator.run(photoPath, worldDir, { sceneId, meta });

  // 6. If generator produced output, update meta.json
  if (result) {
    updateMetaWithAssets(meta, result);
    writeMeta(metaPath, meta);
    console.log('\nmeta.json updated with new world assets.');
    console.log(`Output: ${worldDir}\n`);
  } else {
    console.log('No assets generated yet. Set up the generator above, then re-run this script.');
    console.log(`\nOr place assets manually in: ${worldDir}`);
    console.log('  world/scene.ply   — Gaussian splat');
    console.log('  world/scene.glb   — Mesh fallback (optional)');
    console.log('  world/bounds.json — { min:[x,y,z], max:[x,y,z], center:[x,y,z] } (optional)');
    console.log('\nThen re-run: node pipeline/generate-memory-world.mjs', sceneId, '\n');
  }
}

main().catch(err => {
  console.error('\nPipeline error:', err.message);
  process.exit(1);
});
