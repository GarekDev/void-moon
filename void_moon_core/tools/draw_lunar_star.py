"""
name: lunar_star
kind: item
size: 16x16
path: RP/textures/items/lunar_star.png
shortname: voidmoon:lunar_star
palette: #1A0828 #4A1A78 #7B3AA8 #A86ED4 #D4B4F0 #F4ECFF + transparent
silhouette: 4-pointed star, nether-star sparkle
light: top-left 1px highlight, bottom-right shadow
status: final
"""
from pathlib import Path

from PIL import Image

S = 16
PAL = {
    "outline": (26, 8, 40, 255),
    "shadow": (74, 26, 120, 255),
    "base": (123, 58, 168, 255),
    "mid": (168, 110, 212, 255),
    "light": (212, 180, 240, 255),
    "core": (244, 236, 255, 255),
}

FILL = {
    (7, 1), (8, 1),
    (6, 2), (7, 2), (8, 2), (9, 2),
    (7, 3), (8, 3),
    (4, 4), (7, 4), (8, 4), (11, 4),
    (3, 5), (4, 5), (6, 5), (7, 5), (8, 5), (9, 5), (11, 5), (12, 5),
    (2, 6), (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6), (13, 6),
    (1, 7), (2, 7), (3, 7), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7), (13, 7), (14, 7),
    (1, 8), (2, 8), (3, 8), (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8), (13, 8), (14, 8),
    (2, 9), (3, 9), (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9), (12, 9), (13, 9),
    (3, 10), (4, 10), (6, 10), (7, 10), (8, 10), (9, 10), (11, 10), (12, 10),
    (4, 11), (7, 11), (8, 11), (11, 11),
    (7, 12), (8, 12),
    (6, 13), (7, 13), (8, 13), (9, 13),
    (7, 14), (8, 14),
}

CORE = {(7, 7), (8, 7), (7, 8), (8, 8)}
LIGHT = {
    (7, 1), (8, 1), (6, 2), (7, 2), (8, 2),
    (1, 7), (2, 7), (3, 7),
    (4, 4), (3, 5), (4, 5),
    (6, 5), (5, 6), (6, 6),
}
SHADOW = {
    (7, 14), (8, 14), (8, 13), (9, 13),
    (14, 7), (14, 8), (13, 8), (13, 9),
    (11, 11), (12, 10), (11, 10),
    (9, 10), (10, 9), (9, 9),
}


def main() -> None:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = img.load()

    def put(x: int, y: int, c: tuple[int, int, int, int]) -> None:
        if 0 <= x < S and 0 <= y < S:
            px[x, y] = c

    for x, y in FILL:
        if (x, y) in CORE:
            put(x, y, PAL["core"])
        elif (x, y) in LIGHT:
            put(x, y, PAL["light"])
        elif (x, y) in SHADOW:
            put(x, y, PAL["shadow"])
        elif x + y <= 12:
            put(x, y, PAL["mid"])
        else:
            put(x, y, PAL["base"])

    for x, y in list(FILL):
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < S and 0 <= ny < S and (nx, ny) not in FILL:
                put(nx, ny, PAL["outline"])

    pack = Path(__file__).resolve().parents[1]
    items = pack / "resource_pack" / "textures" / "items"
    items.mkdir(parents=True, exist_ok=True)
    out = items / "lunar_star.png"
    preview = Path(__file__).resolve().parent / "lunar_star_preview.png"
    img.save(out)
    img.resize((S * 16, S * 16), Image.NEAREST).save(preview)
    print(f"wrote {out}")
    print(f"wrote {preview}")


if __name__ == "__main__":
    main()
