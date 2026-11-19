"""Bedragen staan overal als hele centen: 950 is 9,50 euro."""
from __future__ import annotations

from typing import Iterable, Mapping


def is_bedrag(waarde: object) -> bool:
    """Een geldig bedrag is een heel getal van nul of meer. True en False tellen niet."""
    return isinstance(waarde, int) and not isinstance(waarde, bool) and waarde >= 0


def naar_mollie(cent: int) -> str:
    """Mollie verwacht een bedrag als tekst met twee decimalen: 950 wordt '9.50'."""
    if not is_bedrag(cent):
        raise ValueError("bedrag moet een heel aantal centen zijn")
    return "{}.{:02d}".format(cent // 100, cent % 100)


def totaal(regels: Iterable[Mapping]) -> int:
    return sum(regel["prijs"] * regel["aantal"] for regel in regels)
