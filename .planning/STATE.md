---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Particle Memory Flight
status: Phase 16 Complete
stopped_at: Phase 16 plan 16-03 complete (wire filament flashes + exit reversal + polish)
last_updated: "2026-03-24T09:00:00Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.
**Current focus:** Phase 17 — Memory Soundscape (not started)

## Current Position

Phase: 16 (Dream Portal Transition) — COMPLETE (plans 16-01, 16-02, 16-03 all done)
Next phase: 17 (Memory Soundscape)

## v2.2 Roadmap Summary

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 14 | Particle Field Core | PART-01/02/03/04, INTEG-01/02 | Complete |
| 15 | Memory Flight Controller | FLIGHT-01/02/03/04 | Complete |
| 16 | Dream Portal Transition | DREAM-01/02/03/04 | Complete |
| 17 | Memory Soundscape | SOUND-01/02 | Not started |

**Phase ordering rationale:**

- Phase 14 first: ParticleField core must exist before anything can fly through it or dissolve into it. Dual position buffers allocated here prevent destructive rewrite in Phase 16. INTEG-01/02 are foundation -- CapsuleShell dispatch and buffer architecture must be correct from the start.
- Phase 15 second: Scroll-driven camera and the progress float (0-1) become the central data bus. All downstream systems (narrative cards, soundscape envelopes, portal gating) are consumers of this progress value.
- Phase 16 third: Dream portal dissolve/reform requires Phase 14 dual buffers + Phase 15 progress gating. The morphProgress uniform interpolates between scattered and photo-formed positions in the shared BufferGeometry.
- Phase 17 last: Audio polish with no downstream dependents. Receives progress from Phase 15. Can be validated only after the flight experience exists.

**Guardrail:** Protect PART-01, FLIGHT-01, DREAM-01/03 before audio polish or wire density.

## Performance Metrics

**Velocity:**

- Total plans completed: 8 (v2.2: Phase 14 x3 + Phase 15 x2 + Phase 16 x3)
- Average duration: ~6 min
- Total execution time: ~48 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 14 | 3/3 | ~25 min | ~8 min |
| 15 | 2/2 | ~15 min | ~7 min |

**Recent Trend:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 14 P01 | ~8min | 3 tasks | 5 files |
| Phase 14 P02 | ~8min | 2 tasks | 3 files |
| Phase 14 P03 | ~8min | 4 tasks | 4 files |
| Phase 15 P01 | ~10min | 4 tasks | 7 files |
| Phase 16 P01 | ~5min | 3 tasks | 3 files |
| Phase 16 P02 | ~8min | 5 tasks | 4 files |
| Phase 16 P03 | ~5min | 4 tasks | 3 files |

*Updated after each plan completion*

## v2.2 Summary (in progress)

Phase 14 complete (3 plans): ParticleMemoryField, breathing + bloom, wire connections + tier adaptation
Phase 15 complete (2 plans): FlightCamera (CatmullRom + scroll + momentum + micro-drift), flightPath config, ParticleFieldRenderer integration, progress-threshold narrative triggers in CapsuleShell
Phase 16 complete (3 plans): 16-01 directional tunnel scatter + uMorphStagger + wireUniforms ref; 16-02 DreamTransition GSAP timelines + FlightCamera tunnel mode + CapsuleShell integration; 16-03 wire filament flashes + exit reversal grammar + polish

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
- [Phase 15]: FlightCamera replaces CinematicCamera for particle-memory scenes with flightPath
- [Phase 15]: Spring-smoothed scroll progress with exponential decay (0.95/frame) for momentum
- [Phase 15]: Three motion layers: spline progress, mouse parallax (lerped), sine micro-drift (12s)
- [Phase 15]: FOV bell-curve narrowing 50→40→50 at power-2 easing centered at progress=0.5
- [Phase 15]: Narrative cards driven by progress thresholds (0.15/0.35/0.6/0.85), not time delays
- [Phase 15]: Dual-path narrative: progress-threshold (rAF poll of flightProgressRef) for particle-memory, time-based delay for all other scenes
- [Phase 16]: DreamTransition replaces PortalVFX for particle-memory scenes; PortalVFX preserved for splat/displaced-mesh
- [Phase 16]: 3-phase timeline: dissolve 1.5s (morph 1->0 + stagger ramp) -> tunnel 1.0s (auto-advance + FOV 30deg) -> reform 2.0s (morph 0->1 depth-staggered + FOV restore)
- [Phase 16]: FlightCamera tunnel mode: setTunnelMode(enabled, speed) — kills scroll, auto-advances, skips FOV bell-curve
- [Phase 16]: sessionStorage departure state (jarowe_dream_departure) with 5-min expiry for intentional return
- [Phase 16]: Exit dissolve is uniform (stagger=0), entry reform is depth-staggered (stagger=0.35)
- [Phase 16]: Wire filament flashes during tunnel void: uWireTransitionAlpha fades to 0 during dissolve, 3 brief flash bursts (~60ms on at 0.35 alpha, ~120ms decay) at 0.2/0.5/0.75s, restored to 1.0 during reform. Exit mirrors entry grammar.

### v2.2 Research Flags

- **Phase 14 (WebGL context):** Site already runs 3 WebGL contexts (globe, Prism3D, constellation). Fourth risks context exhaustion on mobile. Must confirm previous contexts are released before mounting particle Canvas. Never render globe + particle scene simultaneously.
- **Phase 14 (depth/photo UV):** Depth map must exactly match photo dimensions. Validate by overlaying at 50% opacity -- edges must align exactly.
- **Phase 14 (wire connections):** Naive K-nearest-neighbor over 150K particles is O(n^2). Use spatial hash grid. Pre-compute once at load, not per-frame. Target ~10K connections as pre-built LineSegments index buffer.
- **Phase 14 (asset weight):** Photo WebP q80 max 2048px, depth 8-bit single-channel max 1024px. Target <500KB total per capsule.
- ~~**Phase 15 (camera feel):** Spring-smooth progress before it drives the spline. Never let camera fully stop. Layer: spline progress (scroll), mouse parallax (15-30ms), breathing micro-drift (8-20s sine). Test at 2x speed.~~ RESOLVED in 15-01.
- ~~**Phase 16 (portal disorientation):** Store departure globe camera state in sessionStorage on entry; restore on return. Pre-load memory scene photo during portal animation.~~ PARTIALLY RESOLVED in 16-02 (departure state stored; photo pre-load deferred).
- **Phase 17 (audio assets):** Each scene needs 2-4 ambient layers (drone, wind, texture, climax). Source during Phase 15/16 so Phase 17 has real content.

### Pending Todos (carried from v1.0/v2.0)

- Re-enable Bloom in production mode
- Instagram parser selector tuning
- Populate allowlist.json with real names

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-24
Stopped at: Phase 16 complete — wire filament flashes, exit reversal grammar, dream portal transition system fully operational
Resume file: .planning/phases/16-dream-portal-transition/16-03-SUMMARY.md
