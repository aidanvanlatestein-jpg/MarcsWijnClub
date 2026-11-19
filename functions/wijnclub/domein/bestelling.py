"""De levensloop van een bestelling. Zie docs/bouwspecificatie.md, hoofdstuk 3.

Eén regel bepaalt alles: een bestelling blijft open tot betaalVoor, en alleen
een geslaagde betaling of het verstrijken van die tijd verandert de status.

Bestellen van de lijst is bindend en kost niets. Betalen kan zodra de lijst
gesloten is, in één betaling voor alle open bestellingen van het lid op die
lijst. De termijn is 48 uur na het sluiten.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional, Sequence

from . import dynamo, geld, tijd

OPEN = "open"
BETAALD = "betaald"
VERLOPEN = "verlopen"
TERUGBETAALD = "terugbetaald"

LIJST = "lijst"
NAMENS = "namens"
BIEDING = "bieding"

SOORTEN = (LIJST, NAMENS, BIEDING)

# Levering is een afhaalpunt van de lijst, of bewaren bij Marc (alleen bij een bieding).
BEWAREN = "bewaren"

BETAALTERMIJN = timedelta(hours=48)
LIJST_GESLOTEN = "gesloten"

MAX_REGELS = 25
MAX_AANTAL = 24

# Statussen waarbij een betaling bij Mollie nog kan slagen.
MOLLIE_LOPEND = ("open", "pending", "authorized")


class OngeldigeBestelling(ValueError):
    """De aanvraag klopt niet. `code` gaat naar de web-app, de tekst niet."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def valideer_regels(regels: Any) -> List[Dict[str, Any]]:
    """Controleert wat een lid instuurt en geeft alleen wijnId en aantal terug."""
    if not isinstance(regels, list) or not regels:
        raise OngeldigeBestelling("geen_regels")
    if len(regels) > MAX_REGELS:
        raise OngeldigeBestelling("te_veel_regels")
    schoon: List[Dict[str, Any]] = []
    gezien = set()
    for regel in regels:
        if not isinstance(regel, dict):
            raise OngeldigeBestelling("ongeldige_regel")
        wijn_id = regel.get("wijnId")
        aantal = regel.get("aantal")
        if not isinstance(wijn_id, str) or not wijn_id:
            raise OngeldigeBestelling("ongeldige_regel")
        if not geld.is_bedrag(aantal) or not 1 <= aantal <= MAX_AANTAL:
            raise OngeldigeBestelling("ongeldig_aantal")
        if wijn_id in gezien:
            raise OngeldigeBestelling("dubbele_wijn")
        gezien.add(wijn_id)
        schoon.append({"wijnId": wijn_id, "aantal": aantal})
    return schoon


def betaal_voor(*, soort: str, aangemaakt: datetime, lijst_sluit: Optional[datetime]) -> datetime:
    """Tot wanneer betaald kan worden.

    Van de lijst: 48 uur na het sluiten van de lijst, ook voor wat Marc namens
    een lid invoert. Bij een bieding: 48 uur na het sluiten van de bieding, het
    moment waarop de bestelling ontstaat.
    """
    if soort == BIEDING:
        return aangemaakt + BETAALTERMIJN
    if lijst_sluit is None:
        raise OngeldigeBestelling("geen_lijst")
    return lijst_sluit + BETAALTERMIJN


def valideer_levering(*, soort: str, levering: Optional[str], afhaalpunten: Sequence[str]) -> None:
    """Een afhaalpunt van de lijst, of bewaren bij Marc voor een fles uit een bieding.

    Bij een bieding kiest de winnaar pas na het betalen; daar mag levering leeg zijn.
    """
    if levering is None:
        if soort != BIEDING:
            raise OngeldigeBestelling("geen_afhaalpunt")
        return
    if levering == BEWAREN:
        if soort != BIEDING:
            raise OngeldigeBestelling("bewaren_alleen_bij_bieding")
        return
    if levering not in afhaalpunten:
        raise OngeldigeBestelling("onbekend_afhaalpunt")


def nieuwe_bestelling(
    *,
    bestelling_id: str,
    lid_id: str,
    soort: str,
    lijst_id: Optional[str],
    regels: Sequence[Mapping[str, Any]],
    wijnen: Mapping[str, Mapping[str, Any]],
    levering: Optional[str],
    ingevoerd_door: str,
    aangemaakt: datetime,
    lijst_sluit: Optional[datetime] = None,
    afhaalpunten: Sequence[str] = (),
) -> Dict[str, Any]:
    """Bouwt de bestelling op. Naam en prijs komen uit de opslag, nooit uit de aanvraag.

    `lijst_sluit` is de eindtijd van de lijst en `afhaalpunten` zijn de punten
    die Marc voor die lijst heeft ingesteld; beide komen uit de opslag.
    """
    if soort not in SOORTEN:
        raise OngeldigeBestelling("onbekende_soort")
    valideer_levering(soort=soort, levering=levering, afhaalpunten=afhaalpunten)
    termijn = betaal_voor(soort=soort, aangemaakt=aangemaakt, lijst_sluit=lijst_sluit)
    volledig = []
    for regel in regels:
        wijn = wijnen.get(regel["wijnId"])
        if wijn is None:
            raise OngeldigeBestelling("onbekende_wijn")
        volledig.append(
            {
                "wijnId": regel["wijnId"],
                "naam": wijn["naam"],
                "aantal": regel["aantal"],
                "prijs": int(wijn["prijs"]),
            }
        )
    return {
        "bestellingId": bestelling_id,
        "lidId": lid_id,
        "soort": soort,
        "lijstId": lijst_id,
        "regels": volledig,
        "totaal": geld.totaal(volledig),
        "status": OPEN,
        "voorraadGereserveerd": soort != BIEDING,
        "betaalVoor": tijd.iso(termijn),
        "levering": levering,
        "ingevoerdDoor": ingevoerd_door,
        "aangemaakt": tijd.iso(aangemaakt),
    }


def reserveer_transactie(
    *, tabellen: Mapping[str, str], bestelling: Mapping[str, Any], nu: datetime
) -> List[Dict[str, Any]]:
    """Alles of niets: lijst open, voorraad omlaag per wijn, bestelling geschreven.

    De volgorde is vast: eerst de lijst, dan één stap per regel, dan de
    bestelling. `uitverkocht` rekent daarop.
    """
    stappen: List[Dict[str, Any]] = [
        {
            "ConditionCheck": {
                "TableName": tabellen["lijsten"],
                "Key": {"lijstId": dynamo.waarde(bestelling["lijstId"])},
                "ConditionExpression": "#status = :open AND openTot > :nu",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {
                    ":open": dynamo.waarde("open"),
                    ":nu": dynamo.waarde(tijd.iso(nu)),
                },
            }
        }
    ]
    for regel in bestelling["regels"]:
        stappen.append(
            {
                "Update": {
                    "TableName": tabellen["wijnen"],
                    "Key": {"wijnId": dynamo.waarde(regel["wijnId"])},
                    "UpdateExpression": "SET voorraad = voorraad - :aantal",
                    "ConditionExpression": "voorraad >= :aantal AND lijstId = :lijst AND soort = :vast",
                    "ExpressionAttributeValues": {
                        ":aantal": dynamo.waarde(regel["aantal"]),
                        ":lijst": dynamo.waarde(bestelling["lijstId"]),
                        ":vast": dynamo.waarde("vast"),
                    },
                }
            }
        )
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


def uitverkocht(
    redenen: Sequence[Mapping[str, Any]], regels: Sequence[Mapping[str, Any]]
) -> Dict[str, Any]:
    """Leest uit een mislukte transactie welke wijnen op zijn.

    `redenen` is de lijst CancellationReasons van DynamoDB, in de volgorde van
    `reserveer_transactie`.
    """

    def mislukt(positie: int) -> bool:
        return positie < len(redenen) and redenen[positie].get("Code") == "ConditionalCheckFailed"

    return {
        "lijstGesloten": mislukt(0),
        "wijnen": [regel["wijnId"] for positie, regel in enumerate(regels, start=1) if mislukt(positie)],
    }


@dataclass(frozen=True)
class Besluit:
    """Wat er na een melding van Mollie met de bestelling moet gebeuren."""

    nieuwe_status: Optional[str] = None
    controle_nodig: bool = False


def besluit_na_melding(status: str, mollie_status: str, terugbetaald: bool = False) -> Besluit:
    if status == OPEN and mollie_status == "paid":
        return Besluit(nieuwe_status=BETAALD)
    if status == VERLOPEN and mollie_status == "paid":
        # Betaald nadat de voorraad is teruggegeven: Marc levert alsnog of betaalt terug.
        return Besluit(controle_nodig=True)
    if status == BETAALD and terugbetaald:
        return Besluit(nieuwe_status=TERUGBETAALD)
    return Besluit()


NIETS = "niets"
WACHT = "wacht"
VERWERK_BETALING = "verwerk_betaling"
VERLOOP = "verloop"


def besluit_op_termijn(status: str, laatste_mollie_status: Optional[str]) -> str:
    """Wat de taak op betaalVoor moet doen."""
    if status != OPEN:
        return NIETS
    if laatste_mollie_status == "paid":
        return VERWERK_BETALING
    if laatste_mollie_status in MOLLIE_LOPEND:
        return WACHT
    return VERLOOP


def betaald_wijziging(*, tabellen: Mapping[str, str], bestelling_id: str, nu: datetime) -> Dict[str, Any]:
    """Zet de bestelling op betaald, alleen als hij nog open is.

    Komt dezelfde melding nog eens, dan faalt de voorwaarde en gebeurt er niets.
    """
    return {
        "TableName": tabellen["bestellingen"],
        "Key": {"bestellingId": dynamo.waarde(bestelling_id)},
        "UpdateExpression": "SET #status = :betaald, betaaldOp = :nu",
        "ConditionExpression": "#status = :open",
        "ExpressionAttributeNames": {"#status": "status"},
        "ExpressionAttributeValues": {
            ":betaald": dynamo.waarde(BETAALD),
            ":open": dynamo.waarde(OPEN),
            ":nu": dynamo.waarde(tijd.iso(nu)),
        },
    }


def mag_betalen(*, soort: str, status: str, lijst_status: Optional[str]) -> bool:
    """Een bestelling van de lijst is pas te betalen als de lijst gesloten is.

    Tot die tijd kan het lid bijbestellen; daarna gaat alles in één betaling.
    """
    if status != OPEN:
        return False
    if soort == BIEDING:
        return True
    return lijst_status == LIJST_GESLOTEN


def betaalverzoek(bestellingen: Sequence[Mapping[str, Any]]) -> Dict[str, Any]:
    """Eén betaling voor alle open bestellingen van een lid op dezelfde lijst.

    Ook wat het lid bijbestelde en wat Marc namens hem invoerde telt mee.
    """
    open_staand = [bestelling for bestelling in bestellingen if bestelling["status"] == OPEN]
    return {
        "bestellingIds": [bestelling["bestellingId"] for bestelling in open_staand],
        "bedrag": sum(int(bestelling["totaal"]) for bestelling in open_staand),
    }


def betaald_transactie(
    *, tabellen: Mapping[str, str], bestelling_ids: Sequence[str], nu: datetime
) -> List[Dict[str, Any]]:
    """Zet alle bestellingen van één betaling op betaald: alles of niets.

    Komt dezelfde melding nog eens, dan faalt de voorwaarde op elke bestelling
    en gebeurt er niets.
    """
    if not bestelling_ids:
        raise OngeldigeBestelling("geen_bestellingen")
    if len(set(bestelling_ids)) != len(bestelling_ids):
        raise OngeldigeBestelling("dubbele_bestelling")
    return [
        {"Update": betaald_wijziging(tabellen=tabellen, bestelling_id=bestelling_id, nu=nu)}
        for bestelling_id in bestelling_ids
    ]


def verloop_transactie(
    *, tabellen: Mapping[str, str], bestelling: Mapping[str, Any], nu: datetime
) -> List[Dict[str, Any]]:
    """Zet de bestelling op verlopen en geeft de voorraad terug, alleen als hij nog open is."""
    stappen: List[Dict[str, Any]] = [
        {
            "Update": {
                "TableName": tabellen["bestellingen"],
                "Key": {"bestellingId": dynamo.waarde(bestelling["bestellingId"])},
                "UpdateExpression": "SET #status = :verlopen, verlopenOp = :nu",
                "ConditionExpression": "#status = :open",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {
                    ":verlopen": dynamo.waarde(VERLOPEN),
                    ":open": dynamo.waarde(OPEN),
                    ":nu": dynamo.waarde(tijd.iso(nu)),
                },
            }
        }
    ]
    if bestelling.get("voorraadGereserveerd"):
        for regel in bestelling["regels"]:
            stappen.append(
                {
                    "Update": {
                        "TableName": tabellen["wijnen"],
                        "Key": {"wijnId": dynamo.waarde(regel["wijnId"])},
                        "UpdateExpression": "SET voorraad = voorraad + :aantal",
                        "ConditionExpression": "attribute_exists(wijnId)",
                        "ExpressionAttributeValues": {":aantal": dynamo.waarde(regel["aantal"])},
                    }
                }
            )
    return stappen
