"""Doet de web-app het juiste? De uitkomsten van bestellen, betalen en bieden, zoals een lid ze ziet.

test_telefoon.py meet of een scherm op een telefoon past. Dit bestand controleert wat erop staat: het
totaal op de bon, de voorraad die daalt en terugkomt, het bod in de stand. De tests lezen de bedragen
van het scherm en rekenen ze na; ze kennen de voorbeeldwijnen en hun prijzen niet.

Alle inhoud is voorbeeldinhoud van het prototype; er gaat niets naar de API. Komt de API erachter, dan
blijven deze controles gelden: het scherm moet dezelfde bedragen en aantallen tonen.
"""
import re

import pytest
from playwright.sync_api import expect
from telefoon_metingen import buiten_beeld, centen, geen_overtredingen, onderkant_te_hoog, scherm_klopt
from test_telefoon import _betaal, inloggen, naar_de_avond

VEILING = "/#/veiling/bieding-1"


def kaarten(pagina):
    """De wijnen in het aanbod waarvan nog flessen te kiezen zijn."""
    lijst = pagina.locator("article.feed-wijn").filter(has=pagina.locator("button.stap-knop.meer:enabled"))
    expect(lijst.first).to_be_visible(timeout=15_000)
    return lijst


def kaart(pagina, naam):
    return pagina.locator(f'article.feed-wijn[aria-label="{naam}"]')


def over(kaart_):
    """Hoeveel flessen er volgens de kaart nog zijn, zonder wat je zelf koos."""
    status = kaart_.locator(".rij-status").inner_text()
    gevonden = re.search(r"(\d+)\s+OVER", status)
    return int(gevonden.group(1)) if gevonden else 0


def kies(pagina, kaart_, aantal):
    """Tikt op de plusknop en geeft terug wat de kaart over de wijn zegt: naam, prijs en wat er was."""
    naam = kaart_.get_attribute("aria-label")
    prijs = centen(kaart_.locator(".prijs .getal").inner_text())
    was = over(kaart_)
    for _ in range(aantal):
        kaart_.locator("button.stap-knop.meer").click()
    expect(kaart_.locator(".rij-status")).to_contain_text(f"{aantal} GEKOZEN")
    assert over(kaart_) == was - aantal
    return {"naam": naam, "prijs": prijs, "was": was, "aantal": aantal}


def bon_regels(pagina):
    """De regels op de bon zoals ze er staan: aantal en bedrag per regel."""
    regels = []
    for regel in pagina.locator(".bon .bon-regel").all():
        regels.append({"aantal": int(regel.locator(".aantal").inner_text().rstrip("×")), "som": centen(regel.locator(".som").inner_text())})
    return regels


def naar_de_bon_met(pagina, aantallen):
    """Kiest van de eerste wijnen het gevraagde aantal en opent de bon."""
    inloggen(pagina)
    naar_de_avond(pagina)
    namen = [k.get_attribute("aria-label") for k in kaarten(pagina).all()][: len(aantallen)]
    assert len(namen) == len(aantallen), "te weinig wijnen op tafel voor deze test"
    gekozen = [kies(pagina, kaart(pagina, naam), aantal) for naam, aantal in zip(namen, aantallen)]
    pagina.goto(pagina.adres + "/#/bestelling")
    expect(pagina.get_by_role("radiogroup", name="Brengen of halen")).to_be_visible()
    return gekozen


def test_de_bon_telt_goed_en_de_voorraad_daalt(telefoon):
    """Twee wijnen, drie flessen: elke regel is aantal maal prijs, het totaal is de som, en na het betalen zijn de flessen weg."""
    gekozen = naar_de_bon_met(telefoon, [2, 1])
    verwacht = sum(g["aantal"] * g["prijs"] for g in gekozen)

    regels = bon_regels(telefoon)
    assert [r["aantal"] for r in regels] == [g["aantal"] for g in gekozen]
    assert [r["som"] for r in regels] == [g["aantal"] * g["prijs"] for g in gekozen]
    assert centen(telefoon.locator(".bon-totaal-rij .getal").inner_text()) == verwacht

    telefoon.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()
    telefoon.locator(".onderkant .hoofdknop").click()
    expect(telefoon).to_have_url(re.compile(r"#/bon/"))
    # Vóór het betalen noemt de knop het bedrag dat naar iDEAL gaat.
    paneel = telefoon.get_by_role("dialog")
    expect(paneel).to_be_visible()
    assert centen(telefoon.locator(".betaald-voet strong").inner_text()) == verwacht
    _betaal(telefoon)
    expect(telefoon.locator("h1")).to_contain_text(re.compile("Betaald", re.I))
    assert centen(telefoon.locator(".betaald-voet strong").inner_text()) == verwacht

    # Terug in het aanbod is het mandje leeg en is er van elke wijn precies zoveel minder.
    telefoon.goto(telefoon.adres + "/#/")
    for g in gekozen:
        k = kaart(telefoon, g["naam"])
        expect(k).to_be_visible()
        expect(k.locator(".rij-status")).not_to_contain_text("GEKOZEN")
        assert over(k) == g["was"] - g["aantal"], g["naam"]

    # Onder Je bestellingen staat één bon, met hetzelfde bedrag.
    telefoon.goto(telefoon.adres + "/#/mijn-bestelling")
    expect(telefoon.locator(".bon-rij")).to_have_count(1)
    assert centen(telefoon.locator(".bon-rij .bon-rij-tekst").inner_text().split("·")[1]) == verwacht


def test_vervallen_bon_geeft_de_flessen_terug(gewone_telefoon):
    """Wie niet betaalt, houdt de flessen vast tot de termijn. Daarna staan ze weer op tafel."""
    pagina = gewone_telefoon
    (g,) = naar_de_bon_met(pagina, [2])
    pagina.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()
    pagina.locator(".onderkant .hoofdknop").click()
    _betaal(pagina, gelukt=False)
    expect(pagina.locator("h1")).to_contain_text(re.compile("Niet betaald", re.I))

    pagina.goto(pagina.adres + "/#/")
    expect(kaart(pagina, g["naam"])).to_be_visible()
    assert over(kaart(pagina, g["naam"])) == g["was"] - 2, "de flessen horen vast te staan tot de termijn"

    # Zet de termijn in het verleden, zoals na 15 minuten; de klok van het prototype laat de bon dan vervallen.
    pagina.evaluate("""() => {
      const sleutel = Object.keys(sessionStorage).find((k) => k.startsWith('wijnclub'));
      const s = JSON.parse(sessionStorage.getItem(sleutel));
      for (const b of s.bestellingen) if (b.status === 'open' && b.lidId === 'lid-1') b.betaalVoor = '2000-01-01T00:00:00Z';
      sessionStorage.setItem(sleutel, JSON.stringify(s));
    }""")
    pagina.reload()
    expect(kaart(pagina, g["naam"]).locator(".rij-status")).to_contain_text(f"{g['was']} OVER", timeout=5_000)


def test_net_op_bestelt_niets(gewone_telefoon):
    """Koopt een ander lid de wijn op terwijl jij op de bon staat, dan is er niets besteld en niets betaald."""
    pagina = gewone_telefoon
    naar_de_bon_met(pagina, [1])
    pagina.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").first.click()

    # De proefactie koopt de wijn op die in het mandje ligt.
    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Een ander lid koopt de .* op", re.I)).click()
    expect(pagina.get_by_role("dialog")).to_have_count(0)
    pagina.goto(pagina.adres + "/#/bestelling")
    pagina.locator(".onderkant .hoofdknop").click()
    expect(pagina).to_have_url(re.compile(r"#/net-op$"))
    expect(pagina.locator("h1")).to_contain_text(re.compile("net op", re.I))
    expect(pagina.locator(".bon-regel.weg")).to_have_count(1)
    assert geen_overtredingen(scherm_klopt(pagina)) == {}

    pagina.goto(pagina.adres + "/#/mijn-bestelling")
    expect(pagina.locator(".bon-rij")).to_have_count(0)


def test_herladen_bewaart_mandje_en_keuze(telefoon):
    """M11: het mandje en brengen of halen blijven staan na herladen."""
    (g,) = naar_de_bon_met(telefoon, [2])
    keuze = telefoon.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").last
    keuze.click()
    expect(keuze).to_have_attribute("aria-checked", "true")

    telefoon.reload()
    expect(telefoon.get_by_role("radiogroup", name="Brengen of halen").get_by_role("radio").last).to_have_attribute("aria-checked", "true")
    assert bon_regels(telefoon) == [{"aantal": 2, "som": 2 * g["prijs"]}]

    telefoon.goto(telefoon.adres + "/#/")
    expect(kaart(telefoon, g["naam"]).locator(".rij-status")).to_contain_text("2 GEKOZEN")


def stand(pagina):
    """Het hoogste bod in de zaal. Het bedrag staat er in losse delen; het label erboven en de tijd ernaast tellen niet mee."""
    return centen(pagina.locator('section[aria-label="Stand van de veiling"] > div').first.inner_text().split("€")[-1])


def wacht_op_stand(pagina, klopt):
    """Het bedrag in de zaal telt op naar het nieuwe bod. Wacht tot het stilstaat op een bedrag dat klopt."""
    laatste = None
    for _ in range(50):
        laatste = stand(pagina)
        if klopt(laatste):
            return laatste
        pagina.wait_for_timeout(100)
    raise AssertionError(f"de stand blijft staan op {laatste} cent")


def test_het_bod_staat_in_de_stand(telefoon):
    """Het bedrag dat je bevestigt is het hoogste bod, en het volgende bod moet hoger. Dubbel tikken geeft één bod (M10)."""
    inloggen(telefoon)
    telefoon.goto(telefoon.adres + VEILING)
    bied = telefoon.locator(".onderkant .hoofdknop")
    expect(bied).to_be_enabled()
    # De biedingen in het log; een bericht van Marc of het openen van de veiling telt niet mee.
    log = telefoon.locator("ol.biedlog > li.biedlog-bod").filter(has=telefoon.locator(".wie:not(:empty)"), has_not_text="Marc opent")
    mijn = telefoon.locator("ol.biedlog > li.biedlog-bod.jij")
    biedingen_voor = log.count()

    bied.click()
    paneel = telefoon.get_by_role("dialog")
    bevestig = paneel.get_by_role("button", name=re.compile("^Bevestig", re.I))
    bod = centen(bevestig.inner_text())
    assert centen(paneel.locator(".trede.gekozen .bedrag-groot .getal").inner_text()) == bod
    bevestig.dblclick()
    expect(paneel).to_have_count(0)

    expect(bied).to_be_disabled()
    wacht_op_stand(telefoon, lambda nu: nu == bod)
    expect(mijn).to_have_count(1)
    expect(log).to_have_count(biedingen_voor + 1)
    assert centen(mijn.locator("strong").inner_text()) == bod

    # Wordt het lid overboden, dan staat het nieuwe bedrag in de stand en begint het volgende bod daarboven.
    telefoon.locator(".voorbeeld").click()
    telefoon.get_by_role("dialog").get_by_role("button", name=re.compile("Een ander lid biedt hoger", re.I)).click()
    expect(telefoon.get_by_role("dialog")).to_have_count(0)
    expect(bied).to_be_enabled()
    volgend = centen(bied.inner_text())
    assert volgend > bod
    # De stand telt op tot het bod van de ander en blijft onder het bod dat jij nu kunt doen.
    hoger = wacht_op_stand(telefoon, lambda nu: nu > bod)
    assert hoger < volgend


def test_gewonnen_fles_kost_het_hoogste_bod(gewone_telefoon):
    """Valt de hamer terwijl je bovenaan staat, dan vraagt de app precies jouw bod."""
    pagina = gewone_telefoon
    inloggen(pagina)
    pagina.goto(pagina.adres + VEILING)
    pagina.locator(".onderkant .hoofdknop").click()
    bevestig = pagina.get_by_role("dialog").get_by_role("button", name=re.compile("^Bevestig", re.I))
    bod = centen(bevestig.inner_text())
    bevestig.click()
    expect(pagina.get_by_role("dialog")).to_have_count(0)

    pagina.locator(".voorbeeld").click()
    pagina.get_by_role("dialog").get_by_role("button", name=re.compile("Laat de hamer vallen", re.I)).click()
    expect(pagina.get_by_role("dialog")).to_have_count(0)
    pagina.goto(pagina.adres + VEILING)
    betaal = pagina.get_by_role("button", name=re.compile("^Betaal", re.I))
    expect(betaal).to_be_visible()
    assert centen(betaal.inner_text()) == bod
    # De melding "je hebt gewonnen" bootst in het prototype een melding van de telefoon na; een tik haalt hem weg.
    pagina.evaluate("() => { const melding = document.querySelector('.push'); if (melding) melding.click(); }")
    expect(pagina.locator(".push")).to_have_count(0)
    assert geen_overtredingen(scherm_klopt(pagina)) == {}


def _wijnpagina(pagina):
    naar_de_avond(pagina)
    kaarten(pagina).first.locator("button.feed-naam").click()
    expect(pagina).to_have_url(re.compile(r"#/wijn/"))


def _zaal(pagina):
    pagina.goto(pagina.adres + VEILING)
    expect(pagina.locator(".onderkant .hoofdknop")).to_be_enabled()


def _fles(pagina):
    pagina.goto(pagina.adres + VEILING + "/fles")
    expect(pagina.locator('section[aria-label="Stand van de veiling"]')).to_be_visible()


def _biedpaneel(pagina):
    _zaal(pagina)
    pagina.locator(".onderkant .hoofdknop").click()
    expect(pagina.get_by_role("dialog").get_by_role("radiogroup", name="Kies je bod")).to_be_visible()


# Schermen die test_telefoon.py niet opent, elk met hoe je er komt.
MEER_SCHERMEN = {"wijnpagina": _wijnpagina, "veilingzaal": _zaal, "bijzondere fles": _fles, "biedpaneel": _biedpaneel}


@pytest.mark.parametrize("scherm", list(MEER_SCHERMEN))
def test_ook_deze_schermen(telefoon, scherm):
    """M1, M2, M5 en M6 op de schermen die een lid tijdens de avond en de veiling ziet."""
    inloggen(telefoon)
    MEER_SCHERMEN[scherm](telefoon)
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_onderkant_hoogstens_een_kwart(gewone_telefoon):
    """M3: op 375 x 667 neemt de vaste onderkant hoogstens een kwart van de hoogte in, ook met de bon erin."""
    pagina = gewone_telefoon
    inloggen(pagina)
    naar_de_avond(pagina)
    kies(pagina, kaarten(pagina).first, 1)
    assert onderkant_te_hoog(pagina) == [], "het aanbod met een gevuld mandje"
    pagina.goto(pagina.adres + "/#/bestelling")
    expect(pagina.get_by_role("radiogroup", name="Brengen of halen")).to_be_visible()
    assert onderkant_te_hoog(pagina) == [], "de bon"
    _zaal(pagina)
    assert onderkant_te_hoog(pagina) == [], "de veilingzaal"


def test_stand_van_de_veiling_zonder_scrollen(gewone_telefoon):
    """M4: op de bijzondere fles staan het hoogste bod en de eindtijd in beeld zonder te scrollen."""
    inloggen(gewone_telefoon)
    _fles(gewone_telefoon)
    assert buiten_beeld(gewone_telefoon, 'section[aria-label="Stand van de veiling"]') == []
