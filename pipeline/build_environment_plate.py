from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


NEIGHBOR_OFFSETS = (
    (-1, 0),
    (1, 0),
    (0, -1),
    (0, 1),
    (-1, -1),
    (-1, 1),
    (1, -1),
    (1, 1),
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build a subject-erased environment bootstrap image from a source photo and mask.",
    )
    parser.add_argument("input", type=Path, help="Input photo path")
    parser.add_argument("mask", type=Path, help="Foreground mask path")
    parser.add_argument("output", type=Path, help="Output bootstrap image path")
    parser.add_argument(
        "--expand",
        type=int,
        default=24,
        help="Pixels to dilate the foreground mask before filling",
    )
    parser.add_argument(
        "--feather",
        type=float,
        default=16.0,
        help="Gaussian blur radius applied to the composite mask edge",
    )
    parser.add_argument(
        "--blur",
        type=float,
        default=26.0,
        help="Gaussian blur radius applied to the synthesized fill before compositing",
    )
    return parser


def dilate_mask(mask: Image.Image, expand: int) -> Image.Image:
    if expand <= 0:
        return mask
    size = max(3, expand * 2 + 1)
    if size % 2 == 0:
        size += 1
    return mask.filter(ImageFilter.MaxFilter(size=size))


def shift_with_fill(array: np.ndarray, dy: int, dx: int, fill_value: float | int | bool) -> np.ndarray:
    shifted = np.roll(array, shift=(-dy, -dx), axis=(0, 1))
    if dy > 0:
        shifted[-dy:, ...] = fill_value
    elif dy < 0:
        shifted[: abs(dy), ...] = fill_value
    if dx > 0:
        shifted[:, -dx:, ...] = fill_value
    elif dx < 0:
        shifted[:, : abs(dx), ...] = fill_value
    return shifted


def diffuse_fill(image_array: np.ndarray, unknown_mask: np.ndarray) -> np.ndarray:
    result = image_array.astype(np.float32).copy()
    pending = unknown_mask.copy()
    max_iterations = max(result.shape[0], result.shape[1])

    for _ in range(max_iterations):
        if not pending.any():
            break

        known = ~pending
        accum = np.zeros_like(result, dtype=np.float32)
        counts = np.zeros(pending.shape, dtype=np.float32)

        for dy, dx in NEIGHBOR_OFFSETS:
            neighbor_known = shift_with_fill(known, dy, dx, False)
            neighbor_values = shift_with_fill(result, dy, dx, 0.0)
            candidates = pending & neighbor_known
            if not np.any(candidates):
                continue
            accum[candidates] += neighbor_values[candidates]
            counts[candidates] += 1

        fillable = pending & (counts > 0)
        if not np.any(fillable):
            break

        result[fillable] = accum[fillable] / counts[fillable, None]
        pending[fillable] = False

    if pending.any():
        fallback = np.asarray(
            Image.fromarray(image_array.astype(np.uint8), mode="RGB").filter(ImageFilter.GaussianBlur(radius=36)),
            dtype=np.float32,
        )
        result[pending] = fallback[pending]

    return np.clip(result, 0, 255).astype(np.uint8)


def main() -> int:
    args = build_parser().parse_args()
    input_path = args.input.resolve()
    mask_path = args.mask.resolve()
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(input_path) as image:
        rgb = image.convert("RGB")
    with Image.open(mask_path) as image:
        mask = image.convert("L").resize(rgb.size, Image.Resampling.BILINEAR)

    expanded_mask = dilate_mask(mask, args.expand)
    unknown_mask = np.asarray(expanded_mask, dtype=np.uint8) > 16
    image_array = np.asarray(rgb, dtype=np.uint8)

    filled_array = diffuse_fill(image_array, unknown_mask)
    filled_image = Image.fromarray(filled_array, mode="RGB")

    if args.blur > 0:
        softened_fill = filled_image.filter(ImageFilter.GaussianBlur(radius=args.blur))
    else:
        softened_fill = filled_image

    core_mask = dilate_mask(expanded_mask, max(8, args.expand // 2))
    if args.feather > 0:
        core_mask = core_mask.filter(ImageFilter.GaussianBlur(radius=max(6.0, args.feather * 0.8)))
    macro_fill = softened_fill.filter(ImageFilter.GaussianBlur(radius=max(args.blur * 1.35, 24.0)))
    softened_fill = Image.composite(macro_fill, softened_fill, core_mask)

    composite_mask = expanded_mask
    if args.feather > 0:
        composite_mask = composite_mask.filter(ImageFilter.GaussianBlur(radius=args.feather))

    environment_plate = Image.composite(softened_fill, rgb, composite_mask)
    environment_plate.save(output_path, format="PNG")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
