from datetime import datetime, timedelta, timezone

import pytest

from wijnclub.domein import bestelling as b
from wijnclub.domein import bieding as bd
from wijnclub.domein import dynamo

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
TABELLEN = {"wijnen": "t-wijnen", "biedingen": "t-biedingen", "bestellingen": "t-bestellingen"}


def wijn(**anders):
    basis = {
        "wijnId": "barolo", "soort": "bieding", "naam": "Barolo Riserva", "biedingStatus": "open",
        "startbod": 18000, "minimaleVerhoging": 1000, "minimaalVolgendBod": 25000,
        "hoogsteBod": 24000, "hoogsteBieder": "lid-7", "eindtijd": "2026-11-21T19:00:00Z",
    }
    basis.update(anders)
    return basis


def test_bod_op_het_minimum_mag():
    bd.beoordeel_bod(wijn(), 25000, NU, "lid-1")


def test_bod_tot_drie_keer_het_minimum_mag():
    bd.beoordeel_bod(wijn(), 75000, NU, "lid-1")


@pytest.mark.parametrize(
    "anders, bedrag, code",
    [
        ({}, 24999, "bod_te_laag"),
        ({}, 75001, "bod_te_hoog"),
        ({}, 2500000, "bod_te_hoog"),
        ({"hoogsteBieder": "lid-1"}, 25000, "al_hoogste"),
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
        bd.beoordeel_bod(wijn(**anders), bedrag, NU, "lid-1")
    assert fout.value.code == code


def test_te_laag_bod_meldt_het_minimum():
    with pytest.raises(bd.BodGeweigerd) as fout:
        bd.beoordeel_bod(wijn(), 24000, NU, "lid-1")
    assert fout.value.minimaal == 25000


def test_te_hoog_bod_meldt_het_maximum():
    with pytest.raises(bd.BodGeweigerd) as fout:
        bd.beoordeel_bod(wijn(), 2500000, NU, "lid-1")
    assert fout.value.maximaal == 75000


def test_eerste_bod_zonder_hoogste_bieder_mag():
    bd.beoordeel_bod(wijn(hoogsteBieder=None, hoogsteBod=None, minimaalVolgendBod=18000), 18000, NU, "lid-1")


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


def test_de_hoogste_bieder_kan_zichzelf_niet_overbieden():
    with pytest.raises(bd.BodGeweigerd) as fout:
        bd.bod_transactie(tabellen=TABELLEN, wijn=wijn(), lid_id="lid-7", bedrag=26000, nu=NU)
    assert fout.value.code == "al_hoogste"


@pytest.mark.parametrize(
    "redenen, verwacht",
    [
        ([{"Code": "TransactionConflict"}, {"Code": "None"}], True),
        ([{"Code": "None"}, {"Code": "ThrottlingError"}], True),
        ([{"Code": "ConditionalCheckFailed"}, {"Code": "None"}], False),
        ([], False),
    ],
)
def test_een_botsing_in_de_tijd_is_opnieuw_te_proberen(redenen, verwacht):
    assert dynamo.opnieuw_proberen(redenen) is verwacht


def gewonnen(lid_id="lid-7", prijs=24000):
    return b.nieuwe_bestelling(
        bestelling_id="b-barolo", lid_id=lid_id, soort=b.BIEDING, lijst_id=None,
        regels=[{"wijnId": "barolo", "aantal": 1}], wijnen={"barolo": {"naam": "Barolo Riserva", "prijs": prijs}},
        levering=None, ingevoerd_door="lid", aangemaakt=NU,
    )


def test_sluiten_schrijft_status_en_bestelling_in_een_transactie():
    w = wijn(eindtijd="2026-11-19T15:40:00Z")
    stappen = bd.sluit_transactie(tabellen=TABELLEN, wijn=w, bestelling=gewonnen(), nu=NU)
    assert [list(stap)[0] for stap in stappen] == ["Update", "Put"]
    sluiten = stappen[0]["Update"]
    assert sluiten["ExpressionAttributeValues"][":gesloten"] == {"S": "gesloten"}
    assert sluiten["ExpressionAttributeValues"][":gelezenEind"] == {"S": "2026-11-19T15:40:00Z"}
    assert "biedingStatus = :open" in sluiten["ConditionExpression"]
    schrijven = stappen[1]["Put"]
    assert schrijven["TableName"] == "t-bestellingen"
    assert schrijven["Item"]["totaal"] == {"N": "24000"}
    assert schrijven["ConditionExpression"] == "attribute_not_exists(bestellingId)"


def test_sluiten_zonder_bod_schrijft_geen_bestelling():
    w = wijn(eindtijd="2026-11-19T15:40:00Z", hoogsteBieder=None, hoogsteBod=None)
    stappen = bd.sluit_transactie(tabellen=TABELLEN, wijn=w, bestelling=None, nu=NU)
    assert [list(stap)[0] for stap in stappen] == ["Update"]


@pytest.mark.parametrize(
    "anders, bestelling",
    [
        ({"eindtijd": "2026-11-19T15:41:00Z"}, "goed"),
        ({}, None),
        ({}, "ander_lid"),
        ({}, "ander_bedrag"),
    ],
)
def test_sluiten_weigert_wat_niet_klopt(anders, bestelling):
    w = wijn(**{"eindtijd": "2026-11-19T15:40:00Z", **anders})
    keuze = {"goed": gewonnen(), "ander_lid": gewonnen(lid_id="lid-1"), "ander_bedrag": gewonnen(prijs=100), None: None}
    with pytest.raises(ValueError):
        bd.sluit_transactie(tabellen=TABELLEN, wijn=w, bestelling=keuze[bestelling], nu=NU)


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
