# Roadmap: jarowe.com

## Milestones

- ✅ **v1.0 Constellation** - Phases 1-2 (shipped 2026-02-28, Phases 3-6 deferred to future)
- 🚧 **v2.0 Living World** - Phases 3-7 (in progress)

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

### v2.0 Living World (In Progress)

**Milestone Goal:** Transform jarowe.com from an impressive portfolio into a living, daily-pulse world with an AI operator (Glint), a branded business hub (Starseed), creation tools, and atmospheric intelligence.

- [ ] **Phase 3: Living Homepage** - Daily-rotating homepage state, time-of-day atmosphere, moon-phase visuals, Starseed route shell, and page transitions
- [ ] **Phase 4: Glint Operator** - Bounded tool use (navigate, launch games, control music), command palette, daily content surfacing, and in-character narration
- [ ] **Phase 5: Starseed Hub & Labs** - Project cards, client contact, DNS strategy, scratchpad (Milkdown), canvas (Excalidraw), and Labs hub page
- [ ] **Phase 6: Automation & Retention** - Weather-responsive atmosphere, dynamic OG images, visitor streaks, date-locked easter eggs, Glint-to-Labs handoff, and brainstorm mode
- [ ] **Phase 7: Immersive Portal** - Gaussian splat memory capsule with portal transition, soundtrack, narrative overlay, and shareable URL
- 🚧 **Phase 17: Memory Soundscape** (INSERTED) - Ambient soundscape system for memory capsule scenes with multi-layer Howler.js audio and gain envelopes

## Phase Details

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
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

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
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

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
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Immersive Portal
**Goal**: One flagship gaussian splat memory capsule gives the site a "wow" moment worth sharing -- a volumetric 3D scene of a meaningful place, reachable through a portal transition, with soundtrack and narrative
**Depends on**: Phase 3 (page transitions), Phase 6 (DAILY-03 dynamic OG for shareable URL)
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04
**Success Criteria** (what must be TRUE):
  1. One gaussian splat scene from a meaningful location is viewable in the site -- optimized to SPZ format, rendering smoothly on desktop and degrading gracefully on mobile
  2. The splat scene is reachable from the globe or constellation through a portal-style camera transition (flythrough, dissolve, or dimensional shader) -- not a hard page cut
  3. Inside the splat scene, a soundtrack auto-plays and narrative text overlays tell the story of the place -- the visitor understands why this location matters to Jared
  4. Visiting `/memory/[scene-name]` directly loads the splat scene with a dynamic OG image preview, making the URL shareable on social media with a compelling card
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 17: Memory Soundscape (INSERTED)
**Goal**: Provide ambient soundscape infrastructure for memory capsule scenes — multi-layer audio with gain envelopes, staggered entry, and site music ducking
**Depends on**: None (foundational audio infrastructure)
**Requirements**: PORTAL-03 (soundtrack auto-plays inside splat scene)
**Success Criteria** (what must be TRUE):
  1. `useSoundscape` hook loads ambient audio layers via Howler.js with gain envelope fade-in/fade-out
  2. `memoryScenes.js` exports scene registry with soundscape config for at least `syros-cave`
  3. Audio layers can be individually configured with volume, loop, and fade durations
  4. Hook ducks site music via AudioContext when soundscape starts
  5. Build succeeds with no errors

Plans:
- [x] 17-01-PLAN.md -- memoryScenes registry, useSoundscape hook, placeholder audio assets

## Progress

**Execution Order:**
Phases execute in numeric order: 3 -> 4 -> 5 -> 6 -> 7 (inserted phases execute independently)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Constellation Scene | v1.0 | 4/4 | Complete | 2026-02-28 |
| 2. Data Pipeline & Privacy | v1.0 | 5/6 | Gap closure | - |
| 3. Living Homepage | v2.0 | 0/? | Not started | - |
| 4. Glint Operator | v2.0 | 0/? | Not started | - |
| 5. Starseed Hub & Labs | v2.0 | 0/? | Not started | - |
| 6. Automation & Retention | v2.0 | 0/? | Not started | - |
| 7. Immersive Portal | v2.0 | 0/? | Not started | - |
| 17. Memory Soundscape | v2.0 | 1/? | In progress | - |

---
*Roadmap created: 2026-02-27 (v1.0)*
*Updated: 2026-03-20 (v2.0 Living World milestone added, Phases 3-7)*
*Updated: 2026-03-24 (Phase 17 Memory Soundscape inserted, plan 17-01 complete)*
