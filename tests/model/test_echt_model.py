"""De test met het echte model: tien sets steekwoorden op drie modellen. Kost enkele centen.

Draai dit alleen na een ja van Aidan. Zonder die drie dingen wordt de test overgeslagen:

- Python 3.10 of hoger met het pakket anthropic (`pip install anthropic==2.6.0`);
- ANTHROPIC_API_KEY, een sleutel uit de werkruimte voor `test`;
- WIJNCLUB_ECHT_MODEL=ja, zodat een sleutel die toevallig in de omgeving staat niets uitgeeft.

    WIJNCLUB_ECHT_MODEL=ja ANTHROPIC_API_KEY=... pytest tests/model -s

Voor elk van Marcs zeven teksten in VOORBEELDEN gaan steekwoorden die uit die tekst zijn afgeleid
naar het model, met dat voorbeeld zelf even uit de instructie. Drie verzonnen sets maken het tien.
Per voorstel telt de test: weggevallen op een getal, het aantal woorden in `nieuw`, en aroma's of
gerechten die uit een voorbeeld komen in plaats van uit de steekwoorden. De uitkomst, met elk
voorstel naast Marcs eigen tekst, gaat naar tests/model/uitkomsten/ en wordt niet vastgelegd.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

from wijnclub import model
from wijnclub.domein import herkennen, tekst

MODELLEN = ("claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5")
UITKOMSTEN = Path(__file__).resolve().parent / "uitkomsten"

pytestmark = [
    pytest.mark.skipif(sys.version_info < (3, 10), reason="het pakket anthropic vraagt Python 3.10 of hoger"),
    pytest.mark.skipif(not os.environ.get("ANTHROPIC_API_KEY"), reason="geen sleutel van Anthropic"),
    pytest.mark.skipif(os.environ.get("WIJNCLUB_ECHT_MODEL") != "ja", reason="kost geld; zet WIJNCLUB_ECHT_MODEL=ja"),
]

# Per voorbeeld van Marc, in de volgorde van VOORBEELDEN: de velden van de wijn en steekwoorden
# zoals Marc ze zou typen, afgeleid uit zijn eigen tekst.
UIT_MARCS_TEKSTEN = (
    ({"naam": "Barolo", "streek": "Piemonte"},
     "karaktervol, rode kers, roos, kruiden, wat leer, zachte tannine, nog fris, lang en complex, klassiek, "
     "structuur, kan liggen, stoof van rund, gestoofd wangetje, risotto met paddenstoelen, "
     "barolo voor de prijs van een langhe rosso"),
    ({"naam": "Negroamaro", "streek": "Puglia"},
     "krachtig, rijp zwart fruit, pruim, warme kruiden, vol en soepel, zwoele tannine, rijke lange afdronk, "
     "italiaanse krachtpatser"),
    ({"naam": "Sauternes"},
     "zoet, elegant, edele rotting (botrytis), hoge concentratie, honing, abrikoos, gekonfijt fruit, "
     "exotisch fruit, vol, fluweelzacht, balans zoet en frisse zuren"),
    ({"naam": "Barsac", "druif": "Sémillon, Sauvignon Blanc, Muscadelle"},
     "zoet, frans, edele rotting, premier cru classé 1855, vooral sémillon, rijk en elegant, honing, abrikoos, "
     "mango, ananas, gekonfijte citrus, kan lang bewaren"),
    ({"naam": "Santenay", "producent": "Domaine Françoise et Denis Clair", "streek": "Côte de Beaune"},
     "topkwaliteit bourgogne zonder hoofdprijs, familiedomein, begonnen in 1986 met 5 hectare, nu 14 hectare, "
     "toppercelen in santenay, saint-aubin en puligny-montrachet, zoon jean-baptiste nam het over, "
     "kwaliteit nog hoger, favoriet van liefhebbers"),
    ({"naam": "Santenay", "producent": "Domaine Françoise et Denis Clair"},
     "erg gewild, maar weinig flessen kunnen krijgen, daarom alles in één keer in de app, "
     "iedereen ziet meteen wat er is en kan kiezen"),
    ({"naam": "Sauternes"},
     "goed gemaakte zoete wijn is mooi, rijk, vol, complex, niet alleen zoet, rijpt enorm goed, "
     "verandert en ontwikkelt zich"),
)

# Verzonnen sets, om tot tien te komen.
VERZONNEN = (
    ({"naam": "Verdejo", "streek": "Rueda"}, "fris, citrus, venkel, wat grapefruit, strak, bij asperges, nu drinken"),
    ({"naam": "Riesling Kabinett", "streek": "Mosel", "jaargang": 2022},
     "licht zoet, groene appel, limoen, leisteen, laag alcohol, bij thais, ook als aperitief"),
    ({"naam": "Côtes du Rhône", "druif": "Grenache, Syrah"},
     "sappig rood fruit, peper, soepel, bij een stoofpotje, makkelijke doordrinker, weinig flessen"),
)

# Aroma's, gerechten en feiten uit de voorbeelden in de instructie. Komt er een in een voorstel terwijl
# hij niet in de steekwoorden of velden staat, dan nam het model hem over uit een voorbeeld.
UIT_VOORBEELDEN = (
    "kers", "roos", "rozen", "leer", "risotto", "paddenstoel", "stoof", "wangetje", "pruim", "honing", "abrikoos",
    "gekonfijt", "exotisch", "mango", "ananas", "citrus", "botrytis", "edele rotting", "vanille", "tabak",
    "lamsbout", "manchego", "sémillon", "premier cru", "hectare", "krachtpatser", "langhe",
)


def _sets():
    for index, (wijn, notitie) in enumerate(UIT_MARCS_TEKSTEN):
        opbouw, eigen = tekst.VOORBEELDEN[index]
        yield "marc-{}".format(index + 1), wijn, notitie, index, "{} ({})".format(eigen, opbouw)
    for index, (wijn, notitie) in enumerate(VERZONNEN):
        yield "verzonnen-{}".format(index + 1), wijn, notitie, None, None


def _tel(ruw: object, gehouden, notitie: str, wijn: dict) -> dict:
    """Wat er van het antwoord overbleef, en waarom niet."""
    bron = " ".join([notitie, *tekst._velden(wijn).values()])
    voorstellen = herkennen._lees_json(ruw).get("voorstellen") or []
    weg_op_getal = sum(
        1 for v in voorstellen if isinstance(v, str) and any(not tekst._getal_in(g, bron) for g in tekst._GETAL.findall(v))
    )
    bron_klein = bron.casefold()
    return {
        "voorstellen_van_het_model": len(voorstellen),
        "gehouden": len(gehouden),
        "weggevallen_op_een_getal": weg_op_getal,
        "per_voorstel": [
            {
                "tekst": voorstel.tekst,
                "woorden_in_nieuw": len(voorstel.nieuw),
                "nieuw": voorstel.nieuw,
                "uit_een_voorbeeld": [
                    woord for woord in UIT_VOORBEELDEN
                    if woord in voorstel.tekst.casefold() and woord not in bron_klein
                ],
            }
            for voorstel in gehouden
        ],
    }


@pytest.mark.parametrize("naam", MODELLEN)
def test_tien_sets_op_het_echte_model(naam, monkeypatch):
    monkeypatch.setenv("TAALMODEL", naam)
    monkeypatch.setattr(model, "_client", None)
    monkeypatch.setattr(model, "_sleutel", lambda: os.environ["ANTHROPIC_API_KEY"])

    uitkomst = []
    for set_, wijn, notitie, zonder, eigen in _sets():
        # Het voorbeeld waar de steekwoorden uit komen, gaat even uit de instructie.
        voorbeelden = tuple(v for i, v in enumerate(tekst.VOORBEELDEN) if i != zonder)
        monkeypatch.setattr(tekst, "VOORBEELDEN", voorbeelden)
        monkeypatch.setattr(tekst, "INSTRUCTIE", tekst._maak_instructie())

        ruw = {}

        def vraag(instructie, vraag_, _ruw=ruw):
            _ruw["antwoord"] = model.vraag_model(tekst.SCHEMA)(instructie, vraag_)
            return _ruw["antwoord"]

        regel = {"set": set_, "wijn": wijn, "notitie": notitie, "marc_zelf": eigen}
        try:
            gehouden = tekst.stel_voor(notitie, wijn, vraag)
            regel.update(_tel(ruw.get("antwoord"), gehouden, notitie, wijn))
        except model.ModelNietBeschikbaar as fout:
            regel["fout"] = fout.reden
        uitkomst.append(regel)

    UITKOMSTEN.mkdir(exist_ok=True)
    moment = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    bestand = UITKOMSTEN / "{}-{}.json".format(moment, naam)
    bestand.write_text(json.dumps(uitkomst, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nUitkomst van {}: {}".format(naam, bestand))
    assert len(uitkomst) == 10
