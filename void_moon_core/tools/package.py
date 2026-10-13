"""Zip BP+RP into addons/void_moon/void_moon_core_<version>.mcaddon."""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

CORE = Path(__file__).resolve().parents[1]
BP = CORE / "behavior_pack"
RP = CORE / "resource_pack"
OUT_DIR = CORE.parent


def version_label(ver: list) -> str:
    major, minor, patch = (list(ver) + [0, 0, 0])[:3]
    if patch:
        return f"{major}.{minor}.{patch}"
    return f"{major}.{minor}"


def main() -> None:
    manifest = json.loads((BP / "manifest.json").read_text(encoding="utf-8"))
    label = version_label(manifest["header"]["version"])
    out = OUT_DIR / f"void_moon_core_{label}.mcaddon"
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, arcroot in ((BP, "behavior_pack"), (RP, "resource_pack")):
            for path in sorted(folder.rglob("*")):
                if not path.is_file():
                    continue
                arc = f"{arcroot}/{path.relative_to(folder).as_posix()}"
                zf.write(path, arc)
    print(f"wrote {out}")
    print(f"entries {len(zipfile.ZipFile(out).namelist())}")


if __name__ == "__main__":
    main()
