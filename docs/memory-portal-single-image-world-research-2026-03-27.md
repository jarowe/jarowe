# Memory Portal: Single-Image 3D World Research

Date: 2026-03-27

## Goal

Build a pipeline that takes a single image and produces:

- a real explorable 3D memory world
- strong emotional fidelity in the subject
- living particle behavior that feels like the world is assembling itself

This document captures the best current direction based on:

- our local Memory Portal iterations
- the attached 2026-03-25 screenshots
- current single-image 3D scene and subject reconstruction research

## What Our Own Iterations Already Proved

1. The subject and the world should not be solved by the same visible representation.
   The best subject closeups we produced came from a front-biased, high-detail subject treatment.
   The best world attempts came from environment-first generation.
   When we force one representation to do both, we get sheet artifacts, duplicate bodies, or weak worlds.

2. Wider anchor shots are fundamentally different from tight subject shots.
   `naxos-rock` is world-capable.
   `naxos-laugh` is subject/chapter-capable.
   The pipeline must route them differently.

3. More splats alone do not solve the world problem.
   The hero-quality `naxos-rock` run increased density and improved matter, but it still showed a large front-facing filled sheet.
   The remaining issue is world completion quality and world framing, not only runtime density.

4. The attached earlier screenshots show a real asset we should not lose:
   strong face/detail presence from a front-biased subject pass.
   That branch should be preserved and upgraded, not discarded.

## Research-Backed Conclusions

### 1. World generation must be generative, not only regressive

CompleteSplat says single-image scene completion works better when the model generates a distribution of plausible complete 3D Gaussian scenes instead of regressing one blurry answer.

Implication for us:

- our pipeline should support multiple world hypotheses per anchor image
- we should score/select worlds, not trust the first one

Source:
- https://nianticspatial.github.io/completesplat/

### 2. Wide-scope world generation improves when camera motion is part of the model

Wonderland shows a camera-guided video diffusion stage can produce wide-scope, more coherent 3D scene latents from a single image.

Implication for us:

- a single pano bootstrap is not enough for the best world
- the strongest future path is camera-guided multi-trajectory world completion before splat reconstruction

Source:
- https://snap-research.github.io/wonderland/

### 3. Holistic scene decomposition matters

Diorama is compelling because it decomposes the task into architecture reconstruction, object understanding, shape retrieval, pose estimation, and layout optimization instead of hoping one monolithic step gets the whole scene right.

Implication for us:

- we should add scene typing and structure priors before world generation
- images with strong planes, walls, floors, shoreline anchors, or cave arches should be treated explicitly

Source:
- https://3dlg-hcvc.github.io/diorama/

### 4. Subject fidelity should use a dedicated human reconstruction prior

HumanSplat shows that single-image humans benefit from structure priors and multi-view diffusion dedicated to humans.

Implication for us:

- the subject branch should be its own high-resolution reconstruction path
- the subject should not remain only a masked card or a world-model residue

Source:
- https://humansplat.github.io/

### 5. Real-time world exploration benefits from a geometry-grounded internal representation

Echo frames the right product goal: image in, 3D-consistent world out, real-time exploration, 3DGS only as the render format.

Implication for us:

- we should think in terms of a geometry-grounded world model, not "a pano with splats"
- the renderer should be the last stage, not the whole strategy

Source:
- https://www.spaitial.ai/blog/echo-release

### 6. Splat rendering quality needs anti-aliasing and surface discipline

Mip-Splatting improves 3DGS rendering with smoothing and mip filtering.
SuGaR improves editability and stability by aligning Gaussians to surfaces and extracting a mesh+gaussian hybrid.

Implication for us:

- our current viewer likely exaggerates sheeting and shimmer
- we should adopt anti-aliased splat ideas and optionally surface-aligned hybrid output for stronger worlds

Sources:
- https://github.com/autonomousvision/mip-splatting
- https://github.com/Anttwo/SuGaR

## Recommended Memory Portal Pipeline

## Stage 0: Scene Router

Before generation, classify the input into one of:

- `anchor-world`: enough environment exists to support real world completion
- `chapter-subject`: emotionally strong but too tight for full world completion
- `portrait-memory`: subject-first memory, world is atmospheric support only
- `structured-scene`: strong planar/layout priors should guide generation

Inputs to the router:

- subject crop area
- subject crop height
- estimated visible horizon / vanishing lines
- environment-mask coverage
- visible support anchors like rocks, cave openings, door frames, shoreline, walls

## Stage 1: Environment World Builder

This should become a multi-hypothesis world stage:

1. Build a subject-erased environment plate
2. Generate multiple environment completions
3. Generate world hypotheses from those completions
4. Score them and keep the best one

Recommended hypothesis branches:

- `pano-first`: our current bootstrap + pano-cleanup + world-model route
- `video-latent-first`: camera-guided completion around the scene before reconstruction
- `layout-guided`: use structure priors for caves, rooms, shoreline planes, arches, floors

Important rule:

- the world branch should never be judged by the source-facing screenshot alone
- it must be judged by orbit occupancy, side-angle plausibility, and void ratio

## Stage 2: Subject Builder

This should be independent from world completion.

Recommended subject representation:

- high-resolution crop
- subject mask
- subject depth / normal estimate
- optional single-image human prior for people
- front-detail appearance plate for face fidelity
- thinner 3D support representation for side views

The attached March 25 screenshots are evidence that the front-detail subject branch can already work visually.
That quality should be preserved as the "identity layer."

## Stage 3: Fusion

The world owns:

- space
- surrounding geometry
- atmosphere
- lighting context

The subject owns:

- identity
- face
- pose readability
- emotionally important detail

Fusion rules:

- remove weak subject remnants from the world in the subject occupancy region
- insert the subject with real depth ordering
- relight/tint the subject into the world
- allow front-detail dominance near the valid viewing cone
- allow structural support only off-angle

## Stage 4: Living Particles

Particles should not just float over the scene.
They should appear to build on from the world.

Recommended particle layers:

- `surface dust`: sampled from high-confidence world surfaces
- `subject wake`: activated by hover/focus near the subject
- `thread filaments`: directional navigation cues between memories
- `assembly motes`: particles that condense into surfaces as the world wakes

Implementation direction:

- emit particles from world depth/surface confidence
- increase emission near edges, silhouette boundaries, and narrative anchors
- use focus to increase coherence and attraction toward subject or memory nodes

## Concrete Engineering Priorities

1. Build a world scorer
   Score each generated world on:
   - void ratio
   - front sheet ratio
   - orbit occupancy
   - anchor retention
   - subject duplication leakage

2. Generate multiple world candidates per anchor
   At minimum vary:
   - bootstrap fill method
   - prompt
   - seed
   - camera expansion trajectory

3. Keep subject reconstruction at higher resolution than world reconstruction
   The subject branch must not be capped by the world branch resolution.

4. Add a stricter routing policy
   Never promote a tight crop to a world anchor just because it can technically produce a splat.

5. Improve runtime splat rendering
   Adopt anti-aliasing / filtering ideas from Mip-Splatting and evaluate surface-aligned hybrid options.

6. Build particle emission from world structure
   Move from "overlay dust" to "world matter assembling itself."

## Immediate Next Experiments

### Experiment A: World candidate search on `naxos-rock`

Run 4-8 hero candidates with:

- current LaMa bootstrap
- stronger diffusion/inpainting bootstrap
- short prompt
- alternate short prompt emphasizing coastline continuity
- seed variation

Then score them with a simple occupancy/void heuristic.

### Experiment B: Subject preservation benchmark

Take the strongest March 25 subject-like render behavior and benchmark:

- face readability
- silhouette cleanliness
- off-angle degradation

against the newer world-first branch.

This gives us a real measure of whether we are regressing the emotional core.

### Experiment C: Particle world assembly

Prototype one effect:

- particles densify along confident world surfaces and narrative anchors
- on focus, they converge toward the subject and increase local detail density

## Final Recommendation

The winning Memory Portal system is not:

- one single model
- one single prompt
- one single representation

It is a routed pipeline:

`single image -> scene router -> environment world hypotheses -> best world selection -> dedicated subject reconstruction -> depth-aware fusion -> living particle activation`

That is the path most consistent with:

- our best local results
- the attached screenshots
- the current research frontier

## Sources

- Complete Gaussian Splats from a Single Image with Denoising Diffusion Models: https://nianticspatial.github.io/completesplat/
- HumanSplat: Generalizable Single-Image Human Gaussian Splatting with Structure Priors: https://humansplat.github.io/
- Diorama: Unleashing Zero-shot Single-view 3D Scene Modeling: https://3dlg-hcvc.github.io/diorama/
- Echo: Frontier Model for 3D World Generation: https://www.spaitial.ai/blog/echo-release
- Wonderland: Navigating 3D Scenes from a Single Image: https://snap-research.github.io/wonderland/
- Mip-Splatting: Alias-free 3D Gaussian Splatting: https://github.com/autonomousvision/mip-splatting
- SuGaR: Surface-Aligned Gaussian Splatting for Efficient 3D Mesh Reconstruction and High-Quality Mesh Rendering: https://github.com/Anttwo/SuGaR
