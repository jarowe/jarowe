#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Meta SAM 3D Body on a single image and export a subject mesh."
    )
    parser.add_argument("--input", required=True, help="Input image path")
    parser.add_argument("--mask", default=None, help="Optional subject mask path")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--repo-root", default=None, help="Path to local sam-3d-body checkout")
    parser.add_argument("--checkpoint-path", default=None, help="Path to model.ckpt")
    parser.add_argument("--mhr-path", default=None, help="Path to mhr_model.pt")
    parser.add_argument("--detector-name", default=None, help="Detector name override")
    parser.add_argument("--segmentor-name", default=None, help="Segmentor name override")
    parser.add_argument("--fov-name", default=None, help="FOV estimator override")
    parser.add_argument("--bbox-thresh", type=float, default=0.8, help="Human detector bbox threshold")
    parser.add_argument("--person-index", type=int, default=0, help="Which detected person to export")
    parser.add_argument("--use-mask", action="store_true", help="Enable mask-conditioned inference")
    return parser.parse_args()


def resolve_repo_root(cli_value: str | None) -> Path:
    if cli_value:
        return Path(cli_value).resolve()

    default_repo = Path(__file__).resolve().parents[1] / "_experiments" / "sam-3d-body"
    return default_repo.resolve()


def ensure_sys_path(repo_root: Path) -> None:
    repo_str = str(repo_root)
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)


def resolve_checkpoint_paths(repo_root: Path, checkpoint_path: str | None, mhr_path: str | None) -> tuple[Path, Path]:
    checkpoint = Path(
        checkpoint_path
        or os.environ.get("SAM3D_BODY_CHECKPOINT", "")
        or repo_root / "checkpoints" / "sam-3d-body-dinov3" / "model.ckpt"
    )
    mhr = Path(
        mhr_path
        or os.environ.get("SAM3D_BODY_MHR_PATH", "")
        or repo_root / "checkpoints" / "sam-3d-body-dinov3" / "assets" / "mhr_model.pt"
    )
    return checkpoint.resolve(), mhr.resolve()


def load_mask(mask_path: Path):
    import cv2
    import numpy as np

    mask_image = cv2.imread(str(mask_path), cv2.IMREAD_UNCHANGED)
    if mask_image is None:
        raise RuntimeError(f"Could not read mask image: {mask_path}")
    if mask_image.ndim == 3:
        mask_image = mask_image[:, :, 0]
    mask_binary = (mask_image > 127).astype(np.uint8)
    return np.expand_dims(mask_binary, axis=0)


def bbox_from_mask(masks):
    import numpy as np

    if masks is None or len(masks) == 0:
        return None
    mask = masks[0]
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError("Provided subject mask is empty")
    return np.array([[float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())]], dtype=np.float32)


def export_subject_mesh(outputs, faces, output_dir: Path, person_index: int) -> dict:
    import cv2
    import numpy as np
    import trimesh
    from sam_3d_body.visualization.renderer import Renderer

    if not outputs:
        raise RuntimeError("SAM 3D Body returned no people for this image")
    if person_index < 0 or person_index >= len(outputs):
        raise RuntimeError(f"person_index {person_index} is out of range for {len(outputs)} detected people")

    person = outputs[person_index]
    vertices = np.asarray(person["pred_vertices"], dtype=np.float32)
    camera_translation = np.asarray(person["pred_cam_t"], dtype=np.float32)
    mesh = trimesh.Trimesh(vertices + camera_translation, faces.copy(), process=False)

    rot_y = trimesh.transformations.rotation_matrix(np.radians(180), [1, 0, 0])
    mesh.apply_transform(rot_y)
    mesh.export(output_dir / "subject.glb")

    renderer = Renderer(focal_length=float(person["focal_length"]), faces=faces.copy())
    preview = renderer.render_rgba(
        vertices=vertices,
        cam_t=camera_translation,
        mesh_base_color=(0.93, 0.9, 0.82),
        scene_bg_color=(0, 0, 0),
        render_res=[512, 512],
    )
    cv2.imwrite(str(output_dir / "subject.preview.png"), preview.astype(np.uint8))

    result = {
        "personIndex": person_index,
        "detectedPeople": len(outputs),
        "bbox": np.asarray(person["bbox"]).tolist(),
        "focalLength": float(person["focal_length"]),
        "vertexCount": int(vertices.shape[0]),
        "faceCount": int(faces.shape[0]),
        "usedMaskConditioning": person.get("mask") is not None,
    }
    with open(output_dir / "subject.meta.json", "w", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2)
        handle.write("\n")
    return result


def main() -> int:
    args = parse_args()
    repo_root = resolve_repo_root(args.repo_root)
    if not repo_root.exists():
        raise RuntimeError(f"SAM 3D Body repo not found: {repo_root}")

    ensure_sys_path(repo_root)

    checkpoint_path, mhr_path = resolve_checkpoint_paths(repo_root, args.checkpoint_path, args.mhr_path)
    if not checkpoint_path.exists():
        raise RuntimeError(
            "SAM 3D Body checkpoint not found. "
            f"Expected: {checkpoint_path}. "
            "Set SAM3D_BODY_CHECKPOINT or pass --checkpoint-path after downloading the Hugging Face checkpoint."
        )
    if not mhr_path.exists():
        raise RuntimeError(
            "SAM 3D Body MHR asset not found. "
            f"Expected: {mhr_path}. "
            "Set SAM3D_BODY_MHR_PATH or pass --mhr-path after downloading the Hugging Face assets."
        )

    input_path = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    from sam_3d_body import SAM3DBodyEstimator, load_sam_3d_body

    import torch

    device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
    model, model_cfg = load_sam_3d_body(str(checkpoint_path), device=device, mhr_path=str(mhr_path))

    detector_name = args.detector_name if args.detector_name is not None else os.environ.get("SAM3D_BODY_DETECTOR", "vitdet")
    segmentor_name = args.segmentor_name if args.segmentor_name is not None else os.environ.get("SAM3D_BODY_SEGMENTOR", "sam2")
    fov_name = args.fov_name if args.fov_name is not None else os.environ.get("SAM3D_BODY_FOV", "moge2")

    human_detector = None
    human_segmentor = None
    fov_estimator = None

    if detector_name and detector_name.lower() not in {"none", "off"}:
        from tools.build_detector import HumanDetector

        detector_path = os.environ.get("SAM3D_DETECTOR_PATH", "")
        human_detector = HumanDetector(name=detector_name, device=device, path=detector_path)

    if segmentor_name and segmentor_name.lower() not in {"none", "off"}:
        from tools.build_sam import HumanSegmentor

        segmentor_path = os.environ.get("SAM3D_SEGMENTOR_PATH", "")
        if segmentor_name != "sam2" or segmentor_path:
            human_segmentor = HumanSegmentor(name=segmentor_name, device=device, path=segmentor_path)

    if fov_name and fov_name.lower() not in {"none", "off"}:
        from tools.build_fov_estimator import FOVEstimator

        fov_path = os.environ.get("SAM3D_FOV_PATH", "")
        fov_estimator = FOVEstimator(name=fov_name, device=device, path=fov_path)

    estimator = SAM3DBodyEstimator(
        sam_3d_body_model=model,
        model_cfg=model_cfg,
        human_detector=human_detector,
        human_segmentor=human_segmentor,
        fov_estimator=fov_estimator,
    )

    masks = None
    bboxes = None
    use_mask = args.use_mask
    if args.mask:
        mask_path = Path(args.mask).resolve()
        if not mask_path.exists():
            raise RuntimeError(f"Mask file not found: {mask_path}")
        masks = load_mask(mask_path)
        bboxes = bbox_from_mask(masks)
        use_mask = True
        shutil.copyfile(mask_path, output_dir / "subject.mask.png")

    results = estimator.process_one_image(
        str(input_path),
        bboxes=bboxes,
        masks=masks,
        bbox_thr=args.bbox_thresh,
        use_mask=use_mask,
    )
    subject_meta = export_subject_mesh(results, estimator.faces, output_dir, args.person_index)

    summary = {
        "backend": "sam3d-body",
        "input": str(input_path),
        "output": str(output_dir),
        "checkpoint": str(checkpoint_path),
        "mhrPath": str(mhr_path),
        "detector": detector_name,
        "segmentor": segmentor_name,
        "fovEstimator": fov_name,
        "usedMask": use_mask,
        "subject": subject_meta,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
