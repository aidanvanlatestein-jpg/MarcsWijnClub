"""Kleur, land en licht tot vol: nakijken bij een nieuwe fles, en de regel bij de wijn in het aanbod.

Licht tot vol staat achter een schakelaar (VITE_KENMERKEN, zie app/src/schakelaars.ts). Een gewone build heeft
hem uit; de tests lezen van de gebouwde app of hij aan staat en controleren dan wat bij die stand hoort. Met
de schakelaar aan bouwen en testen:

    cd app && VITE_KENMERKEN=aan npm run build && cd ..
    pytest tests/web/test_kenmerken.py

Alle inhoud is voorbeeldinhoud van het prototype.
"""
import re

from playwright.sync_api import expect
from telefoon_metingen import geen_overtredingen, scherm_klopt
from test_telefoon import inloggen, naar_de_avond

VOLHEID = re.compile(r" · (LICHT|MIDDEN|VOL)\b")


def schakelaar_aan(pagina):
    return pagina.locator(".app").get_attribute("data-kenmerken") == "aan"


def naar_het_nakijkscherm(pagina):
    pagina.goto(pagina.adres + "/#/beheer/nieuw")
    pagina.get_by_role("button", name="Gebruik de voorbeeldfoto").click()
    expect(pagina.get_by_role("textbox", name="Naam")).to_have_value(re.compile("Soave", re.I))


def veld(pagina, label):
    """Het vak op het nakijkscherm met dit label, met de radiogroep of het invoerveld erin."""
    return pagina.locator(".herkend .veld").filter(has=pagina.get_by_role("radiogroup", name=label))


def test_kleur_en_land_staan_op_het_nakijkscherm(telefoon):
    """Kleur en land zijn er altijd. Een voorstel van het model vraagt "Klopt dit?"; een keuze haalt dat weg."""
    naar_het_nakijkscherm(telefoon)
    kleur = telefoon.get_by_role("radiogroup", name="Kleur")
    expect(kleur.get_by_role("radio")).to_have_count(5)
    expect(kleur.get_by_role("radio", name="wit")).to_have_attribute("aria-checked", "true")
    expect(telefoon.get_by_role("textbox", name="Land")).to_have_value("Italië")
    expect(veld(telefoon, "Kleur")).to_contain_text(re.compile("Klopt dit", re.I))
    # De pijltjestoetsen werken zoals bij elke radiogroep.
    kleur.get_by_role("radio", name="wit").focus()
    telefoon.keyboard.press("ArrowRight")
    expect(kleur.get_by_role("radio", name="rosé")).to_have_attribute("aria-checked", "true")
    expect(kleur.get_by_role("radio", name="rosé")).to_be_focused()
    expect(veld(telefoon, "Kleur")).not_to_contain_text(re.compile("Klopt dit", re.I))
    kleur.get_by_role("radio", name="rood").click()
    expect(kleur.get_by_role("radio", name="rood")).to_have_attribute("aria-checked", "true")
    expect(kleur.get_by_role("radio", name="rosé")).to_have_attribute("aria-checked", "false")
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_licht_tot_vol_alleen_met_de_schakelaar(telefoon):
    naar_het_nakijkscherm(telefoon)
    rij = telefoon.get_by_role("radiogroup", name="Licht tot vol")
    if not schakelaar_aan(telefoon):
        expect(rij).to_have_count(0)
        return
    expect(rij.get_by_role("radio")).to_have_count(3)
    expect(rij.get_by_role("radio", name="licht")).to_have_attribute("aria-checked", "true")
    expect(veld(telefoon, "Licht tot vol")).to_contain_text(re.compile("Klopt dit", re.I))
    rij.get_by_role("radio", name="vol").click()
    expect(rij.get_by_role("radio", name="vol")).to_have_attribute("aria-checked", "true")
    expect(veld(telefoon, "Licht tot vol")).not_to_contain_text(re.compile("Klopt dit", re.I))
    assert geen_overtredingen(scherm_klopt(telefoon)) == {}


def test_een_keuze_komt_terug_in_de_regel_bij_de_wijn(gewone_telefoon):
    """Marc kiest vol, zet de fles klaar en op tafel; leden zien WIT · ITALIË · VOL, of zonder schakelaar WIT · ITALIË."""
    pagina = gewone_telefoon
    inloggen(pagina)
    naar_de_avond(pagina)
    naar_het_nakijkscherm(pagina)
    aan = schakelaar_aan(pagina)
    if aan:
        pagina.get_by_role("radiogroup", name="Licht tot vol").get_by_role("radio", name="vol").click()
    pagina.get_by_role("button", name=re.compile("Klopt, verder", re.I)).click()
    pagina.get_by_role("radio", name=re.compile("Lijst", re.I)).click()
    pagina.get_by_role("button", name=re.compile("Zet klaar voor", re.I)).click()
    expect(pagina.locator("h1")).to_contain_text(re.compile("Klaar", re.I))

    pagina.goto(pagina.adres + "/#/beheer")
    knop = pagina.get_by_role("button", name=re.compile(r"^Zet de .* op tafel$", re.I))
    for _ in range(10):
        if pagina.get_by_text("Alles staat op tafel.").count():
            break
        knop.click()
    expect(pagina.get_by_text("Alles staat op tafel.")).to_be_visible()

    pagina.goto(pagina.adres + "/#/")
    soave = pagina.locator("article.feed-wijn").filter(has_text=re.compile("Soave", re.I)).first
    verwacht = "WIT · ITALIË · VOL" if aan else "WIT · ITALIË"
    expect(soave).to_contain_text(verwacht)
    if not aan:
        assert not VOLHEID.search(soave.inner_text())


def test_een_wijn_zonder_volheid_toont_alleen_kleur_en_land(gewone_telefoon):
    pagina = gewone_telefoon
    inloggen(pagina)
    naar_de_avond(pagina)
    pagina.goto(pagina.adres + "/#/wijn/wijn-h")
    regel = pagina.locator(".herkomst-regel")
    expect(regel).to_have_text(re.compile(r"rood · Rhône, Frankrijk$", re.I))
    # De Cándido heeft wel een volheid, maar alleen met de schakelaar aan.
    pagina.goto(pagina.adres + "/#/wijn/wijn-i")
    regel = pagina.locator(".herkomst-regel")
    if schakelaar_aan(pagina):
        expect(regel).to_have_text(re.compile(r"Italië · vol$", re.I))
    else:
        expect(regel).to_have_text(re.compile(r"Puglia, Italië$", re.I))


def test_in_het_aanbod_toont_een_wijn_zonder_volheid_alleen_kleur_en_land(gewone_telefoon):
    pagina = gewone_telefoon
    inloggen(pagina)
    naar_de_avond(pagina)
    janasse = pagina.locator("article.feed-wijn").filter(has_text=re.compile("Janasse", re.I)).first
    expect(janasse).to_contain_text("ROOD · FRANKRIJK")
    assert not re.search(r"FRANKRIJK · (LICHT|MIDDEN|VOL)", janasse.inner_text())
