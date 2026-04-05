# Requirements: jarowe.com

**Defined:** 2026-04-05 (v2.3)
**Core Value:** jarowe.com is the most alive personal world on the internet -- a living place of wonder that turns curiosity into creation.

## v2.3 Requirements — Best World Wins

Choose the best world-generation family for each hero memory through controlled comparison, then evaluate subject reconstruction paths against the winning world.

**Guardrail:** If tradeoffs appear, protect comparison fairness (GRADE-04) and provenance integrity (WORLD-03) before protecting coverage breadth. A fair comparison of two families beats an unfair comparison of three.

### World Comparison

- [ ] **WORLD-01**: Controlled comparison set generated for naxos-rock across Marble and WorldGen families with identical source photo
- [ ] **WORLD-02**: Controlled comparison set generated for syros-cave across Marble and WorldGen families with identical source photo
- [ ] **WORLD-02a**: Matrix-3D completes at least one benchmark scene successfully (cloud GPU allowed). If operationally viable, expand to second scene in-milestone.
- [ ] **WORLD-02b**: If Matrix-3D proves non-viable for the comparison, document why it was excluded with specific failure evidence
- [ ] **WORLD-03**: Every generation run saved with strict provenance -- family, prompt, seed, quality profile, runtime asset format, source/output files, machine score, human grade

### Grading System

- [ ] **GRADE-01**: Grading rubric implemented in lab with 5 dimensions (world coherence, exploration range, subject preservation potential, artifact severity, emotional read) scored 1-5 with anchored examples
- [ ] **GRADE-02**: 7 standardized camera views evaluated per world (start, right-45, right-90, rear-180, overhead, approach, ground)
- [ ] **GRADE-03**: Family-first lab review with filters, side-by-side candidate context, and winner marking per family and per scene
- [ ] **GRADE-04**: All family comparisons use the same source image, same review camera set, and as-close-as-possible prompt intent so the comparison is fair

### Subject Path

- [ ] **SUBJ-01**: Current billboard subject path evaluated against depth-warped billboard and SAM 3D Objects on the winning world family -- not against moving targets
- [ ] **SUBJ-02**: Subject grading criteria defined and applied (depth coherence, parallax correctness, appearance preservation, artifact visibility)

### Winner Selection

- [ ] **WIN-01**: One locked winning world family per scene with documented evidence (scores, screenshots, notes on why it won)
- [ ] **WIN-02**: One locked winning subject path per scene with documented evidence

## Exploratory (Non-Blocking)

These are tracked but not required for v2.3 completion. May prove useful for future milestones.

- **EXPLORE-01**: sam3d-body evaluated as body prior / occluder / collider / depth scaffold (not as visible subject solution). Document utility findings regardless of outcome.

## Future Requirements

Deferred to v2.4+ milestones. Not in current roadmap.

### Visual Polish
- **POLISH-01**: Dream particle effects tuned for winning world family
- **POLISH-02**: Atmosphere/fog/god-rays layer on winning world
- **POLISH-03**: Camera choreography and entry transitions refined
- **POLISH-04**: Soundscape with real ambient audio (not synthesized placeholders)

### Loading & Performance
- **PERF-01**: SPZ compression pipeline for all scenes (<3s load target)
- **PERF-02**: Two-tier progressive loading (100K preview → full quality)
- **PERF-03**: Preloading strategy (prefetch on hover, service worker caching)

### Scale
- **SCALE-01**: Automated pipeline for new memory content (photo → world → deployed)
- **SCALE-02**: Memory-to-memory transitions (particles dissolve between worlds)

## Out of Scope (v2.3)

| Feature | Reason |
|---------|--------|
| Renderer cleanup / dead code removal | Done in v2.2 cleanup |
| Dream effects / atmosphere polish | v2.4 — after world quality locked |
| Loading optimization beyond fair comparison | v2.4 |
| New narrative UX | v2.4 |
| sam3d-body as visible subject solution | Research shows it outputs geometry-only mannequins with no appearance — downgrade from photo billboards for personal memories. Tracked as exploratory for other uses. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WORLD-01 | 19 (Generation Batches) | Not started |
| WORLD-02 | 19 (Generation Batches) | Not started |
| WORLD-02a | 20 (Matrix-3D Viability Test) | Not started |
| WORLD-02b | 20 (Matrix-3D Viability Test) | Not started |
| WORLD-03 | 19 (Generation Batches) | Not started |
| GRADE-01 | 18 (Grading Rubric & Comparison Protocol) | Not started |
| GRADE-02 | 18 (Grading Rubric & Comparison Protocol) | Not started |
| GRADE-03 | 21 (Lab Upgrade for Family Review) | Not started |
| GRADE-04 | 18 (Grading Rubric & Comparison Protocol) | Not started |
| SUBJ-01 | 22 (Subject Path Evaluation) | Not started |
| SUBJ-02 | 22 (Subject Path Evaluation) | Not started |
| WIN-01 | 23 (Winner Selection & Lock) | Not started |
| WIN-02 | 23 (Winner Selection & Lock) | Not started |

**Coverage:**
- v2.3 requirements: 13 total
- Exploratory: 1 (non-blocking)
- Mapped to phases: 13/13 (100%)

---
*Requirements defined: 2026-04-05 (v2.3)*
