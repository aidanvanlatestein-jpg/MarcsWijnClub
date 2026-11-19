"""Bedragen staan overal als hele centen: 950 is 9,50 euro."""
from __future__ import annotations

import re
from typing import Iterable, Mapping, Optional


def is_bedrag(waarde: object) -> bool:
    """Een geldig bedrag is een heel getal van nul of meer. True en False tellen niet."""
    return isinstance(waarde, int) and not isinstance(waarde, bool) and waarde >= 0


def naar_mollie(cent: int) -> str:
    """Mollie verwacht een bedrag als tekst met twee decimalen: 950 wordt '9.50'."""
    if not is_bedrag(cent):
        raise ValueError("bedrag moet een heel aantal centen zijn")
    return "{}.{:02d}".format(cent // 100, cent % 100)


def lees_euro(invoer: object) -> Optional[int]:
    """'11,50', '11.5', '€ 11' of '10,-' naar hele centen. Geen geldig bedrag: None."""
    if not isinstance(invoer, str):
        return None
    m = re.fullmatch(r"\s*€?\s*(\d{1,5})(?:[.,](\d{1,2}|-))?\s*", invoer)
    if not m:
        return None
    rest = m.group(2)
    if rest is None or rest == "-":
        deel = 0
    else:
        deel = int(rest) * 10 if len(rest) == 1 else int(rest)
    return int(m.group(1)) * 100 + deel


def totaal(regels: Iterable[Mapping]) -> int:
    return sum(regel["prijs"] * regel["aantal"] for regel in regels)
