---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Particle Memory Flight
status: planning
stopped_at: Phase 14 context gathered
last_updated: "2026-03-23T23:19:42.926Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.
**Current focus:** v2.2 Particle Memory Flight -- roadmap created, ready for Phase 14 planning

## Current Position

Phase: 14
Plan: Not started

## v2.2 Roadmap Summary

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 14 | Particle Field Core | PART-01/02/03/04, INTEG-01/02 | Not started |
| 15 | Memory Flight Controller | FLIGHT-01/02/03/04 | Not started |
| 16 | Dream Portal Transition | DREAM-01/02/03/04 | Not started |
| 17 | Memory Soundscape | SOUND-01/02 | Not started |

**Phase ordering rationale:**

- Phase 14 first: ParticleField core must exist before anything can fly through it or dissolve into it. Dual position buffers allocated here prevent destructive rewrite in Phase 16. INTEG-01/02 are foundation -- CapsuleShell dispatch and buffer architecture must be correct from the start.
- Phase 15 second: Scroll-driven camera and the progress float (0-1) become the central data bus. All downstream systems (narrative cards, soundscape envelopes, portal gating) are consumers of this progress value.
- Phase 16 third: Dream portal dissolve/reform requires Phase 14 dual buffers + Phase 15 progress gating. The morphProgress uniform interpolates between scattered and photo-formed positions in the shared BufferGeometry.
- Phase 17 last: Audio polish with no downstream dependents. Receives progress from Phase 15. Can be validated only after the flight experience exists.

**Guardrail:** Protect PART-01, FLIGHT-01, DREAM-01/03 before audio polish or wire density.

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.2)
- Average duration: --
- Total execution time: --

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend (from v2.1):**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 10 P01 | 5min | 4 tasks | 4 files |
| Phase 10 P02 | 3min | 2 tasks | 6 files |
| Phase 10 P03 | 4min | 3 tasks | 2 files |
| Phase 11 P01 | 4min | 2 tasks | 2 files |
| Phase 11 P02 | 6min | 4 tasks | 2 files |
| Phase 11 P03 | 4min | 3 tasks | 3 files |
| Phase 12 P01 | 8min | 3 tasks | 2 files |
| Phase 12 P02 | 8min | 2 tasks | 3 files |
| Phase 12 P03 | 7min | 3 tasks | 3 files |

*Updated after each plan completion*

## v2.1 Summary

Phases 10-12 complete (9 plans, 26 tasks):

- Phase 10: CapsuleShell dispatch, GPU tier detection, displaced mesh renderer, asset pipeline validation
- Phase 11: CinematicCamera, atmospheric particles, DOF/vignette/grain, color grading, soundtrack ducking
- Phase 12: SAM mask layer separation, experience arc, narrative cards, PortalVFX integration

## v2.0.1 Summary

Phases 08-09 complete (3 plans):

- Phase 08: Per-instance emissive shader colors, journal 2-sentence cap
- Phase 09: TodayRail holiday-constellation links, Starseed gold brand restoration

## v2.0 Summary

Phases 03-07 complete (14 plans):

- Phase 03: Starseed Hub + Today Layer
- Phase 04: Glint Operator + Command Palette
- Phase 05: Starseed Labs (Scratchpad + Canvas)
- Phase 06: Daily Engine (Weather, Streaks, Easter Eggs, OG)
- Phase 07: Immersive Portal (Gaussian Splat)

## v1.0 Summary

Phases 1-2 complete (9 plans, 1.74 hours total execution):

- Phase 1: Constellation Scene (4 plans, complete)
- Phase 2: Data Pipeline & Privacy (5/6 plans, gap closure pending)

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Key decisions carried forward:

- Starseed Hub uses campaign-shell pattern (proven from music takeover)
- Daily engine before spectacle (retention before acquisition)
- Glint bounded tool use, not generic chatbot
- [Phase 10]: CapsuleShell replaces MemoryPortal with renderer-agnostic routing (scene.renderMode x GPU tier)
- [Phase 10]: Fragment discard uses dFdx/dFdy screen-space derivatives with smoothstep alpha fade band
- [Phase 11]: CinematicCamera uses GSAP timeline with repeat:-1 for infinite loop
- [Phase 11]: Capsule-level ducking (duckForCapsule/restoreFromCapsule) separate from node-level ducking
- [Phase 12]: SAM mask smoothstep(0.4, 0.6) for soft foreground/background depth separation
- [Phase 12]: Narrative cards gated behind awakeningComplete; 4-card emotional arc at timed delays
- [Phase 12]: Portal entry navigates at rupture phase; direct URL access shortens awakening

### v2.2 Research Flags

- **Phase 14 (WebGL context):** Site already runs 3 WebGL contexts (globe, Prism3D, constellation). Fourth risks context exhaustion on mobile. Must confirm previous contexts are released before mounting particle Canvas. Never render globe + particle scene simultaneously.
- **Phase 14 (depth/photo UV):** Depth map must exactly match photo dimensions. Validate by overlaying at 50% opacity -- edges must align exactly.
- **Phase 14 (wire connections):** Naive K-nearest-neighbor over 150K particles is O(n^2). Use spatial hash grid. Pre-compute once at load, not per-frame. Target ~10K connections as pre-built LineSegments index buffer.
- **Phase 14 (asset weight):** Photo WebP q80 max 2048px, depth 8-bit single-channel max 1024px. Target <500KB total per capsule.
- **Phase 15 (camera feel):** Spring-smooth progress before it drives the spline. Never let camera fully stop. Layer: spline progress (scroll), mouse parallax (15-30ms), breathing micro-drift (8-20s sine). Test at 2x speed.
- **Phase 16 (portal disorientation):** Store departure globe camera state in sessionStorage on entry; restore on return. Pre-load memory scene photo during portal animation.
- **Phase 17 (audio assets):** Each scene needs 2-4 ambient layers (drone, wind, texture, climax). Source during Phase 15/16 so Phase 17 has real content.

### Pending Todos (carried from v1.0/v2.0)

- Re-enable Bloom in production mode
- Instagram parser selector tuning
- Populate allowlist.json with real names

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-23T23:19:42.923Z
Stopped at: Phase 14 context gathered
Resume file: .planning/phases/14-particle-field-core/14-CONTEXT.md
