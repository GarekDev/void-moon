"""Remap Moon map palettes: stone/cobble/andesite -> end_stone. Ores stay."""
from __future__ import annotations

from pathlib import Path

from amulet_nbt import StringTag, load

DST = Path(__file__).resolve().parents[1] / "behavior_pack" / "structures"

REMAP = {
    "minecraft:stone": "minecraft:end_stone",
    "minecraft:cobblestone": "minecraft:end_stone",
    "minecraft:andesite": "minecraft:end_stone",
}


def remap_file(path: Path) -> int:
    nbt = load(str(path), little_endian=True, compressed=False)
    pal = nbt.compound["structure"]["palette"]["default"]["block_palette"]
    changed = 0
    for block in pal:
        name = str(block["name"])
        if name in REMAP:
            block["name"] = StringTag(REMAP[name])
            changed += 1
    if changed:
        nbt.save_to(str(path), compressed=False, little_endian=True)
    return changed


def main() -> None:
    files = sorted(DST.glob("map_*.mcstructure"))
    touched = 0
    swaps = 0
    for path in files:
        n = remap_file(path)
        if n:
            touched += 1
            swaps += n
            print(f"{path.name} {n}")
    print(f"files {len(files)} remapped {touched} palette_swaps {swaps}")


if __name__ == "__main__":
    main()
