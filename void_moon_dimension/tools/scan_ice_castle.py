"""Scan Ice Castle world for non-air bbox around spawn."""
from __future__ import annotations

from pathlib import Path

from amulet import load_level

WORLD = Path(__file__).resolve().parents[2] / "_tmp_ice_castle"
DIM = "minecraft:overworld"
AIR = {"air", "cave_air", "void_air"}
SPAWN_X, SPAWN_Z = -3040, 148
SCAN_CHUNKS = 40


def main() -> None:
    level = load_level(str(WORLD))
    coords = list(level.all_chunk_coords(DIM))
    print(f"chunks_total {len(coords)}")
    scx, scz = SPAWN_X >> 4, SPAWN_Z >> 4
    min_x = min_y = min_z = 10**9
    max_x = max_y = max_z = -(10**9)
    interesting = 0
    scanned = 0
    names = {}
    for cx, cz in coords:
        if abs(cx - scx) > SCAN_CHUNKS or abs(cz - scz) > SCAN_CHUNKS:
            continue
        scanned += 1
        try:
            ch = level.get_chunk(cx, cz, DIM)
        except Exception:
            continue
        pal = ch.block_palette
        blocks = ch.blocks
        found = False
        try:
            arr = blocks[:, :, :]
        except Exception:
            try:
                arr = blocks[0:16, 0:320, 0:16]
            except Exception as e:
                print("chunk fail", cx, cz, e)
                continue
        # amulet blocks: x,y,z
        sx, sy, sz = arr.shape[0], arr.shape[1], arr.shape[2]
        y0 = getattr(ch, "min_y", 0) if False else 0
        # Bedrock overworld typically y -64..320 stored as 0-indexed in array starting at chunk min
        for lx in range(sx):
            for lz in range(sz):
                for ly in range(sy):
                    pidx = int(arr[lx, ly, lz])
                    ub = pal[pidx]
                    if ub.base_name in AIR:
                        continue
                    wx = cx * 16 + lx
                    wz = cz * 16 + lz
                    wy = ly  # may need offset
                    if wx < min_x:
                        min_x = wx
                    if wy < min_y:
                        min_y = wy
                    if wz < min_z:
                        min_z = wz
                    if wx > max_x:
                        max_x = wx
                    if wy > max_y:
                        max_y = wy
                    if wz > max_z:
                        max_z = wz
                    found = True
                    names[ub.base_name] = names.get(ub.base_name, 0) + 1
        if found:
            interesting += 1
        if scanned % 50 == 0:
            print(f"scanned {scanned} interesting {interesting}")
    level.close()
    print(f"scanned {scanned} interesting {interesting}")
    print(f"bbox x {min_x}..{max_x} y {min_y}..{max_y} z {min_z}..{max_z}")
    top = sorted(names.items(), key=lambda kv: -kv[1])[:25]
    for n, c in top:
        print(f"  {c:8} {n}")


if __name__ == "__main__":
    main()
