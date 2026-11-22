"""POST /api/beheer/herken: de velden uit Marcs WhatsApp-bericht. Zie docs/bouwspecificatie.md, hoofdstuk 5.

In: `bericht`. Uit: `naam`, `producent`, `jaargang`, `aantal`, `prijs` in centen, `tekst` en
`ontbreekt`. De regels staan in domein/herkennen.py.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from wijnclub import antwoord, model, modelaanroep
from wijnclub.domein import herkennen

logger = logging.getLogger()


def _controleer(inhoud: Dict[str, Any]) -> object:
    return herkennen.controleer_bericht(inhoud.get("bericht"))


def _vraag(inhoud: Dict[str, Any]) -> Dict[str, Any]:
    herkend = herkennen.herken(inhoud["bericht"], model.vraag_model(herkennen.SCHEMA))
    logger.info("herkennen gelukt, ontbreekt: %s", ", ".join(herkend.ontbreekt) or "niets")
    return antwoord.json_antwoord(200, herkend.als_antwoord())


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return modelaanroep.voer_uit(event, "herkennen", _controleer, "ongeldig_bericht", _vraag)
