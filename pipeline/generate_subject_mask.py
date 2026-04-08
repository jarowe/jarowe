from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import remove


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a foreground alpha mask PNG from a source image.",
    )
    parser.add_argument("input", type=Path, help="Input image path")
    parser.add_argument("output", type=Path, help="Output mask PNG path")
    parser.add_argument(
        "--blur",
        type=float,
        default=1.2,
        help="Gaussian blur radius applied to the mask edge",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=12,
        help="Minimum alpha kept in the final mask",
    )
    parser.add_argument(
        "--alpha-matting",
        action="store_true",
        help="Enable rembg alpha matting for harder images",
    )
    parser.add_argument(
        "--crop",
        type=str,
        default=None,
        help="Optional normalized crop x,y,width,height used to isolate the subject before masking",
    )
    return parser


def parse_crop(crop: str | None) -> tuple[float, float, float, float] | None:
    if not crop:
        return None
    parts = [part.strip() for part in crop.split(",")]
    if len(parts) != 4:
        raise ValueError("--crop must be x,y,width,height")
    x, y, width, height = [float(part) for part in parts]
    return (x, y, width, height)


def main() -> int:
    args = build_parser().parse_args()
    input_path = args.input.resolve()
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    crop = parse_crop(args.crop)

    with Image.open(input_path) as image:
        rgba = image.convert("RGBA")
        if crop:
            crop_x, crop_y, crop_w, crop_h = crop
            left = max(0, min(rgba.width - 1, round(crop_x * rgba.width)))
            top = max(0, min(rgba.height - 1, round(crop_y * rgba.height)))
            right = max(left + 1, min(rgba.width, round((crop_x + crop_w) * rgba.width)))
            bottom = max(top + 1, min(rgba.height, round((crop_y + crop_h) * rgba.height)))
            rgba_for_mask = rgba.crop((left, top, right, bottom))
        else:
            left = top = 0
            right = rgba.width
            bottom = rgba.height
            rgba_for_mask = rgba

        mask = remove(
            rgba_for_mask,
            only_mask=True,
            post_process_mask=True,
            alpha_matting=args.alpha_matting,
        )

    if not isinstance(mask, Image.Image):
        raise RuntimeError("rembg did not return a PIL image mask")

    alpha = mask.convert("L")
    if args.blur > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=args.blur))

    if args.threshold > 0:
        alpha = alpha.point(lambda value: 0 if value < args.threshold else value)

    if crop:
        full_mask = Image.new("L", rgba.size, 0)
        full_mask.paste(alpha, (left, top))
        alpha = full_mask

    alpha.save(output_path, format="PNG")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
