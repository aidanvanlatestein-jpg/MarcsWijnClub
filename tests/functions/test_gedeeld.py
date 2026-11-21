"""De regels die ook in de web-app staan, tegen dezelfde gevallen als app/src/gedeeld.test.ts."""
import json
from pathlib import Path

import pytest

from wijnclub.domein import bestelling, bieding, geld, tijd

GEVALLEN = json.loads((Path(__file__).parents[1] / "gedeeld" / "regels.json").read_text(encoding="utf-8"))
REGELS = {"leesEuro", "totaal", "hoogsteToegestaneBod", "nieuweEindtijd", "betaalVoor"}


def test_elke_regel_in_het_bestand_heeft_een_test():
    assert set(GEVALLEN) - {"uitleg"} == REGELS


@pytest.mark.parametrize("geval", GEVALLEN["leesEuro"], ids=lambda g: repr(g["invoer"]))
def test_lees_euro(geval):
    assert geld.lees_euro(geval["invoer"]) == geval["centen"]


@pytest.mark.parametrize("geval", GEVALLEN["totaal"])
def test_totaal(geval):
    assert geld.totaal(geval["regels"]) == geval["centen"]


@pytest.mark.parametrize("geval", GEVALLEN["hoogsteToegestaneBod"])
def test_hoogste_toegestane_bod(geval):
    assert bieding.hoogste_toegestane_bod({"minimaalVolgendBod": geval["minimaalVolgendBod"]}) == geval["hoogste"]


@pytest.mark.parametrize("geval", GEVALLEN["nieuweEindtijd"], ids=lambda g: g["nu"])
def test_nieuwe_eindtijd(geval):
    assert bieding.nieuwe_eindtijd(geval["eindtijd"], tijd.lees(geval["nu"])) == geval["nieuw"]


@pytest.mark.parametrize("geval", GEVALLEN["betaalVoor"], ids=lambda g: g["soort"])
def test_betaal_voor(geval):
    uit = bestelling.betaal_voor(soort=geval["soort"], aangemaakt=tijd.lees(geval["aangemaakt"]))
    assert tijd.iso(uit) == geval["betaalVoor"]
