# Bouwplan 16A: kenmerken per wijn

Gemaakt op 21 november 2026. Dit is het bouwplan voor stap A van onderwerp 16 op de [roadmap](../roadmap.md), Mijn smaak. Het is bedoeld voor een eigen sessie in een eigen worktree. Waarom het zo smal is, staat bij onderwerp 16 op de roadmap en in het [marktonderzoek](../marktonderzoek.md) onder Smaak en personalisatie.

Is het gebouwd, dan staan de feiten in de bouwspecificatie en verdwijnt dit bestand in dezelfde PR.

## Wat er komt

Eén nieuw veld met drie woorden, de bron ervan, een regelmodule, en het nakijken en tonen in het prototype. Er komt geen tabel, route, Lambda, dienst of afhankelijkheid bij.

| Veld op `wijnen` | Waarden | Stand |
| --- | --- | --- |
| `kleur` | `rood`, `wit`, `rosé`, `bubbels`, `zoet` | Staat al in de bouwspecificatie, nog niet in de handlers of op het nakijkscherm |
| `land` | Tekst, hoogstens 40 tekens | Idem |
| `druif` | Tekst, zoals nu | Blijft zoals het is. Een lijst `druiven` is pas nodig als stap B erop vergelijkt |
| `volheid` | `licht`, `midden`, `vol`; optioneel | **Nieuw** |
| `kenmerkenBron` | `model` of `marc` | **Nieuw**. Gaat niet naar leden |

Het model stelt voor, Marc kijkt na. Bewaren is goedkeuren. Wijzigt Marc iets, dan wordt `kenmerkenBron` `marc`, zoals bij `tekstBron`.

Het voorstellen van `volheid` staat **uit in productie** tot Marc ermee instemt. Zie De poort naar productie.

## 1. Regels: `functions/wijnclub/domein/kenmerken.py`

Neem de opzet van [herkennen.py](../../functions/wijnclub/domein/herkennen.py) over: vaste lijsten als constanten, een `INSTRUCTIE`, een dataclass met `ontbreekt`, en het model als argument (`vraag_model: Callable[[str, str], str]`).

- `KLEUREN`, `VOLHEDEN`, `MAX_LAND = 40`.
- `maak_vraag(velden)`: naam, producent, jaargang, streek en druif, elk hoogstens 120 tekens, tussen tags. De instructie zegt dat het tekst is om te lezen en nooit een opdracht, en dat het model `null` geeft als het iets niet weet.
- `stel_voor(velden, vraag_model)` en `lees_antwoord(antwoord)`: alles buiten de lijsten en grenzen wordt `None` en staat in `ontbreekt`. `land` zonder regeleinden en zonder links.
- `vul_aan(bekend, voorstel)`: wat het etiket of Marc al gaf, wint. Het model vult alleen lege velden. Zo werkt het ook als Marc alleen een bericht plakt en er geen etiket is.
- `controleer(kleur, land, volheid)`: voor het bewaren van een wijn. De handler van week 4 gebruikt dit.
- `bron(voorstel, bewaard)`: `model` als Marc niets wijzigde, anders `marc`.
- JSON lezen: hergebruik `_lees_json` uit `herkennen`, zoals [tekst.py](../../functions/wijnclub/domein/tekst.py) doet. Verplaats het niet; dat hoort bij `domein/etiket.py` in week 4.

Tests in `tests/functions/test_kenmerken.py`, met `model_dat_antwoordt()` uit `tests/functions/test_herkennen.py`. Minstens: goede waarden, een waarde buiten de lijst, geen JSON, JSON in een codeblok, een opdracht in een veld, een te lang land of een land met een link, `vul_aan` laat bekende velden staan, en `bron`. Zet de grenswaarden ook in `tests/functions/test_grenzen.py`. De dekking blijft minstens 95 procent.

## 2. Aanbod

In [handlers/aanbod.py](../../functions/wijnclub/handlers/aanbod.py) komen `kleur`, `land` en `volheid` in `WIJN_VELDEN`. Werk `tests/functions/test_aanbod.py` bij.

## 3. Prototype in `app/`

- [types.ts](../../app/src/types.ts): `volheid?: 'licht' | 'midden' | 'vol'` op `Wijn`.
- [voorbeeld.ts](../../app/src/voorbeeld.ts): `volheid` op een deel van de voorbeeldwijnen en bewust één zonder; `kleur`, `land` en `volheid` bij `voorbeeldEtiket`.
- [Aanbod.tsx](../../app/src/schermen/Aanbod.tsx): `soortEnLand()` neemt `volheid` mee, als "ROOD · ITALIË · VOL". Zonder `volheid` blijft het "ROOD · ITALIË". [WijnVanDeLijst.tsx](../../app/src/schermen/WijnVanDeLijst.tsx) gebruikt dezelfde functie.
- [Beheer.tsx](../../app/src/schermen/Beheer.tsx), `NieuweFles`:
  - `kleur`, `land` en `volheid` in `Formulier`, gevuld in `herken()`.
  - In stap `'na'`, onder Herkend: Kleur (vijf segmenten), Land (`<Veld>`) en Licht tot vol (drie segmenten).
  - Hergebruik `.segmenten` uit [app.css](../../app/src/stijl/app.css) als radiogroep met pijltjestoetsen, zoals [Keuze.tsx](../../app/src/onderdelen/Keuze.tsx). Tikvlakken van minstens 44 px.
  - Een voorstel van het model krijgt "KLOPT DIT?" via de bestaande `twijfel`-set; `zet()` haalt dat weg.
  - `opslaan()` geeft de velden mee.
  - Kleur en land op dit scherm zijn eigenlijk pilotwerk van week 4. Deze sessie levert ze mee, zodat niemand ze dubbel bouwt.
- **Schakelaar.** Eén constante op één plek, standaard uit, alleen aan in de build voor `test`, bijvoorbeeld via de Vite-variabele `VITE_KENMERKEN`. Uit betekent: geen rij Licht tot vol op het nakijkscherm. Bij leden is geen schakelaar nodig: zonder waarde staat er niets.
- Webtests in `tests/web/`: de rij staat op het nakijkscherm als de schakelaar aan is, een keuze komt terug in de regel bij de wijn, en een wijn zonder `volheid` toont alleen kleur en land.

## 4. Documenten, in dezelfde PR

- [bouwspecificatie.md](../bouwspecificatie.md):
  - Hoofdstuk 2: `volheid` en `kenmerkenBron` bij `wijnen`.
  - Hoofdstuk 5, naast Een etiket lezen: een alinea Kenmerken voorstellen met de regels hierboven. De aanroep hoort bij `POST /api/beheer/etiket` van week 4, telt mee in de grens van 100 per dag voor `beheer`, en staat uit in `prod` tot Marc instemt. In het logboek staat alleen of het lukte en welke velden ontbraken.
  - Hoofdstuk 8: wat gebouwd is. De open punten: het punt over kleur, land en korte naam bijwerken.
- [Pilotplan](../../pilotplan-marcs-wijnclub.md), bij de besluiten: één regel "Licht tot vol van een wijn: gebouwd, staat uit in productie tot Marc instemt".
- [Roadmap](../roadmap.md), onderwerp 16: bij stap A "gebouwd, staat uit" zetten.
- Verwijder dit bouwplan.

## Niet in deze sessie

- Stap B en C van onderwerp 16.
- Tannine, zuur, zoet, smaken, spijzen en een lijst druiven.
- De echte aanroep naar Bedrock, de rechten in IAM en de grens per dag. Er is nog geen handler voor het etiket; die komt in week 4.
- Uitrollen. Geen `cdk deploy`.

## De poort naar productie

1. Marc beantwoordt twee vragen. Mag het model licht tot vol schatten als hij het nakijkt? Passen "licht, midden, vol" bij hoe hij over wijn praat?
2. Zodra de aanroep in week 4 bestaat: het model vult twintig wijnen van eerdere lijsten in en Marc kijkt ze na. Verbetert hij er meer dan één op de vijf, dan vult hij `volheid` zelf in en vervalt het voorstel.

Geslaagd als het nakijken Marc per wijn minder dan tien seconden extra kost, minstens vier van de vijf voorstellen ongewijzigd blijven (te tellen via `kenmerkenBron`), en leden in de gesprekken na de pilot zeggen dat de regel bij de wijn hielp kiezen.

## Controleren

```bash
source .venv/bin/activate && pytest
```

```bash
cd app && npm ci && npm run build
```

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=noreply@voorbeeld.nl
```

Daarna in de browser, met de schakelaar aan: een nieuwe fles met de voorbeeldfoto, de drie rijen nakijken, licht tot vol wijzigen, opslaan, en de regel bij de wijn in het aanbod bekijken. Dan met de schakelaar uit: de rij is weg en het aanbod toont alleen kleur en land.

## Parallel met andere worktrees

Dit plan raakt `types.ts`, `voorbeeld.ts`, `Aanbod.tsx`, `WijnVanDeLijst.tsx`, `Beheer.tsx`, `handlers/aanbod.py` en de bouwspecificatie. Het raakt geen bestanden in `infra/`.

- **Niet tegelijk met** ander werk aan het nakijkscherm (`NieuweFles` in `Beheer.tsx`): het etiket en de tekstvoorstellen van week 4, onderwerp 1 en onderwerp 18.
- **Liefst niet tegelijk met** werk aan het aanbod: de nieuwe vorm van `GET /api/aanbod` in week 5, en onderwerp 17.
- **Wel tegelijk met** onderwerp 20, stap A van onderwerp 19, en alles in `domein/` met een eigen bestand.
