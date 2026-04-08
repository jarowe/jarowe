#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEMORY_ROOT = join(ROOT, 'public', 'memory');
const VERSION_FILES = [
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

/* ── Rubric dimension weights (from GRADING-RUBRIC.md B.5) ── */
export const RUBRIC_DIMENSIONS = [
  { key: 'worldCoherence',       flag: 'coherence',   label: 'World Coherence',         weight: 0.25 },
  { key: 'explorationRange',     flag: 'exploration',  label: 'Exploration Range',       weight: 0.15 },
  { key: 'subjectPreservation',  flag: 'subject',      label: 'Subject Preservation',    weight: 0.25 },
  { key: 'artifactSeverity',     flag: 'artifacts',    label: 'Artifact Severity',       weight: 0.15 },
  { key: 'emotionalRead',        flag: 'emotion',      label: 'Emotional Read',          weight: 0.20 },
];

export const RUBRIC_VERSION = '2026-04-04';

/**
 * Compute the weighted composite from dimension scores.
 * Each dimension is 1-5. Returns a 1.00-5.00 weighted score.
 */
export function computeWeightedComposite(dimensions) {
  let weighted = 0;
  let totalWeight = 0;
  for (const dim of RUBRIC_DIMENSIONS) {
    const value = dimensions[dim.key];
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      weighted += value * dim.weight;
      totalWeight += dim.weight;
    }
  }
  if (totalWeight === 0) return null;
  // Normalize in case not all dimensions were scored
  return Math.round((weighted / totalWeight) * 100) / 100;
}

/**
 * Compute the raw composite (sum of all scored dimensions).
 */
export function computeComposite(dimensions) {
  let sum = 0;
  let count = 0;
  for (const dim of RUBRIC_DIMENSIONS) {
    const value = dimensions[dim.key];
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      sum += value;
      count += 1;
    }
  }
  return count > 0 ? sum : null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let sceneId = null;
  let source = 'current';
  let label = null;
  let notes = null;
  let grade = null;
  let favorite = false;
  let compare = false;

  // Rubric dimension scores
  const dimensions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--') && !sceneId) {
      sceneId = arg;
      continue;
    }
    if (arg === '--source') {
      source = args[index + 1] ?? source;
      index += 1;
      continue;
    }
    if (arg === '--label') {
      label = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--notes') {
      notes = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--grade') {
      grade = Number.parseFloat(args[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (arg === '--favorite') {
      favorite = true;
      continue;
    }
    if (arg === '--compare') {
      compare = true;
      continue;
    }

    // Parse rubric dimension flags
    const dimDef = RUBRIC_DIMENSIONS.find((d) => arg === `--${d.flag}`);
    if (dimDef) {
      const val = Number.parseInt(args[index + 1] ?? '', 10);
      if (val >= 1 && val <= 5) {
        dimensions[dimDef.key] = val;
      }
      index += 1;
      continue;
    }
  }

  return {
    sceneId,
    source,
    label,
    notes,
    grade: Number.isFinite(grade) ? Math.max(0, Math.min(10, grade)) : null,
    favorite,
    compare,
    dimensions,
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'world-version';
}

function timestampId(date = new Date()) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '').replace('T', '-').replace('Z', 'z');
}

function safeStatSize(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

function safeReadJson(filePath) {
  try {
    return existsSync(filePath) ? readJson(filePath) : null;
  } catch {
    return null;
  }
}

function copyOrLink(sourcePath, targetPath) {
  try {
    linkSync(sourcePath, targetPath);
  } catch {
    copyFileSync(sourcePath, targetPath);
  }
}

function sampleBinaryPlyPositions(plyPath, maxSamples = 60000) {
  const buffer = readFileSync(plyPath);
  const endOfHeader = buffer.indexOf('end_header\n');
  if (endOfHeader === -1) {
    throw new Error(`PLY header missing end_header in ${plyPath}`);
  }

  const headerText = buffer.subarray(0, endOfHeader).toString('utf8');
  const vertexMatch = headerText.match(/element vertex (\d+)/);
  if (!vertexMatch) {
    throw new Error(`PLY vertex count missing in ${plyPath}`);
  }
  const vertexCount = Number.parseInt(vertexMatch[1], 10);
  const propertyLines = headerText
    .split('\n')
    .filter(line => line.startsWith('property '))
    .map(line => line.trim());
  const offsets = {};
  let stride = 0;
  for (const line of propertyLines) {
    const parts = line.split(/\s+/);
    const type = parts[1];
    const name = parts[2];
    if (type !== 'float' && type !== 'float32') {
      throw new Error(`Unsupported PLY property type ${type} in ${plyPath}`);
    }
    offsets[name] = stride;
    stride += 4;
  }
  if (offsets.x == null || offsets.y == null || offsets.z == null) {
    throw new Error(`PLY missing xyz properties in ${plyPath}`);
  }

  const vertexOffset = endOfHeader + 'end_header\n'.length;
  const sampleCount = Math.max(1, Math.min(vertexCount, maxSamples));
  const step = Math.max(1, Math.floor(vertexCount / sampleCount));
  const positions = new Float32Array(sampleCount * 3);
  let writeIndex = 0;

  for (let vertexIndex = 0; vertexIndex < vertexCount && writeIndex < sampleCount; vertexIndex += step) {
    const baseOffset = vertexOffset + vertexIndex * stride;
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

function scoreWorldPly(plyPath) {
  const positions = sampleBinaryPlyPositions(plyPath);
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
  const maxDepthSliceCoverage = Math.max(...depthSliceCoverage.map(slice => slice.size / (gridX * gridY)));
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

function resolveSource(sceneId, worldDir, meta, sourceFlag) {
  const candidateScoresPath = join(worldDir, 'candidates', 'scores.json');
  const currentSelection = meta?.world?.selection ?? meta?.source?.worldSelection ?? safeReadJson(candidateScoresPath) ?? null;
  const explicitCandidate = sourceFlag.startsWith('candidate:') ? sourceFlag.slice('candidate:'.length) : null;
  const selectedCandidateId = currentSelection?.selectedCandidate ?? null;

  if (sourceFlag === 'current') {
    return {
      type: 'current',
      sourceId: 'current',
      sourceDir: worldDir,
      candidateSummary: selectedCandidateId
        ? currentSelection?.candidates?.find(candidate => candidate.id === selectedCandidateId) ?? null
        : null,
    };
  }

  const candidateId = sourceFlag === 'selected-candidate'
    ? selectedCandidateId
    : explicitCandidate;
  if (!candidateId) {
    throw new Error(`Could not resolve candidate source "${sourceFlag}" for ${sceneId}`);
  }

  const candidateSummary = currentSelection?.candidates?.find(candidate => candidate.id === candidateId) ?? null;
  const candidateDir = join(worldDir, 'candidates', candidateId);
  if (!existsSync(candidateDir)) {
    throw new Error(`Candidate directory not found: ${candidateDir}`);
  }

  return {
    type: 'candidate',
    sourceId: candidateId,
    sourceDir: candidateDir,
    candidateSummary,
  };
}

function main() {
  const { sceneId, source, label, notes, grade, favorite, compare, dimensions } = parseArgs();
  if (!sceneId) {
    console.log(`Usage: node pipeline/grade-memory-world.mjs <scene-id> [options]

Options:
  --source current|selected-candidate|candidate:<id>
  --label <name>
  --notes <text>
  --grade 0-10          Legacy overall grade
  --favorite            Mark as favorite version

Rubric dimensions (1-5 each):
  --coherence <1-5>     World Coherence
  --exploration <1-5>   Exploration Range
  --subject <1-5>       Subject Preservation
  --artifacts <1-5>     Artifact Severity
  --emotion <1-5>       Emotional Read

  --compare             Show comparison summary for all evaluated families`);
    process.exit(1);
  }

  const sceneDir = join(MEMORY_ROOT, sceneId);
  const metaPath = join(sceneDir, 'meta.json');
  if (!existsSync(metaPath)) {
    throw new Error(`meta.json not found: ${metaPath}`);
  }

  const meta = readJson(metaPath);
  const worldDir = join(sceneDir, 'world');
  if (!existsSync(worldDir)) {
    throw new Error(`world directory not found: ${worldDir}`);
  }

  // ── Compare mode: summarize all evaluations for this scene ──
  if (compare) {
    const grades = meta?.world?.grades;
    if (!grades?.evaluations?.length) {
      console.log(JSON.stringify({ sceneId, families: [], message: 'No rubric evaluations found.' }, null, 2));
      process.exit(0);
    }
    const families = new Map();
    for (const ev of grades.evaluations) {
      const key = ev.family || 'unknown';
      if (!families.has(key) || (ev.weightedComposite ?? 0) > (families.get(key).weightedComposite ?? 0)) {
        families.set(key, ev);
      }
    }
    const sorted = [...families.values()].sort((a, b) => (b.weightedComposite ?? 0) - (a.weightedComposite ?? 0));
    console.log(JSON.stringify({
      sceneId,
      families: sorted.map((ev) => ({
        family: ev.family,
        weightedComposite: ev.weightedComposite,
        composite: ev.composite,
        machineScore: ev.machineScore ?? null,
        dealBreaker: ev.dealBreaker ?? null,
      })),
      winner: grades.winner ?? null,
    }, null, 2));
    process.exit(0);
  }

  const resolved = resolveSource(sceneId, worldDir, meta, source);
  const versionRoot = join(worldDir, 'versions');
  mkdirSync(versionRoot, { recursive: true });
  const versionLabel = label || `${sceneId}-${resolved.sourceId}`;
  const versionId = `${timestampId()}--${slugify(versionLabel)}`;
  const versionDir = join(versionRoot, versionId);
  mkdirSync(versionDir, { recursive: true });

  const linkedFiles = [];
  for (const filename of VERSION_FILES) {
    const sourcePath = join(resolved.sourceDir, filename);
    if (!existsSync(sourcePath)) continue;
    const targetPath = join(versionDir, filename);
    copyOrLink(sourcePath, targetPath);
    linkedFiles.push({
      filename,
      size: safeStatSize(sourcePath),
    });
  }

  const plyPath = existsSync(join(resolved.sourceDir, 'scene.ply'))
    ? join(resolved.sourceDir, 'scene.ply')
    : existsSync(join(resolved.sourceDir, 'scene.runtime.ply'))
      ? join(resolved.sourceDir, 'scene.runtime.ply')
      : null;
  const machineMetrics = plyPath ? scoreWorldPly(plyPath) : null;
  const scoresSummaryPath = join(worldDir, 'candidates', 'scores.json');
  const currentSelection = meta?.world?.selection ?? meta?.source?.worldSelection ?? safeReadJson(scoresSummaryPath);
  const candidateSummary = resolved.candidateSummary
    ?? currentSelection?.candidates?.find(candidate => candidate.id === resolved.sourceId)
    ?? null;

  // ── Compute rubric composites if any dimension was provided ──
  const hasDimensions = Object.keys(dimensions).length > 0;
  const weightedComposite = hasDimensions ? computeWeightedComposite(dimensions) : null;
  const composite = hasDimensions ? computeComposite(dimensions) : null;

  const review = {
    versionId,
    createdAt: new Date().toISOString(),
    sceneId,
    sceneTitle: meta.title,
    label: versionLabel,
    source: {
      type: resolved.type,
      id: resolved.sourceId,
      dir: resolved.sourceDir.replaceAll('\\', '/'),
    },
    humanReview: {
      grade,
      rubric: hasDimensions ? {
        rubricVersion: RUBRIC_VERSION,
        ...dimensions,
        composite,
        weightedComposite,
      } : null,
      notes: notes ?? null,
      favorite,
    },
    generation: {
      generator: meta?.source?.generator ?? null,
      generationMode: meta?.source?.generationMode ?? null,
      qualityProfile: meta?.source?.worldGenerationProfile ?? meta?.world?.generationProfile ?? null,
      worldFamily: candidateSummary?.family ?? meta?.source?.worldGenerationFamily ?? meta?.world?.generationFamily ?? null,
      framing: meta?.source?.worldFramingAnalysis ?? null,
      prompt: candidateSummary?.prompt ?? meta?.source?.environmentWorldModelPrompt ?? meta?.source?.worldModelPrompt ?? null,
      seed: candidateSummary?.seed ?? null,
      candidateScore: candidateSummary?.score ?? null,
      candidateMetrics: candidateSummary?.metrics ?? null,
    },
    subject3d: meta?.subject3d ? {
      mode: meta.subject3d.mode ?? null,
      mesh: meta.subject3d.mesh ?? null,
      pointCloud: meta.subject3d.pointCloud ?? null,
      preview: meta.subject3d.preview ?? null,
      transform: meta.subject3d.transform ?? null,
      provenance: meta.subject3d.provenance ?? null,
    } : null,
    machineReview: machineMetrics,
    files: linkedFiles,
  };
  writeJson(join(versionDir, 'review.json'), review);

  const indexPath = join(versionRoot, 'index.json');
  const index = safeReadJson(indexPath) ?? { sceneId, updatedAt: null, versions: [] };
  index.updatedAt = review.createdAt;
  index.versions = [
    {
      versionId,
      createdAt: review.createdAt,
      label: versionLabel,
      sourceType: resolved.type,
      sourceId: resolved.sourceId,
      grade,
      rubric: review.humanReview.rubric ?? null,
      favorite,
      candidateScore: review.generation.candidateScore,
      worldFamily: review.generation.worldFamily,
      machineScore: machineMetrics?.score ?? null,
      notes: notes ?? null,
      dir: versionDir.replaceAll('\\', '/'),
    },
    ...(Array.isArray(index.versions) ? index.versions : []),
  ];
  writeJson(indexPath, index);

  // ── Update world.grades in meta.json ──
  if (hasDimensions || favorite) {
    const worldFamily = review.generation.worldFamily || 'unknown';

    if (hasDimensions) {
      if (!meta.world) meta.world = {};
      if (!meta.world.grades) {
        meta.world.grades = { rubricVersion: RUBRIC_VERSION, evaluations: [], winner: null };
      }

      const evaluation = {
        family: worldFamily,
        date: new Date().toISOString().slice(0, 10),
        evaluator: 'jared',
        ...dimensions,
        composite,
        weightedComposite,
        machineScore: machineMetrics?.score ?? null,
        notes: notes ?? null,
        dealBreaker: null,
        versionId,
      };
      meta.world.grades.evaluations.push(evaluation);
    }

    if (favorite) {
      meta.world = {
        ...(meta.world ?? {}),
        favoriteVersion: versionId,
      };
      meta.source = {
        ...(meta.source ?? {}),
        favoriteWorldVersion: versionId,
      };
    }

    writeJson(metaPath, meta);
  }

  console.log(JSON.stringify({
    versionId,
    versionDir,
    grade,
    rubric: review.humanReview.rubric ?? null,
    favorite,
    machineScore: machineMetrics?.score ?? null,
    candidateScore: review.generation.candidateScore,
    files: linkedFiles.length,
  }, null, 2));
}

main();
