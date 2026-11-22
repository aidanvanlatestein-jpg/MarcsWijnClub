"""De grens op het taalmodel: hoogstens 100 aanroepen per dag. Zie docs/bouwspecificatie.md, hoofdstuk 5.

Herkennen, teksten en straks het etiket tellen samen in één teller per dag, in de tabel `tellers`.
De handler telt met één voorwaardelijke UpdateItem vóór hij het model aanroept. Faalt de voorwaarde,
dan is de grens bereikt: de handler geeft 429 en Marc vult zelf in.

Deze module bouwt de aanvraag op zonder boto3, zodat de regel los te testen is. De dag is een
UTC-dag, zoals elke tijd in de app.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

GRENS_PER_DAG = 100
BEWAARDAGEN = 3  # Daarna verwijdert DynamoDB de teller vanzelf.


def sleutel(moment: datetime) -> str:
    """De teller van de dag, bijvoorbeeld model#2026-11-21."""
    if moment.tzinfo is None:
        raise ValueError("tijdstip zonder tijdzone")
    return "model#{}".format(moment.astimezone(timezone.utc).date().isoformat())


def vervalt_op(moment: datetime) -> int:
    """Seconden sinds 1970, zoals DynamoDB voor een vervaltijd vraagt."""
    if moment.tzinfo is None:
        raise ValueError("tijdstip zonder tijdzone")
    return int((moment + timedelta(days=BEWAARDAGEN)).timestamp())


def tel_op(moment: datetime) -> Dict[str, Any]:
    """De argumenten voor Table.update_item: één erbij, zolang de teller onder de grens is.

    Komt de 101e aanroep van de dag, dan faalt de voorwaarde en verandert er niets.
    """
    return {
        "Key": {"tellerId": sleutel(moment)},
        "UpdateExpression": "ADD aantal :een SET vervaltOp = if_not_exists(vervaltOp, :vervalt)",
        "ConditionExpression": "attribute_not_exists(aantal) OR aantal < :grens",
        "ExpressionAttributeValues": {":een": 1, ":grens": GRENS_PER_DAG, ":vervalt": vervalt_op(moment)},
    }
