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
const VISTADREAM_REPO_ROOT = join(ROOT, '_experiments', 'VistaDream')
const VISTADREAM_DEFAULT_WSL_VENV = process.env.VISTADREAM_WSL_VENV || '$HOME/.venvs/vistadream'

function safeReadJson(filePath) {
  try {
    return existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : null
  } catch {
    return null
  }
}

function stripAnsi(value = '') {
  return String(value).replace(/\u001b\[[0-9;]*m/g, '').trim()
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
    const output = stripAnsi(whoami.stdout || whoami.stderr || '')
    const missingAuth = /not logged in|no token|invalid user token/i.test(output)
    loggedIn = whoami.status === 0 && !missingAuth
    const accountLine = loggedIn
      ? output.split('\n').map((line) => line.trim()).find((line) => /^user:/i.test(line))
      : null
    account = accountLine
      ? accountLine.replace(/^user:\s*/i, '').trim()
      : (loggedIn ? output.split('\n').find(Boolean)?.trim() || null : null)
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

function probeWsl(command) {
  const result = spawnSync('wsl.exe', ['bash', '-lc', command], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  })
  return {
    ok: result.status === 0,
    output: stripAnsi(result.stdout || result.stderr || ''),
  }
}

function getWslEnvPythonPath(wslEnvPath) {
  return `${wslEnvPath}/bin/python`
}

function getVistaDreamStatus() {
  const requiredAssets = {
    depthPro: join(VISTADREAM_REPO_ROOT, 'tools', 'DepthPro', 'checkpoints', 'depth_pro.pt'),
    oneFormer: join(VISTADREAM_REPO_ROOT, 'tools', 'OneFormer', 'checkpoints', 'coco_pretrain_1280x1280_150_16_dinat_l_oneformer_ade20k_160k.pth'),
    lcm: join(VISTADREAM_REPO_ROOT, 'tools', 'StableDiffusion', 'lcm_ckpt', 'pytorch_lora_weights.safetensors'),
    fooocusCheckpoint: join(VISTADREAM_REPO_ROOT, 'tools', 'Fooocus', 'models', 'checkpoints', 'juggernautXL_v8Rundiffusion.safetensors'),
    fooocusInpaint: join(VISTADREAM_REPO_ROOT, 'tools', 'Fooocus', 'models', 'inpaint', 'inpaint_v26.fooocus.patch'),
    fooocusPrompt: join(VISTADREAM_REPO_ROOT, 'tools', 'Fooocus', 'models', 'prompt_expansion', 'fooocus_expansion', 'pytorch_model.bin'),
  }

  const hasRepo = existsSync(VISTADREAM_REPO_ROOT)
  const assetFlags = Object.fromEntries(
    Object.entries(requiredAssets).map(([key, filePath]) => [key, existsSync(filePath)]),
  )
  const hasWeights = Object.values(assetFlags).every(Boolean)

  let hasWslEnv = false
  let wslPythonVersion = null
  let torchVersion = null
  let torchCudaVersion = null
  let torchCudaExecOk = false
  let torchCudaMessage = null
  if (process.platform === 'win32') {
    const wslPythonPath = getWslEnvPythonPath(VISTADREAM_DEFAULT_WSL_VENV)
    const envProbe = probeWsl(`test -x ${JSON.stringify(wslPythonPath)} && echo READY || echo MISSING`)
    hasWslEnv = /\bREADY\b/i.test(envProbe.output)
    if (hasWslEnv) {
      const pythonProbe = probeWsl(`${JSON.stringify(wslPythonPath)} --version`)
      wslPythonVersion = pythonProbe.ok ? pythonProbe.output : null
      const torchProbe = probeWsl(
        `${JSON.stringify(wslPythonPath)} -W ignore - <<'PY'
import torch
print(f"TORCH={torch.__version__}")
print(f"CUDA={torch.version.cuda or 'none'}")
try:
    torch.randn(2).cuda()
    print("CUDA_OK=1")
except Exception as exc:
    print(f"CUDA_ERR={str(exc).replace(chr(10), ' ')}")
PY`,
      )
      if (torchProbe.output) {
        const lines = torchProbe.output
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        torchVersion = lines.find((line) => line.startsWith('TORCH='))?.slice('TORCH='.length) || null
        torchCudaVersion = lines.find((line) => line.startsWith('CUDA='))?.slice('CUDA='.length) || null
        torchCudaExecOk = lines.some((line) => line === 'CUDA_OK=1')
        torchCudaMessage = lines.find((line) => line.startsWith('CUDA_ERR='))?.slice('CUDA_ERR='.length) || null
      } else if (!torchProbe.ok) {
        torchCudaMessage = 'Torch probe failed'
      }
    }
  } else {
    hasWslEnv = true
  }

  let message = 'Ready for camera-guided generation'
  if (!hasRepo) {
    message = 'VistaDream repo missing'
  } else if (!hasWslEnv) {
    message = 'VistaDream WSL env missing'
  } else if (torchVersion && !torchCudaExecOk) {
    message = 'VistaDream torch stack cannot execute on this GPU'
  } else if (!hasWeights) {
    message = 'VistaDream weights missing'
  }

  return {
    hasRepo,
    hasWslEnv,
    hasWeights,
    ready: hasRepo && hasWslEnv && hasWeights && (!torchVersion || torchCudaExecOk),
    message,
    wslVenv: VISTADREAM_DEFAULT_WSL_VENV,
    wslPythonVersion,
    torchVersion,
    torchCudaVersion,
    torchCudaExecOk,
    torchCudaMessage,
    ...assetFlags,
  }
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
  const currentSubjectMeta = safeReadJson(join(sceneDir, 'subject.meta.json'))

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
      sam3d: getSam3dStatus(),
      vistaDream: getVistaDreamStatus(),
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
