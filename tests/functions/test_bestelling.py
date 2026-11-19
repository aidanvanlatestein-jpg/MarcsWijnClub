from datetime import datetime, timezone

import pytest

from wijnclub.domein import bestelling as b

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
TABELLEN = {"lijsten": "t-lijsten", "wijnen": "t-wijnen", "bestellingen": "t-bestellingen"}
WIJNEN = {
    "a": {"naam": "Verdejo 2023", "prijs": 950},
    "d": {"naam": "Negroamaro 2022", "prijs": 1150},
}


def maak(soort=b.LIJST, regels=None):
    return b.nieuwe_bestelling(
        bestelling_id="b-1", lid_id="lid-1", soort=soort, lijst_id="lijst-1",
        regels=regels or [{"wijnId": "a", "aantal": 1}, {"wijnId": "d", "aantal": 2}],
        wijnen=WIJNEN, levering="brengen", ingevoerd_door="lid", aangemaakt=NU,
    )


def test_valideer_regels_geeft_alleen_wijn_en_aantal_terug():
    schoon = b.valideer_regels([{"wijnId": "a", "aantal": 2, "prijs": 1}])
    assert schoon == [{"wijnId": "a", "aantal": 2}]


@pytest.mark.parametrize(
    "regels, code",
    [
        ([], "geen_regels"),
        (None, "geen_regels"),
        ([{"wijnId": "a", "aantal": 0}], "ongeldig_aantal"),
        ([{"wijnId": "a", "aantal": 25}], "ongeldig_aantal"),
        ([{"wijnId": "a", "aantal": 1.5}], "ongeldig_aantal"),
        ([{"wijnId": "a", "aantal": True}], "ongeldig_aantal"),
        ([{"wijnId": "", "aantal": 1}], "ongeldige_regel"),
        (["a"], "ongeldige_regel"),
        ([{"wijnId": "a", "aantal": 1}, {"wijnId": "a", "aantal": 1}], "dubbele_wijn"),
        ([{"wijnId": str(n), "aantal": 1} for n in range(26)], "te_veel_regels"),
    ],
)
def test_valideer_regels_weigert(regels, code):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_regels(regels)
    assert fout.value.code == code


def test_nieuwe_bestelling_neemt_prijs_uit_de_opslag():
    bestelling = maak()
    assert bestelling["totaal"] == 950 + 2 * 1150
    assert bestelling["status"] == b.OPEN
    assert bestelling["voorraadGereserveerd"] is True
    assert bestelling["betaalVoor"] == "2026-11-19T16:00:00Z"
    assert bestelling["regels"][1] == {"wijnId": "d", "naam": "Negroamaro 2022", "aantal": 2, "prijs": 1150}


def test_bieding_heeft_48_uur_en_geen_voorraad():
    bestelling = maak(soort=b.BIEDING)
    assert bestelling["betaalVoor"] == "2026-11-21T15:40:00Z"
    assert bestelling["voorraadGereserveerd"] is False


def test_onbekende_wijn_wordt_geweigerd():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        maak(regels=[{"wijnId": "bestaat-niet", "aantal": 1}])
    assert fout.value.code == "onbekende_wijn"


def test_reserveer_transactie_controleert_lijst_voorraad_en_dubbel():
    bestelling = maak()
    stappen = b.reserveer_transactie(tabellen=TABELLEN, bestelling=bestelling, nu=NU)
    assert [list(stap)[0] for stap in stappen] == ["ConditionCheck", "Update", "Update", "Put"]

    lijst = stappen[0]["ConditionCheck"]
    assert lijst["TableName"] == "t-lijsten"
    assert lijst["ExpressionAttributeValues"][":nu"] == {"S": "2026-11-19T15:40:00Z"}

    wijn = stappen[2]["Update"]
    assert wijn["Key"] == {"wijnId": {"S": "d"}}
    assert "voorraad >= :aantal" in wijn["ConditionExpression"]
    assert wijn["ExpressionAttributeValues"][":aantal"] == {"N": "2"}

    schrijf = stappen[3]["Put"]
    assert schrijf["ConditionExpression"] == "attribute_not_exists(bestellingId)"
    assert schrijf["Item"]["totaal"] == {"N": "3250"}
    assert schrijf["Item"]["voorraadGereserveerd"] == {"BOOL": True}


def test_uitverkocht_wijst_de_wijn_aan_die_op_is():
    regels = maak()["regels"]
    redenen = [{"Code": "None"}, {"Code": "None"}, {"Code": "ConditionalCheckFailed"}, {"Code": "None"}]
    assert b.uitverkocht(redenen, regels) == {"lijstGesloten": False, "wijnen": ["d"]}


def test_uitverkocht_meldt_een_gesloten_lijst():
    regels = maak()["regels"]
    redenen = [{"Code": "ConditionalCheckFailed"}, {"Code": "None"}, {"Code": "None"}, {"Code": "None"}]
    assert b.uitverkocht(redenen, regels) == {"lijstGesloten": True, "wijnen": []}


@pytest.mark.parametrize(
    "status, mollie, terugbetaald, verwacht",
    [
        (b.OPEN, "paid", False, b.Besluit(nieuwe_status=b.BETAALD)),
        (b.OPEN, "failed", False, b.Besluit()),
        (b.OPEN, "expired", False, b.Besluit()),
        (b.OPEN, "canceled", False, b.Besluit()),
        (b.BETAALD, "paid", False, b.Besluit()),
        (b.BETAALD, "paid", True, b.Besluit(nieuwe_status=b.TERUGBETAALD)),
        (b.VERLOPEN, "paid", False, b.Besluit(controle_nodig=True)),
        (b.VERLOPEN, "expired", False, b.Besluit()),
        (b.TERUGBETAALD, "paid", True, b.Besluit()),
    ],
)
def test_besluit_na_melding(status, mollie, terugbetaald, verwacht):
    assert b.besluit_na_melding(status, mollie, terugbetaald) == verwacht


@pytest.mark.parametrize(
    "status, mollie, verwacht",
    [
        (b.OPEN, None, b.VERLOOP),
        (b.OPEN, "expired", b.VERLOOP),
        (b.OPEN, "failed", b.VERLOOP),
        (b.OPEN, "open", b.WACHT),
        (b.OPEN, "pending", b.WACHT),
        (b.OPEN, "paid", b.VERWERK_BETALING),
        (b.BETAALD, "paid", b.NIETS),
        (b.VERLOPEN, None, b.NIETS),
    ],
)
def test_besluit_op_termijn(status, mollie, verwacht):
    assert b.besluit_op_termijn(status, mollie) == verwacht


def test_betaald_wijziging_gaat_alleen_door_als_de_bestelling_open_is():
    wijziging = b.betaald_wijziging(tabellen=TABELLEN, bestelling_id="b-1", nu=NU)
    assert wijziging["ConditionExpression"] == "#status = :open"
    assert wijziging["ExpressionAttributeValues"][":betaald"] == {"S": "betaald"}


def test_verloop_geeft_voorraad_terug():
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=maak(), nu=NU)
    assert len(stappen) == 3
    assert stappen[0]["Update"]["ConditionExpression"] == "#status = :open"
    assert stappen[2]["Update"]["UpdateExpression"] == "SET voorraad = voorraad + :aantal"
    assert stappen[2]["Update"]["ExpressionAttributeValues"][":aantal"] == {"N": "2"}


def test_verloop_van_een_bieding_geeft_geen_voorraad_terug():
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=maak(soort=b.BIEDING), nu=NU)
    assert len(stappen) == 1
