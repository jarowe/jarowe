# Phase 14: Particle Field Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 14-particle-field-core
**Areas discussed:** Particle sampling, Wire connection style, Breathing & bloom character, Tier adaptation specifics

---

## Particle Sampling

### Q1: How should particles be sampled from the photo + depth map?

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform grid | Even UV grid, predictable, every pixel sampled equally | |
| Edge-weighted importance | Dense at depth edges, sparse in flat regions. Sobel on depth. | |
| Hybrid: grid + edge boost | Base ~80K grid + ~40-70K bonus at depth edges. Best of both. | ✓ |

**User's choice:** Hybrid: grid + edge boost
**Notes:** Gives stable silhouette read of grid plus "memory crystallizing" intensity where detail matters. For syros-cave, bell/frame/figure/cave contours get density instead of wasting budget on open water.

### Q2: Should particle sampling happen CPU-side at init or GPU-side in the vertex shader?

| Option | Description | Selected |
|--------|-------------|----------|
| CPU at init | JS reads photo+depth into ImageData, computes Float32Arrays, writes to BufferGeometry | ✓ |
| GPU vertex shader | Pass textures, sample in vertex shader using UV-derived coords | |

**User's choice:** CPU at init
**Notes:** Deterministic positions needed for wire connection precompute, dual scattered/formed buffers, tier-specific particle budgets, and debugging. GPU sampling solves the wrong problem first and makes Phase 16 harder.

### Q3: How should particle colors be derived from the photo?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct pixel color | Exact RGB from photo pixel. Photo identity preserved. | ✓ |
| Palette-quantized | 16-32 color palette, snap to nearest. Stylized/dreamy. | |
| Luminance-shifted | Photo color base shifted toward mood tint by depth. | |

**User's choice:** Direct pixel color
**Notes:** Field must read as *that exact memory*. Luminance lift, glow shaping, and optional mood tint applied in shader as secondary pass. Pre-shifting colors risks generic VFX palette. Photo identity survives first, dream treatment sits on top.

### Q4: What shape should individual particles render as?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft circles | gl_PointSize with smoothstep radial falloff. Classic luminous points. | ✓ |
| Textured sprites | Small texture atlas with 2-3 shapes. More variety. | |
| You decide | Claude picks. | |

**User's choice:** Soft circles
**Notes:** Cheapest at flagship counts, blooms cleanly, reads as light not UI confetti. Wire structure and camera movement carry the style variety.

---

## Wire Connection Style

### Q1: What should determine which particles get connected by wires?

| Option | Description | Selected |
|--------|-------------|----------|
| Depth-edge proximity | Connect at depth discontinuities + distance threshold | |
| KNN proximity (all) | K nearest 3D neighbors everywhere. Organic web. | |
| Hybrid: edge + sparse field | Dense at edges + sparse long-range ambient web | ✓ |

**User's choice:** Hybrid: edge wires + sparse field
**Notes:** Edge wires give structure/recognizability, sparse ambient links keep volume alive without disconnected islands. Result reads as "formed from intelligence/light." Key: restraint on sparse field — it should whisper, not web the whole frame shut.

### Q2: How should wire connections look visually?

| Option | Description | Selected |
|--------|-------------|----------|
| Thin luminous lines | THREE.LineSegments, emissive color, alpha fading with distance | ✓ |
| Gradient opacity tubes | Thicker lines/mesh tubes, volumetric feel, expensive | |
| You decide | Claude picks. | |

**User's choice:** Thin luminous lines
**Notes:** Wires should read as filaments of intelligence, not solid geometry competing with points. Thin emissive segments with distance fade give holographic structure without burning budget on connection meshes.

### Q3: Should wire connections be static or dynamic?

| Option | Description | Selected |
|--------|-------------|----------|
| Static topology, dynamic alpha | Compute once at init, positions follow breathing, alpha pulses | ✓ |
| Fully dynamic | Recompute connections per-frame. Expensive, potentially distracting. | |
| You decide | Claude picks. | |

**User's choice:** Static topology, dynamic alpha
**Notes:** Structure feels alive because points move and filaments breathe. Memory holds together as coherent form. Avoids per-frame spatial search. Memory should shimmer, not rewire itself every frame.

---

## Breathing & Bloom Character

### Q1: How should the breathing animation work across the particle field?

| Option | Description | Selected |
|--------|-------------|----------|
| Desynchronized waves | Per-particle random phase offset. Rolling undulation. | |
| Depth-correlated waves | Phase correlates with depth. Foreground breathes first. | ✓ |
| Synchronized pulse | All particles breathe together. Unified heartbeat. | |

**User's choice:** Depth-correlated waves
**Notes:** Purely desynchronized feels generically alive but not intentional. Depth-correlated gives spatial meaning — foreground breathes first, pulse travels through volume, scene forms toward viewer. Small random jitter on top for organic feel, but base behavior is depth-correlated.

### Q2: How should bloom/glow be implemented?

| Option | Description | Selected |
|--------|-------------|----------|
| Postprocessing bloom | UnrealBloom / @react-three/postprocessing. Full tier only. | |
| Shader-based per-particle glow | Extended soft-circle halo. All tiers. Cheaper. | |
| Both layered | Shader halo (all tiers) + postprocessing bloom (full tier) | ✓ |

**User's choice:** Both layered
**Notes:** Shader halo gives every tier baseline luminous quality. Postprocessing bloom gives full tier premium bleed and dream glow. One system alone forces a compromise. Layered is the right visual architecture.

### Q3: Should particle size vary, and what drives it?

| Option | Description | Selected |
|--------|-------------|----------|
| Depth + luminance driven | Closer/brighter particles larger. Natural perspective + attention. | ✓ |
| Uniform size | All same base size. Clean, minimal. | |
| Edge-boost particles larger | Edge-boost particles categorically larger. Two tiers. | |

**User's choice:** Depth + luminance driven
**Notes:** Right kind of hierarchy — closer particles have more presence, bright memory anchors catch the eye. Making edge-boost particles categorically larger would advertise the sampling strategy. Size variation should feel like optics and energy, not metadata.

---

## Tier Adaptation Specifics

### Q1: What should simplified tier cut to maintain 60fps?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop wire connections | Remove LineSegments. Wires are premium detail. | ✓ |
| Drop postprocessing bloom | Skip bloom effect. Keep shader halo only. | ✓ |
| Reduce edge-boost particles | Grid only (~50-60K), skip edge-boost pass. | ✓ |
| Lower DPR to 1.0 | Halves fragment shader workload. | ✓ |

**User's choice:** All four
**Notes:** Don't preserve every premium feature badly. Preserve the memory read cleanly and cut the expensive structure. Core experience intact: recognizable particle memory + motion + shader halo + flight behavior. Premium desktop path keeps full web/glow/detail stack.

### Q2: Should parallax fallback reuse existing CSS or get a particle-themed variant?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing parallax | Same ParallaxFallback from Phase 10. No new code. | |
| Static particle overlay | Existing parallax + CSS-animated sparse particle dots | ✓ |
| You decide | Claude picks. | |

**User's choice:** Static particle overlay
**Notes:** Reuse parallax base, add sparse particle layer. No new heavy renderer, fallback still feels like same milestone. Hints at particle-memory identity without WebGL. Restrained — a few drifting luminous dots, not faux-premium clutter.

---

## Claude's Discretion

- Exact Sobel gradient threshold for edge detection
- Spatial hash grid cell size and KNN distance thresholds
- Breathing wave speed, amplitude, and jitter magnitude
- Bloom luminance threshold and intensity values
- Particle base size and size variation multipliers
- Wire alpha fade curve and pulse parameters
- Connection count split between edge-dense and sparse-ambient
- CSS particle overlay count and animation for parallax fallback
- Internal component decomposition
- Scattered buffer distribution strategy

## Deferred Ideas

- Scroll-driven camera flight — Phase 15
- Dream portal dissolve/reform — Phase 16
- Progress-reactive audio — Phase 17
- Audio-reactive particle displacement — future milestone
- GPU compute particles — future milestone
