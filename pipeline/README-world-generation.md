# Memory World Generation Pipeline

Converts a memory scene's source photo into a 3D world asset (Gaussian splat or mesh).

## Quick Start

```bash
# List what scene IDs are available
ls public/memory/

# Dry run — prints generator setup instructions
node pipeline/generate-memory-world.mjs syros-cave

# With a specific generator
node pipeline/generate-memory-world.mjs syros-cave --generator trellis
node pipeline/generate-memory-world.mjs syros-cave --generator sharp
node pipeline/generate-memory-world.mjs syros-cave --generator marble

# If you placed assets manually in world/, just re-run to update meta.json
node pipeline/generate-memory-world.mjs syros-cave
```

---

## Supported Generators

| Generator | License | Quality | Setup Cost |
|-----------|---------|---------|------------|
| TRELLIS   | MIT     | High    | Local GPU  |
| SHARP     | Research | High   | Local GPU  |
| Marble    | Commercial | Highest | API key |

---

## Generator Setup

### TRELLIS (Recommended — MIT, local)

Microsoft's single-image-to-3D model. Outputs Gaussian splat (PLY) + mesh (GLB).

```bash
# Prerequisites: Python 3.10+, CUDA GPU with 8GB+ VRAM
pip install git+https://github.com/microsoft/TRELLIS.git
huggingface-cli download microsoft/TRELLIS-image-large

# Run on a scene photo
python -m trellis.generate \
  --image public/memory/syros-cave/photo.webp \
  --output public/memory/syros-cave/world/ \
  --format ply glb

# Then let the pipeline detect and register the output
node pipeline/generate-memory-world.mjs syros-cave
```

### SHARP (Apple Research)

Single-image Gaussian splat from Apple ML. PLY output only.

```bash
git clone https://github.com/apple/ml-sharp
pip install -r ml-sharp/requirements.txt

python ml-sharp/inference.py \
  --image public/memory/syros-cave/photo.webp \
  --output public/memory/syros-cave/world/scene.ply

node pipeline/generate-memory-world.mjs syros-cave
```

### Marble API (World Labs)

Commercial API, highest quality, SPZ compressed output. Best for production.

```bash
export MARBLE_API_KEY=your_key_here
node pipeline/generate-memory-world.mjs syros-cave --generator marble
```

Get an API key at https://worldlabs.ai.

---

## Asset Contract

Generated assets go in `public/memory/{scene-id}/world/`:

```
world/
  scene.ply       — Gaussian splat (PLY format, required)
  scene.spz       — Gaussian splat (SPZ compressed, optional, smaller)
  scene.glb       — Triangulated mesh fallback (optional)
  collider.glb    — Simplified collision mesh (optional, for fly-through nav)
  bounds.json     — Bounding box: { min:[x,y,z], max:[x,y,z], center:[x,y,z] }
```

The pipeline writes these paths into `meta.json` under the `world` key:

```json
{
  "world": {
    "splat": "scene.ply",
    "mesh": "scene.glb",
    "collider": null,
    "format": "ply",
    "splatCount": null,
    "bounds": null
  }
}
```

---

## Placing Assets Manually

If you generate assets externally (e.g. Luma AI, Polycam, Gaussian Opacity Fields), just drop them in the `world/` folder and run the pipeline script — it auto-detects and updates `meta.json`:

```bash
# Place your files:
cp ~/Downloads/scene.ply public/memory/syros-cave/world/scene.ply

# Register them:
node pipeline/generate-memory-world.mjs syros-cave
```

---

## Scene Directory Structure

```
public/memory/{scene-id}/
  meta.json       — Scene metadata (title, narrative, camera, soundscape, world paths)
  photo.webp      — Source photo (input to generator)
  depth.png       — Depth map (for particle fallback renderer)
  mask.png        — Subject mask (optional, improves generator output)
  preview.jpg     — Thumbnail
  world/          — Generated 3D assets (created by this pipeline)
  audio/          — Soundscape layers (drone.ogg, water.ogg, etc.)
```
