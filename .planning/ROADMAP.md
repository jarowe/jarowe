# Roadmap: jarowe.com

## Milestones

- ✅ **v1.0 Constellation** - Phases 1-2 (shipped 2026-02-28, Phases 3-6 deferred to future)
- ✅ **v2.0 Living World** - Phases 3-7 (shipped 2026-03-21)
- 🚧 **v2.0.1 Polish & Connect** - Phases 8-9 (in progress)

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

### v2.0.1 Polish & Connect (In Progress)

**Milestone Goal:** Fix regressions from v2.0, tighten content output, and improve visual cohesion across Starseed brand and TodayRail connections.

- [x] **Phase 8: Regression Fixes** - Fix constellation helix node colors and cap Glint journal to 2 sentences (completed 2026-03-22)
- [ ] **Phase 9: Visual Cohesion** - TodayRail explore-to-constellation connection, Starseed gold warmth restoration, and Workshop-style gradient cards

## Phase Details

### Phase 8: Regression Fixes
**Goal**: Constellation helix nodes render with correct theme-driven colors and Glint journal entries are concise -- no more rambling AI output or broken InstancedMesh visuals
**Depends on**: Phase 7 (v2.0 must be shipped)
**Requirements**: RENDER-01, CONTENT-01
**Success Criteria** (what must be TRUE):
  1. Constellation helix nodes display their category-specific emissive colors from theme data -- each node type (milestone, project, moment, etc.) is visually distinguishable by color, not all defaulting to the same shade
  2. The InstancedMesh instanceColor attribute updates correctly when theme or focus state changes, verified by hovering/clicking nodes and observing color transitions
  3. Glint's daily journal entry on the TodayRail is always 2 sentences or fewer -- both the API-generated version and every entry in the static fallback pool
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md -- Per-instance emissive colors via onBeforeCompile shader patch in NodeCloud.jsx, journal 2-sentence cap in API prompt and fallback pool

### Phase 9: Visual Cohesion
**Goal**: The TodayRail connects visitors to the constellation through holiday exploration, and Starseed recovers its warm gold identity with Workshop-quality card design
**Depends on**: Phase 8 (clean rendering baseline before visual polish)
**Requirements**: VISUAL-01, VISUAL-02, VISUAL-03
**Success Criteria** (what must be TRUE):
  1. The TodayRail "Explore" card displays the current holiday and links to a mapped constellation node -- clicking it navigates to the constellation focused on that node
  2. When no constellation node maps to the current holiday, the Explore card degrades gracefully -- showing the holiday without a broken link or missing content
  3. The Starseed hub and project cards use warm gold tones (not washed-out or desaturated) -- the brand warmth matches the original Starseed identity
  4. Starseed project cards use Workshop-style gradient backgrounds with depth and texture -- not flat solid-color cards
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md -- Holiday-to-constellation nodeId mapping on T3+ entries, TodayRail conditional Explore deep-link
- [ ] 09-02-PLAN.md -- Starseed gold brand restoration (purple to amber gold), Workshop-style gradient cards with translateZ depth

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9

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
| 9. Visual Cohesion | v2.0.1 | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-27 (v1.0)*
*Updated: 2026-03-22 (Phase 9 planned — 2 plans)*
