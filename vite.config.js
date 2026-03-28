import { spawnSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ROOT = dirname(fileURLToPath(import.meta.url))
const MEMORY_ROOT = join(ROOT, 'public', 'memory')
const WORLD_GRADE_SCRIPT = join(ROOT, 'pipeline', 'grade-memory-world.mjs')
const SAM3D_REPO_ROOT = join(ROOT, '_experiments', 'sam-3d-body')
const SAM3D_CHECKPOINT_ROOT = join(SAM3D_REPO_ROOT, 'checkpoints', 'sam-3d-body-dinov3')
const SAM3D_VENV_PYTHON = join(ROOT, '.venv-sam3d-body', 'Scripts', 'python.exe')
const SAM3D_VENV_HF = join(ROOT, '.venv-sam3d-body', 'Scripts', 'hf.exe')

function safeReadJson(filePath) {
  try {
    return existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : null
  } catch {
    return null
  }
}

function readRequestBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', rejectBody)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload, null, 2))
}

function sanitizeSceneId(value) {
  return String(value || '').trim().match(/^[a-z0-9-]+$/i)?.[0] || null
}

function summarizeVersions(entries = []) {
  const bySource = new Map()
  for (const entry of entries) {
    const key = `${entry.sourceType}:${entry.sourceId}`
    const summary = bySource.get(key) ?? {
      count: 0,
      favorite: false,
      latestVersionId: null,
      latestCreatedAt: null,
      latestGrade: null,
      latestNotes: null,
      latestLabel: null,
      bestGrade: null,
    }

    summary.count += 1
    summary.favorite = summary.favorite || Boolean(entry.favorite)

    if (!summary.latestCreatedAt || String(entry.createdAt) > String(summary.latestCreatedAt)) {
      summary.latestVersionId = entry.versionId
      summary.latestCreatedAt = entry.createdAt
      summary.latestGrade = entry.grade ?? null
      summary.latestNotes = entry.notes ?? null
      summary.latestLabel = entry.label ?? null
    }

    if (typeof entry.grade === 'number') {
      summary.bestGrade = summary.bestGrade == null ? entry.grade : Math.max(summary.bestGrade, entry.grade)
    }

    bySource.set(key, summary)
  }
  return bySource
}

function getSam3dStatus() {
  const checkpointPath = join(SAM3D_CHECKPOINT_ROOT, 'model.ckpt')
  const mhrPath = join(SAM3D_CHECKPOINT_ROOT, 'assets', 'mhr_model.pt')
  const hasEnv = existsSync(SAM3D_VENV_PYTHON)
  const hasRepo = existsSync(SAM3D_REPO_ROOT)
  const hasCheckpoint = existsSync(checkpointPath)
  const hasMhrModel = existsSync(mhrPath)

  let loggedIn = false
  let account = null
  let authMessage = 'Not logged in'

  if (existsSync(SAM3D_VENV_HF)) {
    const whoami = spawnSync(SAM3D_VENV_HF, ['auth', 'whoami'], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    })
    const output = (whoami.stdout || whoami.stderr || '').trim()
    const missingAuth = /not logged in|no token|invalid user token/i.test(output)
    loggedIn = whoami.status === 0 && !missingAuth
    account = loggedIn ? output.split('\n').find(Boolean)?.trim() || null : null
    authMessage = output || (loggedIn ? 'Authenticated locally' : authMessage)
  }

  return {
    loggedIn,
    account,
    authMessage,
    ready: loggedIn && hasCheckpoint && hasMhrModel,
    hasEnv,
    hasRepo,
    hasCheckpoint,
    hasMhrModel,
    loginCommand: existsSync(SAM3D_VENV_HF)
      ? '.\\.venv-sam3d-body\\Scripts\\hf.exe auth login'
      : 'hf auth login',
  }
}

function collectMemoryWorldLabScene(sceneId) {
  const sanitizedSceneId = sanitizeSceneId(sceneId)
  if (!sanitizedSceneId) {
    throw new Error('Invalid scene id')
  }

  const sceneDir = join(MEMORY_ROOT, sanitizedSceneId)
  const metaPath = join(sceneDir, 'meta.json')
  const worldDir = join(sceneDir, 'world')
  const versionsIndexPath = join(worldDir, 'versions', 'index.json')
  const subjectVersionsIndexPath = join(sceneDir, 'subject-versions', 'index.json')
  const candidateScoresPath = join(worldDir, 'candidates', 'scores.json')

  const meta = safeReadJson(metaPath)
  if (!meta) {
    throw new Error(`Scene meta not found: ${metaPath}`)
  }

  const selection = meta?.world?.selection ?? meta?.source?.worldSelection ?? safeReadJson(candidateScoresPath) ?? null
  const versionsIndex = safeReadJson(versionsIndexPath) ?? { versions: [] }
  const subjectVersionsIndex = safeReadJson(subjectVersionsIndexPath) ?? { versions: [] }
  const versionSummary = summarizeVersions(Array.isArray(versionsIndex.versions) ? versionsIndex.versions : [])

  const candidateDirRoot = join(worldDir, 'candidates')
  const candidateDirs = existsSync(candidateDirRoot)
    ? readdirSync(candidateDirRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : []

  const candidateIds = Array.from(
    new Set([
      ...(selection?.candidates?.map((candidate) => candidate.id) ?? []),
      ...candidateDirs,
    ]),
  )

  const selectedCandidateId = selection?.selectedCandidate ?? null
  const favoriteVersionId = meta?.world?.favoriteVersion ?? meta?.source?.favoriteWorldVersion ?? null

  const candidateMap = new Map((selection?.candidates ?? []).map((candidate) => [candidate.id, candidate]))
  const candidates = candidateIds
    .map((candidateId) => {
      const candidate = candidateMap.get(candidateId) ?? null
      const review = versionSummary.get(`candidate:${candidateId}`) ?? null
      return {
        id: candidateId,
        existsOnDisk: candidateDirs.includes(candidateId),
        seed: candidate?.seed ?? null,
        prompt: candidate?.prompt ?? null,
        score: candidate?.score ?? null,
        metrics: candidate?.metrics ?? null,
        isSelected: selectedCandidateId === candidateId,
        review,
      }
    })
    .sort((left, right) => {
      const favoriteDelta = Number(Boolean(right.review?.favorite)) - Number(Boolean(left.review?.favorite))
      if (favoriteDelta !== 0) return favoriteDelta
      const humanDelta = (right.review?.bestGrade ?? -1) - (left.review?.bestGrade ?? -1)
      if (humanDelta !== 0) return humanDelta
      return (right.score ?? -1) - (left.score ?? -1)
    })

  return {
    scene: {
      id: sanitizedSceneId,
      title: meta.title,
      subtitle: meta.subtitle,
      description: meta.description,
      selectedCandidateId,
      favoriteVersionId,
      world: meta.world ?? null,
      source: meta.source ?? null,
      currentReview: versionSummary.get('current:current') ?? null,
    },
    lab: {
      selection,
      candidates,
      worldVersions: Array.isArray(versionsIndex.versions) ? versionsIndex.versions : [],
      subjectVersions: Array.isArray(subjectVersionsIndex.versions) ? subjectVersionsIndex.versions : [],
      sam3d: getSam3dStatus(),
    },
  }
}

function listMemoryWorldLabScenes() {
  if (!existsSync(MEMORY_ROOT)) {
    return { scenes: [] }
  }

  const scenes = readdirSync(MEMORY_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const meta = safeReadJson(join(MEMORY_ROOT, entry.name, 'meta.json'))
      if (!meta) return null
      return {
        id: entry.name,
        title: meta.title || entry.name,
        subtitle: meta.subtitle || '',
        selectedCandidateId: meta?.world?.selection?.selectedCandidate ?? meta?.source?.worldSelection?.selectedCandidate ?? null,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title))

  return { scenes }
}

function runWorldGrade(body) {
  const sceneId = sanitizeSceneId(body.sceneId)
  if (!sceneId) {
    throw new Error('sceneId is required')
  }

  const source = String(body.source || 'current').trim()
  const label = String(body.label || '').trim()
  const notes = String(body.notes || '').trim()
  const rawGrade = Number.parseFloat(`${body.grade ?? ''}`)
  const favorite = Boolean(body.favorite)

  const args = [WORLD_GRADE_SCRIPT, sceneId, '--source', source]
  if (label) args.push('--label', label)
  if (notes) args.push('--notes', notes)
  if (Number.isFinite(rawGrade)) args.push('--grade', `${rawGrade}`)
  if (favorite) args.push('--favorite')

  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'grade-memory-world failed')
  }

  return {
    saved: JSON.parse(result.stdout || '{}'),
    scene: collectMemoryWorldLabScene(sceneId),
  }
}

function memoryWorldLabApi() {
  return {
    name: 'memory-world-lab-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__memory-lab/')) {
          next()
          return
        }

        try {
          const url = new URL(req.url, 'http://127.0.0.1')

          if (req.method === 'GET' && url.pathname.startsWith('/__memory-lab/scene/')) {
            const sceneId = decodeURIComponent(url.pathname.replace('/__memory-lab/scene/', ''))
            sendJson(res, 200, collectMemoryWorldLabScene(sceneId))
            return
          }

          if (req.method === 'GET' && url.pathname === '/__memory-lab/scenes') {
            sendJson(res, 200, listMemoryWorldLabScenes())
            return
          }

          if (req.method === 'POST' && url.pathname === '/__memory-lab/grade-world') {
            const rawBody = await readRequestBody(req)
            const body = rawBody ? JSON.parse(rawBody) : {}
            sendJson(res, 200, runWorldGrade(body))
            return
          }

          sendJson(res, 404, { error: 'Not found' })
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Unknown Memory World Lab error',
          })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), memoryWorldLabApi()],
  base: process.env.BASE_PATH || '/',
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
})
