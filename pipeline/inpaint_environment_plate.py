from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build a subject-erased environment bootstrap image using WorldGen's LaMa inpaint model.",
    )
    parser.add_argument("input", type=Path, help="Input photo path")
    parser.add_argument("mask", type=Path, help="Foreground mask path")
    parser.add_argument("output", type=Path, help="Output bootstrap image path")
    parser.add_argument(
        "--expand",
        type=int,
        default=48,
        help="Pixels to dilate the foreground mask before inpainting",
    )
    parser.add_argument(
        "--feather",
        type=float,
        default=8.0,
        help="Gaussian blur radius applied when compositing the inpainted fill back over the source image",
    )
    parser.add_argument(
        "--bbox-padding",
        type=float,
        default=0.42,
        help="Extra padding around the nonzero mask bounds, as a fraction of the subject bounds, unioned into the inpaint mask",
    )
    return parser


def dilate_mask(mask: Image.Image, expand: int) -> Image.Image:
    if expand <= 0:
        return mask
    size = max(3, expand * 2 + 1)
    if size % 2 == 0:
        size += 1
    return mask.filter(ImageFilter.MaxFilter(size=size))


def configure_worldgen_import_path() -> Path:
    worldgen_root = Path(os.environ.get("WORLDGEN_ROOT", ROOT / "_experiments" / "WorldGen")).resolve()
    worldgen_src = worldgen_root / "src"
    if not worldgen_src.exists():
        raise FileNotFoundError(
            f"WorldGen src directory not found at {worldgen_src}. Set WORLDGEN_ROOT to a valid checkout."
        )
    sys.path.insert(0, str(worldgen_src))
    return worldgen_root


def pad_to_multiple(image: Image.Image, mask: Image.Image, multiple: int = 8) -> tuple[Image.Image, Image.Image, tuple[int, int]]:
    width, height = image.size
    padded_width = ((width + multiple - 1) // multiple) * multiple
    padded_height = ((height + multiple - 1) // multiple) * multiple
    if padded_width == width and padded_height == height:
        return image, mask, (width, height)

    padded_image = Image.new("RGB", (padded_width, padded_height))
    padded_image.paste(image, (0, 0))

    padded_mask = Image.new("L", (padded_width, padded_height), 0)
    padded_mask.paste(mask, (0, 0))
    return padded_image, padded_mask, (width, height)


def expand_mask_bounds(mask: Image.Image, padding_ratio: float) -> Image.Image:
    array = np.array(mask)
    ys, xs = np.nonzero(array > 16)
    if ys.size == 0 or xs.size == 0:
        return mask

    width, height = mask.size
    min_x, max_x = int(xs.min()), int(xs.max())
    min_y, max_y = int(ys.min()), int(ys.max())
    bbox_width = max_x - min_x + 1
    bbox_height = max_y - min_y + 1
    pad_x = max(12, int(bbox_width * max(0.0, padding_ratio)))
    pad_y = max(12, int(bbox_height * max(0.0, padding_ratio * 0.85)))

    left = max(0, min_x - pad_x)
    top = max(0, min_y - pad_y)
    right = min(width, max_x + pad_x + 1)
    bottom = min(height, max_y + pad_y + 1)

    expanded = Image.new("L", mask.size, 0)
    expanded.paste(255, (left, top, right, bottom))
    return ImageChops.lighter(mask, expanded)


def main() -> int:
    args = build_parser().parse_args()
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    configure_worldgen_import_path()

    from worldgen.pano_inpaint import build_inpaint_model, inpaint_image

    with Image.open(args.input.resolve()) as image:
        rgb = image.convert("RGB")
    with Image.open(args.mask.resolve()) as image:
        mask = image.convert("L").resize(rgb.size, Image.Resampling.BILINEAR)

    expanded_mask = dilate_mask(mask, args.expand)
    expanded_mask = expand_mask_bounds(expanded_mask, args.bbox_padding)
    binary_mask = expanded_mask.point(lambda value: 255 if value > 16 else 0, mode="L")

    padded_rgb, padded_mask, original_size = pad_to_multiple(rgb, binary_mask, multiple=8)

    model = build_inpaint_model()
    inpainted = inpaint_image(model, padded_rgb, padded_mask).crop((0, 0, original_size[0], original_size[1]))

    environment_plate = inpainted
    environment_plate.save(output_path, format="PNG")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
