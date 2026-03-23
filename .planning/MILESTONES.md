# Milestones

## v2.2 Particle Memory Flight (In Progress)

**Phases:** 14-17 (4 phases)
**Requirements:** 16 (PART-01/02/03/04, FLIGHT-01/02/03/04, DREAM-01/02/03/04, SOUND-01/02, INTEG-01/02)

**Goal:** Replace the flagship desktop Memory Capsule renderer with a true particle-memory experience -- photos decompose into luminous 3D particle fields you fly through via scroll, with dreamstate portal transitions and progress-reactive audio. 1 flagship scene (syros-cave), desktop hero path.

**Phases:**

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 14 | Particle Field Core | PART-01/02/03/04, INTEG-01/02 | Not started |
| 15 | Memory Flight Controller | FLIGHT-01/02/03/04 | Not started |
| 16 | Dream Portal Transition | DREAM-01/02/03/04 | Not started |
| 17 | Memory Soundscape | SOUND-01/02 | Not started |

---

## v2.1 Memory Capsules (Shipped: 2026-03-23)

**Phases completed:** 3 phases, 9 plans, 26 tasks

**Key accomplishments:**

- 3-tier GPU detection (full/simplified/parallax), renderer-agnostic CapsuleShell replacing MemoryPortal, and extended scene registry with displaced-mesh support
- Capsule asset validation script and test assets with per-scene folder structure validated under 500KB budget using zero-dependency PNG header parsing
- Depth-displaced 3D mesh renderer with custom vertex/fragment shaders, multi-layer Ken Burns parallax fallback with gyroscope, and explicit tier-based renderer routing
- GSAP-driven multi-beat CinematicCamera replaces SlowDrift with per-scene keyframe choreography, easing variety, infinite loop, and mouse/gyro parallax
- 3-layer atmospheric particles, DOF/vignette/grain postprocessing, and per-scene warm/cool/golden color grading via GLSL fragment uniforms with tier-adaptive rendering
- Per-scene Howler.js soundtrack with user-intent fade-in, GlobalPlayer capsule ducking to 0.15, and cross-fade cleanup preventing audio gaps on exit
- SAM mask layer separation in vertex shader with GSAP-driven awakening (depth 0->target) and recession (depth->0 + warm white fade) experience arc
- Glass narrative cards gated behind awakening with 4-card emotional arc (place/feeling/meaning/gratitude) and 4-beat camera choreography
- Full PortalVFX entry/exit wired into capsule navigation with sessionStorage direct-access detection and dev test button

---

## v2.0.1 Polish & Connect (Shipped: 2026-03-22)

**Phases completed:** 2 phases, 3 plans, 6 tasks

**Key accomplishments:**

- Per-instance emissive shader patch for constellation node colors, plus 2-sentence cap on Glint journal entries
- 20 T3+ holidays mapped to constellation nodes with conditional "Explore in constellation" deep-link in TodayRail
- Starseed hub rebranded from purple/violet to warm amber gold (#d4a843-#f0c85a) with per-card gradient backgrounds and Workshop-style translateZ depth layering

---

## v2.0 Living World (Shipped: 2026-03-21)

**Phases completed:** 5 phases, 14 plans, 20 tasks

**Key accomplishments:**

- Deterministic daily seed rotation, 5-phase time-of-day CSS atmosphere, moon-phase-driven globe nebula/particle modulation, and 60 creative prompts for daily content rotation
- Branded /starseed hub route with gold visual identity, campaign-shell chrome, 3 project cards, and homepage cell integration
- 3-card Today Rail (date/holiday/featured node + Glint invitation + creative prompt with mode chip) above bento grid, plus global View Transitions API cross-fade on all React Router navigations
- OpenAI function calling with 4 tools (navigate, launch_game, control_music, show_daily), streaming SSE tool call accumulation, and two-phase narration UX in Glint AI chat
- cmdk command palette with 4 searchable categories and edge-cached AI daily journal with 30-entry static fallback in TodayRail
- Milkdown markdown scratchpad and Excalidraw infinite canvas with localStorage auto-save, lazy-loaded routes, and Vite es2022 config
- Open-Meteo weather integration with 5 date-locked easter eggs, additive CSS atmosphere, and Glint dialogue pools for environmental awareness
- Visitor streak tracking with localStorage freeze/milestone system and Vercel Function OG image API with 4 route-specific templates
- save_idea tool in both client/server dispatchers enabling Glint to capture ideas to scratchpad, plus brainstorm mode system prompt for structured ideation sessions
- Gaussian splat memory portal with volumetric 3D viewer, sequential narrative cards, ambient soundtrack, and capability-based mobile fallback

---
