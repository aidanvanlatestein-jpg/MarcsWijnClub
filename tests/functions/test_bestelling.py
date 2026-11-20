from datetime import datetime, timedelta, timezone

import pytest

from wijnclub.domein import bestelling as b
from wijnclub.domein import dynamo

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
BEIDE = (b.BRENGEN, b.HALEN)
LIJST_LEVERING = {
    "brengen": {"van": "2026-11-26T17:00:00Z", "tot": "2026-11-26T19:00:00Z"},
    "halen": {"van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T12:00:00Z", "waar": "Bij Marc, voorbeeldadres"},
}
TABELLEN = {"lijsten": "t-lijsten", "wijnen": "t-wijnen", "bestellingen": "t-bestellingen"}
WIJNEN = {
    "a": {"naam": "Verdejo 2023", "prijs": 950},
    "d": {"naam": "Negroamaro 2022", "prijs": 1150},
}


def maak(soort=b.LIJST, regels=None, levering=b.HALEN, bestelling_id="b-1", heeft_adres=False):
    bieding = soort == b.BIEDING
    return b.nieuwe_bestelling(
        bestelling_id=bestelling_id, lid_id="lid-1", soort=soort, lijst_id=None if bieding else "lijst-1",
        regels=regels or [{"wijnId": "a", "aantal": 1}, {"wijnId": "d", "aantal": 2}],
        wijnen=WIJNEN, levering=None if bieding else levering, ingevoerd_door="lid", aangemaakt=NU,
        aangeboden=() if bieding else BEIDE, heeft_adres=heeft_adres,
    )


def test_dezelfde_poging_geeft_hetzelfde_nummer():
    sleutel = "3f1c2a9e-7d54-4b0a-9c1e-5a2b7d8e9f00"
    eerste = b.bestelling_id_uit_sleutel("lid-1", sleutel)
    assert eerste == b.bestelling_id_uit_sleutel("lid-1", sleutel)
    assert eerste.startswith("b-") and len(eerste) == 34


def test_een_ander_lid_of_een_andere_poging_geeft_een_ander_nummer():
    eerste = b.bestelling_id_uit_sleutel("lid-1", "poging-0001")
    assert eerste != b.bestelling_id_uit_sleutel("lid-2", "poging-0001")
    assert eerste != b.bestelling_id_uit_sleutel("lid-1", "poging-0002")


@pytest.mark.parametrize("sleutel", [None, "", "kort", 12345678, "met spatie 123", "x" * 65, "a/b/c/d/e/f"])
def test_ongeldige_sleutel_wordt_geweigerd(sleutel):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.bestelling_id_uit_sleutel("lid-1", sleutel)
    assert fout.value.code == "ongeldige_sleutel"


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
    assert bestelling["levering"] == "halen"
    assert bestelling["regels"][1] == {"wijnId": "d", "naam": "Negroamaro 2022", "aantal": 2, "prijs": 1150}


def test_van_de_lijst_houdt_marc_de_flessen_15_minuten_vast():
    bestelling = maak()
    assert bestelling["betaalVoor"] == "2026-11-19T15:55:00Z"
    assert bestelling["voorraadGereserveerd"] is True


def test_bijbestellen_is_een_nieuwe_bestelling_met_een_eigen_houdtijd():
    later = b.nieuwe_bestelling(
        bestelling_id="b-2", lid_id="lid-1", soort=b.LIJST, lijst_id="lijst-1",
        regels=[{"wijnId": "a", "aantal": 2}], wijnen=WIJNEN, levering=b.HALEN, ingevoerd_door="lid",
        aangemaakt=NU + timedelta(minutes=30), aangeboden=BEIDE,
    )
    assert later["betaalVoor"] == "2026-11-19T16:25:00Z"
    assert later["totaal"] == 1900


def test_namens_een_lid_betaal_je_tot_48_uur_na_het_invoeren():
    bestelling = maak(soort=b.NAMENS)
    assert bestelling["betaalVoor"] == "2026-11-21T15:40:00Z"
    assert bestelling["voorraadGereserveerd"] is True


def test_bieding_heeft_48_uur_en_geen_voorraad():
    bestelling = maak(soort=b.BIEDING)
    assert bestelling["betaalVoor"] == "2026-11-21T15:40:00Z"
    assert bestelling["voorraadGereserveerd"] is False
    assert bestelling["levering"] is None


def test_het_sluiten_van_de_lijst_telt_niet_mee_voor_de_termijn():
    assert b.betaal_voor(soort=b.LIJST, aangemaakt=NU) == NU + timedelta(minutes=15)
    assert b.betaal_voor(soort=b.NAMENS, aangemaakt=NU) == NU + timedelta(hours=48)
    assert b.betaal_voor(soort=b.BIEDING, aangemaakt=NU) == NU + timedelta(hours=48)


def test_onbekende_soort_heeft_geen_termijn():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.betaal_voor(soort="bewaren", aangemaakt=NU)
    assert fout.value.code == "onbekende_soort"


@pytest.mark.parametrize(
    "soort, levering, aangeboden, heeft_adres, code",
    [
        (b.LIJST, None, BEIDE, True, "geen_levering"),
        (b.NAMENS, None, BEIDE, True, "geen_levering"),
        (b.LIJST, "punt-utrecht", BEIDE, True, "onbekende_levering"),
        (b.LIJST, "Brengen", BEIDE, True, "onbekende_levering"),
        # Bewaren bij Marc is uit de pilot: ook een gewonnen fles wordt gebracht of gehaald.
        (b.LIJST, "bewaren", BEIDE, True, "onbekende_levering"),
        (b.BIEDING, "bewaren", BEIDE, True, "onbekende_levering"),
        (b.LIJST, b.BRENGEN, (b.HALEN,), True, "levering_niet_aangeboden"),
        (b.LIJST, b.HALEN, (b.BRENGEN,), True, "levering_niet_aangeboden"),
        (b.NAMENS, b.HALEN, (), True, "levering_niet_aangeboden"),
        (b.LIJST, b.BRENGEN, BEIDE, False, "geen_adres"),
        (b.NAMENS, b.BRENGEN, (b.BRENGEN,), False, "geen_adres"),
        (b.BIEDING, b.BRENGEN, BEIDE, False, "geen_adres"),
    ],
)
def test_levering_weigert(soort, levering, aangeboden, heeft_adres, code):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_levering(soort=soort, levering=levering, aangeboden=aangeboden, heeft_adres=heeft_adres)
    assert fout.value.code == code


@pytest.mark.parametrize(
    "soort, levering, aangeboden, heeft_adres",
    [
        (b.LIJST, b.BRENGEN, BEIDE, True),
        (b.LIJST, b.HALEN, BEIDE, False),
        (b.LIJST, b.HALEN, (b.HALEN,), False),
        (b.NAMENS, b.BRENGEN, (b.BRENGEN,), True),
        # De winnaar van een bieding kiest pas na het betalen.
        (b.BIEDING, None, (), False),
        (b.BIEDING, b.HALEN, BEIDE, False),
        (b.BIEDING, b.BRENGEN, BEIDE, True),
    ],
)
def test_geldige_levering(soort, levering, aangeboden, heeft_adres):
    b.valideer_levering(soort=soort, levering=levering, aangeboden=aangeboden, heeft_adres=heeft_adres)


def test_brengen_zonder_adres_geeft_geen_bestelling():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        maak(levering=b.BRENGEN, heeft_adres=False)
    assert fout.value.code == "geen_adres"


def test_het_adres_komt_niet_op_de_bestelling():
    bestelling = maak(levering=b.BRENGEN, heeft_adres=True)
    assert bestelling["levering"] == "brengen"
    assert "adres" not in bestelling


def test_wat_de_lijst_aanbiedt():
    assert b.aangeboden(LIJST_LEVERING) == (b.BRENGEN, b.HALEN)
    assert b.aangeboden({"halen": LIJST_LEVERING["halen"]}) == (b.HALEN,)
    assert b.aangeboden({"bewaren": {}}) == ()
    assert b.aangeboden(None) == ()


def test_marc_stelt_brengen_en_halen_in():
    schoon = b.valideer_lijst_levering(dict(LIJST_LEVERING, bewaren={"van": "2026-11-26T17:00:00Z"}))
    assert schoon == LIJST_LEVERING


def test_marc_kan_alleen_halen_aanbieden():
    schoon = b.valideer_lijst_levering({"halen": dict(LIJST_LEVERING["halen"], waar="  Bij Marc  ", intern="x")})
    assert schoon == {"halen": dict(LIJST_LEVERING["halen"], waar="Bij Marc")}


@pytest.mark.parametrize(
    "levering, code",
    [
        (None, "geen_levering_aangeboden"),
        ({}, "geen_levering_aangeboden"),
        ({"bewaren": {}}, "geen_levering_aangeboden"),
        ({"brengen": "donderdag"}, "ongeldige_levering"),
        ({"brengen": {"van": "2026-11-26T17:00:00Z"}}, "ongeldig_moment"),
        ({"brengen": {"van": "donderdag 18:00", "tot": "2026-11-26T19:00:00Z"}}, "ongeldig_moment"),
        ({"brengen": {"van": "2026-11-26T19:00:00Z", "tot": "2026-11-26T17:00:00Z"}}, "ongeldig_moment"),
        ({"halen": {"van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T12:00:00Z"}}, "geen_ophaalplek"),
        ({"halen": {"van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T12:00:00Z", "waar": "  "}}, "geen_ophaalplek"),
        ({"halen": {"van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T12:00:00Z", "waar": "x" * 201}}, "geen_ophaalplek"),
    ],
)
def test_marc_stelt_een_ongeldige_levering_in(levering, code):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_lijst_levering(levering)
    assert fout.value.code == code


def test_een_lid_ziet_alleen_brengen_en_halen():
    opgeslagen = {
        "brengen": dict(LIJST_LEVERING["brengen"], intern="x"),
        "halen": LIJST_LEVERING["halen"],
        "bewaren": {"van": "2026-11-26T17:00:00Z"},
    }
    assert b.openbare_levering(opgeslagen) == LIJST_LEVERING
    assert b.openbare_levering(None) == {}


@pytest.mark.parametrize(
    "status, betaal_voor, verwacht",
    [
        (b.OPEN, "2026-11-19T15:55:00Z", True),
        # De houdtijd is voorbij: niet meer te betalen.
        (b.OPEN, "2026-11-19T15:40:00Z", False),
        (b.OPEN, "2026-11-19T15:39:59Z", False),
        (b.BETAALD, "2026-11-19T15:55:00Z", False),
        (b.VERLOPEN, "2026-11-19T15:55:00Z", False),
        (b.TERUGBETAALD, "2026-11-21T15:40:00Z", False),
    ],
)
def test_betalen_kan_zolang_de_bestelling_open_is(status, betaal_voor, verwacht):
    assert b.mag_betalen(status=status, betaal_voor=betaal_voor, nu=NU) is verwacht


def test_betalen_kan_meteen_na_het_bestellen_ook_als_de_lijst_nog_open_staat():
    for soort in b.SOORTEN:
        bestelling = maak(soort=soort)
        assert b.mag_betalen(status=bestelling["status"], betaal_voor=bestelling["betaalVoor"], nu=NU) is True


def test_na_15_minuten_is_een_bestelling_van_de_lijst_niet_meer_te_betalen():
    bestelling = maak()
    assert b.mag_betalen(status=b.OPEN, betaal_voor=bestelling["betaalVoor"], nu=NU + timedelta(minutes=14, seconds=59))
    assert not b.mag_betalen(status=b.OPEN, betaal_voor=bestelling["betaalVoor"], nu=NU + timedelta(minutes=15))


def test_namens_is_na_15_minuten_nog_wel_te_betalen():
    bestelling = maak(soort=b.NAMENS)
    assert b.mag_betalen(status=b.OPEN, betaal_voor=bestelling["betaalVoor"], nu=NU + timedelta(hours=47, minutes=59))
    assert not b.mag_betalen(status=b.OPEN, betaal_voor=bestelling["betaalVoor"], nu=NU + timedelta(hours=48))


@pytest.mark.parametrize(
    "bestelling, verwacht",
    [
        ({"soort": b.BIEDING, "status": b.BETAALD}, True),
        ({"soort": b.BIEDING, "status": b.BETAALD, "levering": b.HALEN}, True),
        # Eerst betalen, dan kiezen.
        ({"soort": b.BIEDING, "status": b.OPEN}, False),
        ({"soort": b.BIEDING, "status": b.BETAALD, "afgeleverdOp": "2026-11-26T18:10:00Z"}, False),
        ({"soort": b.LIJST, "status": b.BETAALD}, False),
        ({"soort": b.NAMENS, "status": b.BETAALD}, False),
    ],
)
def test_de_winnaar_kiest_levering_na_het_betalen(bestelling, verwacht):
    assert b.mag_levering_kiezen(bestelling) is verwacht


def test_onbekende_wijn_wordt_geweigerd():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        maak(regels=[{"wijnId": "bestaat-niet", "aantal": 1}])
    assert fout.value.code == "onbekende_wijn"


def test_een_bieding_is_niet_van_de_lijst_te_bestellen():
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.nieuwe_bestelling(
            bestelling_id="b-1", lid_id="lid-1", soort=b.LIJST, lijst_id="lijst-1",
            regels=[{"wijnId": "barolo", "aantal": 1}], wijnen={"barolo": {"naam": "Barolo", "soort": "bieding"}},
            levering=b.HALEN, ingevoerd_door="lid", aangemaakt=NU, aangeboden=BEIDE,
        )
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


def test_een_herhaalde_poging_wordt_herkend_ook_als_de_wijn_nu_op_lijkt():
    regels = maak()["regels"]
    redenen = [{"Code": "None"}, {"Code": "None"}, {"Code": "ConditionalCheckFailed"}, {"Code": "ConditionalCheckFailed"}]
    assert b.bestaat_al(redenen, regels) is True
    assert b.bestaat_al([{"Code": "None"}, {"Code": "None"}, {"Code": "ConditionalCheckFailed"}, {"Code": "None"}], regels) is False
    assert b.bestaat_al([], regels) is False


def test_een_botsing_met_een_andere_bestelling_is_geen_uitverkocht():
    regels = maak()["regels"]
    redenen = [{"Code": "None"}, {"Code": "TransactionConflict"}, {"Code": "None"}, {"Code": "None"}]
    assert dynamo.opnieuw_proberen(redenen) is True
    assert b.uitverkocht(redenen, regels) == {"lijstGesloten": False, "wijnen": []}


@pytest.mark.parametrize(
    "status, mollie, betaald_met, terugbetaald, verwacht",
    [
        (b.OPEN, "paid", None, False, b.Besluit(nieuwe_status=b.BETAALD)),
        (b.OPEN, "failed", None, False, b.Besluit()),
        (b.OPEN, "expired", None, False, b.Besluit()),
        (b.OPEN, "canceled", None, False, b.Besluit()),
        # Dezelfde melding nog eens.
        (b.BETAALD, "paid", "tr_1", False, b.Besluit()),
        (b.BETAALD, "paid", "tr_1", True, b.Besluit(nieuwe_status=b.TERUGBETAALD)),
        # Een tweede betaling voor een bestelling die al betaald is.
        (b.BETAALD, "paid", "tr_0", False, b.Besluit(controle_nodig=True)),
        (b.BETAALD, "failed", "tr_0", False, b.Besluit()),
        # Marc betaalde de dubbele betaling terug: de bestelling blijft betaald.
        (b.BETAALD, "paid", "tr_0", True, b.Besluit()),
        (b.TERUGBETAALD, "paid", "tr_0", False, b.Besluit(controle_nodig=True)),
        (b.VERLOPEN, "paid", None, False, b.Besluit(controle_nodig=True)),
        (b.VERLOPEN, "expired", None, False, b.Besluit()),
        (b.TERUGBETAALD, "paid", "tr_1", True, b.Besluit()),
    ],
)
def test_besluit_na_melding(status, mollie, betaald_met, terugbetaald, verwacht):
    besluit = b.besluit_na_melding(status, mollie, betaling_id="tr_1", betaald_met=betaald_met, terugbetaald=terugbetaald)
    assert besluit == verwacht


@pytest.mark.parametrize(
    "status, mollie, verwacht",
    [
        (b.OPEN, [], b.VERLOOP),
        (b.OPEN, ["expired"], b.VERLOOP),
        (b.OPEN, ["failed", "canceled"], b.VERLOOP),
        (b.OPEN, ["open"], b.WACHT),
        (b.OPEN, ["pending"], b.WACHT),
        (b.OPEN, ["paid"], b.VERWERK_BETALING),
        # Een eerdere betaling kan nog slagen nadat een latere is afgebroken.
        (b.OPEN, ["pending", "canceled"], b.WACHT),
        (b.OPEN, ["paid", "expired"], b.VERWERK_BETALING),
        (b.OPEN, ["open", "paid"], b.VERWERK_BETALING),
        (b.BETAALD, ["paid"], b.NIETS),
        (b.VERLOPEN, [], b.NIETS),
    ],
)
def test_besluit_op_termijn(status, mollie, verwacht):
    assert b.besluit_op_termijn(status, mollie) == verwacht


def test_betaald_wijziging_gaat_alleen_door_als_de_bestelling_open_is():
    wijziging = b.betaald_wijziging(tabellen=TABELLEN, bestelling_id="b-1", betaling_id="tr_1", nu=NU)
    assert wijziging["ConditionExpression"] == "#status = :open"
    assert wijziging["ExpressionAttributeValues"][":betaald"] == {"S": "betaald"}
    assert "mollieBetalingId = :betaling" in wijziging["UpdateExpression"]
    assert wijziging["ExpressionAttributeValues"][":betaling"] == {"S": "tr_1"}


def test_na_de_houdtijd_zonder_betaling_verloopt_de_bestelling():
    bestelling = maak()
    na_houdtijd = NU + timedelta(minutes=15)
    assert not b.mag_betalen(status=bestelling["status"], betaal_voor=bestelling["betaalVoor"], nu=na_houdtijd)
    assert b.besluit_op_termijn(bestelling["status"], []) == b.VERLOOP
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=bestelling, nu=na_houdtijd)
    assert stappen[0]["Update"]["ExpressionAttributeValues"][":nu"] == {"S": "2026-11-19T15:55:00Z"}
    assert [stap["Update"]["Key"] for stap in stappen[1:]] == [{"wijnId": {"S": "a"}}, {"wijnId": {"S": "d"}}]


def test_een_betaling_die_vlak_voor_het_einde_van_de_houdtijd_start_mag_nog_slagen():
    # Een iDEAL-betaling loopt bij Mollie tot 15 minuten na het starten: de taak wacht.
    assert b.besluit_op_termijn(b.OPEN, ["open"]) == b.WACHT


def test_verloop_geeft_voorraad_terug():
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=maak(), nu=NU)
    assert len(stappen) == 3
    assert stappen[0]["Update"]["ConditionExpression"] == "#status = :open"
    assert stappen[2]["Update"]["UpdateExpression"] == "SET voorraad = voorraad + :aantal"
    assert stappen[2]["Update"]["ExpressionAttributeValues"][":aantal"] == {"N": "2"}


def test_verloop_namens_geeft_voorraad_terug():
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=maak(soort=b.NAMENS), nu=NU)
    assert len(stappen) == 3


def test_verloop_van_een_bieding_geeft_geen_voorraad_terug():
    stappen = b.verloop_transactie(tabellen=TABELLEN, bestelling=maak(soort=b.BIEDING), nu=NU)
    assert len(stappen) == 1
