"""De regels van een bieding. Zie docs/bouwspecificatie.md, hoofdstuk 4."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional

from . import dynamo, geld, tijd

OPEN = "open"
GESLOTEN = "gesloten"

# Een bod in de laatste twee minuten verlengt de eindtijd met twee minuten.
VERLENGING = timedelta(minutes=2)

# Een bod is hoogstens drie keer het minimum. Dat vangt een tikfout of een nul
# te veel op: een bod is bindend en zet het minimum voor iedereen vast.
HOOGSTE_FACTOR = 3

# Velden van een bieding die naar de web-app mogen. De hoogste bieder hoort daar niet bij.
OPENBARE_VELDEN = (
    "wijnId", "naam", "producent", "jaargang", "druif", "streek", "tekst", "spijs", "drinken",
    "foto", "herkomst", "spraakbericht", "startbod", "minimaleVerhoging",
    "minimaalVolgendBod", "hoogsteBod", "eindtijd", "aantalBiedingen", "biedingStatus",
)


class BodGeweigerd(Exception):
    """Het bod gaat niet door. `code`, `minimaal` en `maximaal` gaan naar de web-app."""

    def __init__(self, code: str, minimaal: Optional[int] = None, maximaal: Optional[int] = None):
        super().__init__(code)
        self.code = code
        self.minimaal = minimaal
        self.maximaal = maximaal


def hoogste_toegestane_bod(wijn: Mapping[str, Any]) -> int:
    return int(wijn["minimaalVolgendBod"]) * HOOGSTE_FACTOR


def beoordeel_bod(wijn: Mapping[str, Any], bedrag: Any, nu: datetime, lid_id: str) -> None:
    if wijn.get("soort") != "bieding" or wijn.get("biedingStatus") != OPEN:
        raise BodGeweigerd("bieding_gesloten")
    if tijd.iso(nu) >= wijn["eindtijd"]:
        raise BodGeweigerd("bieding_gesloten")
    minimaal = int(wijn["minimaalVolgendBod"])
    maximaal = hoogste_toegestane_bod(wijn)
    if wijn.get("hoogsteBieder") == lid_id:
        # Je eigen hoogste bod overbieden kost alleen jezelf geld.
        raise BodGeweigerd("al_hoogste", minimaal, maximaal)
    if not geld.is_bedrag(bedrag):
        raise BodGeweigerd("ongeldig_bedrag", minimaal, maximaal)
    if bedrag < minimaal:
        raise BodGeweigerd("bod_te_laag", minimaal, maximaal)
    if bedrag > maximaal:
        raise BodGeweigerd("bod_te_hoog", minimaal, maximaal)


def nieuwe_eindtijd(eindtijd: str, nu: datetime) -> str:
    """De eindtijd na een bod: verlengd als het bod in de laatste twee minuten valt."""
    if tijd.lees(eindtijd) - nu <= VERLENGING:
        return tijd.iso(nu + VERLENGING)
    return eindtijd


def bod_transactie(
    *, tabellen: Mapping[str, str], wijn: Mapping[str, Any], lid_id: str, bedrag: int, nu: datetime
) -> List[Dict[str, Any]]:
    """Schrijft het bod en werkt de wijn bij, alleen als niemand net eerder was.

    De voorwaarde vergelijkt met wat zojuist gelezen is. Breekt DynamoDB de
    transactie af, om welke reden ook, lees de wijn dan opnieuw en roep deze
    functie nog eens aan, hoogstens een paar keer en met een korte pauze:

    - was iemand net eerder, dan weigert `beoordeel_bod` nu met het nieuwe
      minimum, of met `bieding_gesloten`;
    - botsten twee biedingen alleen in de tijd (`dynamo.opnieuw_proberen`), of
      bood hetzelfde lid twee keer in dezelfde seconde, dan gaat het bod bij de
      volgende poging gewoon door.
    """
    beoordeel_bod(wijn, bedrag, nu, lid_id)
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


def sluit_transactie(
    *, tabellen: Mapping[str, str], wijn: Mapping[str, Any], bestelling: Optional[Mapping[str, Any]], nu: datetime
) -> List[Dict[str, Any]]:
    """Sluit de bieding en schrijft de bestelling van de winnaar: alles of niets.

    Zo bestaat er nooit een gesloten bieding met een winnaar zonder bestelling.
    `bestelling` komt uit `bestelling.nieuwe_bestelling` met soort bieding, of is
    None als niemand bood. De voorwaarde vergelijkt met wat zojuist gelezen is:
    kwam er nog een bod tussendoor of draaide de taak twee keer, dan gebeurt er niets.
    """
    if not mag_sluiten(wijn, nu):
        raise ValueError("de bieding is nog niet te sluiten")
    winnaar = wijn.get("hoogsteBieder")
    if winnaar and bestelling is None:
        raise ValueError("de winnaar heeft geen bestelling")
    if bestelling is not None and (
        bestelling["lidId"] != winnaar or int(bestelling["totaal"]) != int(wijn.get("hoogsteBod", -1))
    ):
        raise ValueError("de bestelling hoort niet bij het hoogste bod")
    stappen: List[Dict[str, Any]] = [
        {
            "Update": {
                "TableName": tabellen["wijnen"],
                "Key": {"wijnId": dynamo.waarde(wijn["wijnId"])},
                "UpdateExpression": "SET biedingStatus = :gesloten",
                "ConditionExpression": (
                    "biedingStatus = :open AND eindtijd = :gelezenEind "
                    "AND minimaalVolgendBod = :gelezenMinimum"
                ),
                "ExpressionAttributeValues": {
                    ":gesloten": dynamo.waarde(GESLOTEN),
                    ":open": dynamo.waarde(OPEN),
                    ":gelezenEind": dynamo.waarde(wijn["eindtijd"]),
                    ":gelezenMinimum": dynamo.waarde(int(wijn["minimaalVolgendBod"])),
                },
            }
        }
    ]
    if bestelling is not None:
        stappen.append(
            {
                "Put": {
                    "TableName": tabellen["bestellingen"],
                    "Item": dynamo.item(dict(bestelling)),
                    "ConditionExpression": "attribute_not_exists(bestellingId)",
                }
            }
        )
    return stappen


def openbaar(wijn: Mapping[str, Any], lid_id: str) -> Dict[str, Any]:
    """Wat een lid van een bieding ziet: het hoogste bod, niet wie het deed."""
    zichtbaar = {veld: wijn[veld] for veld in OPENBARE_VELDEN if veld in wijn}
    zichtbaar["mijnBodIsHoogste"] = bool(lid_id) and wijn.get("hoogsteBieder") == lid_id
    return zichtbaar
