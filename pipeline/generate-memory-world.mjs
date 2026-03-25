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
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs() {
  const args = process.argv.slice(2);
  const sceneId = args.find(arg => !arg.startsWith('--'));
  const generatorIndex = args.indexOf('--generator');
  const generator = generatorIndex !== -1 ? args[generatorIndex + 1] : 'sharp';
  const force = args.includes('--force');
  return { sceneId, generator, force };
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

function toPosixPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isImageFile(filename) {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

function resolveSceneAssetPath(sceneDir, assetPath) {
  if (!assetPath) return null;
  if (assetPath.startsWith('/')) {
    return join(ROOT, 'public', ...assetPath.slice(1).split('/'));
  }
  return join(sceneDir, ...assetPath.replaceAll('\\', '/').split('/'));
}

function collectDirectoryImages(dirPath) {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && isImageFile(entry.name))
    .map(entry => join(dirPath, entry.name));
}

function collectSourceViews(sceneDir, meta) {
  const views = [];
  const seen = new Set();

  const addView = (role, sourcePath, kind = 'source') => {
    if (!sourcePath || !existsSync(sourcePath)) return;
    const normalized = resolve(sourcePath);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    views.push({
      role,
      kind,
      absolutePath: normalized,
      ext: extname(normalized) || '.png',
      relativePath: toPosixPath(normalized.replace(`${ROOT}\\`, '').replace(`${ROOT}/`, '')),
    });
  };

  addView('primary', resolveSceneAssetPath(sceneDir, meta.source?.photo));

  for (const postImage of meta.source?.postImages ?? []) {
    addView('cluster-source', resolveSceneAssetPath(sceneDir, postImage));
  }

  const localViewDirs = [
    join(sceneDir, 'views'),
    join(sceneDir, 'views', 'seed'),
    join(sceneDir, 'views', 'generated'),
  ];

  for (const dirPath of localViewDirs) {
    for (const filePath of collectDirectoryImages(dirPath)) {
      addView('supplemental', filePath, dirPath.endsWith('generated') ? 'generated' : 'supplemental');
    }
  }

  return views;
}

function writeExpandedBundleManifest(worldDir, meta, manifest) {
  const bundleManifestPath = join(worldDir, 'view-bundle.json');
  writeFileSync(bundleManifestPath, JSON.stringify({
    sceneId: meta.id,
    strategy: manifest.strategy,
    createdAt: TODAY,
    sourceViewCount: manifest.sourceViewCount,
    generatedViewCount: manifest.generatedViewCount,
    totalViewCount: manifest.totalViewCount,
    anchorSource: manifest.anchorSource,
    views: manifest.views,
  }, null, 2) + '\n', 'utf8');
  return toWorldRelative('view-bundle.json');
}

function expandCommandTemplate(template, variables) {
  let command = template;
  for (const [key, value] of Object.entries(variables)) {
    command = command.replaceAll(`{${key}}`, value ?? '');
  }
  return command;
}

function buildExpandedViewBundle(sceneDir, worldDir, sceneId, meta) {
  const bundleRoot = join(tmpdir(), `jarowe-expanded-${sceneId}-${Date.now()}`);
  const sourceDir = join(bundleRoot, 'source');
  const generatedDir = join(bundleRoot, 'generated');
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const sourceViews = collectSourceViews(sceneDir, meta);
  const stagedViews = sourceViews.map((view, index) => {
    const filename = `${String(index).padStart(3, '0')}-${view.role}${view.ext}`;
    const stagedPath = join(sourceDir, filename);
    copyFileSync(view.absolutePath, stagedPath);
    return {
      ...view,
      stagedFilename: filename,
      stagedPath,
    };
  });

  const primaryView = stagedViews.find(view => view.role === 'primary') ?? stagedViews[0] ?? null;
  const bundleVariables = {
    sceneId,
    sceneDir,
    worldDir,
    bundleDir: bundleRoot,
    sourceDir,
    generatedDir,
    primary: primaryView?.stagedPath ?? '',
    primarySource: primaryView?.absolutePath ?? '',
  };

  const viewCommand = process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND || '';
  if (viewCommand) {
    const command = expandCommandTemplate(viewCommand, bundleVariables);
    console.log(`\n[Expanded] Synthesizing complementary views: ${command}\n`);
    const result = runShellCommand(command);
    if (result.stdout?.trim()) console.log(result.stdout.trim());
    if (result.stderr?.trim()) console.log(result.stderr.trim());
    if (result.status !== 0) {
      rmSync(bundleRoot, { recursive: true, force: true });
      throw new Error(
        [
          '[Expanded] View synthesis command failed.',
          `Command: ${command}`,
          result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
        ].join('\n'),
      );
    }
  }

  const generatedViews = collectDirectoryImages(generatedDir).map((filePath, index) => ({
    role: 'synthetic-view',
    kind: 'generated',
    absolutePath: filePath,
    ext: extname(filePath) || '.png',
    relativePath: toPosixPath(filePath),
    stagedFilename: `generated-${String(index).padStart(3, '0')}${extname(filePath) || '.png'}`,
    stagedPath: filePath,
  }));

  const strategy = meta.source?.postImages?.length ? 'cluster-fusion' : 'synthetic-multiview-fusion';
  const manifestRelativePath = writeExpandedBundleManifest(worldDir, meta, {
    strategy,
    sourceViewCount: stagedViews.filter(view => view.kind !== 'generated').length,
    generatedViewCount: generatedViews.length,
    totalViewCount: stagedViews.length + generatedViews.length,
    anchorSource: meta.source?.photo,
    views: [...stagedViews, ...generatedViews].map(view => ({
      role: view.role,
      kind: view.kind,
      relativePath: view.relativePath,
      stagedFilename: view.stagedFilename,
    })),
  });

  return {
    bundleRoot,
    sourceDir,
    generatedDir,
    primaryView,
    sourceViews: stagedViews,
    generatedViews,
    manifestRelativePath,
    strategy,
  };
}

function cleanWorldAssets(worldDir) {
  const candidates = [
    'scene.ply',
    'scene.runtime.ply',
    'scene.spz',
    'scene.glb',
    'collider.glb',
    'bounds.json',
  ];
  for (const filename of candidates) {
    const filePath = join(worldDir, filename);
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
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
  if (assets.generationMode) {
    meta.source.generationMode = assets.generationMode;
  }
  if (assets.expansion) {
    meta.source.expansion = {
      ...(meta.source.expansion ?? {}),
      ...assets.expansion,
    };
  }
  meta.world = {
    splat: assets.splat,
    sourceSplat: assets.sourceSplat ?? null,
    mesh: assets.mesh,
    collider: assets.collider,
    format: assets.format,
    splatCount: assets.splatCount ?? null,
    sourceSplatCount: assets.sourceSplatCount ?? null,
    bounds: assets.bounds ?? null,
    transform: assets.transform ?? meta.world?.transform ?? null,
    provenance: assets.provenance ?? meta.world?.provenance ?? null,
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

  expanded: {
    name: 'Expanded',
    description: 'Single-image anchor + synthetic/multi-view bundle + fused world registration',
    requirements: 'Optional external view synthesis and reconstruction commands; falls back to SHARP anchor draft',
    async run(inputPhoto, worldDir, options) {
      const { meta, sceneDir, sceneId, existingAssets } = options;
      const bundle = buildExpandedViewBundle(sceneDir, worldDir, sceneId, meta);
      const fuseCommandTemplate = process.env.EXPANDED_FUSE_COMMAND || process.env.FUSED_WORLD_COMMAND || process.env.GSPLAT_COMMAND || '';

      try {
        if (fuseCommandTemplate) {
          const command = expandCommandTemplate(fuseCommandTemplate, {
            sceneId,
            sceneDir,
            worldDir,
            bundleDir: bundle.bundleRoot,
            sourceDir: bundle.sourceDir,
            generatedDir: bundle.generatedDir,
            primary: bundle.primaryView?.stagedPath ?? inputPhoto,
            bundleJson: join(worldDir, 'view-bundle.json'),
          });

          console.log(`\n[Expanded] Reconstructing fused world: ${command}\n`);
          const result = runShellCommand(command);
          if (result.stdout?.trim()) console.log(result.stdout.trim());
          if (result.stderr?.trim()) console.log(result.stderr.trim());
          if (result.status !== 0) {
            throw new Error(
              [
                '[Expanded] Fusion command failed.',
                `Command: ${command}`,
                result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
              ].join('\n'),
            );
          }

          const fusedAssets = normalizeGeneratedWorldAssets(worldDir);
          if (!fusedAssets.splat && !fusedAssets.mesh) {
            throw new Error('[Expanded] Fusion command completed but no world assets were produced.');
          }

          return {
            ...fusedAssets,
            generationMode: bundle.strategy === 'cluster-fusion' ? 'multi-view-cluster' : 'single-image-expanded',
            expansion: {
              strategy: bundle.strategy,
              stage: 'world-fused',
              bundle: bundle.manifestRelativePath,
              sourceViewCount: bundle.sourceViews.length,
              generatedViewCount: bundle.generatedViews.length,
              totalViewCount: bundle.sourceViews.length + bundle.generatedViews.length,
              anchorGenerator: 'sharp',
              viewSynthesizer: process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND ? 'external-command' : null,
              fusionEngine: 'external-command',
            },
            provenance: {
              tier: bundle.strategy === 'cluster-fusion' ? 'cluster-fused' : 'expanded-fused',
              anchorGenerator: 'sharp',
              reconstruction: 'external-fuse',
              viewCount: bundle.sourceViews.length + bundle.generatedViews.length,
            },
          };
        }

        if (existingAssets?.splat || existingAssets?.mesh) {
          return {
            ...existingAssets,
            generationMode: bundle.strategy === 'cluster-fusion' ? 'multi-view-cluster' : 'single-image-expanded',
            expansion: {
              strategy: bundle.strategy,
              stage: 'bundle-prepared',
              bundle: bundle.manifestRelativePath,
              sourceViewCount: bundle.sourceViews.length,
              generatedViewCount: bundle.generatedViews.length,
              totalViewCount: bundle.sourceViews.length + bundle.generatedViews.length,
              anchorGenerator: meta.source?.generator || 'sharp',
              viewSynthesizer: process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND ? 'external-command' : null,
              fusionEngine: null,
            },
            provenance: {
              ...(meta.world?.provenance ?? {}),
              tier: existingAssets.sourceSplat ? 'anchor-draft' : 'existing-world',
              anchorGenerator: meta.source?.generator || 'sharp',
              reconstruction: 'registered-existing',
              viewCount: bundle.sourceViews.length + bundle.generatedViews.length,
            },
          };
        }

        const anchorAssets = await GENERATORS.sharp.run(inputPhoto, worldDir, options);
        return {
          ...anchorAssets,
          generationMode: bundle.strategy === 'cluster-fusion' ? 'multi-view-cluster' : 'single-image-expanded',
          expansion: {
            strategy: bundle.strategy,
            stage: 'anchor-draft',
            bundle: bundle.manifestRelativePath,
            sourceViewCount: bundle.sourceViews.length,
            generatedViewCount: bundle.generatedViews.length,
            totalViewCount: bundle.sourceViews.length + bundle.generatedViews.length,
            anchorGenerator: 'sharp',
            viewSynthesizer: process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND ? 'external-command' : null,
            fusionEngine: null,
          },
          provenance: {
            tier: 'anchor-draft',
            anchorGenerator: 'sharp',
            reconstruction: 'single-image-anchor',
            viewCount: bundle.sourceViews.length + bundle.generatedViews.length,
          },
        };
      } finally {
        rmSync(bundle.bundleRoot, { recursive: true, force: true });
      }
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
  const { sceneId, generator: generatorKey, force } = parseArgs();

  if (!sceneId) {
    console.log('Usage: node pipeline/generate-memory-world.mjs <scene-id> [--generator sharp|expanded|trellis|marble] [--force]');
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
  if (force) {
    cleanWorldAssets(worldDir);
  }
  const currentAssets = force ? null : existingAssets;

  if ((currentAssets?.splat || currentAssets?.mesh) && generatorKey !== 'expanded') {
    console.log('\nExisting world assets detected. Registering them in meta.json...');
    const runtimeAssets = prepareRuntimeAssets(worldDir, currentAssets);
    updateMetaWithAssets(meta, { ...runtimeAssets, generator: generatorKey, generated: TODAY });
    writeMeta(metaPath, meta);
    console.log(JSON.stringify(meta.world, null, 2));
    return;
  }

  const generatedAssets = await generator.run(photoPath, worldDir, {
    sceneId,
    meta,
    sceneDir,
    existingAssets: currentAssets,
    force,
  });
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
