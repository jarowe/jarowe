# Requirements: jarowe.com

**Defined:** 2026-03-20 (v2.0), updated 2026-03-21 (v2.0.1)
**Core Value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.

## v2.0.1 Requirements

Requirements for patch release. Fixes regressions, tightens content, and improves visual cohesion from v2.0.

### Rendering

- [x] **RENDER-01**: Constellation helix nodes display correct emissive/instance colors from theme data (fix InstancedMesh color regression)

### Content

- [x] **CONTENT-01**: Glint journal entries are capped at 2 sentences max (both API prompt and fallback pool)

### Visual Cohesion

- [ ] **VISUAL-01**: TodayRail "Explore" card links the current holiday to its constellation node (degrades gracefully when no mapped node exists)
- [x] **VISUAL-02**: Starseed color palette restored to gold warmth
- [x] **VISUAL-03**: Starseed project cards use Workshop-style gradient background aesthetic

## v2.0 Requirements (Shipped)

37 requirements across 6 categories. All shipped in v2.0 (Phases 3-7).

### Today Layer
- [x] **TODAY-01**: Visitor sees date-specific content within 5 seconds of homepage load
- [x] **TODAY-02**: Homepage color temperature shifts based on time of day via CSS custom properties
- [x] **TODAY-03**: Moon phase drives subtle visual changes to constellation particle brightness and nebula glow
- [x] **TODAY-04**: Real weather data drives atmospheric visuals
- [x] **TODAY-05**: AI-generated Glint daily journal entry displayed as "Thought of the Day"
- [x] **TODAY-06**: Daily progress signal card
- [x] **TODAY-07**: Daily creative prompt card with "Start in Starseed" CTA

### Glint Operator
- [x] **GLINT-01** through **GLINT-07**: Full tool-use system (navigate, launch games, control music, show daily, save ideas, command palette)

### Starseed Hub
- [x] **STAR-01** through **STAR-06**: Campaign-shell branded hub, project cards, contact section
- [ ] **STAR-07**: starseed.llc DNS redirect (deferred -- DNS config)

### Starseed Labs
- [x] **LABS-01** through **LABS-06**: Scratchpad, canvas, Glint handoff, brainstorm mode, hub page

### Daily Engine
- [x] **DAILY-01** through **DAILY-06**: Daily seed, view transitions, OG images, streaks, easter eggs, weather

### Immersive Portal
- [x] **PORTAL-01**, **PORTAL-03**: Splat scene with soundtrack + narrative overlay
- [ ] **PORTAL-02**: 3D flythrough portal transition (partial -- CSS cross-fade shipped)
- [ ] **PORTAL-04**: Scene-specific OG preview (partial -- generic OG shipped)

## Future Requirements

Deferred to future milestones. Not in current roadmap.

### Constellation Editor
- **EDITOR-01**: Enhanced effect controls and visual refinement tools in Constellation Editor page

### Constellation Core (from v1.0)
- **CONST-01**: Scripted narrator engine with 5-tier event-driven narration
- **CONST-02**: Guided tour (~90 seconds, cinematic, skippable)
- **CONST-03**: Constellation modes: "Life" / "Work" / "Ideas"
- **CONST-04**: Path memory: faint glowing trail of visitor's journey

### Ecosystem Expansion
- **ECO-01** through **ECO-06**: Starseed Labs standalone, community, subscribers, content pipeline, video, independent site

### Experience Expansion
- **EXP-01** through **EXP-08**: Voice Glint, multiplayer, StarOS, more portals, hand tracking, WebGPU, VR, conversation memory

## Out of Scope

| Feature | Reason |
|---------|--------|
| Constellation Editor overhaul | Not a defect -- save for dedicated milestone |
| New data pipeline parsers | Prove pipeline with existing sources first |
| Bloom re-enable | Separate concern, not part of this patch |
| Full editorial news operation | Progress lens is curated cards, not a feed |
| Generic autonomous internet agent | Glint is bounded to this world |
| Mobile native app | Web-first, responsive design covers mobile |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RENDER-01 | Phase 8 | Complete |
| CONTENT-01 | Phase 8 | Complete |
| VISUAL-01 | Phase 9 | Pending |
| VISUAL-02 | Phase 9 | Complete |
| VISUAL-03 | Phase 9 | Complete |

**Coverage:**
- v2.0.1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-20 (v2.0)*
*Last updated: 2026-03-21 after v2.0.1 roadmap creation*
