#!/usr/bin/env node

/**
 * generate-memory-world.mjs
 *
 * Generates or registers a 3D world asset from a memory scene's source photo.
 *
 * Usage:
 *   node pipeline/generate-memory-world.mjs syros-cave
 *   node pipeline/generate-memory-world.mjs syros-cave --generator sharp
 *   node pipeline/generate-memory-world.mjs syros-cave --generator trellis
 *   node pipeline/generate-memory-world.mjs syros-cave --generator marble
 *
 * Asset contract:
 *   public/memory/{scene-id}/world/
 *     scene.ply
 *     scene.spz
 *     scene.glb
 *     collider.glb
 *     bounds.json
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEMORY_ROOT = join(ROOT, 'public', 'memory');
const TODAY = new Date().toISOString().split('T')[0];
const LOCAL_SHARP_CLI = join(ROOT, '.venv-sharp', 'Scripts', 'sharp.exe');
const LOCAL_SHARP_CHECKPOINT = join(ROOT, '.models', 'sharp_2572gikvuh.pt');
const MAX_RUNTIME_SPLATS = 300000;

function parseArgs() {
  const args = process.argv.slice(2);
  const sceneId = args.find(arg => !arg.startsWith('--'));
  const generatorIndex = args.indexOf('--generator');
  const generator = generatorIndex !== -1 ? args[generatorIndex + 1] : 'sharp';
  return { sceneId, generator };
}

function readMeta(sceneDir) {
  const metaPath = join(sceneDir, 'meta.json');
  if (!existsSync(metaPath)) {
    throw new Error(`meta.json not found at: ${metaPath}`);
  }
  return { metaPath, meta: JSON.parse(readFileSync(metaPath, 'utf8')) };
}

function writeMeta(metaPath, meta) {
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

function toWorldRelative(filename) {
  return filename ? `world/${filename}` : null;
}

const PLY_TYPE_SIZES = {
  char: 1,
  int8: 1,
  uchar: 1,
  uint8: 1,
  short: 2,
  int16: 2,
  ushort: 2,
  uint16: 2,
  int: 4,
  int32: 4,
  uint: 4,
  uint32: 4,
  float: 4,
  float32: 4,
  double: 8,
  float64: 8,
};

function parseBinaryPlyHeader(buffer) {
  const endHeaderLf = buffer.indexOf(Buffer.from('end_header\n'));
  const endHeaderCrLf = buffer.indexOf(Buffer.from('end_header\r\n'));
  const headerEnd =
    endHeaderLf !== -1
      ? endHeaderLf + 'end_header\n'.length
      : endHeaderCrLf !== -1
        ? endHeaderCrLf + 'end_header\r\n'.length
        : -1;

  if (headerEnd === -1) {
    throw new Error('Could not locate end_header in binary PLY file.');
  }

  const headerText = buffer.subarray(0, headerEnd).toString('ascii');
  const lines = headerText.split(/\r?\n/).filter(Boolean);
  const elements = [];
  let currentElement = null;

  for (const line of lines) {
    if (line.startsWith('element ')) {
      const [, name, countStr] = line.split(/\s+/);
      currentElement = {
        name,
        count: Number.parseInt(countStr, 10),
        properties: [],
      };
      elements.push(currentElement);
    } else if (line.startsWith('property ')) {
      if (!currentElement) continue;
      const tokens = line.split(/\s+/);
      if (tokens[1] === 'list') {
        throw new Error('List properties are not supported in runtime PLY preview generation.');
      }
      const type = tokens[1];
      currentElement.properties.push({ type, size: PLY_TYPE_SIZES[type] });
    }
  }

  const vertexElementIndex = elements.findIndex(element => element.name === 'vertex');
  if (vertexElementIndex === -1) {
    throw new Error('PLY file does not contain a vertex element.');
  }

  const vertexStride = elements[vertexElementIndex].properties.reduce((total, prop) => {
    if (!prop.size) {
      throw new Error(`Unsupported PLY property type: ${prop.type}`);
    }
    return total + prop.size;
  }, 0);

  let vertexOffset = headerEnd;
  for (let index = 0; index < vertexElementIndex; index += 1) {
    const element = elements[index];
    const stride = element.properties.reduce((total, prop) => total + prop.size, 0);
    vertexOffset += element.count * stride;
  }

  return {
    headerText,
    headerEnd,
    elements,
    vertexElementIndex,
    vertexStride,
    vertexCount: elements[vertexElementIndex].count,
    vertexOffset,
  };
}

function createRuntimePreviewPly(sourcePath, outputPath, targetVertexCount = MAX_RUNTIME_SPLATS) {
  const sourceBuffer = readFileSync(sourcePath);
  const {
    headerText,
    vertexStride,
    vertexCount,
    vertexOffset,
  } = parseBinaryPlyHeader(sourceBuffer);

  if (vertexCount <= targetVertexCount) {
    copyFileSync(sourcePath, outputPath);
    return vertexCount;
  }

  const stride = Math.max(1, Math.ceil(vertexCount / targetVertexCount));
  const previewCount = Math.ceil(vertexCount / stride);
  const vertexBlockLength = vertexCount * vertexStride;
  const restOffset = vertexOffset + vertexBlockLength;
  const previewVertices = Buffer.allocUnsafe(previewCount * vertexStride);

  let destOffset = 0;
  for (let index = 0; index < vertexCount; index += stride) {
    const sourceStart = vertexOffset + index * vertexStride;
    sourceBuffer.copy(previewVertices, destOffset, sourceStart, sourceStart + vertexStride);
    destOffset += vertexStride;
  }

  const previewHeader = headerText.replace(
    /element vertex\s+\d+/,
    `element vertex ${previewCount}`,
  );

  const outputBuffer = Buffer.concat([
    Buffer.from(previewHeader, 'ascii'),
    previewVertices.subarray(0, destOffset),
    sourceBuffer.subarray(restOffset),
  ]);

  writeFileSync(outputPath, outputBuffer);
  return previewCount;
}

function parsePlyVertexCount(plyPath) {
  try {
    const header = readFileSync(plyPath, 'utf8').slice(0, 8192);
    const match = header.match(/element vertex\s+(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function normalizeGeneratedWorldAssets(worldDir) {
  const files = readdirSync(worldDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name);

  const promoteFirstMatch = (predicate, targetName) => {
    if (existsSync(join(worldDir, targetName))) return targetName;
    const match = files.find(predicate);
    if (!match) return null;
    renameSync(join(worldDir, match), join(worldDir, targetName));
    return targetName;
  };

  const splatFile =
    promoteFirstMatch(name => name.toLowerCase().endsWith('.spz'), 'scene.spz') ||
    promoteFirstMatch(name => name.toLowerCase().endsWith('.ply'), 'scene.ply');
  const meshFile = promoteFirstMatch(
    name => name.toLowerCase().endsWith('.glb') && name.toLowerCase() !== 'collider.glb',
    'scene.glb',
  );
  const colliderFile = existsSync(join(worldDir, 'collider.glb')) ? 'collider.glb' : null;
  const boundsPath = join(worldDir, 'bounds.json');
  const bounds = existsSync(boundsPath) ? JSON.parse(readFileSync(boundsPath, 'utf8')) : null;

  return {
    splat: toWorldRelative(splatFile),
    mesh: toWorldRelative(meshFile),
    collider: toWorldRelative(colliderFile),
    format: splatFile?.endsWith('.spz') ? 'spz' : splatFile?.endsWith('.ply') ? 'ply' : null,
    splatCount: splatFile?.endsWith('.ply') ? parsePlyVertexCount(join(worldDir, splatFile)) : null,
    bounds,
  };
}

function prepareRuntimeAssets(worldDir, assets) {
  if (assets.format !== 'ply' || !assets.splat) {
    return assets;
  }

  const sourceFile = join(worldDir, assets.splat.replace(/^world\//, ''));
  const sourceCount = assets.splatCount ?? parsePlyVertexCount(sourceFile);
  if (!sourceCount || sourceCount <= MAX_RUNTIME_SPLATS) {
    return assets;
  }

  const runtimeFilename = 'scene.runtime.ply';
  const runtimePath = join(worldDir, runtimeFilename);
  const runtimeCount = createRuntimePreviewPly(sourceFile, runtimePath, MAX_RUNTIME_SPLATS);

  return {
    ...assets,
    splat: toWorldRelative(runtimeFilename),
    sourceSplat: assets.splat,
    splatCount: runtimeCount,
    sourceSplatCount: sourceCount,
  };
}

function detectExistingAssets(worldDir) {
  const normalized = normalizeGeneratedWorldAssets(worldDir);
  return normalized.splat ? normalized : null;
}

function updateMetaWithAssets(meta, assets) {
  meta.source.generator = assets.generator || meta.source.generator || 'external';
  meta.source.generated = assets.generated || meta.source.generated || TODAY;
  meta.world = {
    splat: assets.splat,
    sourceSplat: assets.sourceSplat ?? null,
    mesh: assets.mesh,
    collider: assets.collider,
    format: assets.format,
    splatCount: assets.splatCount ?? null,
    sourceSplatCount: assets.sourceSplatCount ?? null,
    bounds: assets.bounds ?? null,
  };
}

function runShellCommand(command, cwd = ROOT) {
  return spawnSync(command, {
    cwd,
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
}

const GENERATORS = {
  sharp: {
    name: 'SHARP',
    description: 'Apple SHARP single-image Gaussian splat generation',
    requirements: 'Python 3.10+, CUDA GPU, SHARP CLI installed (`pip install "sharp[f3d]"`)',
    async run(inputPhoto, worldDir, options) {
      const sharpCommand = process.env.SHARP_CLI || (existsSync(LOCAL_SHARP_CLI) ? LOCAL_SHARP_CLI : 'sharp');
      const sharpDevice = process.env.SHARP_DEVICE || 'cpu';
      const checkpointPath = process.env.SHARP_CHECKPOINT || (existsSync(LOCAL_SHARP_CHECKPOINT) ? LOCAL_SHARP_CHECKPOINT : '');
      const tempInputDir = join(tmpdir(), `jarowe-sharp-${options.sceneId}-${Date.now()}`);
      const tempInputPath = join(tempInputDir, `source${extname(inputPhoto) || '.png'}`);
      mkdirSync(tempInputDir, { recursive: true });
      copyFileSync(inputPhoto, tempInputPath);

      const checkpointArg = checkpointPath ? ` -c "${checkpointPath}"` : '';
      const command = `"${sharpCommand}" predict -i "${tempInputDir}" -o "${worldDir}" --device ${sharpDevice} --no-render${checkpointArg}`;

      console.log(`\n[SHARP] Running: ${command}`);
      console.log('[SHARP] First run may download weights and take a while.\n');

      const result = runShellCommand(command);
      rmSync(tempInputDir, { recursive: true, force: true });

      if (result.stdout?.trim()) console.log(result.stdout.trim());
      if (result.stderr?.trim()) console.log(result.stderr.trim());

      if (result.status !== 0) {
        throw new Error(
          [
            '[SHARP] Generation failed.',
            `Command: ${command}`,
            result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
            'Install SHARP from Apple\'s repo, ensure the CLI exists, or set SHARP_CLI to the full command path.',
          ].join('\n'),
        );
      }

      const assets = normalizeGeneratedWorldAssets(worldDir);
      if (!assets.splat) {
        throw new Error('[SHARP] No .ply or .spz file was produced in the world directory.');
      }
      return assets;
    },
  },

  trellis: {
    name: 'TRELLIS',
    description: 'Microsoft TRELLIS image-to-3D generation',
    requirements: 'Python 3.10+, CUDA GPU, TRELLIS installed locally',
    async run(inputPhoto, worldDir) {
      const trellisCommand = process.env.TRELLIS_COMMAND || '';
      if (!trellisCommand) {
        throw new Error(
          [
            '[TRELLIS] No command configured.',
            'Set TRELLIS_COMMAND to your working invocation, for example:',
            'python -m trellis.generate --image "{input}" --output "{output}" --format ply glb',
          ].join('\n'),
        );
      }

      const command = trellisCommand
        .replaceAll('{input}', inputPhoto)
        .replaceAll('{output}', worldDir);

      console.log(`\n[TRELLIS] Running: ${command}\n`);
      const result = runShellCommand(command);

      if (result.stdout?.trim()) console.log(result.stdout.trim());
      if (result.stderr?.trim()) console.log(result.stderr.trim());

      if (result.status !== 0) {
        throw new Error(
          [
            '[TRELLIS] Generation failed.',
            `Command: ${command}`,
            result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
          ].join('\n'),
        );
      }

      const assets = normalizeGeneratedWorldAssets(worldDir);
      if (!assets.splat && !assets.mesh) {
        throw new Error('[TRELLIS] No world assets were produced in the world directory.');
      }
      return assets;
    },
  },

  marble: {
    name: 'Marble',
    description: 'World Labs Marble export registration',
    requirements: 'Manual export or API integration',
    async run() {
      throw new Error(
        [
          '[Marble] API integration is not implemented in this repo yet.',
          'Export the assets externally into public/memory/{scene-id}/world and rerun this script to register them.',
        ].join('\n'),
      );
    },
  },
};

async function main() {
  const { sceneId, generator: generatorKey } = parseArgs();

  if (!sceneId) {
    console.log('Usage: node pipeline/generate-memory-world.mjs <scene-id> [--generator sharp|trellis|marble]');
    console.log('\nAvailable generators:');
    for (const [key, generator] of Object.entries(GENERATORS)) {
      console.log(`  ${key.padEnd(8)} - ${generator.description}`);
    }
    process.exit(1);
  }

  const generator = GENERATORS[generatorKey];
  if (!generator) {
    console.error(`Unknown generator "${generatorKey}". Choose from: ${Object.keys(GENERATORS).join(', ')}`);
    process.exit(1);
  }

  const sceneDir = join(MEMORY_ROOT, sceneId);
  if (!existsSync(sceneDir)) {
    throw new Error(`Scene directory not found: ${sceneDir}`);
  }

  const { metaPath, meta } = readMeta(sceneDir);
  const photoPath = join(sceneDir, meta.source.photo);
  if (!existsSync(photoPath)) {
    throw new Error(`Source photo not found: ${photoPath}`);
  }

  const worldDir = join(sceneDir, 'world');
  mkdirSync(worldDir, { recursive: true });

  console.log(`\nScene: ${meta.title} (${sceneId})`);
  console.log(`Generator: ${generator.name}`);
  console.log(`Source photo: ${meta.source.photo}`);
  console.log(`World dir: ${worldDir}`);

  const existingAssets = detectExistingAssets(worldDir);
  if (existingAssets?.splat || existingAssets?.mesh) {
    console.log('\nExisting world assets detected. Registering them in meta.json...');
    const runtimeAssets = prepareRuntimeAssets(worldDir, existingAssets);
    updateMetaWithAssets(meta, { ...runtimeAssets, generator: generatorKey, generated: TODAY });
    writeMeta(metaPath, meta);
    console.log(JSON.stringify(meta.world, null, 2));
    return;
  }

  const generatedAssets = await generator.run(photoPath, worldDir, { sceneId, meta });
  const runtimeAssets = prepareRuntimeAssets(worldDir, generatedAssets);
  updateMetaWithAssets(meta, { ...runtimeAssets, generator: generatorKey, generated: TODAY });
  writeMeta(metaPath, meta);

  console.log('\nWorld asset generated and registered:');
  console.log(JSON.stringify(meta.world, null, 2));
}

main().catch(error => {
  console.error(`\nPipeline error: ${error.message}`);
  process.exit(1);
});
