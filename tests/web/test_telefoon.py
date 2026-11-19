"""De web-app op telefoonformaat, met de eisen uit hoofdstuk 10 van de bouwspecificatie.

Elke test draait op 375 x 667 en 320 x 568 px, behalve wat er zonder scrollen in beeld moet staan (M4):
dat geldt alleen op 375 x 667. Alle inhoud is voorbeeldinhoud van het prototype; er gaat niets naar de API.

De schermen veranderen nog. De tests leunen daarom op adressen, rollen en de vaste onderdelen
(hoofdknop, onderkant, panelen), en zo weinig mogelijk op de teksten van knoppen.
"""
import re

import pytest
from playwright.sync_api import expect
from telefoon_metingen import buiten_beeld, geen_overtredingen, scherm_klopt

# Schermen die zonder voorbereiding te openen zijn. Beheer staat in het prototype open voor iedereen.
# "avond" is het aanbod tijdens de lopende avond; dat zet de test klaar met een proefactie.
SCHERMEN = ["#/", "avond", "#/flessen", "#/marc", "#/beheer", "#/beheer/avond", "#/beheer/bestellingen"]


def inloggen(pagina):
    """De eerste login zoals een lid hem doet: code, 18 jaar, akkoord, en daarna de tip voor het beginscherm."""
    pagina.goto(pagina.adres + "/#/welkom")
    pagina.locator("#code").fill("123456")
    pagina.get_by_role("checkbox", name=re.compile("18 jaar", re.I)).click()
    pagina.get_by_role("checkbox", name=re.compile("akkoord", re.I)).click()
    pagina.get_by_role("button", name=re.compile("Kom binnen", re.I)).click()
    expect(pagina).to_have_url(re.compile(r"#/tip$"))
    pagina.locator(".onderkant .hoofdknop").click()
    expect(pagina).not_to_have_url(re.compile(r"#/(welkom|tip)$"))


def naar_de_avond(pagina):
    """Bestellen kan alleen tijdens de avond. De gouden voorbeeldbalk van het prototype springt erheen."""
    pagina.goto(pagina.adres + "/#/")
    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Spring naar de lopende avond", re.I)).click()
    expect(pagina.get_by_role("dialog")).to_have_count(0)


def meer_knop(pagina):
    """De plusknop van de eerste wijn die nog te koop is."""
    knop = pagina.get_by_role("button", name=re.compile(r"^Eén fles meer van wijn ")).first
    expect(knop).to_be_visible(timeout=15_000)
    return knop


def test_eerste_login(telefoon):
    """M1, M2, M5 en M6 op het eerste scherm dat een lid ziet."""
    telefoon.goto(telefoon.adres + "/#/welkom")
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    code = telefoon.locator("#code")
    # M6: geen inzoomen op een iPhone, het cijfertoetsenbord, en de code uit de mail invullen.
    assert code.evaluate("e => parseFloat(getComputedStyle(e).fontSize)") >= 16
    assert code.get_attribute("inputmode") == "numeric"
    assert code.get_attribute("autocomplete") == "one-time-code"
    inloggen(telefoon)


@pytest.mark.parametrize("scherm", SCHERMEN)
def test_elk_scherm(telefoon, scherm):
    """M1, M2 en M5: geen horizontaal scrollen, tikvlakken van 44 px, leesbare tekst."""
    inloggen(telefoon)
    if scherm == "avond":
        naar_de_avond(telefoon)
    else:
        telefoon.goto(telefoon.adres + "/" + scherm)
    telefoon.wait_for_timeout(300)
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_flessen_kiezen(telefoon):
    """M2: kiezen gaat met een min- en een plusknop; de rij met flessen is een tekening."""
    inloggen(telefoon)
    naar_de_avond(telefoon)
    meer = meer_knop(telefoon)
    naam = meer.get_attribute("aria-label").removeprefix("Eén fles meer van ")
    keuze = telefoon.get_by_role("group", name=f"Aantal flessen van {naam}")
    meer.click()
    meer.click()
    meer.click()
    keuze.get_by_role("button", name=f"Eén fles minder van {naam}").click()
    expect(keuze).to_contain_text("2 GEKOZEN")
    expect(keuze.locator(".flessenrij")).to_have_attribute("aria-hidden", "true")
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def _naar_de_bon(pagina):
    inloggen(pagina)
    naar_de_avond(pagina)
    meer_knop(pagina).click()
    pagina.goto(pagina.adres + "/#/bestelling")
    expect(pagina.get_by_role("radiogroup", name="Afhaalpunt")).to_be_visible()


def test_bestellen(telefoon):
    """M10: zonder afhaalpunt geen bestelling, en dubbel tikken geeft één bestelling."""
    _naar_de_bon(telefoon)
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    bestel = telefoon.locator(".onderkant .hoofdknop")
    punten = telefoon.get_by_role("radiogroup", name="Afhaalpunt").get_by_role("radio")
    if telefoon.locator("[role=radio][aria-checked=true]").count() == 0:
        expect(bestel).to_be_disabled()
    punten.last.click()
    expect(bestel).to_be_enabled()
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    bestel.dblclick()
    expect(telefoon).to_have_url(re.compile(r"#/besteld/"))
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_dubbel_tikken_geeft_een_bestelling(gewone_telefoon):
    """M10: tel de bestellingen van het lid voor en na een dubbele tik."""
    pagina = gewone_telefoon
    _naar_de_bon(pagina)
    # De staat van het prototype staat in de opslag van het tabblad, onder een sleutel die met wijnclub begint.
    tel = """() => {
      const sleutel = Object.keys(sessionStorage).find((k) => k.startsWith('wijnclub'));
      return JSON.parse(sessionStorage.getItem(sleutel)).bestellingen.length;
    }"""
    voor = pagina.evaluate(tel)
    pagina.get_by_role("radiogroup", name="Afhaalpunt").get_by_role("radio").first.click()
    pagina.locator(".onderkant .hoofdknop").dblclick()
    expect(pagina).to_have_url(re.compile(r"#/besteld/"))
    assert pagina.evaluate(tel) == voor + 1


def test_bon_zonder_scrollen(gewone_telefoon):
    """M4 en M10: het afhaalpunt, het totaal en Bestel staan in beeld zonder te scrollen."""
    _naar_de_bon(gewone_telefoon)
    assert buiten_beeld(gewone_telefoon, "[role=radiogroup]", ".bon-totaal-rij", ".onderkant .hoofdknop") == []


def test_terugknop_sluit_paneel(telefoon):
    """M9: de terugknop van de telefoon sluit eerst een open paneel en laat het scherm staan."""
    inloggen(telefoon)
    telefoon.goto(telefoon.adres + "/#/marc")
    telefoon.get_by_role("button", name=re.compile("Voorwaarden", re.I)).click()
    paneel = telefoon.get_by_role("dialog")
    expect(paneel).to_be_visible()
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    telefoon.go_back()
    expect(paneel).to_have_count(0)
    expect(telefoon).to_have_url(re.compile(r"#/marc$"))
    # Het kruisje sluit het paneel ook, en laat geen lege stap achter in de geschiedenis.
    telefoon.get_by_role("button", name=re.compile("Voorwaarden", re.I)).click()
    paneel.get_by_role("button", name="Sluit").click()
    expect(paneel).to_have_count(0)
    telefoon.wait_for_function("() => !(history.state && history.state.blad)")
    telefoon.go_back()
    expect(telefoon).not_to_have_url(re.compile(r"#/marc$"))
