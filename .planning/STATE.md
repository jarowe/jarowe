---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Memory Capsules
status: Phase complete — ready for verification
stopped_at: Completed 11-03-PLAN.md
last_updated: "2026-03-23T09:06:04.391Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.
**Current focus:** Phase 11 — Cinematic Polish

## Current Position

Phase: 11 (Cinematic Polish) — EXECUTING
Plan: 3 of 3

## v2.1 Roadmap Summary

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 10 | Foundation + Asset Pipeline | DEPTH-01/02/03/04, SHELL-01/02/03, ASSET-01 | Not started |
| 11 | Cinematic Polish | CINE-01/02/03/04, PORT-02, PORT-04 | Not started |
| 12 | Flagship Scene + Portal | SHELL-04, PORT-01/03, ARC-01/02/03 | Not started |
| 13 | Integration + Expansion | PORT-05, ASSET-02 | Not started |

**Phase ordering rationale:**

- Phase 10 first: WebGL context lifecycle and depth artifact mitigation cannot be retrofitted
- Phase 11 second: Camera choreography + atmosphere must exist before flagship evaluation (screensaver gives false negative)
- Phase 12 third: Flagship capsule is the milestone anchor -- validates the concept with real emotional content
- Phase 13 last: Constellation integration + editor tooling only matter if flagship proves the experience

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.1)
- Average duration: --
- Total execution time: --

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend (from v2.0.1):**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 08 P01 | 2min | 2 tasks | 3 files |
| Phase 09 P02 | 3min | 2 tasks | 3 files |
| Phase 09 P01 | 4min | 2 tasks | 2 files |

*Updated after each plan completion*
| Phase 10 P01 | 5min | 4 tasks | 4 files |
| Phase 10 P02 | 3min | 2 tasks | 6 files |
| Phase 10 P03 | 4min | 3 tasks | 2 files |
| Phase 11 P01 | 4min | 2 tasks | 2 files |
| Phase 11 P02 | 6min | 4 tasks | 2 files |
| Phase 11 P03 | 4min | 3 tasks | 3 files |

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
- [Phase 08]: Used onBeforeCompile with vColor.rgb multiplication to preserve MeshStandardMaterial PBR lighting for per-instance emissive colors
- [Phase 09]: Per-card CSS custom property (--card-gradient) driven by inline style from project data for unique gradient identity
- [Phase 09]: Holiday-constellation linking via nodeId field on T3+ calendar entries with conditional deep-link in TodayRail
- [Phase 10]: CapsuleShell replaces MemoryPortal with renderer-agnostic routing (scene.renderMode x GPU tier) — Self-contained capsule module with SplatRenderer, DisplacedMeshRenderer stub, and ParallaxFallback as internal components
- [Phase 10]: PNG format for both photo and depth (not WebP) -- uniform header parsing for validation — Simpler validation, consistent dimension checks
- [Phase 10]: Fragment discard uses dFdx/dFdy screen-space derivatives with smoothstep alpha fade band for anti-aliased depth edges — Screen-space derivatives detect depth discontinuities precisely; smoothstep prevents hard cutoff artifacts
- [Phase 10]: ParallaxFallback uses two layers from same image with differential parallax speeds for depth illusion without WebGL — Avoids need for pre-separated depth layers while providing compelling depth effect on low-end devices
- [Phase 11]: CinematicCamera uses GSAP timeline with repeat:-1 for infinite loop; camera beat timing coarsely aligned to narrative card delays — Proven pattern for cinematic camera in memory capsules without OrbitControls
- [Phase 11]: COLOR_GRADING at module level, color grading in mesh fragment shader (not postprocessing pass), tier-gated postprocessing with CSS vignette fallback — Per-scene grading is tighter to photo in mesh shader; shared presets avoid duplication; CSS fallback gives simplified tier equivalent vignette
- [Phase 11]: Capsule-level ducking (duckForCapsule/restoreFromCapsule) separate from node-level ducking, targets 0.15 volume; uses Howler.volume() getter to avoid stale closures; cross-fade cleanup with delayed unload — Different lifecycle (route-level vs panel-level) and different volume targets (ambient duck vs silence) require separate mechanism

### v2.1 Research Flags

- **Phase 10 (WebGL context disposal):** react-globe.gl does not expose clean disposal API -- may need ref to globe instance + `globe.renderer().dispose()`. Validate against current Home.jsx globe code.
- **Phase 11 (iOS audio):** Interaction between `Howler.ctx.resume()` and existing `AudioContext.jsx` needs mapping before building capsule soundtrack.
- **Phase 12 (flagship photo selection):** "Capsule-worthy" checklist defined in research -- which specific Jared photo is the flagship candidate needs visual assessment (Syros sunset is strong candidate).

### Pending Todos (carried from v1.0/v2.0)

- Re-enable Bloom in production mode
- Instagram parser selector tuning
- Populate allowlist.json with real names

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-23T09:05:44.933Z
Stopped at: Completed 11-03-PLAN.md
Resume file: None
