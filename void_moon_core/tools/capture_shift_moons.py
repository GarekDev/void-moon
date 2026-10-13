"""Capture green/yellow moon canvases into HUD frames (Edge + Playwright)."""
from __future__ import annotations

import base64
import sys
from pathlib import Path

HTML_DIR = Path(r"C:\Users\Adriotto\Documents\Minecraft\blood-moon")
FRAMES = 60
T_END = 0.28 + 0.52 + 3.6 + 0.55  # PRE + POUR_LEAD + FILL_DUR + SETTLE
JOBS = (
    ("verde.html", "green_moon_src"),
    ("amarillo.html", "yellow_moon_src"),
)


def capture(page, html: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    uri = html.resolve().as_uri() + "?motion&capture"
    page.goto(uri, wait_until="domcontentloaded")
    page.wait_for_function("() => window.__bloodMoon && window.__bloodMoon.tickTo")
    page.wait_for_timeout(300)
    page.evaluate("() => window.__bloodMoon.resetClock()")
    for i in range(FRAMES):
        t = 0.0 if FRAMES == 1 else T_END * i / (FRAMES - 1)
        data = page.evaluate(
            """(t) => {
              window.__bloodMoon.tickTo(t);
              const st = window.__bloodMoon.state;
              return {
                png: document.getElementById('screen').toDataURL('image/png'),
                fillLevel: st.fillLevel,
                tc: st.tc
              };
            }""",
            t,
        )
        raw = base64.b64decode(data["png"].split(",", 1)[1])
        path = out / f"f{i:03d}.png"
        path.write_bytes(raw)
        print(f"{html.stem} {i + 1}/{FRAMES} t={t:.2f} fill={data['fillLevel']:.3f} -> {path.name}")


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("pip install playwright", file=sys.stderr)
        return 1
    root = Path(__file__).resolve().parent
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 384, "height": 512}, device_scale_factor=1)
        for html_name, src_name in JOBS:
            html = HTML_DIR / html_name
            if not html.is_file():
                print(f"missing {html}", file=sys.stderr)
                return 1
            capture(page, html, root / src_name)
        browser.close()
    print(f"captured {len(JOBS)} palettes, {FRAMES} frames each, t_end={T_END:.2f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
