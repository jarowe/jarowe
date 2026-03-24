# Roadmap: jarowe.com

## Milestones

- ✅ **v1.0 Constellation** - Phases 1-2 (shipped 2026-02-28, Phases 3-6 deferred to future)
- ✅ **v2.0 Living World** - Phases 3-7 (shipped 2026-03-21)
- ✅ **v2.0.1 Polish & Connect** - Phases 8-9 (shipped 2026-03-22)
- ✅ **v2.1 Memory Capsules** - Phases 10-12 (shipped 2026-03-23)
- 🚧 **v2.2 Particle Memory Flight** - Phases 14-17 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 Constellation (Phases 1-2) - SHIPPED 2026-02-28</summary>

### Phase 1: Constellation Scene
**Goal**: Users can explore a 3D constellation of life moments -- navigating, hovering, clicking, and scrubbing through time -- on any device
**Plans**: 4 plans (complete)

Plans:
- [x] 01-01-PLAN.md -- R3F scene setup, instanced mesh rendering, double-helix layout, starfield/nebula, GPU tier detection, disposal
- [x] 01-02-PLAN.md -- Camera fly-to, hover labels, detail panel, timeline scrubber, toolbar, media lightbox, entity chips, ESC/back
- [x] 01-03-PLAN.md -- Connection lines with focus-aware opacity, "Because..." evidence lens, 2D accessible list fallback
- [x] 01-04-PLAN.md -- UAT gap closure: hover label type/date, timeline scrubber positioning, empty-space focus clear

### Phase 2: Data Pipeline & Privacy
**Goal**: The constellation is populated with real life data from Instagram and Carbonmade exports, with privacy enforced at every layer
**Plans**: 6 plans (5 complete, 1 gap closure pending)

Plans:
- [x] 02-01-PLAN.md -- Instagram HTML parser, EXIF stripping, GPS redaction, canonical schema
- [x] 02-02-PLAN.md -- Carbonmade JSON parser, epoch configuration, pipeline config
- [x] 02-03-PLAN.md -- Evidence-based edge generation, helix layout, pipeline orchestrator, frontend data loader
- [x] 02-04-PLAN.md -- Privacy validation (fail-closed audit), visibility tiers, minors policy, allowlist enforcement
- [x] 02-05-PLAN.md -- Thin admin page (pipeline status + publish/hide), pipeline resilience
- [ ] 02-06-PLAN.md -- GAP CLOSURE: Wire data loader into UI (deferred from v1.0)

**v1.0 Deferred Phases (3-6):** Narrator, Admin Dashboard, Automation, and Bento Hub Integration remain in backlog. Not canceled -- may be revisited in future milestones.

</details>

<details>
<summary>v2.0 Living World (Phases 3-7) - SHIPPED 2026-03-21</summary>

### Phase 3: Living Homepage
**Goal**: The homepage feels alive and temporally aware -- visitors immediately sense that this site knows what day and time it is, with a branded Starseed shell ready for content
**Depends on**: Phase 2 (constellation data available)
**Requirements**: TODAY-01, TODAY-02, TODAY-03, TODAY-07, DAILY-01, DAILY-02, STAR-01, STAR-03, STAR-04
**Success Criteria** (what must be TRUE):
  1. Visitor arriving at the homepage sees date-specific content (holiday, featured node, creative prompt) within 5 seconds of page load, and the content is different on different days
  2. The homepage color temperature visibly shifts across the day -- warm dawn/dusk tones vs. bright daylight vs. cool night -- driven by CSS custom properties that update based on local time
  3. Constellation particle brightness and nebula glow subtly change in response to the current moon phase (verifiable by checking on full moon vs. new moon)
  4. Navigating to `/starseed` shows a branded shell with Starseed fonts, colors, and chrome -- visually distinct from the main jarowe.com aesthetic -- with a clear escape hatch back to the main site
  5. Page transitions between React Router routes use smooth morphing animations (View Transitions API) with graceful fallback on unsupported browsers
**Plans**: 3 plans (complete)

Plans:
- [x] 03-01-PLAN.md -- Daily engine (dailySeed, astro, timeOfDay utilities), time-of-day atmosphere CSS, moon phase globe integration, creative prompt data pool
- [x] 03-02-PLAN.md -- Starseed branded hub route with campaign-shell pattern, own chrome/nav, gold accent identity, escape hatch navigation
- [x] 03-03-PLAN.md -- Today Rail component (3 living cards above bento grid), View Transitions API utility with fallback

### Phase 4: Glint Operator
**Goal**: Glint becomes an actionable guide -- visitors can ask him to navigate, play games, control music, and surface daily content, with a command palette as the keyboard-first alternative
**Depends on**: Phase 3 (daily content and Starseed shell must exist for Glint to reference)
**Requirements**: GLINT-01, GLINT-02, GLINT-03, GLINT-04, GLINT-05, GLINT-07, TODAY-05
**Success Criteria** (what must be TRUE):
  1. Visitor can say "Take me to the constellation" (or similar) in Glint chat and the site navigates to /constellation -- Glint narrates the action in character rather than showing a robotic confirmation
  2. Visitor can say "Play a game" and Glint launches a game from the registry, or say "Play some music" and Glint controls playback (play/pause/next) -- all narrated in Glint's voice
  3. Pressing Cmd+K (or Ctrl+K) opens a command palette that searches pages, constellation nodes, games, and actions -- sharing the same action dispatcher that powers Glint's tools
  4. Visitor can ask "What's new today?" and Glint responds with the current daily content, creative prompt, and any relevant daily state
  5. An AI-generated "Thought of the Day" card from Glint appears on the homepage, refreshing daily with a new journal-style reflection
**Plans**: 3 plans (complete)

Plans:
- [x] 04-01-PLAN.md -- Action dispatcher module, OpenAI function calling in glint-chat API, tool call streaming, client-side narration + dispatch in Home.jsx
- [x] 04-02-PLAN.md -- cmdk command palette with 4 categories, glint-journal Edge API endpoint, journal fallback data pool, TodayRail journal card
- [x] 04-03-PLAN.md -- Global palette wiring in App.jsx, music control listener in AudioProvider, show_daily handler, integration checkpoint

### Phase 5: Starseed Hub & Labs
**Goal**: Starseed becomes a real, professional creation destination -- visitors can browse active projects, contact Jared for business, and open creation tools (scratchpad, canvas) within the Starseed brand
**Depends on**: Phase 3 (Starseed shell and brand must exist)
**Requirements**: STAR-02, STAR-05, STAR-06, STAR-07, LABS-01, LABS-02, LABS-03, LABS-06
**Success Criteria** (what must be TRUE):
  1. `/starseed` displays project cards for active Starseed projects (BEAMY, AMINA, DECKIT, Starseed Labs) with icons, descriptions, tags, and each card links to its detail page or external URL
  2. A contact/inquiry section exists within the Starseed hub for business inquiries (form or mailto) -- visitors can reach Jared for professional work
  3. Visiting starseed.llc in a browser reaches the same content as jarowe.com/starseed (DNS redirect or reverse proxy in place)
  4. `/starseed/labs/scratchpad` opens a Milkdown markdown editor with auto-save to localStorage, and `/starseed/labs/canvas` opens an Excalidraw infinite canvas with localStorage persistence -- neither loads on non-Labs routes (verified via network tab)
  5. `/starseed/labs` shows a hub page with entry point cards to scratchpad, canvas, and brainstorm -- clear navigation into each creation tool
**Plans**: 3 plans (complete)

Plans:
- [x] 05-01-PLAN.md -- Upgrade Starseed hub with 4 data-driven project cards, contact section with mailto, Labs nav link, and starseed.llc DNS redirect checkpoint
- [x] 05-02-PLAN.md -- Milkdown scratchpad and Excalidraw canvas pages with localStorage persistence, Vite es2022 config, lazy-loaded routes in App.jsx
- [x] 05-03-PLAN.md -- Labs hub page with 3 glass cards (Scratchpad, Canvas, Brainstorm), LabsHub route, TodayRail CTA linking to scratchpad with prompt pre-load

### Phase 6: Automation & Retention
**Goal**: The site becomes self-sustaining and return-worthy -- weather drives atmosphere, social previews generate automatically, streaks reward daily visitors, easter eggs surprise on special dates, and Glint can save ideas directly into Labs
**Depends on**: Phase 4 (Glint tool system), Phase 5 (Labs scratchpad for idea saving)
**Requirements**: TODAY-04, TODAY-06, GLINT-06, LABS-04, LABS-05, DAILY-03, DAILY-04, DAILY-05, DAILY-06
**Success Criteria** (what must be TRUE):
  1. Real weather data from the visitor's location visibly affects the globe and constellation atmosphere -- fog density, particle speed, precipitation overlay, and color warmth change based on current conditions
  2. Sharing any site URL on social media shows a route-specific OG preview card (not a generic fallback) -- homepage, constellation, games, and Starseed each have distinct previews generated via Edge Function
  3. A visitor who returns on consecutive days sees their streak count, Glint reacts at milestones (3, 7, 14, 30 days), and one streak freeze is available to protect the streak
  4. Visiting on special dates (full moon, Friday the 13th, Pi Day, solstices, site birthday) triggers unique visual effects and Glint dialogue that only appear on those dates
  5. Visitor can tell Glint "Save this idea" and it creates a note in the Labs scratchpad with pre-populated content; visitor can also enter a brainstorm mode with Glint that generates a structured project brief
**Plans**: 3 plans (complete)

Plans:
- [x] 06-01-PLAN.md -- Weather atmosphere (Open-Meteo API, CSS properties, globe uniforms) and date-locked easter eggs (5 event types with CSS effects and Glint dialogue)
- [x] 06-02-PLAN.md -- Visitor streak system (localStorage, freeze, milestone events) and dynamic OG social preview images (@vercel/og with 4 route-specific templates)
- [x] 06-03-PLAN.md -- Glint-to-Labs save_idea tool, brainstorm mode via system prompt, scratchpad localStorage integration (TODAY-06 descoped)

### Phase 7: Immersive Portal
**Goal**: One flagship gaussian splat memory capsule gives the site a "wow" moment worth sharing -- a volumetric 3D scene of a meaningful place, reachable through a portal transition, with soundtrack and narrative
**Depends on**: Phase 3 (page transitions), Phase 6 (DAILY-03 dynamic OG for shareable URL)
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04
**Success Criteria** (what must be TRUE):
  1. One gaussian splat scene from a meaningful location is viewable in the site -- optimized to SPZ format, rendering smoothly on desktop and degrading gracefully on mobile
  2. The splat scene is reachable from the globe or constellation through a portal-style camera transition (flythrough, dissolve, or dimensional shader) -- not a hard page cut
  3. Inside the splat scene, a soundtrack auto-plays and narrative text overlays tell the story of the place -- the visitor understands why this location matters to Jared
  4. Visiting `/memory/[scene-name]` directly loads the splat scene with a dynamic OG image preview, making the URL shareable on social media with a compelling card
**Plans**: 2 plans (complete)

Plans:
- [x] 07-01-PLAN.md -- Scene registry, GPU capability detection, splat viewer component with @mkkellogg/gaussian-splats-3d, narrative overlay, soundtrack integration, mobile fallback
- [x] 07-02-PLAN.md -- Route wiring in App.jsx, Memory OG template in api/og.js, portal entry point on globe with View Transitions, human verification checkpoint

</details>

<details>
<summary>v2.0.1 Polish & Connect (Phases 8-9) - SHIPPED 2026-03-22</summary>

### Phase 8: Regression Fixes
**Goal**: Constellation helix nodes render with correct theme-driven colors and Glint journal entries are concise
**Requirements**: RENDER-01, CONTENT-01
**Plans**: 1 plan (complete)

Plans:
- [x] 08-01-PLAN.md -- Per-instance emissive colors via onBeforeCompile shader patch, journal 2-sentence cap

### Phase 9: Visual Cohesion
**Goal**: TodayRail connects to constellation via holiday exploration, Starseed recovers warm gold identity
**Requirements**: VISUAL-01, VISUAL-02, VISUAL-03
**Plans**: 2 plans (complete)

Plans:
- [x] 09-01-PLAN.md -- Holiday-to-constellation nodeId mapping, TodayRail conditional Explore deep-link
- [x] 09-02-PLAN.md -- Starseed gold brand restoration, Workshop-style gradient cards with translateZ depth

</details>

<details>
<summary>v2.1 Memory Capsules (Phases 10-12) - SHIPPED 2026-03-23</summary>

### Phase 10: Foundation + Asset Pipeline
**Goal**: A depth-displaced 3D mesh renders from a single photo without visual artifacts, with WebGL context lifecycle managed, GPU tiers detected, and a validated asset pipeline producing compressed capsule assets
**Depends on**: Phase 9 (clean v2.0.1 baseline)
**Requirements**: DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, SHELL-01, SHELL-02, SHELL-03, ASSET-01
**Success Criteria** (what must be TRUE):
  1. Navigating to `/memory/:sceneId` renders a depth-displaced 3D mesh from a photo+depth pair -- the image visibly has 3D parallax when the camera subtly moves, not a flat plane
  2. Foreground/background edges show clean separation (fragment discard on depth discontinuities) -- no rubber-sheet stretching artifacts where foreground meets background
  3. Navigating from home (globe) to `/memory/:sceneId` and back does not crash or lose the globe -- WebGL contexts are explicitly disposed on route exit and recreated on return
  4. On a low-end mobile device, the scene gracefully degrades to a parallax + Ken Burns 2D experience instead of attempting the full displaced mesh
  5. Each capsule's total asset payload (photo + depth map + preview) is under 500KB, validated by the compression pipeline

### Phase 11: Cinematic Polish
**Goal**: The displaced mesh transforms from a tech demo into an experience -- constrained camera choreography, atmospheric particles, depth-of-field, color grading, and soundtrack make the visitor forget they are looking at a displaced photo
**Depends on**: Phase 10 (working displaced mesh renderer with artifact mitigation)
**Requirements**: CINE-01, CINE-02, CINE-03, CINE-04, PORT-02, PORT-04
**Success Criteria** (what must be TRUE):
  1. The camera moves on a scripted cinematic path (drift, dolly, parallax) -- there are no OrbitControls, no free-roam; the visitor is guided through the memory
  2. Camera movement follows multi-beat GSAP keyframes (push in, pause, slow drift) with different easing periods -- it does NOT look like a screensaver or a linear loop
  3. Atmospheric dust motes, bokeh specks, and light drift particles float through the scene; depth-of-field shifts focus between foreground and background; vignette and film grain add cinematic texture
  4. The scene has a warm/cool/golden color mood applied via fragment uniform or postprocessing -- visibly different from a raw photo
  5. A per-scene soundtrack plays via Howler.js with fade-in after user intent; GlobalPlayer music ducks (volume reduces) on capsule entry and restores on exit

### Phase 12: Flagship Scene + Portal
**Goal**: One real Jared memory is proven end-to-end as an unforgettable capsule -- with SAM layer separation, emotional narrative, portal transitions, and the full experience arc from still image awakening to gentle recession
**Depends on**: Phase 11 (cinematic polish must be in place before validating the experience)
**Requirements**: SHELL-04, PORT-01, PORT-03, ARC-01, ARC-02, ARC-03
**Success Criteria** (what must be TRUE):
  1. The flagship capsule uses a real Jared memory photo with genuine emotional charge -- not a stock image or test photo -- and the narrative text reads as "remembered thoughts, not captions"
  2. The scene begins as a flat still image; depth slowly wakes up; the camera drifts with "impossible gentleness" -- a visitor watching it unfold says "whoa" within the first 5 seconds
  3. Foreground objects (people, structures) move at a visibly different emotional rhythm than the background (sky, landscape) via SAM-generated layer masks -- the parallax feels like looking through a window, not at a flat surface
  4. At the end of the experience, the memory visually recedes -- fading, pulling back, or dissolving rather than cutting to black or navigating away
  5. Entry to the capsule uses full PortalVFX phases (existing portal transition system) -- the visitor enters through a portal, not a route change

### Phase 13: Integration + Expansion *(OPTIONAL / STRETCH)*
**Goal**: Memory capsules are woven into the constellation and site navigation -- constellation memory-type nodes link directly to capsules, and the system is ready for additional scenes
**Depends on**: Phase 12 (flagship must be proven before expanding)
**Condition**: Only pursue if Phase 12 proves the experience. The milestone is complete after Phase 12 ships successfully. This phase adds ecosystem integration, not core value.
**Requirements**: PORT-05, ASSET-02
**Success Criteria** (what must be TRUE):
  1. Memory-type constellation nodes have a "Step Inside" affordance that navigates to the corresponding capsule scene -- the link is discoverable without documentation
  2. The CapsuleEditor (lil-gui) provides live tuning for depth parameters, camera keyframes, atmosphere settings, and color grading -- an author can tune a new scene without touching code
  3. Adding a second capsule scene requires only adding assets to `public/memory/{scene-id}/` and a registry entry -- no code changes to the renderer or shell

</details>

### v2.2 Particle Memory Flight (In Progress)

**Milestone Goal:** Replace the flagship desktop Memory Capsule renderer with a true particle-memory experience -- photos decompose into luminous 3D particle fields you fly through via scroll, with dreamstate portal transitions and progress-reactive audio.

**Guardrail:** If tradeoffs appear, protect the particle flight experience (PART-01, FLIGHT-01, DREAM-01/03) before protecting audio polish or wire connection density.

**Scope:** 1 flagship scene (syros-cave), desktop hero path only. Parallax fallback preserved for low-end devices.

**Structure:** 4 phases (14-17). No optional/stretch phases. The milestone is complete when all four phases ship.

### Phase 14: Particle Field Core
**Goal**: A photo + depth map produces a luminous 3D particle field of 80K-150K points with selective wire connections, breathing animation, and tier-adaptive rendering -- integrated into the existing CapsuleShell dispatch with dual position buffers pre-allocated for future dream portal transitions
**Depends on**: Phase 12 (shipped CapsuleShell + scene registry + GPU tier system)
**Requirements**: PART-01, PART-02, PART-03, PART-04, INTEG-01, INTEG-02
**Success Criteria** (what must be TRUE):
  1. Navigating to `/memory/syros-cave` on desktop renders the photo as a recognizable 3D particle field (not a flat texture or isolated dots) -- the syros cave is identifiable from any viewing angle on the rail
  2. Visible wire connections link nearby particles along depth edges and contours -- the field has structure, not just scattered points (a "holographic memory" quality)
  3. Particles visibly breathe (size + brightness oscillation) and have bloom glow -- the field feels alive when the camera is stationary, not a static screenshot
  4. On a mid-range GPU (simplified tier), the scene renders at 50-80K particles without wire connections or bloom, still at 60fps -- and on low-end devices, the existing CSS parallax fallback renders instead
  5. Both `scatteredPositions` and `photoPositions` buffers exist in the geometry at init time -- verified by inspecting the BufferGeometry attributes (two position-like attributes present)

Plans:
- [x] 14-01-PLAN.md -- ParticleMemoryField component (CPU sampling, dual buffers, breathing, wires, tier adaptation), CapsuleShell dispatch integration, scene registry update
- [x] 14-02-PLAN.md -- Breathing, bloom, and visual polish (breathScale, vBreathPhase, brightnessPulse, PostProcessing, CinematicCamera)
- [x] 14-03-PLAN.md -- Wire connections (spatial hash + LineSegments) in modular architecture, tier adaptation gating, parallax fallback verification, dead code cleanup

### Phase 15: Memory Flight Controller
**Plans**: 2 plans (complete)
**Goal**: Scroll/trackpad/touch input drives the camera along a 3D spline through the particle field with momentum, inertial drift, and progress-normalized narrative card triggers -- the visitor flies through the memory at their own pace
**Depends on**: Phase 14 (particle field must render before camera can fly through it)
**Requirements**: FLIGHT-01, FLIGHT-02, FLIGHT-03, FLIGHT-04
**Success Criteria** (what must be TRUE):
  1. Scrolling the mouse wheel or trackpad moves the camera forward along a CatmullRom spline path through the particle field -- wheel forward = deeper into the memory, wheel backward = retreat
  2. Releasing the scroll input does not instantly stop the camera -- momentum carries it forward with visible exponential decay, creating a physical "gliding" sensation
  3. Narrative glass cards appear at specific progress thresholds (e.g., 0.25, 0.5, 0.75) rather than at fixed time delays -- a visitor who scrolls slowly sees cards later in clock time than one who scrolls fast
  4. When the visitor stops scrolling for several seconds, an imperceptible micro-drift keeps the camera alive -- the scene never feels frozen, but the next scroll input immediately overrides the drift

Plans:
- [x] 15-01-PLAN.md -- FlightCamera with CatmullRom spline + scroll momentum + micro-drift, flightPath config for syros-cave, ParticleFieldRenderer integration, build verification
- [x] 15-02-PLAN.md -- Progress-threshold narrative triggers in memoryScenes.js + CapsuleShell dual-path narrative (progress vs time-based)

### Phase 16: Dream Portal Transition
**Goal**: Entry to the capsule dissolves reality into scattered particles, streams through a luminous void, and reforms particles into the memory photo formation -- exit reverses the grammar -- replacing the existing PortalVFX with dream-logic transitions
**Depends on**: Phase 14 (dual position buffers), Phase 15 (progress system for activation gating)
**Requirements**: DREAM-01, DREAM-02, DREAM-03, DREAM-04
**Success Criteria** (what must be TRUE):
  1. Entering the capsule from the home page visibly scatters the current view into particles before the route change -- the visitor sees reality break apart, not a UI fade or instant teleport
  2. During the tunnel/void phase, particles stream past the camera in a directional flow -- the visitor feels like they are falling through luminous space between worlds
  3. On arrival, particles visibly assemble from scattered chaos into the photo formation over 1-3 seconds -- the memory crystallizes, and the moment of recognition ("oh, it's a photo!") is the emotional peak
  4. Exiting the capsule reverses the dream grammar -- photo dissolves back into particles, same void/tunnel, particles reform into the origin page -- it is NOT a different transition or a hard navigate

Plans:
- [x] 16-01-PLAN.md -- Directional tunnel scatter in particleSampler, uMorphStagger uniform for depth-staggered convergence, wireUniforms exposed via ParticleMemoryField ref
- [ ] 16-02-PLAN.md -- DreamTransition component with GSAP entry/exit timelines, dissolve + tunnel void + reform phases
- [ ] 16-03-PLAN.md -- Wire filament flashes during tunnel void, exit reversal, FOV convergence, polish

### Phase 17: Memory Soundscape
**Goal**: Layered ambient audio (drone, texture, detail) evolves with scroll progress through per-layer volume envelopes, with smooth GlobalPlayer ducking on capsule entry/exit -- the flight has an emotional sound journey, not silence
**Depends on**: Phase 15 (progress float drives soundscape envelopes)
**Requirements**: SOUND-01, SOUND-02
**Success Criteria** (what must be TRUE):
  1. At least two distinct audio layers are audible during the flight, and their relative volumes visibly change as the visitor scrolls deeper -- the sound at progress 0.0 is noticeably different from the sound at progress 0.8
  2. The soundscape fades in smoothly on capsule entry (no pop or abrupt start) and fades out on exit -- there is never a moment of jarring silence or audio collision
  3. If GlobalPlayer music is playing when the capsule opens, its volume ducks smoothly to a low level (not muted) and restores smoothly on exit -- both audio sources coexist without fighting

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Constellation Scene | v1.0 | 4/4 | Complete | 2026-02-28 |
| 2. Data Pipeline & Privacy | v1.0 | 5/6 | Gap closure | - |
| 3. Living Homepage | v2.0 | 3/3 | Complete | 2026-03-21 |
| 4. Glint Operator | v2.0 | 3/3 | Complete | 2026-03-21 |
| 5. Starseed Hub & Labs | v2.0 | 3/3 | Complete | 2026-03-21 |
| 6. Automation & Retention | v2.0 | 3/3 | Complete | 2026-03-21 |
| 7. Immersive Portal | v2.0 | 2/2 | Complete | 2026-03-21 |
| 8. Regression Fixes | v2.0.1 | 1/1 | Complete | 2026-03-22 |
| 9. Visual Cohesion | v2.0.1 | 2/2 | Complete | 2026-03-22 |
| 10. Foundation + Asset Pipeline | v2.1 | 3/3 | Complete    | 2026-03-23 |
| 11. Cinematic Polish | v2.1 | 3/3 | Complete    | 2026-03-23 |
| 12. Flagship Scene + Portal | v2.1 | 3/3 | Complete    | 2026-03-23 |
| 13. Integration + Expansion | v2.1 | 0/0 | Deferred | - |
| 14. Particle Field Core | v2.2 | 3/3 | Complete | 2026-03-24 |
| 15. Memory Flight Controller | v2.2 | 2/2 | Complete | 2026-03-24 |
| 16. Dream Portal Transition | v2.2 | 1/3 | In progress | - |
| 17. Memory Soundscape | v2.2 | 0/0 | Not started | - |

---
*Roadmap created: 2026-02-27 (v1.0)*
*Updated: 2026-03-23 (v2.2 Particle Memory Flight roadmap -- 4 phases, 16 requirements)*
*Updated: 2026-03-24 (Phase 14 complete — all 3 plans done)*
*Updated: 2026-03-24 (Phase 15 complete — plan 15-01 FlightCamera + scroll-driven spline, plan 15-02 progress-threshold narrative triggers)*
*Updated: 2026-03-24 (Phase 16 plan 16-01 complete — directional tunnel scatter, morph stagger, wireUniforms ref)*
