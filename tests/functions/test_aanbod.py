import json
from decimal import Decimal

import pytest

from wijnclub import antwoord, opslag
from wijnclub.handlers import aanbod


def aanvraag(sub="lid-1", groepen=None):
    claims = {"sub": sub}
    if groepen is not None:
        claims["cognito:groups"] = groepen
    return {"requestContext": {"authorizer": {"jwt": {"claims": claims}}}}


@pytest.fixture
def gevuld(monkeypatch):
    monkeypatch.setattr(opslag, "open_lijsten", lambda nu: [
        {"lijstId": "lijst-1", "titel": "Week 47", "inleiding": "Voor het gewone glas.", "status": "open",
         "openTot": "2026-11-22T19:00:00Z", "intern": "x",
         "afhaalpunten": [{"afhaalpuntId": "punt-utrecht", "naam": "Utrecht", "wanneer": "2026-11-28"}]},
    ])
    monkeypatch.setattr(opslag, "wijnen_van_lijst", lambda lijst_id: [
        {"wijnId": "d", "letter": "D", "naam": "Negroamaro", "prijs": Decimal("1150"), "voorraad": Decimal("12"),
         "inkoopprijs": Decimal("600")},
    ])
    monkeypatch.setattr(opslag, "open_biedingen", lambda nu: [
        {"wijnId": "barolo", "naam": "Barolo Riserva", "hoogsteBod": Decimal("24000"), "hoogsteBieder": "lid-7",
         "minimaalVolgendBod": Decimal("25000"), "eindtijd": "2026-11-21T19:00:00Z"},
    ])


def test_aanbod_geeft_lijst_en_biedingen(gevuld):
    resultaat = aanbod.handler(aanvraag(), None)
    assert resultaat["statusCode"] == 200
    inhoud = json.loads(resultaat["body"])
    lijst = inhoud["lijsten"][0]
    assert lijst["wijnen"] == [{"wijnId": "d", "letter": "D", "naam": "Negroamaro", "prijs": 1150, "voorraad": 12}]
    assert lijst["inleiding"] == "Voor het gewone glas."
    assert lijst["afhaalpunten"] == [{"afhaalpuntId": "punt-utrecht", "naam": "Utrecht", "wanneer": "2026-11-28"}]
    assert inhoud["biedingen"][0]["hoogsteBod"] == 24000


def test_aanbod_geeft_de_druif_mee_als_die_er_is(monkeypatch, gevuld):
    monkeypatch.setattr(opslag, "wijnen_van_lijst", lambda lijst_id: [
        {"wijnId": "i", "letter": "I", "naam": "Cándido Immensum 2022", "druif": "Negroamaro",
         "streek": "Puglia, Italië", "prijs": Decimal("1150"), "voorraad": Decimal("12")},
    ])
    wijn = json.loads(aanbod.handler(aanvraag(), None)["body"])["lijsten"][0]["wijnen"][0]
    assert wijn["druif"] == "Negroamaro"
    assert wijn["streek"] == "Puglia, Italië"


def test_aanbod_lekt_geen_interne_velden(gevuld):
    tekst = aanbod.handler(aanvraag(), None)["body"]
    assert "hoogsteBieder" not in tekst
    assert "lid-7" not in tekst
    assert "inkoopprijs" not in tekst
    assert "intern" not in tekst


def test_eigen_hoogste_bod_wordt_herkend(gevuld):
    inhoud = json.loads(aanbod.handler(aanvraag(sub="lid-7"), None)["body"])
    assert inhoud["biedingen"][0]["mijnBodIsHoogste"] is True


def test_zonder_token_geen_aanbod(gevuld):
    resultaat = aanbod.handler({"requestContext": {}}, None)
    assert resultaat["statusCode"] == 401
    assert json.loads(resultaat["body"])["fout"] == "niet_ingelogd"


def test_een_storing_geeft_een_algemene_fout(monkeypatch):
    def kapot(nu):
        raise RuntimeError("tabel arn:aws:dynamodb:eu-west-1:123456789012:table/geheim niet bereikbaar")

    monkeypatch.setattr(opslag, "open_lijsten", kapot)
    resultaat = aanbod.handler(aanvraag(), None)
    assert resultaat["statusCode"] == 500
    assert json.loads(resultaat["body"]) == {"fout": "interne_fout", "bericht": "Er ging iets mis. Probeer het opnieuw."}


@pytest.mark.parametrize(
    "groepen, verwacht",
    [("[beheer]", True), ("[leden beheer]", True), (["beheer"], True), ("[leden]", False), (None, False), ("[beheerder]", False)],
)
def test_beheer_wordt_uit_het_token_gelezen(groepen, verwacht):
    assert antwoord.is_beheer(aanvraag(groepen=groepen)) is verwacht
