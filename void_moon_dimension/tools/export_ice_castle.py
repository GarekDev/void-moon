"""Extract Ice Castle build only (no stone/dirt terrain) and write castle_data.js."""
from __future__ import annotations

import json
from pathlib import Path

from export_keep_region import export_region

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
WORLD = REPO / "_tmp_ice_castle"
OUT = ROOT / "behavior_pack" / "structures"
OUT_JS = ROOT / "behavior_pack" / "scripts" / "castle_data.js"

# Connected heavy-core chunks around the real castle (not world spawn / ice biome).
SRC = dict(min_x=-2736, max_x=-2577, min_y=112, max_y=255, min_z=0, max_z=255)
PLACE_ORIGIN = {"x": 267, "y": 113, "z": 666}


def main() -> None:
    tiles = export_region(WORLD, OUT, "castle", **SRC)
    OUT_JS.write_text(
        f"export const CASTLE_ORIGIN = {json.dumps(PLACE_ORIGIN)};\n"
        f"export const CASTLE_TILES = {json.dumps(tiles)};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT_JS} tiles {len(tiles)} origin {PLACE_ORIGIN}")


if __name__ == "__main__":
    main()
