# Requirements: jarowe.com

**Defined:** 2026-03-23 (v2.2)
**Core Value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.

## v2.2 Requirements — Particle Memory Flight

Replace the flagship desktop Memory Capsule renderer with a true particle-memory experience. Photos decompose into luminous 3D particle fields you fly through via scroll, with dreamstate portal transitions and progress-reactive audio. Flagship scene: syros-cave only.

**Guardrail:** If tradeoffs appear, protect the particle flight experience (PART-01, FLIGHT-01, DREAM-01/03) before protecting audio polish or wire connection density.

### Particle Renderer

- [ ] **PART-01**: Photo + depth map sampled into 80K-150K luminous particles placed in 3D — the image is recognizable as a particle field, not a flat texture. Flagship desktop path: `syros-cave` only — one scene proves the renderer
- [ ] **PART-02**: Selective wire connections link nearby particles with depth-aware density — visible structure between particles, not isolated dots
- [ ] **PART-03**: Particles have bloom glow, breathing animation, and size variation — the field feels alive, not static
- [ ] **PART-04**: Tier-adaptive particle count — full (150K), simplified (50K-80K), parallax fallback (CSS, no WebGL)

### Flight Controller

- [ ] **FLIGHT-01**: Scroll/trackpad/touch input drives camera position along a 3D spline path — wheel forward = fly deeper into the memory
- [ ] **FLIGHT-02**: Camera movement has momentum and exponential decay — smooth, not jerky or 1:1 locked to scroll delta
- [ ] **FLIGHT-03**: Narrative cards and particle cohesion states are driven by normalized progress (0-1), not time — scroll controls the experience pace
- [ ] **FLIGHT-04**: Progress supports both deliberate scroll-stepping and inertial autopilot drift when input stops — the scene never feels dead, but the user regains control on next scroll

### Dream Portal

- [ ] **DREAM-01**: Entry transition dissolves the current page into scattered particles before route change — reality breaks apart, not a UI fade
- [ ] **DREAM-02**: Tunnel/void phase streams particles past the camera in a directional flow — the visitor falls through a luminous space between worlds
- [ ] **DREAM-03**: Memory reform phase assembles the particle field from scattered positions into the photo formation — the memory crystallizes from chaos
- [ ] **DREAM-04**: Exit transition reverses the memory into particles and returns through the same dream grammar as entry — not a different or out-of-band effect

### Soundscape

- [ ] **SOUND-01**: Layered ambient audio (drone, texture, detail) with per-layer volume envelopes driven by scroll progress — audio evolves as you fly deeper
- [ ] **SOUND-02**: GlobalPlayer ducks on capsule entry, soundscape cross-fades smoothly — no audio gaps or conflicts

### Integration

- [ ] **INTEG-01**: New `renderMode: 'particle-memory'` slots into existing CapsuleShell dispatch — shell, route, narrative overlay, and fallback remain unchanged
- [ ] **INTEG-02**: Dual position buffers (scattered + photo-sampled) pre-allocated at init — enables dissolve/reform without destructive buffer rewrites

## Future Requirements

Deferred to future milestones. Not in current roadmap.

### Memory Capsules v2.3+
- **CAPSULE-01**: Memory plasma — multi-scene sequencing with flowing transitions between capsules
- **CAPSULE-02**: Gaussian splat renderer swap (SHARP/CompleteSplat when models mature)
- **CAPSULE-03**: Client-side depth estimation (WebGPU + Depth Anything V2 ONNX)
- **CAPSULE-04**: Audio-reactive particle displacement (Web Audio analyser → shader uniforms)
- **CAPSULE-05**: Multiple flagship scenes (Jace on rocks, family golden hour, etc.)
- **CAPSULE-06**: GPUComputationRenderer for per-particle physics simulation
- **CAPSULE-07**: Scene-specific OG preview images with particle snapshot

### Constellation Core
- **CONST-01**: Scripted narrator engine with 5-tier event-driven narration
- **CONST-02**: Guided tour (~90 seconds, cinematic, skippable)

### Ecosystem Expansion
- **ECO-01** through **ECO-06**: Starseed Labs standalone, community, subscribers, content pipeline

## Out of Scope (v2.2)

| Feature | Reason |
|---------|--------|
| Multiple memory scenes | Prove 1 flagship first; don't dilute |
| GPU compute particles | Vertex shader handles dissolve/reform; defer GPUComputationRenderer |
| Displaced-mesh renderer improvements | Wrong primitive — being replaced |
| OrbitControls / free-roam camera | Experience is scroll-driven on rails |
| Mobile particle renderer | Desktop hero first; mobile keeps parallax |
| Soundtrack per scene | Soundscape is ambient layers, not curated tracks |
| Constellation integration | Phase 13 (v2.1 stretch) — deferred |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PART-01 | TBD | Not started |
| PART-02 | TBD | Not started |
| PART-03 | TBD | Not started |
| PART-04 | TBD | Not started |
| FLIGHT-01 | TBD | Not started |
| FLIGHT-02 | TBD | Not started |
| FLIGHT-03 | TBD | Not started |
| FLIGHT-04 | TBD | Not started |
| DREAM-01 | TBD | Not started |
| DREAM-02 | TBD | Not started |
| DREAM-03 | TBD | Not started |
| DREAM-04 | TBD | Not started |
| SOUND-01 | TBD | Not started |
| SOUND-02 | TBD | Not started |
| INTEG-01 | TBD | Not started |
| INTEG-02 | TBD | Not started |

**Coverage:**
- v2.2 requirements: 16 total
- Mapped to phases: 0 (awaiting roadmap)

## Previous Milestones

### v2.1 (Shipped 2026-03-23)
20 requirements, all complete (DEPTH-01/02/03/04, SHELL-01/02/03/04, ASSET-01, CINE-01/02/03/04, PORT-01/02/03/04, ARC-01/02/03)

### v2.0.1 (Shipped 2026-03-22)
5 requirements, all complete (RENDER-01, CONTENT-01, VISUAL-01/02/03)

### v2.0 (Shipped 2026-03-21)
37 requirements across 6 categories, all complete except STAR-07 (DNS), PORTAL-02 (partial), PORTAL-04 (partial)

---
*Requirements defined: 2026-03-23 (v2.2)*
*Last updated: 2026-03-23*
