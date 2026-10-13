"""
name: day3_blood_leather + life_heart
kind: item + armor layers
size: 16x16 items, 64x32 armor
palette: blood leather red
status: final
"""
from pathlib import Path

from PIL import Image

S = 16
PAL = {
    "out": (48, 8, 12, 255),
    "stitch": (72, 10, 14, 255),
    "shadow": (96, 14, 20, 255),
    "base": (160, 24, 32, 255),
    "mid": (196, 40, 44, 255),
    "light": (228, 72, 72, 255),
    "hi": (244, 140, 140, 255),
}
HEART = {
    "out": (58, 6, 10, 255),
    "shadow": (120, 10, 18, 255),
    "base": (196, 16, 28, 255),
    "mid": (232, 36, 40, 255),
    "light": (255, 72, 72, 255),
    "hi": (255, 168, 168, 255),
}


def canvas(w: int, h: int) -> tuple[Image.Image, object]:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, img.load()


def put(px, x, y, c, w=S, h=S) -> None:
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = c


def outline_fill(px, fill: set, pal: dict, w=S, h=S) -> None:
    for x, y in fill:
        if (x, y) in pal.get("core_set", set()):
            c = pal["hi"]
        elif (x, y) in pal.get("light_set", set()):
            c = pal["light"]
        elif (x, y) in pal.get("shadow_set", set()):
            c = pal["shadow"]
        elif x + y <= pal.get("mid_cut", 14):
            c = pal["mid"]
        else:
            c = pal["base"]
        put(px, x, y, c, w, h)
    for x, y in list(fill):
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in fill:
                put(px, nx, ny, pal["out"], w, h)


def save_item(img: Image.Image, name: str, pack: Path, tools: Path) -> None:
    items = pack / "resource_pack" / "textures" / "items"
    items.mkdir(parents=True, exist_ok=True)
    img.save(items / f"{name}.png")
    img.resize((S * 16, S * 16), Image.NEAREST).save(tools / f"{name}_preview.png")
    print(f"wrote {name}")


def heart() -> Image.Image:
    img, px = canvas(S, S)
    fill = {
        (4, 2), (5, 2), (6, 2), (9, 2), (10, 2), (11, 2),
        (3, 3), (4, 3), (5, 3), (6, 3), (7, 3), (8, 3), (9, 3), (10, 3), (11, 3), (12, 3),
        (2, 4), (3, 4), (4, 4), (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4), (11, 4), (12, 4), (13, 4),
        (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5), (13, 5),
        (2, 6), (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6), (13, 6),
        (3, 7), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7),
        (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8),
        (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9),
        (6, 10), (7, 10), (8, 10), (9, 10),
        (7, 11), (8, 11),
    }
    pal = dict(HEART)
    pal["core_set"] = {(4, 3), (5, 3), (4, 4), (10, 3)}
    pal["light_set"] = {
        (4, 2), (5, 2), (6, 2), (3, 3), (3, 4), (2, 5),
        (9, 2), (10, 2), (5, 4), (6, 4),
    }
    pal["shadow_set"] = {
        (12, 6), (13, 5), (13, 6), (11, 8), (10, 9), (9, 10), (8, 11), (7, 11),
        (12, 7), (11, 7),
    }
    pal["mid_cut"] = 12
    outline_fill(px, fill, pal)
    return img


def helmet() -> Image.Image:
    img, px = canvas(S, S)
    fill = {
        (5, 2), (6, 2), (7, 2), (8, 2), (9, 2), (10, 2),
        (4, 3), (5, 3), (6, 3), (7, 3), (8, 3), (9, 3), (10, 3), (11, 3),
        (3, 4), (4, 4), (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4), (11, 4), (12, 4),
        (3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5),
        (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6),
        (3, 7), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7),
        (2, 8), (3, 8), (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8), (13, 8),
        (3, 9), (4, 9), (11, 9), (12, 9),
        (3, 10), (4, 10), (11, 10), (12, 10),
    }
    pal = dict(PAL)
    pal["light_set"] = {
        (5, 2), (6, 2), (7, 2), (4, 3), (5, 3), (3, 4), (4, 4), (3, 5),
        (2, 8), (3, 8),
    }
    pal["shadow_set"] = {
        (10, 6), (11, 6), (12, 6), (11, 7), (12, 7), (12, 8), (13, 8),
        (11, 10), (12, 10), (4, 10),
    }
    pal["mid_cut"] = 13
    outline_fill(px, fill, pal)
    put(px, 7, 5, PAL["stitch"])
    put(px, 8, 5, PAL["stitch"])
    put(px, 6, 8, PAL["stitch"])
    put(px, 9, 8, PAL["stitch"])
    return img


def chest() -> Image.Image:
    img, px = canvas(S, S)
    fill = {
        (4, 1), (11, 1),
        (3, 2), (4, 2), (5, 2), (10, 2), (11, 2), (12, 2),
        (2, 3), (3, 3), (4, 3), (5, 3), (6, 3), (9, 3), (10, 3), (11, 3), (12, 3), (13, 3),
        (2, 4), (3, 4), (4, 4), (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4), (11, 4), (12, 4), (13, 4),
        (3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5),
        (3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6),
        (3, 7), (4, 7), (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7),
        (3, 8), (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8),
        (4, 9), (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9),
        (4, 10), (5, 10), (6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (11, 10),
        (4, 11), (5, 11), (6, 11), (7, 11), (8, 11), (9, 11), (10, 11), (11, 11),
        (5, 12), (6, 12), (7, 12), (8, 12), (9, 12), (10, 12),
        (5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13),
    }
    pal = dict(PAL)
    pal["light_set"] = {
        (4, 1), (3, 2), (4, 2), (2, 3), (3, 3), (3, 5), (4, 5), (4, 6),
    }
    pal["shadow_set"] = {
        (12, 7), (11, 8), (12, 8), (11, 11), (10, 12), (10, 13), (9, 13),
    }
    pal["mid_cut"] = 14
    outline_fill(px, fill, pal)
    for y in (6, 8, 10, 12):
        put(px, 7, y, PAL["stitch"])
        put(px, 8, y, PAL["stitch"])
    return img


def legs() -> Image.Image:
    img, px = canvas(S, S)
    fill = {
        (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (9, 1), (10, 1), (11, 1),
        (3, 2), (4, 2), (5, 2), (6, 2), (7, 2), (8, 2), (9, 2), (10, 2), (11, 2), (12, 2),
        (3, 3), (4, 3), (5, 3), (6, 3), (7, 3), (8, 3), (9, 3), (10, 3), (11, 3), (12, 3),
        (4, 4), (5, 4), (6, 4), (9, 4), (10, 4), (11, 4),
        (4, 5), (5, 5), (6, 5), (9, 5), (10, 5), (11, 5),
        (4, 6), (5, 6), (6, 6), (9, 6), (10, 6), (11, 6),
        (4, 7), (5, 7), (6, 7), (9, 7), (10, 7), (11, 7),
        (4, 8), (5, 8), (6, 8), (9, 8), (10, 8), (11, 8),
        (4, 9), (5, 9), (6, 9), (9, 9), (10, 9), (11, 9),
        (4, 10), (5, 10), (6, 10), (9, 10), (10, 10), (11, 10),
        (4, 11), (5, 11), (6, 11), (9, 11), (10, 11), (11, 11),
        (4, 12), (5, 12), (6, 12), (9, 12), (10, 12), (11, 12),
        (4, 13), (5, 13), (6, 13), (9, 13), (10, 13), (11, 13),
        (4, 14), (5, 14), (6, 14), (9, 14), (10, 14), (11, 14),
    }
    pal = dict(PAL)
    pal["light_set"] = {(4, 1), (5, 1), (3, 2), (4, 2), (4, 5), (4, 6), (9, 5)}
    pal["shadow_set"] = {(11, 12), (11, 13), (11, 14), (6, 14), (10, 14)}
    pal["mid_cut"] = 12
    outline_fill(px, fill, pal)
    put(px, 7, 2, PAL["stitch"])
    put(px, 8, 2, PAL["stitch"])
    return img


def boots() -> Image.Image:
    img, px = canvas(S, S)
    fill = {
        (3, 6), (4, 6), (5, 6), (6, 6), (9, 6), (10, 6), (11, 6), (12, 6),
        (3, 7), (4, 7), (5, 7), (6, 7), (9, 7), (10, 7), (11, 7), (12, 7),
        (3, 8), (4, 8), (5, 8), (6, 8), (9, 8), (10, 8), (11, 8), (12, 8),
        (3, 9), (4, 9), (5, 9), (6, 9), (9, 9), (10, 9), (11, 9), (12, 9),
        (3, 10), (4, 10), (5, 10), (6, 10), (9, 10), (10, 10), (11, 10), (12, 10),
        (2, 11), (3, 11), (4, 11), (5, 11), (6, 11), (7, 11), (8, 11), (9, 11), (10, 11), (11, 11), (12, 11), (13, 11),
        (2, 12), (3, 12), (4, 12), (5, 12), (6, 12), (7, 12), (8, 12), (9, 12), (10, 12), (11, 12), (12, 12), (13, 12),
        (2, 13), (3, 13), (4, 13), (5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13), (11, 13), (12, 13), (13, 13),
    }
    pal = dict(PAL)
    pal["light_set"] = {(3, 6), (4, 6), (3, 7), (9, 6), (10, 6), (2, 11)}
    pal["shadow_set"] = {(12, 10), (13, 12), (13, 13), (7, 13), (6, 13)}
    pal["mid_cut"] = 14
    outline_fill(px, fill, pal)
    return img


def fill_rect(px, x, y, w, h, c, tw=64, th=32) -> None:
    for j in range(h):
        for i in range(w):
            put(px, x + i, y + j, c, tw, th)


def shade_face(px, x, y, w, h, tw=64, th=32) -> None:
    for j in range(h):
        for i in range(w):
            if i == 0 or j == 0:
                c = PAL["light"]
            elif i == w - 1 or j == h - 1:
                c = PAL["shadow"]
            elif (i + j) % 5 == 0:
                c = PAL["stitch"]
            elif i + j < (w + h) // 3:
                c = PAL["mid"]
            else:
                c = PAL["base"]
            put(px, x + i, y + j, c, tw, th)


def draw_cuboid(px, x, y, fw, fh, dep, tw=64, th=32) -> None:
    # top, bottom, left, front, right, back
    shade_face(px, x + dep, y, fw, dep, tw, th)
    fill_rect(px, x + dep + fw, y, fw, dep, PAL["shadow"], tw, th)
    shade_face(px, x, y + dep, dep, fh, tw, th)
    shade_face(px, x + dep, y + dep, fw, fh, tw, th)
    shade_face(px, x + dep + fw, y + dep, dep, fh, tw, th)
    shade_face(px, x + dep + fw + dep, y + dep, fw, fh, tw, th)


def armor_layer1() -> Image.Image:
    img, px = canvas(64, 32)
    draw_cuboid(px, 0, 0, 8, 8, 8)  # helmet
    draw_cuboid(px, 16, 16, 8, 12, 4)  # chest
    draw_cuboid(px, 40, 16, 4, 12, 4)  # right arm
    # boots: lower 4px of a 64x32 leg cuboid at (0,16)
    draw_cuboid(px, 0, 16, 4, 12, 4)
    # darken upper leg so only boot shows more
    for j in range(8):
        for i in range(16):
            put(px, i, 16 + 4 + j, (0, 0, 0, 0), 64, 32)
    return img


def armor_layer2() -> Image.Image:
    img, px = canvas(64, 32)
    draw_cuboid(px, 16, 16, 8, 12, 4)  # waist / body
    draw_cuboid(px, 0, 16, 4, 12, 4)  # legs
    # hide chest bulk: keep top 4px of body as belt
    for j in range(8):
        for i in range(24):
            put(px, 16 + i, 20 + 4 + j, (0, 0, 0, 0), 64, 32)
    return img


def save_armor(img: Image.Image, name: str, pack: Path, tools: Path) -> None:
    folder = pack / "resource_pack" / "textures" / "models" / "armor"
    folder.mkdir(parents=True, exist_ok=True)
    img.save(folder / f"{name}.png")
    img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(tools / f"{name}_preview.png")
    print(f"wrote {name}")


def main() -> None:
    pack = Path(__file__).resolve().parents[1]
    tools = Path(__file__).resolve().parent
    save_item(heart(), "life_heart", pack, tools)
    save_item(helmet(), "blood_leather_helmet", pack, tools)
    save_item(chest(), "blood_leather_chestplate", pack, tools)
    save_item(legs(), "blood_leather_leggings", pack, tools)
    save_item(boots(), "blood_leather_boots", pack, tools)
    save_armor(armor_layer1(), "blood_leather_1", pack, tools)
    save_armor(armor_layer2(), "blood_leather_2", pack, tools)


if __name__ == "__main__":
    main()
