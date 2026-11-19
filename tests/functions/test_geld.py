import pytest

from wijnclub.domein import geld


@pytest.mark.parametrize("cent, tekst", [(0, "0.00"), (5, "0.05"), (950, "9.50"), (1150, "11.50"), (24000, "240.00")])
def test_naar_mollie(cent, tekst):
    assert geld.naar_mollie(cent) == tekst


@pytest.mark.parametrize("fout", [-1, 9.5, "950", None, True])
def test_naar_mollie_weigert_wat_geen_bedrag_is(fout):
    with pytest.raises(ValueError):
        geld.naar_mollie(fout)


def test_totaal():
    regels = [{"prijs": 950, "aantal": 1}, {"prijs": 1350, "aantal": 1}, {"prijs": 1150, "aantal": 2}]
    assert geld.totaal(regels) == 4600
