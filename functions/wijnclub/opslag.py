"""Lezen en schrijven in DynamoDB.

De namen van de tabellen komen uit omgevingsvariabelen die de CDK-stack zet:
TABEL_LIJSTEN, TABEL_WIJNEN, enzovoort.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

import boto3
from boto3.dynamodb.conditions import Key

_bron = None


def _tabel(naam: str) -> Any:
    global _bron
    if _bron is None:
        _bron = boto3.resource("dynamodb")
    return _bron.Table(os.environ["TABEL_{}".format(naam.upper())])


def _alles(tabel: Any, **vraag: Any) -> List[Dict[str, Any]]:
    """Haalt alle pagina's van een query op."""
    items: List[Dict[str, Any]] = []
    while True:
        antwoord = tabel.query(**vraag)
        items.extend(antwoord.get("Items", []))
        verder = antwoord.get("LastEvaluatedKey")
        if not verder:
            return items
        vraag["ExclusiveStartKey"] = verder


def open_lijsten(nu: str) -> List[Dict[str, Any]]:
    """Lijsten met status open waarvan de eindtijd nog niet voorbij is."""
    return _alles(
        _tabel("lijsten"),
        IndexName="status-index",
        KeyConditionExpression=Key("status").eq("open") & Key("openTot").gt(nu),
    )


def wijnen_van_lijst(lijst_id: str) -> List[Dict[str, Any]]:
    """De wijnen van één lijst, in de volgorde die Marc koos."""
    return _alles(
        _tabel("wijnen"),
        IndexName="lijst-index",
        KeyConditionExpression=Key("lijstId").eq(lijst_id),
    )


def open_biedingen(nu: str) -> List[Dict[str, Any]]:
    """Biedingen die open staan, de eerst sluitende voorop."""
    return _alles(
        _tabel("wijnen"),
        IndexName="bieding-index",
        KeyConditionExpression=Key("biedingStatus").eq("open") & Key("eindtijd").gt(nu),
    )


def tel_modelaanroep(argumenten: Dict[str, Any]) -> bool:
    """Telt één aanroep van het taalmodel. False als de grens van de dag al bereikt is.

    De argumenten komen uit domein.teller.tel_op.
    """
    tabel = _tabel("tellers")
    try:
        tabel.update_item(**argumenten)
    except tabel.meta.client.exceptions.ConditionalCheckFailedException:
        return False
    return True
