"""GET /api/aanbod: de open lijst met wijnen, en de open biedingen."""
from __future__ import annotations

import logging
from typing import Any, Dict, Mapping

from wijnclub import antwoord, opslag
from wijnclub.domein import bieding, tijd

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Alleen deze velden gaan naar de web-app.
LIJST_VELDEN = ("lijstId", "titel", "inleiding", "openVan", "openTot", "afhaalpunten")
WIJN_VELDEN = (
    "wijnId", "letter", "naam", "producent", "jaargang", "druif", "streek", "tekst", "spijs", "drinken",
    "foto", "prijs", "voorraad", "volgorde",
)


def _kies(item: Mapping[str, Any], velden) -> Dict[str, Any]:
    return {veld: item[veld] for veld in velden if veld in item}


def handler(event, context):
    try:
        lid = antwoord.lid_id(event)
        nu = tijd.iso(tijd.nu())
        lijsten = []
        for lijst in opslag.open_lijsten(nu):
            zichtbaar = _kies(lijst, LIJST_VELDEN)
            zichtbaar["wijnen"] = [_kies(wijn, WIJN_VELDEN) for wijn in opslag.wijnen_van_lijst(lijst["lijstId"])]
            lijsten.append(zichtbaar)
        biedingen = [bieding.openbaar(wijn, lid) for wijn in opslag.open_biedingen(nu)]
        return antwoord.json_antwoord(200, {"lijsten": lijsten, "biedingen": biedingen})
    except antwoord.NietIngelogd:
        return antwoord.fout(401, "niet_ingelogd", "Log opnieuw in.")
    except Exception:
        # Details alleen in het logboek, nooit in het antwoord.
        logger.exception("aanbod ophalen mislukt")
        return antwoord.fout(500, "interne_fout", "Er ging iets mis. Probeer het opnieuw.")
