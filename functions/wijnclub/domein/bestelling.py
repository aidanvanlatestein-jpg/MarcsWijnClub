"""De levensloop van een bestelling. Zie docs/bouwspecificatie.md, hoofdstuk 3.

Eén regel bepaalt alles: een bestelling blijft open tot betaalVoor, en alleen
een geslaagde betaling of het verstrijken van die tijd verandert de status.

Elke bestelling wordt apart betaald, met iDEAL via Mollie. Van de lijst betaalt
het lid meteen bij het bestellen: Marc houdt de flessen 15 minuten vast. De
voorraad gaat bij het bestellen omlaag en komt terug als de bestelling verloopt.
Bijbestellen is een nieuwe bestelling, die ook apart betaald wordt. Wat Marc
namens een lid invoert, is te betalen tot 48 uur na het invoeren; een gewonnen
bieding tot 48 uur na het sluiten van de bieding.

Levering is brengen (Marc brengt aan huis) of halen (het lid haalt bij Marc).
Per lijst stelt Marc in welke van de twee hij aanbiedt, wanneer, en bij halen
waar. Brengen kan alleen als het lid een afleveradres heeft.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Dict, List, Mapping, Optional, Sequence, Tuple

from . import dynamo, geld, tijd

if TYPE_CHECKING:
    # Alleen voor mypy; door `from __future__ import annotations` wordt dit nooit uitgevoerd.
    from typing_extensions import TypeGuard

OPEN = "open"
BETAALD = "betaald"
VERLOPEN = "verlopen"
TERUGBETAALD = "terugbetaald"

LIJST = "lijst"
NAMENS = "namens"
BIEDING = "bieding"

SOORTEN = (LIJST, NAMENS, BIEDING)

BRENGEN = "brengen"
HALEN = "halen"

LEVERINGEN = (BRENGEN, HALEN)

# Zo lang houdt Marc de flessen vast voor wie van de lijst bestelt.
HOUDTIJD = timedelta(minutes=15)
# Voor een bestelling namens een lid en een gewonnen bieding.
BETAALTERMIJN = timedelta(hours=48)

MAX_REGELS = 25
MAX_AANTAL = 24
MAX_WAAR = 200

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


def betaal_voor(*, soort: str, aangemaakt: datetime) -> datetime:
    """Tot wanneer betaald kan worden, gerekend vanaf het ontstaan van de bestelling.

    Van de lijst: 15 minuten, zo lang houdt Marc de flessen vast. Namens een lid:
    48 uur, want het lid betaalt pas als het Marcs betaallink opent. Bij een
    bieding: 48 uur na het sluiten van de bieding, het moment waarop de
    bestelling ontstaat. Het sluiten van de lijst speelt geen rol.
    """
    if soort == LIJST:
        return aangemaakt + HOUDTIJD
    if soort in (NAMENS, BIEDING):
        return aangemaakt + BETAALTERMIJN
    raise OngeldigeBestelling("onbekende_soort")


def _is_tijd(waarde: Any) -> TypeGuard[str]:
    if not isinstance(waarde, str):
        return False
    try:
        tijd.lees(waarde)
    except ValueError:
        return False
    return True


def valideer_lijst_levering(levering: Any) -> Dict[str, Dict[str, str]]:
    """Controleert wat Marc per lijst instelt en geeft alleen de bekende velden terug.

    De vorm is `{"brengen": {"van", "tot"}, "halen": {"van", "tot", "waar"}}`.
    Wat Marc niet aanbiedt, ontbreekt; minstens één van de twee moet er zijn.
    `van` en `tot` zijn UTC-tekst, `waar` is waar het lid ophaalt.
    """
    if not isinstance(levering, dict):
        raise OngeldigeBestelling("geen_levering_aangeboden")
    schoon: Dict[str, Dict[str, str]] = {}
    for soort in LEVERINGEN:
        keuze = levering.get(soort)
        if keuze is None:
            continue
        if not isinstance(keuze, dict):
            raise OngeldigeBestelling("ongeldige_levering")
        van, tot = keuze.get("van"), keuze.get("tot")
        if not _is_tijd(van) or not _is_tijd(tot) or van >= tot:
            raise OngeldigeBestelling("ongeldig_moment")
        schoon[soort] = {"van": van, "tot": tot}
        if soort == HALEN:
            waar = keuze.get("waar")
            if not isinstance(waar, str) or not waar.strip() or len(waar) > MAX_WAAR:
                raise OngeldigeBestelling("geen_ophaalplek")
            schoon[soort]["waar"] = waar.strip()
    if not schoon:
        raise OngeldigeBestelling("geen_levering_aangeboden")
    return schoon


def openbare_levering(levering: Any) -> Dict[str, Dict[str, str]]:
    """Wat een lid van de levering van een lijst ziet: alleen brengen en halen, met hun velden."""
    if not isinstance(levering, dict):
        return {}
    velden = {BRENGEN: ("van", "tot"), HALEN: ("van", "tot", "waar")}
    zichtbaar: Dict[str, Dict[str, str]] = {}
    for soort in LEVERINGEN:
        keuze = levering.get(soort)
        if isinstance(keuze, dict):
            zichtbaar[soort] = {veld: keuze[veld] for veld in velden[soort] if veld in keuze}
    return zichtbaar


def aangeboden(levering: Any) -> Tuple[str, ...]:
    """Welke levering een lijst aanbiedt, in vaste volgorde: brengen, halen."""
    if not isinstance(levering, dict):
        return ()
    return tuple(soort for soort in LEVERINGEN if isinstance(levering.get(soort), dict))


def valideer_levering(
    *, soort: str, levering: Optional[str], aangeboden: Sequence[str], heeft_adres: bool
) -> None:
    """Levering is brengen of halen, en alleen wat de lijst aanbiedt.

    `aangeboden` komt uit de lijst (zie `aangeboden`), `heeft_adres` uit het lid;
    beide uit de opslag, nooit uit de aanvraag. Brengen kan alleen naar een
    afleveradres. Bij een bieding kiest de winnaar pas na het betalen; daar mag
    levering bij het aanmaken leeg zijn. Bewaren bij Marc is uit de pilot gehaald
    en staat op de roadmap.
    """
    if levering is None:
        if soort != BIEDING:
            raise OngeldigeBestelling("geen_levering")
        return
    if levering not in LEVERINGEN:
        raise OngeldigeBestelling("onbekende_levering")
    if levering not in aangeboden:
        raise OngeldigeBestelling("levering_niet_aangeboden")
    if levering == BRENGEN and not heeft_adres:
        raise OngeldigeBestelling("geen_adres")


def mag_levering_kiezen(bestelling: Mapping[str, Any]) -> bool:
    """De winnaar van een bieding kiest brengen of halen na het betalen, tot de fles er is."""
    return (
        bestelling.get("soort") == BIEDING
        and bestelling.get("status") == BETAALD
        and not bestelling.get("afgeleverdOp")
    )


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
    aangeboden: Sequence[str] = (),
    heeft_adres: bool = False,
) -> Dict[str, Any]:
    """Bouwt de bestelling op. Naam en prijs komen uit de opslag, nooit uit de aanvraag.

    `aangeboden` is de levering die Marc voor de lijst heeft ingesteld en
    `heeft_adres` zegt of het lid een afleveradres heeft; beide komen uit de
    opslag. Het adres zelf komt niet op de bestelling.
    """
    if soort not in SOORTEN:
        raise OngeldigeBestelling("onbekende_soort")
    valideer_levering(soort=soort, levering=levering, aangeboden=aangeboden, heeft_adres=heeft_adres)
    termijn = betaal_voor(soort=soort, aangemaakt=aangemaakt)
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

    Een betaling hoort bij precies één bestelling. Faalt de voorwaarde, dan was
    de bestelling al betaald of verlopen. Lees hem dan opnieuw en vraag aan
    `besluit_na_melding` of het dezelfde melding was of een tweede betaling.
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


def mag_betalen(*, status: str, betaal_voor: str, nu: datetime) -> bool:
    """Een bestelling is te betalen zolang hij open is en de termijn niet voorbij.

    Elke bestelling wordt apart betaald, ook als de lijst nog open staat. Een
    betaling die vlak voor betaalVoor start, kan nog slagen: daarvoor wacht
    `besluit_op_termijn`.
    """
    return status == OPEN and tijd.iso(nu) < betaal_voor


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
