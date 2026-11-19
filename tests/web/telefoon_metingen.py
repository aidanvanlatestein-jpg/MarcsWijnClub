"""Metingen in de pagina voor de eisen uit hoofdstuk 10 van de bouwspecificatie.

Elke functie geeft een lijst met overtredingen terug, zodat een mislukte test zegt wat er mis is.
"""

# Wat je kunt aantikken. De gouden voorbeeldbalk telt niet mee: die bestaat alleen in het prototype.
_TIKVLAKKEN = """() => {
  const uit = [];
  const sel = 'button, a[href], input, textarea, select, [role=slider], [role=radio], [role=checkbox], label.foto-toevoegen';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('.voorbeeld')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (r.width < 44 || r.height < 44) {
      const naam = (el.getAttribute('aria-label') || el.innerText || el.className || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
      uit.push(`${naam}: ${Math.round(r.width)} x ${Math.round(r.height)} px`);
    }
  }
  return [...new Set(uit)];
}"""

# Contrast en tekstgrootte van alle zichtbare tekst. Versiering met aria-hidden telt niet mee.
# De spookwoorden in grote koppen (.spook) zijn een open punt in de bouwspecificatie en tellen
# daarom voorlopig ook niet mee.
_TEKST = """() => {
  const rgb = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const lum = (k) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(k.r) + 0.7152 * f(k.g) + 0.0722 * f(k.b);
  };
  const achtergrond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const k = rgb(getComputedStyle(e).backgroundColor);
      if (k.a > 0.9) return k;
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };
  const contrast = [], klein = [];
  const loper = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = loper.nextNode(); n; n = loper.nextNode()) {
    const tekst = n.textContent.trim();
    if (!tekst) continue;
    const el = n.parentElement;
    if (el.closest('.sr, [aria-hidden=true], .spook, .voorbeeld, .stippellijn')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Uitgeschakelde knoppen en keuzes zijn vrijgesteld, zoals in WCAG.
    if (el.closest('button:disabled, [aria-disabled=true]')) continue;
    // Doorzichtigheid mengt de tekstkleur met de achtergrond; reken met de kleur die je ziet.
    let dekking = rgb(cs.color).a;
    for (let e = el; e; e = e.parentElement) dekking *= parseFloat(getComputedStyle(e).opacity);
    const ag = achtergrond(el), vg = rgb(cs.color);
    const gezien = { r: ag.r + (vg.r - ag.r) * dekking, g: ag.g + (vg.g - ag.g) * dekking, b: ag.b + (vg.b - ag.b) * dekking };
    const lv = lum(gezien), la = lum(ag);
    const verhouding = (Math.max(lv, la) + 0.05) / (Math.min(lv, la) + 0.05);
    const fs = parseFloat(cs.fontSize);
    const nodig = fs >= 24 ? 3 : 4.5;
    const kort = tekst.slice(0, 30);
    if (verhouding < nodig) contrast.push(`"${kort}": ${verhouding.toFixed(1)}:1 bij ${fs}px`);
    // Lopende tekst minstens 16 px, een label in hoofdletters minstens 13 px.
    const hoofdletters = cs.textTransform === 'uppercase' || tekst === tekst.toUpperCase();
    if (fs < 13 || (fs < 16 && !hoofdletters)) klein.push(`"${kort}": ${fs}px`);
  }
  return { contrast: [...new Set(contrast)], klein: [...new Set(klein)] };
}"""

_VAK = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const onder = document.querySelector('.onderkant');
  const grens = onder && !el.closest('.onderkant') && !el.closest('.blad') ? onder.getBoundingClientRect().top : innerHeight;
  return { boven: r.top, onder: r.bottom, grens };
}"""


def horizontaal_scrollen(pagina):
    breed = pagina.evaluate("() => document.documentElement.scrollWidth - innerWidth")
    return [f"de pagina is {breed} px breder dan het scherm"] if breed > 0 else []


def kleine_tikvlakken(pagina):
    return pagina.evaluate(_TIKVLAKKEN)


def tekst(pagina):
    return pagina.evaluate(_TEKST)


def buiten_beeld(pagina, *selectors):
    """Selectors die niet volledig zichtbaar zijn boven de vaste onderkant, zonder te scrollen."""
    pagina.evaluate("() => window.scrollTo(0, 0)")
    uit = []
    for sel in selectors:
        vak = pagina.evaluate(_VAK, sel)
        if vak is None:
            uit.append(f"{sel}: niet gevonden")
        elif vak["boven"] < 0 or vak["onder"] > vak["grens"] + 0.5:
            uit.append(f"{sel}: {vak['boven']:.0f} tot {vak['onder']:.0f} px, zichtbaar tot {vak['grens']:.0f} px")
    return uit


def scherm_klopt(pagina):
    """M1, M2 en M5 voor het scherm dat nu open is."""
    t = tekst(pagina)
    return {
        "horizontaal scrollen (M1)": horizontaal_scrollen(pagina),
        "tikvlakken onder 44 px (M2)": kleine_tikvlakken(pagina),
        "te weinig contrast (M5)": t["contrast"],
        "te kleine tekst (M5)": t["klein"],
    }


def geen_overtredingen(overtredingen):
    return {eis: lijst for eis, lijst in overtredingen.items() if lijst}
