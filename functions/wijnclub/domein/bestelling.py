"""De levensloop van een bestelling. Zie docs/bouwspecificatie.md, hoofdstuk 3.

Eén regel bepaalt alles: een bestelling blijft open tot betaalVoor, en alleen
een geslaagde betaling of het verstrijken van die tijd verandert de status.
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

LEVERINGEN = ("brengen", "afhalen", "bewaren")

# 15 minuten waarna Mollie een iDEAL-betaling laat verlopen, plus marge.
BETAALTERMIJN = {
    LIJST: timedelta(minutes=20),
    NAMENS: timedelta(hours=48),
    BIEDING: timedelta(hours=48),
}

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
) -> Dict[str, Any]:
    """Bouwt de bestelling op. Naam en prijs komen uit de opslag, nooit uit de aanvraag."""
    if soort not in BETAALTERMIJN:
        raise OngeldigeBestelling("onbekende_soort")
    if levering is not None and levering not in LEVERINGEN:
        raise OngeldigeBestelling("onbekende_levering")
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
        "betaalVoor": tijd.iso(aangemaakt + BETAALTERMIJN[soort]),
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
