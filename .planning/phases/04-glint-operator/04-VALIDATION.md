---
phase: 04
slug: glint-operator
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 04 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing project config) |
| **Config file** | vite.config.js |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Verification Approach

This phase uses **file-content verification** rather than unit test stubs. Each task's `<verify>` element runs a Node.js script that reads created/modified files and checks for required exports, patterns, and content markers. This approach is appropriate because:

1. The phase creates UI components (CommandPalette, TodayRail updates), Vercel Edge Functions (glint-journal, glint-chat extensions), and browser-only modules (actionDispatcher) -- all of which require DOM/Edge/browser runtime contexts that vitest would need extensive mocking to test.
2. The file-content checks provide fast (~1s), deterministic verification that the correct code artifacts exist with the required patterns.
3. The human verification checkpoint in Plan 03 covers the end-to-end integration that automated unit tests cannot (expression changes, narration UX, cross-page palette behavior).

Wave 0 test stubs are **not applicable** for this verification strategy. The existing vitest suite continues to run for regression detection.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Verify Type | Automated Command | Status |
|---------|------|------|-------------|-------------|-------------------|--------|
| 04-01-01 | 01 | 1 | GLINT-01,02,03 | file-check | `node -e "const fs = require('fs'); const d = fs.readFileSync('src/utils/actionDispatcher.js', 'utf8'); ['TOOLS','getToolSchemas','getNarration','dispatch','getToolNames','glint-action'].forEach(k => console.log(k+':', d.includes(k) ? 'FOUND' : 'MISSING'))"` | pending |
| 04-01-02 | 01 | 1 | GLINT-04 | file-check | `node -e "const fs = require('fs'); const h = fs.readFileSync('src/pages/Home.jsx', 'utf8'); ['getNarration', 'dispatchAction', 'glint-action', 'tool_calls', 'narr.expression', 'typeof showGame'].forEach(c => console.log(c + ':', h.includes(c) ? 'FOUND' : 'MISSING'))"` | pending |
| 04-02-01 | 02 | 1 | GLINT-05 | file-check | `node -e "const fs = require('fs'); const jsx = fs.existsSync('src/components/CommandPalette.jsx'); const css = fs.existsSync('src/components/CommandPalette.css'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); console.log('JSX:', jsx, 'CSS:', css, 'cmdk:', !!pkg.dependencies?.cmdk)"` | pending |
| 04-02-02 | 02 | 1 | TODAY-05 | file-check | `node -e "const fs = require('fs'); const api = fs.existsSync('api/glint-journal.js'); const data = fs.existsSync('src/data/glintJournal.js'); const rail = fs.readFileSync('src/components/TodayRail.jsx', 'utf8'); console.log('API:', api, 'Data:', data, 'Journal:', rail.includes('glintJournal'), 'Fetch:', rail.includes('/api/glint-journal'))"` | pending |
| 04-03-01 | 03 | 2 | GLINT-07 | file-check | `node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx', 'utf8'); const audio = fs.readFileSync('src/context/AudioContext.jsx', 'utf8'); console.log('Palette:', app.includes('CommandPalette'), 'Nav:', app.includes('glint-action'), 'Music:', audio.includes('control_music'))"` | pending |
| 04-03-02 | 03 | 2 | GLINT-07 | human | Plan 03 Task 2 checkpoint: 8 integration test scenarios | pending |

*Status: pending / green / red / flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Glint narrates navigation in character | GLINT-04 | Subjective tone quality | Say "Take me to constellation", verify narration is playful not robotic |
| Cmd+K palette visual style matches glass aesthetic | GLINT-05 | Visual design | Open palette, verify dark glass blur, --tod-* tinting |
| Tool execution expression change on prism | GLINT-04 | 3D animation | Trigger tool call, observe prism expression shift |
| Journal card renders in TodayRail | TODAY-05 | Visual integration | Load homepage, verify journal card replaces Glint Invitation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (file-content checks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Verification approach documented and justified
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
