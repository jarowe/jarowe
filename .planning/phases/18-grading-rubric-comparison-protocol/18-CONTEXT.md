# Phase 18: Grading Rubric & Comparison Protocol - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — user provided implementation guidance directly)

<domain>
## Phase Boundary

Implement the 5-dimension grading rubric and 7-view camera protocol in the lab so every world-generation family is judged consistently. This must exist before any comparison generation runs.

</domain>

<decisions>
## Implementation Decisions

### User Direction (from plan-phase invocation)
- Encode the 5 scoring dimensions in the lab UI and save format
- Define the 7 fixed camera viewpoints as a reusable review preset set
- Add the weighted composite score calculation
- Add winner-marking rules and evidence capture
- Make the rubric family-agnostic so Marble, WorldGen, and Matrix-3D all use the exact same review flow

### Implementation Order
1. Add rubric schema to the lab payload and saved review format
2. Add fixed camera-view presets and navigation in the lab
3. Add weighted score summary and "emotional read breaks ties" logic
4. Verify one full review round on naxos-rock before touching generation

### Claude's Discretion
All implementation details — component structure, state management, UI layout, camera preset format.

</decisions>

<canonical_refs>
## Canonical References

### Phase 18 Requirements
- `.planning/REQUIREMENTS.md` §v2.3 — GRADE-01, GRADE-02, GRADE-04

### Grading Rubric Research
- `.planning/research/GRADING-RUBRIC.md` — 5-dimension rubric (anchored 1-5), 7 camera views, weighted composite formula (Coherence 0.25, Subject 0.25, Emotion 0.20, Exploration 0.15, Artifacts 0.15), winner protocol, lab integration schema

### Existing Lab Code
- `src/pages/labs/MemoryWorldLab.jsx` — Current lab UI
- `vite.config.js` — Lab API endpoints (scene loading, grading)
- `pipeline/grade-memory-world.mjs` — Existing machine scoring

### Meta.json Contract
- `public/memory/naxos-rock/meta.json` — Example scene with provenance
- `public/memory/syros-cave/meta.json` — Example scene

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MemoryWorldLab.jsx` — Existing lab with version snapshots, scoring, candidate management
- `grade-memory-world.mjs` — Existing machine scoring metrics (occupancy, depth coverage, etc.)
- `vite.config.js` — Lab API routes for scene data and grading

### Integration Points
- Lab UI: add rubric dimensions to the review panel
- meta.json: add `world.grades` schema for storing dimension scores
- grade-memory-world.mjs: extend with weighted composite calculation

</code_context>

<specifics>
## Specific Ideas

- Rubric must be family-agnostic — same flow for Marble, WorldGen, Matrix-3D
- "Emotional read breaks ties" is the primary tiebreaker
- 7 camera views: start, right-45, right-90, rear-180, overhead, approach, ground
- Weighted composite: Coherence 0.25, Subject 0.25, Emotion 0.20, Exploration 0.15, Artifacts 0.15
- Verify with one full review round on naxos-rock before generation starts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-grading-rubric-comparison-protocol*
*Context gathered: 2026-04-05 via user direction*
