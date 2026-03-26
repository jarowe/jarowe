#!/usr/bin/env python3
"""
run_single_image_world_backend.py

Thin wrapper for concrete single-image world generators used by
pipeline/generate-memory-world.mjs.

Current supported backends:
- worldgen

This script intentionally keeps backend-specific imports inside each runner
so `--help` works even when the heavy dependencies are not installed.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a single-image world-model backend")
    parser.add_argument("--backend", required=True, choices=["worldgen", "vistadream"])
    parser.add_argument("--input", required=True, help="Absolute path to the primary input image")
    parser.add_argument("--output", required=True, help="Absolute path to the target world directory")
    parser.add_argument("--generated-views", dest="generated_views", default=None, help="Optional directory for generated support views")
    parser.add_argument("--scene-id", dest="scene_id", default=None)
    parser.add_argument("--prompt", default="", help="Optional conditioning prompt")
    parser.add_argument("--resolution", type=int, default=int(os.environ.get("WORLD_MODEL_RESOLUTION", "1600")))
    parser.add_argument("--low-vram", action="store_true")
    parser.add_argument("--use-sharp", action="store_true", default=os.environ.get("WORLDGEN_USE_SHARP", "1") != "0")
    parser.add_argument("--inpaint-bg", action="store_true", default=os.environ.get("WORLDGEN_INPAINT_BG", "0") == "1")
    return parser.parse_args()


def ensure_dir(path: str | None) -> None:
    if path:
        Path(path).mkdir(parents=True, exist_ok=True)


def run_worldgen(args: argparse.Namespace) -> int:
    worldgen_root = Path(os.environ.get("WORLDGEN_ROOT", ROOT / "_experiments" / "WorldGen")).resolve()
    worldgen_src = worldgen_root / "src"
    if not worldgen_src.exists():
        print(
            "[worldgen] Could not find the local WorldGen checkout.\n"
            f"Expected: {worldgen_src}\n"
            "Set WORLDGEN_ROOT to a valid WorldGen repository root.",
            file=sys.stderr,
        )
        return 2

    sys.path.insert(0, str(worldgen_src))

    try:
        from PIL import Image
        import torch
        from worldgen import WorldGen
        from worldgen.pano_sharp import predict_equirectangular
    except Exception as exc:  # pragma: no cover - dependency discovery path
        print(
            "[worldgen] Failed to import WorldGen dependencies.\n"
            f"WorldGen root: {worldgen_root}\n"
            "Make sure WORLD_MODEL_PYTHON points to an environment where WorldGen and its dependencies are installed.\n"
            f"Import error: {exc}",
            file=sys.stderr,
        )
        return 3

    ensure_dir(args.output)
    ensure_dir(args.generated_views)

    image_path = Path(args.input).resolve()
    if not image_path.exists():
        print(f"[worldgen] Input image not found: {image_path}", file=sys.stderr)
        return 4

    output_dir = Path(args.output).resolve()
    output_path = output_dir / "scene.ply"

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    low_vram = args.low_vram or None

    world = WorldGen(
        mode="i2s",
        device=device,
        use_sharp=bool(args.use_sharp),
        inpaint_bg=bool(args.inpaint_bg),
        resolution=args.resolution,
        low_vram=low_vram,
    )
    # WorldGen's current upstream sharp path imports this helper in __init__
    # but doesn't retain it for later use inside _generate_world.
    if bool(args.use_sharp) and not hasattr(world, "predict_equirectangular"):
        world.predict_equirectangular = predict_equirectangular

    image = Image.open(image_path).convert("RGB")
    splat = world.generate_world(prompt=args.prompt or "", image=image, return_mesh=False)
    splat.save(str(output_path))

    print(
        "[worldgen] Generated scene.ply\n"
        f"scene_id={args.scene_id or ''}\n"
        f"input={image_path}\n"
        f"output={output_path}\n"
        f"resolution={args.resolution}\n"
        f"use_sharp={bool(args.use_sharp)}\n"
        f"inpaint_bg={bool(args.inpaint_bg)}"
    )
    return 0


def run_vistadream(_: argparse.Namespace) -> int:
    print(
        "[vistadream] Backend wrapper not implemented yet.\n"
        "VistaDream remains a candidate, but WorldGen is the first concrete backend wired into this pipeline.",
        file=sys.stderr,
    )
    return 5


def main() -> int:
    args = parse_args()
    if args.backend == "worldgen":
        return run_worldgen(args)
    if args.backend == "vistadream":
        return run_vistadream(args)
    print(f"Unsupported backend: {args.backend}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
