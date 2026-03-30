#!/usr/bin/env node

/**
 * run_marble_backend.mjs
 *
 * Marble (World Labs) API backend for generate-memory-world.mjs.
 *
 * Generates a 3D world from a single image via the World Labs REST API,
 * downloads the SPZ splat + collider GLB + panorama into the target world dir.
 *
 * Environment:
 *   MARBLE_API_KEY  — required, from https://platform.worldlabs.ai/
 *   MARBLE_MODEL    — optional, default "Marble 0.1-plus" (alt: "Marble 0.1-mini")
 *
 * Usage:
 *   node pipeline/run_marble_backend.mjs \
 *     --input photo.jpg \
 *     --output public/memory/naxos-rock/world \
 *     --scene-id naxos-rock \
 *     --prompt "golden-hour Naxos shoreline" \
 *     --seed 42 \
 *     --splat-tier 500k
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';

const API_BASE = 'https://api.worldlabs.ai/marble/v1';
const DEFAULT_MODEL = 'Marble 0.1-plus';
const POLL_INTERVAL_MS = 8000;
const MAX_POLL_ATTEMPTS = 120; // ~16 minutes max

function getApiKey() {
  const key = process.env.MARBLE_API_KEY;
  if (!key) {
    console.error(
      '[marble] MARBLE_API_KEY is not set.\n'
      + 'Get an API key at https://platform.worldlabs.ai/ and set it:\n'
      + '  set MARBLE_API_KEY=your-key\n'
      + 'Or add it to .env.local as MARBLE_API_KEY=your-key',
    );
    process.exit(2);
  }
  return key;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    input: null,
    output: null,
    sceneId: null,
    prompt: '',
    seed: null,
    splatTier: '500k', // 100k, 500k, or full_res
    model: process.env.MARBLE_MODEL || DEFAULT_MODEL,
    displayName: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input') { parsed.input = args[++i]; continue; }
    if (arg === '--output') { parsed.output = args[++i]; continue; }
    if (arg === '--scene-id') { parsed.sceneId = args[++i]; continue; }
    if (arg === '--prompt') { parsed.prompt = args[++i] || ''; continue; }
    if (arg === '--seed') { parsed.seed = parseInt(args[++i], 10); continue; }
    if (arg === '--splat-tier') { parsed.splatTier = args[++i]; continue; }
    if (arg === '--model') { parsed.model = args[++i]; continue; }
    if (arg === '--name') { parsed.displayName = args[++i]; continue; }
  }

  if (!parsed.input || !parsed.output) {
    console.error('Usage: node pipeline/run_marble_backend.mjs --input <photo> --output <world-dir> [--scene-id <id>] [--prompt <text>] [--seed <n>] [--splat-tier 100k|500k|full_res] [--model "Marble 0.1-plus"|"Marble 0.1-mini"]');
    process.exit(1);
  }

  return parsed;
}

async function apiRequest(path, options = {}) {
  const apiKey = getApiKey();
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'WLT-Api-Key': apiKey,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[marble] API ${response.status} on ${path}: ${body}`);
  }

  return response.json();
}

async function generateWorld({ imageBase64, prompt, seed, model, displayName }) {
  const body = {
    display_name: displayName || `Memory World ${new Date().toISOString()}`,
    model,
    world_prompt: {
      type: 'image',
      image_prompt: {
        source: 'data_base64',
        data_base64: imageBase64,
      },
    },
  };

  if (prompt) {
    body.world_prompt.text_prompt = prompt;
  }
  if (seed != null && Number.isFinite(seed)) {
    body.seed = seed;
  }

  console.log(`[marble] Submitting generation (model: ${model})...`);
  const result = await apiRequest('/worlds:generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result;
}

async function pollOperation(operationId) {
  console.log(`[marble] Polling operation ${operationId}...`);
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const op = await apiRequest(`/operations/${operationId}`);
    if (op.done) {
      console.log('[marble] Generation complete.');
      return op;
    }
    if (attempt % 5 === 0 && attempt > 0) {
      console.log(`[marble] Still generating... (${Math.round(attempt * POLL_INTERVAL_MS / 1000)}s)`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`[marble] Generation timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

async function getWorld(worldId) {
  return apiRequest(`/worlds/${worldId}`);
}

async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[marble] Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
  console.log(`[marble] Downloaded: ${basename(destPath)} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return buffer.length;
}

async function main() {
  const args = parseArgs();
  const inputPath = resolve(args.input);

  if (!existsSync(inputPath)) {
    console.error(`[marble] Input image not found: ${inputPath}`);
    process.exit(3);
  }

  const outputDir = resolve(args.output);
  mkdirSync(outputDir, { recursive: true });

  // Read and encode the image
  const imageBuffer = readFileSync(inputPath);
  const imageBase64 = imageBuffer.toString('base64');
  console.log(`[marble] Input: ${inputPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

  // Generate
  const genResult = await generateWorld({
    imageBase64,
    prompt: args.prompt,
    seed: args.seed,
    model: args.model,
    displayName: args.displayName || `${args.sceneId || 'memory'} — ${new Date().toISOString().split('T')[0]}`,
  });

  // The API returns either an operation to poll or a direct world
  let world;
  if (genResult.operation_id) {
    const doneOp = await pollOperation(genResult.operation_id);
    // The completed operation contains either a world_id or the world directly
    const worldId = doneOp.response?.world_id || doneOp.world_id || doneOp.response?.id;
    if (!worldId) {
      // Try to extract world from the response directly
      world = doneOp.response;
    } else {
      world = await getWorld(worldId);
    }
  } else if (genResult.id) {
    world = genResult;
  } else {
    throw new Error('[marble] Unexpected API response: no operation_id or world id');
  }

  if (!world || !world.assets) {
    throw new Error('[marble] World response missing assets. Full response:\n' + JSON.stringify(world, null, 2));
  }

  // Download assets
  const splatUrls = world.assets?.splats?.spz_urls || {};
  const splatTier = args.splatTier;
  const splatUrl = splatUrls[splatTier] || splatUrls['500k'] || splatUrls['full_res'] || splatUrls['100k'];

  if (!splatUrl) {
    throw new Error('[marble] No splat URLs in world response. Available: ' + JSON.stringify(splatUrls));
  }

  // Download SPZ splat
  await downloadFile(splatUrl, join(outputDir, 'scene.spz'));

  // Also download full_res if we didn't already get it and it's available
  if (splatTier !== 'full_res' && splatUrls['full_res']) {
    await downloadFile(splatUrls['full_res'], join(outputDir, 'scene.source.spz'));
  }

  // Download collider mesh if available
  const colliderUrl = world.assets?.mesh?.collider_mesh_url;
  if (colliderUrl) {
    await downloadFile(colliderUrl, join(outputDir, 'collider.glb'));
  }

  // Download panorama if available
  const panoUrl = world.assets?.imagery?.pano_url;
  if (panoUrl) {
    await downloadFile(panoUrl, join(outputDir, 'scene.pano.png'));
  }

  // Download thumbnail
  const thumbUrl = world.assets?.thumbnail_url;
  if (thumbUrl) {
    await downloadFile(thumbUrl, join(outputDir, 'scene.preview.png'));
  }

  // Write provenance metadata
  const provenance = {
    backend: 'marble',
    model: args.model,
    worldId: world.id,
    splatTier,
    seed: args.seed,
    prompt: args.prompt,
    caption: world.assets?.caption || null,
    generatedAt: new Date().toISOString(),
    sceneId: args.sceneId,
    availableSplatTiers: Object.keys(splatUrls),
    splatUrls,
    colliderUrl: colliderUrl || null,
    panoUrl: panoUrl || null,
  };
  writeFileSync(join(outputDir, 'marble.meta.json'), JSON.stringify(provenance, null, 2));

  console.log(`\n[marble] World generated successfully.`);
  console.log(`  World ID: ${world.id}`);
  console.log(`  Splat tier: ${splatTier}`);
  console.log(`  Caption: ${world.assets?.caption || '(none)'}`);
  console.log(`  Output: ${outputDir}`);

  // Write a success marker for the pipeline
  writeFileSync(join(outputDir, '.marble-done'), world.id || 'done');
}

main().catch(error => {
  console.error(`\n[marble] ${error.message}`);
  process.exit(1);
});
