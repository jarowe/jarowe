---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Best World Wins
status: planning
stopped_at: Roadmap created — 6 phases (18-23), ready for Phase 18 discussion
last_updated: "2026-04-05"
last_activity: 2026-04-05
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.
**Current focus:** v2.3 Best World Wins — world quality comparison matrix

## Current Position

Phase: 18 (Grading Rubric & Comparison Protocol) — next up
Plan: —
Status: Roadmap created, ready to discuss Phase 18
Last activity: 2026-04-05 — Roadmap for v2.3 created (Phases 18-23)

## v2.3 Phase Map

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 18 | Grading Rubric & Comparison Protocol | GRADE-01, GRADE-02, GRADE-04 | Not started |
| 19 | Generation Batches | WORLD-01, WORLD-02, WORLD-03 | Not started |
| 20 | Matrix-3D Viability Test | WORLD-02a, WORLD-02b | Not started |
| 21 | Lab Upgrade for Family Review | GRADE-03 | Not started |
| 22 | Subject Path Evaluation | SUBJ-01, SUBJ-02 | Not started |
| 23 | Winner Selection & Lock | WIN-01, WIN-02 | Not started |

## Previous Milestones

- v2.2 Particle Memory Flight (shipped 2026-03-24): particle-memory system, then pivoted to Gaussian splat worlds via SHARP/Marble. Spark.js renderer, family isolation, cleanup.
- v2.1 Memory Capsules (shipped 2026-03-23): CapsuleShell, displaced mesh, cinematic camera, soundtrack ducking, experience arc.
- v2.0 Living World: Starseed Hub, Glint Operator, Labs, Daily Engine, Immersive Portal.
- v1.0 Constellation (shipped 2026-02-28): constellation scene, data pipeline.

## Accumulated Context

### Decisions

- WorldMemoryRenderer is Spark-only (mkkellogg fully removed)
- Family isolation enforced in pipeline and lab
- Anchor semantics derived from provenance existence, not hardcoded tier list
- 13 dead particle-memory files still on disk (dormant, not blocking)
- SHARP pipeline working locally (.venv-sharp)
- Marble API used for naxos-rock and naxos-laugh
- WorldGen cloned in _experiments/ (same pipeline family as Marble)
- SAM 3D Body rejected for subject reconstruction (geometry-only, no appearance)
- Depth-warped billboard identified as pragmatic subject upgrade path
- SAM 3D Objects viable for non-human elements (Gaussian splat output with appearance)

### Research Available

- .planning/research/SINGLE-IMAGE-TO-3D-WORLD-2026.md
- .planning/research/MATRIX-3D-OPERATIONAL.md — cloud GPU viable (~$1.50/scene), video-based walk-through
- .planning/research/SAM3D-BODY-OPERATIONAL.md — rejected for subjects, exploratory for body prior
- .planning/research/GRADING-RUBRIC.md — 5-dimension rubric, 7-view protocol, winner protocol
- docs/splat-compression-streaming-research-2026-03-27.md
- docs/marble-spark-technical-research.md

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-05
Stopped at: Roadmap created for v2.3 (Phases 18-23). Next step: discuss Phase 18.
Resume file: None
