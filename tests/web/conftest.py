"""Browsertests op telefoonformaat: de eisen uit hoofdstuk 10 van de bouwspecificatie die een test kan meten.

De tests draaien tegen de gebouwde web-app in app/dist, in Chromium en in WebKit van Playwright.
WebKit is de motor van Safari: zo opent een lid met een iPhone de link uit WhatsApp. Ze raken AWS niet.

    cd app && npm run build && cd ..
    playwright install chromium-headless-shell webkit
    pytest tests/web

Eén browser kiezen kan met WIJNCLUB_BROWSERS, bijvoorbeeld WIJNCLUB_BROWSERS=chromium.

Ontbreekt app/dist of een browser, dan slaan de tests zich over. In de pipeline staat
WIJNCLUB_BROWSERTESTS=verplicht: dan is dat een fout. Is app/dist ouder dan de broncode van de
web-app, dan is dat altijd een fout: anders slaagt de test op een app die niet meer bestaat.
"""
import functools
import http.server
import os
import threading
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[2] / "app"
DIST = APP / "dist"
VERPLICHT = os.environ.get("WIJNCLUB_BROWSERTESTS") == "verplicht"
BROWSERS = os.environ.get("WIJNCLUB_BROWSERS", "chromium webkit").replace(",", " ").split()
# Waar de build van afhangt. node_modules telt niet mee: package-lock.json legt de versies vast.
BRONNEN = ("src", "public", "index.html", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json")

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


def nieuwer_dan_de_build(app=APP):
    """De bestanden van de web-app die na de laatste build zijn gewijzigd, de nieuwste eerst."""
    gebouwd = (app / "dist" / "index.html").stat().st_mtime
    bestanden = []
    for naam in BRONNEN:
        bron = app / naam
        if bron.is_dir():
            bestanden.extend(pad for pad in bron.rglob("*") if pad.is_file())
        elif bron.is_file():
            bestanden.append(bron)
    nieuwer = sorted((pad for pad in bestanden if pad.stat().st_mtime > gebouwd), key=lambda pad: -pad.stat().st_mtime)
    return [str(pad.relative_to(app)) for pad in nieuwer]


class _StilleHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json"}

    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def adres():
    """Serveert app/dist op een vrije poort van deze machine. De app gebruikt # voor schermen, dus één pagina is genoeg."""
    if not (DIST / "index.html").exists():
        _overslaan("app/dist ontbreekt; bouw eerst de web-app met: cd app && npm run build")
    nieuwer = nieuwer_dan_de_build()
    if nieuwer:
        gewijzigd = nieuwer[0] if len(nieuwer) == 1 else "{} en {} andere".format(nieuwer[0], len(nieuwer) - 1)
        pytest.fail(f"app/dist is ouder dan de broncode ({gewijzigd}); bouw opnieuw met: cd app && npm run build", pytrace=False)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_StilleHandler, directory=str(DIST)))
    draad = threading.Thread(target=server.serve_forever, daemon=True)
    draad.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


@pytest.fixture(scope="session")
def playwright():
    if sync_playwright is None:
        _overslaan("Playwright ontbreekt; installeer requirements-dev.txt")
    pw = sync_playwright().start()
    yield pw
    pw.stop()


@pytest.fixture(scope="session", params=BROWSERS)
def browser(request, playwright):
    """Elke test draait in elke browser. De browser start één keer; elke test krijgt een eigen context."""
    naam = request.param
    if naam not in ("chromium", "webkit"):
        pytest.fail(f"WIJNCLUB_BROWSERS kent {naam} niet; kies chromium, webkit of beide", pytrace=False)
    try:
        b = getattr(playwright, naam).launch()
    except PlaywrightFout as fout:
        pakket = "chromium-headless-shell" if naam == "chromium" else naam
        _overslaan(f"{naam} van Playwright ontbreekt; draai: playwright install {pakket} ({fout.message.splitlines()[0]})")
    yield b
    b.close()


def _niet_geladen(verzoek, fouten):
    """Een bestand dat niet laadt is een fout. Een verzoek dat de browser zelf afbreekt niet: dat gebeurt als de
    test naar een ander scherm gaat of herlaadt terwijl een foto nog onderweg is."""
    reden = verzoek.failure or ""
    if "ABORTED" in reden or "cancel" in reden.lower():
        return
    fouten.append(f"niet geladen: {verzoek.url} ({reden})")


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
    # Ook wat de app zelf als fout meldt, en een bestand dat niet laadt: een foto of lettertype dat ontbreekt.
    pagina.on("console", lambda bericht: fouten.append(f"console: {bericht.text}") if bericht.type == "error" else None)
    pagina.on("requestfailed", lambda verzoek: _niet_geladen(verzoek, fouten))
    pagina.on("response", lambda antwoord: fouten.append(f"{antwoord.status}: {antwoord.url}") if antwoord.status >= 400 else None)
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
