"""Tijden als UTC-tekst, zodat ze als tekst te sorteren en te vergelijken zijn."""
from __future__ import annotations

from datetime import datetime, timezone

FORMAAT = "%Y-%m-%dT%H:%M:%SZ"


def nu() -> datetime:
    return datetime.now(timezone.utc)


def iso(moment: datetime) -> str:
    """Zet een tijdstip om naar tekst, bijvoorbeeld 2026-11-19T15:40:00Z."""
    if moment.tzinfo is None:
        raise ValueError("tijdstip zonder tijdzone")
    return moment.astimezone(timezone.utc).strftime(FORMAAT)


def lees(tekst: str) -> datetime:
    return datetime.strptime(tekst, FORMAAT).replace(tzinfo=timezone.utc)
