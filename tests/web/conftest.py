"""Browsertests op telefoonformaat: de eisen uit hoofdstuk 10 van de bouwspecificatie die een test kan meten.

De tests draaien tegen de gebouwde web-app in app/dist, in Chromium van Playwright. Ze raken AWS niet.

    cd app && npm run build && cd ..
    playwright install chromium-headless-shell
    pytest tests/web

Ontbreekt app/dist of de browser, dan slaan de tests zich over. In de pipeline staat
WIJNCLUB_BROWSERTESTS=verplicht: dan is dat een fout.
"""
import functools
import http.server
import os
import threading
from pathlib import Path

import pytest

DIST = Path(__file__).resolve().parents[2] / "app" / "dist"
VERPLICHT = os.environ.get("WIJNCLUB_BROWSERTESTS") == "verplicht"

# De twee referentiematen uit de bouwspecificatie, staand. Op 375 x 667 moet alles kloppen;
# 320 x 568 is de ondergrens.
GEWOON = (375, 667)
KLEIN = (320, 568)
MATEN = [GEWOON, KLEIN]


def _overslaan(reden):
    if VERPLICHT:
        pytest.fail(reden, pytrace=False)
    pytest.skip(reden)


try:
    from playwright.sync_api import Error as PlaywrightFout
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover - alleen zonder het pakket
    sync_playwright = None
    PlaywrightFout = Exception


class _StilleHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json"}

    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def adres():
    """Serveert app/dist op een vrije poort van deze machine. De app gebruikt # voor schermen, dus één pagina is genoeg."""
    if not (DIST / "index.html").exists():
        _overslaan("app/dist ontbreekt; bouw eerst de web-app met: cd app && npm run build")
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_StilleHandler, directory=str(DIST)))
    draad = threading.Thread(target=server.serve_forever, daemon=True)
    draad.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


@pytest.fixture(scope="session")
def browser():
    if sync_playwright is None:
        _overslaan("Playwright ontbreekt; installeer requirements-dev.txt")
    pw = sync_playwright().start()
    try:
        b = pw.chromium.launch()
    except PlaywrightFout as fout:
        pw.stop()
        _overslaan(f"Chromium van Playwright ontbreekt; draai: playwright install chromium-headless-shell ({fout.message.splitlines()[0]})")
    yield b
    b.close()
    pw.stop()


def _nieuwe_pagina(browser, adres, maat):
    breedte, hoogte = maat
    context = browser.new_context(
        viewport={"width": breedte, "height": hoogte},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        locale="nl-NL",
        timezone_id="Europe/Amsterdam",
    )
    pagina = context.new_page()
    fouten = []
    pagina.on("pageerror", lambda fout: fouten.append(str(fout)))
    pagina.goto(adres + "/")
    pagina.wait_for_selector(".app")
    pagina.fouten = fouten
    return context, pagina


@pytest.fixture(params=MATEN, ids=lambda m: f"{m[0]}x{m[1]}")
def telefoon(request, browser, adres):
    """Een nieuwe telefoon per test, met een lege opslag: elke test begint bij het inloggen."""
    context, pagina = _nieuwe_pagina(browser, adres, request.param)
    pagina.maat = request.param
    pagina.adres = adres
    yield pagina
    assert pagina.fouten == [], f"fouten in de pagina: {pagina.fouten}"
    context.close()


@pytest.fixture
def gewone_telefoon(browser, adres):
    """Alleen de maat waarop alles moet kloppen, voor de eisen over wat zonder scrollen in beeld staat (M4)."""
    context, pagina = _nieuwe_pagina(browser, adres, GEWOON)
    pagina.maat = GEWOON
    pagina.adres = adres
    yield pagina
    assert pagina.fouten == [], f"fouten in de pagina: {pagina.fouten}"
    context.close()
