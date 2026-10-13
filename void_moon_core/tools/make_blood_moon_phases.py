"""Original 128x64 blood-moon atlas. Vanilla layout: 4x2 of 32x32 phases."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

CELL = 32
COLS, ROWS = 4, 2
CX, CY, R = 15.5, 15.5, 14.2

OUT = (52, 6, 8, 255)
DARK = (96, 10, 14, 255)
MID = (168, 18, 24, 255)
LIT = (214, 36, 32, 255)
HIGH = (255, 92, 72, 255)
CRATER = (72, 6, 10, 255)
CRATER_RIM = (120, 14, 16, 255)

CRATERS = (
    (10, 9, 3),
    (18, 14, 4),
    (8, 20, 2),
    (21, 8, 2),
    (14, 22, 3),
    (22, 20, 2),
    (12, 15, 2),
)

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "resource_pack" / "textures" / "environment"
DEST.mkdir(parents=True, exist_ok=True)


def shade_of(x: int, y: int) -> tuple[int, int, int, int]:
    dx, dy = x - CX, y - CY
    dist = math.sqrt(dx * dx + dy * dy)
    if dist > R:
        return (0, 0, 0, 0)
    if dist > R - 1.05:
        return OUT
    lamp = (-0.45 * dx - 0.55 * dy) / R
    if lamp < -0.38:
        return DARK
    if lamp < -0.05:
        return MID
    if lamp < 0.42:
        return LIT
    return HIGH


def paint_full() -> Image.Image:
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    px = cell.load()
    for y in range(CELL):
        for x in range(CELL):
            px[x, y] = shade_of(x, y)
    for cx, cy, cr in CRATERS:
        for y in range(CELL):
            for x in range(CELL):
                if px[x, y][3] == 0:
                    continue
                d = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if d <= cr - 1:
                    px[x, y] = CRATER
                elif d <= cr:
                    px[x, y] = CRATER_RIM
    return cell


def lit_for_phase(nx: float, phase: int) -> bool:
    if phase == 0:
        return True
    if phase == 4:
        return False
    if phase == 1:
        return nx <= 0.58
    if phase == 2:
        return nx <= 0.04
    if phase == 3:
        return nx <= -0.42
    if phase == 5:
        return nx >= 0.42
    if phase == 6:
        return nx >= -0.04
    if phase == 7:
        return nx >= -0.58
    return True


def mask_phase(full: Image.Image, phase: int) -> Image.Image:
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    src = full.load()
    dst = out.load()
    for y in range(CELL):
        for x in range(CELL):
            pix = src[x, y]
            if pix[3] == 0:
                continue
            nx = (x - CX) / R
            if lit_for_phase(nx, phase):
                dst[x, y] = pix
    return out


def main() -> None:
    full = paint_full()
    atlas = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
    for phase in range(8):
        col, row = phase % COLS, phase // COLS
        atlas.paste(mask_phase(full, phase), (col * CELL, row * CELL))
    png = DEST / "moon_phases.png"
    tga = DEST / "moon_phases.tga"
    atlas.save(png)
    atlas.save(tga)
    preview = atlas.resize((atlas.width * 8, atlas.height * 8), Image.NEAREST)
    preview_path = Path(__file__).resolve().parent / "moon_phases_preview.png"
    preview.save(preview_path)
    print(f"wrote {png} {atlas.size}")
    print(f"wrote {tga}")


if __name__ == "__main__":
    main()
