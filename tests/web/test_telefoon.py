"""De web-app op telefoonformaat, met de eisen uit hoofdstuk 10 van de bouwspecificatie.

Elke test draait op 375 x 667 en 320 x 568 px, behalve wat er zonder scrollen in beeld moet staan (M4):
dat geldt alleen op 375 x 667. Alle inhoud is voorbeeldinhoud van het prototype; er gaat niets naar de API.

De schermen veranderen nog. De tests leunen daarom op adressen, rollen en de vaste onderdelen
(hoofdknop, onderkant, panelen), en zo weinig mogelijk op de teksten van knoppen.
"""
import re
from pathlib import Path

import pytest
from playwright.sync_api import expect
from telefoon_metingen import buiten_beeld, geen_overtredingen, scherm_klopt

# Een echte foto om in het camerascherm te kiezen: een van de voorbeeldfoto's van het prototype.
FOTO = Path(__file__).resolve().parents[2] / "app" / "public" / "voorbeeld" / "candido.jpg"

# Schermen die zonder voorbereiding te openen zijn. Beheer staat in het prototype open voor iedereen.
# "avond" is het aanbod tijdens de lopende avond; dat zet de test klaar met een proefactie.
SCHERMEN = ["#/", "avond", "#/mijn-bestelling", "#/marc", "#/beheer", "#/beheer/nieuw", "#/beheer/afleveren", "#/beheer/namens"]


def inloggen(pagina, face_id=False):
    """De eerste login zoals een lid hem doet (design-v4): e-mailadres, de code, 18 of ouder, en Face ID of niet."""
    pagina.goto(pagina.adres + "/#/welkom")
    # Opnieuw laden: stond het inloggen al open op een latere stap, dan begint het weer bij het e-mailadres.
    pagina.reload()
    pagina.locator("#email").fill("lid-1@voorbeeld.nl")
    pagina.get_by_role("button", name=re.compile("Stuur mij een code", re.I)).click()
    pagina.locator("#code").fill("123456")
    pagina.get_by_role("button", name=re.compile("Ja, kom binnen", re.I)).click()
    if face_id:
        pagina.get_by_role("button", name=re.compile("Gebruik Face ID", re.I)).click()
    else:
        pagina.get_by_role("button", name=re.compile("Niet nu", re.I)).click()
    expect(pagina).not_to_have_url(re.compile(r"#/welkom$"))


def naar_de_avond(pagina):
    """Bestellen kan alleen tijdens de avond. De gouden voorbeeldbalk van het prototype springt erheen."""
    pagina.goto(pagina.adres + "/#/")
    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Spring naar de lopende avond", re.I)).click()
    expect(pagina.get_by_role("dialog")).to_have_count(0)


def meer_knop(pagina):
    """De plusknop van de eerste wijn die nog te koop is."""
    knop = pagina.get_by_role("button", name=re.compile(r"^Eén fles meer van ")).first
    expect(knop).to_be_visible(timeout=15_000)
    return knop


def test_eerste_login(telefoon):
    """M1, M2, M5 en M6 op de schermen van het inloggen."""
    telefoon.goto(telefoon.adres + "/#/welkom")
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    email = telefoon.locator("#email")
    assert email.evaluate("e => parseFloat(getComputedStyle(e).fontSize)") >= 16
    assert email.get_attribute("autocomplete") == "email"
    telefoon.get_by_role("button", name=re.compile("Stuur mij een code", re.I)).click()
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
    expect(pagina.get_by_role("radiogroup", name="Brengen of halen")).to_be_visible()


def _betaal(pagina, gelukt=True):
    """De betaalpagina van Mollie staat in het prototype in een paneel; daar kies je wat er gebeurt."""
    paneel = pagina.get_by_role("dialog")
    expect(paneel).to_be_visible()
    paneel.get_by_role("button", name=re.compile("lukt$" if gelukt else "mislukt", re.I)).click()
    expect(paneel).to_have_count(0)


def test_bestellen(telefoon):
    """M10: zonder brengen of halen geen bestelling; daarna meteen betalen, en de bon is betaald."""
    _naar_de_bon(telefoon)
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    betaal = telefoon.locator(".onderkant .hoofdknop")
    keuzes = telefoon.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio")
    if telefoon.locator("[role=radio][aria-checked=true]").count() == 0:
        expect(betaal).to_be_disabled()
    keuzes.last.click()
    expect(betaal).to_be_enabled()
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    betaal.dblclick()
    expect(telefoon).to_have_url(re.compile(r"#/bon/"))
    _betaal(telefoon)
    expect(telefoon.locator("h1")).to_contain_text(re.compile("Betaald", re.I))
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_niet_betaald_en_vervallen(gewone_telefoon):
    """Mislukt de betaling, dan houdt Marc de flessen vast tot de termijn. Daarna vervalt de bon en komt de voorraad terug."""
    pagina = gewone_telefoon
    _naar_de_bon(pagina)
    pagina.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()
    pagina.locator(".onderkant .hoofdknop").click()
    _betaal(pagina, gelukt=False)
    expect(pagina.locator("h1")).to_contain_text(re.compile("Niet betaald", re.I))
    expect(pagina.locator(".onderkant .hoofdknop")).to_contain_text(re.compile("opnieuw", re.I))
    # Zet de termijn in het verleden, zoals na 15 minuten; de klok van het prototype laat de bon dan vervallen.
    pagina.evaluate("""() => {
      const sleutel = Object.keys(sessionStorage).find((k) => k.startsWith('wijnclub'));
      const s = JSON.parse(sessionStorage.getItem(sleutel));
      for (const b of s.bestellingen) if (b.status === 'open' && b.lidId === 'lid-1') b.betaalVoor = '2000-01-01T00:00:00Z';
      sessionStorage.setItem(sleutel, JSON.stringify(s));
    }""")
    pagina.reload()
    expect(pagina.locator("h1")).to_contain_text(re.compile("Vervallen", re.I), timeout=5_000)


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
    pagina.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()
    pagina.locator(".onderkant .hoofdknop").dblclick()
    expect(pagina).to_have_url(re.compile(r"#/bon/"))
    assert pagina.evaluate(tel) == voor + 1


def test_bon_zonder_scrollen(gewone_telefoon):
    """M4 en M10: brengen of halen, het totaal en Betaal staan in beeld zonder te scrollen."""
    _naar_de_bon(gewone_telefoon)
    assert buiten_beeld(gewone_telefoon, "[role=radiogroup]", ".bon-totaal-rij", ".onderkant .hoofdknop") == []


# In het prototype loopt er altijd een veiling: de instelling "De veiling loopt altijd" in de voorbeeldbalk staat aan.
LOPENDE_VEILINGEN = """() => {
  const sleutel = Object.keys(sessionStorage).find((k) => k.startsWith('wijnclub'));
  return JSON.parse(sessionStorage.getItem(sleutel)).biedingen
    .filter((b) => b.biedingStatus === 'open' && b.geopend).map((b) => b.wijnId);
}"""


def test_bieden(telefoon):
    """Bieden kan zonder voorbereiding: een bod vraagt een bevestiging (M10) en daarna sta je bovenaan."""
    inloggen(telefoon)
    telefoon.goto(telefoon.adres + "/#/veiling/bieding-1")
    bied = telefoon.locator(".onderkant .hoofdknop")
    expect(bied).to_be_enabled()
    bied.click()
    paneel = telefoon.get_by_role("dialog")
    expect(paneel.get_by_role("radiogroup", name="Kies je bod")).to_be_visible()
    # M4: het gekozen bod, de melding dat het bindend is en Bevestig staan in beeld, ook op 320 x 568.
    bevestig = paneel.get_by_role("button", name=re.compile("^Bevestig", re.I))
    expect(bevestig).to_be_in_viewport(ratio=1)
    expect(paneel.locator(".trede.gekozen")).to_be_in_viewport(ratio=1)
    bevestig.click()
    expect(paneel).to_have_count(0)
    expect(bied).to_be_disabled()
    expect(bied).to_contain_text(re.compile("bovenaan", re.I))


def test_veiling_loopt_altijd(gewone_telefoon):
    """Voor het testen: er loopt altijd precies één veiling, en na de hamer begint er een nieuwe."""
    pagina = gewone_telefoon
    inloggen(pagina)
    assert pagina.evaluate(LOPENDE_VEILINGEN) == ["bieding-1"]
    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Laat de hamer vallen", re.I)).click()
    pagina.wait_for_function(f"() => {{ const nu = ({LOPENDE_VEILINGEN})(); return nu.length === 1 && nu[0] !== 'bieding-1'; }}")
    # De afgelopen ronde blijft staan, en vanaf het aanbod is de nieuwe te bereiken.
    nieuw = pagina.evaluate(LOPENDE_VEILINGEN)[0]
    pagina.goto(pagina.adres + "/#/veiling/" + nieuw)
    expect(pagina.locator(".onderkant .hoofdknop")).to_be_enabled()


def test_mijn_bestelling(telefoon):
    """Wat je bestelt staat onder Je bestellingen. Het oude adres van Mijn flessen komt daar ook uit."""
    _naar_de_bon(telefoon)
    telefoon.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()
    telefoon.locator(".onderkant .hoofdknop").click()
    _betaal(telefoon)
    telefoon.goto(telefoon.adres + "/#/flessen")
    expect(telefoon).to_have_url(re.compile(r"#/flessen$"))
    expect(telefoon.locator(".bon-rij")).to_have_count(1)
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    telefoon.locator(".bon-rij").click()
    expect(telefoon).to_have_url(re.compile(r"#/bon/"))


def test_terugkomen_met_face_id(gewone_telefoon):
    """Wie Face ID koos, komt de volgende keer met één tik binnen."""
    pagina = gewone_telefoon
    inloggen(pagina, face_id=True)
    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Kom later terug", re.I)).click()
    expect(pagina.locator("h1")).to_contain_text(re.compile("Welkom terug", re.I))
    assert geen_overtredingen(scherm_klopt(pagina)) == {}
    pagina.get_by_role("button", name=re.compile("^Kom binnen", re.I)).click()
    expect(pagina).not_to_have_url(re.compile(r"#/welkom$"))


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


def test_nieuwe_fles(telefoon):
    """Marc zet een fles klaar: foto, nakijken, lijst, klaar. Elke stap voldoet aan M1, M2 en M5."""
    telefoon.goto(telefoon.adres + "/#/beheer/nieuw")
    # De sluiter is een bestandsveld dat op een telefoon de camera aan de achterkant opent.
    sluiter = telefoon.get_by_label("Maak de foto")
    expect(sluiter).to_have_attribute("capture", "environment")
    expect(sluiter).to_have_attribute("accept", "image/*")
    # Iets anders dan een foto gaat niet door.
    sluiter.set_input_files({"name": "etiket.svg", "mimeType": "image/svg+xml", "buffer": b"<svg xmlns='http://www.w3.org/2000/svg'/>"})
    expect(telefoon.get_by_role("alert")).to_contain_text("JPEG")
    sluiter.set_input_files(FOTO)
    expect(telefoon.get_by_role("textbox", name="Naam")).to_have_value(re.compile("Soave", re.I))
    # De gemaakte foto staat op het nakijkscherm, niet de voorbeeldfoto.
    expect(telefoon.get_by_role("button", name="Maak de foto opnieuw").locator("img")).to_have_attribute("src", re.compile("^blob:"))
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    telefoon.get_by_role("button", name=re.compile("Klopt, verder", re.I)).click()
    expect(telefoon.get_by_role("radiogroup", name="Lijst of veiling")).to_be_visible()
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    telefoon.get_by_role("radio", name=re.compile("Veiling", re.I)).click()
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    telefoon.get_by_role("radio", name=re.compile("Lijst", re.I)).click()
    telefoon.get_by_role("button", name=re.compile("Zet klaar voor", re.I)).click()
    expect(telefoon.locator("h1")).to_contain_text(re.compile("Klaar", re.I))
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}
    # Zonder camera bij de hand kan het prototype verder met de voorbeeldfoto.
    telefoon.get_by_role("button", name=re.compile("Nog een fles", re.I)).click()
    telefoon.get_by_role("button", name="Gebruik de voorbeeldfoto").click()
    expect(telefoon.get_by_role("textbox", name="Naam")).to_have_value(re.compile("Soave", re.I))
