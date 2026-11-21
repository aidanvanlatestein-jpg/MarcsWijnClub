# Bouwplan: naden voor de koppeling met de API

Gemaakt op 21 november 2026. Dit plan legt twee naden aan voordat de web-app aan de echte API gaat hangen: één contract voor de vorm van de antwoorden, en één gegevensbron in de app waar de voorbeeldserver en later de API achter zitten. Het is bedoeld voor een eigen sessie in een eigen worktree.

Is het gebouwd, dan staan de feiten in de bouwspecificatie en verdwijnt dit bestand in dezelfde PR.

## Waarom

Het doel is features toevoegen zonder regressie. Het eerste deel van het vangnet is gebouwd:

- unit-tests voor de web-app (vitest);
- gedeelde regelgevallen in `tests/gedeeld/regels.json`;
- de transacties uitgevoerd tegen DynamoDB in het geheugen (`tests/integratie`);
- mypy;
- vaste sleutels voor elke tabel.

Zie hoofdstuk 8 van de [bouwspecificatie](../bouwspecificatie.md). Twee gaten blijven, en die worden groter zodra de koppeling begint:

1. **De vorm van de antwoorden is impliciet.** [types.ts](../../app/src/types.ts) is met de hand geschreven en noemt al velden die [handlers/aanbod.py](../../functions/wijnclub/handlers/aanbod.py) niet levert. Er is geen test die faalt als de app en een handler een andere vorm verwachten.
2. **De app heeft geen naad tussen scherm en gegevens.** [staat.tsx](../../app/src/staat.tsx) mengt drie dingen in één reducer:
   - wat de server zou doen: bestellen, betalen, bieden, verlopen, de hamer;
   - wat het scherm onthoudt: het mandje, de keuze voor brengen of halen, meldingen;
   - de proefacties van de voorbeeldbalk.

   Zonder naad betekent de koppeling dat alle schermen tegelijk veranderen, en dat de browsertests in `tests/web` hun voorbeeldmodus verliezen.

## Voorwaarde

Begin pas als het eerste deel van het vangnet op `main` staat. Dit plan bouwt voort op:

- `vitest`;
- `app/src/regels.ts` met de regels die ook in het domein staan;
- de export van `reducer` en `app/src/staat.test.ts`;
- `tests/integratie`.

## Wat er komt

| Onderdeel | Waar | Nieuw pakket |
| --- | --- | --- |
| Het contract: JSON Schema per aanvraag en antwoord | `contract/` | – |
| Het contract toetsen in Python | `tests/contract/` | `jsonschema` (alleen voor ontwikkeling) |
| Het contract toetsen in de app | `app/src/contract.test.ts` | `ajv` (alleen voor ontwikkeling) |
| De voorbeeldserver, los van de schermstaat | `app/src/voorbeeldserver.ts` | – |
| De gegevensbron met de voorbeelduitvoering | `app/src/bron.ts` | – |

Er komt geen tabel, route, Lambda of dienst bij, en er gaat niets naar AWS.

## 1. Het contract: `contract/`

Eén JSON Schema (draft 2020-12) per vorm, met de namen uit hoofdstuk 2 en 5 van de bouwspecificatie. Het contract wordt de precieze vorm; hoofdstuk 5 blijft de uitleg en verwijst ernaar.

- `fout.schema.json`: `{ "fout", "bericht" }`, met de foutcodes uit hoofdstuk 5 als `enum`. Extra velden alleen waar hoofdstuk 5 ze noemt: `wijnen` bij `uitverkocht`, en `minimaalVolgendBod` en `hoogstToegestaan` bij een geweigerd bod.
- `aanbod.schema.json`: het antwoord van `GET /api/aanbod` in de vorm uit hoofdstuk 5 (`avond`, `wijnen`, `veiling`, `feed`).
- De aanroepen van een lid die het prototype naspeelt:
  - `bestelling-aanvraag.schema.json` en `bestelling.schema.json` (`POST /api/bestellingen`, `GET /api/bestellingen/{id}`);
  - `bod-aanvraag.schema.json` (`POST /api/wijnen/{wijnId}/biedingen`);
  - `mijn-bestellingen.schema.json` (`GET /api/mijn/bestellingen`).
- Bedragen zijn `integer` met `minimum: 0`. Tijden zijn tekst met het patroon `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`. Objecten krijgen `additionalProperties: false`: een veld dat er niet hoort, faalt. Dat houdt ook velden als `hoogsteBieder` uit een antwoord.
- Schrijf alleen schema's voor aanroepen die het prototype gebruikt. De rest komt met de handler die hem bouwt.

### Toetsen in Python: `tests/contract/`

- Een hulpje `past(schema, inhoud)` in `tests/contract/conftest.py`. Het laadt het schema uit `contract/` en geeft bij een fout het pad naar het veld dat niet klopt.
- Elke `antwoord.fout(...)`-aanroep in de handlers geeft een antwoord dat bij `fout.schema.json` past. Toets de 401 en de 500 van [handlers/aanbod.py](../../functions/wijnclub/handlers/aanbod.py).
- Het antwoord 200 van `aanbod` past nog niet: de handler geeft de oude vorm (hoofdstuk 8). Zet die test op `pytest.mark.xfail(strict=True, reason="oude vorm, zie hoofdstuk 8")`. Bouwt iemand de nieuwe vorm, dan slaagt hij onverwacht, faalt hij door `strict`, en weet die persoon dat de markering weg moet.
- `openbaar()` in [domein/bieding.py](../../functions/wijnclub/domein/bieding.py) past bij het deel `veiling` van het aanbod, ook voor een wijn met `hoogsteBieder`.
- `jsonschema` vraagt Python 3.10 of hoger. Doe hetzelfde als bij `tests/integratie`: overslaan op 3.9, behalve als `WIJNCLUB_INTEGRATIE=verplicht` staat. Gebruik die variabele, zodat de pipeline er niets bij hoeft te zetten.

### Toetsen in de app: `app/src/contract.test.ts`

- `ajv` (versie 2020) laadt dezelfde schema's uit `../../contract/`.
- Elk antwoord van `voorbeeldBron` (stap 3) past bij zijn schema. Zo kan de voorbeeldserver niet ongemerkt een andere vorm geven dan de echte API zal geven.
- Elke fout die `voorbeeldBron` geeft, past bij `fout.schema.json`.

### Nieuwe pakketten

Kies de nieuwste versie die minstens twee weken oud is, zet hem exact vast, en draai `npm audit` en `pip-audit` voordat hij erin gaat. Stand op 21 november 2026:

| Pakket | Versie | Notitie |
| --- | --- | --- |
| `ajv` | 8.20.0 (24 april 2026) | Geen peer-eisen, vier kleine afhankelijkheden. Bekende kwetsbaarheid alleen in 6.x van vóór 6.12.3 |
| `jsonschema` | 4.26.0 (7 januari 2026) | PyPI meldt geen bekende kwetsbaarheden. Vraagt Python 3.10 of hoger |

**Niet gekozen:** `openapi-typescript` om typen uit een OpenAPI-bestand te maken.

- Het vraagt TypeScript 5 als peer; het project draait op 7.0.2.
- De laatste release is van februari 2026.

Met hetzelfde schema aan beide kanten valt een verschil ook zonder gegenereerde typen op: `types.ts` blijft met de hand geschreven, maar de antwoorden van de voorbeeldbron moeten bij het contract passen.

## 2. De voorbeeldserver: `app/src/voorbeeldserver.ts`

Haal uit `stap` in [staat.tsx](../../app/src/staat.tsx) wat de server zou doen. Zet het in pure functies op een `ServerStaat`: `lijst`, `biedingen`, `bestellingen`, `feed` en de tellers voor bonnummers en ids.

| Naar de voorbeeldserver | Blijft in `staat.tsx` | Blijft bij de proefacties van de voorbeeldbalk |
| --- | --- | --- |
| `bestel`, `betaal`, `bied`, `leveringBieding`, `herinner`, `tik` (verlopen, veiling openen, hamer) | `inloggen`, `uitloggen`, `mandje`, `pasMandjeAan`, `levering`, `melding` | `anderBiedt`, `anderKooptOp`, `springNaarAvond`, `laatsteMinuten`, `opnieuw`, `verbinding`, `instelling`, `marcTypt` |
| Wat Marc doet: `beginAvond`, `zetOpTafel`, `bericht`, `openVeiling`, `sluitLijst`, `sluitBieding`, `nieuweWijn`, `nieuweBieding`, `wijzigLijst`, `afgeleverd` | | |

- Elke functie geeft `{ staat, antwoord }` of `{ staat, fout }` terug, met de foutcodes uit hoofdstuk 5. Nu negeert de reducer een bestelling die niet kan stilzwijgend. Straks zegt de voorbeeldserver waarom:
  - bij bestellen `uitverkocht` met de wijnen, `niet_op_tafel`, `avond_dicht` of `levering_niet_aangeboden`;
  - bij een bod `bod_te_laag`, `bod_te_hoog`, `al_hoogste` of `bieding_gesloten`.
- De regels zelf blijven in [regels.ts](../../app/src/regels.ts). De voorbeeldserver gebruikt `betaalVoor`, `nieuweEindtijd`, `hoogsteToegestaneBod` en `totaal`, zodat de gedeelde regelgevallen blijven gelden.
- `staat.tsx` houdt een `ServerStaat` en een schermstaat. De proefacties werken rechtstreeks op de `ServerStaat`: ze spelen andere leden en Marc na.
- **Het bewijs dat er niets veranderde:** de gevallen in `app/src/staat.test.ts` gaan naar `app/src/voorbeeldserver.test.ts` zonder dat een verwachting verandert. Wat bij het scherm hoort (het mandje leegmaken, de melding "Je bon is vervallen"), blijft in `staat.test.ts`. De browsertests in `tests/web` slagen zonder wijziging.

## 3. De gegevensbron: `app/src/bron.ts`

```ts
export interface Bron {
  aanbod(): Promise<Aanbod>
  bestel(aanvraag: BestelAanvraag): Promise<Uitkomst<Bestelling>>
  startBetaling(bestellingId: string): Promise<Uitkomst<{ betaalUrl: string }>>
  bied(wijnId: string, bedrag: number): Promise<Uitkomst<void>>
  kiesLevering(bestellingId: string, levering: LeverSoort): Promise<Uitkomst<Bestelling>>
  mijnBestellingen(): Promise<Bestelling[]>
}

type Uitkomst<T> = { ok: true; waarde: T } | { ok: false; fout: Fout }
```

- De namen en vormen volgen het contract. Een `Promise` ook in de voorbeelduitvoering: de schermen moeten nu al wachten en een fout tonen, net als straks met de API.
- `voorbeeldBron` roept de voorbeeldserver aan en geeft de vorm uit het contract terug. Het nagebootste betalen houdt zijn eigen pagina zoals nu. `startBetaling` geeft een adres binnen de app terug.
- **Alleen bestellen en bieden gaan in deze sessie via de bron:**
  - [Bestelling.tsx](../../app/src/schermen/Bestelling.tsx) (`bestel`);
  - [Bieding.tsx](../../app/src/schermen/Bieding.tsx) (`bied`, `betaal`);
  - [Toestanden.tsx](../../app/src/schermen/Toestanden.tsx) (`betaal`, `leveringBieding`).

  Toon een fout van de bron met de bestaande melding, in de je-vorm. Een voorbeeld: is een wijn net op, dan zegt de melding dat, met welke wijn. [Beheer.tsx](../../app/src/schermen/Beheer.tsx) (`bestel` namens een lid) en het lezen van het aanbod volgen met de koppeling.
- **Kiezen welke bron:** één plek, standaard de voorbeeldbron. Een API-bron bestaat in deze sessie niet. Laat de keuze lezen of `config.json` een `api` heeft *en* een vlag die de API aanzet, zodat de uitgerolde test-site voorbeeldgegevens blijft tonen tot de koppeling klaar is.

## 4. Documenten, in dezelfde PR

- [bouwspecificatie.md](../bouwspecificatie.md):
  - **Hoofdstuk 5:** de precieze vorm van elk antwoord staat in `contract/`. Een nieuwe aanroep krijgt zijn schema in dezelfde PR als zijn handler.
  - **Hoofdstuk 7:** `contract/`, `tests/contract/`, `voorbeeldserver.ts` en `bron.ts` in de boom. `ajv` en `jsonschema` in de tabel Afhankelijkheden.
  - **Hoofdstuk 8:** wat gebouwd is. Haal de rij "Naden voor de koppeling" weg of zet hem op Gebouwd.
- [Pilotplan](../../pilotplan-marcs-wijnclub.md), onder Testen: een rij Contracttests. Elke handler en de voorbeeldbron worden getoetst tegen hetzelfde schema.
- [CLAUDE.md](../../CLAUDE.md), onder Afspraken in de code, een alinea **Een feature toevoegen**. Bij een feature horen, in dezelfde PR:
  - de regel in het document;
  - een domeintest;
  - een integratietest als er een transactie bij komt;
  - het schema in `contract/` als er een aanroep bij komt;
  - een browsertest voor wat een lid ziet.

  Raakt een feature bestellen, betalen of bieden, dan komt eerst de test van die stroom, dan de feature. Tabellen worden alleen uitgebreid, nooit van sleutel veranderd. Eén onderwerp per PR.
- Verwijder dit bouwplan.

## Niet in deze sessie

- De API-bron zelf: `fetch`, het token van Cognito meesturen, opnieuw proberen. Dat hoort bij de koppeling in week 4 en 5.
- De nieuwe vorm van `GET /api/aanbod` in de handler (week 5). De xfail-test hierboven wijst ernaar.
- Schema's voor de aanroepen onder `/api/beheer`.
- Echte gelijktijdigheid tegen de teststack, en Mollie in testmodus.
- De instellingen in GitHub: `main` beschermen (A2), de omgeving `productie` (A1), tags alleen vanaf `main` (A5). Die zet Aidan zelf.
- Uitrollen. Geen `cdk deploy`.

## Controleren

```bash
source .venv/bin/activate && ruff check . && pytest
```

```bash
cd app && npm ci && npm test && npm run build
```

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=noreply@voorbeeld.nl
```

Op Python 3.10 of hoger, zoals de pipeline:

```bash
mypy && WIJNCLUB_INTEGRATIE=verplicht pytest --cov=wijnclub --cov-fail-under=95
```

Bewijs daarna dat de naden werken. Elke wijziging hieronder moet een test laten falen; zet ze daarna terug:

| Tijdelijke wijziging | Moet laten falen |
| --- | --- |
| Een extra veld in een antwoord van `voorbeeldBron`, zoals `hoogsteBieder` in de veiling | `contract.test.ts` |
| Een veld dat ontbreekt | `contract.test.ts` |
| Een foutcode die niet in `fout.schema.json` staat | `contract.test.ts` |
| `openbaar()` in `domein/bieding.py` geeft `hoogsteBieder` mee | `tests/contract` |
| Een verwachting die verandert bij het verhuizen van een geval uit `staat.test.ts` | Geen; dan is het verhuizen fout |

Daarna in de browser, op telefoonformaat: bestel een wijn en laat een ander lid hem in de voorbeeldbalk opkopen. Bestel dan opnieuw: de melding zegt dat de wijn net op is. Bied onder het minimum via het biedpaneel: het paneel laat dat niet toe, en een bod dat de voorbeeldserver toch weigert, geeft een melding in plaats van niets.

## Parallel met andere worktrees

Dit plan raakt:

- `staat.tsx`, `types.ts`, `regels.ts`;
- `Bestelling.tsx`, `Bieding.tsx`, `Toestanden.tsx`;
- `tests/web` alleen als een selector moet meeveranderen;
- `handlers/aanbod.py` niet, de bouwspecificatie wel.

Het raakt geen bestanden in `infra/`.

- **Niet tegelijk met:**
  - [16A, kenmerken per wijn](16a-kenmerken-per-wijn.md) (`types.ts`, `voorbeeld.ts`);
  - ander werk aan bestellen, betalen of bieden in de app;
  - het begin van de koppeling in week 4 en 5. Dit plan gaat daaraan vooraf.
- **Wel tegelijk met:**
  - [1B, de API van Anthropic](1b-claude-api.md), dat `infra/`, de workflow en de functies voor het taalmodel raakt, maar niets in `app/`. Beide lezen `antwoord.py`; dit plan verandert het niet;
  - werk in `functions/wijnclub/domein/` met een eigen bestand;
  - onderwerp 20.
