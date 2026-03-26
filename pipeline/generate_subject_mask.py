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
    return parser


def main() -> int:
    args = build_parser().parse_args()
    input_path = args.input.resolve()
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(input_path) as image:
        rgba = image.convert("RGBA")
        mask = remove(
            rgba,
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

    alpha.save(output_path, format="PNG")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
