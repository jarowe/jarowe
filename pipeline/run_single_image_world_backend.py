#!/usr/bin/env python3
"""
run_single_image_world_backend.py

Thin wrapper for concrete single-image world generators used by
pipeline/generate-memory-world.mjs.

Current supported backends:
- worldgen
- vistadream

This script intentionally keeps backend-specific imports inside each runner
so `--help` works even when the heavy dependencies are not installed.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a single-image world-model backend")
    parser.add_argument("--backend", required=True, choices=["worldgen", "vistadream"])
    parser.add_argument("--input", required=True, help="Absolute path to the primary input image")
    parser.add_argument("--subject-input", dest="subject_input", default=None, help="Optional original subject photo preserved for later subject-pass workflows")
    parser.add_argument("--mask", default=None, help="Optional subject mask path aligned with the original photo")
    parser.add_argument("--output", required=True, help="Absolute path to the target world directory")
    parser.add_argument("--generated-views", dest="generated_views", default=None, help="Optional directory for generated support views")
    parser.add_argument("--scene-id", dest="scene_id", default=None)
    parser.add_argument("--world-family", dest="world_family", default=os.environ.get("WORLD_MODEL_FAMILY", "pano-first"))
    parser.add_argument("--prompt", default="", help="Optional conditioning prompt")
    parser.add_argument("--seed", type=int, default=int(os.environ.get("WORLD_MODEL_SEED", "42")))
    parser.add_argument("--resolution", type=int, default=int(os.environ.get("WORLD_MODEL_RESOLUTION", "1600")))
    parser.add_argument("--low-vram", action="store_true")
    parser.add_argument("--use-sharp", action="store_true", default=os.environ.get("WORLDGEN_USE_SHARP", "1") != "0")
    parser.add_argument("--no-sharp", action="store_true")
    parser.add_argument("--inpaint-bg", action="store_true", default=os.environ.get("WORLDGEN_INPAINT_BG", "0") == "1")
    parser.add_argument("--no-inpaint-bg", action="store_true")
    return parser.parse_args()


def ensure_dir(path: str | None) -> None:
    if path:
        Path(path).mkdir(parents=True, exist_ok=True)


def should_clean_subject_from_pano(args: argparse.Namespace) -> bool:
    configured = os.environ.get("WORLDGEN_CLEAN_PANO_SUBJECT", "1").strip().lower()
    if configured in {"0", "false", "no", "off"}:
        return False
    return bool(args.mask and Path(args.mask).exists())


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
        from PIL import Image, ImageFilter
        import numpy as np
        import torch
        from worldgen import WorldGen
        from worldgen.pano_depth import pred_depth
        from worldgen.pano_inpaint import build_inpaint_model, inpaint_pano
        from worldgen.pano_gen import gen_pano_fill_image
        from worldgen.pano_sharp import predict_equirectangular
        from worldgen.utils.general_utils import map_image_to_pano, resize_img
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

    use_sharp = bool(args.use_sharp and not args.no_sharp)
    inpaint_bg = bool(args.inpaint_bg and not args.no_inpaint_bg)

    world = WorldGen(
        mode="i2s",
        device=device,
        use_sharp=use_sharp,
        inpaint_bg=inpaint_bg,
        resolution=args.resolution,
        low_vram=low_vram,
    )
    # WorldGen's current upstream sharp path imports this helper in __init__
    # but doesn't retain it for later use inside _generate_world.
    if use_sharp and not hasattr(world, "predict_equirectangular"):
        world.predict_equirectangular = predict_equirectangular

    image = Image.open(image_path).convert("RGB")

    resized_image = resize_img(image)
    predictions = pred_depth(world.depth_model, resized_image)
    pano_cond_img, cond_mask = map_image_to_pano(predictions, device=world.device)
    pano_image = gen_pano_fill_image(
        world.pano_gen_model,
        image=pano_cond_img,
        mask=cond_mask,
        prompt=args.prompt or "",
        seed=args.seed,
        height=args.resolution // 2,
        width=args.resolution,
    )

    map_height, map_width = pano_cond_img.height, pano_cond_img.width
    pano_image = pano_image.resize((map_width, map_height))
    pano_cond_img_np = np.array(pano_cond_img)
    cond_mask_np = np.array(cond_mask) / 255.0
    pano_image = np.array(pano_image) * cond_mask_np[:, :, None] + pano_cond_img_np * (1 - cond_mask_np[:, :, None])
    pano_image = Image.fromarray(pano_image.astype(np.uint8))

    if should_clean_subject_from_pano(args):
        mask_path = Path(args.mask).resolve()
        mask_image = Image.open(mask_path).convert("L").resize(image.size, Image.Resampling.BILINEAR)
        resized_mask = mask_image.resize(resized_image.size, Image.Resampling.BILINEAR)

        mask_array = np.array(resized_mask)
        mask_rgb = np.repeat(mask_array[:, :, None], 3, axis=2)
        mask_predictions = {
            **predictions,
            "rgb": torch.from_numpy(mask_rgb).to(predictions["rgb"].device),
        }
        pano_mask_image, _ = map_image_to_pano(mask_predictions, device=world.device)
        pano_mask = pano_mask_image.convert("L").point(lambda value: 255 if value > 24 else 0, mode="L")
        pano_mask = pano_mask.filter(ImageFilter.MaxFilter(size=31))

        inpaint_model = build_inpaint_model(device=device)
        pano_image = inpaint_pano(inpaint_model, pano_image, (np.array(pano_mask) > 0).astype(np.uint8))
        pano_image.save(output_dir / "scene.pano.cleaned.png")
        pano_mask.save(output_dir / "scene.pano.subject-mask.png")

    splat = world._generate_world(pano_image, return_mesh=False)
    splat.save(str(output_path))

    print(
        "[worldgen] Generated scene.ply\n"
        f"scene_id={args.scene_id or ''}\n"
        f"input={image_path}\n"
        f"subject_input={args.subject_input or ''}\n"
        f"mask={args.mask or ''}\n"
        f"output={output_path}\n"
        f"world_family={args.world_family or ''}\n"
        f"seed={args.seed}\n"
        f"resolution={args.resolution}\n"
        f"use_sharp={use_sharp}\n"
        f"inpaint_bg={inpaint_bg}\n"
        f"prompt={args.prompt}"
    )
    return 0


def run_vistadream(_: argparse.Namespace) -> int:
    args = _
    vistadream_root = Path(os.environ.get("VISTADREAM_ROOT", ROOT / "_experiments" / "VistaDream")).resolve()
    if not (vistadream_root / "demo.py").exists():
        print(
            "[vistadream] Could not find the local VistaDream checkout.\n"
            f"Expected: {vistadream_root}\n"
            "Set VISTADREAM_ROOT to a valid VistaDream repository root.",
            file=sys.stderr,
        )
        return 5

    required_assets = {
        "DepthPro": vistadream_root / "tools" / "DepthPro" / "checkpoints" / "depth_pro.pt",
        "OneFormer": vistadream_root / "tools" / "OneFormer" / "checkpoints" / "coco_pretrain_1280x1280_150_16_dinat_l_oneformer_ade20k_160k.pth",
        "LCM": vistadream_root / "tools" / "StableDiffusion" / "lcm_ckpt" / "pytorch_lora_weights.safetensors",
        "Fooocus checkpoint": vistadream_root / "tools" / "Fooocus" / "models" / "checkpoints" / "juggernautXL_v8Rundiffusion.safetensors",
        "Fooocus inpaint": vistadream_root / "tools" / "Fooocus" / "models" / "inpaint" / "inpaint_v26.fooocus.patch",
        "Fooocus prompt expansion": vistadream_root / "tools" / "Fooocus" / "models" / "prompt_expansion" / "fooocus_expansion" / "pytorch_model.bin",
    }
    missing_assets = [f"{name}: {path}" for name, path in required_assets.items() if not path.exists()]
    if missing_assets:
        print(
            "[vistadream] Required pretrained assets are missing.\n"
            "Run `_experiments/VistaDream/download_weights.sh` inside a Linux env that can access the repo.\n"
            + "\n".join(missing_assets),
            file=sys.stderr,
        )
        return 6

    sys.path.insert(0, str(vistadream_root))

    try:
        import torch
        from PIL import Image
        from omegaconf import OmegaConf
        from ops.utils import save_ply
        from pipe.c2f_recons import Pipeline
        from pipe.cfgs import load_cfg
    except Exception as exc:  # pragma: no cover - dependency discovery path
        print(
            "[vistadream] Failed to import VistaDream dependencies.\n"
            f"VistaDream root: {vistadream_root}\n"
            "VistaDream expects a Linux GPU environment close to its documented stack (Python 3.10, CUDA, PyTorch 2.1).\n"
            "Set WORLD_MODEL_CAMERA_GUIDED_BACKEND=vistadream and run through a configured Linux/WSL env.\n"
            f"Import error: {exc}",
            file=sys.stderr,
        )
        return 7

    ensure_dir(args.output)
    ensure_dir(args.generated_views)

    image_path = Path(args.input).resolve()
    if not image_path.exists():
        print(f"[vistadream] Input image not found: {image_path}", file=sys.stderr)
        return 8

    output_dir = Path(args.output).resolve()
    working_dir = output_dir / "vistadream"
    working_dir.mkdir(parents=True, exist_ok=True)
    input_copy_path = working_dir / "color.png"

    Image.open(image_path).convert("RGB").save(input_copy_path)

    base_cfg_path = Path(
        os.environ.get("VISTADREAM_BASE_CFG", vistadream_root / "pipe" / "cfgs" / "basic.yaml"),
    ).resolve()
    if not base_cfg_path.exists():
        print(f"[vistadream] Base config not found: {base_cfg_path}", file=sys.stderr)
        return 9

    cfg = load_cfg(str(base_cfg_path))
    cfg.scene.input.rgb = input_copy_path.as_posix()
    cfg.scene.input.resize_long_edge = int(
        os.environ.get(
            "VISTADREAM_INPUT_LONG_EDGE",
            str(max(512, min(768, int(args.resolution * 0.4)))),
        ),
    )
    cfg.scene.outpaint.seed = int(args.seed)
    cfg.scene.traj.traj_type = os.environ.get("VISTADREAM_TRAJ_TYPE", "spiral")
    cfg.scene.traj.n_sample = int(
        os.environ.get("VISTADREAM_TRAJ_SAMPLES", "8" if args.low_vram else "12"),
    )
    cfg.scene.traj.near_percentage = int(os.environ.get("VISTADREAM_TRAJ_NEAR_PERCENTAGE", "8"))
    cfg.scene.traj.far_percentage = int(
        os.environ.get(
            "VISTADREAM_TRAJ_FAR_PERCENTAGE",
            "86" if args.world_family == "structured-anchor" else "92",
        ),
    )
    cfg.scene.traj.traj_forward_ratio = float(
        os.environ.get(
            "VISTADREAM_TRAJ_FORWARD_RATIO",
            "0.38" if args.world_family == "structured-anchor" else "0.45",
        ),
    )
    cfg.scene.traj.traj_backward_ratio = float(
        os.environ.get(
            "VISTADREAM_TRAJ_BACKWARD_RATIO",
            "0.62" if args.world_family == "structured-anchor" else "0.55",
        ),
    )
    cfg.scene.mcs.steps = int(os.environ.get("VISTADREAM_MCS_STEPS", "8" if args.low_vram else "10"))
    cfg.scene.mcs.n_view = int(os.environ.get("VISTADREAM_MCS_N_VIEW", "4" if args.low_vram else "8"))
    cfg.scene.mcs.gsopt_iters = int(
        os.environ.get("VISTADREAM_MCS_GSOPT_ITERS", "128" if args.low_vram else "256"),
    )

    config_path = working_dir / "config.generated.yaml"
    OmegaConf.save(config=cfg, f=str(config_path))

    previous_cwd = Path.cwd()
    try:
        os.chdir(vistadream_root)
        pipeline = Pipeline(cfg)
        pipeline()
    finally:
        os.chdir(previous_cwd)

    scene_pth_path = working_dir / "scene.pth"
    if not scene_pth_path.exists():
        print(
            "[vistadream] VistaDream finished without producing scene.pth.\n"
            f"Expected: {scene_pth_path}",
            file=sys.stderr,
        )
        return 10

    scene = torch.load(scene_pth_path, map_location="cpu")
    output_ply_path = output_dir / "scene.ply"
    save_ply(scene, str(output_ply_path))

    artifact_copies = {
        working_dir / "scene.pth": output_dir / "scene.vistadream.pth",
        working_dir / "video_rgb.mp4": output_dir / "vistadream.video_rgb.mp4",
        working_dir / "video_dpt.mp4": output_dir / "vistadream.video_dpt.mp4",
        config_path: output_dir / "vistadream.config.generated.yaml",
    }
    for source_path, target_path in artifact_copies.items():
        if source_path.exists():
            shutil.copy2(source_path, target_path)

    metadata = {
        "sceneId": args.scene_id or None,
        "worldFamily": args.world_family or None,
        "prompt": args.prompt or None,
        "seed": int(args.seed),
        "resolution": int(args.resolution),
        "input": str(image_path),
        "workingDir": str(working_dir),
        "config": str(output_dir / "vistadream.config.generated.yaml"),
        "scenePth": str(output_dir / "scene.vistadream.pth"),
        "output": str(output_ply_path),
    }
    (output_dir / "scene.vistadream.meta.json").write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "[vistadream] Generated scene.ply\n"
        f"scene_id={args.scene_id or ''}\n"
        f"input={image_path}\n"
        f"subject_input={args.subject_input or ''}\n"
        f"mask={args.mask or ''}\n"
        f"output={output_ply_path}\n"
        f"world_family={args.world_family or ''}\n"
        f"seed={args.seed}\n"
        f"resolution={args.resolution}\n"
        f"config={output_dir / 'vistadream.config.generated.yaml'}\n"
        f"scene_pth={output_dir / 'scene.vistadream.pth'}\n"
        f"prompt={args.prompt}"
    )
    return 0


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
