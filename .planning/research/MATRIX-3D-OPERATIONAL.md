# Matrix-3D: Operational Research for Memory World Comparison

**Date:** 2026-04-04
**Purpose:** Evaluate Matrix-3D as a candidate family in the jarowe memory-world generation comparison matrix alongside Marble (World Labs API) and WorldGen (local pano-first pipeline).

---

## 1. What Is Matrix-3D?

**Paper:** "Matrix-3D: Omnidirectional Explorable 3D World Generation" (arXiv:2508.08086, Aug 2025)
**Team:** Skywork AI (Kunlun) + HKUST Guangzhou + CAS + Beijing Normal University
**Project page:** https://matrix-3d.github.io/
**GitHub:** https://github.com/SkyworkAI/Matrix-3D (682 stars, MIT license)
**HuggingFace:** https://huggingface.co/Skywork/Matrix-3D
**Paper PDF:** https://arxiv.org/pdf/2508.08086

Matrix-3D is a **three-stage open-source pipeline** that generates omnidirectional explorable 3D worlds from a single image or text prompt. It is the closest open-source equivalent to Marble (World Labs). It shares the same conceptual architecture as WorldGen but with a purpose-built panoramic video diffusion model trained on a large synthetic dataset (Matrix-Pano, 116K sequences).

### Architecture (3 stages)

```
Input Image/Text
    |
    v
[Stage 1] Panorama Generation
    FLUX.1-dev + LoRA fine-tune -> 512x1024 equirectangular panorama
    (text-to-pano OR image-to-pano via outpainting)
    |
    v
[Stage 2] Trajectory-Guided Panoramic Video Generation
    Wan2.1/2.2 video model + LoRA fine-tune
    Conditions: scene mesh renders from MoGe depth + camera trajectory
    Generates 81-frame panoramic video at 480p or 720p
    |
    v
[Stage 3] 3D Scene Reconstruction (two options)
    Option A: Feed-forward PanoLRM (fast, ~80GB VRAM)
    Option B: Optimization-based Gaussian splatting (slow, ~10GB VRAM)
    Output: .ply Gaussian splat file
```

Key differentiator vs WorldGen: Matrix-3D generates a **video sequence** along a camera trajectory first, then lifts the video to 3D. WorldGen generates a single panorama and lifts it directly with per-view SHARP passes. The video approach gives Matrix-3D geometric consistency across viewpoints.

---

## 2. Setup Requirements

### Hardware

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| GPU VRAM (full pipeline, 720p) | 19GB (low-VRAM mode) | 60GB+ (A100/H100) | Without low-VRAM mode, 720p video gen needs ~60GB |
| GPU VRAM (5B model, 720p) | 12GB (low-VRAM mode) | 19GB | Newer smaller model, slight quality drop |
| GPU VRAM (480p pipeline) | 15GB (low-VRAM mode) | 40GB | |
| GPU VRAM (optimization-based 3D) | ~10GB | ~10GB | This is the affordable reconstruction path |
| GPU VRAM (feed-forward PanoLRM) | ~80GB | ~80GB | A100 80GB only; skip this for consumer GPUs |
| GPU VRAM (pano image gen, FLUX) | >32GB | 40GB+ | **FAILS on RTX 5090 (32GB)** -- see issue #29 |
| System RAM | 32GB | 64GB | Multiple large model loads |
| Disk | ~30GB | ~50GB | Checkpoints + submodules |

### Software

- **OS:** Linux only (currently tested). No Windows support. Issue #39 is a bare "Windows" title with no response. The install.sh uses Linux-only CUDA compilation (nvdiffrast, simple-knn, flash-attn). **WSL2 would be required.**
- **Python:** 3.10
- **CUDA:** 12.4 (torch 2.7.0)
- **Key dependencies:** PyTorch 2.7, flash-attn 2.7.4, xformers 0.0.31, pytorch3d 0.7.7, nvdiffrast, ODGS, DiffSynth-Studio
- **Known issues:**
  - pytorch3d 0.7.7 has build conflicts with torch 2.7/2.6 (issue #37, unresolved)
  - flash-attn requires CUDA compilation (slow, ~30min build)
  - nvdiffrast needs CUDA toolkit + GL headers (problematic in WSL without GPU passthrough configured)
  - StableSR checkpoint needed for super-resolution step in optimization pipeline

### Can It Run on Your RTX GPU via WSL?

**Verdict: Barely, with significant constraints.**

- RTX 4090 (24GB): Cannot run FLUX pano generation (OOM on 32GB cards -- issue #29). The 5B video model in low-VRAM mode fits (12GB). Optimization-based 3D fits (10GB). But you cannot generate the panorama locally.
- RTX 3090/4090: Could potentially run the **video + 3D stages** if you provide your own panorama from an external source (e.g., generate the pano on a cloud GPU or use Marble's pano output).
- The FLUX panorama generation stage is the bottleneck -- it loads the full FLUX.1-dev model (~24GB) plus LoRA and attempts `.to(device)` without CPU offloading by default. Even with `enable_model_cpu_offload()` called after, the initial `.to(device)` fails.

**Workaround for consumer GPUs:** Skip Stage 1, provide your own panorama image (from Marble, HunyuanWorld, or any equirectangular source), and run only Stage 2 + Stage 3.

---

## 3. Input Format

### Image-to-World
- **Input:** Single photograph (any resolution, any aspect ratio)
- **Processing:** Image is outpainted to a 512x1024 equirectangular panorama using FLUX.1-Fill + custom LoRA
- **Note:** The input image becomes one face of the panorama; the rest is hallucinated

### Text-to-World
- **Input:** Text prompt describing a scene
- **Processing:** FLUX.1-dev + LoRA generates a 512x1024 panorama directly from text

### Custom Panorama Input
- **Input:** Pre-existing equirectangular panorama image (`pano_img.jpg`) + text prompt (`prompt.txt`)
- **This is the most relevant path for us** -- we could use Marble's panorama output or generate our own pano, then feed it to Matrix-3D's video + 3D stages

### Camera Trajectories
- Three built-in movement modes: Straight Travel, S-curve Travel, Forward on the Right
- Custom trajectories via JSON file (world-to-camera matrices, OpenCV convention)
- This gives us **control over the exploration path**, which Marble does not offer

---

## 4. Output Format

### Primary Output
- **Gaussian Splat .ply file** (`generated_3dgs_opt.ply` or `generated_3dgs_lrm.ply`)
- Standard 3D Gaussian Splatting PLY format (position, color/SH, opacity, scale, rotation)
- Directly viewable in any GS viewer (antimatter15/splat, Spark.js, SuperSplat, etc.)

### Intermediate Outputs
- Panorama image (`pano_img.jpg`)
- Panoramic video (`pano_video.mp4`)
- Depth maps, camera poses, perspective views (in `geom_optim/` directory)

### Conversion for jarowe
The .ply output is the same format as every other GS-based pipeline. For web viewing:
- Convert to .spz (compressed splat) via Spark.js tools
- Or load directly via any web-based GS renderer
- No additional conversion needed vs Marble/WorldGen output

---

## 5. Fit for Our Memory Scenes

### Outdoor Natural Scenes (sea, rocks, caves)
**Good fit.** Matrix-3D was trained on Matrix-Pano (116K sequences from Unreal Engine with indoor and outdoor environments). The demos show landscapes, forests, beaches, villages. Natural outdoor scenes are well within its training distribution.

**Caveat:** The Matrix-Pano dataset is synthetic (Unreal Engine). Real-world photographic content may have a domain gap, especially for specific textures like wet rocks, cave interiors with dramatic lighting, translucent water. The video model should generalize reasonably since it's fine-tuned from Wan2.1/2.2 which was trained on real video.

### Scenes with People (child on rocks)
**Poor fit -- same as Marble.** The pipeline generates a panoramic video of a scene along a camera trajectory. People in the input image will be included in the panorama outpainting, but:
- The video generation model has no person-specific training
- Moving the camera will reveal the person from angles that were never photographed
- The 3D reconstruction will create splat geometry for the person, but it will be blobby/distorted from novel views
- **This is a fundamental limitation shared by ALL single-image world-gen systems** (Marble, WorldGen, Matrix-3D)

### Single-Image Input
**Yes, this is the primary use case.** Image-to-pano-to-video-to-3D is the core pipeline.

### Scene-Level Reconstruction
**Yes, explicitly.** Matrix-3D is designed for scene-level (not object-level) reconstruction. This is its strength vs TRELLIS/SHARP which are object/frustum-level.

---

## 6. Quality Characteristics

### What It Does Well
- **360-degree exploration:** Full omnidirectional coverage, not limited to the input frustum
- **Geometric consistency:** The trajectory-guided video generation enforces consistency across frames before lifting to 3D (vs WorldGen which has seam artifacts from independent per-view SHARP passes)
- **Controllable trajectories:** You can define exactly how the camera moves through the scene
- **Large spatial coverage:** The pipeline is designed for walking-through-a-scene style exploration, not just look-around-from-one-spot

### Exploration Range
**Better than Marble, worse than multi-view reconstruction.** The camera trajectory during video generation determines the spatial extent. Default trajectories move ~18+ meters through the scene. You can explore along and near the generated trajectory. Moving far off the trajectory path will reveal untextured or distorted areas, since the video only sees what's along the path.

### Artifact Types
- **Panoramic hallucination artifacts:** The 85% of the panorama that's hallucinated may not match the photographic style/content of the input image
- **Temporal inconsistency in video:** The video model can produce slight flickering or inconsistent details between frames, which becomes geometric noise in the 3D reconstruction
- **Depth estimation errors:** MoGe depth can fail on reflective surfaces (water), transparent materials, and thin structures
- **480p blurriness:** The 480p pipeline produces noticeably blurry 3D scenes (confirmed by developers in issue #25). 720p is recommended but requires more VRAM.
- **StableSR artifacts:** The optimization pipeline runs StableSR super-resolution on perspective views, which can hallucinate texture details that aren't in the original

### Compared to Marble
| Aspect | Matrix-3D | Marble |
|--------|-----------|--------|
| Panorama quality | Good (FLUX LoRA) | Better (proprietary, editable) |
| Exploration range | Better (trajectory-based, meters of movement) | Limited (center-point with small translation) |
| 3D consistency | Better (video-based, multi-frame) | Worse (single panoramic depth bubble) |
| Visual fidelity | Lower (video compression, SR artifacts) | Higher (purpose-built, tuned) |
| Human-in-the-loop | None (fully automated) | Yes (panorama editing before world gen) |
| Export control | Full (local .ply) | Limited (Studio mode only) |
| Cost | Free (compute costs) | $20/month |

### Compared to WorldGen
| Aspect | Matrix-3D | WorldGen |
|--------|-----------|---------|
| Panorama source | FLUX LoRA (built-in) | External or built-in |
| 3D method | Video -> optimization GS or feed-forward LRM | Per-view SHARP -> voxel merge |
| Seam artifacts | Fewer (video is temporally coherent) | More (independent per-view inference) |
| Compute cost | Much higher (video gen is expensive) | Lower (no video generation step) |
| Setup complexity | Higher (more submodules, larger models) | Lower |
| Speed | Much slower (1hr+ for 720p video alone) | Faster (~5-10min total) |

---

## 7. Generation Time

Based on issue #30 discussion and README:

| Stage | Hardware | Time |
|-------|----------|------|
| Panorama image generation | A100/H100 | ~2-5 minutes |
| 720p video generation (14B model) | Single A800 | ~1 hour |
| 720p video generation (5B model) | Single A800 | ~5 minutes |
| 720p video generation (14B, multi-GPU) | 4x A800 | ~15 minutes |
| Optimization-based 3D reconstruction | Any CUDA GPU | ~10-20 minutes (3000 iterations) |
| Feed-forward PanoLRM | A100 80GB | ~2-5 minutes |
| **Total (best case, 5B model)** | **A100** | **~15-25 minutes** |
| **Total (quality path, 14B model)** | **A800** | **~1.5 hours** |

For comparison:
- **Marble:** ~2-3 minutes total (cloud, all inclusive)
- **WorldGen (with SHARP):** ~5-10 minutes total on a single 24GB GPU

---

## 8. Known Limitations

### Showstoppers for Our Use Case
1. **Cannot run panorama generation on consumer GPUs** (OOM on 32GB cards). Workaround: use external pano source.
2. **No Windows support.** Must use WSL2 with GPU passthrough, or a cloud Linux instance.
3. **pytorch3d build issues** with current torch versions (issue #37, no fix yet).
4. **No interactive panorama editing.** Unlike Marble, you cannot adjust the hallucinated regions before committing to video generation.

### Quality Ceiling
- The pipeline is bounded by the video model's quality. Video diffusion models in 2025-2026 still have temporal artifacts.
- 480p is noticeably blurry. 720p is adequate but requires significantly more VRAM.
- The optimization-based reconstruction (which we'd use on consumer hardware) runs only 3000 GS iterations -- a fraction of typical GS training. Quality may be improvable with more iterations.
- The 5B model sacrifices quality for speed/VRAM -- "some quality drop, but not that serious" (developer comment).

### What Fails
- Reflective/transparent surfaces (water, glass) -- MoGe depth estimation limitation
- People/subjects from novel angles -- fundamental single-image limitation
- Very long trajectories may accumulate drift
- Complex indoor scenes with many occlusions
- Real-world photographs may have domain gap vs synthetic training data

---

## 9. Verdict: Is It Worth Comparing?

### YES, but with caveats.

**Matrix-3D fills a specific niche in the comparison matrix:**
- It is the **only open-source pipeline** that generates a true walk-through explorable world (not just a look-around bubble like Marble/WorldGen)
- The trajectory-based video approach means you get **meters of spatial exploration**, not just head rotation
- The output is standard .ply Gaussian splat -- identical integration story to every other family

**Practical path for our RTX setup:**
1. Generate panorama externally (Marble, or FLUX on cloud, or HunyuanWorld)
2. Run the 5B video model in low-VRAM mode (12GB) on local RTX GPU via WSL2
3. Run optimization-based 3D reconstruction (~10GB) locally
4. Get a .ply splat we can view in the web viewer

**Or, more realistically for a comparison:**
1. Use a cloud GPU (Vast.ai A100 80GB ~$1/hr, or RunPod) to run the full pipeline
2. Compare the output .ply quality against Marble and WorldGen .ply outputs
3. A single full-quality scene would cost ~$1.50 in cloud compute and ~1.5 hours

### Comparison Matrix Position

| Dimension | Marble | WorldGen | Matrix-3D |
|-----------|--------|----------|-----------|
| **Source** | Commercial API | Open-source local | Open-source local/cloud |
| **License** | Proprietary ($20/mo) | Apache 2.0 | MIT |
| **Input** | Single image | Single image | Single image or text |
| **Output** | .ply/.spz (via Studio) | .ply | .ply |
| **Panorama quality** | Best | Good | Good |
| **3D quality** | Good | Fair (seams) | Good (video-consistent) |
| **Exploration range** | Small (bubble) | Small (bubble) | Large (trajectory walk) |
| **People handling** | Poor | Poor | Poor |
| **Local HW needs** | None (cloud) | 24GB GPU | 12-80GB GPU (varies by config) |
| **Speed** | ~3 min | ~5-10 min | ~15 min - 1.5 hr |
| **Human-in-loop** | Yes (pano edit) | No | No |
| **Trajectory control** | None | None | Full (JSON camera paths) |

### Recommendation

**Include Matrix-3D in the comparison matrix as the "exploration range" champion.** It won't win on panorama quality or ease-of-use, but it's the only family that gives actual walk-through capability. For memory scenes where you want to "walk into the cave" or "approach the rocks," Matrix-3D offers something the other families fundamentally cannot.

Run one test scene (Syros cave) on a cloud A100 to validate quality before investing in local WSL2 setup.
