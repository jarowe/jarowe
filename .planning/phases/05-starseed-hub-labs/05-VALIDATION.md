---
phase: 05
slug: starseed-hub-labs
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 05 — Validation Strategy

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

## Verification Approach

This phase uses **file-content verification** for code artifacts. Each task's `<verify>` element runs a Node.js script checking file existence, required exports, and content patterns. Visual and interaction testing requires human verification (Milkdown editor UX, Excalidraw canvas behavior, Starseed brand appearance).

Wave 0 test stubs are **not applicable** — the verification strategy uses inline file checks and human visual testing.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Verify Type | Status |
|---------|------|------|-------------|-------------|--------|
| 05-01-01 | 01 | 1 | STAR-02,05,06 | file-check | pending |
| 05-01-02 | 01 | 1 | STAR-07 | file-check | pending |
| 05-02-01 | 02 | 1 | LABS-01,03 | file-check | pending |
| 05-02-02 | 02 | 1 | LABS-02,03 | file-check | pending |
| 05-03-01 | 03 | 2 | LABS-06 | file-check | pending |
| 05-03-02 | 03 | 2 | LABS-06 | human | pending |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Project cards display correctly | STAR-02 | Visual design | Visit /starseed, verify 4 project cards render with icons/tags |
| Contact section works | STAR-05 | Interaction | Click mailto link, verify email client opens |
| Milkdown editor functions | LABS-01 | Editor UX | Visit /starseed/labs/scratchpad, type markdown, verify formatting |
| Excalidraw canvas works | LABS-02 | Canvas UX | Visit /starseed/labs/canvas, draw shapes, verify persistence |
| Labs hub navigation | LABS-06 | Visual + nav | Visit /starseed/labs, verify 3 cards, click through to each tool |
| Editors don't load on other routes | LABS-03 | Network tab | Visit /starseed (not labs), check no editor chunks in network |

---

## Validation Sign-Off

- [x] All tasks have automated or human verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Verification approach documented and justified
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
