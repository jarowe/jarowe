# Single-Image to Explorable 3D World: State of the Art (March 2026)

**Goal:** Turn a single personal photograph into a high-fidelity explorable 3D world. Beat Marble (World Labs) quality using open/accessible tools.

---

## 1. Marble / World Labs — The Quality Benchmark

### What It Does
Marble is World Labs' commercial product (marble.world). From your screenshots, the pipeline is clearly visible:

1. **Image Input** -- Upload a single photograph
2. **Panorama Generation** -- FLUX-based diffusion model generates a 360-degree equirectangular panorama from the input image (takes ~30s). The input image is projected onto the panorama and the rest is inpainted/hallucinated.
3. **Draft** -- Intermediate 3D scaffold (likely depth estimation + point cloud)
4. **World** -- Final Gaussian splat scene, explorable in real-time in the browser

### Pipeline (Reverse-Engineered)
Based on the UI stages visible in your screenshots ("Image input" -> "Pano (generated)" -> "Draft" -> "World"), Marble almost certainly does:

1. **Monocular depth estimation** on the input image (likely their own model, possibly derived from Depth Pro or UniK3D)
2. **Panorama outpainting** -- Project the input image + depth into equirectangular space, then use a fine-tuned FLUX model to fill the remaining ~85% of the 360-degree view
3. **Panoramic depth estimation** -- Run spherical depth estimation on the full panorama
4. **RGBD-to-Gaussian conversion** -- Convert the panoramic RGBD into 3D Gaussians, likely using their own Spark.js framework internally
5. **Optional: Multi-view refinement** -- Generate additional perspective views from the panorama, run SHARP-like feedforward Gaussian prediction per view, merge with consensus

This is essentially the **exact same pipeline as WorldGen** (which you already have cloned). WorldGen was likely inspired by or independently arrived at the same architecture.

### Quality Assessment
From your Bell Cave screenshots:
- **Panorama generation quality: 8/10** -- The generated panorama looks photorealistic. The cave, ocean, rocks, and sky are well-hallucinated.
- **3D world quality: 7/10** -- When viewed as a 3D world, there are visible artifacts at seams, some geometric distortion at depth discontinuities, and the ground plane can look warped.
- **The panorama editing step** is key -- Marble lets you edit the panorama before creating the world. This human-in-the-loop step dramatically improves quality.

### Limitations
- **No true 3D geometry** -- It's a depth-painted panoramic bubble. You can look around from the center but significant camera translation reveals stretching/artifacts.
- **Foreground subjects get destroyed** -- Your Jace-on-rock screenshots show the subject's body becoming distorted in the 3D projection. People/subjects are NOT handled well.
- **Single-viewpoint assumption** -- The world is best experienced from near the original camera position. Move too far and it falls apart.
- **Closed-source** -- No PLY export (though you got one somehow -- likely through their Studio mode). No API. $20/month for premium.

### Cost
Free tier available, Premium at ~$20/month. Export via "Open in Studio" for PLY/SPZ files.

---

## 2. Apple SHARP (ml-sharp) — What You Already Have

### What It Does
Single feedforward pass through a neural network: image -> 3D Gaussian Splat in <1 second. No diffusion, no iterative optimization. Pure regression.

### Key Specs
- **Input:** Single photograph (any aspect ratio, resized to 1536x1536 internally)
- **Output:** 3D Gaussian Splat (.ply format, OpenCV convention)
- **Speed:** <1 second on a standard GPU
- **Quality metrics:** 25-34% better LPIPS, 21-43% better DISTS vs prior art (as of Dec 2024)
- **Metric scale:** Outputs absolute scale, supporting metric camera movements

### Strengths
- Blazingly fast (1000x faster than diffusion-based methods)
- Clean, well-maintained codebase (Apple quality)
- Works on CPU, CUDA, and MPS
- Zero-shot generalization across datasets
- The **best single-view Gaussian predictor** available today

### Limitations
- **Only predicts what's visible** -- No hallucination of unseen areas. The splat covers the input view frustum only (~90-110 degree FOV).
- **No 360 coverage** -- You see the scene from one angle. Moving the camera reveals empty space.
- **Struggles with people/thin structures** -- Hair, fingers, fabric edges can appear blobby.
- **Depth ambiguity at distance** -- Far-away elements can have incorrect relative depth.
- **Not a "world"** -- It's a 3D-ified single photo, not an explorable environment.

### How WorldGen Already Uses It
WorldGen's `pano_sharp.py` extends SHARP for 360-degree scenes by:
1. Extracting 8 overlapping perspective views from the equirectangular panorama (6 horizontal + 2 polar)
2. Running SHARP on each view independently
3. Rotating each view's Gaussians into world space
4. Merging with voxel-based consensus (removes duplicates at seam overlaps)

This is a clever approach but creates **visible seams** between views because each SHARP inference is independent -- there's no cross-view consistency.

---

## 3. Microsoft TRELLIS / TRELLIS.2

### What It Does
TRELLIS is an object-level 3D generation model. It takes a single image (or text prompt) and generates a 3D object as:
- 3D Gaussians
- Radiance fields
- **Meshes with PBR textures** (its killer feature)

### TRELLIS 2 (January 2026)
- Higher resolution, better texture quality
- Support for multi-view conditioning
- Better handling of complex geometry

### Strengths
- Best-in-class **object** generation (chairs, animals, products, characters)
- Outputs proper meshes with UV maps -- not just splats
- PBR material support (roughness, metallic, normal maps)
- Runs on Hugging Face Spaces (free inference)

### Limitations (Critical for Our Use Case)
- **Object-centric ONLY** -- It generates a single isolated object, not a scene/environment
- **No background/environment** -- The object floats in void
- **Not designed for scenes** -- Indoor rooms, landscapes, caves, beaches -- TRELLIS cannot do any of these
- **Cannot handle photos with context** -- A photo of a person in a cave would at best extract the person, losing the cave entirely

### Verdict for Memory Worlds
**NOT SUITABLE** for our use case. TRELLIS is for product shots and character models, not for turning vacation photos into explorable worlds. It could potentially generate foreground subjects (e.g., extract Jace from a photo and generate a 3D model of him) but that is a different problem.

---

## 4. Novel View Synthesis from Single Image

This is the **key insight** area. If we can generate N consistent views from 1 photo, we can do multi-view reconstruction which is categorically better than single-view inference.

### 4a. Zero123++ / Stable Zero123
- **What:** Generates 6 views of an object from a single image at fixed azimuths (30, 90, 150, 210, 270, 330 degrees)
- **Paper:** Zero123++: a Single Image to Consistent Multi-view Diffusion Base Model
- **Repo:** github.com/SUDO-AI-3D/zero123plus
- **Quality:** Good for objects, poor for scenes
- **Limitation:** Object-centric. Assumes the subject can be orbited. Useless for landscapes/rooms.

### 4b. SV3D (Stability AI)
- **What:** Single image to orbital video generation (21 frames around an object)
- **Paper:** SV3D: Novel Multi-view Synthesis and 3D Generation from a Single Image
- **Quality:** Better multi-view consistency than Zero123++
- **Limitation:** Still object-centric. Generates orbit around a central subject.

### 4c. ViewCrafter
- **What:** Generates arbitrary novel views from a single image by leveraging video diffusion models
- **Repo:** github.com/Drexubery/ViewCrafter
- **Key insight:** Uses a video generation model (Stable Video Diffusion) but conditions it on explicit 3D camera trajectories. You specify "fly camera from A to B" and it generates the video.
- **Quality:** Significantly better than Zero123++ for scenes (not just objects)
- **Strength:** Handles scenes, not just objects. Can generate forward motion, lateral pan, etc.
- **Limitation:** Multi-view consistency degrades over longer camera paths. Best for small camera movements (~30-degree arc).

### 4d. Video Generation as View Synthesis
**This is the most promising emerging approach.** The idea: use a video generation model (Kling 2, Runway Gen-3, Sora, Stable Video Diffusion) to generate a slow camera orbit, then reconstruct 3D from the generated video frames.

**Pipeline:**
1. Single image -> video generation model with camera motion prompt
2. Extract frames at regular intervals
3. Run COLMAP or DUSt3R on the extracted frames
4. Reconstruct Gaussian splat from the multi-view frames

**Current state:**
- Kling 2 and Runway Gen-3 produce the highest quality camera-controlled videos as of March 2026
- The multi-view consistency of these videos is still imperfect, causing reconstruction artifacts
- Works best for slow, smooth camera movements (orbital, dolly, lateral)
- **Cost:** $20-50/month for API access to commercial video models

**Verdict:** Promising but unreliable. The generated video frames are not geometrically consistent enough for clean reconstruction. Works 40-60% of the time depending on the scene.

### 4e. CAT3D (Concurrent Approaches for 3D)
- **What:** Google Research model that generates multi-view consistent images from a single photo
- **Paper:** CAT3D: Create Anything in 3D with Multi-View Diffusion Models
- **Status:** Not open-source as of March 2026
- **Quality:** Reportedly very high, but only demonstrated on object-level generation

---

## 5. Scene-Level Reconstruction (Multi-View to 3D)

These are the tools for converting multiple views (however obtained) into 3D.

### 5a. 3D Gaussian Splatting (3DGS)
- **Repo:** github.com/graphdeco-inria/gaussian-splatting (original)
- **Alternative:** gsplat (github.com/nerfstudio-project/gsplat) -- faster, cleaner implementation
- **What:** Given ~50-200 calibrated images with known camera poses (from COLMAP), trains a Gaussian splat representation
- **Quality:** State of the art for real-world reconstruction from multi-view photos
- **Speed:** 5-30 minutes training depending on scene complexity
- **Requirement:** NEEDS MULTIPLE REAL PHOTOS with sufficient baseline. Cannot work from a single image alone.

### 5b. DUSt3R / MASt3R
- **Repo:** github.com/naver/dust3r (DUSt3R), github.com/naver/mast3r (MASt3R)
- **What:** Dense stereo from uncalibrated image pairs. No COLMAP needed. Feed it 2+ images and it outputs dense 3D point clouds with camera poses.
- **MASt3R improvement:** Adds local feature matching for better accuracy
- **Key advantage:** Works with as few as 2 images. No camera calibration required.
- **Quality:** Excellent for 2-10 view reconstruction. Used in VistaDream (which you already have).
- **Limitation:** Quality degrades with very wide baselines or hallucinated views.

### 5c. Nerfstudio / Instant-NGP / Nerfacto
- **What:** Neural Radiance Field frameworks. Given calibrated multi-view images, train a volumetric scene representation.
- **Status:** Largely superseded by Gaussian Splatting (faster, better real-time rendering, easier to deploy in browsers via Spark.js/three.js).
- **Verdict:** Skip NeRFs. Use Gaussian Splatting for everything.

### 5d. COLMAP
- **What:** Structure from Motion + Multi-View Stereo. The classic pipeline for extracting 3D from multiple photos.
- **Role:** Provides camera poses for 3DGS training. Still the gold standard for camera calibration.
- **Limitation:** Needs real photos with real parallax. Generated views often fool COLMAP because the "parallax" isn't geometrically consistent.

---

## 6. Scene Completion / Hallucination

The core challenge: how to fill in the 85% of the 3D environment that isn't visible in the original photo.

### 6a. Panorama Generation from Single Image
**This is what Marble/WorldGen do, and it's the current best approach.**

**Tools:**
- **FLUX.1-dev** + fine-tuned LoRA (what WorldGen uses) -- generates equirectangular panoramas from images/text
- **StableDiffusion XL** + equirectangular fine-tunes -- lower quality but faster
- **Panfusion** (github.com/chengzhag/PanFusion) -- dedicated panorama generation
- **MVDiffusion** -- multi-view consistent panorama generation

**Quality ranking for panorama generation:**
1. **FLUX.1-dev + WorldGen LoRA** -- Best quality, 10GB+ VRAM, ~30s
2. **Marble (proprietary)** -- Comparable, possibly identical approach
3. **PanFusion** -- Good but less photorealistic
4. **MVDiffusion** -- Older, lower quality

### 6b. VistaDream (Training-Free)
You already have this cloned. Its approach:
1. Estimate depth on input image
2. "Zoom out" slightly via depth-based outpainting to create initial scaffold
3. Iteratively generate new views via diffusion inpainting to fill holes
4. Apply Multi-view Consistency Sampling (MCS) to enforce cross-view consistency
5. Output Gaussian field

**Strengths:** Training-free. Uses off-the-shelf models. Good multi-view consistency.
**Weaknesses:** Slow (minutes per scene). Quality highly dependent on component models. Complex pipeline with many failure modes.

### 6c. SceneScape / Text2Room / LucidDreamer
These are iterative "explore and generate" approaches:

**SceneScape:**
- Generate initial view -> estimate depth -> project to mesh -> render new view from projected mesh -> inpaint holes -> repeat
- Creates room-scale environments but with significant texture/geometric drift over iterations

**Text2Room:**
- Similar iterative approach but text-guided
- Creates complete rooms from text descriptions
- Quality ceiling: good enough for VR walkthroughs but not photorealistic

**LucidDreamer:**
- Uses large diffusion models for high-quality inpainting
- Better texture quality than SceneScape/Text2Room
- Still suffers from geometric inconsistency across iterations

**Verdict:** These iterative approaches produce larger environments but lower per-pixel quality than the panorama-first approach. They're better for virtual environments than for preserving the quality of a real photograph.

### 6d. 3D Inpainting (Emerging)
- **SPIn-NeRF** -- Inpaints NeRF scenes in 3D space
- **Gaussian Grouping + Inpainting** -- Remove/add objects in Gaussian splats
- **Still immature** for full scene completion. Better for editing existing 3D scenes.

---

## 7. Hybrid Approaches (The Promising Frontier)

### 7a. WorldGen Pipeline (Best Open Source Today)
**You already have this.** The pipeline:
1. Input image -> UniK3D depth estimation -> perspective-to-equirectangular projection
2. FLUX.1-dev + img2scene LoRA -> fill the remaining panorama with a conditioned inpainting model
3. UniK3D panoramic depth estimation on the full 360 panorama
4. RGBD-to-Gaussian conversion (direct projection, no optimization)
5. Optional: SHARP multi-view refinement (run SHARP on 8 extracted perspective views, merge with consensus)

**This is essentially Marble's pipeline, open source.**

### 7b. Enhanced WorldGen Pipeline (Proposed)
Where WorldGen falls short vs. Marble, and how to fix it:

**Problem 1: Foreground subject handling**
- WorldGen projects the input image into equirectangular space, then the subject gets distorted by the equirectangular mapping and further mangled by depth estimation errors
- **Fix:** Segment the foreground subject (SAM2), generate the panoramic background separately, then composite the subject back in at its original position before final 3D conversion

**Problem 2: Depth quality on generated panorama regions**
- UniK3D is good but not perfect on AI-generated content (it was trained on real photos)
- **Fix:** Use depth estimation ensembling -- run both UniK3D and Depth Anything V2, blend their outputs. Or use Metric3D V2 which handles panoramic depth better.

**Problem 3: Seam artifacts in SHARP multi-view merge**
- Each SHARP view is independently inferred, causing discontinuities at view boundaries
- **Fix:** The consensus merge helps but isn't enough. A post-processing Gaussian optimization step (even 30 seconds of 3DGS-style optimization) would dramatically reduce seam artifacts.

### 7c. Video Orbit -> Splat Reconstruction
1. Input image -> Kling 2 API with camera orbit prompt
2. Extract 30-60 frames
3. Run gsplat/3DGS reconstruction
4. Export PLY

**Status:** Theoretically appealing but practically unreliable. Video generation models don't produce geometrically consistent parallax. The reconstructed splats have floating artifacts and inconsistent geometry. Expect this to improve dramatically by end of 2026 as video models get better at 3D consistency.

### 7d. Panorama -> Multi-View Extraction -> Splat Optimization
1. Input image -> panorama generation (WorldGen/FLUX)
2. Extract 20-30 perspective views from the panorama at known camera poses
3. Run 3DGS/gsplat optimization on these views
4. Output optimized splat

**This is potentially better than direct RGBD-to-Gaussian because:**
- The optimization step fills in depth errors
- View-consistent rendering is enforced by the training process
- The panorama provides the appearance, the optimization provides the geometry

**Drawback:** Adds 2-5 minutes of GPU time for the optimization step.

---

## 8. Honest Quality Assessment: What's Actually Achievable Today

### Quality Tiers (March 2026)

| Tier | Method | Quality | Time | GPU Required |
|------|--------|---------|------|-------------|
| **S** | Multi-view capture (real photos) + 3DGS | 9.5/10 | 30min | Yes (training) |
| **A** | Marble (commercial) | 7.5/10 | ~60s | No (cloud) |
| **A-** | WorldGen + SHARP | 7/10 | ~90s | Yes (24GB recommended) |
| **B+** | WorldGen (depth-only, no SHARP) | 6.5/10 | ~60s | Yes (10GB minimum) |
| **B** | VistaDream | 6/10 | ~5min | Yes (24GB) |
| **B-** | SHARP alone (no panorama) | 5.5/10 | <1s | Yes (8GB) |
| **C** | Video orbit -> reconstruction | 4-7/10 (inconsistent) | ~10min | Yes + API cost |

### What "Quality" Means for Personal Memories

For your use case (personal memory photos from vacations/family), the critical quality factors are:

1. **Preserving the original photo's appearance** -- The input region must look exactly like the photo. Any blurriness or color shift is unacceptable.
2. **Plausible extension** -- The hallucinated 360-degree environment doesn't need to match reality, but it needs to feel right.
3. **Foreground subject integrity** -- If there's a person in the photo, they must look recognizable, not like a wax figure.
4. **Exploration radius** -- How far can you move the camera before artifacts appear? For memories, you want to look around from roughly the original viewpoint, not fly through the scene.
5. **File size / web delivery** -- Must work in a browser via Spark.js. Target <10MB per scene.

### Honest Limitations Everyone Shares

No current method (including Marble) solves these fundamental problems:
- **Back-of-head problem** -- If the photo shows someone from behind, no method can hallucinate their face correctly
- **Physics coherence** -- Generated extensions sometimes violate physics (floating objects, impossible shadows)
- **Scale ambiguity** -- Without reference objects, depth scale can be wrong (a cave that looks 2 meters deep might be rendered as 20 meters)
- **Temporal consistency** -- If you generate worlds from two photos taken seconds apart at the same location, the hallucinated backgrounds will differ completely

---

## 9. Recommended Pipeline for Memory Worlds

### The Recommended Architecture: "WorldGen Enhanced"

This pipeline replicates Marble-level quality using open tools you already have or can set up:

```
Phase 1: Panorama Generation (GPU, ~40s)
  Input photo
  -> SAM2 foreground segmentation (save mask)
  -> UniK3D depth estimation on input
  -> Project input image into equirectangular space
  -> FLUX.1-dev + WorldGen img2scene LoRA: fill panorama
  -> Composite original image back at high quality (override generated region)

Phase 2: Depth Estimation (GPU, ~10s)
  Full panorama
  -> UniK3D spherical depth estimation
  -> Optional: depth ensembling with Depth Anything V2

Phase 3: Gaussian Generation (GPU, ~5s)
  Panoramic RGBD
  -> Option A: Direct RGBD-to-Gaussian conversion (fast, 6.5/10 quality)
  -> Option B: SHARP multi-view extraction + consensus merge (slower, 7/10 quality)

Phase 4: Optimization (Optional, GPU, ~120s)
  Raw Gaussians + 20 extracted perspective views
  -> 500 iterations of gsplat optimization
  -> Significant quality improvement (7.5/10)

Phase 5: Export (CPU, ~5s)
  Optimized Gaussians
  -> SuperSplat crop/clean
  -> PLY -> SPZ compression (~8MB)
  -> Deploy to web via Spark.js
```

### Total pipeline time: ~60-180 seconds per scene
### GPU requirement: 10-24GB VRAM (RTX 3080 minimum, RTX 4090 recommended)
### Cost: $0 (all open source, runs locally)

---

## 10. The Single Most Promising Pipeline to Build

### Recommendation: WorldGen with Post-Optimization

**Why WorldGen specifically:**
1. You already have it cloned and partially understand its codebase
2. It is literally the same architecture as Marble, open source
3. It already integrates SHARP for higher quality
4. It supports both text-to-scene and image-to-scene
5. It outputs standard PLY files compatible with your existing Spark.js renderer

**The one modification that will make the biggest difference:**
Add a gsplat optimization step after the initial Gaussian generation. WorldGen currently does direct RGBD-to-Gaussian projection (no optimization). This means every depth estimation error becomes a permanent artifact. Even 500 iterations of gradient-descent optimization on the Gaussians using the panoramic views as supervision would:
- Fix depth errors at object boundaries
- Reduce floating artifacts
- Improve multi-view consistency
- Close quality gap with Marble

**Implementation plan:**

```python
# After WorldGen generates raw splat:
from gsplat import rasterization  # pip install gsplat

# Extract 20 views from panorama as training supervision
views = extract_views_from_panorama(panorama, num_views=20)

# Initialize gsplat from WorldGen's raw Gaussians
gaussians = initialize_from_worldgen_output(raw_splat)

# Optimize for 500 iterations
optimizer = torch.optim.Adam(gaussians.parameters(), lr=0.005)
for i in range(500):
    for view in views:
        rendered = rasterization(gaussians, view.camera)
        loss = l1_loss(rendered, view.image) + ssim_loss(rendered, view.image)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()

# Export optimized Gaussians
save_ply(gaussians, "optimized.ply")
```

This adds ~2 minutes of GPU time but closes a significant quality gap.

---

## 11. Timeline Estimates

| Phase | Task | Effort | Prereqs |
|-------|------|--------|---------|
| **Week 1** | Get WorldGen running end-to-end on your RTX GPU. Generate your first memory world from the Bell Cave photo. | 2-3 days | CUDA setup, model downloads (~20GB) |
| **Week 1-2** | Quality comparison: Run WorldGen on 5 photos, compare with Marble output side by side. Identify specific quality gaps. | 1-2 days | WorldGen running |
| **Week 2** | Implement foreground subject segmentation + recompositing. Test on Jace-on-rock photo. | 2-3 days | SAM2 setup |
| **Week 3** | Add gsplat optimization post-processing step. Benchmark quality improvement. | 3-4 days | gsplat installed |
| **Week 3-4** | PLY -> SPZ compression. Test Spark.js rendering in browser. Integrate with existing CapsuleShell memory scene loader. | 2-3 days | SuperSplat or splat-transform CLI |
| **Month 2** | Build automated pipeline: upload photo -> server generates world -> SPZ delivered to browser. | 1-2 weeks | Server with GPU (Replicate/Modal/RunPod) |
| **Month 3+** | Quality refinements: depth ensembling, better panorama conditioning, custom LoRA fine-tuning. | Ongoing | |

---

## 12. Key Repos and Resources

### Must-Use
| Tool | Repo | Role |
|------|------|------|
| **WorldGen** | github.com/ZiYang-xie/WorldGen | Core pipeline (already cloned) |
| **SHARP (ml-sharp)** | github.com/apple/ml-sharp | Gaussian prediction per view (already cloned) |
| **UniK3D** | github.com/lpiccinelli-eth/UniK3D | Panoramic depth estimation (WorldGen dependency) |
| **gsplat** | github.com/nerfstudio-project/gsplat | Gaussian splat optimization |
| **Spark.js** | github.com/nicedoc/spark | Browser rendering (already in project) |
| **SuperSplat** | superspl.at/editor | Splat editing/cleanup/export |
| **splat-transform** | github.com/playcanvas/splat-transform | PLY -> SPZ compression |

### Worth Monitoring
| Tool | Repo | Why |
|------|------|-----|
| **VistaDream** | github.com/WHU-USI3DV/VistaDream | Alternative pipeline (already cloned) |
| **DUSt3R / MASt3R** | github.com/naver/dust3r | Sparse-view reconstruction |
| **ViewCrafter** | github.com/Drexubery/ViewCrafter | Novel view synthesis for scenes |
| **Depth Anything V2** | github.com/DepthAnything/Depth-Anything-V2 | Alternative depth estimator |
| **SAM2** | github.com/facebookresearch/sam2 | Subject segmentation |
| **LayerPano3D** | github.com/3DTopia/LayerPano3D | Layered panoramic 3D (inspired WorldGen) |

### Not Worth Pursuing (for this use case)
| Tool | Why Not |
|------|---------|
| TRELLIS / TRELLIS.2 | Object-only, not scenes |
| Zero123++ | Object-only |
| SV3D | Object-only |
| Instant-NGP / NeRF | Superseded by Gaussian Splatting |
| Text2Room / SceneScape | Lower quality than panorama-first approach |
| Meshy.ai | AI-generated 3D models, not scene reconstruction (your meshy folder shows a GLB model, not a photo-derived scene) |

---

## 13. What Marble Does That We Don't (Yet)

Based on analyzing their product and your exports:

1. **Panorama editing UI** -- They let you edit the panorama before generating the world. This human-in-the-loop step is huge for quality. We could replicate this with an interactive equirectangular editor.

2. **Foreground subject handling** -- Their "Draft" step likely does something smart with foreground subjects (separate depth treatment, masking during panorama generation).

3. **Progressive rendering** -- Their worlds load incrementally (rough version appears fast, detail streams in). This is a Spark.js feature we can replicate.

4. **Cloud GPU** -- They run the pipeline server-side on powerful GPUs. We need to decide: run locally (RTX 4090 required) or use a cloud GPU service (Replicate, Modal, RunPod at ~$0.50-1.00 per generation).

5. **Scale and polish** -- Their pipeline has been iterated on by a well-funded team. Our first version will be rougher. That's fine for personal memory worlds -- we're not shipping a commercial product.

---

## 14. Bottom Line

**The gap between Marble and open-source is surprisingly small.** WorldGen replicates ~90% of Marble's pipeline. The remaining 10% is:
- Better foreground handling (solvable with SAM2 segmentation)
- Post-optimization of Gaussians (solvable with gsplat)
- Polish and edge-case handling (solvable with iteration)

**You should NOT try to build a custom pipeline from scratch.** WorldGen exists, works, and solves the hardest problem (panorama generation with a fine-tuned FLUX LoRA). Build on top of it.

**Your competitive advantage** is that you don't need a general-purpose solution. You're building memory capsules for specific personal photos. You can hand-tune each scene. A pipeline that works 70% of the time with manual cleanup is perfectly fine for 10-20 flagship memory scenes on jarowe.com.

**Start with WorldGen + SHARP mode. Add gsplat optimization. Ship the first memory world within 2 weeks.**
