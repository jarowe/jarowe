#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEMORY_ROOT = join(ROOT, 'public', 'memory');
const TODAY = new Date().toISOString().split('T')[0];
const SUBJECT_FILES = [
  'subject.glb',
  'subject.ply',
  'subject.preview.png',
  'subject.meta.json',
];

function parseArgs() {
  const args = process.argv.slice(2);
  let sceneId = null;
  let backend = null;
  let force = false;
  let mode = null;
  let supportMode = null;
  let label = null;
  let notes = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--') && !sceneId) {
      sceneId = arg;
      continue;
    }
    if (arg === '--backend') {
      backend = args[index + 1] ?? backend;
      index += 1;
      continue;
    }
    if (arg === '--mode') {
      mode = args[index + 1] ?? mode;
      index += 1;
      continue;
    }
    if (arg === '--support-mode') {
      supportMode = args[index + 1] ?? supportMode;
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
    if (arg === '--force') {
      force = true;
    }
  }

  return {
    sceneId,
    backend: backend ?? null,
    force,
    mode,
    supportMode,
    label,
    notes,
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'subject-version';
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

function copyOrLink(sourcePath, targetPath) {
  try {
    linkSync(sourcePath, targetPath);
  } catch {
    copyFileSync(sourcePath, targetPath);
  }
}

function runShellCommand(command, cwd = ROOT) {
  return spawnSync(command, {
    cwd,
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
}

function resolveBackend(meta, requestedBackend, sceneDir) {
  if (requestedBackend) return requestedBackend;
  if (existsSync(join(sceneDir, 'subject.glb')) || existsSync(join(sceneDir, 'subject.ply'))) {
    return 'existing';
  }
  return meta?.subject3d?.provenance?.backend ?? 'sam3d-body';
}

function cleanSubjectAssets(sceneDir) {
  for (const filename of SUBJECT_FILES) {
    rmSync(join(sceneDir, filename), { force: true });
  }
}

function normalizeGeneratedSubjectAssets(sourceDir, sceneDir) {
  const entries = readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name);

  const promoteFirstMatch = (predicate, targetName) => {
    const targetPath = join(sceneDir, targetName);
    if (existsSync(targetPath)) return targetName;
    const match = entries.find(predicate);
    if (!match) return null;
    copyFileSync(join(sourceDir, match), targetPath);
    return targetName;
  };

  const mesh = existsSync(join(sceneDir, 'subject.glb'))
    ? 'subject.glb'
    : promoteFirstMatch(name => name.toLowerCase().endsWith('.glb'), 'subject.glb');
  const pointCloud = existsSync(join(sceneDir, 'subject.ply'))
    ? 'subject.ply'
    : promoteFirstMatch(name => name.toLowerCase().endsWith('.ply'), 'subject.ply');
  const preview = existsSync(join(sceneDir, 'subject.preview.png'))
    ? 'subject.preview.png'
    : promoteFirstMatch(name => {
      const normalized = name.toLowerCase();
      return normalized.endsWith('.png') && (normalized.includes('subject') || normalized.includes('preview'));
    }, 'subject.preview.png');
  const metaFile = existsSync(join(sceneDir, 'subject.meta.json'))
    ? 'subject.meta.json'
    : promoteFirstMatch(name => {
      const normalized = name.toLowerCase();
      return normalized.endsWith('.json') && normalized !== 'meta.json' && normalized.includes('subject');
    }, 'subject.meta.json');

  return {
    mesh,
    pointCloud,
    preview,
    metaFile,
  };
}

function readCurrentSubjectAssets(sceneDir) {
  return {
    mesh: existsSync(join(sceneDir, 'subject.glb')) ? 'subject.glb' : null,
    pointCloud: existsSync(join(sceneDir, 'subject.ply')) ? 'subject.ply' : null,
    preview: existsSync(join(sceneDir, 'subject.preview.png')) ? 'subject.preview.png' : null,
    metaFile: existsSync(join(sceneDir, 'subject.meta.json')) ? 'subject.meta.json' : null,
  };
}

function buildSubjectBackendCommand(backend, variables = {}) {
  if (backend === 'existing') {
    return '';
  }

  const template = backend === 'sam3d-body'
    ? (process.env.SAM3D_BODY_COMMAND || process.env.SUBJECT3D_COMMAND || '')
    : (process.env.SUBJECT3D_COMMAND || '');

  if (!template) {
    throw new Error(
      backend === 'sam3d-body'
        ? [
          '[SAM3D Body] No command configured.',
          'Set SAM3D_BODY_COMMAND (or SUBJECT3D_COMMAND) with placeholders like:',
          'python tools\\run_sam3d_body.py --input "{input}" --mask "{mask}" --output "{output}"',
        ].join('\n')
        : [
          `[${backend}] No command configured.`,
          'Set SUBJECT3D_COMMAND with placeholders like:',
          'python tools\\run_subject3d.py --input "{input}" --mask "{mask}" --output "{output}"',
        ].join('\n'),
    );
  }

  return template
    .replaceAll('{input}', variables.input)
    .replaceAll('{mask}', variables.mask ?? '')
    .replaceAll('{output}', variables.output)
    .replaceAll('{sceneDir}', variables.sceneDir)
    .replaceAll('{sceneId}', variables.sceneId);
}

function snapshotSubjectVersion(sceneDir, meta, details) {
  const versionRoot = join(sceneDir, 'subject-versions');
  mkdirSync(versionRoot, { recursive: true });
  const versionId = `${timestampId()}--${slugify(details.label || `${details.sceneId}-${details.backend}`)}`;
  const versionDir = join(versionRoot, versionId);
  mkdirSync(versionDir, { recursive: true });

  const files = [];
  for (const filename of SUBJECT_FILES) {
    const sourcePath = join(sceneDir, filename);
    if (!existsSync(sourcePath)) continue;
    copyOrLink(sourcePath, join(versionDir, filename));
    files.push({
      filename,
      size: safeStatSize(sourcePath),
    });
  }

  const review = {
    versionId,
    createdAt: new Date().toISOString(),
    sceneId: details.sceneId,
    sceneTitle: meta.title,
    label: details.label || `${details.backend} subject`,
    notes: details.notes ?? null,
    backend: details.backend,
    mode: details.mode,
    supportMode: details.supportMode,
    mask: meta?.source?.mask ?? null,
    photo: meta?.source?.photo ?? null,
    generated: TODAY,
    subject3d: meta?.subject3d ?? null,
    files,
  };
  writeJson(join(versionDir, 'review.json'), review);

  const indexPath = join(versionRoot, 'index.json');
  const index = existsSync(indexPath) ? readJson(indexPath) : {
    sceneId: details.sceneId,
    updatedAt: null,
    versions: [],
  };
  index.updatedAt = review.createdAt;
  index.versions = [
    {
      versionId,
      createdAt: review.createdAt,
      label: review.label,
      backend: details.backend,
      mode: details.mode,
      supportMode: details.supportMode,
      notes: details.notes ?? null,
      dir: versionDir.replaceAll('\\', '/'),
    },
    ...(Array.isArray(index.versions) ? index.versions : []),
  ];
  writeJson(indexPath, index);

  return { versionId, versionDir, files };
}

function updateMetaWithSubject(meta, subjectAssets, details) {
  const existing = meta?.subject3d ?? {};
  meta.subject3d = {
    ...existing,
    mode: details.mode,
    mesh: subjectAssets.mesh ?? existing.mesh ?? null,
    pointCloud: subjectAssets.pointCloud ?? null,
    preview: subjectAssets.preview ?? null,
    transform: {
      ...(existing.transform ?? {}),
      supportMode: details.supportMode,
    },
    provenance: {
      ...(existing.provenance ?? {}),
      backend: details.backend,
      generated: TODAY,
      photo: meta?.source?.photo ?? null,
      mask: meta?.source?.mask ?? null,
      label: details.label ?? null,
      notes: details.notes ?? null,
    },
  };
}

async function main() {
  const { sceneId, backend: requestedBackend, force, mode, supportMode, label, notes } = parseArgs();

  if (!sceneId) {
    console.log('Usage: node pipeline/generate-subject-3d.mjs <scene-id> [--backend existing|sam3d-body|external] [--mode projected-mesh|depth-volume] [--support-mode mesh-fill|image-cloud] [--label <name>] [--notes <text>] [--force]');
    process.exit(1);
  }

  const sceneDir = join(MEMORY_ROOT, sceneId);
  const metaPath = join(sceneDir, 'meta.json');
  if (!existsSync(metaPath)) {
    throw new Error(`meta.json not found: ${metaPath}`);
  }
  const meta = readJson(metaPath);
  const photoPath = join(sceneDir, meta?.source?.photo ?? '');
  const maskPath = meta?.source?.mask ? join(sceneDir, meta.source.mask) : null;
  if (!existsSync(photoPath)) {
    throw new Error(`Source photo not found: ${photoPath}`);
  }
  if (maskPath && !existsSync(maskPath)) {
    throw new Error(`Subject mask not found: ${maskPath}`);
  }

  const backend = resolveBackend(meta, requestedBackend, sceneDir);
  const effectiveMode = mode ?? meta?.subject3d?.mode ?? (backend === 'sam3d-body' ? 'projected-mesh' : 'projected-mesh');
  const effectiveSupportMode = supportMode
    ?? meta?.subject3d?.transform?.supportMode
    ?? (effectiveMode === 'depth-volume' ? 'image-cloud' : 'mesh-fill');

  if (force) {
    cleanSubjectAssets(sceneDir);
  }

  if (backend !== 'existing') {
    const workDir = join(tmpdir(), `memory-subject3d-${sceneId}-${Date.now()}`);
    mkdirSync(workDir, { recursive: true });
    try {
      const command = buildSubjectBackendCommand(backend, {
        input: photoPath,
        mask: maskPath,
        output: workDir,
        sceneDir,
        sceneId,
      });
      console.log(`\n[Subject3D] Running: ${command}\n`);
      const result = runShellCommand(command, ROOT);
      if (result.stdout?.trim()) console.log(result.stdout.trim());
      if (result.stderr?.trim()) console.log(result.stderr.trim());
      if (result.status !== 0) {
        throw new Error(
          [
            `[Subject3D] ${backend} generation failed.`,
            `Command: ${command}`,
            result.stderr?.trim() || result.stdout?.trim() || 'No error output.',
          ].join('\n'),
        );
      }

      const generated = normalizeGeneratedSubjectAssets(workDir, sceneDir);
      if (!generated.mesh && !generated.pointCloud) {
        throw new Error(`[Subject3D] ${backend} completed but produced no subject assets.`);
      }
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }

  const subjectAssets = readCurrentSubjectAssets(sceneDir);
  if (!subjectAssets.mesh && !subjectAssets.pointCloud) {
    throw new Error(`[Subject3D] No subject assets found for ${sceneId}.`);
  }

  updateMetaWithSubject(meta, subjectAssets, {
    sceneId,
    backend,
    mode: effectiveMode,
    supportMode: effectiveSupportMode,
    label,
    notes,
  });
  writeJson(metaPath, meta);

  const snapshot = snapshotSubjectVersion(sceneDir, meta, {
    sceneId,
    backend,
    mode: effectiveMode,
    supportMode: effectiveSupportMode,
    label,
    notes,
  });

  console.log(JSON.stringify({
    sceneId,
    backend,
    mode: effectiveMode,
    supportMode: effectiveSupportMode,
    mesh: meta?.subject3d?.mesh ?? null,
    pointCloud: meta?.subject3d?.pointCloud ?? null,
    versionId: snapshot.versionId,
    versionDir: snapshot.versionDir,
    files: snapshot.files.length,
  }, null, 2));
}

main().catch(error => {
  console.error(`\nPipeline error: ${error.message}`);
  process.exit(1);
});
