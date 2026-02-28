# Roadmap: The JAROWE Constellation

## Overview

This roadmap delivers the JAROWE Constellation in six phases: first the 3D scene that proves the visualization concept with mock data, then the data pipeline that feeds it real life moments with privacy baked in, then the narrator that brings those moments to life through Jared's voice, then the admin dashboard for ongoing curation, then automation for a living site, and finally the bento hub integration that ties everything back to the home page. Each phase delivers a complete, verifiable capability that builds on the last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Constellation Scene** - 3D rendering foundation with instanced nodes, camera controls, detail panel, and disposal utilities
- [ ] **Phase 2: Data Pipeline & Privacy** - Instagram + Carbonmade parsers, build-time pipeline, privacy enforcement, constellation.json output, and thin admin slice (pipeline status + basic publish/hide)
- [ ] **Phase 3: Narrator & Guided Tour** - Event-driven narrator engine with guided cinematic tour and 150+ scripted narration lines
- [ ] **Phase 4: Admin Dashboard** - Owner-only auth, curation UI, draft inbox, allowlist management, and server-side access control
- [ ] **Phase 5: Automation** - Nightly cron ingest, Suno auto-ingest, music source adapters, and observability
- [ ] **Phase 6: Bento Hub Integration** - Dynamic cells pulling from constellation data, constellation portal, and existing page polish

## Phase Details

### Phase 1: Constellation Scene
**Goal**: Users can explore a 3D constellation of life moments -- navigating, hovering, clicking, and scrubbing through time -- on any device
**Depends on**: Nothing (first phase)
**Requirements**: REND-01, REND-02, REND-03, REND-04, REND-05, REND-06, REND-07, REND-08, REND-09, REND-10, REND-11, REND-12
**Success Criteria** (what must be TRUE):
  1. User visits /constellation and sees 150+ nodes rendered as a double-helix shape, maintaining 60fps on desktop (verified via renderer.info and performance monitor)
  2. User can hover any node to see a tooltip (title, type, date) and click to fly the camera to it, opening a detail panel with media, text, entity chips, and "Because..." connection reasons
  3. User can drag a timeline scrubber to move the camera along the helix with visible epoch labels and year markers
  4. User on a mobile device sees a simplified version (no ChromaticAberration, reduced effects, touch gestures work) without crashes or broken layout
  5. User can press ESC or browser back to cleanly exit the constellation with no broken state, and navigating away triggers proper GPU disposal (no memory leaks verified via renderer.info.memory)
  6. User who cannot use 3D (accessibility, old device) can switch to a 2D searchable node index with keyboard navigation
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md -- R3F scene setup, instanced mesh rendering, double-helix layout, starfield/nebula, GPU tier detection, and disposal utilities
- [x] 01-02-PLAN.md -- Camera fly-to, hover labels, detail panel, timeline scrubber, toolbar, media lightbox, entity chips, ESC/back navigation
- [x] 01-03-PLAN.md -- Connection lines with focus-aware opacity, "Because..." evidence lens, 2D accessible list fallback
- [x] 01-04-PLAN.md -- UAT gap closure: hover label type/date, timeline scrubber positioning, empty-space focus clear

### Phase 2: Data Pipeline & Privacy
**Goal**: The constellation is populated with real life data from Instagram and Carbonmade exports, with privacy enforced at every layer -- the build fails if anything leaks. A thin admin slice validates the pipeline/curation workflow early.
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, PRIV-06, PRIV-07, PRIV-08, PRIV-09
**Success Criteria** (what must be TRUE):
  1. Running the build pipeline (parse -> normalize -> enrich -> connect -> layout -> emit) produces a valid constellation.json from the real Instagram export (276 files) and Carbonmade archive (35 projects, 20 blog posts), with nodes, edges, layout positions, and narration metadata
  2. Every node, edge, and media item in constellation.json has a visibility tier (public/private/redacted/friends) and the build FAILS (exit code 1) if any private content appears in public output
  3. All images in the output have EXIF metadata stripped, GPS coordinates are redacted to city-level (2 decimal places max) for public content, and minors have no legal names, no home/school identifiers, and no GPS data
  4. Connection lines in the constellation show evidence-based edges with signal weights, and each connection's detail panel shows 3-5 "Because..." reasons explaining why the connection exists
  5. The pipeline handles malformed or missing Instagram fields gracefully (logs warnings, never crashes), and if an API source fails, the last good snapshot is preserved
  6. A minimal admin view shows read-only pipeline run status (last run, success/fail, node counts) and basic publish/hide controls for nodes, de-risking the full admin dashboard in Phase 4
**Plans:** 6 plans

Plans:
- [x] 02-01-PLAN.md -- Instagram HTML parser with defensive parsing, EXIF stripping, GPS redaction, and shared canonical schema
- [x] 02-02-PLAN.md -- Carbonmade JSON parser, epoch configuration, and pipeline config
- [x] 02-03-PLAN.md -- Evidence-based edge generation, helix layout, pipeline orchestrator, and frontend data loader
- [x] 02-04-PLAN.md -- Privacy validation (fail-closed audit), visibility tiers, minors policy, and allowlist enforcement
- [x] 02-05-PLAN.md -- Thin admin page (pipeline status + publish/hide), pipeline resilience (last good snapshot)
- [ ] 02-06-PLAN.md -- GAP CLOSURE: Wire data loader into UI -- replace 7 mock imports with Zustand store selectors

### Phase 3: Narrator & Guided Tour
**Goal**: The constellation tells Jared's story -- a scripted narrator responds to exploration and a cinematic guided tour introduces new visitors to key life moments
**Depends on**: Phase 1, Phase 2
**Requirements**: NARR-01, NARR-02, NARR-03, NARR-04, NARR-05, NARR-06, NARR-07, NARR-08
**Success Criteria** (what must be TRUE):
  1. First-time visitor can launch a guided tour that plays a ~90-second cinematic journey through curated anchor nodes, with a prominent skip button (and ESC key) that returns to orbit mode cleanly
  2. As user explores freely (hovering nodes, clicking connections, scrubbing timeline), contextual narration appears responding to their specific actions -- not generic text, but behavior-responsive lines matching what they are looking at
  3. Narration text reads in Jared's inner voice (reflective, poetic, personal) with typewriter animation, is dismissible, and no line repeats within 60 seconds across any interaction pattern
  4. The narrator system has 150+ unique lines across 3 tiers (epoch transitions, node focus, connection reveals) with 3+ variants per event type, ensuring the experience feels fresh across multiple visits
**Plans**: TBD

Plans:
- [ ] 03-01: Narrator engine (Zustand store, event system, priority queue, variation tracking)
- [ ] 03-02: Guided tour (anchor nodes, camera path, GSAP timeline, skip/ESC, narration beats)
- [ ] 03-03: Narration content (150+ lines, 3 tiers, Jared's voice, typewriter UI)

### Phase 4: Admin Dashboard
**Goal**: Jared can log in to a private dashboard to curate his constellation -- publishing, hiding, and highlighting nodes, managing who appears publicly, editing narration, and controlling the guided tour
**Depends on**: Phase 2, Phase 3
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, PRIV-10
**Success Criteria** (what must be TRUE):
  1. Jared can log in via GitHub OAuth (Auth.js v5) and access /admin; all other users are blocked with 401
  2. Jared can see all constellation nodes, change their publish state (draft -> preview -> published, with undo), hide or highlight specific nodes, and preview changes before publishing
  3. Jared can review auto-ingested content in a draft inbox (bulk approve/reject), manage the people allowlist (add/remove names for public visibility), and select which nodes appear in the guided tour
  4. Jared can edit narration text per node/epoch/connection, edit Garden and Now page content, and trigger an on-demand data refresh via "Pull Latest Now" button
  5. Friends-gated content is enforced server-side via Vercel Edge Functions -- public visitors see only public nodes, friends-tier content requires authentication
**Plans**: TBD

Plans:
- [ ] 04-01: Auth.js v5 setup (GitHub OAuth, JWT sessions, Edge Functions, route protection)
- [ ] 04-02: Curation UI (node management, publish states, draft inbox, allowlists, tour anchors)
- [ ] 04-03: Content editing (narration editor, Garden/Now editing, data quality view, pull latest)
- [ ] 04-04: Server-side access control (friends-gated visibility via Edge Functions)

### Phase 5: Automation
**Goal**: The site stays alive on its own -- nightly ingest pulls new music from Suno, surfaces it in a draft inbox, and published tracks become constellation nodes and appear in the site player
**Depends on**: Phase 2, Phase 4
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07, AUTO-08
**Success Criteria** (what must be TRUE):
  1. A nightly Vercel cron job (authenticated via CRON_SECRET) pulls latest Suno tracks and deposits them in the draft inbox for Jared to review
  2. When Jared publishes a track from the draft inbox, it becomes a constellation node linked to relevant projects/eras AND appears in the site music player with metadata (mood, era, story)
  3. If the Suno API fails or rate-limits, the ingest degrades gracefully: exponential backoff, keeps last good snapshot (no broken public state), and falls back to manual track import/publish via admin dashboard -- Jared can always add music even if all adapters are down
  4. Admin dashboard shows last run timestamp, status, errors, and source health per adapter. Manual import UI accepts track file + metadata for direct publish without any API dependency.
  5. Music source adapters support both Suno and SoundCloud normalization into a unified track schema, enabling future platform additions without rewriting the ingest pipeline
**Plans**: TBD

Plans:
- [ ] 05-01: Vercel cron setup, CRON_SECRET auth, Suno parser, and draft inbox integration
- [ ] 05-02: Publish flow (tracks to constellation nodes + player), rate limits, graceful degradation, and observability
- [ ] 05-03: Music source adapter pattern (Suno + SoundCloud normalization, unified track schema)

### Phase 6: Bento Hub Integration
**Goal**: The home page bento grid comes alive with constellation data -- latest moments, featured projects, music metadata, and a portal into the constellation
**Depends on**: Phase 2, Phase 5
**Requirements**: BENT-01, BENT-02, BENT-03, BENT-04, BENT-05
**Success Criteria** (what must be TRUE):
  1. The home page bento grid shows a "latest moments" cell with recent Instagram/life moments pulled from constellation data, and a "featured projects" cell rotating through Carbonmade project nodes
  2. The music player cell displays Suno track metadata (mood, era, story) from constellation data, and a constellation portal cell links to /constellation showing live node count and a visual preview
  3. Existing pages (Globe, Garden, Vault, Workshop, Now, Universe) are polished and wired into the constellation data system where relevant, with no regressions to current functionality
**Plans**: TBD

Plans:
- [ ] 06-01: Dynamic bento cells (latest moments, featured projects, music metadata, constellation portal)
- [ ] 06-02: Existing page polish and constellation data wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Constellation Scene | 4/4 | Complete | 2026-02-28 |
| 2. Data Pipeline & Privacy | 5/6 | Gap closure | - |
| 3. Narrator & Guided Tour | 0/3 | Not started | - |
| 4. Admin Dashboard | 0/4 | Not started | - |
| 5. Automation | 0/3 | Not started | - |
| 6. Bento Hub Integration | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-27*
*Last updated: 2026-02-28 (Phase 2 gap closure -- 02-06 wire data loader into constellation UI)*
