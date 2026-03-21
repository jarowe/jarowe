# Requirements: jarowe.com Living World

**Defined:** 2026-03-20
**Core Value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.
**Canonical scope:** See `.planning/future/MASTER_PLAN.md` for strategic rationale and shipping order.

## v2.0 Requirements

Requirements for the Living World milestone. 37 requirements across 6 categories. All ship in v2.0, sequenced into 5 waves.

### Today Layer

- [x] **TODAY-01**: Visitor sees date-specific content (holiday, featured constellation node, creative prompt) within 5 seconds of homepage load
- [x] **TODAY-02**: Homepage color temperature shifts based on time of day (dawn, golden hour, day, dusk, night) via CSS custom properties
- [x] **TODAY-03**: Moon phase drives subtle visual changes to constellation particle brightness and nebula glow
- [ ] **TODAY-04**: Real weather data from visitor location drives atmospheric visuals (fog density, particle speed, precipitation overlay, color warmth)
- [x] **TODAY-05**: AI-generated Glint daily journal entry displayed as "Thought of the Day" card on homepage
- [ ] **TODAY-06**: Daily progress signal card showing one curated positive/constructive news item with source link
- [x] **TODAY-07**: Daily creative prompt card with "Start in Starseed" CTA that opens scratchpad/canvas with prompt pre-loaded

### Glint Operator

- [ ] **GLINT-01**: Glint can navigate visitor to any page on the site via natural conversation ("Take me to the constellation")
- [ ] **GLINT-02**: Glint can launch any game from the registry via conversation ("Play a game")
- [ ] **GLINT-03**: Glint can control music playback (play, pause, next) via conversation
- [ ] **GLINT-04**: Glint's tool calls are narrated in character -- not robotic execution confirmations but tour-guide-style narration
- [x] **GLINT-05**: Command palette (Cmd+K) shares the same action dispatcher as Glint's tool system, searching pages, nodes, games, and actions
- [ ] **GLINT-06**: Glint can save ideas to Starseed scratchpad via conversation ("Save this idea")
- [ ] **GLINT-07**: Glint can show daily content and progress signal on request ("What's new today?")

### Starseed Hub

- [x] **STAR-01**: `/starseed` route replaces Workshop with branded Starseed showcase using campaign-shell pattern (own nav, palette, chrome rules)
- [ ] **STAR-02**: Project cards display active Starseed projects (BEAMY, AMINA, DECKIT, Starseed Labs, and future projects) with icons, descriptions, and tags
- [x] **STAR-03**: Starseed brand (fonts, colors, logo from brand kit) applies when inside `/starseed/*` routes -- distinct from jarowe.com main site aesthetic
- [x] **STAR-04**: Seamless return navigation from Starseed pages to jarowe.com main site (escape hatch like music release nav)
- [ ] **STAR-05**: Contact/client-facing section for Starseed business inquiries with form or mailto
- [ ] **STAR-06**: Each project card links to its own detail page within the site or to an external project URL
- [ ] **STAR-07**: starseed.llc DNS redirects to jarowe.com/starseed (or reverse proxy) -- unified URL strategy

### Starseed Labs (Creation Surface)

- [ ] **LABS-01**: `/starseed/labs/scratchpad` route with Milkdown markdown WYSIWYG editor and localStorage persistence with auto-save
- [ ] **LABS-02**: `/starseed/labs/canvas` route with Excalidraw infinite canvas and localStorage persistence for scene data
- [ ] **LABS-03**: Both Excalidraw (~400KB) and Milkdown (~40KB) are lazy-loaded and never load on non-Labs routes
- [ ] **LABS-04**: Glint handoff -- "Save this idea" tool call from chat creates a note in the scratchpad with pre-populated content
- [ ] **LABS-05**: Glint brainstorm mode -- structured AI ideation session that generates a project brief (title, idea, mood, next steps)
- [ ] **LABS-06**: Labs hub page (`/starseed/labs`) with entry point cards to scratchpad, canvas, and brainstorm

### Daily Engine

- [x] **DAILY-01**: `dailySeed.js` utility module providing deterministic daily content rotation -- same date always selects same content
- [x] **DAILY-02**: View Transitions API between React Router pages with smooth morphing for persistent elements (navbar, player) and graceful fallback
- [ ] **DAILY-03**: Dynamic OG images via `@vercel/og` Edge Function -- route-specific social preview cards for homepage, constellation, games, Starseed
- [ ] **DAILY-04**: Visitor streak system tracking consecutive visit days with Glint milestone reactions (3, 7, 14, 30 days) and one streak freeze
- [ ] **DAILY-05**: 5+ date-locked easter eggs (full moon, Friday the 13th, Pi Day, solstices, site birthday) triggering visual effects and Glint dialogue
- [ ] **DAILY-06**: Weather-responsive globe and constellation atmosphere via Open-Meteo API driving fog density, particle speed, and color warmth

### Immersive Portal

- [ ] **PORTAL-01**: One gaussian splat scene captured from a meaningful location, optimized to SPZ format, and viewable in the site via Spark.js or drei Splat
- [ ] **PORTAL-02**: Splat scene accessible from globe or constellation with a portal-style camera transition (flythrough, dissolve, or dimensional shader)
- [ ] **PORTAL-03**: Soundtrack auto-plays and narrative text overlay tells the story of the place within the splat scene
- [ ] **PORTAL-04**: Direct shareable URL (`/memory/[scene-name]`) with dynamic OG image showing splat scene preview

## v2.1+ Requirements (Deferred)

Acknowledged, tracked, not in current roadmap.

### Ecosystem Expansion
- **ECO-01**: Starseed Labs as standalone product with own OAuth, own domain, agentic AI business factory
- **ECO-02**: Community infrastructure -- Discord server(s) for jarowe.com/Starseed/Starseed Labs communities
- **ECO-03**: Subscriber system -- mailing list, SMS, cross-ecosystem user management
- **ECO-04**: Content pipeline automation -- hard drive creative assets to site publishing workflow
- **ECO-05**: Video/livestreaming channel on jarowe.com
- **ECO-06**: Full starseed.llc independent site (beyond redirect)

### Experience Expansion
- **EXP-01**: Voice-enabled Glint (Web Speech API, ElevenLabs, OpenAI Realtime)
- **EXP-02**: Multiplayer visitor presence via PartyKit
- **EXP-03**: StarOS desktop mode at high engagement XP threshold
- **EXP-04**: Additional gaussian splat memory portals
- **EXP-05**: Hand-tracked Glint interaction via MediaPipe
- **EXP-06**: WebGPU shader gallery and compute experiences
- **EXP-07**: VR constellation mode via WebXR
- **EXP-08**: Glint conversation memory persistence in Supabase

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full editorial news operation | Progress lens is curated cards, not a feed. Editorial overhead is incompatible with "works for Jared." |
| Generic autonomous internet agent | Glint is bounded to this world. Constraints make him memorable. |
| Mobile native app | Web-first. Responsive design covers mobile. |
| Uncontrolled auto-publishing | Automation proposes and prefills. Jared decides what becomes public. |
| Generalized social network features | Community forms around content, not around profiles. Discord first. |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TODAY-01 | Phase 3 | Complete |
| TODAY-02 | Phase 3 | Complete |
| TODAY-03 | Phase 3 | Complete |
| TODAY-04 | Phase 6 | Pending |
| TODAY-05 | Phase 4 | Complete |
| TODAY-06 | Phase 6 | Pending |
| TODAY-07 | Phase 3 | Complete |
| GLINT-01 | Phase 4 | Pending |
| GLINT-02 | Phase 4 | Pending |
| GLINT-03 | Phase 4 | Pending |
| GLINT-04 | Phase 4 | Pending |
| GLINT-05 | Phase 4 | Complete |
| GLINT-06 | Phase 6 | Pending |
| GLINT-07 | Phase 4 | Pending |
| STAR-01 | Phase 3 | Complete |
| STAR-02 | Phase 5 | Pending |
| STAR-03 | Phase 3 | Complete |
| STAR-04 | Phase 3 | Complete |
| STAR-05 | Phase 5 | Pending |
| STAR-06 | Phase 5 | Pending |
| STAR-07 | Phase 5 | Pending |
| LABS-01 | Phase 5 | Pending |
| LABS-02 | Phase 5 | Pending |
| LABS-03 | Phase 5 | Pending |
| LABS-04 | Phase 6 | Pending |
| LABS-05 | Phase 6 | Pending |
| LABS-06 | Phase 5 | Pending |
| DAILY-01 | Phase 3 | Complete |
| DAILY-02 | Phase 3 | Complete |
| DAILY-03 | Phase 6 | Pending |
| DAILY-04 | Phase 6 | Pending |
| DAILY-05 | Phase 6 | Pending |
| DAILY-06 | Phase 6 | Pending |
| PORTAL-01 | Phase 7 | Pending |
| PORTAL-02 | Phase 7 | Pending |
| PORTAL-03 | Phase 7 | Pending |
| PORTAL-04 | Phase 7 | Pending |

**Coverage:**
- v2.0 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after v2.0 roadmap creation (all 37 requirements mapped to Phases 3-7)*
