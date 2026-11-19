"""Waarden omzetten naar de vorm die DynamoDB in een transactie verwacht.

De regels in dit pakket bouwen transacties op zonder boto3, zodat ze los te
testen zijn. De handlers voeren ze uit met transact_write_items.
"""
from __future__ import annotations

from typing import Any, Dict, Mapping, Sequence

# Redenen waarom DynamoDB een transactie afbreekt zonder dat een voorwaarde faalde:
# een andere transactie raakte hetzelfde item, of de tabel had het even te druk.
TIJDELIJK = ("TransactionConflict", "ThrottlingError", "ProvisionedThroughputExceeded")


def waarde(invoer: Any) -> Dict[str, Any]:
    if invoer is None:
        return {"NULL": True}
    if isinstance(invoer, bool):
        return {"BOOL": invoer}
    if isinstance(invoer, int):
        return {"N": str(invoer)}
    if isinstance(invoer, str):
        return {"S": invoer}
    if isinstance(invoer, (list, tuple)):
        return {"L": [waarde(deel) for deel in invoer]}
    if isinstance(invoer, dict):
        return {"M": {sleutel: waarde(deel) for sleutel, deel in invoer.items()}}
    raise TypeError("niet op te slaan: {}".format(type(invoer).__name__))


def item(gegevens: Dict[str, Any]) -> Dict[str, Any]:
    """Een heel item. Velden zonder waarde worden weggelaten."""
    return {sleutel: waarde(deel) for sleutel, deel in gegevens.items() if deel is not None}


def opnieuw_proberen(redenen: Sequence[Mapping[str, Any]]) -> bool:
    """Of een afgebroken transactie na een korte pauze opnieuw geprobeerd moet worden.

    `redenen` is de lijst CancellationReasons. Bestellen twee leden op hetzelfde
    moment dezelfde wijn, of bieden ze tegelijk, dan breekt DynamoDB één van de
    twee af met TransactionConflict. Dat zegt niets over voorraad of bod; de
    handler probeert het een paar keer opnieuw, met een willekeurige pauze.
    """
    return any(reden.get("Code") in TIJDELIJK for reden in redenen)
