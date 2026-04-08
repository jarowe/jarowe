# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0.1 — Polish & Connect

**Shipped:** 2026-03-22
**Phases:** 2 | **Plans:** 3 | **Tasks:** 6

### What Was Built
- Per-instance emissive shader patch restoring theme-driven constellation node colors
- Glint journal 2-sentence cap (API prompt + fallback pool rewrite)
- TodayRail holiday-to-constellation deep-link (20 T3+ holidays mapped)
- Starseed gold brand identity replacing purple palette, with Workshop-style gradient card depth

### What Worked
- Skipping research for bug-fix and visual polish phases saved significant time — the codebase was the source of truth, not external domain knowledge
- Smart discuss with batch table proposals was efficient for a small milestone — 3 grey areas resolved in minutes
- Parallel Wave 1 execution (09-01 + 09-02 simultaneously) — zero file overlap enabled clean parallelism
- Plan checker caught no issues on first pass for both phases — planner quality was high

### What Was Inefficient
- `phase complete` CLI didn't properly update ROADMAP.md progress tables for either phase — required manual fixup both times
- The `roadmap analyze` disk_status vs. roadmap_complete mismatch caused confusion during autonomous startup

### Patterns Established
- Dark-cosmic-to-gold gradient pattern for Starseed brand: `linear-gradient(135deg, #1a1426 0%, #2a1f12 38%, #d4a843 100%)`
- Workshop influence = depth + shadows, NOT tilt — tilt is Workshop's signature, Starseed gets its own identity
- T3+ holiday tier as the threshold for constellation node mapping — keeps mappings meaningful

### Key Lessons
1. Bug-fix/polish milestones can skip research and context gathering when success criteria are already specific — saves 40%+ of the workflow
2. `onBeforeCompile` shader patching requires `customProgramCacheKey` for safety — flagged as low-severity tech debt
3. Per-card gradient variation (rotating hue within a gold range) creates card identity without requiring unique images

### Cost Observations
- Model mix: ~60% opus (planning + execution), ~40% sonnet (verification + integration checks)
- Sessions: 1 (single autonomous run)
- Notable: entire 2-phase milestone completed in a single conversation with autonomous mode

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0.1 | 1 | 2 | First autonomous full-milestone run; smart discuss replaced sequential discuss-phase |

### Top Lessons (Verified Across Milestones)

1. Skip research for phases where the codebase IS the research — bug fixes, visual polish, data tweaks
2. Phase complete CLI needs monitoring — roadmap status updates can silently fail
