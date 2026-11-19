"""De regels van een bieding. Zie docs/bouwspecificatie.md, hoofdstuk 4."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional

from . import dynamo, geld, tijd

OPEN = "open"
GESLOTEN = "gesloten"

# Een bod in de laatste twee minuten verlengt de eindtijd met twee minuten.
VERLENGING = timedelta(minutes=2)

# Velden van een bieding die naar de web-app mogen. De hoogste bieder hoort daar niet bij.
OPENBARE_VELDEN = (
    "wijnId", "naam", "producent", "jaargang", "druif", "streek", "tekst", "spijs", "drinken",
    "foto", "herkomst", "spraakbericht", "startbod", "minimaleVerhoging",
    "minimaalVolgendBod", "hoogsteBod", "eindtijd", "aantalBiedingen", "biedingStatus",
)


class BodGeweigerd(Exception):
    """Het bod gaat niet door. `code` en `minimaal` gaan naar de web-app."""

    def __init__(self, code: str, minimaal: Optional[int] = None):
        super().__init__(code)
        self.code = code
        self.minimaal = minimaal


def beoordeel_bod(wijn: Mapping[str, Any], bedrag: Any, nu: datetime) -> None:
    if wijn.get("soort") != "bieding" or wijn.get("biedingStatus") != OPEN:
        raise BodGeweigerd("bieding_gesloten")
    if tijd.iso(nu) >= wijn["eindtijd"]:
        raise BodGeweigerd("bieding_gesloten")
    minimaal = int(wijn["minimaalVolgendBod"])
    if not geld.is_bedrag(bedrag):
        raise BodGeweigerd("ongeldig_bedrag", minimaal)
    if bedrag < minimaal:
        raise BodGeweigerd("bod_te_laag", minimaal)


def nieuwe_eindtijd(eindtijd: str, nu: datetime) -> str:
    """De eindtijd na een bod: verlengd als het bod in de laatste twee minuten valt."""
    if tijd.lees(eindtijd) - nu <= VERLENGING:
        return tijd.iso(nu + VERLENGING)
    return eindtijd


def bod_transactie(
    *, tabellen: Mapping[str, str], wijn: Mapping[str, Any], lid_id: str, bedrag: int, nu: datetime
) -> List[Dict[str, Any]]:
    """Schrijft het bod en werkt de wijn bij, alleen als niemand net eerder was.

    De voorwaarde vergelijkt met wat zojuist gelezen is. Faalt hij, dan heeft
    iemand anders in de tussentijd geboden: lees de wijn opnieuw en meld het
    nieuwe minimum.
    """
    beoordeel_bod(wijn, bedrag, nu)
    moment = tijd.iso(nu)
    return [
        {
            "Update": {
                "TableName": tabellen["wijnen"],
                "Key": {"wijnId": dynamo.waarde(wijn["wijnId"])},
                "UpdateExpression": (
                    "SET hoogsteBod = :bod, hoogsteBieder = :lid, minimaalVolgendBod = :volgend, "
                    "eindtijd = :eind, aantalBiedingen = if_not_exists(aantalBiedingen, :nul) + :een"
                ),
                "ConditionExpression": (
                    "biedingStatus = :open AND eindtijd = :gelezenEind "
                    "AND minimaalVolgendBod = :gelezenMinimum"
                ),
                "ExpressionAttributeValues": {
                    ":bod": dynamo.waarde(bedrag),
                    ":lid": dynamo.waarde(lid_id),
                    ":volgend": dynamo.waarde(bedrag + int(wijn["minimaleVerhoging"])),
                    ":eind": dynamo.waarde(nieuwe_eindtijd(wijn["eindtijd"], nu)),
                    ":nul": dynamo.waarde(0),
                    ":een": dynamo.waarde(1),
                    ":open": dynamo.waarde(OPEN),
                    ":gelezenEind": dynamo.waarde(wijn["eindtijd"]),
                    ":gelezenMinimum": dynamo.waarde(int(wijn["minimaalVolgendBod"])),
                },
            }
        },
        {
            "Put": {
                "TableName": tabellen["biedingen"],
                "Item": dynamo.item(
                    {
                        "wijnId": wijn["wijnId"],
                        "tijdstipLid": "{}#{}".format(moment, lid_id),
                        "tijdstip": moment,
                        "lidId": lid_id,
                        "bedrag": bedrag,
                    }
                ),
                "ConditionExpression": "attribute_not_exists(wijnId)",
            }
        },
    ]


def mag_sluiten(wijn: Mapping[str, Any], nu: datetime) -> bool:
    """De taak op de eindtijd sluit alleen als de eindtijd niet is verlengd."""
    return wijn.get("biedingStatus") == OPEN and tijd.iso(nu) >= wijn["eindtijd"]


def openbaar(wijn: Mapping[str, Any], lid_id: str) -> Dict[str, Any]:
    """Wat een lid van een bieding ziet: het hoogste bod, niet wie het deed."""
    zichtbaar = {veld: wijn[veld] for veld in OPENBARE_VELDEN if veld in wijn}
    zichtbaar["mijnBodIsHoogste"] = bool(lid_id) and wijn.get("hoogsteBieder") == lid_id
    return zichtbaar
