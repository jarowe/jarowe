---
phase: 14
slug: particle-field-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already configured) |
| **Config file** | `vite.config.js` (vitest integrated) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INTEG-01 | manual | Visual: CapsuleShell dispatches particle-memory renderMode | N/A | ⬜ pending |
| 14-01-02 | 01 | 1 | INTEG-02 | grep | `grep -r "aScatteredPosition\|aPhotoPosition" src/` | N/A | ⬜ pending |
| 14-02-01 | 02 | 1 | PART-01 | manual | Visual: navigate `/memory/syros-cave`, verify particle field renders recognizably | N/A | ⬜ pending |
| 14-02-02 | 02 | 1 | PART-03 | manual | Visual: verify breathing animation and bloom glow | N/A | ⬜ pending |
| 14-03-01 | 03 | 2 | PART-02 | grep | `grep -r "LineSegments\|spatialHash" src/` | N/A | ⬜ pending |
| 14-03-02 | 03 | 2 | PART-04 | grep | `grep -r "simplified\|parallax" src/` confirms tier branches | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or stubs needed — this phase is primarily visual/3D rendering validated by manual inspection + structural grep checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Particle field renders recognizable photo | PART-01 | 3D visual — no headless assertion | Navigate `/memory/syros-cave`, verify cave photo identifiable from multiple angles |
| Wire connections visible along edges | PART-02 | 3D visual — connection visibility | Inspect particle field for luminous filaments along depth contours |
| Breathing + bloom alive | PART-03 | Animation — requires temporal observation | Watch field for 5s stationary, confirm pulsing size/brightness + glow |
| Simplified tier 60fps | PART-04 | Performance — requires GPU profiling | Force simplified tier, open DevTools Performance tab, verify 60fps at 50-80K |
| Parallax CSS fallback | PART-04 | Visual — CSS-only path | Force parallax tier, verify photo renders with Ken Burns + sparse dots |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
