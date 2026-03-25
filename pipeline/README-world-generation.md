# Memory World Generation Pipeline

Converts a memory scene's source image set into a 3D world asset package.

## Quick Start

```bash
# List available memory scene IDs
ls public/memory/

# Register existing generated assets or run the default generator
node pipeline/generate-memory-world.mjs syros-cave

# Run a specific generator tier
node pipeline/generate-memory-world.mjs syros-cave --generator expanded
node pipeline/generate-memory-world.mjs syros-cave --generator world-model
node pipeline/generate-memory-world.mjs syros-cave --generator trellis
node pipeline/generate-memory-world.mjs syros-cave --generator sharp
node pipeline/generate-memory-world.mjs syros-cave --generator marble

# Force a fresh run and overwrite normalized world outputs
node pipeline/generate-memory-world.mjs syros-cave --generator world-model --force
```

## Supported Generators

| Generator | License | Quality | Setup Cost |
|-----------|---------|---------|------------|
| Expanded | Mixed / local | Best orchestration tier | External tools + local GPU |
| World Model | Mixed / local | Best single-image world path | External tools + local GPU |
| TRELLIS | MIT | High | Local GPU |
| SHARP | Research | High nearby-view draft | Local GPU |
| Marble | Commercial | Highest | API key |

## Generator Tiers

### Expanded

Use SHARP as the identity-preserving anchor pass, then add synthetic or real complementary views before fusing the final world. This is the orchestration tier. For true single-image world completion, point it at a real world-model backend instead of the current local synthetic-depth fallback.

What it does:

1. reads the primary memory photo
2. adds any `source.postImages` from `meta.json`
3. optionally runs an external view synthesizer into a temporary bundle
4. optionally runs an external fusion / reconstruction command
5. falls back to SHARP if no fused world is produced yet

The pipeline writes a durable `world/view-bundle.json` manifest so each memory records what source views were used.

```bash
# Bundle + register using existing world assets or SHARP fallback
node pipeline/generate-memory-world.mjs syros-cave --generator expanded

# Optional external view synthesis step
set EXPANDED_VIEW_COMMAND=python tools\\synth_views.py --input "{primary}" --output "{generatedDir}"

# Optional external fusion step (for COLMAP/gsplat or another reconstructor)
set EXPANDED_FUSE_COMMAND=python tools\\fuse_world.py --bundle "{bundleDir}" --output "{worldDir}"

# Optional: if this is a single-image memory and a real world-model backend is configured,
# Expanded will prefer it automatically over the local synthetic-depth fallback.
set WORLD_MODEL_COMMAND=python tools\\run_world_model.py --input "{primary}" --output "{worldDir}" --views "{generatedDir}"

# Then rerun
node pipeline/generate-memory-world.mjs syros-cave --generator expanded --force
```

Recommended tiers:

- `single-image draft`: SHARP only
- `single-image expanded`: SHARP anchor + synthetic complementary views + fused splat world
- `single-image world model`: learned scene/world completion from one photo + fused splat world
- `multi-view cluster`: carousel images / real capture bundle + fused splat world

### World Model

Use this when you want the actual Marble-like path from a single image: one source photo goes through a learned world/scene completion backend, which generates complementary views and/or a fused world asset directly.

The pipeline does not hardcode one model. Instead it shells out to a working backend that you configure through environment variables. That keeps the repo neutral while allowing you to swap between candidates like WorldGen, VistaDream, or a future ComfyUI workflow.

```bash
# Required: point to a working single-image world generator
set WORLD_MODEL_COMMAND=python tools\\run_world_model.py --input "{primary}" --output "{worldDir}" --views "{generatedDir}"

# Then run the dedicated generator
node pipeline/generate-memory-world.mjs syros-cave --generator world-model --force
```

Supported placeholders in `WORLD_MODEL_COMMAND` / `SINGLE_IMAGE_WORLD_COMMAND`:

- `{input}`: absolute path to the scene's source photo
- `{primary}`: absolute path to the staged primary input inside the temporary bundle
- `{output}` / `{worldDir}`: absolute path to `public/memory/{scene-id}/world`
- `{sceneDir}`: absolute path to the scene directory
- `{sceneId}`: memory scene id
- `{bundleDir}`: temporary bundle root
- `{sourceDir}`: staged source views directory
- `{generatedDir}`: where the world model can write synthetic views for provenance/debug
- `{bundleJson}`: destination `world/view-bundle.json`

The command is expected to produce at least one of:

- `scene.ply`
- `scene.spz`
- `scene.glb`
- `collider.glb`

in the target world directory.

### TRELLIS

Microsoft's single-image-to-3D model. Outputs Gaussian splat (PLY) plus mesh (GLB).

```bash
# Prerequisites: Python 3.10+, CUDA GPU with 8GB+ VRAM
pip install git+https://github.com/microsoft/TRELLIS.git
huggingface-cli download microsoft/TRELLIS-image-large

python -m trellis.generate \
  --image public/memory/syros-cave/photo.webp \
  --output public/memory/syros-cave/world/ \
  --format ply glb

node pipeline/generate-memory-world.mjs syros-cave --generator trellis
```

### SHARP

Single-image Gaussian splat from Apple ML. This is the fastest open path for draft worlds because it outputs a directly usable `.ply` splat world, but it tops out at nearby-view reconstruction rather than fully convincing free exploration.

```bash
# Prerequisites: Python 3.10+, CUDA GPU
python -m venv .venv-sharp
.venv-sharp\Scripts\python.exe -m pip install git+https://github.com/apple/ml-sharp.git

# Optional: download and pin the checkpoint locally
curl.exe -k -L https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt -o .models\sharp_2572gikvuh.pt

# The pipeline autodetects:
#   .venv-sharp\Scripts\sharp.exe
#   .models\sharp_2572gikvuh.pt
node pipeline/generate-memory-world.mjs syros-cave --generator sharp
```

### Marble

Commercial API / export workflow. Best for production-grade worlds if you are okay with an external service.

```bash
export MARBLE_API_KEY=your_key_here
node pipeline/generate-memory-world.mjs syros-cave --generator marble
```

## Asset Contract

Generated assets go in `public/memory/{scene-id}/world/`:

```text
world/
  scene.ply         Gaussian splat in PLY format
  scene.runtime.ply Runtime-decimated preview asset
  scene.spz         Optional compressed splat asset
  scene.glb         Optional triangulated mesh fallback
  collider.glb      Optional simplified collision mesh
  bounds.json       Optional world bounds metadata
  view-bundle.json  Source-view provenance for expanded runs
```

The pipeline writes these paths into `meta.json` under the `world` key:

```json
{
  "world": {
    "splat": "world/scene.runtime.ply",
    "sourceSplat": "world/scene.ply",
    "mesh": null,
    "collider": null,
    "format": "ply",
    "splatCount": 294912,
    "sourceSplatCount": 1179648,
    "bounds": null
  }
}
```

For expanded or world-model runs, the pipeline also stores generation provenance:

```json
{
  "source": {
    "generationMode": "single-image-world-model",
    "expansion": {
      "strategy": "learned-scene-expansion",
      "stage": "world-model-fused",
      "bundle": "world/view-bundle.json",
      "sourceViewCount": 1,
      "generatedViewCount": 6,
      "totalViewCount": 7,
      "anchorGenerator": "source-photo",
      "viewSynthesizer": "world-model",
      "fusionEngine": "world-model"
    }
  },
  "world": {
    "provenance": {
      "tier": "world-model-fused",
      "anchorGenerator": "source-photo",
      "reconstruction": "single-image-world-model",
      "viewCount": 7
    }
  }
}
```

## Placing Assets Manually

If you generate assets externally, drop them in the `world/` folder and rerun the pipeline. It normalizes names to `scene.ply` / `scene.glb` and updates `meta.json`.

```bash
cp ~/Downloads/scene.ply public/memory/syros-cave/world/scene.ply
node pipeline/generate-memory-world.mjs syros-cave
```

## Scene Directory Structure

```text
public/memory/{scene-id}/
  meta.json       Scene metadata
  photo.webp      Primary source photo
  depth.png       Depth map for fallback renderer
  mask.png        Optional subject mask
  preview.jpg     Thumbnail
  world/          Generated 3D assets and provenance manifests
  views/          Optional local supplemental images for expanded runs
  audio/          Soundscape layers
```
