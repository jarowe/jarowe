# jarowe.com — The Living World

## What This Is

A living personal world for Jared Rowe (jarowe.com) that serves as "life in webform" — an honest, playful, constantly evolving ecosystem of everything Jared creates and cares about. The site combines a **cinematic globe**, an **explorable 3D life constellation**, an **AI guide (Glint)**, **32+ mini-games**, **daily-changing content**, and **music** into an experience that feels alive every visit. It is the hub of an ecosystem that includes **Starseed** (the business/agency launching projects like BEAMY, AMINA, DECKIT), **Starseed Labs** (an autonomous AI business factory — its own product), and **jarowe artist** (music identity). The site should make people feel: "I have never seen a personal site feel like this."

## Core Value

jarowe.com is the most alive personal world on the internet — a living place of wonder that turns curiosity into creation, where every visit is different, every interaction has depth, and every creative spark finds its way into the world.

## Current State: v2.0.1 Polish & Connect — SHIPPED 2026-03-22

jarowe.com is a living, daily-pulse world with polished visual cohesion:
- **Today Layer** — time-of-day atmosphere, moon phase effects, weather-driven CSS, daily-rotating content
- **TodayRail → Constellation** — holiday Explore card deep-links T3+ holidays to constellation nodes
- **Glint Operator** — AI tool use (navigate, launch games, control music, show daily, save ideas), Cmd+K palette; journal entries capped at 2 sentences
- **Starseed Hub** — warm gold brand identity with per-card gradient backgrounds, Workshop-style depth layering, contact section, Labs creation tools
- **Starseed Labs** — Milkdown scratchpad + Excalidraw canvas with localStorage persistence
- **Daily Engine** — visitor streaks with Glint milestones, 5 date-locked easter eggs, dynamic OG previews
- **Immersive Portal** — gaussian splat memory viewer with narrative overlay, soundtrack, mobile fallback
- **Constellation** — per-instance emissive shader colors (theme-driven, not uniform grey-blue)

## Current Milestone: v2.1 Memory Capsules

**Goal:** Turn any single still photo into an immersive 3D memory you can step into — one unforgettable capsule with cinematic camera drift, atmosphere, narrative, and soundtrack.

**Target features:**
- Single-photo depth estimation → displaced mesh 3D scene
- Cinematic constrained camera (drift, dolly, parallax — not free-roam)
- Atmospheric particles, glow, bokeh, light specks
- Narrative text overlay system (timed cards)
- Per-scene soundtrack integration (Howler.js)
- Renderer-agnostic portal shell (displaced mesh now, gaussian splats later)
- Manual asset workflow: upload photo + depth map + configure scene
- 1 flagship scene proven end-to-end

**Stretch:** Multiple capsules in scrollable "memory plasma" — only if it doesn't dilute the flagship

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Existing site capabilities. -->

- ✓ Interactive 3D globe with real-time sun, day/night shader, clouds, atmosphere, lens flare, satellites — existing
- ✓ Bento grid home page with hero, music player, globe, cipher, social links — existing
- ✓ Global music player with Howler.js, persists across page navigation — existing
- ✓ XP/gamification system with level-ups, confetti, Konami code easter egg — existing
- ✓ Daily Cipher (Wordle-clone) with vault visual integration and roller coaster photo rewards — existing
- ✓ Universe page with 3D starfield, orbiting nodes, discovery counter — existing
- ✓ Garden page with card grid and full-screen modal overlay — existing
- ✓ Workshop, Patcher, Beamy, Starseed project pages — existing
- ✓ Now page with glass panels — existing
- ✓ Vault and Favorites pages — existing
- ✓ Web Audio API sine tone sound effects (hover, click) — existing
- ✓ Lazy loading for heavy 3D components — existing
- ✓ Dual deployment: Vercel (primary) + GitHub Pages (secondary) — existing

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped and validated. -->

**Constellation Core**
- [ ] Build-time pipeline: parse exports → normalize → enrich → connect → layout → emit JSON
- [ ] Canonical node/edge schema with 11 node types and 9 edge types
- [ ] Evidence-based edge generation with signal weights and pruning rules
- [ ] Double-helix 3D layout algorithm with epoch clustering and seeded stability
- [ ] R3F constellation scene: instanced nodes, connection lines, hover/click interaction
- [ ] Detail panel with media, text, entity chips, and "Because..." meaning lens
- [ ] Timeline scrubber moving camera along helix with epoch transitions
- [ ] Scripted narrator engine: 5-tier event-driven narration (epoch, node, connection, discovery, idle)
- [ ] Guided tour (~90 seconds, cinematic, skippable, anchor nodes with narration beats)
- [ ] Ambient sound bed + interaction sounds + optional audio-reactive rendering
- [ ] Discovery tracking with XP integration (reuse existing GameOverlay system)
- [ ] Constellation modes: "Life" / "Work" / "Ideas" (filter + edge weight + narration tone)
- [ ] Path memory: faint glowing trail of visitor's journey
- [ ] 2D library fallback: searchable node index for accessibility

**Data Pipeline (Hybrid: API + Export + Scheduled)**
- [ ] Instagram parser for existing 276-file export
- [ ] Carbonmade archive parser for 35 projects + 20 blog posts + milestones
- [ ] Suno music auto-ingest: pull from profile, draft inbox, curate + publish
- [ ] Nightly scheduled ingest from connected platforms (cron via Vercel)
- [ ] On-demand "Pull Latest Now" button in admin dashboard
- [ ] Official API integrations where available, export-based fallback otherwise
- [ ] Schema validation + privacy enforcement at build time (fails on private leaks)

**Admin Dashboard**
- [ ] Authentication (owner-only access)
- [ ] Curation UI: publish/hide/highlight nodes, manage tour anchors
- [ ] Draft inbox: new auto-ingested content lands here for review before publish
- [ ] Narration text editing
- [ ] Allowlist management for people/names appearing publicly
- [ ] Garden and Now page content editing
- [ ] Music track management: curate, add metadata (mood, era, story), publish to player + constellation

**Privacy (Non-Negotiable)**
- [ ] Visibility tiers: public / private / redacted / friends
- [ ] Minors policy: no legal names, no home/school identifiers, no exact GPS/EXIF, curated allowlist before publish
- [ ] DMs, contact graphs, close friends lists: always private
- [ ] GPS redaction: city-level for public, exact only for friends
- [ ] People: public allowlist only, otherwise "Friend" / "Family" / "Collaborator"
- [ ] Build-time validation script fails if private content appears in public output

**Bento Hub Enhancement**
- [ ] Dynamic cells pulling from constellation data (latest moments, projects, music)
- [ ] Existing pages wired into constellation data system
- [ ] Polish and connect existing pages (Globe, Garden, Vault, Workshop, Now, Universe)

### Out of Scope

<!-- Explicit boundaries for THIS milestone. Captured for future milestones. -->

- Starseed Labs as standalone product (own auth, own domain, agentic AI factory) — v2.1+, needs Starseed Hub to exist first
- Community infrastructure (Discord servers, subscriber system, mailing list, SMS) — v2.1+, needs ecosystem to have something to gather around
- Content pipeline automation (hard drive → site, video channel, livestreaming) — v2.1+, needs hub and creation surface to exist first
- Full starseed.llc independent site — v2.1+, build the hub section first within jarowe.com
- Full multiplayer / real-time visitor presence (PartyKit) — defer until single-player daily loop proves retention
- Voice-enabled Glint (ElevenLabs, OpenAI Realtime) — defer until text-based tool use is solid
- StarOS desktop mode — defer until core daily loop is magnetic
- Full editorial news operation — progress lens is curated cards, not a feed
- VR/WebXR constellation mode — niche audience, defer to future
- Hand-tracked Glint (MediaPipe) — high viral potential but high effort, defer

**Preserved from v1.0 Out of Scope:**
- Live AI narrator (Gemini/LLM) — scripted narrator first
- Facebook/X/LinkedIn/Google Photos parsers — prove pipeline with existing sources first
- Mobile native app — web-first, responsive design covers mobile

## Context

**Existing codebase**: Vite 7 + React 19 + React Router 7 SPA with R3F, drei, postprocessing, GSAP, Framer Motion, Howler.js, canvas-confetti. Custom globe shader system using globeMaterial prop. XP gamification layer. Music persists across navigation via AudioProvider context.

**Data sources available now**: Instagram data export (276 files with posts, media, GPS, tagged users, reels, locations), Carbonmade archive (35 projects, 20 blog posts, career history as structured JSON), Suno AI music tracks.

**Consultation**: Extensive vision documents from Gemini research phase and consultant spec defining the constellation architecture, data model, privacy rules, layout algorithm, narrator engine, and ticket-based execution plan.

**Deployment**: Vercel (primary, jarowe.com) with serverless functions for admin/API. GitHub Pages (secondary, jarowe.github.io/jarowe/) for static fallback.

**Philosophy**: "The medium IS the message." The site itself demonstrates who Jared is — experience designer, innovator, technologist, storyteller, father, worldschooler. Not a resume. A playable, discoverable universe of real moments. Honesty, authenticity, reducing the masks. "The language of the universe is excitement and the purpose is the balance we become."

**Ecosystem architecture**: jarowe.com is the world. Starseed is the business side (agency, projects). Starseed Labs is its own product (autonomous AI business factory). jarowe artist is the music identity. All seamlessly connected, each with its own identity but part of one authentic human's output.

**Campaign-shell pattern**: The music takeover system (registry + chrome rules + shell + branded nav) is the proven model for standalone-but-integrated experiences. Starseed Hub should use this same pattern — own brand, own chrome, seamlessly returns to the main site.

**Strategy documents**: Extensive planning in `.planning/future/` (11 docs) derived from 9-agent parallel research sweep on 2026-03-20, filtered through strategy reset in `.planning/JAROWE_STRATEGY_RESET_2026.md`.

## Constraints

- **Stack**: Must build on existing Vite 7 + React 19 + R3F stack — no framework migration
- **Deployment**: Vercel full-stack for primary (serverless functions, KV/Blob storage for admin + pipeline). GitHub Pages remains as static fallback (loses admin/API features)
- **Performance**: Constellation must render 150+ instanced nodes at 60fps on desktop; graceful degradation on mobile (no ChromaticAberration, simplified effects)
- **Privacy**: Minors protected by hard policy. Build-time validation enforced. No private data leaks to public output.
- **No regressions**: All existing pages (Home, Workshop, Vault, Garden, Now, Universe, etc.) must continue to work
- **API limits**: Platform APIs have rate limits. Nightly ingest + on-demand refresh must respect them. Export-based fallback when APIs are unavailable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-mode site (Bento Hub + Constellation) | Hub provides accessible dashboard; constellation provides deep experiential exploration | — Pending |
| Build-time truth + runtime cinema | Keeps site fast, predictable, safe. Realness lives in deterministic build outputs. | — Pending |
| Vercel full-stack for backend | Serverless functions for API ingest, admin auth, cron jobs. No separate infra to manage. | — Pending |
| Hybrid pipeline (API + export + scheduled) | Nightly auto-ingest for "living" behavior, on-demand for immediate updates, export fallback for reliability | — Pending |
| Scripted narrator first (no live LLM) | Reliability and control. LLM narrator deferred to future milestone after scripted system proves the interaction model. | — Pending |
| Instagram + Carbonmade first | Highest data quality available now. Proves pipeline end-to-end before adding more platforms. | — Pending |
| Music auto-ingest with draft inbox | Tracks appear automatically but are curated before publish. Published tracks become constellation nodes. | — Pending |
| Privacy-first with curation layer | Allowlists, hide lists, overrides, highlights. True without being exposed. Build fails on leaks. | — Pending |

| Starseed Hub uses campaign-shell pattern | Proven model from music takeover system — own brand/chrome/nav, seamlessly returns to main site | — Pending |
| Orbit model: World / Guide / Creation / Signal | Every idea gets the right orbit — prevents ambition without hierarchy. See .planning/future/ORBIT_MODEL.md | — Pending |
| Daily engine before spectacle | Retention (daily pulse) before acquisition (viral moments). Strategy reset principle. | — Pending |
| Anonymous-first auth with Supabase upgrade | No login wall. signInAnonymously() → linkIdentity() when there's value to protect. | — Pending |
| Glint bounded tool use, not generic chatbot | Site-native intelligence with agency inside this world. Constraints make him memorable. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 after v2.1 Memory Capsules milestone started*
