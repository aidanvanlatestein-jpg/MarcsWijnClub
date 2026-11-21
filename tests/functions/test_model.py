"""De route naar het taalmodel (model.py), met een nagebootst pakket anthropic.

Het echte pakket werkt niet op Python 3.9 en de tests roepen de API van Anthropic nooit aan. Het
nagebootste pakket heeft dezelfde namen en dezelfde volgorde van foutsoorten als anthropic 2.6.0.
"""
import json
import sys
import types
from types import SimpleNamespace

import pytest
from botocore.exceptions import ClientError

from wijnclub import model
from wijnclub.domein import herkennen, tekst

# ---- Het nagebootste pakket ----


class APIError(Exception):
    pass


class APIStatusError(APIError):
    def __init__(self, status_code):
        super().__init__("status {}".format(status_code))
        self.status_code = status_code


class RateLimitError(APIStatusError):
    def __init__(self):
        super().__init__(429)


class InternalServerError(APIStatusError):
    pass


class APIConnectionError(APIError):
    pass


class APITimeoutError(APIConnectionError):
    pass


def antwoord(tekst_="{}", stop_reason="end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=tekst_)],
    )


class Berichten:
    def __init__(self, uitkomsten):
        self.uitkomsten = list(uitkomsten)
        self.gevraagd = []

    def create(self, **argumenten):
        self.gevraagd.append(argumenten)
        uitkomst = self.uitkomsten.pop(0)
        if isinstance(uitkomst, Exception):
            raise uitkomst
        return uitkomst


@pytest.fixture
def anthropic(monkeypatch):
    """Zet een nagebootst pakket klaar. `anthropic.uitkomsten` bepaalt wat create teruggeeft of gooit."""
    pakket = types.ModuleType("anthropic")
    for klasse in (APIError, APIStatusError, RateLimitError, InternalServerError, APIConnectionError, APITimeoutError):
        setattr(pakket, klasse.__name__, klasse)
    pakket.Timeout = lambda lezen, connect: ("timeout", lezen, connect)
    pakket.uitkomsten = []
    pakket.clients = []

    def maak(**instellingen):
        client = SimpleNamespace(instellingen=instellingen, messages=Berichten(pakket.uitkomsten))
        pakket.clients.append(client)
        return client

    pakket.Anthropic = maak
    monkeypatch.setitem(sys.modules, "anthropic", pakket)
    monkeypatch.setattr(model, "_client", None)
    monkeypatch.setattr(model, "PAUZE", 0)
    monkeypatch.setenv("GEHEIM_ANTHROPIC", "wijnclub/test/anthropic-api-sleutel")
    monkeypatch.delenv("TAALMODEL", raising=False)
    return pakket


@pytest.fixture
def geheim(monkeypatch):
    """Secrets Manager, nagebootst. De sleutel is verzonnen."""
    gelezen = []
    stand = {"waarde": "sk-ant-verzonnen", "fout": None}

    class Secrets:
        def get_secret_value(self, SecretId):
            gelezen.append(SecretId)
            if stand["fout"]:
                raise ClientError({"Error": {"Code": stand["fout"]}}, "GetSecretValue")
            return {"SecretString": stand["waarde"]}

    monkeypatch.setattr(model.boto3, "client", lambda dienst: Secrets())
    stand["gelezen"] = gelezen
    return stand


def gestelde_vraag(anthropic, nummer=0):
    return anthropic.clients[0].messages.gevraagd[nummer]


# ---- Een goed antwoord ----

def test_een_goed_antwoord_geeft_de_tekst_terug(anthropic, geheim):
    anthropic.uitkomsten.append(antwoord('{"voorstellen": ["Fris."]}'))
    vraag = model.vraag_model(tekst.SCHEMA)

    assert vraag("de instructie", "de vraag") == '{"voorstellen": ["Fris."]}'

    gevraagd = gestelde_vraag(anthropic)
    assert gevraagd["model"] == "claude-haiku-5-5"
    assert gevraagd["system"] == "de instructie"
    assert gevraagd["messages"] == [{"role": "user", "content": "de vraag"}]
    assert gevraagd["output_config"] == {"format": {"type": "json_schema", "schema": tekst.SCHEMA}}
    instellingen = anthropic.clients[0].instellingen
    assert instellingen["api_key"] == "sk-ant-verzonnen"
    assert instellingen["timeout"] == ("timeout", 20.0, 5.0)
    assert instellingen["max_retries"] == 0


def test_het_model_komt_uit_de_omgeving(anthropic, geheim, monkeypatch):
    monkeypatch.setenv("TAALMODEL", "claude-sonnet-5-5")
    anthropic.uitkomsten.append(antwoord())
    model.vraag_model(herkennen.SCHEMA)("i", "v")
    assert gestelde_vraag(anthropic)["model"] == "claude-sonnet-5-5"


def test_de_sleutel_wordt_een_keer_per_opstart_gelezen(anthropic, geheim):
    anthropic.uitkomsten.extend([antwoord(), antwoord()])
    vraag = model.vraag_model(tekst.SCHEMA)
    vraag("i", "v")
    vraag("i", "v")
    assert geheim["gelezen"] == ["wijnclub/test/anthropic-api-sleutel"]
    assert len(anthropic.clients) == 1


def test_echt_antwoord_met_de_regels_erachter(anthropic, geheim):
    """Van model tot domein: het schema van herkennen en een antwoord dat de regels doorlopen."""
    bericht = "*Wijn J Soave Classico 2023*\n18 flessen beschikbaar €10,5 pfl"
    anthropic.uitkomsten.append(antwoord(json.dumps({
        "naam": "Soave Classico", "producent": None, "jaargang": 2023, "aantal": 18, "prijs": "10,5", "tekst": None,
    })))
    herkend = herkennen.herken(bericht, model.vraag_model(herkennen.SCHEMA))
    assert (herkend.naam, herkend.jaargang, herkend.aantal, herkend.prijs) == ("Soave Classico", 2023, 18, 1050)
    assert gestelde_vraag(anthropic)["output_config"]["format"]["schema"] == herkennen.SCHEMA


# ---- Weigering en tokengrens ----

def test_een_weigering_is_geen_antwoord(anthropic, geheim):
    anthropic.uitkomsten.append(antwoord('{"voorstellen": []}', stop_reason="refusal"))
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "weigering"


@pytest.mark.parametrize("reden", ["max_tokens", "model_context_window_exceeded"])
def test_de_tokengrens_is_geen_antwoord(anthropic, geheim, reden):
    """Een afgebroken antwoord is halve JSON. Liever niets dan half."""
    anthropic.uitkomsten.append(antwoord('{"voorstellen": ["Fris', stop_reason=reden))
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "tokengrens"


def test_alleen_tekstblokken_tellen(anthropic, geheim):
    anthropic.uitkomsten.append(SimpleNamespace(stop_reason="end_turn", content=[
        SimpleNamespace(type="text", text='{"a"'), SimpleNamespace(type="thinking"), SimpleNamespace(type="text", text=": 1}"),
    ]))
    assert model.vraag_model(tekst.SCHEMA)("i", "v") == '{"a": 1}'


# ---- Fouten van de API ----

def test_een_time_out_wordt_niet_herhaald(anthropic, geheim):
    """Na 20 seconden wachten is er geen tijd meer voor een tweede poging binnen de 30 van de functie."""
    anthropic.uitkomsten.extend([APITimeoutError(), antwoord()])
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "tijd"
    assert len(anthropic.clients[0].messages.gevraagd) == 1


@pytest.mark.parametrize("eerste", [RateLimitError(), InternalServerError(529), APIConnectionError()])
def test_een_snelle_fout_wordt_een_keer_herhaald(anthropic, geheim, eerste):
    anthropic.uitkomsten.extend([eerste, antwoord('{"ok": true}')])
    assert model.vraag_model(tekst.SCHEMA)("i", "v") == '{"ok": true}'
    assert len(anthropic.clients[0].messages.gevraagd) == 2


@pytest.mark.parametrize("fout_, reden", [
    (RateLimitError(), "limiet"),
    (InternalServerError(500), "status_500"),
    (APIConnectionError(), "verbinding"),
])
def test_hoogstens_een_herhaling(anthropic, geheim, fout_, reden):
    anthropic.uitkomsten.extend([fout_, fout_, antwoord()])
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == reden
    assert len(anthropic.clients[0].messages.gevraagd) == 2


@pytest.mark.parametrize("status", [400, 401, 403, 404])
def test_een_fout_in_de_aanvraag_wordt_niet_herhaald(anthropic, geheim, status):
    anthropic.uitkomsten.extend([APIStatusError(status), antwoord()])
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "status_{}".format(status)
    assert len(anthropic.clients[0].messages.gevraagd) == 1


# ---- De sleutel ----

def test_zonder_naam_van_het_geheim_geen_aanroep(anthropic, geheim, monkeypatch):
    monkeypatch.delenv("GEHEIM_ANTHROPIC")
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "geen_geheim"
    assert anthropic.clients == []


def test_een_ontbrekend_geheim_geeft_geen_aanroep_en_wordt_later_opnieuw_gelezen(anthropic, geheim):
    geheim["fout"] = "ResourceNotFoundException"
    vraag = model.vraag_model(tekst.SCHEMA)
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        vraag("i", "v")
    assert fout.value.reden == "geen_sleutel"
    assert anthropic.clients == []

    # Zet Aidan de sleutel er daarna in, dan werkt het zonder nieuwe opstart.
    geheim["fout"] = None
    anthropic.uitkomsten.append(antwoord("{}"))
    assert vraag("i", "v") == "{}"
    assert len(geheim["gelezen"]) == 2


@pytest.mark.parametrize("waarde", ["", "   ", None])
def test_een_leeg_geheim_is_geen_sleutel(anthropic, geheim, waarde):
    geheim["waarde"] = waarde
    with pytest.raises(model.ModelNietBeschikbaar) as fout:
        model.vraag_model(tekst.SCHEMA)("i", "v")
    assert fout.value.reden == "geen_sleutel"


def test_de_sleutel_komt_niet_in_het_logboek(anthropic, geheim, caplog):
    geheim["fout"] = "AccessDeniedException"
    with pytest.raises(model.ModelNietBeschikbaar):
        model.vraag_model(tekst.SCHEMA)("geheime instructie", "geheime vraag")
    assert "ClientError" in caplog.text
    assert "geheime" not in caplog.text
    assert "anthropic-api-sleutel" not in caplog.text
