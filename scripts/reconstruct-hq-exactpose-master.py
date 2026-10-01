#!/usr/bin/env python3
"""RC33 pose-locked HQ master reconstruction.

Builds a high-resolution authored master from the authoritative in-game sprite
WITHOUT changing pose, facing, silhouette, ground line, or limb arrangement.
The alpha silhouette is derived only from the original sprite. RGB detail is
reconstructed with premultiplied-alpha edge-aware upsampling, local contrast,
and restrained sharpening.

This is intentionally conservative: pose fidelity is more important than
inventing new anatomy/details.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
MASTER_SIZE = (1024, 1280)
PILOTS = ('RYU','CHUNLI','KEN','IBUKI')


def to_premultiplied(rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    rgb = rgba[..., :3].astype(np.float32) / 255.0
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    return rgb * a, a


def from_premultiplied(prgb: np.ndarray, a: np.ndarray) -> np.ndarray:
    rgb = np.divide(prgb, np.maximum(a, 1e-5), out=np.zeros_like(prgb), where=a > 1e-5)
    rgba = np.concatenate([np.clip(rgb,0,1), np.clip(a,0,1)], axis=2)
    return np.round(rgba * 255).astype(np.uint8)


def upscale_exact_pose(src: Image.Image, factor: int = 6) -> Image.Image:
    rgba = np.array(src.convert('RGBA'))
    prgb, alpha = to_premultiplied(rgba)
    h, w = rgba.shape[:2]
    size = (w*factor, h*factor)

    # Smooth color reconstruction in premultiplied space prevents dark/white halos.
    prgb_up = cv2.resize(prgb, size, interpolation=cv2.INTER_CUBIC)
    alpha_soft = cv2.resize(alpha[...,0], size, interpolation=cv2.INTER_CUBIC)[...,None]

    # Preserve the authoritative silhouette envelope. Nearest alpha means the
    # visible subject remains the same pose at integer source-pixel scale.
    alpha_lock = cv2.resize(alpha[...,0], size, interpolation=cv2.INTER_NEAREST)[...,None]
    # Retain soft source anti-aliasing only inside the locked silhouette.
    a = np.minimum(np.maximum(alpha_soft, alpha_lock * 0.92), np.where(alpha_lock > 0.01, 1.0, 0.0))

    straight = from_premultiplied(prgb_up, np.maximum(alpha_soft, 1e-5))
    rgb = straight[..., :3]

    # Edge-aware color cleanup. This smooths block stair-steps while preserving
    # existing folds, face masses and glove/garment boundaries.
    rgb = cv2.bilateralFilter(rgb, d=7, sigmaColor=24, sigmaSpace=3)

    # Mild local contrast in LAB; deliberately restrained to preserve the source style.
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    l, aa, bb = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.25, tileGridSize=(10,10))
    l2 = clahe.apply(l)
    l = cv2.addWeighted(l, 0.74, l2, 0.26, 0)
    rgb = cv2.cvtColor(cv2.merge([l,aa,bb]), cv2.COLOR_LAB2RGB)

    # Multi-radius unsharp mask: small amount only, no artificial outlines.
    blur1 = cv2.GaussianBlur(rgb, (0,0), 0.8)
    sharp = cv2.addWeighted(rgb, 1.20, blur1, -0.20, 0)
    blur2 = cv2.GaussianBlur(sharp, (0,0), 1.8)
    sharp = cv2.addWeighted(sharp, 1.10, blur2, -0.10, 0)

    # Re-premultiply then restore locked alpha to avoid fringe contamination.
    a3 = a if a.ndim == 3 else a[...,None]
    out_rgb = np.round(np.clip(sharp.astype(np.float32)/255.0,0,1)*255).astype(np.uint8)
    out_a = np.round(np.clip(a3[...,0],0,1)*255).astype(np.uint8)
    out = np.dstack([out_rgb, out_a])
    return Image.fromarray(out, 'RGBA')


def build_master(char: str) -> Path:
    slug = char.lower()
    src_path = ROOT/'public/art/combat-sprites'/f'{slug}.webp'
    src = Image.open(src_path).convert('RGBA')
    hi = upscale_exact_pose(src, 6)
    bbox = hi.getchannel('A').getbbox()
    if not bbox:
        raise RuntimeError('empty alpha')
    subject = hi.crop(bbox)

    # Fit subject into a 1024x1280 transparent authoring canvas while keeping
    # aspect and exact pose. The registration step later aligns ground/center.
    max_w, max_h = 820, 1120
    scale = min(max_w/subject.width, max_h/subject.height)
    subject = subject.resize((round(subject.width*scale), round(subject.height*scale)), Image.Resampling.LANCZOS)

    master = Image.new('RGBA', MASTER_SIZE, (0,0,0,0))
    x = (MASTER_SIZE[0]-subject.width)//2
    ground = 1180
    y = ground - subject.height
    master.alpha_composite(subject, (x,y))

    version = 'v02' if char == 'RYU' else 'v01'
    out = ROOT/'art-source/hq-character-masters'/slug/f'{slug}_master_base_{version}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    master.save(out, optimize=True)
    return out


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('characters', nargs='+', choices=PILOTS)
    args=ap.parse_args()
    for char in args.characters:
        out=build_master(char)
        print(f'{char}: {out}')

if __name__ == '__main__':
    main()
