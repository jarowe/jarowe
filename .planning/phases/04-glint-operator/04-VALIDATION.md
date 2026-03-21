---
phase: 04
slug: glint-operator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 04 — Validation Strategy

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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GLINT-01,02,03 | unit | `npx vitest run src/utils/actionDispatcher.test.js` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | GLINT-04 | unit | `npx vitest run src/utils/toolNarrations.test.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | GLINT-05 | unit | `npx vitest run src/components/CommandPalette.test.jsx` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | TODAY-05 | unit | `npx vitest run api/_lib/glint-journal.test.js` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | GLINT-07 | unit | `npx vitest run src/utils/dailyContent.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for actionDispatcher, toolNarrations, CommandPalette, glint-journal, dailyContent
- [ ] Vitest config already exists — no framework install needed

*Existing infrastructure covers framework requirements.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
