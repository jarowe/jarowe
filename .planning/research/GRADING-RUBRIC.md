# Memory World Grading Rubric & Comparison Protocol

**Created:** 2026-04-04
**Status:** Working protocol for lab use
**Scope:** Evaluating 3D world generation quality across families (Marble, WorldGen/Pano-First, Camera-Guided, Structured-Anchor, Matrix-3D) for personal memory scenes

---

## A. Scoring Rubric

All dimensions scored 1-5 (integers only). Half points allowed only when a scene genuinely sits between two anchor descriptions.

---

### Dimension 1: World Coherence

**What it measures:** Does the 3D world make geometric sense? Are surfaces connected? Do depth relationships hold?

| Score | Description | What You See |
|-------|-------------|-------------|
| **1** | Broken geometry. | Multiple floating clusters disconnected from the ground plane. Walls that intersect impossibly. Sky rendered below the horizon. Depth ordering contradicts the original photo. The scene looks like a shattered mirror reassembled wrong. |
| **2** | Major structural errors. | One or two dominant surfaces hold, but transitions between foreground/midground/background are fractured. Objects that should be grounded float. Depth layers are compressed or inverted in places. |
| **3** | Usable but flawed. | Primary surfaces (ground, walls, horizon) are connected and geometrically plausible. Some secondary surfaces break (e.g., a rock shelf that warps at the edge, a cave ceiling that bends unnaturally). Depth ordering is correct for the main composition but fails on peripherals. |
| **4** | Clean with minor issues. | All major and most minor surfaces are geometrically coherent. Depth relationships are correct everywhere. A careful observer might notice one subtle discontinuity (a seam, a slight warp, an edge that doesn't quite meet). Surfaces connect naturally. |
| **5** | Indistinguishable from a real 3D scan. | Every surface connects. Depth is correct at all scales. No floating splats, no impossible intersections, no warping. A viewer unfamiliar with the generation process would assume this was captured with a LiDAR scanner. |

**How to test:**
1. Start at the default camera position. Check: does the ground plane meet the walls/horizon correctly?
2. Slowly dolly forward 1 unit. Check: do depth layers separate correctly as parallax increases?
3. Look straight down. Check: is the ground plane continuous or fragmented?
4. Look straight up. Check: is the sky/ceiling coherent or does it have holes/inversions?

**Specific signals to note:**
- Floating splat clusters (count them: 0, 1-3, 4-10, 10+)
- Depth layer inversions (foreground rendered behind background)
- Surface continuity breaks at depth discontinuities (e.g., edge of a rock where it meets sky)
- Ground plane warping or bending

---

### Dimension 2: Exploration Range

**What it measures:** How far can you move from the original viewpoint before quality degrades unacceptably?

| Score | Description | What You See |
|-------|-------------|-------------|
| **1** | Viewpoint-locked. | Any camera movement beyond a tiny jitter reveals catastrophic artifacts. The world is essentially a flat photo plane with depth noise. Moving even 0.5 units causes stretching, tearing, or void exposure. |
| **2** | Slight look-around only. | You can rotate the camera ~20 degrees and shift ~0.5 units without obvious breakdown. Beyond that, major stretching or voids appear. The world is a thin shell viewed from one spot. |
| **3** | 90-degree comfort zone. | You can orbit ~90 degrees and translate ~2 units from the start position. The front hemisphere holds up. The back hemisphere (behind the original camera) is empty or severely degraded. Approaching close objects works partially. |
| **4** | Near-full orbit with manageable falloff. | You can orbit ~270 degrees. The back side has noticeably lower detail but no catastrophic artifacts. You can approach objects and they maintain reasonable shape. Translation range is ~4 units before significant quality drop. |
| **5** | Full 360 exploration. | You can orbit the full sphere and translate freely within the scene bounds. Quality is consistent from all angles. Approaching objects reveals plausible detail (not perfect, but not broken). The back side of the scene is as coherent as the front. |

**How to test:**
1. **Front view (0 degrees):** Default position. Score the baseline.
2. **45-degree orbit:** Orbit camera 45 degrees right. Does the scene hold?
3. **90-degree orbit:** Orbit 90 degrees. Check for stretching, voids, thin-shell artifacts.
4. **180-degree orbit (rear view):** Look back at where the camera originally was. Is there anything there? Is it plausible?
5. **Overhead:** Move camera to 2x height, look down. Is the ground plane intact?
6. **Approach test:** Move camera toward the nearest foreground object until you are within 0.5 units. Does it hold shape or dissolve into splat noise?
7. **Translation test:** Strafe left 3 units from start. Is the scene still readable?

**Specific signals to note:**
- Distance at which first major artifact appears (in scene units)
- Maximum comfortable orbit angle (degrees)
- Void exposure (percentage of view that is empty black/white at each test position)
- Thin-shell visibility (can you see the "back" of the front-facing shell?)

---

### Dimension 3: Subject Preservation Potential

**What it measures:** How well does the world preserve the space where the subject was (or will be composited)? Is there room for a 3D subject? Does the context around the subject look natural?

| Score | Description | What You See |
|-------|-------------|-------------|
| **1** | Subject area destroyed. | The region where the subject should be placed is occupied by hallucinated geometry, duplicate people, or severe artifacts. There is no clean space for compositing. The ground/surface under the subject's position is warped or missing. |
| **2** | Subject area present but contaminated. | The space exists but has ghosting (remnants of the erased subject), color bleed, or geometry from the inpainting that would conflict with a composited subject. The surface under the subject position is roughly correct but visually noisy. |
| **3** | Clean space, weak context. | The subject area is clean and available for compositing. The surface under the subject (ground, rock, chair) is present and roughly correct. But surrounding context elements (shadows, lighting direction, nearby objects) don't quite match what a real subject would need. The subject would look "pasted on." |
| **4** | Good space with supporting context. | Clean subject area. Surface geometry supports the subject naturally (correct height, correct slope). Surrounding lighting direction matches. Nearby objects are in correct relative position. A composited subject would look plausible at a glance. Minor shadow/reflection mismatches might be visible. |
| **5** | Perfect compositing bed. | The subject space is pristine. The surface under the subject matches the original photo's geometry exactly. Lighting, shadow direction, ambient occlusion, and surrounding object positions all support natural compositing. A composited 3D subject would look like it belongs. |

**How to test:**
1. Load the original photo and the world side by side.
2. Navigate to the subject's position in the world. Is the space clear?
3. Check the surface under the subject position: does its angle match the original photo?
4. Check for subject ghosting (faint remnants of the erased person).
5. Check for duplicate-person artifacts (the generator hallucinating a new person).
6. Estimate: if a 3D mesh of the subject were placed here at correct scale, would it look like it belongs?

**Specific signals to note:**
- Subject ghosting severity (none / faint / obvious)
- Duplicate person generation (yes/no, how many)
- Ground surface angle match (correct / tilted / missing)
- Subject-area void (is the space simply empty/black?)
- Surrounding anchor preservation (objects that were near the subject in the original photo)

---

### Dimension 4: Artifact Severity

**What it measures:** How bad are the worst artifacts? This is specifically about visual defects, not geometric coherence (dimension 1) or exploration range (dimension 2).

| Score | Description | What You See |
|-------|-------------|-------------|
| **1** | Severe, scene-breaking artifacts. | Large floating splat clusters visible from the default view. Depth discontinuity tears that look like the scene was ripped apart. Hallucination errors (impossible objects, duplicated landmarks, anatomy violations). Seam lines wider than 5% of frame width. The artifacts are the first thing you notice. |
| **2** | Prominent artifacts, hard to ignore. | Several floating splat groups. Visible seam lines where panorama views were stitched. Color banding or blurring at depth edges. Hallucination errors in secondary objects. Artifacts are immediately visible but the scene is still recognizable. |
| **3** | Moderate artifacts, noticeable on inspection. | A few small floating splat groups. Minor seam lines visible when you know where to look. Depth edges have some fringing or color bleeding. No major hallucination errors. The scene reads correctly at first glance; artifacts emerge on careful inspection. |
| **4** | Minor artifacts, easy to overlook. | One or two tiny floating splats. Depth edges are mostly clean with occasional softness. No visible seams. No hallucination. You have to actively search for defects to find them. |
| **5** | Clean. | No visible floating splats. No seam lines. No depth fringing. No hallucination errors. The scene looks like a high-quality capture from a real camera rig. |

**How to test:**
1. **First-impression test:** Load the scene fresh. What do you notice in the first 3 seconds? If an artifact catches your eye, it's at least a 2.
2. **Seam hunt:** Orbit slowly through 360 degrees. Look for vertical or horizontal lines where two generated views meet.
3. **Floater hunt:** Dolly forward and backward. Floating splats become visible when they move at a different parallax rate than the surfaces behind them.
4. **Edge inspection:** Look at depth discontinuities (where a foreground object meets the background sky). Check for color fringing, bleeding, or tearing.
5. **Hallucination check:** Compare with the original photo. Did the generator add anything that doesn't belong (extra people, impossible objects, text, duplicated landmarks)?

**Specific signals to note:**
- Floating splat count at default view
- Floating splat count at worst view angle
- Seam line count and severity
- Depth edge quality (clean / soft / fringed / torn)
- Hallucination incidents (list each one)

---

### Dimension 5: Emotional Read

**What it measures:** Does the world feel like the memory? Does it capture the mood, light, and atmosphere of the original photo?

| Score | Description | What You See |
|-------|-------------|-------------|
| **1** | Unrecognizable. | The world does not feel like the same place as the photo. The lighting, color palette, mood, or spatial character have been fundamentally changed. The person who took this photo would not recognize it. |
| **2** | Same subject, wrong feeling. | You can tell it's the same location, but the atmosphere is wrong. The light might be colder or warmer than the original. The space might feel smaller or larger. The emotional tone (e.g., "intimate cave" vs "open beach") is shifted. |
| **3** | Recognizable, partially immersive. | The world feels like the right place. The original photo's lighting and color palette are mostly preserved. The spatial character is correct (a cave feels like a cave, a shoreline feels like a shoreline). But something is slightly off: maybe the extended environment feels generic, or the light doesn't wrap correctly. You'd say "yes, that's the place" but it doesn't pull you in. |
| **4** | Strongly evocative. | The world triggers the same emotional response as the original photo. The light is right. The color palette is right. The spatial scale feels correct. The hallucinated extensions feel like plausible continuations of the real place. You feel like you're there, with minor moments that break the spell. |
| **5** | Time machine. | The world is the memory. Looking around feels like being transported to the actual moment. The light wraps correctly. The atmosphere is palpable. The hallucinated environment feels inevitable, as though you always knew the rest of the scene looked like this. The person who took this photo would feel a jolt of recognition. |

**How to test:**
1. Display the original photo for 10 seconds. Close it.
2. Enter the 3D world. First emotional reaction: does it feel like the same moment?
3. Orbit slowly. Does the mood hold as you see the generated extensions?
4. Return to the default camera position. Compare with the photo again. How close is the color temperature? The lighting direction? The spatial scale?
5. Read the scene's narrative text. Does the world support the words?

**Specific signals to note:**
- Color temperature match (warm/cool shift from original)
- Lighting direction accuracy
- Spatial scale feeling (too small / correct / too large)
- Hallucinated environment plausibility (generic vs. scene-specific)
- "Recognition jolt" on first entry (yes/no)

---

## B. Comparison Protocol

### B.1. Standard Camera Positions (7 views per world)

Every world under evaluation must be captured at these positions. Use the scene's `camera.startPosition` as origin (0,0).

| View ID | Name | Camera Action | What to Evaluate |
|---------|------|--------------|------------------|
| `V0` | **Start** | Default camera position from meta.json | First impression. All 5 dimensions at baseline. |
| `V1` | **Right-45** | Orbit 45 degrees clockwise (azimuth) | Coherence holds? Parallax correct? Subject area visible? |
| `V2` | **Right-90** | Orbit 90 degrees clockwise | Seam visibility. Depth edge quality. Exploration range boundary. |
| `V3` | **Rear-180** | Orbit 180 degrees (looking back at original camera position) | Back-hemisphere quality. Hallucination quality. Void exposure. |
| `V4` | **Overhead** | Move camera to 2x starting height, pitch down 45 degrees | Ground plane continuity. Floating splat visibility. World coherence from above. |
| `V5` | **Approach** | Dolly forward to 50% of start-to-target distance | Subject area detail. Depth edge quality on approach. |
| `V6` | **Ground** | Drop camera to 0.3 units above ground plane, look forward | Ground surface continuity. Thin-shell detection. Immersion test. |

### B.2. Documentation Per View

For each of the 7 views, capture:

```
Screenshot: {scene-id}_{family}_{view-id}.png
  e.g., naxos-rock_marble_V0.png

Quick scores (1-5):
  Coherence: __
  Artifacts: __

Notes (freeform, 1-2 sentences max):
  "Seam visible at left edge where pano stitched."
```

Only V0 (Start) receives the full 5-dimension scoring. V1-V6 receive only Coherence + Artifacts to keep the protocol fast.

### B.3. Per-World Evaluation Sheet

For each world (one family, one scene), fill out:

```
Scene: ____________     Family: ____________     Date: ____________

FULL SCORES (from V0 inspection + overall impression after reviewing all 7 views):

  1. World Coherence:        __ / 5
  2. Exploration Range:       __ / 5
  3. Subject Preservation:    __ / 5
  4. Artifact Severity:       __ / 5
  5. Emotional Read:          __ / 5

  COMPOSITE:                  __ / 25

  Weighted Composite (see B.5):  ___

NOTES:
  Strongest quality: ___________________________
  Weakest quality:  ___________________________
  Deal-breaker (if any): _______________________
```

### B.4. Comparison Ordering

When evaluating N families for the same scene:

1. **Randomize order** for each session. Do not always start with Marble.
2. View each world for at least 60 seconds before scoring.
3. Complete all 7 views for one world before moving to the next.
4. After all worlds are scored, do a final **side-by-side pass**: open the V0 screenshot from every family simultaneously and re-confirm scores.

### B.5. Weighted Composite Formula

Not all dimensions matter equally for personal memory worlds. Weights:

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| World Coherence | 0.25 | Geometric sense is foundational. |
| Exploration Range | 0.15 | Memory worlds are viewed from near the origin; exploration is nice-to-have, not critical. |
| Subject Preservation | 0.25 | The person in the memory is the whole point. |
| Artifact Severity | 0.15 | Artifacts that don't appear at the default view matter less. |
| Emotional Read | 0.20 | The world must feel like the memory. |

**Weighted Composite = (C * 0.25) + (E * 0.15) + (S * 0.25) + (A * 0.15) + (R * 0.20)**

Maximum: 5.00. Scores are comparable across scenes and families.

### B.6. Tie-Breaking

If two families have the same weighted composite (within 0.2 points):

1. **Emotional Read** wins the tie. The world that feels more like the memory wins.
2. If Emotional Read is also tied, **Subject Preservation** breaks it.
3. If still tied, **cost** breaks it (free beats paid).
4. If still tied, mark both as co-winners and defer to runtime testing (load time, file size, mobile performance).

---

## C. Machine Scoring

### C.1. Existing Pipeline Metrics (from `grade-memory-world.mjs`)

The current `scoreWorldPly()` function already computes these from PLY file analysis:

| Metric | What It Measures | Maps to Dimension |
|--------|-----------------|-------------------|
| `occupancyRatio` | % of 3D grid cells occupied | World Coherence (density) |
| `depthCoverage` | % of depth bins with splats | Exploration Range (depth distribution) |
| `depthEntropy` | Evenness of depth distribution | World Coherence (not front-sheet) |
| `radialEntropy` | Evenness of radial distribution | Exploration Range (360 coverage) |
| `widthDepthBalance` | Depth extent vs. width extent | World Coherence (not flat) |
| `heightDepthBalance` | Depth extent vs. height extent | World Coherence |
| `frontSheetPenalty` | Penalty for thin depth extent | Exploration Range (thin shell detection) |
| `frontalWallPenalty` | Penalty for dominant frontal wall | Exploration Range |
| `depthConcentrationPenalty` | Penalty for splats bunched in one depth bin | World Coherence |

These metrics are **geometry-only**. They cannot measure emotional read, subject preservation, or visual artifact quality.

### C.2. New Automated Metrics to Add

These can be computed without rendering and added to `scoreWorldPly()` or a companion `scoreWorldExtended()`:

| Metric | Computation | Maps to Dimension |
|--------|------------|-------------------|
| **Splat count** | Read from PLY header | General quality proxy (more splats usually = more detail) |
| **Bounding box volume** | `extent.x * extent.y * extent.z` | Exploration Range (larger = more world) |
| **Bounding box aspect ratio** | `max(extent) / min(extent)` | World Coherence (extreme ratios suggest flat shells) |
| **Splat density** | `splatCount / boundingBoxVolume` | Quality density per cubic unit |
| **Hemisphere balance** | `splats_in_back_half / splats_in_front_half` | Exploration Range (0 = no rear content, 1 = balanced) |
| **Subject-zone void ratio** | Splat density in the subject crop box vs. scene average | Subject Preservation (should be lower if subject was erased) |
| **Outlier splat ratio** | % of splats beyond 3 sigma from centroid | Artifact Severity (floating splats) |
| **File size** | SPZ/PLY file size in bytes | Runtime cost (not a quality metric, but a decision factor) |

### C.3. Render-Based Metrics (WorldScore-Inspired)

These require rendering the splat at the 7 standard camera positions and comparing rendered images:

| Metric | Computation | Maps to Dimension |
|--------|------------|-------------------|
| **SSIM to source photo** | Render at V0, compute SSIM against original photo | Emotional Read (color/structure fidelity) |
| **LPIPS to source photo** | Render at V0, compute learned perceptual distance | Emotional Read (perceptual fidelity) |
| **Void pixel ratio per view** | % of black/missing pixels at each of the 7 views | Exploration Range, Artifact Severity |
| **View consistency** | SSIM between overlapping regions of adjacent views | World Coherence (seam detection) |
| **Color temperature delta** | Average color temperature of V0 render vs. source photo | Emotional Read |

These are more expensive to compute and require a headless renderer. They are **Phase 2** for the scoring pipeline.

### C.4. Machine Score Composite

Until render-based metrics are implemented, use a machine composite from PLY-only metrics:

```
machineComposite = (
    occupancyRatio * 0.20
  + depthEntropy * 0.15
  + radialEntropy * 0.15
  + hemisphereBalance * 0.15
  + (1 - outlierSplatRatio) * 0.10
  + widthDepthBalance * 0.10
  + (1 - frontSheetPenalty) * 0.10
  + (1 - depthConcentrationPenalty) * 0.05
)
```

This gives a 0-1 score that correlates with (but does not replace) human evaluation.

---

## D. Lab Integration

### D.1. Storing Grades in meta.json

Add a `grades` object to `meta.json` under `world`:

```jsonc
{
  "world": {
    // ... existing fields ...
    "grades": {
      "rubricVersion": "2026-04-04",
      "evaluations": [
        {
          "family": "marble",
          "date": "2026-04-04",
          "evaluator": "jared",
          "worldCoherence": 4,
          "explorationRange": 3,
          "subjectPreservation": 4,
          "artifactSeverity": 4,
          "emotionalRead": 5,
          "composite": 20,
          "weightedComposite": 4.05,
          "machineScore": 0.397,
          "notes": "Strong emotional match. Rear hemisphere sparse but not broken.",
          "dealBreaker": null,
          "versionId": "20260404-120000z--marble-hero"
        },
        {
          "family": "pano-first",
          "date": "2026-04-04",
          "evaluator": "jared",
          "worldCoherence": 3,
          "explorationRange": 2,
          "subjectPreservation": 3,
          "artifactSeverity": 3,
          "emotionalRead": 3,
          "composite": 14,
          "weightedComposite": 2.85,
          "machineScore": 0.354,
          "notes": "Seams visible at 90 degrees. Ground warps on approach.",
          "dealBreaker": null,
          "versionId": "20260404-130000z--pano-first-01"
        }
      ],
      "winner": {
        "family": "marble",
        "decidedDate": "2026-04-04",
        "weightedComposite": 4.05,
        "rationale": "Best emotional read, cleanest subject area, artifacts manageable.",
        "locked": true
      }
    }
  }
}
```

### D.2. Storing Grades in Version Review

Each version snapshot (created by `grade-memory-world.mjs`) should include the rubric scores. Extend the `humanReview` object:

```jsonc
{
  "humanReview": {
    "grade": 8.1,           // legacy 0-10 overall grade
    "rubric": {
      "rubricVersion": "2026-04-04",
      "worldCoherence": 4,
      "explorationRange": 3,
      "subjectPreservation": 4,
      "artifactSeverity": 4,
      "emotionalRead": 5,
      "composite": 20,
      "weightedComposite": 4.05
    },
    "notes": "...",
    "favorite": true
  }
}
```

### D.3. CLI Integration

Extend `grade-memory-world.mjs` to accept rubric scores:

```bash
node pipeline/grade-memory-world.mjs naxos-rock \
  --source candidate:candidate-05 \
  --label "marble-hero" \
  --coherence 4 \
  --exploration 3 \
  --subject 4 \
  --artifacts 4 \
  --emotion 5 \
  --notes "Strong emotional match. Rear hemisphere sparse but not broken." \
  --favorite
```

The script computes `composite` and `weightedComposite` automatically.

### D.4. Family-Aware Comparison Views

For lab review, generate a comparison summary per scene:

```bash
node pipeline/grade-memory-world.mjs naxos-rock --compare
```

Output (to stdout and `world/versions/comparison.json`):

```json
{
  "sceneId": "naxos-rock",
  "families": [
    {
      "family": "marble",
      "bestVersion": "20260404-120000z--marble-hero",
      "weightedComposite": 4.05,
      "machineScore": 0.397,
      "cost": "$1.26",
      "dealBreaker": null
    },
    {
      "family": "pano-first",
      "bestVersion": "20260404-130000z--pano-first-01",
      "weightedComposite": 2.85,
      "machineScore": 0.354,
      "cost": "$0 (local GPU)",
      "dealBreaker": null
    }
  ],
  "winner": "marble",
  "margin": 1.20
}
```

### D.5. Baseline vs. Challenger Workflow

The standard workflow for evaluating a new generation family:

1. **Establish baseline.** The current winner for a scene is the baseline. If no winner exists, Marble is the default baseline.
2. **Generate challenger.** Run the new family's pipeline for the same scene.
3. **Version both.** Run `grade-memory-world.mjs` for both to snapshot assets.
4. **Evaluate both.** Follow the 7-view protocol. Score all 5 dimensions.
5. **Compare.** If the challenger's weighted composite is within 0.2 of the baseline, trigger tie-breaking rules (B.6).
6. **Promote or reject.** If the challenger wins, update `world.grades.winner` in meta.json. If the baseline holds, record the challenger evaluation anyway for future reference.

---

## E. Winner Protocol

### E.1. Quality Threshold: "Good Enough"

A world is **shippable** (good enough for jarowe.com) when:

- Weighted composite >= **3.0** (out of 5.0)
- No dimension scores 1 (no deal-breaker in any area)
- Subject Preservation >= 3 (subject space must be compositable)
- Emotional Read >= 3 (the world must feel like the memory)

A world is **hero quality** when:

- Weighted composite >= **4.0**
- All dimensions >= 3
- Emotional Read >= 4

### E.2. Cost-Quality Tradeoff

Record cost alongside quality in every evaluation. Use this decision matrix:

| Situation | Decision |
|-----------|----------|
| Marble wins by > 0.5 weighted composite AND scene is a hero scene | Use Marble. The $1.26/world cost is justified. |
| Marble wins by > 0.5 AND scene is NOT a hero scene | Use Marble only if total scene count stays under budget. Otherwise, accept the free option if it meets "good enough" threshold. |
| Marble wins by 0.0 - 0.5 | Use the free option. The quality gap is not worth the cost and vendor dependency. |
| Free option wins | Use the free option. |
| Neither meets "good enough" threshold | Do not ship. Shelve the scene until pipeline improves, or hand-edit in SuperSplat. |

**Budget ceiling:** For a personal site with ~10-20 hero memory scenes, a total budget of $25-50 for Marble generations is reasonable. Track cumulative spend.

### E.3. Documenting the Decision

When a winner is selected, write the following to `meta.json` under `world.grades.winner`:

```jsonc
{
  "family": "marble",
  "decidedDate": "2026-04-04",
  "weightedComposite": 4.05,
  "rationale": "Best emotional read (5/5). Subject area pristine. Artifacts minimal. $1.26 justified for hero scene.",
  "locked": true,
  "costUsd": 1.26,
  "alternativeFamily": "pano-first",
  "alternativeWeightedComposite": 2.85,
  "qualityDelta": 1.20
}
```

### E.4. Locking the Winner

Setting `"locked": true` means:

- The scene's world asset should not be regenerated without explicit intent.
- Future pipeline improvements should generate into a new candidate slot, not overwrite the winner.
- The winner can only be unlocked by running `grade-memory-world.mjs` with `--unlock` and providing a reason.

### E.5. Re-evaluation Triggers

A locked winner should be re-evaluated when:

- A new generation family becomes available (e.g., Matrix-3D pipeline goes live)
- The pipeline for the winning family receives a major quality upgrade (e.g., WorldGen adds gsplat optimization)
- The scene's subject reconstruction changes significantly (new SAM3D version)
- A user reports the world "doesn't feel right" during site review

---

## F. Quick-Reference Checklist

For each scene comparison session:

```
[ ] Source photo printed or on second monitor
[ ] All candidate worlds generated and versioned
[ ] Randomize evaluation order
[ ] Per world:
    [ ] V0 screenshot + full 5-dimension score
    [ ] V1-V6 screenshots + coherence + artifact scores
    [ ] Notes on strongest/weakest quality
    [ ] Deal-breaker check
[ ] Side-by-side V0 comparison across all families
[ ] Compute weighted composites
[ ] Apply tie-breaking if needed
[ ] Record winner with rationale
[ ] Update meta.json
[ ] Commit version snapshots
```

---

## G. Reference: Score Interpretation Guide

| Weighted Composite | Interpretation |
|--------------------|----------------|
| 4.5 - 5.0 | Exceptional. Ship as hero scene with confidence. |
| 4.0 - 4.4 | Hero quality. Minor imperfections that viewers won't notice. |
| 3.5 - 3.9 | Solid. Shippable with some caveats. |
| 3.0 - 3.4 | Good enough. Meets minimum bar. Consider improvement if pipeline upgrades become available. |
| 2.5 - 2.9 | Below threshold. Not shippable without manual cleanup. |
| 2.0 - 2.4 | Poor. Major issues. Needs different family or significant pipeline improvement. |
| < 2.0 | Broken. Do not use. |
