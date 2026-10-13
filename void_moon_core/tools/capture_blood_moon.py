"""Capture the pixel blood-moon canvas into HUD frames (Edge + Playwright)."""
from __future__ import annotations

import base64
import sys
from pathlib import Path

HTML = Path(r"C:\Users\Adriotto\Documents\Minecraft\blood-moon\index.html")
OUT = Path(__file__).resolve().parent / "blood_moon_src"
FRAMES = 60
# Same source window as v0.6–0.8: through settle, skip HTML hold/reset.
T_END = 0.28 + 0.38 + 3.6 + 0.55  # PRE + POUR_LEAD + FILL_DUR + SETTLE


def main() -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("pip install playwright", file=sys.stderr)
        return 1
    if not HTML.is_file():
        print(f"missing {HTML}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    uri = HTML.resolve().as_uri() + "?motion&capture"
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 480, "height": 480}, device_scale_factor=1)
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
            path = OUT / f"f{i:03d}.png"
            path.write_bytes(raw)
            print(f"{i + 1}/{FRAMES} t={t:.2f} fill={data['fillLevel']:.3f} -> {path.name}")
        browser.close()
    print(f"wrote {OUT} ({FRAMES} frames, t_end={T_END:.2f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
