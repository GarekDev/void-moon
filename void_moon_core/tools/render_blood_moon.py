"""Pack captured blood-moon frames into the HUD flipbook atlas + UV JSON."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

FRAME = 192
FRAMES = 60
COLS = 8
PAD = 2
GAP = 4
CELL = FRAME + GAP
ROWS = math.ceil(FRAMES / COLS)
FPS = 15
UV_DURATION = 1.0 / FPS
HOLD_DURATION = 0.4
FADE_DURATION = 1.2
VISIBLE_DURATION = (FRAMES - 1) * UV_DURATION + HOLD_DURATION

CORE = Path(__file__).resolve().parents[1]
SRC_DIR = Path(__file__).resolve().parent / "blood_moon_src"
ATLAS_PATH = CORE / "resource_pack" / "textures" / "ui" / "voidmoon" / "blood_moon.png"
OVERLAY_PATH = CORE / "resource_pack" / "ui" / "vm_overlay.json"
PREVIEW_DIR = Path(__file__).resolve().parent


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
    if img.size != (FRAME, FRAME):
        img = img.resize((FRAME, FRAME), Image.Resampling.NEAREST)
        img = binary_alpha(img, cut=48)
    return img


def pack_atlas(frames: list[Image.Image]) -> Image.Image:
    w = COLS * CELL + PAD
    h = ROWS * CELL + PAD
    atlas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        col, row = i % COLS, i // COLS
        atlas.paste(fr, (PAD + col * CELL, PAD + row * CELL))
    return atlas


def uv_box(i: int) -> list[int]:
    col, row = i % COLS, i // COLS
    x = PAD + col * CELL
    y = PAD + row * CELL
    return [x, y, x + FRAME, y + FRAME]


def write_overlay_json() -> dict:
    overlay: dict = {"namespace": "vm_overlay"}
    for i in range(FRAMES):
        box = uv_box(i)
        node: dict = {
            "anim_type": "uv",
            "duration": UV_DURATION,
            "from": box,
            "to": box,
        }
        if i + 1 < FRAMES:
            node["next"] = f"@vm_overlay.blood_frame_{i + 1}"
        else:
            node["duration"] = HOLD_DURATION
        overlay[f"blood_frame_{i}"] = node

    overlay["lifetime"] = {
        "anim_type": "alpha",
        "duration": VISIBLE_DURATION,
        "from": 1,
        "to": 1,
        "next": "@vm_overlay.fade_out",
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
        "size": ["92%y", "92%"],
        "offset": [0, 0],
        "anchor_from": "center",
        "anchor_to": "center",
        "layer": 1000,
        "alpha": "@vm_overlay.lifetime",
        "propagate_alpha": True,
        "disable_anim_fast_forward": True,
        "controls": [
            {
                "continuous_image": {
                    "type": "image",
                    "texture": "textures/ui/voidmoon/blood_moon",
                    "size": ["100%", "100%"],
                    "anchor_from": "center",
                    "anchor_to": "center",
                    "uv": "@vm_overlay.blood_frame_0",
                    "uv_size": [FRAME, FRAME],
                    "alpha": 1,
                    "disable_anim_fast_forward": True,
                    "layer": 1000,
                }
            }
        ],
    }
    return overlay


def load_src_frames() -> list[Image.Image]:
    files = sorted(SRC_DIR.glob("f*.png"))
    if len(files) < FRAMES:
        raise SystemExit(f"need {FRAMES} captures in {SRC_DIR}, got {len(files)}")
    return [fit_frame(Image.open(p)) for p in files[:FRAMES]]


def main() -> None:
    print(f"packing {FRAMES} frames from {SRC_DIR}…")
    frames = load_src_frames()
    atlas = pack_atlas(frames)
    ATLAS_PATH.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_PATH)
    OVERLAY_PATH.parent.mkdir(parents=True, exist_ok=True)
    OVERLAY_PATH.write_text(
        json.dumps(write_overlay_json(), indent=2) + "\n",
        encoding="utf-8",
    )
    for name, idx in (
        ("blood_moon_f0.png", 0),
        ("blood_moon_fmid.png", FRAMES // 2),
        ("blood_moon_fend.png", FRAMES - 1),
    ):
        frames[idx].resize((FRAME * 2, FRAME * 2), Image.Resampling.NEAREST).save(PREVIEW_DIR / name)
    print(f"wrote {ATLAS_PATH} {atlas.size}")
    print(f"wrote {OVERLAY_PATH}")


if __name__ == "__main__":
    main()
