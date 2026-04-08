# SAM 3D Body: Operational Research for Memory World Subject Reconstruction

**Date:** 2026-04-04
**Context:** Evaluating Meta's SAM 3D Body (and SAM 3D Objects) for reconstructing human subjects in jarowe memory world scenes, as an upgrade from the current SAM2 mask + 2D billboard approach.

---

## 1. What Is SAM 3D Body?

SAM 3D Body (3DB) is Meta/Facebook Research's **promptable model for single-image full-body 3D human mesh recovery (HMR)**. Released November 19, 2025.

- **Repo:** https://github.com/facebookresearch/sam-3d-body
- **Paper:** https://arxiv.org/abs/2602.15989
- **HuggingFace checkpoints:** `facebook/sam-3d-body-dinov3` (840M params), `facebook/sam-3d-body-vith` (631M params)
- **License:** SAM License (permissive, commercial use OK)
- **fal.ai hosted API:** https://fal.ai/models/fal-ai/sam-3/3d-body ($0.02/generation)
- **Meta Playground:** https://segment-anything.com (browser-based, free)

### What It Actually Does

From a **single RGB image**, SAM 3D Body estimates:
- Full-body 3D mesh (body + hands + feet)
- Skeletal pose (joint positions and rotations)
- Body shape parameters

It uses the **Momentum Human Rig (MHR)** -- Meta's parametric body model that decouples skeleton from surface shape. MHR supports 45 shape parameters, 204 pose parameters, 72 facial expression parameters, and 7 LOD levels (595 to 73,639 vertices).

### What It Does NOT Do

This is the critical distinction for our use case:

- **No clothing geometry** -- MHR outputs a "naked" parametric body mesh. Clothing is NOT reconstructed as geometry. The mesh is a smooth body shape; wrinkles, fabric folds, pockets, hoods are all lost.
- **No appearance/texture from the photo** -- The core model outputs geometry only. No per-vertex color, no UV-mapped texture from the input image.
- **No hair geometry** -- Hair is not modeled. The head is a smooth parametric shape.
- **No accessories** -- Backpacks, hats, glasses, shoes details are not represented.

Some downstream tools (fal.ai, ComfyUI nodes, sam3d.org wrappers) add texture mapping as a post-processing step, projecting the input image onto the mesh UV. This gives a rough textured GLB, but quality varies and the back/unseen sides are hallucinated or blank.

### Architecture

Encoder-decoder with two backbone options:
1. **DINOv3-H+** encoder (840M params) -- MPJPE 54.8mm on 3DPW
2. **ViT-H** encoder (631M params) -- MPJPE 54.8mm on 3DPW

Three specialized decoders: body, hand, foot. Supports optional auxiliary prompts (2D keypoints, segmentation masks) to guide inference in ambiguous cases.

---

## 2. Input Requirements

| Requirement | Detail |
|---|---|
| Image format | RGB (any common format, internally converted) |
| Resolution | Not strictly specified; works with typical photo resolutions |
| People in frame | Single or multiple (processes individually) |
| Prompts (optional) | 2D keypoints, segmentation mask (improves accuracy on hard cases) |
| Pose requirements | None -- handles casual, seated, occluded poses |
| Full body needed? | No -- handles partial views, though accuracy degrades with heavy occlusion |

### What Helps Accuracy
- Full or near-full body visible
- Person occupying significant portion of frame
- Clear separation from background
- Providing a SAM2 mask or 2D keypoint annotations as prompts

### What Hurts Accuracy
- Very small subjects (<15% of frame height)
- Heavy occlusion (>50% of body behind objects)
- Unusual body proportions (children, pregnancy, disability)
- Extreme poses not well represented in training data

---

## 3. Output Format

### Core Model Output
- **MHR parameters:** 45 shape + 204 pose + 72 expression coefficients
- **3D mesh vertices:** Camera-space coordinates (`pred_vertices`)
- **Joint positions:** 70 body keypoints (body + hands + feet)
- **Mesh faces:** Fixed topology from MHR template

### Export Formats (via tooling)
- **GLB** -- Textured mesh, directly loadable in Three.js via `GLTFLoader`
- **PLY** -- Vertex mesh, loadable but needs material assignment
- **OBJ** -- Standard mesh format
- **FBX** -- Via MHR conversion tools (animation-ready)
- **MHR native** -- Meta's format, convertible to FBX/glTF

### Mesh Specs at Different LODs
| LOD | Vertices | Use Case |
|-----|----------|----------|
| 0 | 73,639 | High-fidelity rendering |
| 1 | ~18,000 | Standard (default for TorchScript) |
| 6 | 595 | Real-time/mobile |

For our Three.js/R3F memory worlds, LOD 1-2 (~10-20K vertices) would be appropriate. A single person mesh is 1-3MB as GLB.

---

## 4. Practical Assessment for Our Memory Scenes

### Scene: Jace on Rock (naxos-rock)
- Child seated/standing on rocks, ~25% of frame height
- Partial occlusion by rock surface (legs/feet hidden)
- Outdoor golden hour lighting

**SAM 3D Body verdict: MIXED**
- Will recover approximate body pose and shape
- Child body proportions will be "standardized" -- the parametric model was trained primarily on adults. A research paper (arxiv 2601.06035) found that 3DB "consistently produced standardized body shapes" for non-average bodies
- Rock occlusion means legs/feet will be hallucinated (plausible but not accurate)
- The output will be a smooth body shape without Jace's actual clothing, hair, or appearance
- At 25% frame height, the subject is small but within usable range -- accuracy will be lower than for a half-body or full-frame subject

### Scene: Family Laughing (naxos-laugh)
- Multiple people in frame
- Casual poses, interaction
- Outdoor lighting

**SAM 3D Body verdict: WORKABLE BUT COMPLEX**
- Multi-person: processes each person independently, no interaction modeling
- Will get approximate poses for each family member
- Same limitations: no clothing, no appearance, parametric smooth bodies
- Children's proportions will be less accurate than adults

### Scene: Figure in Cave (syros-cave)
- Single figure, silhouetted against cave entrance
- Strong backlighting (cave shadows)
- Figure may be small in frame

**SAM 3D Body verdict: POOR**
- Backlighting/silhouette = minimal visual information for pose estimation
- The model relies on RGB appearance cues that are mostly absent in a backlit silhouette
- Small figure + silhouette = worst case scenario for 3DB
- May fail to detect the person entirely, or produce a generic standing pose

### Summary Table

| Scene | Subject Size | Occlusion | Lighting | 3DB Confidence |
|-------|-------------|-----------|----------|---------------|
| naxos-rock | ~25% frame | Moderate (rocks) | Good (golden hour) | Medium |
| naxos-laugh | ~30-40% frame | Minimal | Good (outdoor) | Medium-High |
| syros-cave | ~15-20% frame | Heavy (silhouette) | Poor (backlit) | Low |

---

## 5. Quality Expectations: Honest Assessment

### What SAM 3D Body Reconstructs Well
- **Body pose** from clear single-view images (SOTA: 54.8mm MPJPE on 3DPW)
- **Hand articulation** (separate hand decoder with dedicated crop encoding)
- **Foot position** (separate foot decoder)
- **Standing/walking adult subjects** with good visibility
- **Multiple viewpoints** handled consistently (front, side, 3/4)

### What Fails or Degrades
- **Clothing detail**: Zero. Smooth parametric body. A person in a puffy jacket looks the same as a person in a t-shirt geometry-wise.
- **Hair**: Not modeled. Bald parametric head.
- **Face detail**: 72 expression parameters give rough expressions, but no likeness, no facial features, no face texture from the photo.
- **Children**: Body proportions skew toward adult training distribution. A 7-year-old will look like a short adult, not a child.
- **Non-standard body types**: Documented failure for pregnancy, obesity, muscle atrophy, scoliosis -- the 45-dimensional shape space cannot represent these.
- **Small subjects**: Fewer pixels = fewer features = worse pose estimation. Below ~15% frame height, expect significant errors.
- **Texture/appearance**: The core model has none. Wrapper tools that add texture do basic UV projection from the input view; unseen sides are blank or low-quality hallucination.

### Compared to Current Billboard Approach

| Criterion | Current (SAM2 + Billboard) | SAM 3D Body |
|---|---|---|
| Appearance fidelity | **High** -- actual photo pixels | Low -- parametric mesh, no real appearance |
| Depth coherence | Poor -- flat plane at estimated depth | **Good** -- true 3D mesh with volume |
| Parallax correctness | None -- billboard always faces camera | **Correct** -- mesh has real 3D extent |
| Clothing/hair | **Preserved** -- photo pixels | Lost entirely |
| Integration effort | Simple -- textured quad in scene | Complex -- mesh loading, material, lighting |
| File size impact | Minimal (~50KB texture) | Significant (~1-3MB GLB per person) |
| Uncanny valley risk | Low -- it's clearly a photo | **High** -- smooth mannequin body |

### The Core Problem for Our Use Case

SAM 3D Body solves the **wrong problem** for memory worlds. We need to preserve the **appearance** of loved ones in a photo -- their clothes, hair, expressions, the way light falls on them. SAM 3D Body gives us an accurate skeleton inside a smooth mannequin. That's valuable for AR/VR applications, motion capture, robotics -- but for nostalgic memory scenes, a smooth parametric body replacing a real photograph of your child is a downgrade, not an upgrade.

---

## 6. SAM 3D Objects: For Non-Human Subjects

**Repo:** https://github.com/facebookresearch/sam-3d-objects
**What it does:** Reconstructs arbitrary objects from a single image as **3D Gaussian Splats** (not parametric mesh).

### Key Differences from 3D Body

| Feature | SAM 3D Body | SAM 3D Objects |
|---------|-------------|----------------|
| Output | Parametric mesh (MHR) | Gaussian Splats (PLY) |
| Appearance | Geometry only (core) | **Full texture/appearance** |
| Subject | Humans only | Any object |
| Format | GLB/OBJ/FBX/PLY | PLY (Gaussian splat) |
| Render method | Standard mesh | Splat renderer (Spark.js compatible) |

### Relevance for Our Scenes
- **Bell in syros-cave**: Could reconstruct as Gaussian splat with appearance
- **Rock formation**: Potentially, if properly masked
- **Furniture, objects**: Good candidate

### Inputs Required
- Single RGB image
- Binary mask indicating the object to reconstruct (from SAM2/SAM3)

### VRAM Requirements (Important!)
- **Official recommendation: 32GB VRAM** (V100 minimum)
- RTX 4090 (24GB): Works with modifications (skip mesh decoding, aggressive downsampling)
- RTX 4080 (16GB): Reported working but very slow, some OOM errors
- RTX 3080 (10GB): Unlikely to work
- **fal.ai API**: $0.02/generation, no local GPU needed

### Cross-Model Alignment
There's a notebook (`demo_3db_mesh_alignment.ipynb`) for aligning SAM 3D Body meshes with SAM 3D Objects splats in the same camera coordinate frame. This means you could theoretically combine a body mesh with object splats in a unified scene.

---

## 7. Better Alternatives for Our Use Case

Given that SAM 3D Body outputs geometry-only parametric meshes (no appearance), and our primary need is preserving photo appearance in 3D, here are better-suited approaches:

### 7a. HumanSplat (Best Fit)
- **What:** Single image to full 3D Gaussian Splat of a person, **with appearance**
- **Paper:** HumanSplat: Generalizable Single-Image Human Gaussian Splatting with Structure Priors
- **Output:** 3D Gaussian Splats (directly compatible with our Spark.js renderer)
- **Key advantage:** Preserves clothing, hair, skin tone -- the actual visual appearance from the photo
- **Limitation:** Back/unseen sides are hallucinated via multi-view diffusion
- **Status:** Code available, research-grade

### 7b. GST (Gaussian Splatting Transformers)
- **What:** Single image to SMPL pose + full-color 3D Gaussian Splat
- **Paper:** GST: Precise 3D Human Body from a Single Image with Gaussian Splatting Transformers
- **Output:** SMPL parameters + 3D Gaussian Splats with color
- **Key advantage:** Gets both pose accuracy AND visual appearance
- **Limitation:** Research-grade, may not handle children well

### 7c. Enhanced Billboard (Pragmatic Best)
The current approach, improved:
1. SAM2 mask (already have)
2. Monocular depth estimation on the masked subject (Depth Anything V2)
3. Instead of flat billboard, create a **depth-warped billboard** -- a mesh plane with vertex displacement from the depth map
4. Apply photo texture with alpha from SAM2 mask
5. Result: Photo-accurate appearance with mild parallax from depth displacement

This is likely the **best practical option** for v2.3 because:
- Preserves exact photo appearance (the whole point of memory scenes)
- Adds depth relief without the uncanny valley of a parametric body
- Trivial to implement in Three.js/R3F (displacement map on PlaneGeometry)
- No additional model inference needed beyond what we already run
- Works for any subject size, occlusion level, lighting condition
- File size: negligible (texture + depth map)

### 7d. Hybrid: 3DB Skeleton + Photo Texture
Use SAM 3D Body to get the 3D pose, then project the original photo texture onto the mesh. Issues:
- UV mapping from photo to parametric mesh is non-trivial
- Unseen sides are blank/hallucinated
- Clothing mismatch between smooth mesh and real clothing shape
- More work than it's worth for our scenes

---

## 8. Setup Requirements (If You Want to Try It)

### SAM 3D Body Local Setup
- **Python:** 3.11 (conda recommended)
- **CUDA:** Compatible with PyTorch (11.8+ for Torch 2.2.x)
- **VRAM:** Not officially stated for Body (smaller than Objects); likely 8-16GB sufficient
- **Disk:** ~2-4GB for checkpoints
- **Dependencies:** PyTorch, Detectron2 (specific commit), pytorch-lightning, hydra, and ~30 other packages
- **Windows:** No explicit support/limitations documented. Detectron2 on Windows can be painful.
- **Inference speed:** "Several seconds per image" (original); Fast SAM 3D Body variant achieves 10.9x speedup for near-real-time

### SAM 3D Objects Local Setup
- **VRAM:** 32GB recommended (V100+), 16-24GB possible with modifications
- **Dependencies:** Similar stack plus SAM3 for segmentation
- **Speed:** Minutes per object (significant decode time)

### Fastest Path to Try: fal.ai API
- $0.02 per generation
- Upload image, get GLB back
- No local setup needed
- Good for evaluation before committing to local installation

### Already Attempted Locally
The `.venv-sam3d-body/` directory in the repo root suggests a local venv was already created. Check if the model is partially installed.

---

## 9. Grading Criteria: 3D Body vs Current Billboard

For evaluating whether SAM 3D Body (or alternatives) is worth adopting:

### Must-Have Criteria
1. **Subject recognizability** -- Can you tell it's your child, not a generic person? Billboard wins.
2. **Clothing/context preservation** -- Is the person wearing what they were wearing? Billboard wins.
3. **Emotional resonance** -- Does it feel like a memory or a mannequin? Billboard wins.

### Nice-to-Have Criteria
4. **Parallax correctness** -- Does the subject have depth when you move the camera? 3DB wins.
5. **Depth coherence** -- Does the subject sit correctly in the 3D world? 3DB wins.
6. **Shadow/lighting integration** -- Does the subject respond to scene lighting? 3DB wins (mesh can receive shadows).

### Verdict
The must-have criteria all favor the billboard approach for memory scenes. The nice-to-have criteria favor 3DB but are not worth the appearance degradation. The **depth-warped billboard** (option 7c) captures most of the nice-to-have benefits while preserving all must-have qualities.

---

## 10. Recommendation

### Do NOT adopt SAM 3D Body for subject reconstruction in memory worlds.

**Reasons:**
1. It outputs geometry without appearance -- the opposite of what memory scenes need
2. Children's body proportions are poorly represented
3. The parametric mesh creates an uncanny valley effect for personal/emotional scenes
4. The depth-warped billboard approach gives better results for less effort

### DO consider:
1. **SAM 3D Objects** for non-human elements (bells, rocks, furniture) -- it outputs Gaussian splats with full appearance, directly compatible with our renderer
2. **HumanSplat or GST** for appearance-preserving 3D human reconstruction when those projects mature
3. **Depth-warped billboard** as the immediate practical upgrade for v2.3
4. **fal.ai API** ($0.02/shot) to quickly test 3DB on our actual scene photos before ruling it out entirely -- seeing the actual output on naxos-rock would take 5 minutes and cost 2 cents

### Quick Test Plan
1. Upload naxos-rock photo to fal.ai SAM 3D Body playground
2. Upload naxos-rock photo to Meta Segment Anything Playground
3. Download the GLB output
4. Load in Three.js inspector or Blender
5. Compare side-by-side with the SAM2-masked billboard
6. If the textured GLB from fal.ai looks good enough, revisit this assessment

---

## Sources

- [SAM 3D Body GitHub](https://github.com/facebookresearch/sam-3d-body)
- [SAM 3D Objects GitHub](https://github.com/facebookresearch/sam-3d-objects)
- [MHR (Momentum Human Rig) GitHub](https://github.com/facebookresearch/MHR)
- [SAM 3D Body Paper](https://arxiv.org/abs/2602.15989)
- [MHR Paper](https://arxiv.org/abs/2511.15586)
- [Anthropometric Fidelity Study](https://arxiv.org/html/2601.06035)
- [Meta SAM 3D Blog Post](https://ai.meta.com/blog/sam-3d/)
- [Meta SAM 3D Body Research Page](https://ai.meta.com/research/publications/sam-3d-body-robust-full-body-human-mesh-recovery/)
- [fal.ai SAM 3D Body API](https://fal.ai/models/fal-ai/sam-3/3d-body)
- [SAM 3D Body HuggingFace](https://huggingface.co/facebook/sam-3d-body-dinov3)
- [Fast SAM 3D Body](https://yangtiming.github.io/Fast-SAM-3D-Body-Page/)
- [Roboflow SAM 3D Overview](https://blog.roboflow.com/sam-3d/)
- [HumanSplat](https://humansplat.github.io/)
- [GST (Gaussian Splatting Transformers)](https://abdullahamdi.com/gst/)
- [3DGS Human Reconstruction Survey](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1709229/full)
- [SAM 3D Objects VRAM Discussion](https://github.com/facebookresearch/sam-3d-objects/issues/6)
- [DeepWiki SAM 3D Body](https://deepwiki.com/facebookresearch/sam-3d-body)
