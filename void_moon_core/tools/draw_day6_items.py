"""16x16 item sprites for day 6 and the quasar star."""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "resource_pack" / "textures" / "items"


def blank():
    return Image.new("RGBA", (16, 16), (0, 0, 0, 0))


def put(px, x, y, c):
    if 0 <= x < 16 and 0 <= y < 16:
        px[x, y] = c


def quasar():
    img = blank()
    px = img.load()
    core = (236, 252, 255, 255)
    light = (120, 230, 255, 255)
    mid = (40, 140, 220, 255)
    dark = (12, 40, 90, 255)
    for y in range(16):
        for x in range(16):
            if x == 7 or x == 8 or y == 7 or y == 8:
                put(px, x, y, mid if 3 <= x <= 12 and 3 <= y <= 12 else dark)
    for x, y in ((7, 7), (8, 7), (7, 8), (8, 8)):
        put(px, x, y, core)
    for x, y in ((6, 6), (9, 6), (6, 9), (9, 9), (5, 7), (10, 8), (7, 5), (8, 10)):
        put(px, x, y, light)
    return img


def soul():
    img = blank()
    px = img.load()
    glow = (180, 240, 255, 255)
    mid = (70, 170, 230, 255)
    dark = (20, 60, 120, 255)
    shape = [
        "......xxxx......",
        "....xx....xx....",
        "...x..xxxx..x...",
        "..x..xx..xx..x..",
        "..x.xx....xx.x..",
        "..x.x..xx..x.x..",
        "...x.x.xx.x.x...",
        "...x..x..x..x...",
        "....x..xx..x....",
        "....xx....xx....",
        ".....x.xx.x.....",
        "......x..x......",
        "......x..x......",
        ".......xx.......",
        "................",
        "................",
    ]
    for y, row in enumerate(shape):
        for x, ch in enumerate(row):
            if ch == "x":
                put(px, x, y, mid if (x + y) % 3 else glow)
                if x < 6:
                    put(px, x, y, dark)
    return img


def relic():
    img = blank()
    px = img.load()
    gold = (232, 196, 90, 255)
    heart = (196, 32, 48, 255)
    light = (255, 120, 130, 255)
    for y in range(16):
        for x in range(16):
            if x in (0, 15) or y in (0, 15) or (x in (1, 14) and y in (1, 14)):
                put(px, x, y, gold)
    heart_rows = [
        (4, "..xx..xx.."),
        (5, ".xxx.xxx."),
        (6, "xxxxxxxxx"),
        (7, "xxxxxxxxx"),
        (8, ".xxxxxxx."),
        (9, "..xxxxx.."),
        (10, "...xxx..."),
        (11, "....x...."),
    ]
    for y, row in heart_rows:
        for i, ch in enumerate(row):
            if ch == "x":
                put(px, 3 + i, y, light if i < 3 else heart)
    return img


def ultimate():
    img = blank()
    px = img.load()
    core = (255, 248, 180, 255)
    gold = (232, 180, 40, 255)
    voidc = (70, 20, 110, 255)
    edge = (20, 8, 40, 255)
    for y in range(16):
        for x in range(16):
            dx = x - 7.5
            dy = y - 7.5
            adx = abs(dx)
            ady = abs(dy)
            if adx + ady <= 2.2 or (adx < 0.8 and ady <= 7) or (ady < 0.8 and adx <= 7):
                put(px, x, y, core if adx + ady <= 1.2 else gold)
            elif (adx < 1.6 and ady <= 6) or (ady < 1.6 and adx <= 6):
                put(px, x, y, voidc)
            elif (adx < 2.2 and ady <= 5) or (ady < 2.2 and adx <= 5):
                put(px, x, y, edge)
    return img


def apple():
    img = blank()
    px = img.load()
    red = (196, 48, 42, 255)
    light = (240, 120, 80, 255)
    leaf = (40, 160, 220, 255)
    stem = (90, 60, 30, 255)
    for y in range(5, 14):
        for x in range(3, 13):
            dx = x - 8
            dy = y - 9
            if dx * dx + dy * dy <= 18:
                put(px, x, y, light if x < 6 else red)
    put(px, 8, 4, stem)
    put(px, 8, 3, stem)
    put(px, 9, 3, leaf)
    put(px, 10, 3, leaf)
    put(px, 10, 4, leaf)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, img in (
        ("quasar_star", quasar()),
        ("soul", soul()),
        ("life_relic", relic()),
        ("soul_apple", apple()),
        ("ultimate_star", ultimate()),
    ):
        path = OUT / f"{name}.png"
        img.save(path)
        print(path)


if __name__ == "__main__":
    main()
