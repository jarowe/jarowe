# Roadmap: jarowe.com

## Milestones

- ✅ **v1.0 Constellation** - Phases 1-2 (shipped 2026-02-28, Phases 3-6 deferred to future)
- 🚧 **v2.0 Living World** - Phases 3-7 (in progress)
- 🚧 **v2.3 Best World Wins** - Phases 18-23 (in progress)

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
- [x] **Phase 17: Memory Soundscape** (INSERTED) - Layered soundscape audio for memory capsules with per-instance ducking and CapsuleShell viewer

### v2.3 Best World Wins (In Progress)

**Milestone Goal:** Choose the best world-generation family for each hero memory through controlled comparison, then attach the best subject reconstruction to that winner. Grading rubric, generation batches, Matrix-3D viability test, family-first lab review, subject path evaluation, and locked winner selection.

- [ ] **Phase 18: Grading Rubric & Comparison Protocol** - 5-dimension rubric in lab tooling, CLI integration, 7 standard camera views, comparison summary
- [ ] **Phase 19: Generation Batches** - Marble + WorldGen batches for naxos-rock and syros-cave with strict provenance
- [ ] **Phase 20: Matrix-3D Viability Test** - Cloud GPU benchmark, document outcome (viable or excluded)
- [ ] **Phase 21: Lab Upgrade for Family Review** - Family filters, side-by-side views, winner marking
- [ ] **Phase 22: Subject Path Evaluation** - Billboard vs depth-warped vs SAM 3D Objects on winning world
- [ ] **Phase 23: Winner Selection & Lock** - One locked winner per scene (world + subject) with evidence

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
**Goal**: Layered soundscape audio system for memory capsules with per-instance music ducking, reusable hook, and CapsuleShell page
**Depends on**: None (inserted phase, builds foundation for Phase 7)
**Plans**: 2

Plans:
- [x] 17-01 -- useSoundscape hook, memoryScenes data, placeholder audio (bundled into 17-02)
- [x] 17-02 -- Per-instance capsule ducking in AudioContext, CapsuleShell page, route wiring

### Phase 18: Grading Rubric & Comparison Protocol
**Goal**: A grading rubric and comparison protocol exist and are wired into the lab tooling, so every world generation can be scored consistently before any comparison runs begin
**Depends on**: None (foundational phase)
**Requirements**: GRADE-01, GRADE-02, GRADE-04
**Success Criteria** (what must be TRUE):
  1. `grade-memory-world.mjs` accepts `--coherence`, `--exploration`, `--subject`, `--artifacts`, `--emotion` flags (1-5 each) and computes weighted composite automatically
  2. The 5-dimension rubric with anchored examples is embedded in the grading script's `--help` output or a companion reference file that the lab can display
  3. Running `grade-memory-world.mjs <scene> --compare` outputs a per-family comparison summary (JSON + stdout) with weighted composites and winner recommendation
  4. Every evaluation stored in `meta.json` includes `rubricVersion`, all 5 dimension scores, weighted composite, machine score, and evaluator name
  5. The 7 standard camera views (V0-V6) are documented in the rubric reference and enforced by the comparison protocol checklist
**Plans**: TBD

Plans:
- [ ] 18-01: TBD
- [ ] 18-02: TBD

### Phase 19: Generation Batches
**Goal**: Controlled comparison sets exist for both hero scenes (naxos-rock, syros-cave) across Marble and WorldGen families, each with strict provenance tracking
**Depends on**: Phase 18 (rubric must exist before grading runs)
**Requirements**: WORLD-01, WORLD-02, WORLD-03
**Success Criteria** (what must be TRUE):
  1. At least 2 Marble-generated worlds exist for naxos-rock with full provenance records (family, prompt, seed, quality profile, source photo, output files, machine score)
  2. At least 2 WorldGen-generated worlds exist for naxos-rock with full provenance records using the same source photo as the Marble runs
  3. At least 2 Marble-generated worlds and 2 WorldGen-generated worlds exist for syros-cave with the same provenance discipline
  4. Every generation run is versioned via `grade-memory-world.mjs` with a unique versionId, and the raw assets (PLY/SPZ, panorama, config) are preserved in the versions directory
  5. Prompt intent is documented per-family per-scene so GRADE-04 (fair comparison) can be verified by reviewing the prompt log
**Plans**: TBD

Plans:
- [ ] 19-01: TBD
- [ ] 19-02: TBD
- [ ] 19-03: TBD

### Phase 20: Matrix-3D Viability Test
**Goal**: Determine whether Matrix-3D is operationally viable for the comparison matrix by running at least one benchmark scene on a cloud GPU, and document the outcome either way
**Depends on**: Phase 19 (Marble/WorldGen baselines should exist for comparison context)
**Requirements**: WORLD-02a, WORLD-02b
**Success Criteria** (what must be TRUE):
  1. A cloud GPU instance (Vast.ai, RunPod, or equivalent) has been provisioned and the Matrix-3D pipeline installed successfully, OR a documented failure log explains why installation failed
  2. At least one scene (syros-cave preferred) has been run through the full Matrix-3D pipeline (pano -> video -> 3D reconstruction), OR a documented failure log explains which stage failed and why
  3. If successful: the output .ply is versioned via `grade-memory-world.mjs` with full provenance, and a quality assessment (even informal) is recorded against the rubric
  4. If non-viable: a `MATRIX-3D-EXCLUSION.md` document exists with specific failure evidence (error logs, VRAM limits, build failures, quality screenshots) satisfying WORLD-02b
  5. Decision recorded: Matrix-3D is either added to the comparison matrix for both scenes or excluded with documented rationale
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

### Phase 21: Lab Upgrade for Family Review
**Goal**: The lab supports family-first review with filters, side-by-side candidate context, and winner marking so Jared can make informed comparison decisions
**Depends on**: Phase 18 (rubric scores stored), Phase 19 (generation batches to review)
**Requirements**: GRADE-03
**Success Criteria** (what must be TRUE):
  1. The lab can filter candidates by family (Marble, WorldGen, Matrix-3D) and show only candidates from a selected family
  2. Side-by-side view displays V0 screenshots from two or more families for the same scene, with weighted composite scores visible
  3. A "Mark Winner" action sets `world.grades.winner` in meta.json with family, rationale, date, and `locked: true`
  4. The comparison summary (`--compare` output from Phase 18) is accessible from the lab UI or a single CLI command
**Plans**: TBD

Plans:
- [ ] 21-01: TBD
- [ ] 21-02: TBD

### Phase 22: Subject Path Evaluation
**Goal**: Evaluate subject reconstruction paths (current billboard, depth-warped billboard, SAM 3D Objects) against the winning world family only, with defined grading criteria
**Depends on**: Phase 21 (winning world family must be selected first)
**Requirements**: SUBJ-01, SUBJ-02
**Success Criteria** (what must be TRUE):
  1. Subject grading criteria are defined and documented: depth coherence, parallax correctness, appearance preservation, artifact visibility (each scored 1-5 with anchor descriptions)
  2. Current billboard subject is rendered in the winning world for each scene and scored against the subject criteria
  3. At least one alternative subject path (depth-warped billboard or SAM 3D Objects) is rendered in the winning world and scored against the same criteria
  4. Side-by-side comparison screenshots exist showing each subject path in the winning world at V0 and V5 (approach) camera positions
**Plans**: TBD

Plans:
- [ ] 22-01: TBD
- [ ] 22-02: TBD

### Phase 23: Winner Selection & Lock
**Goal**: One locked winning world family and one locked winning subject path per scene, with full evidence trail documenting the decisions
**Depends on**: Phase 21 (world comparison complete), Phase 22 (subject comparison complete)
**Requirements**: WIN-01, WIN-02
**Success Criteria** (what must be TRUE):
  1. `meta.json` for naxos-rock has `world.grades.winner` with `locked: true`, documented rationale, weighted composite, cost, and alternative family comparison
  2. `meta.json` for syros-cave has `world.grades.winner` with `locked: true`, documented rationale, weighted composite, cost, and alternative family comparison
  3. Subject path winner is recorded per scene with documented evidence (scores, comparison screenshots, notes on why it won)
  4. A `DECISIONS.md` summary exists listing both scene winners (world + subject) with one-paragraph rationale each, suitable for future reference when the pipeline evolves
**Plans**: TBD

Plans:
- [ ] 23-01: TBD

## Progress

**Execution Order:**
v2.0 phases execute in numeric order: 3 -> 4 -> 5 -> 6 -> 7
v2.3 phases execute in order: 18 -> 19 -> 20 -> 21 -> 22 -> 23
Inserted phases (17) execute independently as needed.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Constellation Scene | v1.0 | 4/4 | Complete | 2026-02-28 |
| 2. Data Pipeline & Privacy | v1.0 | 5/6 | Gap closure | - |
| 3. Living Homepage | v2.0 | 0/? | Not started | - |
| 4. Glint Operator | v2.0 | 0/? | Not started | - |
| 5. Starseed Hub & Labs | v2.0 | 0/? | Not started | - |
| 6. Automation & Retention | v2.0 | 0/? | Not started | - |
| 7. Immersive Portal | v2.0 | 0/? | Not started | - |
| 17. Memory Soundscape | v2.0 | 2/2 | Complete | 2026-03-24 |
| 18. Grading Rubric & Comparison Protocol | v2.3 | 0/? | Not started | - |
| 19. Generation Batches | v2.3 | 0/? | Not started | - |
| 20. Matrix-3D Viability Test | v2.3 | 0/? | Not started | - |
| 21. Lab Upgrade for Family Review | v2.3 | 0/? | Not started | - |
| 22. Subject Path Evaluation | v2.3 | 0/? | Not started | - |
| 23. Winner Selection & Lock | v2.3 | 0/? | Not started | - |

---
*Roadmap created: 2026-02-27 (v1.0)*
*Updated: 2026-03-20 (v2.0 Living World milestone added, Phases 3-7)*
*Updated: 2026-03-24 (Phase 17 Memory Soundscape inserted and completed)*
*Updated: 2026-04-05 (v2.3 Best World Wins milestone added, Phases 18-23)*
