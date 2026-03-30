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
const LOCAL_DEPTH_VIEW_SCRIPT = join(ROOT, 'pipeline', 'synthesize_depth_views.py');
const LOCAL_ENVIRONMENT_PLATE_SCRIPT = join(ROOT, 'pipeline', 'build_environment_plate.py');
const LOCAL_ENVIRONMENT_INPAINT_SCRIPT = join(ROOT, 'pipeline', 'inpaint_environment_plate.py');
const LOCAL_WORLD_MODEL_WRAPPER = join(ROOT, 'pipeline', 'run_single_image_world_backend.py');
const DEFAULT_MAX_RUNTIME_SPLATS = 300000;
const MAX_RUNTIME_SPLATS = Number.parseInt(process.env.MAX_RUNTIME_SPLATS ?? '', 10) || DEFAULT_MAX_RUNTIME_SPLATS;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_CLUSTER_VIEW_LIMIT = 4;
const WORLD_QUALITY_PROFILES = {
  draft: {
    resolution: 1600,
    useSharp: true,
    inpaintBg: false,
    subjectErasedBootstrap: true,
    runtimePreviewSplatTarget: 300000,
  },
  hero: {
    resolution: 2048,
    useSharp: false,
    inpaintBg: true,
    subjectErasedBootstrap: true,
    runtimePreviewSplatTarget: 900000,
  },
  ultra: {
    resolution: 2304,
    useSharp: false,
    inpaintBg: true,
    subjectErasedBootstrap: true,
    runtimePreviewSplatTarget: 1200000,
  },
};
const DEFAULT_WORLD_FAMILY = 'pano-first';
const WORLD_FAMILY_ALIASES = new Map([
  ['pano', 'pano-first'],
  ['pano-first', 'pano-first'],
  ['worldgen', 'pano-first'],
  ['camera', 'camera-guided'],
  ['camera-guided', 'camera-guided'],
  ['guided-camera', 'camera-guided'],
  ['multi-view', 'camera-guided'],
  ['multiview', 'camera-guided'],
  ['structured', 'structured-anchor'],
  ['structured-anchor', 'structured-anchor'],
  ['anchor-layout', 'structured-anchor'],
]);
const WORLD_FAMILY_LABELS = {
  'pano-first': 'Pano First',
  'camera-guided': 'Camera Guided',
  'structured-anchor': 'Structured Anchor',
};

function parseArgs() {
  const args = process.argv.slice(2);
  let sceneId = null;
  let generator = 'sharp';
  let resolution = null;
  let prompt = null;
  let force = false;
  let useSharp = null;
  let inpaintBg = null;
  let lowVram = null;
  let subjectErasedBootstrap = null;
  let qualityProfile = null;
  let candidates = null;
  let seed = null;
  let worldFamily = null;
  let worldFamilies = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--generator') {
      generator = args[index + 1] ?? generator;
      index += 1;
      continue;
    }
    if (arg === '--resolution') {
      resolution = Number.parseInt(args[index + 1] ?? '', 10);
      index += 1;
      continue;
    }
    if (arg === '--candidates') {
      candidates = Number.parseInt(args[index + 1] ?? '', 10);
      index += 1;
      continue;
    }
    if (arg === '--seed') {
      seed = Number.parseInt(args[index + 1] ?? '', 10);
      index += 1;
      continue;
    }
    if (arg === '--prompt') {
      prompt = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--family') {
      worldFamily = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--families') {
      worldFamilies = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--quality') {
      qualityProfile = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--hero') {
      qualityProfile = 'hero';
      continue;
    }
    if (arg === '--ultra') {
      qualityProfile = 'ultra';
      continue;
    }
    if (arg === '--force') {
      force = true;
      continue;
    }
    if (arg === '--use-sharp') {
      useSharp = true;
      continue;
    }
    if (arg === '--no-sharp') {
      useSharp = false;
      continue;
    }
    if (arg === '--inpaint-bg') {
      inpaintBg = true;
      continue;
    }
    if (arg === '--no-inpaint-bg') {
      inpaintBg = false;
      continue;
    }
    if (arg === '--low-vram') {
      lowVram = true;
      continue;
    }
    if (arg === '--subject-erased-bootstrap') {
      subjectErasedBootstrap = true;
      continue;
    }
    if (arg === '--no-subject-erased-bootstrap') {
      subjectErasedBootstrap = false;
      continue;
    }
    if (!arg.startsWith('--') && !sceneId) {
      sceneId = arg;
    }
  }

  return {
    sceneId,
    generator,
    force,
    worldModelOptions: {
      qualityProfile,
      candidates: Number.isFinite(candidates) ? candidates : null,
      seed: Number.isFinite(seed) ? seed : null,
      resolution: Number.isFinite(resolution) ? resolution : null,
      prompt,
      worldFamily,
      worldFamilies,
      useSharp,
      inpaintBg,
      lowVram,
      subjectErasedBootstrap,
    },
  };
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

function resolveWorldQualityProfileName(meta, worldModelOptions = {}) {
  const requestedProfile = String(worldModelOptions.qualityProfile || '').trim().toLowerCase();
  if (requestedProfile && WORLD_QUALITY_PROFILES[requestedProfile]) {
    return requestedProfile;
  }

  const metaProfile = String(
    meta?.source?.worldGenerationProfile
    || meta?.world?.generationProfile
    || '',
  ).trim().toLowerCase();
  if (metaProfile && WORLD_QUALITY_PROFILES[metaProfile]) {
    return metaProfile;
  }

  return 'draft';
}

function normalizeWorldFamily(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
  return WORLD_FAMILY_ALIASES.get(normalized) || null;
}

function parseWorldFamilies(value) {
  return String(value || '')
    .split(',')
    .map((entry) => normalizeWorldFamily(entry))
    .filter(Boolean);
}

function slugifyCandidatePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveWorldModelOptions(meta, worldModelOptions = {}) {
  const qualityProfile = resolveWorldQualityProfileName(meta, worldModelOptions);
  const profileDefaults = WORLD_QUALITY_PROFILES[qualityProfile] ?? WORLD_QUALITY_PROFILES.draft;
  const metaConfiguredFamilies = Array.isArray(meta?.source?.worldGenerationFamilies)
    ? meta.source.worldGenerationFamilies.join(',')
    : meta?.source?.worldGenerationFamilies;
  const requestedFamilies = [
    ...parseWorldFamilies(worldModelOptions.worldFamilies),
    ...parseWorldFamilies(metaConfiguredFamilies),
  ];
  const singleRequestedFamily = normalizeWorldFamily(
    worldModelOptions.worldFamily
    || meta?.source?.worldGenerationFamily
    || process.env.WORLD_MODEL_FAMILY,
  );
  const worldFamilies = [...new Set([
    ...(requestedFamilies.length ? requestedFamilies : []),
    ...(singleRequestedFamily ? [singleRequestedFamily] : []),
  ])];
  const resolvedFamilies = worldFamilies.length ? worldFamilies : [DEFAULT_WORLD_FAMILY];

  return {
    ...worldModelOptions,
    qualityProfile,
    worldFamily: resolvedFamilies[0],
    worldFamilies: resolvedFamilies,
    candidates: Number.isFinite(worldModelOptions.candidates) ? clamp(Math.floor(worldModelOptions.candidates), 1, 8) : 1,
    seed: Number.isFinite(worldModelOptions.seed) ? Math.floor(worldModelOptions.seed) : 42,
    resolution: Number.isFinite(worldModelOptions.resolution) ? worldModelOptions.resolution : profileDefaults.resolution,
    useSharp: typeof worldModelOptions.useSharp === 'boolean' ? worldModelOptions.useSharp : profileDefaults.useSharp,
    inpaintBg: typeof worldModelOptions.inpaintBg === 'boolean' ? worldModelOptions.inpaintBg : profileDefaults.inpaintBg,
    lowVram: typeof worldModelOptions.lowVram === 'boolean' ? worldModelOptions.lowVram : false,
    subjectErasedBootstrap: typeof worldModelOptions.subjectErasedBootstrap === 'boolean'
      ? worldModelOptions.subjectErasedBootstrap
      : profileDefaults.subjectErasedBootstrap,
    runtimePreviewSplatTarget: Number.isFinite(worldModelOptions.runtimePreviewSplatTarget)
      ? worldModelOptions.runtimePreviewSplatTarget
      : profileDefaults.runtimePreviewSplatTarget,
  };
}

function toWorldRelative(filename) {
  return filename ? `world/${filename}` : null;
}

function toPosixPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function toWslPath(filePath) {
  if (!filePath) return '';
  const normalized = resolve(filePath).replaceAll('\\', '/');
  const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (!driveMatch) {
    return normalized;
  }
  return `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
}

function shellQuoteBash(value) {
  return `'${String(value).replaceAll("'", `'\"'\"'`)}'`;
}

function shellQuoteWin(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function trimPromptWords(text, maxWords = 26) {
  const words = String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(' ');
  }
  return words.slice(0, maxWords).join(' ');
}

function analyzeWorldFraming(meta) {
  const crop = meta?.artDirection?.subjectCrop;
  if (!Array.isArray(crop) || crop.length < 4) {
    return null;
  }

  const width = Number(crop[2]) || 0;
  const height = Number(crop[3]) || 0;
  const area = Math.max(0, width) * Math.max(0, height);
  const closeSubject = area >= 0.22 || height >= 0.62;

  return {
    subjectCropArea: Number(area.toFixed(3)),
    subjectCropHeight: Number(height.toFixed(3)),
    framingClass: closeSubject ? 'close-subject' : 'environment-anchor',
    recommendedPresentationMode: closeSubject ? 'chapter' : 'anchor',
  };
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

function collectSourceViews(sceneDir, meta, options = {}) {
  const {
    includePostImages = true,
  } = options;
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

  if (includePostImages) {
    for (const postImage of meta.source?.postImages ?? []) {
      addView('cluster-source', resolveSceneAssetPath(sceneDir, postImage));
    }
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
  return buildExpandedViewBundleWithOptions(sceneDir, worldDir, sceneId, meta, {});
}

function buildExpandedViewBundleWithOptions(sceneDir, worldDir, sceneId, meta, options = {}) {
  const {
    allowExternalViewCommand = true,
    allowLocalDepthSynthesis = true,
    includePostImages = true,
  } = options;
  const bundleRoot = join(tmpdir(), `jarowe-expanded-${sceneId}-${Date.now()}`);
  const sourceDir = join(bundleRoot, 'source');
  const generatedDir = join(bundleRoot, 'generated');
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  const sourceViews = collectSourceViews(sceneDir, meta, { includePostImages });
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

  const viewCommand = allowExternalViewCommand
    ? process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND || ''
    : '';
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

  const depthPath = resolveSceneAssetPath(sceneDir, meta.source?.depth);
  const maskPath = resolveSceneAssetPath(sceneDir, meta.source?.mask);
  if (!viewCommand && allowLocalDepthSynthesis && depthPath && existsSync(depthPath) && existsSync(LOCAL_DEPTH_VIEW_SCRIPT)) {
    const command = [
      'python',
      `"${LOCAL_DEPTH_VIEW_SCRIPT}"`,
      `--photo "${primaryView?.absolutePath ?? resolveSceneAssetPath(sceneDir, meta.source?.photo)}"`,
      `--depth "${depthPath}"`,
      `--output "${generatedDir}"`,
      maskPath && existsSync(maskPath) ? `--mask "${maskPath}"` : '',
    ].filter(Boolean).join(' ');

    console.log(`\n[Expanded] Synthesizing depth-warped support views: ${command}\n`);
    const result = runShellCommand(command);
    if (result.stdout?.trim()) console.log(result.stdout.trim());
    if (result.stderr?.trim()) console.log(result.stderr.trim());
    if (result.status !== 0) {
      rmSync(bundleRoot, { recursive: true, force: true });
      throw new Error(
        [
          '[Expanded] Local depth-view synthesis failed.',
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

function collectGeneratedBundleViews(generatedDir) {
  return collectDirectoryImages(generatedDir).map((filePath, index) => ({
    role: 'synthetic-view',
    kind: 'generated',
    absolutePath: filePath,
    ext: extname(filePath) || '.png',
    relativePath: toPosixPath(filePath),
    stagedFilename: `generated-${String(index).padStart(3, '0')}${extname(filePath) || '.png'}`,
    stagedPath: filePath,
  }));
}

function refreshExpandedBundleManifest(worldDir, meta, bundle, strategy) {
  const generatedViews = collectGeneratedBundleViews(bundle.generatedDir);
  const manifestRelativePath = writeExpandedBundleManifest(worldDir, meta, {
    strategy,
    sourceViewCount: bundle.sourceViews.length,
    generatedViewCount: generatedViews.length,
    totalViewCount: bundle.sourceViews.length + generatedViews.length,
    anchorSource: meta.source?.photo,
    views: [...bundle.sourceViews, ...generatedViews].map(view => ({
      role: view.role,
      kind: view.kind,
      relativePath: view.relativePath,
      stagedFilename: view.stagedFilename,
    })),
  });

  return {
    ...bundle,
    strategy,
    generatedViews,
    manifestRelativePath,
  };
}

function buildWorldModelPrompt(meta, options = {}) {
  const {
    prompt = '',
    promptOverride = '',
    subjectErasedBootstrap = false,
  } = options;

  const requestedPrompt = String(promptOverride || prompt || '').trim();
  const explicitPrompt = subjectErasedBootstrap
    ? requestedPrompt || meta?.source?.environmentWorldModelPrompt?.trim() || meta?.source?.worldModelPrompt?.trim()
    : requestedPrompt || meta?.source?.worldModelPrompt?.trim();
  if (explicitPrompt) {
    if (!subjectErasedBootstrap) {
      return explicitPrompt;
    }

    if (requestedPrompt) {
      return explicitPrompt;
    }

    const cappedPrompt = trimPromptWords(
      explicitPrompt,
      promptOverride ? 48 : 32,
    );
    return /\bno people\b/i.test(cappedPrompt)
      ? cappedPrompt
      : `${cappedPrompt} Empty environment. No people. Preserve rocks and shore.`;
  }

  const title = meta?.title?.trim();
  const subtitle = meta?.subtitle?.trim();
  const description = meta?.description?.trim();
  const parts = [title, subtitle, description].filter(Boolean);
  const autoPrompt = parts.length
    ? [
    parts.join('. '),
    subjectErasedBootstrap
      ? 'realistic 360 explorable environment, complete hidden geometry and off-camera world space from the cleaned environment plate, preserve non-masked anchors, avoid duplicate people, cinematic depth'
      : 'realistic 360 explorable scene, preserve the photo composition, complete hidden geometry, natural stone, turquoise water, cinematic depth',
  ].join(' ')
    : '';

  if (!subjectErasedBootstrap || !autoPrompt) {
    return autoPrompt;
  }

  return [
    trimPromptWords(autoPrompt, 22),
    'Empty environment. No people.',
  ].join(' ');
}

function buildCompactEnvironmentPromptSeed(meta, basePrompt) {
  const prompt = String(basePrompt || '').toLowerCase();
  const phrases = [];

  if (/\b(golden|sunset|warm|mediterranean)\b/.test(prompt)) {
    phrases.push('golden-hour light');
  }
  if (/\b(shore|coast|beach|sand|sea|ocean|water|tide)\b/.test(prompt)) {
    phrases.push('open shoreline');
  }
  if (/\b(granite|rock|boulder|stone|cliff)\b/.test(prompt)) {
    phrases.push('rock anchor');
  }
  if (/\b(horizon|island|distant)\b/.test(prompt)) {
    phrases.push('sea horizon');
  }
  if (/\b(cave|bell|frame)\b/.test(prompt)) {
    phrases.push('preserved local landmark');
  }

  if (phrases.length) {
    return [...new Set(phrases)].join(', ');
  }

  return trimPromptWords(
    basePrompt || `${meta?.title || 'Memory world'} explorable world`,
    10,
  );
}

function buildWorldFamilyPromptVariants(worldFamily, compactSeed, landmarkPhrase) {
  if (worldFamily === 'camera-guided') {
    return [
      `${compactSeed}. Empty environment. Stable camera travel with coherent left, right, and rear continuity. Strong orbit parallax. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Generate a navigable surrounding world from multiple implied camera paths. No front wall. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Prioritize side-angle plausibility, rear continuation, and view-consistent shoreline topology. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Favor multi-view consistency over source-front fidelity. Open flanks, readable horizon, coherent return path. No people. ${landmarkPhrase}`,
    ];
  }

  if (worldFamily === 'structured-anchor') {
    return [
      `${compactSeed}. Empty environment. Preserve landmark structure and layout continuity. Build explorable space around the anchor with no broken planes. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Respect the strongest geometric anchors, openings, and support surfaces while completing surrounding space. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Prioritize coherent structural layout, grounded walkable surfaces, and stable topology around the landmark. No people. ${landmarkPhrase}`,
      `${compactSeed}. Empty environment. Build surrounding depth while keeping the anchor readable from multiple angles. No floating fragments. No people. ${landmarkPhrase}`,
    ];
  }

  return [
    `${compactSeed}. Empty environment. Open walkable foreground. Layered depth. Clear horizon. No front wall. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Side and rear world continuity. Open coastline around viewer. No closed bowl. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Clear foreground, midground, and far horizon separation. No dominant frontal sheet. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Stable orbit views, side openings, and coherent surrounding topology. No floating fragments. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Strong near-ground parallax, open left and right escape paths, believable rear continuation. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Surrounding world should wrap behind the camera with readable side bays and no vertical sheet. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Preserve grounded terrain under the viewer, readable distant space, and coherent off-axis exploration. No people. ${landmarkPhrase}`,
    `${compactSeed}. Empty environment. Favor explorable depth and side continuity over photo-front fidelity. Avoid bowls, voids, and front walls. No people. ${landmarkPhrase}`,
  ];
}

function buildWorldModelCandidateConfigs(meta, worldModelOptions = {}) {
  const resolvedOptions = resolveWorldModelOptions(meta, worldModelOptions);
  const candidateCount = resolvedOptions.candidates ?? 1;
  const basePrompt = String(
    resolvedOptions.prompt
    || meta?.source?.environmentWorldModelPrompt
    || meta?.source?.worldModelPrompt
    || '',
  ).trim();
  const fallbackBase = basePrompt || `${meta?.title || 'Memory world'} complete coherent explorable surrounding space`;
  const compactSeed = buildCompactEnvironmentPromptSeed(meta, fallbackBase);
  const landmarkPhrase = /\b(cave|bell|frame|arch|door|window|tree|rock)\b/i.test(fallbackBase)
    ? 'Preserve the landmark anchor.'
    : 'Preserve the strongest foreground anchor.';
  const seeds = [resolvedOptions.seed ?? 42, 1337, 2026, 31415, 27182, 424242, 515151, 777777];
  const families = resolvedOptions.worldFamilies?.length ? resolvedOptions.worldFamilies : [DEFAULT_WORLD_FAMILY];
  const familyOrdinals = new Map();

  return Array.from({ length: candidateCount }, (_, index) => {
    const family = families[index % families.length];
    const familyIndex = familyOrdinals.get(family) ?? 0;
    familyOrdinals.set(family, familyIndex + 1);
    const promptVariants = buildWorldFamilyPromptVariants(family, compactSeed, landmarkPhrase);
    return {
      id: `${slugifyCandidatePart(family)}-${String(familyIndex + 1).padStart(2, '0')}`,
      family,
      familyLabel: WORLD_FAMILY_LABELS[family] ?? family,
      seed: seeds[index] ?? (resolvedOptions.seed ?? 42) + index * 97,
      prompt: promptVariants[familyIndex % promptVariants.length],
    };
  });
}

function shouldUseWorldgenBootstrapInpaint() {
  const configured = (process.env.WORLD_MODEL_BOOTSTRAP_BACKEND || 'auto').toLowerCase();
  if (configured === 'diffuse' || configured === 'local') return false;
  if (configured === 'lama' || configured === 'worldgen') return true;
  const backend = (process.env.WORLD_MODEL_BACKEND || 'worldgen').toLowerCase();
  return shouldUseWslWorldModelBackend() && backend === 'worldgen';
}

function buildEnvironmentBootstrapImage(sceneDir, worldDir, inputPhoto, meta, worldModelOptions = {}) {
  const subjectMaskPath = resolveSceneAssetPath(sceneDir, meta.source?.mask);
  const bootstrapMaskRelative = meta.source?.environmentMask || meta.source?.mask;
  const bootstrapMaskPath = resolveSceneAssetPath(sceneDir, bootstrapMaskRelative);
  const hasMask = Boolean(bootstrapMaskPath && existsSync(bootstrapMaskPath));
  const wantsSubjectErasedBootstrap = worldModelOptions.subjectErasedBootstrap ?? hasMask;

  if (!wantsSubjectErasedBootstrap || !hasMask || !existsSync(LOCAL_ENVIRONMENT_PLATE_SCRIPT)) {
    return {
      worldInputPath: inputPhoto,
      subjectInputPath: inputPhoto,
      maskPath: subjectMaskPath && existsSync(subjectMaskPath) ? subjectMaskPath : null,
      environmentBootstrap: null,
    };
  }

  const bootstrapPath = join(worldDir, 'bootstrap.environment.png');
  const useWorldgenInpaint = shouldUseWorldgenBootstrapInpaint() && existsSync(LOCAL_ENVIRONMENT_INPAINT_SCRIPT);
  const command = useWorldgenInpaint
    ? (() => {
      const scriptPath = toWslPath(LOCAL_ENVIRONMENT_INPAINT_SCRIPT);
      const worldgenRoot = toWslPath(
        process.env.WORLDGEN_ROOT || join(ROOT, '_experiments', 'WorldGen'),
      );
      const bashCommand = [
        `export WORLDGEN_ROOT=${shellQuoteBash(worldgenRoot)}`,
        [
          getDefaultWorldModelWslPython(),
          shellQuoteBash(scriptPath),
          shellQuoteBash(toWslPath(inputPhoto)),
          shellQuoteBash(toWslPath(bootstrapMaskPath)),
          shellQuoteBash(toWslPath(bootstrapPath)),
        ].join(' '),
      ].join(' && ');
      return `wsl -d ${getDefaultWorldModelWslDistro()} -- bash -lc ${JSON.stringify(bashCommand)}`;
    })()
    : [
      getDefaultWorldModelPython(),
      `"${LOCAL_ENVIRONMENT_PLATE_SCRIPT}"`,
      `"${inputPhoto}"`,
      `"${bootstrapMaskPath}"`,
      `"${bootstrapPath}"`,
    ].join(' ');

  console.log(`\n[World Model] Building subject-erased environment plate: ${command}\n`);
  const result = runShellCommand(command);
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.log(result.stderr.trim());

  if (result.status !== 0 || !existsSync(bootstrapPath)) {
    const failureMessage = [
      '[World Model] Failed to build the subject-erased environment bootstrap image.',
      `Command: ${command}`,
      result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
    ].join('\n');

    if (worldModelOptions.subjectErasedBootstrap === true) {
      throw new Error(failureMessage);
    }

    console.warn(`${failureMessage}\n[World Model] Falling back to the original photo as the world-model input.`);
    return {
      worldInputPath: inputPhoto,
      subjectInputPath: inputPhoto,
      maskPath: subjectMaskPath && existsSync(subjectMaskPath) ? subjectMaskPath : null,
      environmentBootstrap: null,
    };
  }

  return {
    worldInputPath: bootstrapPath,
    subjectInputPath: inputPhoto,
    maskPath: subjectMaskPath && existsSync(subjectMaskPath) ? subjectMaskPath : null,
    environmentBootstrap: {
      strategy: 'subject-erased-environment-bootstrap',
      image: toWorldRelative('bootstrap.environment.png'),
      subjectInput: meta.source?.photo ?? null,
      mask: bootstrapMaskRelative ?? null,
      subjectMask: meta.source?.mask ?? null,
      usedAsWorldInput: true,
    },
  };
}

function cleanWorldAssets(worldDir) {
  const candidates = [
    'scene.ply',
    'scene.runtime.ply',
    'scene.spz',
    'scene.ksplat',
    'scene.runtime.ksplat',
    'scene.glb',
    'bootstrap.environment.png',
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rotateAroundY([x, y, z], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    x * cos + z * sin,
    y,
    -x * sin + z * cos,
  ];
}

function createClusterViewTransforms(count) {
  const spread = count <= 1 ? 0 : Math.min(Math.PI / 2.8, 0.34 * (count - 1));
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return {
        yaw: 0,
        scale: 1,
        offset: [0, 0, 0],
      };
    }

    const normalized = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
    const yaw = normalized * spread;
    const sideRadius = 0.45 + Math.abs(normalized) * 0.18;
    const depthOffset = 0.12 + Math.abs(normalized) * 0.14;
    const lift = ((index % 2 === 0 ? 1 : -1) * 0.08) + Math.abs(normalized) * 0.05;

    return {
      yaw,
      scale: 0.94 + (1 - Math.abs(normalized)) * 0.05,
      offset: [
        Math.sin(yaw) * sideRadius,
        lift,
        Math.cos(yaw) * depthOffset,
      ],
    };
  });
}

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
      currentElement.properties.push({ name: tokens[2], type, size: PLY_TYPE_SIZES[type] });
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

function buildVertexPropertyOffsets(properties) {
  let offset = 0;
  return properties.reduce((accumulator, property) => {
    accumulator[property.name] = offset;
    offset += property.size;
    return accumulator;
  }, {});
}

function greatestCommonDivisor(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function chooseCoprimePermutationStep(vertexCount) {
  if (vertexCount <= 1) return 1;

  let step = Math.max(1, Math.floor(vertexCount * 0.61803398875));
  if (step >= vertexCount) {
    step = vertexCount - 1;
  }

  while (step > 1 && greatestCommonDivisor(step, vertexCount) !== 1) {
    step -= 1;
  }

  return step > 0 ? step : 1;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function readVertexImportance(buffer, baseOffset, offsets) {
  const opacityOffset = offsets.opacity;
  const scale0Offset = offsets.scale_0;
  const scale1Offset = offsets.scale_1;
  const scale2Offset = offsets.scale_2;

  const opacity = opacityOffset == null
    ? 0.5
    : sigmoid(buffer.readFloatLE(baseOffset + opacityOffset));

  if (scale0Offset == null || scale1Offset == null || scale2Offset == null) {
    return opacity;
  }

  const maxScale = Math.max(
    buffer.readFloatLE(baseOffset + scale0Offset),
    buffer.readFloatLE(baseOffset + scale1Offset),
    buffer.readFloatLE(baseOffset + scale2Offset),
  );
  const gaussianRadius = Math.exp(maxScale);
  const normalizedRadius = clamp((gaussianRadius - 0.006) / 0.18, 0, 1);

  return opacity * 0.8 + normalizedRadius * 0.2;
}

function siftHeapUp(scores, indices, position) {
  let child = position;
  while (child > 0) {
    const parent = Math.floor((child - 1) / 2);
    if (scores[parent] <= scores[child]) break;
    [scores[parent], scores[child]] = [scores[child], scores[parent]];
    [indices[parent], indices[child]] = [indices[child], indices[parent]];
    child = parent;
  }
}

function siftHeapDown(scores, indices, size, position) {
  let parent = position;
  while (true) {
    const left = parent * 2 + 1;
    const right = left + 1;
    let smallest = parent;

    if (left < size && scores[left] < scores[smallest]) {
      smallest = left;
    }
    if (right < size && scores[right] < scores[smallest]) {
      smallest = right;
    }
    if (smallest === parent) break;
    [scores[parent], scores[smallest]] = [scores[smallest], scores[parent]];
    [indices[parent], indices[smallest]] = [indices[smallest], indices[parent]];
    parent = smallest;
  }
}

function selectImportanceAnchors(sourceBuffer, vertexOffset, vertexStride, vertexCount, topCount, propertyOffsets) {
  if (!topCount) return [];

  const heapScores = new Float32Array(topCount);
  const heapIndices = new Uint32Array(topCount);
  let heapSize = 0;

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const baseOffset = vertexOffset + vertexIndex * vertexStride;
    const score = readVertexImportance(sourceBuffer, baseOffset, propertyOffsets);

    if (heapSize < topCount) {
      heapScores[heapSize] = score;
      heapIndices[heapSize] = vertexIndex;
      siftHeapUp(heapScores, heapIndices, heapSize);
      heapSize += 1;
      continue;
    }

    if (score <= heapScores[0]) continue;
    heapScores[0] = score;
    heapIndices[0] = vertexIndex;
    siftHeapDown(heapScores, heapIndices, heapSize, 0);
  }

  return Array.from(heapIndices.subarray(0, heapSize)).sort((a, b) => a - b);
}

function fillStratifiedIndices(selectedIndices, selectionMask, startOffset, count, vertexCount) {
  if (count <= 0 || vertexCount <= 0) {
    return startOffset;
  }

  let writeOffset = startOffset;
  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const start = Math.floor((sampleIndex * vertexCount) / count);
    const end = Math.max(start + 1, Math.floor(((sampleIndex + 1) * vertexCount) / count));
    const span = Math.max(1, end - start);
    const jitter = ((sampleIndex * 2654435761) >>> 0) % span;
    let candidate = start + jitter;
    let attempts = 0;

    while (selectionMask[candidate] && attempts < span) {
      candidate = start + ((candidate - start + 1) % span);
      attempts += 1;
    }

    if (selectionMask[candidate]) {
      continue;
    }

    selectionMask[candidate] = 1;
    selectedIndices[writeOffset] = candidate;
    writeOffset += 1;
  }

  return writeOffset;
}

function createRuntimePreviewPly(sourcePath, outputPath, targetVertexCount = MAX_RUNTIME_SPLATS) {
  const sourceBuffer = readFileSync(sourcePath);
  const {
    headerText,
    elements,
    vertexElementIndex,
    vertexStride,
    vertexCount,
    vertexOffset,
  } = parseBinaryPlyHeader(sourceBuffer);

  if (vertexCount <= targetVertexCount) {
    copyFileSync(sourcePath, outputPath);
    return vertexCount;
  }

  const previewCount = Math.min(targetVertexCount, vertexCount);
  const vertexBlockLength = vertexCount * vertexStride;
  const restOffset = vertexOffset + vertexBlockLength;
  const previewVertices = Buffer.allocUnsafe(previewCount * vertexStride);
  const propertyOffsets = buildVertexPropertyOffsets(elements[vertexElementIndex].properties);
  const importanceCount = Math.min(
    previewCount,
    Math.max(24000, Math.floor(previewCount * 0.28)),
  );
  const selectedMask = new Uint8Array(vertexCount);
  const selectedIndices = new Uint32Array(previewCount);
  const importanceIndices = selectImportanceAnchors(
    sourceBuffer,
    vertexOffset,
    vertexStride,
    vertexCount,
    importanceCount,
    propertyOffsets,
  );

  let selectedCount = 0;
  for (const index of importanceIndices) {
    if (selectedMask[index]) continue;
    selectedMask[index] = 1;
    selectedIndices[selectedCount] = index;
    selectedCount += 1;
  }

  selectedCount = fillStratifiedIndices(
    selectedIndices,
    selectedMask,
    selectedCount,
    previewCount - selectedCount,
    vertexCount,
  );

  if (selectedCount < previewCount) {
    const permutationStep = chooseCoprimePermutationStep(vertexCount);
    for (let sampleIndex = 0; sampleIndex < vertexCount && selectedCount < previewCount; sampleIndex += 1) {
      const index = (sampleIndex * permutationStep) % vertexCount;
      if (selectedMask[index]) continue;
      selectedMask[index] = 1;
      selectedIndices[selectedCount] = index;
      selectedCount += 1;
    }
  }

  const sortedSelection = Array.from(selectedIndices.subarray(0, selectedCount)).sort((a, b) => a - b);
  let destOffset = 0;
  for (const index of sortedSelection) {
    const sourceStart = vertexOffset + index * vertexStride;
    sourceBuffer.copy(previewVertices, destOffset, sourceStart, sourceStart + vertexStride);
    destOffset += vertexStride;
  }

  const previewHeader = headerText.replace(
    /element vertex\s+\d+/,
    `element vertex ${selectedCount}`,
  );

  const outputBuffer = Buffer.concat([
    Buffer.from(previewHeader, 'ascii'),
    previewVertices.subarray(0, destOffset),
    sourceBuffer.subarray(restOffset),
  ]);

  writeFileSync(outputPath, outputBuffer);
  return selectedCount;
}

function parsePlyVertexCount(plyPath) {
  try {
    const fileBuffer = readFileSync(plyPath);
    const header = fileBuffer.subarray(0, 8192).toString('ascii');
    const match = header.match(/element vertex\s+(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function sampleBinaryPlyPositions(plyPath, maxSamples = 60000) {
  const buffer = readFileSync(plyPath);
  const {
    elements,
    vertexElementIndex,
    vertexStride,
    vertexCount,
    vertexOffset,
  } = parseBinaryPlyHeader(buffer);
  const properties = elements[vertexElementIndex].properties;
  const offsets = buildVertexPropertyOffsets(properties);

  if (offsets.x == null || offsets.y == null || offsets.z == null) {
    throw new Error(`PLY is missing x/y/z properties: ${plyPath}`);
  }

  const sampleCount = Math.max(1, Math.min(vertexCount, maxSamples));
  const step = Math.max(1, Math.floor(vertexCount / sampleCount));
  const positions = new Float32Array(sampleCount * 3);
  let writeIndex = 0;

  for (let vertexIndex = 0; vertexIndex < vertexCount && writeIndex < sampleCount; vertexIndex += step) {
    const baseOffset = vertexOffset + vertexIndex * vertexStride;
    positions[writeIndex * 3 + 0] = buffer.readFloatLE(baseOffset + offsets.x);
    positions[writeIndex * 3 + 1] = buffer.readFloatLE(baseOffset + offsets.y);
    positions[writeIndex * 3 + 2] = buffer.readFloatLE(baseOffset + offsets.z);
    writeIndex += 1;
  }

  return positions.subarray(0, writeIndex * 3);
}

function computeEntropy(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return 0;
  let entropy = 0;
  for (const count of counts) {
    if (!count) continue;
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function computeWorldMetricsFromPositions(positions) {
  const pointCount = Math.max(1, Math.floor(positions.length / 3));
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index + 0];
    const y = positions[index + 1];
    const z = positions[index + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const extentX = Math.max(0.0001, maxX - minX);
  const extentY = Math.max(0.0001, maxY - minY);
  const extentZ = Math.max(0.0001, maxZ - minZ);
  const widthDepthBalance = clamp(extentZ / Math.max(extentX, 0.0001), 0, 1);
  const heightDepthBalance = clamp(extentZ / Math.max(extentY * 1.8, 0.0001), 0, 1);

  const gridX = 16;
  const gridY = 10;
  const gridZ = 16;
  const occupancy = new Set();
  const depthBins = new Uint32Array(gridZ);
  const radialBins = new Uint32Array(6);
  const depthSliceCoverage = Array.from({ length: gridZ }, () => new Set());
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const radiusNormalizer = Math.max(extentX, extentY, extentZ, 0.0001) * 0.5;

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index + 0];
    const y = positions[index + 1];
    const z = positions[index + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    const normalizedX = clamp((x - minX) / extentX, 0, 0.9999);
    const normalizedY = clamp((y - minY) / extentY, 0, 0.9999);
    const normalizedZ = clamp((z - minZ) / extentZ, 0, 0.9999);
    const cellX = Math.floor(normalizedX * gridX);
    const cellY = Math.floor(normalizedY * gridY);
    const cellZ = Math.floor(normalizedZ * gridZ);
    occupancy.add(`${cellX}:${cellY}:${cellZ}`);
    depthSliceCoverage[cellZ].add(`${cellX}:${cellY}`);
    depthBins[cellZ] += 1;

    const radius = Math.hypot(x - centerX, y - centerY, z - centerZ) / radiusNormalizer;
    radialBins[Math.min(radialBins.length - 1, Math.floor(clamp(radius, 0, 1.999) * 3))] += 1;
  }

  const occupancyRatio = occupancy.size / (gridX * gridY * gridZ);
  const depthCoverage = depthBins.filter(count => count > 0).length / depthBins.length;
  const depthEntropy = computeEntropy(Array.from(depthBins)) / Math.log2(depthBins.length);
  const radialEntropy = computeEntropy(Array.from(radialBins)) / Math.log2(radialBins.length);
  const frontSheetPenalty = 1 - clamp(extentZ / Math.max(extentX * 0.55, 0.0001), 0, 1);
  const dominantDepthShare = Math.max(...depthBins) / pointCount;
  const maxDepthSliceCoverage = Math.max(
    ...depthSliceCoverage.map(slice => slice.size / (gridX * gridY)),
  );
  const frontalWallPenalty = clamp((maxDepthSliceCoverage - 0.34) / 0.36, 0, 1);
  const depthConcentrationPenalty = clamp((dominantDepthShare - 0.15) / 0.2, 0, 1);
  const score = clamp(
    occupancyRatio * 0.28
      + depthCoverage * 0.18
      + depthEntropy * 0.18
      + radialEntropy * 0.12
      + widthDepthBalance * 0.09
      + heightDepthBalance * 0.05
      - frontSheetPenalty * 0.14
      - frontalWallPenalty * 0.24
      - depthConcentrationPenalty * 0.16,
    0,
    1,
  );

  return {
    score,
    occupancyRatio,
    depthCoverage,
    depthEntropy,
    radialEntropy,
    widthDepthBalance,
    heightDepthBalance,
    frontSheetPenalty,
    dominantDepthShare,
    maxDepthSliceCoverage,
    frontalWallPenalty,
    depthConcentrationPenalty,
    samplePointCount: pointCount,
    bounds: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      extent: [extentX, extentY, extentZ],
    },
  };
}

function rotatePositionsAroundCenterY(positions, centerX, centerZ, radians) {
  if (!Number.isFinite(radians) || Math.abs(radians) < 0.000001) {
    return positions;
  }

  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const rotated = new Float32Array(positions.length);

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index + 0] - centerX;
    const y = positions[index + 1];
    const z = positions[index + 2] - centerZ;

    rotated[index + 0] = x * cosine - z * sine + centerX;
    rotated[index + 1] = y;
    rotated[index + 2] = x * sine + z * cosine + centerZ;
  }

  return rotated;
}

function normalizeAngleDegrees(value) {
  const normalized = ((value % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function scoreWorldPly(plyPath) {
  const positions = sampleBinaryPlyPositions(plyPath);
  if (!positions.length) {
    return {
      score: 0,
      bestViewScore: 0,
      orbitScore: 0,
      averageYawScore: 0,
      minYawScore: 0,
      scoreStdDev: 1,
      trajectoryConsistency: 0,
      occupancyRatio: 0,
      depthCoverage: 0,
      depthEntropy: 0,
      radialEntropy: 0,
      widthDepthBalance: 0,
      heightDepthBalance: 0,
      frontSheetPenalty: 1,
      dominantDepthShare: 1,
      maxDepthSliceCoverage: 1,
      frontalWallPenalty: 1,
      depthConcentrationPenalty: 1,
      samplePointCount: 0,
      preferredYawDegrees: 0,
      evaluatedYawCount: 0,
      bounds: {
        min: [0, 0, 0],
        max: [0, 0, 0],
        extent: [0, 0, 0],
      },
    };
  }

  const baseMetrics = computeWorldMetricsFromPositions(positions);
  const centerX = (baseMetrics.bounds.min[0] + baseMetrics.bounds.max[0]) * 0.5;
  const centerZ = (baseMetrics.bounds.min[2] + baseMetrics.bounds.max[2]) * 0.5;
  const yawCandidates = Array.from({ length: 16 }, (_, index) => index * 22.5);

  let bestYawDegrees = 0;
  let bestMetrics = baseMetrics;
  const yawEvaluations = [{
    yawDegrees: 0,
    score: baseMetrics.score,
    occupancyRatio: baseMetrics.occupancyRatio,
    frontSheetPenalty: baseMetrics.frontSheetPenalty,
    frontalWallPenalty: baseMetrics.frontalWallPenalty,
  }];

  for (const yawDegrees of yawCandidates) {
    if (yawDegrees === 0) continue;
    const rotated = rotatePositionsAroundCenterY(
      positions,
      centerX,
      centerZ,
      (yawDegrees * Math.PI) / 180,
    );
    const metrics = computeWorldMetricsFromPositions(rotated);
    yawEvaluations.push({
      yawDegrees,
      score: metrics.score,
      occupancyRatio: metrics.occupancyRatio,
      frontSheetPenalty: metrics.frontSheetPenalty,
      frontalWallPenalty: metrics.frontalWallPenalty,
    });
    if (metrics.score > bestMetrics.score) {
      bestYawDegrees = yawDegrees;
      bestMetrics = metrics;
    }
  }

  const yawScores = yawEvaluations.map(entry => entry.score);
  const averageYawScore = yawScores.reduce((sum, value) => sum + value, 0) / yawScores.length;
  const minYawScore = Math.min(...yawScores);
  const scoreVariance = yawScores.reduce((sum, value) => sum + (value - averageYawScore) ** 2, 0) / yawScores.length;
  const scoreStdDev = Math.sqrt(scoreVariance);
  const trajectoryConsistency = clamp(1 - scoreStdDev / 0.18, 0, 1);
  const orbitScore = clamp(
    averageYawScore * 0.6
      + minYawScore * 0.25
      + trajectoryConsistency * 0.15,
    0,
    1,
  );
  const finalScore = clamp(bestMetrics.score * 0.58 + orbitScore * 0.42, 0, 1);

  return {
    ...bestMetrics,
    score: finalScore,
    bestViewScore: bestMetrics.score,
    orbitScore,
    averageYawScore,
    minYawScore,
    scoreStdDev,
    trajectoryConsistency,
    preferredYawDegrees: normalizeAngleDegrees(bestYawDegrees),
    evaluatedYawCount: yawCandidates.length,
    yawEvaluations,
  };
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

  const runtimeKsplatFile = existsSync(join(worldDir, 'scene.runtime.ksplat')) ? 'scene.runtime.ksplat' : null;
  const runtimePlyFile = existsSync(join(worldDir, 'scene.runtime.ply')) ? 'scene.runtime.ply' : null;
  const sourcePlyFile = existsSync(join(worldDir, 'scene.ply'))
    ? 'scene.ply'
    : promoteFirstMatch(name => name.toLowerCase().endsWith('.ply'), 'scene.ply');
  const splatFile =
    runtimeKsplatFile ||
    promoteFirstMatch(name => name.toLowerCase().endsWith('.spz'), 'scene.spz') ||
    promoteFirstMatch(
      name => name.toLowerCase().endsWith('.ksplat') && name.toLowerCase() !== 'scene.runtime.ksplat',
      'scene.ksplat',
    ) ||
    runtimePlyFile ||
    sourcePlyFile;
  const meshFile = promoteFirstMatch(
    name => name.toLowerCase().endsWith('.glb') && name.toLowerCase() !== 'collider.glb',
    'scene.glb',
  );
  const colliderFile = existsSync(join(worldDir, 'collider.glb')) ? 'collider.glb' : null;
  const boundsPath = join(worldDir, 'bounds.json');
  const bounds = existsSync(boundsPath) ? JSON.parse(readFileSync(boundsPath, 'utf8')) : null;
  const sourceSplatFile = sourcePlyFile && sourcePlyFile !== splatFile
    ? sourcePlyFile
    : runtimePlyFile && runtimePlyFile !== splatFile
      ? runtimePlyFile
      : null;
  const runtimePlyCount = runtimePlyFile ? parsePlyVertexCount(join(worldDir, runtimePlyFile)) : null;
  const sourcePlyCount = sourcePlyFile ? parsePlyVertexCount(join(worldDir, sourcePlyFile)) : null;

  return {
    splat: toWorldRelative(splatFile),
    sourceSplat: toWorldRelative(sourceSplatFile),
    mesh: toWorldRelative(meshFile),
    collider: toWorldRelative(colliderFile),
    format:
      splatFile?.endsWith('.spz') ? 'spz'
      : splatFile?.endsWith('.ksplat') ? 'ksplat'
      : splatFile?.endsWith('.ply') ? 'ply'
      : null,
    splatCount:
      splatFile?.endsWith('.ply') ? parsePlyVertexCount(join(worldDir, splatFile))
      : splatFile?.endsWith('.ksplat') ? (runtimePlyCount ?? sourcePlyCount)
      : null,
    sourceSplatCount:
      sourceSplatFile === sourcePlyFile ? sourcePlyCount
      : sourceSplatFile === runtimePlyFile ? runtimePlyCount
      : null,
    bounds,
  };
}

function resolveRuntimePreviewTarget(meta, assets) {
  const envTarget = Number.parseInt(process.env.MAX_RUNTIME_SPLATS ?? '', 10);
  if (Number.isFinite(envTarget) && envTarget > 0) {
    return envTarget;
  }

  const explicitRuntimeTarget = meta?.world?.runtimePreviewSplatTarget ?? meta?.world?.runtimeSplatTarget;
  if (Number.isFinite(explicitRuntimeTarget) && explicitRuntimeTarget > 0) {
    return explicitRuntimeTarget;
  }

  const qualityProfile = String(
    meta?.source?.worldGenerationProfile
    || meta?.world?.generationProfile
    || '',
  ).trim().toLowerCase();
  const profileRuntimeTarget = WORLD_QUALITY_PROFILES[qualityProfile]?.runtimePreviewSplatTarget;
  if (Number.isFinite(profileRuntimeTarget) && profileRuntimeTarget > 0) {
    return profileRuntimeTarget;
  }

  const metaRuntimeTarget = meta?.world?.splat?.endsWith('scene.runtime.ply')
    ? meta?.world?.splatCount
    : null;
  if (Number.isFinite(metaRuntimeTarget) && metaRuntimeTarget > 0) {
    return metaRuntimeTarget;
  }

  const assetRuntimeTarget = assets?.splat?.endsWith('scene.runtime.ply')
    ? assets?.splatCount
    : null;
  if (Number.isFinite(assetRuntimeTarget) && assetRuntimeTarget > 0) {
    return assetRuntimeTarget;
  }

  return MAX_RUNTIME_SPLATS;
}

function shouldGenerateCompressedRuntimeSplat() {
  return process.env.WORLD_COMPRESS_RUNTIME_SPLAT !== '0';
}

async function convertPlyToKsplat(inputPath, outputPath, options = {}) {
  const {
    compressionLevel = 1,
    minimumAlpha = 1,
    sphericalHarmonicsDegree = 0,
  } = options;

  if (!globalThis.window) {
    globalThis.window = {
      setTimeout,
      clearTimeout,
    };
  } else {
    globalThis.window.setTimeout ||= setTimeout;
    globalThis.window.clearTimeout ||= clearTimeout;
  }

  const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
  const { PlyLoader } = GaussianSplats3D;
  const plyData = readFileSync(inputPath);
  const arrayBuffer = plyData.buffer.slice(plyData.byteOffset, plyData.byteOffset + plyData.byteLength);
  const splatBuffer = await PlyLoader.loadFromFileData(
    arrayBuffer,
    minimumAlpha,
    compressionLevel,
    true,
    sphericalHarmonicsDegree,
  );

  writeFileSync(outputPath, Buffer.from(splatBuffer.bufferData));
  return outputPath;
}

async function prepareRuntimeAssets(worldDir, assets, targetVertexCount = MAX_RUNTIME_SPLATS) {
  if (assets.format !== 'ply' || !assets.splat) {
    return assets;
  }

  const sourceFile = join(worldDir, assets.splat.replace(/^world\//, ''));
  const sourceCount = assets.splatCount ?? parsePlyVertexCount(sourceFile);
  let runtimeAssets = assets;
  let plyForCompression = sourceFile;
  let compressedFilename = 'scene.ksplat';

  if (sourceCount && targetVertexCount && sourceCount > targetVertexCount) {
    const runtimeFilename = 'scene.runtime.ply';
    const runtimePath = join(worldDir, runtimeFilename);
    const runtimeCount = createRuntimePreviewPly(sourceFile, runtimePath, targetVertexCount);

    runtimeAssets = {
      ...assets,
      splat: toWorldRelative(runtimeFilename),
      sourceSplat: assets.splat,
      splatCount: runtimeCount,
      sourceSplatCount: sourceCount,
    };
    plyForCompression = runtimePath;
    compressedFilename = 'scene.runtime.ksplat';
  }

  if (!shouldGenerateCompressedRuntimeSplat()) {
    return runtimeAssets;
  }

  try {
    await convertPlyToKsplat(plyForCompression, join(worldDir, compressedFilename));
    return {
      ...runtimeAssets,
      splat: toWorldRelative(compressedFilename),
      format: 'ksplat',
      splatCount: runtimeAssets.splatCount ?? sourceCount,
      sourceSplat: runtimeAssets.sourceSplat ?? assets.splat,
      sourceSplatCount: runtimeAssets.sourceSplatCount ?? sourceCount,
    };
  } catch (error) {
    console.warn(`[World Assets] KSPLAT compression failed for ${plyForCompression}: ${error.message}`);
    return runtimeAssets;
  }
}

function runSharpPrediction(inputPhoto, outputDir, sceneIdLabel = 'memory-world') {
  const sharpCommand = process.env.SHARP_CLI || (existsSync(LOCAL_SHARP_CLI) ? LOCAL_SHARP_CLI : 'sharp');
  const sharpDevice = process.env.SHARP_DEVICE || 'cpu';
  const checkpointPath = process.env.SHARP_CHECKPOINT || (existsSync(LOCAL_SHARP_CHECKPOINT) ? LOCAL_SHARP_CHECKPOINT : '');
  const tempInputDir = join(tmpdir(), `jarowe-sharp-${sceneIdLabel}-${Date.now()}`);
  const tempInputPath = join(tempInputDir, `source${extname(inputPhoto) || '.png'}`);
  mkdirSync(tempInputDir, { recursive: true });
  copyFileSync(inputPhoto, tempInputPath);

  const checkpointArg = checkpointPath ? ` -c "${checkpointPath}"` : '';
  const command = `"${sharpCommand}" predict -i "${tempInputDir}" -o "${outputDir}" --device ${sharpDevice} --no-render${checkpointArg}`;

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
}

async function generateSharpDraftAssets(inputPhoto, outputDir, sceneIdLabel) {
  runSharpPrediction(inputPhoto, outputDir, sceneIdLabel);
  const assets = normalizeGeneratedWorldAssets(outputDir);
  if (!assets.splat) {
    throw new Error('[SHARP] No .ply, .spz, or .ksplat file was produced in the world directory.');
  }
  return prepareRuntimeAssets(outputDir, assets);
}

function mergeClusterDraftPlys(inputs, outputPath) {
  if (!inputs.length) {
    throw new Error('[Expanded] No draft PLY inputs supplied for cluster composite.');
  }

  const buffers = inputs.map(input => {
    const buffer = readFileSync(input.path);
    const parsed = parseBinaryPlyHeader(buffer);
    return {
      ...input,
      buffer,
      parsed,
    };
  });

  const anchor = buffers[0];
  const vertexOffsets = buildVertexPropertyOffsets(
    anchor.parsed.elements[anchor.parsed.vertexElementIndex].properties,
  );
  const xOffset = vertexOffsets.x;
  const yOffset = vertexOffsets.y;
  const zOffset = vertexOffsets.z;

  if (xOffset == null || yOffset == null || zOffset == null) {
    throw new Error('[Expanded] Cluster composite requires x/y/z properties in the draft PLY.');
  }

  const mergedVertexBuffers = [];
  let totalVertexCount = 0;

  for (const input of buffers) {
    const { buffer, parsed, transform } = input;
    if (parsed.vertexStride !== anchor.parsed.vertexStride) {
      throw new Error('[Expanded] Draft PLY schemas do not match; cannot merge cluster views.');
    }

    const transformedVertices = Buffer.allocUnsafe(parsed.vertexCount * parsed.vertexStride);
    const scale = transform?.scale ?? 1;
    const offset = transform?.offset ?? [0, 0, 0];
    const yaw = transform?.yaw ?? 0;

    for (let index = 0; index < parsed.vertexCount; index += 1) {
      const sourceStart = parsed.vertexOffset + index * parsed.vertexStride;
      const destStart = index * parsed.vertexStride;
      buffer.copy(transformedVertices, destStart, sourceStart, sourceStart + parsed.vertexStride);

      const position = [
        buffer.readFloatLE(sourceStart + xOffset) * scale,
        buffer.readFloatLE(sourceStart + yOffset) * scale,
        buffer.readFloatLE(sourceStart + zOffset) * scale,
      ];
      const rotated = rotateAroundY(position, yaw);

      transformedVertices.writeFloatLE(rotated[0] + offset[0], destStart + xOffset);
      transformedVertices.writeFloatLE(rotated[1] + offset[1], destStart + yOffset);
      transformedVertices.writeFloatLE(rotated[2] + offset[2], destStart + zOffset);
    }

    mergedVertexBuffers.push(transformedVertices);
    totalVertexCount += parsed.vertexCount;
  }

  const mergedHeader = anchor.parsed.headerText.replace(
    /element vertex\s+\d+/,
    `element vertex ${totalVertexCount}`,
  );
  const anchorRestOffset = anchor.parsed.vertexOffset + anchor.parsed.vertexCount * anchor.parsed.vertexStride;
  const outputBuffer = Buffer.concat([
    Buffer.from(mergedHeader, 'ascii'),
    ...mergedVertexBuffers,
    anchor.buffer.subarray(anchorRestOffset),
  ]);

  writeFileSync(outputPath, outputBuffer);
  return totalVertexCount;
}

function resolveAnchorDraftPath(worldDir) {
  if (existsSync(join(worldDir, 'scene.runtime.ply'))) {
    return join(worldDir, 'scene.runtime.ply');
  }
  if (existsSync(join(worldDir, 'scene.ply'))) {
    return join(worldDir, 'scene.ply');
  }
  return null;
}

async function buildCompositeExpandedWorld(inputPhoto, worldDir, options, bundle) {
  const configuredMaxViews = Number.parseInt(
    process.env.EXPANDED_CLUSTER_MAX_VIEWS || `${DEFAULT_CLUSTER_VIEW_LIMIT}`,
    10,
  );
  const maxViews = clamp(Number.isFinite(configuredMaxViews) ? configuredMaxViews : DEFAULT_CLUSTER_VIEW_LIMIT, 2, 6);
  const rankedViews = [
    ...bundle.sourceViews.filter(view => view.role === 'primary'),
    ...bundle.generatedViews,
    ...bundle.sourceViews.filter(view => view.role !== 'primary'),
  ];
  const selectedViews = rankedViews.slice(0, maxViews);
  const transforms = createClusterViewTransforms(selectedViews.length);
  const tempWorldDirs = [];
  const plyInputs = [];

  try {
    for (let index = 0; index < selectedViews.length; index += 1) {
      const view = selectedViews[index];
      const transform = transforms[index];
      let plyPath = null;

      if (index === 0) {
        plyPath = resolveAnchorDraftPath(worldDir);
      }

      if (!plyPath) {
        const tempWorldDir = join(tmpdir(), `jarowe-cluster-${options.sceneId}-${index}-${Date.now()}`);
        mkdirSync(tempWorldDir, { recursive: true });
        tempWorldDirs.push(tempWorldDir);
        const assets = await generateSharpDraftAssets(view.absolutePath, tempWorldDir, `${options.sceneId}-cluster-${index}`);
        const draftPly = assets.sourceSplat ?? assets.splat;
        plyPath = join(tempWorldDir, draftPly.replace(/^world\//, ''));
      }

      plyInputs.push({
        path: plyPath,
        transform,
      });
    }

    const compositePath = join(worldDir, 'scene.ply');
    const compositeVertexCount = mergeClusterDraftPlys(plyInputs, compositePath);
    const compositeAssets = normalizeGeneratedWorldAssets(worldDir);
    const isCluster = bundle.strategy === 'cluster-fusion';
    const compositeStage = isCluster ? 'cluster-composite' : 'synthetic-view-composite';
    const provenanceTier = isCluster ? 'cluster-composite' : 'expanded-composite';
    const reconstruction = isCluster ? 'synthetic-cluster-composite' : 'synthetic-depth-composite';

    return {
      ...compositeAssets,
      splatCount: compositeVertexCount,
      generationMode: isCluster ? 'multi-view-cluster' : 'single-image-expanded',
      expansion: {
        strategy: bundle.strategy,
        stage: compositeStage,
        bundle: bundle.manifestRelativePath,
        sourceViewCount: bundle.sourceViews.length,
        generatedViewCount: bundle.generatedViews.length,
        totalViewCount: bundle.sourceViews.length + bundle.generatedViews.length,
        anchorGenerator: 'sharp',
        viewSynthesizer: process.env.EXPANDED_VIEW_COMMAND || process.env.MULTIVIEW_COMMAND ? 'external-command' : null,
        fusionEngine: 'cluster-composite',
        compositeViewCount: selectedViews.length,
      },
      provenance: {
        tier: provenanceTier,
        anchorGenerator: 'sharp',
        reconstruction,
        viewCount: selectedViews.length,
      },
    };
  } finally {
    for (const tempWorldDir of tempWorldDirs) {
      rmSync(tempWorldDir, { recursive: true, force: true });
    }
  }
}

function buildWorldModelAssetsResult(worldDir, meta, bundle, worldModelInputs, resolvedWorldModelOptions, scoring = null) {
  const refreshedBundle = refreshExpandedBundleManifest(
    worldDir,
    meta,
    bundle,
    'learned-scene-expansion',
  );
  const assets = normalizeGeneratedWorldAssets(worldDir);
  if (!assets.splat && !assets.mesh) {
    throw new Error(
      [
        '[World Model] Command completed but no world assets were produced.',
        'Expected at least one of: scene.ply, scene.spz, scene.ksplat, scene.glb, collider.glb in the world directory.',
      ].join('\n'),
    );
  }

  return {
    ...assets,
    generationMode: 'single-image-world-model',
    expansion: {
      strategy: 'learned-scene-expansion',
      stage: 'world-model-fused',
      bundle: refreshedBundle.manifestRelativePath,
      sourceViewCount: refreshedBundle.sourceViews.length,
      generatedViewCount: refreshedBundle.generatedViews.length,
      totalViewCount: refreshedBundle.sourceViews.length + refreshedBundle.generatedViews.length,
      anchorGenerator: 'source-photo',
      viewSynthesizer: 'world-model',
      fusionEngine: 'world-model',
      environmentBootstrap: worldModelInputs.environmentBootstrap ?? undefined,
    },
    provenance: {
      tier: 'world-model-fused',
      anchorGenerator: 'source-photo',
      reconstruction: 'single-image-world-model',
      viewCount: refreshedBundle.sourceViews.length + refreshedBundle.generatedViews.length,
    },
    environmentBootstrap: worldModelInputs.environmentBootstrap,
    worldGenerationProfile: resolvedWorldModelOptions.qualityProfile,
    worldGenerationFamily: resolvedWorldModelOptions.worldFamily ?? DEFAULT_WORLD_FAMILY,
    worldGenerationFamilies: resolvedWorldModelOptions.worldFamilies ?? [resolvedWorldModelOptions.worldFamily ?? DEFAULT_WORLD_FAMILY],
    runtimePreviewSplatTarget: resolvedWorldModelOptions.runtimePreviewSplatTarget,
    worldSelection: scoring ?? undefined,
  };
}

function resolveFamilySpecificWorldModelCommand(worldFamily) {
  if (worldFamily === 'camera-guided') {
    return process.env.WORLD_MODEL_CAMERA_GUIDED_COMMAND
      || process.env.CAMERA_GUIDED_WORLD_COMMAND
      || process.env.STABLE_VIRTUAL_CAMERA_WORLD_COMMAND
      || '';
  }
  if (worldFamily === 'structured-anchor') {
    return process.env.WORLD_MODEL_STRUCTURED_COMMAND
      || process.env.STRUCTURED_WORLD_COMMAND
      || '';
  }
  if (worldFamily === 'pano-first') {
    return process.env.WORLD_MODEL_PANO_FIRST_COMMAND
      || process.env.PANO_FIRST_WORLD_COMMAND
      || '';
  }
  return '';
}

function executeSingleImageWorldModelRun(inputPhoto, worldDir, options) {
  const { meta, sceneDir, sceneId, worldModelOptions = {} } = options;
  const resolvedWorldModelOptions = resolveWorldModelOptions(meta, worldModelOptions);
  const worldModelInputs = buildEnvironmentBootstrapImage(
    sceneDir,
    worldDir,
    inputPhoto,
    meta,
    resolvedWorldModelOptions,
  );
  const synthesizedPrompt = buildWorldModelPrompt(meta, {
    promptOverride: resolvedWorldModelOptions.prompt,
    subjectErasedBootstrap: Boolean(worldModelInputs.environmentBootstrap),
  });
  const templateVariables = {
    input: worldModelInputs.worldInputPath,
    output: worldDir,
    sceneId,
    sceneDir,
    worldDir,
    primary: worldModelInputs.worldInputPath,
    bootstrap: worldModelInputs.environmentBootstrap?.image
      ? resolve(sceneDir, worldModelInputs.environmentBootstrap.image)
      : '',
    subjectInput: worldModelInputs.subjectInputPath,
    mask: worldModelInputs.maskPath,
    prompt: synthesizedPrompt,
    seed: resolvedWorldModelOptions.seed,
    resolution: resolvedWorldModelOptions.resolution,
    worldFamily: resolvedWorldModelOptions.worldFamily,
    useSharp: resolvedWorldModelOptions.useSharp,
    inpaintBg: resolvedWorldModelOptions.inpaintBg,
    lowVram: resolvedWorldModelOptions.lowVram,
  };
  const familySpecificCommand = resolveFamilySpecificWorldModelCommand(resolvedWorldModelOptions.worldFamily);
  const usingDedicatedFamilyCommand = Boolean(familySpecificCommand);
  const worldModelCommand =
    familySpecificCommand ||
    process.env.SINGLE_IMAGE_WORLD_COMMAND ||
    process.env.WORLD_MODEL_COMMAND ||
    buildDefaultWorldModelCommand(templateVariables);
  if (!worldModelCommand) {
    throw new Error(
      [
        '[World Model] No command configured.',
        'Set SINGLE_IMAGE_WORLD_COMMAND or WORLD_MODEL_COMMAND to a working single-image world generator,',
        'or set WORLD_MODEL_BACKEND=worldgen to use the local backend wrapper.',
        'On Windows, the default path now prefers a WSL backend if available.',
        'Supported placeholders:',
        '  {input} {primary} {bootstrap} {subjectInput} {mask} {output} {worldDir} {sceneDir} {sceneId} {bundleDir} {sourceDir} {generatedDir} {bundleJson} {worldFamily}',
      ].join('\n'),
    );
  }

  const bundle = buildExpandedViewBundleWithOptions(sceneDir, worldDir, sceneId, meta, {
    allowExternalViewCommand: false,
    allowLocalDepthSynthesis: false,
    includePostImages: false,
  });

  try {
    const commandVariables = {
      input: worldModelInputs.worldInputPath,
      output: worldDir,
      sceneId,
      sceneDir,
      worldDir,
      bundleDir: bundle.bundleRoot,
      sourceDir: bundle.sourceDir,
      generatedDir: bundle.generatedDir,
      primary: worldModelInputs.worldInputPath,
      bundleJson: join(worldDir, 'view-bundle.json'),
      bootstrap: worldModelInputs.environmentBootstrap?.image
        ? resolve(sceneDir, worldModelInputs.environmentBootstrap.image)
        : '',
      subjectInput: worldModelInputs.subjectInputPath,
      mask: worldModelInputs.maskPath,
      prompt: synthesizedPrompt,
      seed: resolvedWorldModelOptions.seed,
      resolution: resolvedWorldModelOptions.resolution,
      worldFamily: resolvedWorldModelOptions.worldFamily,
      useSharp: resolvedWorldModelOptions.useSharp,
      inpaintBg: resolvedWorldModelOptions.inpaintBg,
      lowVram: resolvedWorldModelOptions.lowVram,
    };
    const command = worldModelCommand.includes('{')
      ? expandCommandTemplate(worldModelCommand, commandVariables)
      : worldModelCommand;

    if (!usingDedicatedFamilyCommand && resolvedWorldModelOptions.worldFamily !== DEFAULT_WORLD_FAMILY) {
      console.warn(
        `[World Model] No dedicated command configured for "${resolvedWorldModelOptions.worldFamily}". Falling back to the default backend for this family.`,
      );
    }
    console.log(`\n[World Model] Running (${resolvedWorldModelOptions.worldFamily}): ${command}\n`);
    const result = runShellCommand(command);
    if (result.stdout?.trim()) console.log(result.stdout.trim());
    if (result.stderr?.trim()) console.log(result.stderr.trim());

    if (result.status !== 0) {
      throw new Error(
        [
          '[World Model] Single-image world generation failed.',
          `Command: ${command}`,
          result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
        ].join('\n'),
      );
    }

    const scorePath = join(worldDir, 'scene.ply');
    const scoring = existsSync(scorePath)
      ? {
        worldFamily: resolvedWorldModelOptions.worldFamily,
        prompt: synthesizedPrompt,
        seed: resolvedWorldModelOptions.seed,
        metrics: scoreWorldPly(scorePath),
      }
      : null;

    return buildWorldModelAssetsResult(
      worldDir,
      meta,
      bundle,
      worldModelInputs,
      resolvedWorldModelOptions,
      scoring,
    );
  } finally {
    rmSync(bundle.bundleRoot, { recursive: true, force: true });
  }
}

async function runSingleImageWorldModel(inputPhoto, worldDir, options) {
  const { meta, sceneDir, sceneId, worldModelOptions = {} } = options;
  const resolvedWorldModelOptions = resolveWorldModelOptions(meta, worldModelOptions);
  const candidateConfigs = buildWorldModelCandidateConfigs(meta, resolvedWorldModelOptions);

  if (candidateConfigs.length <= 1) {
    return executeSingleImageWorldModelRun(inputPhoto, worldDir, {
      ...options,
      worldModelOptions: {
        ...resolvedWorldModelOptions,
        prompt: candidateConfigs[0]?.prompt ?? resolvedWorldModelOptions.prompt,
        seed: candidateConfigs[0]?.seed ?? resolvedWorldModelOptions.seed,
      },
    });
  }

  const candidateRoot = join(worldDir, 'candidates');
  mkdirSync(candidateRoot, { recursive: true });
  const candidateResults = [];

  for (const candidate of candidateConfigs) {
    const candidateWorldDir = join(candidateRoot, candidate.id);
    rmSync(candidateWorldDir, { recursive: true, force: true });
    mkdirSync(candidateWorldDir, { recursive: true });
    console.log(`\n[World Model] Generating ${candidate.id} seed=${candidate.seed}\n`);
    const result = executeSingleImageWorldModelRun(inputPhoto, candidateWorldDir, {
      ...options,
      worldModelOptions: {
        ...resolvedWorldModelOptions,
        worldFamily: candidate.family,
        worldFamilies: [candidate.family],
        prompt: candidate.prompt,
        seed: candidate.seed,
        candidates: 1,
      },
    });
    candidateResults.push({
      id: candidate.id,
      family: candidate.family,
      familyLabel: candidate.familyLabel,
      prompt: candidate.prompt,
      seed: candidate.seed,
      worldDir: candidateWorldDir,
      result,
      score: result.worldSelection?.metrics?.score ?? 0,
    });
  }

  candidateResults.sort((left, right) => right.score - left.score);
  const winner = candidateResults[0];
  const worldFiles = [
    'scene.ply',
    'scene.runtime.ply',
    'scene.spz',
    'scene.ksplat',
    'scene.runtime.ksplat',
    'scene.glb',
    'collider.glb',
    'bounds.json',
    'bootstrap.environment.png',
    'scene.pano.cleaned.png',
    'scene.pano.subject-mask.png',
  ];

  cleanWorldAssets(worldDir);
  for (const filename of worldFiles) {
    const sourcePath = join(winner.worldDir, filename);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, join(worldDir, filename));
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sceneId,
    selectedCandidate: winner.id,
    selectedScore: winner.score,
    selectedFamily: winner.family,
    candidates: candidateResults.map(candidate => ({
      id: candidate.id,
      family: candidate.family,
      familyLabel: candidate.familyLabel,
      seed: candidate.seed,
      prompt: candidate.prompt,
      score: candidate.score,
      metrics: candidate.result.worldSelection?.metrics ?? null,
    })),
  };
  writeFileSync(join(candidateRoot, 'scores.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');

  return {
    ...winner.result,
    worldSelection: summary,
  };
}

function detectExistingAssets(worldDir) {
  const normalized = normalizeGeneratedWorldAssets(worldDir);
  return normalized.splat ? normalized : null;
}

function updateMetaWithAssets(meta, assets) {
  meta.source.generator = assets.generator || meta.source.generator || 'external';
  meta.source.generated = assets.generated || meta.source.generated || TODAY;
  if (assets.worldGenerationProfile) {
    meta.source.worldGenerationProfile = assets.worldGenerationProfile;
  }
  if (assets.worldGenerationFamily) {
    meta.source.worldGenerationFamily = assets.worldGenerationFamily;
  }
  if (Array.isArray(assets.worldGenerationFamilies) && assets.worldGenerationFamilies.length) {
    meta.source.worldGenerationFamilies = [...assets.worldGenerationFamilies];
  }
  if (assets.generationMode) {
    meta.source.generationMode = assets.generationMode;
  }
  const worldFramingAnalysis = analyzeWorldFraming(meta);
  if (worldFramingAnalysis) {
    meta.source.worldFramingAnalysis = worldFramingAnalysis;
  }
  if (assets.environmentBootstrap) {
    meta.source.environmentBootstrap = assets.environmentBootstrap;
  }
  if (assets.expansion) {
    meta.source.expansion = {
      ...(meta.source.expansion ?? {}),
      ...assets.expansion,
    };
  }
  if (assets.worldSelection) {
    meta.source.worldSelection = assets.worldSelection;
  }
  const existingWorld = meta.world ?? {};
  meta.world = {
    ...existingWorld,
    splat: assets.splat,
    sourceSplat: assets.sourceSplat ?? null,
    mesh: assets.mesh,
    collider: assets.collider,
    format: assets.format,
    splatCount: assets.splatCount ?? null,
    sourceSplatCount: assets.sourceSplatCount ?? null,
    bounds: assets.bounds ?? null,
    runtimePreviewSplatTarget: assets.runtimePreviewSplatTarget ?? existingWorld.runtimePreviewSplatTarget ?? null,
    generationProfile: assets.worldGenerationProfile ?? existingWorld.generationProfile ?? null,
    generationFamily: assets.worldGenerationFamily ?? existingWorld.generationFamily ?? null,
    selection: assets.worldSelection ?? existingWorld.selection ?? null,
    transform: assets.transform ?? existingWorld.transform ?? null,
    provenance: assets.provenance ?? existingWorld.provenance ?? null,
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

function getDefaultWorldModelPython() {
  if (process.env.WORLD_MODEL_PYTHON) {
    return process.env.WORLD_MODEL_PYTHON;
  }
  return process.platform === 'win32' ? 'py -3.12' : 'python3';
}

function shouldUseWslWorldModelBackend() {
  if (process.env.WORLD_MODEL_USE_WSL === '1') return true;
  if (process.env.WORLD_MODEL_USE_WSL === '0') return false;
  return process.platform === 'win32';
}

function getDefaultWorldModelWslDistro() {
  return process.env.WORLD_MODEL_WSL_DISTRO || 'Ubuntu';
}

function getDefaultWorldModelWslVenv(backend = 'worldgen') {
  if (backend === 'vistadream') {
    return process.env.VISTADREAM_WSL_VENV
      || process.env.WORLD_MODEL_CAMERA_GUIDED_WSL_VENV
      || '$HOME/.venvs/vistadream';
  }
  return process.env.WORLD_MODEL_WSL_VENV
    || process.env.WORLDGEN_WSL_VENV
    || '$HOME/.venvs/worldgen312';
}

function getWslEnvPythonPath(wslVenv) {
  const trimmed = String(wslVenv || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'python';
  return `${trimmed}/bin/python`;
}

function getDefaultWorldModelWslPython(backend = 'worldgen') {
  if (backend === 'vistadream') {
    return process.env.VISTADREAM_WSL_PYTHON
      || process.env.WORLD_MODEL_CAMERA_GUIDED_WSL_PYTHON
      || getWslEnvPythonPath(getDefaultWorldModelWslVenv('vistadream'));
  }
  return process.env.WORLD_MODEL_WSL_PYTHON
    || process.env.WORLDGEN_WSL_PYTHON
    || getWslEnvPythonPath(getDefaultWorldModelWslVenv('worldgen'));
}

function getDefaultWorldModelBackendRoot(backend = 'worldgen') {
  if (backend === 'vistadream') {
    return process.env.VISTADREAM_ROOT || join(ROOT, '_experiments', 'VistaDream');
  }
  return process.env.WORLDGEN_ROOT || join(ROOT, '_experiments', 'WorldGen');
}

function buildWorldModelArgumentList(variables = {}) {
  const args = [
    ['--backend', variables.backend],
    ['--input', variables.primary ?? variables.input ?? ''],
    ['--output', variables.worldDir ?? variables.output ?? ''],
    ['--generated-views', variables.generatedDir ?? ''],
    ['--scene-id', variables.sceneId ?? ''],
  ];

  if (variables.subjectInput) args.push(['--subject-input', variables.subjectInput]);
  if (variables.mask) args.push(['--mask', variables.mask]);
  if (variables.prompt) args.push(['--prompt', variables.prompt]);
  if (variables.worldFamily) args.push(['--world-family', variables.worldFamily]);
  if (Number.isFinite(variables.seed)) args.push(['--seed', `${variables.seed}`]);
  if (Number.isFinite(variables.resolution)) args.push(['--resolution', `${variables.resolution}`]);
  if (variables.useSharp === true) args.push(['--use-sharp', null]);
  if (variables.useSharp === false) args.push(['--no-sharp', null]);
  if (variables.inpaintBg === true) args.push(['--inpaint-bg', null]);
  if (variables.inpaintBg === false) args.push(['--no-inpaint-bg', null]);
  if (variables.lowVram === true) args.push(['--low-vram', null]);

  return args;
}

function buildDefaultWorldModelWslCommand(backend, variables = {}) {
  const wrapperPath = toWslPath(LOCAL_WORLD_MODEL_WRAPPER);
  const backendRoot = toWslPath(getDefaultWorldModelBackendRoot(backend));
  const worldModelArgs = buildWorldModelArgumentList({
    ...variables,
    backend,
    input: toWslPath(variables.input ?? ''),
    primary: toWslPath(variables.primary ?? ''),
    bootstrap: toWslPath(variables.bootstrap ?? ''),
    subjectInput: toWslPath(variables.subjectInput ?? ''),
    mask: toWslPath(variables.mask ?? ''),
    output: toWslPath(variables.output ?? ''),
    worldDir: toWslPath(variables.worldDir ?? ''),
    generatedDir: toWslPath(variables.generatedDir ?? ''),
  })
    .map(([flag, value]) => value == null ? flag : `${flag} ${shellQuoteBash(value)}`)
    .join(' ');
  const backendExports = backend === 'vistadream'
    ? [`export VISTADREAM_ROOT=${shellQuoteBash(backendRoot)}`]
    : [`export WORLDGEN_ROOT=${shellQuoteBash(backendRoot)}`];
  const bashCommand = [
    ...backendExports,
    [
      getDefaultWorldModelWslPython(backend),
      shellQuoteBash(wrapperPath),
      worldModelArgs,
    ].join(' '),
  ].join(' && ');

  return `wsl -d ${getDefaultWorldModelWslDistro()} -- bash -lc ${JSON.stringify(bashCommand)}`;
}

function buildDefaultWorldModelCommand(variables = {}) {
  const backend = (
    (variables.worldFamily === 'camera-guided'
      ? process.env.WORLD_MODEL_CAMERA_GUIDED_BACKEND || 'vistadream'
      : variables.worldFamily === 'structured-anchor'
        ? process.env.WORLD_MODEL_STRUCTURED_BACKEND
        : variables.worldFamily === 'pano-first'
          ? process.env.WORLD_MODEL_PANO_FIRST_BACKEND
          : '')
    || process.env.WORLD_MODEL_BACKEND
    || 'worldgen'
  ).trim().toLowerCase();
  if (!backend || !existsSync(LOCAL_WORLD_MODEL_WRAPPER)) {
    return '';
  }

  if (shouldUseWslWorldModelBackend()) {
    return buildDefaultWorldModelWslCommand(backend, variables);
  }

  const worldModelArgs = buildWorldModelArgumentList({
    ...variables,
    backend,
  })
    .map(([flag, value]) => value == null ? flag : `${flag} ${shellQuoteWin(value)}`)
    .join(' ');

  return [
    getDefaultWorldModelPython(),
    `"${LOCAL_WORLD_MODEL_WRAPPER}"`,
    worldModelArgs,
  ].join(' ');
}

const GENERATORS = {
  sharp: {
    name: 'SHARP',
    description: 'Apple SHARP single-image Gaussian splat generation',
    requirements: 'Python 3.10+, CUDA GPU, SHARP CLI installed (`pip install "sharp[f3d]"`)',
    async run(inputPhoto, worldDir, options) {
      const assets = await generateSharpDraftAssets(inputPhoto, worldDir, options.sceneId);
      if (!assets.splat) {
        throw new Error('[SHARP] No .ply, .spz, or .ksplat file was produced in the world directory.');
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

  'world-model': {
    name: 'World Model',
    description: 'Single-image scene/world completion + fused splat generation',
    requirements: 'External single-image world-model command configured via SINGLE_IMAGE_WORLD_COMMAND or WORLD_MODEL_COMMAND',
    async run(inputPhoto, worldDir, options) {
      return runSingleImageWorldModel(inputPhoto, worldDir, options);
    },
  },

  expanded: {
    name: 'Expanded',
    description: 'Single-image anchor + synthetic/multi-view bundle + fused world registration',
    requirements: 'Optional external view synthesis and reconstruction commands; falls back to SHARP anchor draft',
    async run(inputPhoto, worldDir, options) {
      const { meta, sceneDir, sceneId, existingAssets } = options;
      const wantsWorldModel = !meta.source?.postImages?.length &&
        Boolean(
          process.env.SINGLE_IMAGE_WORLD_COMMAND ||
          process.env.WORLD_MODEL_COMMAND ||
          process.env.WORLD_MODEL_BACKEND,
        );
      if (wantsWorldModel) {
        return runSingleImageWorldModel(inputPhoto, worldDir, options);
      }

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

        if (
          ((bundle.strategy === 'cluster-fusion' && bundle.sourceViews.length > 1) ||
            (bundle.strategy === 'synthetic-multiview-fusion' && bundle.generatedViews.length > 0)) &&
          !['cluster-composite', 'expanded-composite'].includes(meta.world?.provenance?.tier)
        ) {
          return await buildCompositeExpandedWorld(inputPhoto, worldDir, options, bundle);
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
    description: 'World Labs Marble API — ceiling-reference world generation',
    requirements: 'MARBLE_API_KEY env var (get at https://platform.worldlabs.ai/)',
    async run(photoPath, worldDir, { sceneId, meta, worldModelOptions }) {
      const apiKey = process.env.MARBLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          '[Marble] MARBLE_API_KEY is not set.\n'
          + 'Get an API key at https://platform.worldlabs.ai/ and set it:\n'
          + '  set MARBLE_API_KEY=your-key',
        );
      }

      const marbleBackend = join(__dirname, 'run_marble_backend.mjs');
      const model = process.env.MARBLE_MODEL || 'Marble 0.1-plus';
      const splatTier = process.env.MARBLE_SPLAT_TIER || '500k';
      const prompt = worldModelOptions?.prompt
        || meta?.source?.environmentWorldModelPrompt
        || meta?.source?.worldModelPrompt
        || '';
      const seed = worldModelOptions?.seed ?? 42;

      const cmdArgs = [
        marbleBackend,
        '--input', photoPath,
        '--output', worldDir,
        '--scene-id', sceneId || '',
        '--prompt', prompt,
        '--seed', String(seed),
        '--splat-tier', splatTier,
        '--model', model,
        '--name', `${meta?.title || sceneId} - ${TODAY}`,
      ];

      console.log(`[Marble] Generating via API (model: ${model}, tier: ${splatTier})...`);
      const result = spawnSync(process.execPath, cmdArgs, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 600000, // 10 minute timeout
      });

      if (result.status !== 0) {
        throw new Error(
          `[Marble] Backend exited with code ${result.status}.\n`
          + (result.stderr?.trim() || ''),
        );
      }

      const assets = normalizeGeneratedWorldAssets(worldDir);
      if (!assets.splat) {
        throw new Error('[Marble] API completed but no splat asset was produced.');
      }

      return {
        ...assets,
        generationMode: 'marble-api',
        worldGenerationFamily: 'marble',
        provenance: {
          tier: 'marble-api',
          anchorGenerator: 'marble',
          reconstruction: 'marble',
          model,
          splatTier,
        },
      };
    },
  },
};

async function main() {
  const { sceneId, generator: generatorKey, force, worldModelOptions } = parseArgs();

  if (!sceneId) {
    console.log('Usage: node pipeline/generate-memory-world.mjs <scene-id> [--generator sharp|expanded|world-model|trellis|marble] [--force] [--quality draft|hero|ultra] [--hero] [--ultra] [--family pano-first|camera-guided|structured-anchor] [--families <csv>] [--candidates <n>] [--seed <n>] [--resolution <px>] [--prompt <text>] [--use-sharp|--no-sharp] [--inpaint-bg|--no-inpaint-bg] [--subject-erased-bootstrap|--no-subject-erased-bootstrap] [--low-vram]');
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

  if ((currentAssets?.splat || currentAssets?.mesh) && !['expanded', 'world-model'].includes(generatorKey)) {
    console.log('\nExisting world assets detected. Registering them in meta.json...');
    const runtimeAssets = await prepareRuntimeAssets(
      worldDir,
      currentAssets,
      resolveRuntimePreviewTarget(meta, currentAssets),
    );
    updateMetaWithAssets(meta, {
      ...runtimeAssets,
      generator: meta.source.generator || generatorKey,
      generated: TODAY,
      generationMode: meta.source.generationMode,
      expansion: meta.source.expansion,
      provenance: meta.world?.provenance ?? runtimeAssets.provenance,
    });
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
    worldModelOptions,
  });
  const runtimeAssets = await prepareRuntimeAssets(
    worldDir,
    generatedAssets,
    resolveRuntimePreviewTarget(meta, generatedAssets),
  );
  updateMetaWithAssets(meta, { ...runtimeAssets, generator: generatorKey, generated: TODAY });
  writeMeta(metaPath, meta);

  console.log('\nWorld asset generated and registered:');
  console.log(JSON.stringify(meta.world, null, 2));
}

main().catch(error => {
  console.error(`\nPipeline error: ${error.message}`);
  process.exit(1);
});
