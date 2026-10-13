"""Export Moon.mcworld occupied tiles to .mcstructure + scripts/map_data.js."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from amulet import load_level
from amulet_nbt import (
    ByteTag,
    CompoundTag,
    IntTag,
    ListTag,
    NamedTag,
    StringTag,
)

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
WORLD = REPO / "_tmp_moon_world"
OUT_STRUCT = ROOT / "behavior_pack" / "structures"
OUT_JS = ROOT / "behavior_pack" / "scripts" / "map_data.js"

TILE = 64
Y0 = 64
Y1 = 192  # two slices of 64 covering the visible moon surface
DIM = "minecraft:overworld"
BEDROCK_VER = (1, 21, 130)
BLOCK_VERSION = 18168865
AIR_NAMES = {"air", "cave_air", "void_air"}


def prop_to_tag(value):
    if isinstance(value, (ByteTag, IntTag, StringTag)):
        return value
    name = type(value).__name__
    if "Byte" in name:
        return ByteTag(int(value))
    if "Int" in name or "Long" in name or "Short" in name:
        return IntTag(int(value))
    text = getattr(value, "py_str", None)
    if text is None:
        text = str(value)
    if text in ("0", "1") and "Byte" in name:
        return ByteTag(int(text))
    if text in ("true", "false"):
        return ByteTag(1 if text == "true" else 0)
    try:
        if isinstance(value, bool):
            return ByteTag(1 if value else 0)
        if isinstance(value, int):
            return IntTag(value)
    except Exception:
        pass
    return StringTag(str(text).strip('"'))


def native_block(ver, ub):
    nb, _, _ = ver.block.from_universal(ub)
    name = f"{nb.namespace}:{nb.base_name}"
    states = CompoundTag({str(k): prop_to_tag(v) for k, v in nb.properties.items()})
    return name, states


def palette_key(name: str, states: CompoundTag) -> str:
    return name + "|" + states.to_snbt()


def write_mcstructure(path: Path, sx: int, sy: int, sz: int, origin, palette, indices):
    pal_list = ListTag(
        [
            CompoundTag(
                {
                    "name": StringTag(name),
                    "states": states,
                    "version": IntTag(BLOCK_VERSION),
                }
            )
            for name, states in palette
        ]
    )
    layer0 = ListTag([IntTag(i) for i in indices])
    layer1 = ListTag([IntTag(-1) for _ in indices])
    nbt = CompoundTag(
        {
            "format_version": IntTag(1),
            "size": ListTag([IntTag(sx), IntTag(sy), IntTag(sz)]),
            "structure": CompoundTag(
                {
                    "block_indices": ListTag([layer0, layer1]),
                    "entities": ListTag([]),
                    "palette": CompoundTag(
                        {
                            "default": CompoundTag(
                                {
                                    "block_palette": pal_list,
                                    "block_position_data": CompoundTag({}),
                                }
                            )
                        }
                    ),
                }
            ),
            "structure_world_origin": ListTag(
                [IntTag(origin[0]), IntTag(origin[1]), IntTag(origin[2])]
            ),
        }
    )
    NamedTag(nbt).save_to(str(path), compressed=False, little_endian=True)


def tile_name(x: int, y: int, z: int) -> str:
    def n(v: int) -> str:
        return f"n{abs(v)}" if v < 0 else str(v)

    return f"map_{n(x)}_{n(y)}_{n(z)}"


def main() -> None:
    if not (WORLD / "level.dat").exists():
        sys.exit(f"missing world at {WORLD}")

    level = load_level(str(WORLD))
    ver = level.translation_manager.get_version("bedrock", BEDROCK_VER)
    coords = list(level.all_chunk_coords(DIM))
    min_cx = min(c[0] for c in coords)
    max_cx = max(c[0] for c in coords)
    min_cz = min(c[1] for c in coords)
    max_cz = max(c[1] for c in coords)
    min_x = min_cx * 16
    max_x = max_cx * 16 + 15
    min_z = min_cz * 16
    max_z = max_cz * 16 + 15
    print(f"chunks {len(coords)} x {min_x}..{max_x} z {min_z}..{max_z}")

    OUT_STRUCT.mkdir(parents=True, exist_ok=True)
    for old in OUT_STRUCT.glob("map_*.mcstructure"):
        old.unlink()

    tiles = []
    spawn_y = 100
    # surface at 0,0
    try:
        ch = level.get_chunk(0, 0, DIM)
        for y in range(200, -1, -1):
            ub = ch.block_palette[int(ch.blocks[0, y, 0])]
            if ub.base_name not in AIR_NAMES:
                spawn_y = y + 2
                break
    except Exception as e:
        print("spawn y fallback", e)

    edge_heights = []
    n_written = 0
    n_skipped = 0

    x_starts = list(range(min_x, max_x + 1, TILE))
    z_starts = list(range(min_z, max_z + 1, TILE))
    y_starts = list(range(Y0, Y1, TILE))
    total = len(x_starts) * len(z_starts) * len(y_starts)
    done = 0

    for x0 in x_starts:
        for z0 in z_starts:
            for y0 in y_starts:
                done += 1
                sx = min(TILE, max_x - x0 + 1)
                sz = min(TILE, max_z - z0 + 1)
                sy = TILE
                y1 = y0 + sy

                palette: list[tuple[str, CompoundTag]] = []
                index_of: dict[str, int] = {}
                indices: list[int] = []
                non_air = 0

                cx0 = x0 >> 4
                cz0 = z0 >> 4
                cx1 = (x0 + sx - 1) >> 4
                cz1 = (z0 + sz - 1) >> 4
                slices = {}
                palettes = {}
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
                    n_skipped += 1
                    continue

                native_cache = {}
                # Bedrock mcstructure: X outer, Y middle, Z fastest
                # index = z + sizeZ * (y + sizeY * x)
                for x in range(sx):
                    wx = x0 + x
                    cx = wx >> 4
                    lx = wx & 15
                    for y in range(sy):
                        wy = y0 + y
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
                            pk = palette_key(name, states)
                            if pk not in index_of:
                                index_of[pk] = len(palette)
                                palette.append((name, states))
                            indices.append(index_of[pk])
                            if not name.endswith(":air"):
                                non_air += 1
                                if (
                                    x0 == min_x
                                    or z0 == min_z
                                    or x0 + sx - 1 >= max_x
                                    or z0 + sz - 1 >= max_z
                                ):
                                    edge_heights.append(wy)

                if non_air == 0:
                    n_skipped += 1
                    if done % 20 == 0:
                        print(f"progress {done}/{total} written {n_written} skip {n_skipped}")
                    continue

                name = tile_name(x0, y0, z0)
                path = OUT_STRUCT / f"{name}.mcstructure"
                write_mcstructure(path, sx, sy, sz, (x0, y0, z0), palette, indices)
                tiles.append({"name": name, "x": x0, "y": y0, "z": z0, "sx": sx, "sy": sy, "sz": sz})
                n_written += 1
                size_kb = path.stat().st_size / 1024
                print(f"wrote {name} {sx}x{sy}x{sz} nonair={non_air} pal={len(palette)} {size_kb:.1f}KB  ({done}/{total})")

    level.close()

    if edge_heights:
        edge_heights.sort()
        outer_y = edge_heights[len(edge_heights) // 2]
    else:
        outer_y = 90

    js = f"""export const MAP_TILE = {TILE};
export const MAP_MIN_X = {min_x};
export const MAP_MAX_X = {max_x};
export const MAP_MIN_Z = {min_z};
export const MAP_MAX_Z = {max_z};
export const MAP_SPAWN = {{ x: 0.5, y: {spawn_y}, z: 0.5 }};
export const OUTER_Y = {outer_y};
export const MAP_BUFFER = 16;
export const MAP_TILES = {json.dumps(tiles)};
"""
    OUT_JS.write_text(js, encoding="utf-8")
    print(f"tiles {n_written} skipped {n_skipped} spawn_y {spawn_y} outer_y {outer_y}")
    print(f"wrote {OUT_JS}")


if __name__ == "__main__":
    main()
