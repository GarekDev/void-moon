"""Zip BP+RP into Void Moon Dimension Mixed v<version>.mcaddon."""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

DIM = Path(__file__).resolve().parents[1]
BP = DIM / "behavior_pack"
RP = DIM / "resource_pack"
OUT_DIR = DIM.parent


def version_label(ver: list) -> str:
    major, minor, patch = (list(ver) + [0, 0, 0])[:3]
    if patch:
        return f"{major}.{minor}.{patch}"
    return f"{major}.{minor}"


def main() -> None:
    manifest = json.loads((BP / "manifest.json").read_text(encoding="utf-8"))
    label = version_label(manifest["header"]["version"])
    out = OUT_DIR / f"Void Moon Dimension Mixed v{label}.mcaddon"
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, arcroot in ((BP, "behavior_pack"), (RP, "resource_pack")):
            for path in sorted(folder.rglob("*")):
                if not path.is_file():
                    continue
                if path.name.startswith("."):
                    continue
                arc = f"{arcroot}/{path.relative_to(folder).as_posix()}"
                zf.write(path, arc)
    print(f"wrote {out}")
    print(f"entries {len(zipfile.ZipFile(out).namelist())}")


if __name__ == "__main__":
    main()
