"""POST /api/beheer/teksten en POST /api/beheer/herken, met een nagebootst model en een nagebootste teller.

Alle notities, berichten en wijnen zijn verzonnen.
"""
import base64
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from test_herkennen import SOAVE
from test_herkennen import model_dat_antwoordt as herken_model
from test_tekst import NOTITIE, WIJN, WIJN_VOORSTEL
from test_tekst import model_dat_antwoordt as tekst_model

from wijnclub import model, opslag
from wijnclub.domein import herkennen, tekst, teller
from wijnclub.handlers import herken, teksten


def aanvraag(inhoud, groepen="[beheer]", base64_=False):
    claims = {"sub": "lid-1"}
    if groepen is not None:
        claims["cognito:groups"] = groepen
    body = inhoud if isinstance(inhoud, str) else json.dumps(inhoud)
    if base64_:
        body = base64.b64encode(body.encode("utf-8")).decode("ascii")
    return {"requestContext": {"authorizer": {"jwt": {"claims": claims}}}, "body": body, "isBase64Encoded": base64_}


@pytest.fixture
def teller_(monkeypatch):
    """Een teller die telt hoe vaak hij gevraagd werd, en de grens kan nabootsen."""
    stand = SimpleNamespace(gevraagd=[], vol=False)

    def tel(argumenten):
        stand.gevraagd.append(argumenten)
        return not stand.vol

    monkeypatch.setattr(opslag, "tel_modelaanroep", tel)
    return stand


@pytest.fixture
def met_model(monkeypatch):
    """Zet een nagebootst model in plaats van model.vraag_model en onthoudt het schema."""
    stand = SimpleNamespace(schemas=[], model=None)

    def zet(nagebootst):
        stand.model = nagebootst

        def vraag_model(schema):
            stand.schemas.append(schema)
            return nagebootst

        monkeypatch.setattr(model, "vraag_model", vraag_model)
        return stand

    return zet


def inhoud(resultaat):
    return json.loads(resultaat["body"])


# ---- Teksten ----

def test_teksten_geeft_voorstellen(teller_, met_model):
    stand = met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL, "Een Barolo van 99 punten."]}))
    resultaat = teksten.handler(aanvraag(dict(WIJN, notitie=NOTITIE)), None)

    assert resultaat["statusCode"] == 200
    voorstellen = inhoud(resultaat)["voorstellen"]
    # Het tweede voorstel verzint een getal en valt weg.
    assert [v["tekst"] for v in voorstellen] == [WIJN_VOORSTEL]
    assert stand.schemas == [tekst.SCHEMA]
    # De velden van de wijn gingen mee, de prijs niet.
    _, vraag = stand.model.gevraagd[0]
    assert "Cantina Voorbeeld" in vraag and "2450" not in vraag
    assert len(teller_.gevraagd) == 1


def test_teksten_zonder_beheer_geeft_geen_toegang(teller_, met_model):
    stand = met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    for groepen in (None, "[leden]"):
        resultaat = teksten.handler(aanvraag({"notitie": NOTITIE}, groepen=groepen), None)
        assert resultaat["statusCode"] == 403
        assert inhoud(resultaat)["fout"] == "geen_toegang"
    assert stand.model.gevraagd == [] and teller_.gevraagd == []


def test_teksten_boven_de_grens_vraagt_het_model_niet(teller_, met_model):
    stand = met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    teller_.vol = True
    resultaat = teksten.handler(aanvraag({"notitie": NOTITIE}), None)
    assert resultaat["statusCode"] == 429
    assert inhoud(resultaat)["fout"] == "te_veel"
    assert "Vul zelf in" in inhoud(resultaat)["bericht"]
    assert stand.model.gevraagd == []


def test_teksten_met_een_fout_van_het_model_geeft_503(teller_, monkeypatch, caplog):
    def kapot(instructie, vraag):
        raise model.ModelNietBeschikbaar("weigering")

    monkeypatch.setattr(model, "vraag_model", lambda schema: kapot)
    resultaat = teksten.handler(aanvraag({"notitie": NOTITIE}), None)
    assert resultaat["statusCode"] == 503
    assert inhoud(resultaat) == {
        "fout": "model_niet_beschikbaar", "bericht": "Het model geeft nu geen antwoord. Vul zelf in.",
    }
    assert "weigering" in caplog.text


@pytest.mark.parametrize("body", [
    {},
    {"notitie": ""},
    {"notitie": "x" * 501},
    {"notitie": 12},
    "geen json",
    "[1, 2]",
    "",
])
def test_teksten_met_foute_invoer_telt_niet_mee(teller_, met_model, body):
    stand = met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    resultaat = teksten.handler(aanvraag(body), None)
    assert resultaat["statusCode"] == 400
    assert inhoud(resultaat)["fout"] == "ongeldige_notitie"
    assert stand.model.gevraagd == [] and teller_.gevraagd == []


def test_de_notitie_en_het_antwoord_komen_niet_in_het_logboek(teller_, met_model, caplog):
    caplog.set_level("INFO")
    met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    teksten.handler(aanvraag({"notitie": NOTITIE}), None)
    assert "teksten gelukt: 1 voorstellen over" in caplog.text
    assert "kers" not in caplog.text and "Karaktervolle" not in caplog.text


def test_een_aanvraag_in_base64_wordt_gelezen(teller_, met_model):
    met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    resultaat = teksten.handler(aanvraag({"notitie": NOTITIE}, base64_=True), None)
    assert resultaat["statusCode"] == 200


# ---- Herkennen ----

SOAVE_ANTWOORD = {"naam": "Soave Classico", "producent": None, "jaargang": 2023, "aantal": 18, "prijs": "10,5", "tekst": None}


def test_herken_geeft_de_velden(teller_, met_model, caplog):
    caplog.set_level("INFO")
    stand = met_model(herken_model(SOAVE_ANTWOORD))
    resultaat = herken.handler(aanvraag({"bericht": SOAVE}), None)

    assert resultaat["statusCode"] == 200
    assert inhoud(resultaat) == {
        "naam": "Soave Classico", "producent": None, "jaargang": 2023, "aantal": 18, "prijs": 1050, "tekst": None,
        "ontbreekt": ["producent", "tekst"],
    }
    assert stand.schemas == [herkennen.SCHEMA]
    assert "ontbreekt: producent, tekst" in caplog.text
    assert "Soave" not in caplog.text and "amandel" not in caplog.text


def test_herken_zonder_beheer_geeft_geen_toegang(teller_, met_model):
    stand = met_model(herken_model(SOAVE_ANTWOORD))
    resultaat = herken.handler(aanvraag({"bericht": SOAVE}, groepen="[leden]"), None)
    assert resultaat["statusCode"] == 403
    assert stand.model.gevraagd == [] and teller_.gevraagd == []


def test_herken_boven_de_grens_geeft_429(teller_, met_model):
    stand = met_model(herken_model(SOAVE_ANTWOORD))
    teller_.vol = True
    assert herken.handler(aanvraag({"bericht": SOAVE}), None)["statusCode"] == 429
    assert stand.model.gevraagd == []


def test_herken_met_een_fout_van_het_model_geeft_503(teller_, monkeypatch):
    def kapot(instructie, vraag):
        raise model.ModelNietBeschikbaar("verbinding")

    monkeypatch.setattr(model, "vraag_model", lambda schema: kapot)
    resultaat = herken.handler(aanvraag({"bericht": SOAVE}), None)
    assert resultaat["statusCode"] == 503
    assert inhoud(resultaat)["fout"] == "model_niet_beschikbaar"


def test_herken_met_een_te_lang_bericht_geeft_400(teller_, met_model):
    met_model(herken_model(SOAVE_ANTWOORD))
    resultaat = herken.handler(aanvraag({"bericht": "x" * 2001}), None)
    assert resultaat["statusCode"] == 400
    assert inhoud(resultaat)["fout"] == "ongeldig_bericht"
    assert teller_.gevraagd == []


# ---- Algemene fouten ----

def test_zonder_token_niet_ingelogd(teller_, met_model):
    met_model(herken_model(SOAVE_ANTWOORD))
    resultaat = herken.handler({"body": json.dumps({"bericht": SOAVE})}, None)
    assert resultaat["statusCode"] == 401


def test_een_onverwachte_fout_geeft_de_algemene_fout(monkeypatch, met_model, caplog):
    met_model(herken_model(SOAVE_ANTWOORD))

    def stuk(argumenten):
        raise RuntimeError("tabel weg")

    monkeypatch.setattr(opslag, "tel_modelaanroep", stuk)
    resultaat = herken.handler(aanvraag({"bericht": SOAVE}), None)
    assert resultaat["statusCode"] == 500
    assert inhoud(resultaat) == {"fout": "interne_fout", "bericht": "Er ging iets mis. Probeer het opnieuw."}
    assert "tabel weg" not in resultaat["body"]


# ---- De teller ----

def test_de_teller_van_de_dag_is_een_utc_dag():
    moment = datetime(2026, 11, 21, 23, 30, tzinfo=timezone.utc)
    assert teller.sleutel(moment) == "model#2026-11-21"
    # 00:30 in Nederland is nog 23:30 UTC van de dag ervoor.
    nederland = timezone(timedelta(hours=1))
    assert teller.sleutel(datetime(2026, 11, 22, 0, 30, tzinfo=nederland)) == "model#2026-11-21"


def test_de_teller_vervalt_na_drie_dagen():
    moment = datetime(2026, 11, 21, 12, 0, tzinfo=timezone.utc)
    assert teller.vervalt_op(moment) == int(datetime(2026, 11, 24, 12, 0, tzinfo=timezone.utc).timestamp())


def test_een_tijdstip_zonder_tijdzone_geeft_geen_teller():
    with pytest.raises(ValueError):
        teller.sleutel(datetime(2026, 11, 21, 12, 0))
    with pytest.raises(ValueError):
        teller.vervalt_op(datetime(2026, 11, 21, 12, 0))


def test_herkennen_en_teksten_tellen_in_dezelfde_teller(teller_, met_model):
    met_model(herken_model(SOAVE_ANTWOORD))
    herken.handler(aanvraag({"bericht": SOAVE}), None)
    met_model(tekst_model({"voorstellen": [WIJN_VOORSTEL]}))
    teksten.handler(aanvraag({"notitie": NOTITIE}), None)
    sleutels = {argumenten["Key"]["tellerId"] for argumenten in teller_.gevraagd}
    assert len(teller_.gevraagd) == 2 and len(sleutels) == 1


class _Voorwaarde(Exception):
    pass


def test_opslag_telt_en_meldt_een_volle_dag(monkeypatch):
    gevraagd = []
    stand = {"vol": False}

    class Tabel:
        meta = SimpleNamespace(client=SimpleNamespace(exceptions=SimpleNamespace(ConditionalCheckFailedException=_Voorwaarde)))

        def update_item(self, **argumenten):
            gevraagd.append(argumenten)
            if stand["vol"]:
                raise _Voorwaarde()

    monkeypatch.setattr(opslag, "_tabel", lambda naam: Tabel() if naam == "tellers" else None)
    argumenten = teller.tel_op(datetime(2026, 11, 21, 12, 0, tzinfo=timezone.utc))
    assert opslag.tel_modelaanroep(argumenten) is True
    stand["vol"] = True
    assert opslag.tel_modelaanroep(argumenten) is False
    assert gevraagd == [argumenten, argumenten]


# ---- Het schema ----

def _sleutels_in(schema):
    if isinstance(schema, dict):
        for sleutel, waarde in schema.items():
            yield sleutel
            yield from _sleutels_in(waarde)
    elif isinstance(schema, list):
        for waarde in schema:
            yield from _sleutels_in(waarde)


def test_het_schema_van_herkennen_volgt_de_velden():
    assert list(herkennen.SCHEMA["properties"]) == list(herkennen.VELDEN)
    assert herkennen.SCHEMA["required"] == list(herkennen.VELDEN)
    assert herkennen.SCHEMA["additionalProperties"] is False


def test_het_schema_van_teksten_vraagt_een_lijst_voorstellen():
    assert tekst.SCHEMA["required"] == ["voorstellen"]
    assert tekst.SCHEMA["properties"]["voorstellen"] == {"type": "array", "items": {"type": "string"}}


@pytest.mark.parametrize("schema", [tekst.SCHEMA, herkennen.SCHEMA])
def test_het_schema_kent_geen_grenzen(schema):
    """Grenzen in een schema worden niet afgedwongen; ze horen in lees_antwoord."""
    verboden = {"maxLength", "minLength", "maxItems", "minItems", "maximum", "minimum", "pattern"}
    assert not verboden & set(_sleutels_in(schema))
