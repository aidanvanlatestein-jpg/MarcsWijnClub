from datetime import datetime, timezone

import pytest

from wijnclub.domein import bestelling as b

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
SLUIT = datetime(2026, 11, 19, 21, 0, tzinfo=timezone.utc)
AFHAALPUNTEN = ("punt-roermond", "punt-utrecht")
TABELLEN = {"lijsten": "t-lijsten", "wijnen": "t-wijnen", "bestellingen": "t-bestellingen"}
WIJNEN = {
    "a": {"naam": "Verdejo 2023", "prijs": 950},
    "d": {"naam": "Negroamaro 2022", "prijs": 1150},
}


def maak(soort=b.LIJST, regels=None, levering="punt-utrecht", bestelling_id="b-1"):
    bieding = soort == b.BIEDING
    return b.nieuwe_bestelling(
        bestelling_id=bestelling_id, lid_id="lid-1", soort=soort, lijst_id=None if bieding else "lijst-1",
        regels=regels or [{"wijnId": "a", "aantal": 1}, {"wijnId": "d", "aantal": 2}],
        wijnen=WIJNEN, levering=None if bieding else levering, ingevoerd_door="lid", aangemaakt=NU,
        lijst_sluit=None if bieding else SLUIT, afhaalpunten=AFHAALPUNTEN,
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
    assert bestelling["levering"] == "punt-utrecht"
    assert bestelling["regels"][1] == {"wijnId": "d", "naam": "Negroamaro 2022", "aantal": 2, "prijs": 1150}


def test_van_de_lijst_betaal_je_tot_48_uur_na_het_sluiten():
    assert maak()["betaalVoor"] == "2026-11-21T21:00:00Z"
    assert maak(soort=b.NAMENS)["betaalVoor"] == "2026-11-21T21:00:00Z"


def test_bieding_heeft_48_uur_en_geen_voorraad():
    bestelling = maak(soort=b.BIEDING)
    assert bestelling["betaalVoor"] == "2026-11-21T15:40:00Z"
    assert bestelling["voorraadGereserveerd"] is False
    assert bestelling["levering"] is None


def test_zonder_eindtijd_van_de_lijst_geen_bestelling():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.betaal_voor(soort=b.LIJST, aangemaakt=NU, lijst_sluit=None)
    assert fout.value.code == "geen_lijst"


@pytest.mark.parametrize(
    "soort, levering, code",
    [
        (b.LIJST, None, "geen_afhaalpunt"),
        (b.NAMENS, None, "geen_afhaalpunt"),
        (b.LIJST, "punt-onbekend", "onbekend_afhaalpunt"),
        (b.LIJST, "brengen", "onbekend_afhaalpunt"),
        (b.LIJST, b.BEWAREN, "bewaren_alleen_bij_bieding"),
        (b.BIEDING, "punt-onbekend", "onbekend_afhaalpunt"),
    ],
)
def test_levering_moet_een_afhaalpunt_van_de_lijst_zijn(soort, levering, code):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_levering(soort=soort, levering=levering, afhaalpunten=AFHAALPUNTEN)
    assert fout.value.code == code


@pytest.mark.parametrize(
    "soort, levering",
    [(b.LIJST, "punt-roermond"), (b.NAMENS, "punt-utrecht"), (b.BIEDING, None), (b.BIEDING, b.BEWAREN), (b.BIEDING, "punt-utrecht")],
)
def test_geldige_levering(soort, levering):
    b.valideer_levering(soort=soort, levering=levering, afhaalpunten=AFHAALPUNTEN)


@pytest.mark.parametrize(
    "soort, status, lijst_status, verwacht",
    [
        (b.LIJST, b.OPEN, "open", False),
        (b.LIJST, b.OPEN, "gesloten", True),
        (b.NAMENS, b.OPEN, "open", False),
        (b.NAMENS, b.OPEN, "gesloten", True),
        (b.BIEDING, b.OPEN, None, True),
        (b.LIJST, b.BETAALD, "gesloten", False),
        (b.LIJST, b.VERLOPEN, "gesloten", False),
    ],
)
def test_betalen_kan_pas_als_de_lijst_gesloten_is(soort, status, lijst_status, verwacht):
    assert b.mag_betalen(soort=soort, status=status, lijst_status=lijst_status) is verwacht


def test_een_betaalverzoek_telt_alle_open_bestellingen_van_de_lijst():
    eerste = maak()
    bijbesteld = maak(regels=[{"wijnId": "a", "aantal": 2}], bestelling_id="b-2")
    namens = maak(soort=b.NAMENS, regels=[{"wijnId": "d", "aantal": 1}], bestelling_id="b-3")
    al_betaald = dict(maak(bestelling_id="b-4"), status=b.BETAALD)
    verzoek = b.betaalverzoek([eerste, bijbesteld, namens, al_betaald])
    assert verzoek == {"bestellingIds": ["b-1", "b-2", "b-3"], "bedrag": 3250 + 1900 + 1150}


def test_betaald_transactie_zet_alle_bestellingen_tegelijk_op_betaald():
    stappen = b.betaald_transactie(tabellen=TABELLEN, bestelling_ids=["b-1", "b-2"], nu=NU)
    assert [stap["Update"]["Key"] for stap in stappen] == [
        {"bestellingId": {"S": "b-1"}},
        {"bestellingId": {"S": "b-2"}},
    ]
    assert all(stap["Update"]["ConditionExpression"] == "#status = :open" for stap in stappen)


@pytest.mark.parametrize("ids, code", [([], "geen_bestellingen"), (["b-1", "b-1"], "dubbele_bestelling")])
def test_betaald_transactie_weigert(ids, code):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.betaald_transactie(tabellen=TABELLEN, bestelling_ids=ids, nu=NU)
    assert fout.value.code == code


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
