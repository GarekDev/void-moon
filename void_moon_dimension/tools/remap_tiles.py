"""Copy FlyMeToTheMoon chunk tiles and remap jerry: blocks to voidmoon:."""
from __future__ import annotations

from pathlib import Path

from amulet_nbt import StringTag, load

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "_unpack_dimension" / "flymoon" / "FMTTMBP" / "structures"
DST = Path(__file__).resolve().parents[1] / "behavior_pack" / "structures"

REMAP = {
    "jerry:moon_rock": "voidmoon:moon_rock",
    "jerry:ferruginous_moon_rock": "voidmoon:ferruginous_moon_rock",
    "jerry:meteor_fragment": "voidmoon:meteor_fragment",
    "jerry:peridot_ore": "voidmoon:peridot_ore",
    "jerry:waxed_copper_vent": "minecraft:waxed_copper",
    "minecraft:repeating_command_block": "minecraft:air",
}


def remap_file(src: Path, dst: Path) -> None:
    nbt = load(str(src), little_endian=True, compressed=False)
    pal = nbt.compound["structure"]["palette"]["default"]["block_palette"]
    for block in pal:
        name = str(block["name"])
        if name in REMAP:
            block["name"] = StringTag(REMAP[name])
            if REMAP[name] == "minecraft:air":
                block["states"] = type(block["states"])()
    nbt.save_to(str(dst), compressed=False, little_endian=True)


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    count = 0
    names = list(sorted(SRC.glob("chunk*.mcstructure")))
    launch = SRC / "launchpad.mcstructure"
    if launch.exists():
        names.append(launch)
    for src in names:
        dst = DST / src.name
        remap_file(src, dst)
        count += 1
        print(f"wrote {dst.name}")
    print(f"remapped {count} tiles")


if __name__ == "__main__":
    main()
