"""16x16 Void Moon Manager tablet. Command-only admin item."""
from pathlib import Path

from PIL import Image

S = 16
PAL = {
    "outline": (18, 8, 28, 255),
    "frame": (58, 28, 78, 255),
    "body": (36, 16, 52, 255),
    "screen": (12, 6, 22, 255),
    "moon": (196, 48, 58, 255),
    "moon_hi": (255, 120, 96, 255),
    "moon_sh": (110, 18, 28, 255),
    "dot": (220, 190, 255, 255),
}

# tablet fill
BODY = {(x, y) for x in range(3, 13) for y in range(2, 15)}
SCREEN = {(x, y) for x in range(5, 11) for y in range(4, 12)}
MOON = {
    (7, 5), (8, 5),
    (6, 6), (7, 6), (8, 6), (9, 6),
    (6, 7), (7, 7), (8, 7), (9, 7),
    (7, 8), (8, 8), (9, 8),
    (8, 9),
}
MOON_CUT = {(6, 6), (6, 7), (7, 8)}
DOTS = {(5, 4), (10, 4), (5, 11), (10, 11)}


def main() -> None:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = img.load()

    def put(x, y, c):
        if 0 <= x < S and 0 <= y < S:
            px[x, y] = c

    for x, y in BODY:
        put(x, y, PAL["body"])
    for x, y in list(BODY):
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in BODY:
                put(nx, ny, PAL["outline"])
        if x in (3, 12) or y in (2, 14):
            put(x, y, PAL["frame"])
    for x, y in SCREEN:
        put(x, y, PAL["screen"])
    for x, y in MOON:
        if (x, y) in MOON_CUT:
            put(x, y, PAL["screen"])
        elif (x, y) in ((8, 5), (9, 6)):
            put(x, y, PAL["moon_hi"])
        elif (x, y) in ((8, 9), (7, 8)):
            put(x, y, PAL["moon_sh"])
        else:
            put(x, y, PAL["moon"])
    for x, y in DOTS:
        put(x, y, PAL["dot"])

    pack = Path(__file__).resolve().parents[1]
    items = pack / "resource_pack" / "textures" / "items"
    items.mkdir(parents=True, exist_ok=True)
    out = items / "void_moon_manager.png"
    preview = Path(__file__).resolve().parent / "void_moon_manager_preview.png"
    img.save(out)
    img.resize((S * 16, S * 16), Image.NEAREST).save(preview)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
