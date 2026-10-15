"""Export a world AABB as 64^3 tiles, keeping only non-terrain blocks."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from amulet import load_level
from amulet_nbt import CompoundTag

from export_moon_map import native_block, palette_key, write_mcstructure

DIM = "minecraft:overworld"
BEDROCK_VER = (1, 21, 130)
TILE = 64

TERRAIN = {
    "air",
    "cave_air",
    "void_air",
    "stone",
    "cobblestone",
    "dirt",
    "grass_block",
    "grass",
    "short_grass",
    "tall_grass",
    "fern",
    "large_fern",
    "gravel",
    "granite",
    "diorite",
    "andesite",
    "sand",
    "red_sand",
    "sandstone",
    "bedrock",
    "water",
    "lava",
    "ice",
    "snow",
    "snow_block",
    "powder_snow",
    "deepslate",
    "tuff",
    "calcite",
    "dripstone_block",
    "pointed_dripstone",
    "infested_stone",
    "infested_deepslate",
    "clay",
    "magma_block",
    "obsidian",
    "end_stone",
}


def keep_name(name: str) -> bool:
    base = name.split(":")[-1]
    if base in TERRAIN:
        return False
    if base.endswith("_ore") and not base.endswith("_block"):
        return False
    if base.startswith("deepslate_"):
        return False
    return True


def export_region(
    world: Path,
    out_dir: Path,
    prefix: str,
    min_x: int,
    max_x: int,
    min_y: int,
    max_y: int,
    min_z: int,
    max_z: int,
    min_non_air: int = 8,
) -> list[dict]:
    level = load_level(str(world))
    ver = level.translation_manager.get_version("bedrock", BEDROCK_VER)
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{prefix}_*.mcstructure"):
        old.unlink()

    tiles = []
    x_starts = list(range(min_x, max_x + 1, TILE))
    z_starts = list(range(min_z, max_z + 1, TILE))
    y_starts = list(range(min_y, max_y + 1, TILE))
    total = len(x_starts) * len(z_starts) * len(y_starts)
    done = 0
    written = 0

    def tname(rx: int, ry: int, rz: int) -> str:
        def n(v: int) -> str:
            return f"n{abs(v)}" if v < 0 else str(v)

        return f"{prefix}_{n(rx)}_{n(ry)}_{n(rz)}"

    for x0 in x_starts:
        for z0 in z_starts:
            for y0 in y_starts:
                done += 1
                sx = min(TILE, max_x - x0 + 1)
                sz = min(TILE, max_z - z0 + 1)
                sy = min(TILE, max_y - y0 + 1)
                y1 = y0 + sy
                slices = {}
                palettes = {}
                cx0, cz0 = x0 >> 4, z0 >> 4
                cx1, cz1 = (x0 + sx - 1) >> 4, (z0 + sz - 1) >> 4
                for cx in range(cx0, cx1 + 1):
                    for cz in range(cz0, cz1 + 1):
                        try:
                            chunk = level.get_chunk(cx, cz, DIM)
                        except Exception:
                            continue
                        try:
                            sl = np.asarray(chunk.blocks[0:16, y0:y1, 0:16], dtype=np.int32)
                        except Exception:
                            continue
                        slices[(cx, cz)] = sl
                        palettes[(cx, cz)] = chunk.block_palette
                if not slices:
                    continue
                palette = []
                index_of = {}
                indices = []
                native_cache = {}
                kept = 0
                for x in range(sx):
                    wx = x0 + x
                    cx = wx >> 4
                    lx = wx & 15
                    for y in range(sy):
                        for z in range(sz):
                            wz = z0 + z
                            cz = wz >> 4
                            lz = wz & 15
                            sl = slices.get((cx, cz))
                            if sl is None:
                                name, states = "minecraft:air", CompoundTag({})
                            else:
                                try:
                                    pidx = int(sl[lx, y, lz])
                                except Exception:
                                    pidx = int(sl[lx, min(y, sl.shape[1] - 1), lz])
                                key = (cx, cz, pidx)
                                if key not in native_cache:
                                    ub = palettes[(cx, cz)][pidx]
                                    native_cache[key] = native_block(ver, ub)
                                name, states = native_cache[key]
                            if not keep_name(name):
                                name, states = "minecraft:air", CompoundTag({})
                            pk = palette_key(name, states)
                            if pk not in index_of:
                                index_of[pk] = len(palette)
                                palette.append((name, states))
                            indices.append(index_of[pk])
                            if not name.endswith(":air"):
                                kept += 1
                if kept < min_non_air:
                    print(f"skip {prefix} {x0} {y0} {z0} kept={kept} ({done}/{total})")
                    continue
                rx, ry, rz = x0 - min_x, y0 - min_y, z0 - min_z
                name = tname(rx, ry, rz)
                path = out_dir / f"{name}.mcstructure"
                write_mcstructure(path, sx, sy, sz, (x0, y0, z0), palette, indices)
                tiles.append({"name": name, "x": rx, "y": ry, "z": rz, "sx": sx, "sy": sy, "sz": sz})
                written += 1
                print(
                    f"wrote {name} {sx}x{sy}x{sz} kept={kept} pal={len(palette)} "
                    f"{path.stat().st_size/1024:.1f}KB ({done}/{total})"
                )
    level.close()
    print(f"{prefix} tiles {written}")
    return tiles
