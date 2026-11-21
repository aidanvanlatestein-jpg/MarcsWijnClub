"""Grensgevallen van de regels: precies op de grens en er net overheen.

Deze tests komen uit een mutatietest van 20 november 2026: een fout die expres in de regels was
gezet (een < in plaats van <=, een getal één hoger) viel op deze plekken niet op. De grenzen staan
hier als getal en niet als naam uit de code, zodat een grens die verschuift ook een test laat falen.
"""
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from wijnclub import antwoord
from wijnclub.domein import bestelling as b
from wijnclub.domein import bieding as bd
from wijnclub.domein import dynamo, herkennen, kenmerken, tijd

NU = datetime(2026, 11, 19, 15, 40, tzinfo=timezone.utc)
TABELLEN = {"wijnen": "t-wijnen", "biedingen": "t-biedingen", "bestellingen": "t-bestellingen"}


# ---- Bestelling ----

def test_vierentwintig_flessen_van_een_wijn_mag_nog():
    assert b.valideer_regels([{"wijnId": "a", "aantal": 24}]) == [{"wijnId": "a", "aantal": 24}]
    with pytest.raises(b.OngeldigeBestelling):
        b.valideer_regels([{"wijnId": "a", "aantal": 25}])


def test_vijfentwintig_regels_mag_nog():
    regels = [{"wijnId": "wijn-{}".format(n), "aantal": 1} for n in range(25)]
    assert len(b.valideer_regels(regels)) == 25
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_regels(regels + [{"wijnId": "wijn-25", "aantal": 1}])
    assert fout.value.code == "te_veel_regels"


@pytest.mark.parametrize("van, tot", [
    ("2026-11-26T17:00:00Z", "2026-11-26T17:00:00Z"),  # Een moment zonder duur.
    (20261126, "2026-11-26T19:00:00Z"),  # Geen tekst: een nette weigering, geen crash.
    ("2026-11-26T17:00:00Z", None),
    ("gisteren", "morgen"),  # Tekst die geen tijdstip is, ook als de volgorde toevallig klopt.
])
def test_een_moment_van_brengen_heeft_een_begin_voor_het_eind(van, tot):
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_lijst_levering({"brengen": {"van": van, "tot": tot}})
    assert fout.value.code == "ongeldig_moment"


def test_de_ophaalplek_is_hoogstens_tweehonderd_tekens():
    halen = {"van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T11:00:00Z"}
    assert b.valideer_lijst_levering({"halen": dict(halen, waar="x" * 200)})["halen"]["waar"] == "x" * 200
    with pytest.raises(b.OngeldigeBestelling) as fout:
        b.valideer_lijst_levering({"halen": dict(halen, waar="x" * 201)})
    assert fout.value.code == "geen_ophaalplek"


def test_zonder_opgave_heeft_een_lid_geen_adres():
    """Brengen kan alleen naar een adres. Wie de vraag vergeet te stellen, krijgt een weigering en geen bezorging."""
    gegevens = dict(
        bestelling_id="b-1", lid_id="lid-1", soort=b.LIJST, lijst_id="lijst-1",
        regels=[{"wijnId": "a", "aantal": 1}], wijnen={"a": {"naam": "Verdejo", "prijs": 950}},
        levering=b.BRENGEN, ingevoerd_door="lid", aangemaakt=NU, aangeboden=(b.BRENGEN, b.HALEN),
    )
    with pytest.raises(b.OngeldigeBestelling):
        b.nieuwe_bestelling(**gegevens)
    assert b.nieuwe_bestelling(heeft_adres=True, **gegevens)["levering"] == b.BRENGEN


def test_een_korte_lijst_redenen_geeft_geen_crash():
    """DynamoDB geeft soms minder redenen terug dan er stappen waren. Dan is er niets op en bestond er niets."""
    regels = [{"wijnId": "a", "aantal": 1}, {"wijnId": "d", "aantal": 2}]
    # Precies zoveel redenen dat de stap van de bestelling zelf ontbreekt.
    redenen = [{"Code": "None"}, {"Code": "None"}, {"Code": "ConditionalCheckFailed"}]
    assert b.bestaat_al(redenen, regels) is False
    assert b.uitverkocht(redenen, regels) == {"lijstGesloten": False, "wijnen": ["d"]}
    assert b.uitverkocht(redenen[:2], regels) == {"lijstGesloten": False, "wijnen": []}
    assert b.uitverkocht([], regels) == {"lijstGesloten": False, "wijnen": []}


def test_een_melding_vraagt_uit_zichzelf_geen_controle_en_geen_terugbetaling():
    assert b.Besluit() == b.Besluit(nieuwe_status=None, controle_nodig=False)
    # Zonder opgave geldt een betaling als niet terugbetaald: de bestelling blijft betaald.
    assert b.besluit_na_melding(b.BETAALD, "paid", betaling_id="tr_1", betaald_met="tr_1") == b.Besluit()


# ---- Bieding ----

def test_een_bod_op_precies_twee_minuten_voor_het_eind_verlengt():
    eind = tijd.iso(NU + timedelta(minutes=2))
    assert bd.nieuwe_eindtijd(eind, NU) == tijd.iso(NU + timedelta(minutes=2))
    # Eén seconde later op de klok is het bod binnen de twee minuten: de eindtijd schuift mee.
    assert bd.nieuwe_eindtijd(eind, NU + timedelta(seconds=1)) == tijd.iso(NU + timedelta(minutes=2, seconds=1))
    # Eén seconde eerder valt het erbuiten.
    assert bd.nieuwe_eindtijd(eind, NU - timedelta(seconds=1)) == eind


def test_elk_bod_telt_als_een_bieding():
    wijn = {
        "wijnId": "barolo", "soort": "bieding", "naam": "Barolo Riserva", "biedingStatus": "open",
        "startbod": 18000, "minimaleVerhoging": 1000, "minimaalVolgendBod": 25000,
        "hoogsteBod": 24000, "hoogsteBieder": "lid-7", "eindtijd": "2026-11-21T19:00:00Z",
    }
    bijwerken = bd.bod_transactie(tabellen=TABELLEN, wijn=wijn, lid_id="lid-1", bedrag=26000, nu=NU)[0]["Update"]
    assert "aantalBiedingen = if_not_exists(aantalBiedingen, :nul) + :een" in bijwerken["UpdateExpression"]
    assert bijwerken["ExpressionAttributeValues"][":nul"] == {"N": "0"}
    assert bijwerken["ExpressionAttributeValues"][":een"] == {"N": "1"}


def test_sluiten_weigert_een_bestelling_als_er_geen_hoogste_bod_is():
    """Een winnaar zonder bedrag hoort niet voor te komen. Gebeurt het toch, dan gaat er geen fles weg voor één cent."""
    wijn = {
        "wijnId": "barolo", "soort": "bieding", "naam": "Barolo Riserva", "biedingStatus": "open",
        "hoogsteBieder": "lid-7", "eindtijd": "2026-11-19T15:40:00Z",
    }
    bestelling = b.nieuwe_bestelling(
        bestelling_id="b-barolo", lid_id="lid-7", soort=b.BIEDING, lijst_id=None,
        regels=[{"wijnId": "barolo", "aantal": 1}], wijnen={"barolo": {"naam": "Barolo Riserva", "prijs": 1}},
        levering=None, ingevoerd_door="lid", aangemaakt=NU,
    )
    with pytest.raises(ValueError):
        bd.sluit_transactie(tabellen=TABELLEN, wijn=wijn, bestelling=bestelling, nu=NU)


# ---- Opslaan en antwoorden ----

def test_een_leeg_veld_wordt_als_leeg_opgeslagen():
    assert dynamo.waarde(None) == {"NULL": True}
    assert dynamo.waarde({"levering": None}) == {"M": {"levering": {"NULL": True}}}


def test_een_kommagetal_wordt_niet_opgeslagen():
    """Bedragen zijn hele centen. Een kommagetal is een fout in de code en mag niet stil in de tabel komen."""
    with pytest.raises(TypeError):
        dynamo.waarde(9.5)


def test_een_getal_uit_de_opslag_blijft_wat_het_is():
    assert antwoord.json_antwoord(200, {"prijs": Decimal("1150")})["body"] == '{"prijs": 1150}'
    assert antwoord.json_antwoord(200, {"deel": Decimal("0.5")})["body"] == '{"deel": 0.5}'
    with pytest.raises(TypeError):
        antwoord.json_antwoord(200, {"wanneer": NU})


@pytest.mark.parametrize("sub", ["", None, 12345, ["lid-1"], {"sub": "lid-1"}])
def test_een_token_zonder_bruikbaar_lid_is_niet_ingelogd(sub):
    """Het lid komt uit het token. Is dat leeg of geen tekst, dan is er geen lid, ook geen half lid."""
    aanvraag = {"requestContext": {"authorizer": {"jwt": {"claims": {"sub": sub}}}}}
    with pytest.raises(antwoord.NietIngelogd):
        antwoord.lid_id(aanvraag)


@pytest.mark.parametrize("groepen", [None, 7, {"beheer": True}])
def test_groepen_in_een_onbekende_vorm_geven_geen_beheer(groepen):
    aanvraag = {"requestContext": {"authorizer": {"jwt": {"claims": {"sub": "lid-1", "cognito:groups": groepen}}}}}
    assert antwoord.groepen(aanvraag) == []
    assert antwoord.is_beheer(aanvraag) is False


def test_een_tijdstip_zonder_tijdzone_wordt_niet_omgezet():
    """Tijden zijn UTC. Een tijdstip zonder tijdzone zou stil de klok van de machine volgen."""
    with pytest.raises(ValueError):
        tijd.iso(datetime(2026, 11, 19, 15, 40))


# ---- Herkennen ----

def model(**velden):
    import json

    return lambda instructie, vraag: json.dumps(velden)


def test_een_bericht_van_precies_tweeduizend_tekens_mag_nog():
    assert herkennen.controleer_bericht("x" * 2000) == "x" * 2000
    with pytest.raises(ValueError):
        herkennen.controleer_bericht("x" * 2001)


@pytest.mark.parametrize("veld", ["naam", "producent"])
def test_een_naam_van_precies_honderdtwintig_tekens_mag_nog(veld):
    lang = "a" * 120
    assert getattr(herkennen.herken("Wijn J " + lang, model(**{veld: lang})), veld) == lang
    langer = "a" * 121
    assert getattr(herkennen.herken("Wijn J " + langer, model(**{veld: langer})), veld) is None


def test_een_omschrijving_van_precies_duizend_tekens_mag_nog():
    lang = " ".join(["fris"] * 200)  # 200 woorden van vier letters en 199 spaties: 999 tekens.
    lang += "s"
    assert len(lang) == 1000
    assert herkennen.herken("Wijn J\n" + lang, model(tekst=lang)).tekst == lang
    langer = lang + "s"
    assert herkennen.herken("Wijn J\n" + langer, model(tekst=langer)).tekst is None


@pytest.mark.parametrize("tekst", ["", "   ", "**", "_ _"])
def test_een_lege_omschrijving_is_geen_omschrijving(tekst):
    """Alleen opmaak of spaties: het veld ontbreekt, en Marc ziet dat hij het zelf moet invullen."""
    herkend = herkennen.herken("Wijn J Soave 2023", model(tekst=tekst))
    assert herkend.tekst is None
    assert "tekst" in herkend.ontbreekt


@pytest.mark.parametrize("naam", ["!!!", "—", "..."])
def test_een_naam_zonder_woorden_is_geen_naam(naam):
    assert herkennen.herken("Wijn J Soave 2023 !!! — ...", model(naam=naam)).naam is None


def test_een_naam_aan_het_eind_van_het_bericht_wordt_gevonden():
    """De naam mag overal in het bericht staan, ook als de laatste woorden."""
    bericht = "18 flessen, 10,50 per fles: Soave Classico"
    assert herkennen.herken(bericht, model(naam="Soave Classico")).naam == "Soave Classico"
    assert herkennen.herken(bericht, model(naam="Classico")).naam == "Classico"
    assert herkennen.herken(bericht, model(naam="Classico Soave")).naam is None


@pytest.mark.parametrize("aantal, verwacht", [(1, 1), (999, 999), (0, None), (1000, None)])
def test_het_aantal_ligt_tussen_een_en_negenhonderdnegenennegentig(aantal, verwacht):
    assert herkennen.herken("Wijn J Soave, {} fl".format(aantal), model(aantal=aantal)).aantal == verwacht


@pytest.mark.parametrize("jaargang, verwacht", [(1900, 1900), (2100, 2100), (1899, None), (2101, None)])
def test_de_jaargang_ligt_tussen_1900_en_2100(jaargang, verwacht):
    assert herkennen.herken("Wijn J Soave {}".format(jaargang), model(jaargang=jaargang)).jaargang == verwacht


def test_duizend_euro_is_de_hoogste_prijs_voor_de_lijst():
    assert herkennen.herken("Wijn J Soave € 1000", model(prijs="1000")).prijs == 100_000
    assert herkennen.herken("Wijn J Soave € 1000,01", model(prijs="1000,01")).prijs is None


# ---- Kenmerken ----

def test_een_land_van_precies_veertig_tekens_mag_nog():
    lang = "a" * 40
    assert kenmerken.lees_antwoord(json.dumps({"land": lang})).land == lang
    assert kenmerken.lees_antwoord(json.dumps({"land": lang + "a"})).land is None
    with pytest.raises(ValueError):
        kenmerken.controleer(None, lang + "a", None)


def test_een_veld_van_precies_honderdtwintig_tekens_gaat_naar_het_model():
    _, vraag = kenmerken.maak_vraag({"naam": "a" * 120, "druif": "b" * 121})
    assert "a" * 120 in vraag
    assert "b" not in vraag


def test_er_zijn_vijf_kleuren_en_drie_volheden():
    assert kenmerken.KLEUREN == ("rood", "wit", "rosé", "bubbels", "zoet")
    assert kenmerken.VOLHEDEN == ("licht", "midden", "vol")
