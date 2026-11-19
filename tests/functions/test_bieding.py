from datetime import datetime, timedelta, timezone

import pytest

from wijnclub.domein import bieding as bd

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
TABELLEN = {"wijnen": "t-wijnen", "biedingen": "t-biedingen"}


def wijn(**anders):
    basis = {
        "wijnId": "barolo", "soort": "bieding", "naam": "Barolo Riserva", "biedingStatus": "open",
        "startbod": 18000, "minimaleVerhoging": 1000, "minimaalVolgendBod": 25000,
        "hoogsteBod": 24000, "hoogsteBieder": "lid-7", "eindtijd": "2026-11-21T19:00:00Z",
    }
    basis.update(anders)
    return basis


def test_bod_op_het_minimum_mag():
    bd.beoordeel_bod(wijn(), 25000, NU)


@pytest.mark.parametrize(
    "anders, bedrag, code",
    [
        ({}, 24999, "bod_te_laag"),
        ({}, 250.0, "ongeldig_bedrag"),
        ({}, True, "ongeldig_bedrag"),
        ({"biedingStatus": "gesloten"}, 30000, "bieding_gesloten"),
        ({"eindtijd": "2026-11-19T15:40:00Z"}, 30000, "bieding_gesloten"),
        ({"eindtijd": "2026-11-19T15:00:00Z"}, 30000, "bieding_gesloten"),
        ({"soort": "vast"}, 30000, "bieding_gesloten"),
    ],
)
def test_bod_wordt_geweigerd(anders, bedrag, code):
    with pytest.raises(bd.BodGeweigerd) as fout:
        bd.beoordeel_bod(wijn(**anders), bedrag, NU)
    assert fout.value.code == code


def test_te_laag_bod_meldt_het_minimum():
    with pytest.raises(bd.BodGeweigerd) as fout:
        bd.beoordeel_bod(wijn(), 24000, NU)
    assert fout.value.minimaal == 25000


def test_eindtijd_blijft_staan_bij_een_vroeg_bod():
    assert bd.nieuwe_eindtijd("2026-11-21T19:00:00Z", NU) == "2026-11-21T19:00:00Z"


def test_bod_in_de_laatste_twee_minuten_verlengt():
    eind = "2026-11-19T15:41:00Z"
    assert bd.nieuwe_eindtijd(eind, NU) == "2026-11-19T15:42:00Z"


def test_bod_net_buiten_de_laatste_twee_minuten_verlengt_niet():
    eind = "2026-11-19T15:42:01Z"
    assert bd.nieuwe_eindtijd(eind, NU) == eind


def test_bod_transactie_vergelijkt_met_wat_gelezen_is():
    stappen = bd.bod_transactie(tabellen=TABELLEN, wijn=wijn(), lid_id="lid-1", bedrag=26000, nu=NU)
    bijwerken, schrijven = stappen[0]["Update"], stappen[1]["Put"]
    waarden = bijwerken["ExpressionAttributeValues"]
    assert waarden[":bod"] == {"N": "26000"}
    assert waarden[":volgend"] == {"N": "27000"}
    assert waarden[":gelezenMinimum"] == {"N": "25000"}
    assert waarden[":gelezenEind"] == {"S": "2026-11-21T19:00:00Z"}
    assert "minimaalVolgendBod = :gelezenMinimum" in bijwerken["ConditionExpression"]
    assert schrijven["Item"]["tijdstipLid"] == {"S": "2026-11-19T15:40:00Z#lid-1"}
    assert schrijven["Item"]["bedrag"] == {"N": "26000"}


def test_bod_transactie_weigert_een_te_laag_bod():
    with pytest.raises(bd.BodGeweigerd):
        bd.bod_transactie(tabellen=TABELLEN, wijn=wijn(), lid_id="lid-1", bedrag=100, nu=NU)


def test_sluiten_kan_pas_op_de_eindtijd():
    w = wijn(eindtijd="2026-11-19T15:40:00Z")
    assert bd.mag_sluiten(w, NU) is True
    assert bd.mag_sluiten(w, NU - timedelta(seconds=1)) is False
    assert bd.mag_sluiten(wijn(biedingStatus="gesloten", eindtijd="2026-11-19T15:00:00Z"), NU) is False


def test_leden_zien_de_druif_van_een_bijzondere_fles():
    assert bd.openbaar({**wijn(), "druif": "Nebbiolo"}, "lid-1")["druif"] == "Nebbiolo"


def test_leden_zien_niet_wie_de_hoogste_bieder_is():
    zichtbaar = bd.openbaar(wijn(), "lid-1")
    assert "hoogsteBieder" not in zichtbaar
    assert zichtbaar["hoogsteBod"] == 24000
    assert zichtbaar["mijnBodIsHoogste"] is False
    assert bd.openbaar(wijn(), "lid-7")["mijnBodIsHoogste"] is True
