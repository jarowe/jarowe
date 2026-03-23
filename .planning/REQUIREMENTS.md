# Requirements: jarowe.com

**Defined:** 2026-03-20 (v2.0), updated 2026-03-23 (v2.1)
**Core Value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.

## v2.1 Requirements — Memory Capsules

Turn a single still photo into an immersive 3D memory you can step into. Not a tech demo — a playable memory poem. 1 flagship capsule is the milestone anchor.

**Guardrail:** If tradeoffs appear, protect the flagship capsule experience (SHELL-04, ARC-*) before protecting editor/tooling depth.

### Depth Renderer

- [ ] **DEPTH-01**: Visitor sees a single photo rendered as a depth-displaced 3D mesh with foreground/background layer separation via SAM masks
- [ ] **DEPTH-02**: Depth discontinuity edges are handled via fragment shader discard — no rubber-sheet stretching artifacts
- [ ] **DEPTH-03**: Each scene has per-scene tuning knobs (depthScale, depthBias, depthContrast) for manual depth map refinement
- [ ] **DEPTH-04**: GPU capability is detected at 3 tiers (full displaced mesh / simplified / parallax-only fallback) based on device capability

### Camera & Atmosphere

- [ ] **CINE-01**: Camera follows a constrained cinematic path (drift, dolly, parallax) — no free-roam OrbitControls
- [ ] **CINE-02**: Camera uses multi-beat GSAP keyframe choreography (push, pause, drift) synced to narrative card timing
- [ ] **CINE-03**: Scene includes atmospheric particles (dust motes, bokeh specks, light drift) and depth-of-field postprocessing with vignette and film grain
- [ ] **CINE-04**: Each scene supports per-scene color grading (warm/cool/golden mood) via fragment uniform or postprocessing

### Portal & Narrative

- [ ] **PORT-01**: Narrative text appears as timed glass cards — "remembered thoughts, not captions" — synced to camera beats
- [ ] **PORT-02**: Per-scene soundtrack plays via Howler.js with fade-in; music blooms after user intent (respects autoplay policy)
- [ ] **PORT-03**: Capsule has full portal entry/exit transitions (reuse PortalVFX phases) — "enter through a portal, not a route"
- [ ] **PORT-04**: GlobalPlayer music ducks on capsule entry and restores on exit
- [ ] **PORT-05**: Memory-type constellation nodes link directly to capsule scenes

### Asset Pipeline & Tooling

- [ ] **ASSET-01**: Manual workflow: upload photo, generate depth offline (Depth Pro or Depth Anything V2), compress to <500KB per capsule
- [ ] **ASSET-02**: CapsuleEditor (lil-gui) provides live tuning for depth, camera keyframes, atmosphere, and color grading

### Integration & Shell

- [ ] **SHELL-01**: Renderer-agnostic CapsuleShell replaces MemoryPortal — displaced mesh now, splat swap later via renderMode per scene
- [ ] **SHELL-02**: WebGL context lifecycle managed — globe renderer disposed on route exit, capsule Canvas isolated
- [ ] **SHELL-03**: Mobile fallback provides parallax + Ken Burns experience for non-capable devices
- [ ] **SHELL-04**: 1 flagship capsule proven end-to-end — a real Jared memory with depth planes, emotional charge, narrative, soundtrack

### Experience Arc (Creative Direction)

- [ ] **ARC-01**: Scene begins as a still image, depth slowly wakes up, camera drifts with "impossible gentleness"
- [ ] **ARC-02**: Foreground objects move at a different emotional rhythm than the background (layer separation via SAM)
- [ ] **ARC-03**: At the end, the memory recedes — returning to your mind, not closing a page

## Future Requirements

Deferred to future milestones. Not in current roadmap.

### Memory Capsules v2.2+
- **CAPSULE-01**: Memory plasma — multi-scene sequencing with flowing transitions between capsules
- **CAPSULE-02**: Gaussian splat renderer swap (SHARP/CompleteSplat when models mature)
- **CAPSULE-03**: Client-side depth estimation (WebGPU + Depth Anything V2 ONNX)
- **CAPSULE-04**: Depth map validator script for pipeline quality assurance
- **CAPSULE-05**: Audio-reactive displacement (Web Audio analyser → shader uniforms)
- **CAPSULE-06**: Auto-ingest from phone capture (Scaniverse/Polycam)
- **CAPSULE-07**: Scene-specific OG preview images

### Constellation Core (from v1.0)
- **CONST-01**: Scripted narrator engine with 5-tier event-driven narration
- **CONST-02**: Guided tour (~90 seconds, cinematic, skippable)
- **CONST-03**: Constellation modes: "Life" / "Work" / "Ideas"
- **CONST-04**: Path memory: faint glowing trail of visitor's journey

### Ecosystem Expansion
- **ECO-01** through **ECO-06**: Starseed Labs standalone, community, subscribers, content pipeline, video, independent site

### Experience Expansion
- **EXP-01** through **EXP-08**: Voice Glint, multiplayer, StarOS, more portals, hand tracking, WebGPU, VR, conversation memory

## Out of Scope (v2.1)

| Feature | Reason |
|---------|--------|
| Memory plasma (multi-scene) | Prove 1 flagship first; don't dilute |
| Gaussian splat renderer | v2.2 — SHARP/CompleteSplat when models mature |
| Client-side depth estimation | 99MB model, needs WebGPU maturity |
| Depth map validator script | Optimize for art direction, not pipeline tooling |
| Audio-reactive displacement | Enhancement after core experience proves |
| Auto-ingest from phone | Manual workflow first |
| Constellation Editor overhaul | Not a defect — save for dedicated milestone |
| New data pipeline parsers | Prove pipeline with existing sources first |
| Generic autonomous internet agent | Glint is bounded to this world |
| Mobile native app | Web-first, responsive design covers mobile |

## Traceability

Updated during roadmap creation (2026-03-23).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPTH-01 | Phase 10 | Not started |
| DEPTH-02 | Phase 10 | Not started |
| DEPTH-03 | Phase 10 | Not started |
| DEPTH-04 | Phase 10 | Not started |
| CINE-01 | Phase 11 | Not started |
| CINE-02 | Phase 11 | Not started |
| CINE-03 | Phase 11 | Not started |
| CINE-04 | Phase 11 | Not started |
| PORT-01 | Phase 12 | Not started |
| PORT-02 | Phase 11 | Not started |
| PORT-03 | Phase 12 | Not started |
| PORT-04 | Phase 11 | Not started |
| PORT-05 | Phase 13 | Not started |
| ASSET-01 | Phase 10 | Not started |
| ASSET-02 | Phase 13 | Not started |
| SHELL-01 | Phase 10 | Not started |
| SHELL-02 | Phase 10 | Not started |
| SHELL-03 | Phase 10 | Not started |
| SHELL-04 | Phase 12 | Not started |
| ARC-01 | Phase 12 | Not started |
| ARC-02 | Phase 12 | Not started |
| ARC-03 | Phase 12 | Not started |

**Coverage:**
- v2.1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0
- Phase 10: 8 requirements (DEPTH-01/02/03/04, SHELL-01/02/03, ASSET-01)
- Phase 11: 6 requirements (CINE-01/02/03/04, PORT-02, PORT-04)
- Phase 12: 6 requirements (SHELL-04, PORT-01/03, ARC-01/02/03)
- Phase 13: 2 requirements (PORT-05, ASSET-02)

## Previous Milestones

### v2.0.1 (Shipped 2026-03-22)
5 requirements, all complete (RENDER-01, CONTENT-01, VISUAL-01/02/03)

### v2.0 (Shipped 2026-03-21)
37 requirements across 6 categories, all complete except STAR-07 (DNS), PORTAL-02 (partial), PORTAL-04 (partial)

---
*Requirements defined: 2026-03-20 (v2.0)*
*Last updated: 2026-03-23 after v2.1 Memory Capsules requirements definition*
