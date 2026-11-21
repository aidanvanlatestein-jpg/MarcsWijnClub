"""Antwoorden naar de web-app en gegevens uit het token van Cognito."""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Dict, List, Mapping, Union


class NietIngelogd(Exception):
    pass


def _getal(waarde: Any) -> Union[int, float]:
    # DynamoDB geeft getallen terug als Decimal.
    if isinstance(waarde, Decimal):
        return int(waarde) if waarde == waarde.to_integral_value() else float(waarde)
    raise TypeError("niet om te zetten: {}".format(type(waarde).__name__))


def json_antwoord(status: int, inhoud: Any) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"},
        "body": json.dumps(inhoud, default=_getal, ensure_ascii=False),
    }


def fout(status: int, code: str, bericht: str) -> Dict[str, Any]:
    """Een fout heeft altijd dezelfde vorm, zonder interne details."""
    return json_antwoord(status, {"fout": code, "bericht": bericht})


def _claims(event: Mapping[str, Any]) -> Mapping[str, Any]:
    try:
        claims: Mapping[str, Any] = event["requestContext"]["authorizer"]["jwt"]["claims"]
    except (KeyError, TypeError):
        raise NietIngelogd() from None
    return claims


def lid_id(event: Mapping[str, Any]) -> str:
    """Het lid komt altijd uit het token, nooit uit de aanvraag."""
    sub = _claims(event).get("sub")
    if not isinstance(sub, str) or not sub:
        raise NietIngelogd()
    return sub


def groepen(event: Mapping[str, Any]) -> List[str]:
    """De groepen van het lid.

    API Gateway geeft een lijst in het token door als tekst, bijvoorbeeld
    "[beheer]" of "[beheer leden]".
    """
    ruw = _claims(event).get("cognito:groups", [])
    if isinstance(ruw, list):
        return [str(groep) for groep in ruw]
    if isinstance(ruw, str):
        return [deel for deel in ruw.strip("[]").replace(",", " ").split() if deel]
    return []


def is_beheer(event: Mapping[str, Any]) -> bool:
    return "beheer" in groepen(event)
