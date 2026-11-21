"""POST /api/beheer/teksten: drie tekstvoorstellen uit Marcs notitie. Zie docs/bouwspecificatie.md, hoofdstuk 5.

In: `notitie` en de velden van de wijn (`naam`, `producent`, `jaargang`, `streek`, `druif`).
Uit: `voorstellen`, elk met `tekst` en `nieuw`. De regels staan in domein/tekst.py.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from wijnclub import antwoord, model, modelaanroep
from wijnclub.domein import tekst

logger = logging.getLogger()


def _controleer(inhoud: Dict[str, Any]) -> object:
    return tekst.controleer_notitie(inhoud.get("notitie"))


def _vraag(inhoud: Dict[str, Any]) -> Dict[str, Any]:
    # De velden van de wijn staan naast de notitie; tekst.py neemt alleen de bekende velden.
    voorstellen = tekst.stel_voor(inhoud["notitie"], inhoud, model.vraag_model(tekst.SCHEMA))
    logger.info("teksten gelukt: %d voorstellen over", len(voorstellen))
    return antwoord.json_antwoord(200, {"voorstellen": [voorstel.als_antwoord() for voorstel in voorstellen]})


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return modelaanroep.voer_uit(event, "teksten", _controleer, "ongeldige_notitie", _vraag)
