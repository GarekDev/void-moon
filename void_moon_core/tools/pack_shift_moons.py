"""Pack green/yellow moon captures into full-height HUD flipbook atlases."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

FRAME_W = 192
FRAME_H = 256
FRAMES = 60
COLS = 10
PAD = 2
GAP = 4
CELL_W = FRAME_W + GAP
CELL_H = FRAME_H + GAP
ROWS = math.ceil(FRAMES / COLS)
FPS = 15
UV_DURATION = 1.0 / FPS
HOLD_DURATION = 0.4
FADE_DURATION = 1.2
VISIBLE_DURATION = (FRAMES - 1) * UV_DURATION + HOLD_DURATION
# Full HUD height so the stream starts at the top of the screen.
# Width keeps the 192/256 aspect (moon ~69% of HUD height).
HUD_SIZE = ["75%y", "100%"]

CORE = Path(__file__).resolve().parents[1]
TOOLS = Path(__file__).resolve().parent
TEX = CORE / "resource_pack" / "textures" / "ui" / "voidmoon"
UI = CORE / "resource_pack" / "ui"

JOBS = (
    {
        "src": TOOLS / "green_moon_src",
        "atlas": TEX / "green_moon.png",
        "overlay": UI / "vm_green.json",
        "ns": "vm_green",
        "frame": "green_frame",
        "texture": "textures/ui/voidmoon/green_moon",
        "preview": "green_moon",
    },
    {
        "src": TOOLS / "yellow_moon_src",
        "atlas": TEX / "yellow_moon.png",
        "overlay": UI / "vm_yellow.json",
        "ns": "vm_yellow",
        "frame": "yellow_frame",
        "texture": "textures/ui/voidmoon/yellow_moon",
        "preview": "yellow_moon",
    },
)


def binary_alpha(img: Image.Image, cut: int = 40) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= cut else (0, 0, 0, 0)
    return img


def fit_frame(src: Image.Image) -> Image.Image:
    img = binary_alpha(src)
    if img.size != (FRAME_W, FRAME_H):
        img = img.resize((FRAME_W, FRAME_H), Image.Resampling.NEAREST)
        img = binary_alpha(img, cut=48)
    return img


def pack_atlas(frames: list[Image.Image]) -> Image.Image:
    w = COLS * CELL_W + PAD
    h = ROWS * CELL_H + PAD
    atlas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        col, row = i % COLS, i // COLS
        atlas.paste(fr, (PAD + col * CELL_W, PAD + row * CELL_H))
    return atlas


def uv_box(i: int) -> list[int]:
    col, row = i % COLS, i // COLS
    x = PAD + col * CELL_W
    y = PAD + row * CELL_H
    return [x, y, x + FRAME_W, y + FRAME_H]


def write_overlay_json(ns: str, frame: str, texture: str) -> dict:
    overlay: dict = {"namespace": ns}
    for i in range(FRAMES):
        box = uv_box(i)
        node: dict = {
            "anim_type": "uv",
            "duration": UV_DURATION,
            "from": box,
            "to": box,
        }
        if i + 1 < FRAMES:
            node["next"] = f"@{ns}.{frame}_{i + 1}"
        else:
            node["duration"] = HOLD_DURATION
        overlay[f"{frame}_{i}"] = node

    overlay["lifetime"] = {
        "anim_type": "alpha",
        "duration": VISIBLE_DURATION,
        "from": 1,
        "to": 1,
        "next": f"@{ns}.fade_out",
    }
    overlay["fade_out"] = {
        "anim_type": "alpha",
        "duration": FADE_DURATION,
        "from": 1,
        "to": 0,
        "easing": "out_quad",
    }
    overlay["sequence"] = {
        "type": "panel",
        "size": HUD_SIZE,
        "offset": [0, 0],
        "anchor_from": "center",
        "anchor_to": "center",
        "layer": 1000,
        "alpha": f"@{ns}.lifetime",
        "propagate_alpha": True,
        "disable_anim_fast_forward": True,
        "controls": [
            {
                "continuous_image": {
                    "type": "image",
                    "texture": texture,
                    "size": ["100%", "100%"],
                    "anchor_from": "center",
                    "anchor_to": "center",
                    "uv": f"@{ns}.{frame}_0",
                    "uv_size": [FRAME_W, FRAME_H],
                    "alpha": 1,
                    "disable_anim_fast_forward": True,
                    "layer": 1000,
                }
            }
        ],
    }
    return overlay


def load_src_frames(src: Path) -> list[Image.Image]:
    files = sorted(src.glob("f*.png"))
    if len(files) < FRAMES:
        raise SystemExit(f"need {FRAMES} captures in {src}, got {len(files)}")
    return [fit_frame(Image.open(p)) for p in files[:FRAMES]]


def pack_job(job: dict) -> None:
    print(f"packing {FRAMES} frames from {job['src']}…")
    frames = load_src_frames(job["src"])
    atlas = pack_atlas(frames)
    job["atlas"].parent.mkdir(parents=True, exist_ok=True)
    atlas.save(job["atlas"])
    job["overlay"].parent.mkdir(parents=True, exist_ok=True)
    job["overlay"].write_text(
        json.dumps(write_overlay_json(job["ns"], job["frame"], job["texture"]), indent=2) + "\n",
        encoding="utf-8",
    )
    for name, idx in (
        (f"{job['preview']}_f0.png", 0),
        (f"{job['preview']}_fmid.png", FRAMES // 2),
        (f"{job['preview']}_fend.png", FRAMES - 1),
    ):
        frames[idx].resize((FRAME_W * 2, FRAME_H * 2), Image.Resampling.NEAREST).save(TOOLS / name)
    print(f"wrote {job['atlas']} {atlas.size}")
    print(f"wrote {job['overlay']}")


def main() -> None:
    for job in JOBS:
        pack_job(job)


if __name__ == "__main__":
    main()
