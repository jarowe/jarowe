import { spawnSync } from 'child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ROOT = dirname(fileURLToPath(import.meta.url))
const MEMORY_ROOT = join(ROOT, 'public', 'memory')
const WORLD_GRADE_SCRIPT = join(ROOT, 'pipeline', 'grade-memory-world.mjs')

/* ── Rubric definitions (mirrored from grade-memory-world.mjs exports) ── */
const RUBRIC_VERSION = '2026-04-04'
const RUBRIC_DIMENSIONS = [
  {
    key: 'worldCoherence',
    flag: 'coherence',
    label: 'World Coherence',
    weight: 0.25,
    description: 'Does the 3D world make geometric sense? Are surfaces connected? Do depth relationships hold?',
    anchors: [
      'Broken geometry — floating clusters, impossible intersections, shattered depth ordering.',
      'Major structural errors — one or two dominant surfaces hold, but transitions fracture.',
      'Usable but flawed — primary surfaces connect, secondary surfaces break at edges.',
      'Clean with minor issues — all major surfaces coherent, one subtle discontinuity.',
      'Indistinguishable from a real 3D scan — every surface connects, no warping.',
    ],
  },
  {
    key: 'explorationRange',
    flag: 'exploration',
    label: 'Exploration Range',
    weight: 0.15,
    description: 'How far can you move from the original viewpoint before quality degrades unacceptably?',
    anchors: [
      'Viewpoint-locked — any camera movement reveals catastrophic artifacts.',
      'Slight look-around only — ~20 degrees rotation, ~0.5 units translation.',
      '90-degree comfort zone — front hemisphere holds, back is empty or degraded.',
      'Near-full orbit — ~270 degrees, back side lower detail but not broken.',
      'Full 360 exploration — consistent quality from all angles and distances.',
    ],
  },
  {
    key: 'subjectPreservation',
    flag: 'subject',
    label: 'Subject Preservation',
    weight: 0.25,
    description: 'How well does the world preserve the space where the subject was or will be composited?',
    anchors: [
      'Subject area destroyed — hallucinated geometry, no clean space for compositing.',
      'Subject area present but contaminated — ghosting, color bleed, noisy surface.',
      'Clean space, weak context — subject area available but surrounding context mismatches.',
      'Good space with supporting context — lighting matches, objects positioned correctly.',
      'Perfect compositing bed — pristine space, lighting/shadow/geometry all match.',
    ],
  },
  {
    key: 'artifactSeverity',
    flag: 'artifacts',
    label: 'Artifact Severity',
    weight: 0.15,
    description: 'How bad are the worst visual artifacts? (Not geometric coherence or exploration range.)',
    anchors: [
      'Severe, scene-breaking — large floating splats, hallucination errors, wide seams.',
      'Prominent, hard to ignore — several floating groups, visible seams, color banding.',
      'Moderate, noticeable on inspection — few small floaters, minor seams on close look.',
      'Minor, easy to overlook — one or two tiny floaters, mostly clean edges.',
      'Clean — no visible floaters, seams, fringing, or hallucination.',
    ],
  },
  {
    key: 'emotionalRead',
    flag: 'emotion',
    label: 'Emotional Read',
    weight: 0.20,
    description: 'Does the world feel like the memory? Does it capture the mood, light, and atmosphere?',
    anchors: [
      'Unrecognizable — lighting, color, mood fundamentally changed.',
      'Same subject, wrong feeling — right location but atmosphere shifted.',
      'Recognizable, partially immersive — right place, lighting mostly preserved.',
      'Strongly evocative — same emotional response as the photo, light and scale correct.',
      'Time machine — the world IS the memory, jolt of recognition on entry.',
    ],
  },
]

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
      latestRubric: null,
      bestGrade: null,
      bestWeightedComposite: null,
    }

    summary.count += 1
    summary.favorite = summary.favorite || Boolean(entry.favorite)

    if (!summary.latestCreatedAt || String(entry.createdAt) > String(summary.latestCreatedAt)) {
      summary.latestVersionId = entry.versionId
      summary.latestCreatedAt = entry.createdAt
      summary.latestGrade = entry.grade ?? null
      summary.latestNotes = entry.notes ?? null
      summary.latestLabel = entry.label ?? null
      summary.latestRubric = entry.rubric ?? null
    }

    if (typeof entry.grade === 'number') {
      summary.bestGrade = summary.bestGrade == null ? entry.grade : Math.max(summary.bestGrade, entry.grade)
    }

    const wc = entry.rubric?.weightedComposite
    if (typeof wc === 'number') {
      summary.bestWeightedComposite = summary.bestWeightedComposite == null ? wc : Math.max(summary.bestWeightedComposite, wc)
    }

    bySource.set(key, summary)
  }
  return bySource
}

function inferWorldFamily(meta, candidate = null) {
  return candidate?.family
    || meta?.world?.generationFamily
    || meta?.source?.worldGenerationFamily
    || (meta?.source?.generationMode === 'single-image-world-model' ? 'pano-first' : null)
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

  const activeFamily = meta?.world?.generationFamily ?? meta?.source?.worldGenerationFamily
  const selectionFamilyValid = !activeFamily || activeFamily === 'world-model' || activeFamily === 'pano-first'
  const sourceSelection = selectionFamilyValid ? meta?.source?.worldSelection : null
  const selection = meta?.world?.selection ?? sourceSelection ?? safeReadJson(candidateScoresPath) ?? null
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
  const sourceFavorite = selectionFamilyValid ? meta?.source?.favoriteWorldVersion : null
  const favoriteVersionId = meta?.world?.favoriteVersion ?? sourceFavorite ?? null

  const candidateMap = new Map((selection?.candidates ?? []).map((candidate) => [candidate.id, candidate]))
  const candidates = candidateIds
    .map((candidateId) => {
      const candidate = candidateMap.get(candidateId) ?? null
      const review = versionSummary.get(`candidate:${candidateId}`) ?? null
      return {
        id: candidateId,
        existsOnDisk: candidateDirs.includes(candidateId),
        family: inferWorldFamily(meta, candidate),
        familyLabel: candidate?.familyLabel ?? null,
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

  const currentSubjectMeta = safeReadJson(join(sceneDir, 'subject.meta.json'))

  return {
    scene: {
      id: sanitizedSceneId,
      title: meta.title,
      subtitle: meta.subtitle,
      description: meta.description,
      selectedCandidateId,
      favoriteVersionId,
      worldGenerationFamily: inferWorldFamily(meta, null),
      world: meta.world ?? null,
      source: meta.source ?? null,
      grades: meta.world?.grades ?? null,
      currentReview: versionSummary.get('current:current') ?? null,
    },
    lab: {
      selection,
      candidates,
      worldVersions: Array.isArray(versionsIndex.versions) ? versionsIndex.versions : [],
      subjectVersions: (Array.isArray(subjectVersionsIndex.versions) ? subjectVersionsIndex.versions : []).map((entry, index) => {
        const subjectVersionDir = join(sceneDir, 'subject-versions', entry.versionId)
        const subjectMeta = safeReadJson(join(subjectVersionDir, 'subject.meta.json'))
        const previewPath = join(subjectVersionDir, 'subject.preview.png')
        const isCurrent = currentSubjectMeta && subjectMeta
          ? JSON.stringify(currentSubjectMeta) === JSON.stringify(subjectMeta)
          : index === 0

        return {
          ...entry,
          previewUrl: existsSync(previewPath)
            ? `/memory/${sanitizedSceneId}/subject-versions/${entry.versionId}/subject.preview.png`
            : null,
          meta: subjectMeta,
          isCurrent,
        }
      }),
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
        selectedCandidateId: (() => {
          const af = meta?.world?.generationFamily ?? meta?.source?.worldGenerationFamily
          const isWm = !af || af === 'world-model' || af === 'pano-first'
          if (meta?.world?.selection?.selectedCandidate) return meta.world.selection.selectedCandidate
          if (isWm && meta?.source?.worldSelection?.selectedCandidate) return meta.source.worldSelection.selectedCandidate
          return null
        })(),
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

  // Pass rubric dimension scores
  const dimensions = body.dimensions ?? {}
  for (const dim of RUBRIC_DIMENSIONS) {
    const val = dimensions[dim.key]
    if (typeof val === 'number' && val >= 1 && val <= 5) {
      args.push(`--${dim.flag}`, `${val}`)
    }
  }

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

/**
 * Save rubric dimension scores to meta.json world.grades without creating
 * a full version snapshot. Used for quick grading from the lab UI.
 */
function saveRubricGrades(body) {
  const sceneId = sanitizeSceneId(body.sceneId)
  if (!sceneId) throw new Error('sceneId is required')

  const sceneDir = join(MEMORY_ROOT, sceneId)
  const metaPath = join(sceneDir, 'meta.json')
  const meta = safeReadJson(metaPath)
  if (!meta) throw new Error(`Scene not found: ${sceneId}`)

  const dimensions = body.dimensions ?? {}
  const notes = body.notes ?? null
  const family = body.family || meta?.world?.generationFamily || meta?.source?.worldGenerationFamily || 'unknown'
  const versionId = body.versionId ?? null

  // Compute composites
  let weightedComposite = 0
  let totalWeight = 0
  let composite = 0
  let dimCount = 0

  for (const dim of RUBRIC_DIMENSIONS) {
    const val = dimensions[dim.key]
    if (typeof val === 'number' && val >= 1 && val <= 5) {
      weightedComposite += val * dim.weight
      totalWeight += dim.weight
      composite += val
      dimCount += 1
    }
  }

  if (dimCount === 0) throw new Error('At least one rubric dimension score is required')

  weightedComposite = totalWeight > 0
    ? Math.round((weightedComposite / totalWeight) * 100) / 100
    : null

  if (!meta.world) meta.world = {}
  if (!meta.world.grades) {
    meta.world.grades = { rubricVersion: RUBRIC_VERSION, evaluations: [], winner: null }
  }

  const evaluation = {
    family,
    date: new Date().toISOString().slice(0, 10),
    evaluator: 'jared',
    ...dimensions,
    composite,
    weightedComposite,
    machineScore: null,
    notes,
    dealBreaker: null,
    versionId,
  }

  meta.world.grades.evaluations.push(evaluation)
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')

  return {
    evaluation,
    grades: meta.world.grades,
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

          // GET /__memory-lab/rubric — return rubric dimension definitions
          if (req.method === 'GET' && url.pathname === '/__memory-lab/rubric') {
            sendJson(res, 200, {
              rubricVersion: RUBRIC_VERSION,
              dimensions: RUBRIC_DIMENSIONS,
            })
            return
          }

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

          // POST /__memory-lab/rubric-grade — save rubric scores to meta.json
          if (req.method === 'POST' && url.pathname === '/__memory-lab/rubric-grade') {
            const rawBody = await readRequestBody(req)
            const body = rawBody ? JSON.parse(rawBody) : {}
            sendJson(res, 200, saveRubricGrades(body))
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
})
