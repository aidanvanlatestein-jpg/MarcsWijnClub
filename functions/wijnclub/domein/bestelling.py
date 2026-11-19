"""De levensloop van een bestelling. Zie docs/bouwspecificatie.md, hoofdstuk 3.

Eén regel bepaalt alles: een bestelling blijft open tot betaalVoor, en alleen
een geslaagde betaling of het verstrijken van die tijd verandert de status.

Bestellen van de lijst is bindend en kost niets. Betalen kan zodra de lijst
gesloten is, in één betaling voor alle open bestellingen van het lid op die
lijst. De termijn is 48 uur na het sluiten.
"""
from __future__ import annotations

import hashlib
import re
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

BETAALTERMIJN = timedelta(hours=48)
LIJST_GESLOTEN = "gesloten"

MAX_REGELS = 25
MAX_AANTAL = 24

# Statussen waarbij een betaling bij Mollie nog kan slagen.
MOLLIE_LOPEND = ("open", "pending", "authorized")

# De sleutel die de web-app per bestelpoging meestuurt, bijvoorbeeld een UUID.
SLEUTEL = re.compile(r"^[A-Za-z0-9-]{8,64}$")


class OngeldigeBestelling(ValueError):
    """De aanvraag klopt niet. `code` gaat naar de web-app, de tekst niet."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def bestelling_id_uit_sleutel(lid_id: str, sleutel: Any) -> str:
    """Het nummer van een bestelling van de lijst, afgeleid van het lid en de sleutel van de poging.

    Stuurt de web-app dezelfde poging nog eens, bijvoorbeeld na een time-out, dan
    komt er hetzelfde nummer uit en weigert `reserveer_transactie` de tweede keer.
    Zo ontstaat er nooit een dubbele bestelling. Het lid zit in het nummer, zodat
    een sleutel van een ander lid nooit hetzelfde nummer geeft.
    """
    if not isinstance(sleutel, str) or not SLEUTEL.match(sleutel):
        raise OngeldigeBestelling("ongeldige_sleutel")
    return "b-" + hashlib.sha256("{}:{}".format(lid_id, sleutel).encode("utf-8")).hexdigest()[:32]


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
    """Levering is altijd een afhaalpunt van de lijst, ook voor een fles uit een bieding.

    Bij een bieding kiest de winnaar pas na het betalen; daar mag levering leeg zijn.
    Bewaren bij Marc is uit de pilot gehaald en staat op de roadmap.
    """
    if levering is None:
        if soort != BIEDING:
            raise OngeldigeBestelling("geen_afhaalpunt")
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
        # Een wijn zonder prijs is een bieding: die is niet van de lijst te bestellen.
        if wijn is None or "prijs" not in wijn:
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
    bestelling. `uitverkocht` en `bestaat_al` rekenen daarop.

    Mislukt de transactie, kijk dan in deze volgorde naar de CancellationReasons:

    1. `dynamo.opnieuw_proberen`: een ander lid bestelde op hetzelfde moment
       dezelfde wijn. Er is niets op; probeer het na een korte pauze opnieuw.
    2. `bestaat_al`: dezelfde poging kwam al eerder binnen. Geef de bestaande
       bestelling terug.
    3. `uitverkocht`: de lijst is dicht of een wijn is op.
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


def bestaat_al(redenen: Sequence[Mapping[str, Any]], regels: Sequence[Mapping[str, Any]]) -> bool:
    """Of de bestelling er al stond: dezelfde poging is twee keer verstuurd.

    De bestelling is de laatste stap van `reserveer_transactie`. Bij een herhaling
    kan ook een wijn als op gemeld worden, omdat de eerste poging de voorraad al
    verlaagde; daarom gaat deze controle vóór `uitverkocht`.
    """
    positie = len(regels) + 1
    return positie < len(redenen) and redenen[positie].get("Code") == "ConditionalCheckFailed"


@dataclass(frozen=True)
class Besluit:
    """Wat er na een melding van Mollie met de bestelling moet gebeuren."""

    nieuwe_status: Optional[str] = None
    controle_nodig: bool = False


def besluit_na_melding(
    status: str,
    mollie_status: str,
    *,
    betaling_id: str,
    betaald_met: Optional[str],
    terugbetaald: bool = False,
) -> Besluit:
    """Wat een melding van Mollie voor één bestelling betekent.

    `betaling_id` is de betaling waar de melding over gaat. `betaald_met` is de
    betaling waarmee de bestelling eerder op betaald is gezet (`mollieBetalingId`
    op de bestelling), of None als dat nog niet gebeurd is.
    """
    if mollie_status != "paid":
        return Besluit()
    if status == OPEN:
        return Besluit(nieuwe_status=BETAALD)
    if status == VERLOPEN:
        # Betaald nadat de voorraad is teruggegeven: Marc levert alsnog of betaalt terug.
        return Besluit(controle_nodig=True)
    if betaling_id != betaald_met:
        # Een tweede betaling voor een bestelling die al betaald is: het lid heeft
        # dubbel betaald en Marc betaalt die terug. Is dat gebeurd, dan is het klaar.
        return Besluit() if terugbetaald else Besluit(controle_nodig=True)
    if status == BETAALD and terugbetaald:
        return Besluit(nieuwe_status=TERUGBETAALD)
    # Dezelfde melding nog eens.
    return Besluit()


NIETS = "niets"
WACHT = "wacht"
VERWERK_BETALING = "verwerk_betaling"
VERLOOP = "verloop"


def besluit_op_termijn(status: str, mollie_statussen: Sequence[str]) -> str:
    """Wat de taak op betaalVoor moet doen.

    `mollie_statussen` zijn de statussen van alle betalingen die het lid voor deze
    bestelling startte, niet alleen de laatste: een eerdere betaling kan nog
    slagen nadat een latere is afgebroken.
    """
    if status != OPEN:
        return NIETS
    if "paid" in mollie_statussen:
        return VERWERK_BETALING
    if any(mollie_status in MOLLIE_LOPEND for mollie_status in mollie_statussen):
        return WACHT
    return VERLOOP


def betaald_wijziging(
    *, tabellen: Mapping[str, str], bestelling_id: str, betaling_id: str, nu: datetime
) -> Dict[str, Any]:
    """Zet de bestelling op betaald, alleen als hij nog open is, en onthoudt met welke betaling.

    Faalt de voorwaarde, dan was de bestelling al betaald of verlopen. Vraag dan
    per bestelling aan `besluit_na_melding` of het dezelfde melding was of een
    tweede betaling.
    """
    return {
        "TableName": tabellen["bestellingen"],
        "Key": {"bestellingId": dynamo.waarde(bestelling_id)},
        "UpdateExpression": "SET #status = :betaald, betaaldOp = :nu, mollieBetalingId = :betaling",
        "ConditionExpression": "#status = :open",
        "ExpressionAttributeNames": {"#status": "status"},
        "ExpressionAttributeValues": {
            ":betaald": dynamo.waarde(BETAALD),
            ":open": dynamo.waarde(OPEN),
            ":nu": dynamo.waarde(tijd.iso(nu)),
            ":betaling": dynamo.waarde(betaling_id),
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
    *, tabellen: Mapping[str, str], bestelling_ids: Sequence[str], betaling_id: str, nu: datetime
) -> List[Dict[str, Any]]:
    """Zet alle bestellingen van één betaling op betaald: alles of niets.

    Faalt de transactie op een voorwaarde, dan was er al iets betaald of
    verlopen. Lees de bestellingen dan opnieuw en vraag per bestelling aan
    `besluit_na_melding` wat er moet gebeuren: niets bij dezelfde melding,
    `controleNodig` bij een tweede betaling.
    """
    if not bestelling_ids:
        raise OngeldigeBestelling("geen_bestellingen")
    if len(set(bestelling_ids)) != len(bestelling_ids):
        raise OngeldigeBestelling("dubbele_bestelling")
    return [
        {"Update": betaald_wijziging(tabellen=tabellen, bestelling_id=bestelling_id, betaling_id=betaling_id, nu=nu)}
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
