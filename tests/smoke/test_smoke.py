"""Rooktest na een uitrol. Draait alleen als WIJNCLUB_ADRES is gezet, en plaatst nooit iets.

    WIJNCLUB_ADRES=https://abc123.cloudfront.net pytest tests/smoke
"""
import json
import os
import time
import urllib.error
import urllib.request

import pytest

ADRES = os.environ.get("WIJNCLUB_ADRES", "").rstrip("/")

pytestmark = pytest.mark.skipif(not ADRES, reason="WIJNCLUB_ADRES is niet gezet; deze test draait alleen na een uitrol")


def haal(pad, pogingen=6):
    """Haalt een pad op. Een nieuwe distributie geeft soms even 5xx; dan wacht hij en probeert opnieuw."""
    verzoek = urllib.request.Request(ADRES + pad, headers={"User-Agent": "wijnclub-rooktest"})
    for poging in range(pogingen):
        try:
            with urllib.request.urlopen(verzoek, timeout=20) as antwoord:
                return antwoord.status, antwoord.read()
        except urllib.error.HTTPError as fout:
            if fout.code < 500 or poging == pogingen - 1:
                return fout.code, fout.read()
        except urllib.error.URLError:
            if poging == pogingen - 1:
                raise
        time.sleep(10)
    raise AssertionError("niet bereikbaar: " + pad)


def test_web_app_laadt():
    status, inhoud = haal("/")
    assert status == 200
    assert b"<html" in inhoud.lower()


def test_instellingen_voor_inloggen_staan_klaar():
    status, inhoud = haal("/config.json")
    assert status == 200
    instellingen = json.loads(inhoud)
    assert instellingen["api"] == "/api"
    assert instellingen["userPoolId"]
    assert instellingen["clientId"]


def test_api_vraagt_om_inloggen():
    # Zonder token weigert de API. Zo weten we dat /api/* doorloopt naar API Gateway en dat inloggen verplicht is.
    status, _ = haal("/api/aanbod")
    assert status == 401
