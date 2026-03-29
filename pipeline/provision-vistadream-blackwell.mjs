#!/usr/bin/env node
import { spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DISTRO = process.env.WORLD_MODEL_WSL_DISTRO || 'Ubuntu'
const SCRIPT_PATH = join(ROOT, 'pipeline', 'provision_vistadream_blackwell_wsl.sh')

function toWslPath(filePath) {
  const normalized = resolve(filePath).replace(/\\/g, '/')
  const match = normalized.match(/^([A-Za-z]):(.*)$/)
  if (!match) return normalized
  return `/mnt/${match[1].toLowerCase()}${match[2]}`
}

const scriptWslPath = toWslPath(SCRIPT_PATH)
const result = spawnSync(
  'wsl.exe',
  ['-d', DISTRO, '--', 'bash', '-lc', `bash ${JSON.stringify(scriptWslPath)}`],
  {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  },
)

if (typeof result.status === 'number') {
  process.exit(result.status)
}

if (result.error) {
  console.error(result.error.message)
}
process.exit(1)
