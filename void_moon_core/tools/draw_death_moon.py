"""
name: death_moon
kind: particle
size: 32x32
path: RP/textures/particle/death_moon.png
palette: #1A0408 #4A0C12 #8B1418 #C42822 #E06030 #F0C090 + transparent
silhouette: blood moon disc, craters, top-left light
status: final
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

S = 32
CX, CY, R = 15.5, 15.5, 14.2
PAL = {
    "outline": (22, 4, 8, 255),
    "shadow": (74, 12, 18, 255),
    "base": (139, 20, 24, 255),
    "mid": (196, 40, 34, 255),
    "light": (224, 96, 48, 255),
    "rim": (240, 192, 144, 255),
}
CRATERS = [
    (11, 10, 2.4, "shadow"),
    (20, 12, 1.8, "shadow"),
    (14, 20, 2.1, "shadow"),
    (21, 19, 1.5, "base"),
    (9, 17, 1.3, "base"),
]


def main() -> None:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = img.load()

    def put(x: int, y: int, c: tuple[int, int, int, int]) -> None:
        if 0 <= x < S and 0 <= y < S:
            px[x, y] = c

    for y in range(S):
        for x in range(S):
            dx, dy = x - CX, y - CY
            d = (dx * dx + dy * dy) ** 0.5
            if d > R + 0.55:
                continue
            if d > R - 0.85:
                put(x, y, PAL["outline"])
                continue
            lit = -dx * 0.35 - dy * 0.55
            if lit > 6.5:
                color = PAL["rim"]
            elif lit > 2.2:
                color = PAL["light"]
            elif lit > -1.5:
                color = PAL["mid"]
            elif lit > -5.5:
                color = PAL["base"]
            else:
                color = PAL["shadow"]
            put(x, y, color)

    for cx, cy, cr, key in CRATERS:
        for y in range(S):
            for x in range(S):
                if ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 <= cr:
                    dx, dy = x - CX, y - CY
                    if (dx * dx + dy * dy) ** 0.5 < R - 1.2:
                        put(x, y, PAL[key])

    pack = Path(__file__).resolve().parents[1]
    out_dir = pack / "resource_pack" / "textures" / "particle"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "death_moon.png"
    preview = Path(__file__).resolve().parent / "death_moon_preview.png"
    img.save(out)
    img.resize((S * 8, S * 8), Image.NEAREST).save(preview)
    print(f"wrote {out}")
    print(f"wrote {preview}")


if __name__ == "__main__":
    main()
