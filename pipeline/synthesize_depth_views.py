#!/usr/bin/env python

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def parse_args():
    parser = argparse.ArgumentParser(description="Create synthetic view images from a photo + depth map.")
    parser.add_argument("--photo", required=True)
    parser.add_argument("--depth", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--mask")
    return parser.parse_args()


def load_rgb(path):
    image = Image.open(path).convert("RGB")
    return image, np.asarray(image, dtype=np.uint8)


def load_depth(path, size):
    depth = Image.open(path).convert("L").resize(size, Image.Resampling.BILINEAR)
    array = np.asarray(depth, dtype=np.float32) / 255.0
    return np.power(array, 1.35)


def load_mask(path, size):
    if not path:
      return None
    mask = Image.open(path).convert("L").resize(size, Image.Resampling.BILINEAR)
    return np.asarray(mask, dtype=np.float32) / 255.0


def synthesize_view(rgb, depth, dx, dy, mask=None):
    height, width, _ = rgb.shape
    yy, xx = np.mgrid[0:height, 0:width]

    depth_weight = 0.14 + depth * 0.86
    if mask is not None:
        depth_weight = np.clip(depth_weight + mask * 0.18, 0.0, 1.2)

    target_x = np.rint(xx + dx * depth_weight).astype(np.int32)
    target_y = np.rint(yy + dy * depth_weight).astype(np.int32)

    valid = (
        (target_x >= 0)
        & (target_x < width)
        & (target_y >= 0)
        & (target_y < height)
    )

    output = np.zeros_like(rgb)
    coverage = np.zeros((height, width), dtype=np.float32)
    flat_depth = depth.reshape(-1)
    draw_order = np.argsort(flat_depth)

    flat_rgb = rgb.reshape(-1, 3)
    flat_valid = valid.reshape(-1)
    flat_target_x = target_x.reshape(-1)
    flat_target_y = target_y.reshape(-1)

    for source_index in draw_order:
        if not flat_valid[source_index]:
            continue
        tx = flat_target_x[source_index]
        ty = flat_target_y[source_index]
        output[ty, tx] = flat_rgb[source_index]
        coverage[ty, tx] = 1.0

    blurred = np.asarray(
        Image.fromarray(rgb).filter(ImageFilter.GaussianBlur(radius=10)),
        dtype=np.uint8,
    )
    missing = coverage < 0.5
    output[missing] = blurred[missing]

    return Image.fromarray(output, mode="RGB")


def main():
    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    image, rgb = load_rgb(args.photo)
    depth = load_depth(args.depth, image.size)
    mask = load_mask(args.mask, image.size)

    width, height = image.size
    dx = max(18, int(width * 0.075))
    dy = max(14, int(height * 0.06))

    views = [
        ("depth-left.png", -dx, 0),
        ("depth-right.png", dx, 0),
        ("depth-up.png", 0, -dy),
        ("depth-down.png", 0, dy),
    ]

    for filename, offset_x, offset_y in views:
        synthesized = synthesize_view(rgb, depth, offset_x, offset_y, mask=mask)
        synthesized.save(output_dir / filename)

    print(f"Wrote {len(views)} synthetic depth views to {output_dir}")


if __name__ == "__main__":
    main()
