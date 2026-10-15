"""Extract rocket + concrete station from Moon.mcworld (terrain stripped)."""
from __future__ import annotations

import json
from pathlib import Path

from export_keep_region import export_region

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
WORLD = REPO / "_tmp_moon_world"
OUT = ROOT / "behavior_pack" / "structures"
OUT_JS = ROOT / "behavior_pack" / "scripts" / "feature_data.js"

# Iron/terracotta rocket
ROCKET = dict(min_x=-224, max_x=-193, min_y=110, max_y=202, min_z=32, max_z=79)
# Concrete station with lights
STATION = dict(min_x=-448, max_x=-385, min_y=98, max_y=114, min_z=144, max_z=207)

# Visible copies on the moon, not on spawn. Y is snapped at runtime.
PLACEMENTS = [
    {"id": "rocket", "origin": {"x": 96, "z": 80}, "snap": True},
    {"id": "rocket", "origin": {"x": -144, "z": 96}, "snap": True},
    {"id": "station", "origin": {"x": 80, "z": -144}, "snap": True},
    {"id": "station", "origin": {"x": -96, "z": -128}, "snap": True},
]


def main() -> None:
    rocket = export_region(WORLD, OUT, "feature_rocket", **ROCKET)
    station = export_region(WORLD, OUT, "feature_station", **STATION)
    by_id = {"rocket": rocket, "station": station}
    features = []
    for p in PLACEMENTS:
        features.append(
            {
                "origin": {"x": p["origin"]["x"], "y": 0, "z": p["origin"]["z"]},
                "snap": p["snap"],
                "tiles": by_id[p["id"]],
            }
        )
    OUT_JS.write_text(f"export const FEATURES = {json.dumps(features)};\n", encoding="utf-8")
    print(f"wrote {OUT_JS} rocket={len(rocket)} station={len(station)}")


if __name__ == "__main__":
    main()
