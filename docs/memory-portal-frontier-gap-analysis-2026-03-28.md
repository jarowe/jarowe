# Memory Portal Frontier Gap Analysis

Date: 2026-03-28

## Goal

Compare the current Memory Portal pipeline against the strongest available techniques for:

- single-image 3D world generation
- subject reconstruction and fidelity
- splat/world cleanup and runtime delivery
- evaluation and grading

The point is not to chase every paper. The point is to identify the smallest set of upgrades that materially raises our ceiling.

## Current Memory Portal Baseline

What we already have in the repo:

- `pipeline/generate-memory-world.mjs`
  - single-image world generation via our WorldGen/world-model path
  - subject-erased bootstrap support
  - environment mask support
  - multi-candidate generation and simple world scoring
  - hero/ultra profiles
- `pipeline/generate-subject-3d.mjs`
  - tracked subject-generation pipeline
  - `sam3d-body` backend integrated
  - subject version history
- `src/pages/labs/MemoryWorldLab.jsx`
  - candidate review cockpit
  - world review history
  - subject-version review visibility
- compressed runtime delivery
  - `.ksplat` runtime assets

This is already more disciplined than a typical one-shot image-to-3D demo. The main remaining issue is ceiling, not basic plumbing.

## Frontier Snapshot

### 1. Generative scene completion is beating single-answer regression

CompleteSplat is important because it explicitly frames single-image 3D completion as a generative problem instead of a single deterministic regression. It claims sharper results and diverse completion modes from one image, including occluded parts and out-of-frustum content.

Implication:

- we should keep multiple world hypotheses per anchor scene
- one generated world should never be trusted as "the answer"

Source:

- https://nianticspatial.github.io/completesplat/

### 2. Pano-first is real, but camera-guided latent expansion is the next step up

WorldGen confirms the same basic architecture we have already been converging toward:

- generate a 360 panorama
- convert pano into 3DGS or mesh
- allow 360 exploration

That validates our direction.

But Wonderland and Matrix-3D show the stronger frontier: use camera-guided video diffusion or panoramic video generation to create multi-view-consistent latent content before reconstruction. That is a more powerful prior than a single pano outpaint.

Implication:

- our current pano-first world branch is valid, but not the end state
- the next meaningful world-quality upgrade is a second branch that generates trajectory-consistent views before reconstruction

Sources:

- https://worldgen.github.io/
- https://snap-research.github.io/wonderland/
- https://matrix-3d.github.io/
- https://stability.ai/news/introducing-stable-virtual-camera-multi-view-video-generation-with-3d-camera-control

### 3. Structured scenes benefit from decomposition, not brute-force hallucination

Diorama shows a modular single-view scene pipeline with architecture reconstruction, object recognition/localization, shape retrieval, pose estimation, and scene layout optimization. This is especially relevant for rooms, shorelines, caves, arches, bellframes, and other scenes with strong structure.

Implication:

- for scenes like `syros-cave`, a single monolithic world model is not enough
- we should add anchor-aware decomposition for key structures instead of only masking and hoping the generator resolves them

Source:

- https://3dlg-hcvc.github.io/diorama/

### 4. Subjects should have their own reconstruction path

SAM 3D Body is now directly relevant to us. Meta describes it as a promptable model for single-image full-body human mesh recovery with auxiliary prompts including masks and keypoints. That matches our current subject pipeline exactly.

HumanSplat is the complementary signal: humans benefit from a dedicated human reconstruction model with multi-view diffusion and human structure priors for better novel-view fidelity.

Implication:

- `sam3d-body` should become the default human body prior for our subject branch
- the visible subject should still keep a front-detail identity layer
- later, if we want even stronger human appearance fidelity, HumanSplat-style appearance priors are the next frontier

Sources:

- https://github.com/facebookresearch/sam-3d-body
- https://humansplat.github.io/

### 5. Key objects may deserve their own 3D priors too

SAM 3D Objects reconstructs full 3D geometry, texture, and layout from a single image and explicitly supports masked object-to-3D conversion in cluttered real-world scenes. The repo also documents how to align SAM 3D Objects with SAM 3D Body in the same frame of reference.

TRELLIS.2 is also relevant as a strong high-fidelity image-to-3D asset model with compact structured latents and PBR output.

Implication:

- for scenes where an object anchor matters emotionally or structurally, we should not treat everything as "background world" plus "human"
- `syros-cave` is the clearest example: the bell and bellframe are likely object-branch candidates
- `naxos-rock` could eventually benefit from a dedicated rock anchor prior

Sources:

- https://github.com/facebookresearch/sam-3d-objects
- https://github.com/microsoft/TRELLIS.2

### 6. Panorama-specific reconstruction is a real category

PanSplat is not a one-image world generator by itself, but it is useful because it shows there is now strong work specifically targeting high-resolution panorama-based Gaussian reconstruction.

Implication:

- if our world branch continues to rely on panoramas, pano-specific reconstruction is worth evaluating instead of assuming generic pano-to-scene conversion is good enough

Source:

- https://chengzhag.github.io/publication/pansplat/

### 7. Splat quality still depends on filtering and surface discipline

Mip-Splatting focuses on alias-free Gaussian splatting, and SuGaR aligns gaussians to surfaces and supports mesh extraction plus high-quality mesh rendering.

Implication:

- some of our "sheet" and shimmer reads may be generation problems
- but some are also renderer/representation problems
- we should test both asset-side cleanup and render-side anti-aliasing / surface-aligned representations

Sources:

- https://github.com/autonomousvision/mip-splatting
- https://github.com/Anttwo/SuGaR

### 8. Evaluation has moved beyond single screenshot quality

WorldScore is important because it evaluates controllability, quality, dynamics, camera control, and 3D consistency across camera paths, instead of rating a model from one frame.

Implication:

- our grading should keep human review in the loop
- but our machine scoring must evolve toward trajectory-aware evaluation
- world quality must be judged by path behavior, not just start view fidelity

Source:

- https://haoyi-duan.github.io/WorldScore/

### 9. Meta's own "recipe" reinforces a staged pipeline

Meta Reality Labs' "A Recipe for Generating 3D Worlds From a Single Image" is useful because it openly describes a single-image pipeline that generates a 360-degree world parameterized by Gaussian splats and meant to be explored within a bounded volume.

Implication:

- our staged pipeline is directionally correct
- the opportunity is not to abandon the current architecture
- the opportunity is to make each stage better and more explicitly routed

Source:

- https://katjaschwarz.github.io/worlds/

## What This Means For Memory Portal

The best possible Memory Portal is not one model.

It is a routed system:

1. Scene router
   - classify image as anchor-world, chapter-subject, portrait-memory, or structured-scene
2. World hypotheses
   - generate multiple environment-first worlds
3. Subject hypotheses
   - generate dedicated human and optional object priors
4. Score and select
   - choose the strongest world and strongest subject independently
5. Fuse
   - insert high-fidelity subjects and key objects into the chosen world
6. Activate
   - add particles, thread cues, focus reveals, and guided exploration

This keeps the emotional face/detail wins we had earlier while still pushing toward broader, more coherent worlds.

## Gaps Between Us and the Frontier

### Gap 1: We still only have one serious world family

We already generate multiple candidates, but they mostly live inside the same pano-first family.

What is missing:

- a second world branch based on camera-guided multi-view generation
- a structured-scene branch for layouts and anchors

### Gap 2: The subject branch has a strong body prior now, but not yet a full appearance prior

We have `sam3d-body` integrated. That is a major upgrade.

What is missing:

- a subject appearance model that helps preserve face/clothing detail across nearby view changes
- explicit grading of subject identity preservation separate from world grade

### Gap 3: We do not yet reconstruct key non-human anchors explicitly

For certain scenes, the most important thing is not just the human. It is the human plus one specific object or structure.

What is missing:

- object branch for bell/bellframe/rock and similar anchors
- object-aligned fusion rules

### Gap 4: Our scoring is still too local

The current world scoring in `generate-memory-world.mjs` is a strong start, but it is still a local heuristic.

What is missing:

- path-aware metrics
- side-angle occupancy metrics that better predict "real world" feel
- subject leakage and front-sheet penalties tied to exploration trajectories

### Gap 5: We still render mostly as raw splats plus overlays

That keeps us fast and flexible.

What is missing:

- alias-aware splat rendering improvements
- optional mesh-or-surface guidance where raw splats are too unstable

### Gap 6: Particles are still mostly presentation, not world matter

The final experience should feel like the world is assembling itself.

What is missing:

- particle emission tied to confident surfaces, subject edges, and narrative anchors
- world-structure-aware particle behavior instead of generic overlay dust

## What We Can Use Now

These are the smartest immediate bets:

1. Keep using our WorldGen/world-model branch for anchor world generation.
2. Keep generating and grading multiple candidates per anchor scene.
3. Start treating `sam3d-body` as the default human body generator.
4. Add subject grading criteria as first-class review data.
5. Add trajectory-aware world scoring inspired by WorldScore.
6. Evaluate one object branch for a structurally important scene.

## What Is Worth Building Next

### Priority A: Second world hypothesis branch

Build a second world family based on camera-guided multi-view generation before reconstruction.

Best candidate:

- Stable Virtual Camera as a controllable multi-view generator feeding reconstruction

Why:

- it is available for research use
- it is trajectory-aware
- it can provide a wider and more consistent basis than single pano outpaint alone

### Priority B: Object anchor branch

For scenes with key anchors:

- run SAM 3D Objects or TRELLIS.2 for the anchor
- use that geometry to preserve the scene's emotional structure

Best first test:

- `syros-cave` bell + bellframe

### Priority C: WorldScore-inspired grading

Extend our scorer so a candidate is judged on:

- start-view fidelity
- side-angle occupancy
- path consistency
- subject leakage
- front-sheet ratio
- void ratio

### Priority D: Better surface discipline at runtime

Evaluate:

- alias-aware splat filtering
- surface-aligned cleanup
- optional hybrid mesh+splat views for the worst failure cases

## What Is Frontier But Not The Smartest Immediate Bet

These are interesting, but they should not block our next sprint:

- rebuilding the whole pipeline around Wonderland or Matrix-3D directly
- waiting for one end-to-end miracle model
- replacing our world branch entirely before scoring and routing are mature

Those are frontier-level systems. The smarter immediate move is to use them as design direction, not as a destabilizing rewrite.

## Recommended Next Experiments

### Experiment 1: World family comparison

For `naxos-rock`:

- current pano-first world branch
- one new camera-guided multi-view branch

Grade both in the lab using the same criteria and route buttons.

### Experiment 2: Subject benchmark

For `naxos-rock` and `naxos-laugh`:

- existing proxy subject
- `sam3d-body-v1`

Judge:

- silhouette correctness
- pose grounding
- face readability
- side-angle stability

### Experiment 3: Anchor object benchmark

For `syros-cave`:

- environment-only world branch
- environment + explicit bell/bellframe object branch

Judge:

- anchor retention
- world coherence
- emotional readability

### Experiment 4: Path-aware scoring

Take the best current candidate and score it on:

- front view
- left orbit
- right orbit
- pull-in
- pull-out

The winner should not only be "best first frame." It should survive exploration.

## Bottom Line

The current Memory Portal architecture is not wrong.

It is incomplete in exactly the places the frontier now makes obvious:

- we need more than one world family
- we need separate human and object priors
- we need exploration-aware grading
- we need particles and rendering tied more tightly to world structure

The best next step is not to throw everything away.

The best next step is to add:

1. a second world hypothesis branch
2. `sam3d-body` as the human default
3. one explicit object-anchor branch
4. path-aware grading

That is the shortest path from "promising memory scene" to "holodeck-like memory world."
