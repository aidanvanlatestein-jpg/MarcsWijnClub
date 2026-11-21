"""Wat de aanroepen naar het taalmodel delen: beheer, de grens per dag en de fouten van het model.

Zie docs/bouwspecificatie.md, hoofdstuk 5. De volgorde is vast:

1. Alleen de groep `beheer`; anders 403 met `geen_toegang`.
2. De invoer controleren; een fout geeft 400 zonder aanroep van het model en telt niet mee.
3. De grens per dag in de tabel `tellers`; daarboven 429 met `te_veel` en vult Marc zelf in.
4. De regels uit `domein/`, met `model.py` als `vraag_model`. Geeft het model geen antwoord,
   dan 503 met `model_niet_beschikbaar` en vult Marc zelf in.

In het logboek staat nooit de invoer of het antwoord van het model.
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Any, Callable, Dict, Mapping

from wijnclub import antwoord, model, opslag
from wijnclub.domein import teller, tijd

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VUL_ZELF_IN = "Vul zelf in."


def lees_inhoud(event: Mapping[str, Any]) -> Dict[str, Any]:
    """De JSON uit de aanvraag. Geen JSON-object is een ValueError."""
    tekst = event.get("body") or ""
    if event.get("isBase64Encoded"):
        tekst = base64.b64decode(tekst).decode("utf-8")
    inhoud = json.loads(tekst)
    if not isinstance(inhoud, dict):
        raise ValueError("geen JSON-object")
    return inhoud


def voer_uit(
    event: Mapping[str, Any],
    naam: str,
    controleer: Callable[[Dict[str, Any]], object],
    ongeldig: str,
    vraag: Callable[[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    """Voert één aanroep uit. `controleer` gooit ValueError bij foute invoer; `vraag` geeft het antwoord."""
    try:
        if not antwoord.is_beheer(event):
            return antwoord.fout(403, "geen_toegang", "Dit kan alleen Marc.")
        try:
            inhoud = lees_inhoud(event)
            controleer(inhoud)
        except ValueError:
            return antwoord.fout(400, ongeldig, "De invoer klopt niet.")
        if not opslag.tel_modelaanroep(teller.tel_op(tijd.nu())):
            logger.warning("%s: grens van de dag bereikt", naam)
            return antwoord.fout(429, "te_veel", "Het model is vandaag genoeg gevraagd. " + VUL_ZELF_IN)
        return vraag(inhoud)
    except model.ModelNietBeschikbaar as fout:
        logger.warning("%s mislukt: model niet beschikbaar (%s)", naam, fout.reden)
        return antwoord.fout(503, "model_niet_beschikbaar", "Het model geeft nu geen antwoord. " + VUL_ZELF_IN)
    except antwoord.NietIngelogd:
        return antwoord.fout(401, "niet_ingelogd", "Log opnieuw in.")
    except Exception:
        # Details alleen in het logboek, nooit in het antwoord.
        logger.exception("%s mislukt", naam)
        return antwoord.fout(500, "interne_fout", "Er ging iets mis. Probeer het opnieuw.")
