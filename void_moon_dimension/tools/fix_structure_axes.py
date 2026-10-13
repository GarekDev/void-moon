"""Permute map_*.mcstructure block_indices from (y,z,x) flatten to Bedrock (x,y,z) Z-fastest."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from amulet_nbt import IntTag, ListTag, load

STRUCT = Path(__file__).resolve().parents[1] / "behavior_pack" / "structures"


def permute_layer(layer, sx: int, sy: int, sz: int) -> list[int]:
    old = np.fromiter((int(v) for v in layer), dtype=np.int32, count=sx * sy * sz)
    new = np.empty_like(old)
    # old: for y: for z: for x  -> i = x + sx * (z + sz * y)
    # new: for x: for y: for z  -> i = z + sz * (y + sy * x)
    y, z, x = np.meshgrid(np.arange(sy), np.arange(sz), np.arange(sx), indexing="ij")
    old_i = x + sx * (z + sz * y)
    new_i = z + sz * (y + sy * x)
    new[new_i.ravel()] = old[old_i.ravel()]
    return new.tolist()


def fix_file(path: Path) -> None:
    nbt = load(str(path), little_endian=True, compressed=False)
    size = [int(v) for v in nbt.compound["size"]]
    sx, sy, sz = size
    layers = nbt.compound["structure"]["block_indices"]
    for li in range(2):
        fixed = permute_layer(layers[li], sx, sy, sz)
        layers[li] = ListTag([IntTag(i) for i in fixed])
    nbt.save_to(str(path), compressed=False, little_endian=True)


def main() -> None:
    files = sorted(STRUCT.glob("map_*.mcstructure"))
    print(f"fixing {len(files)} tiles")
    for i, path in enumerate(files, 1):
        fix_file(path)
        if i % 25 == 0 or i == len(files):
            print(f"{i}/{len(files)} {path.name}")
    print("done")


if __name__ == "__main__":
    main()
