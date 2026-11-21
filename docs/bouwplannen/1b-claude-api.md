# Bouwplan 1B: de API van Anthropic

Gemaakt op 21 november 2026. Dit is het bouwplan voor variant B van onderwerp 1 op de [roadmap](../roadmap.md): de route naar het taalmodel via de API van Anthropic. Aidan koos die variant op 21 november 2026; waarom, staat bij onderwerp 1. Het plan is bedoeld voor een eigen sessie in een eigen worktree.

Is het gebouwd, dan staan de feiten in de bouwspecificatie en verdwijnt dit bestand in dezelfde PR.

## Wat er komt

De route naar het model, en twee aanroepen die erop draaien: `POST /api/beheer/teksten` en `POST /api/beheer/herken`. De regels voor beide bestaan al en zijn getest, in [tekst.py](../../functions/wijnclub/domein/tekst.py) en [herkennen.py](../../functions/wijnclub/domein/herkennen.py). Er komen één pakket, één geheim, één Lambda-laag en één tabel bij.

Marc ziet na deze sessie nog niets nieuws. De aanroepen bestaan en zijn getest; de web-app gebruikt ze pas als hij aan de API gekoppeld wordt.

## 1. De laag met het pakket `anthropic`

- `functions/laag/requirements.txt` met `anthropic` op een vaste versie, en alle pakketten daaronder ook vast, met hashes.
- Kies de nieuwste versie die minstens twee weken oud is, zoals bij de web-app. Versie 2.12.0 is van 20 november 2026 en dus nog te vers. Het pakket vraagt Python 3.10 of hoger en is puur Python; een deel van wat eronder hangt niet. Meld bekende kwetsbaarheden van de gekozen versie.
- Bouw de laag voor ARM64 en Python 3.14 met `pip install --platform manylinux2014_aarch64 --python-version 3.14 --only-binary=:all: --target ...`. Zo is er geen Docker nodig.
- `pip-audit` in [controles.yml](../../.github/workflows/controles.yml) krijgt dit bestand erbij.

## 2. Het geheim

- `anthropic_geheim` in [config.py](../../infra/wijnclub_infra/config.py), naast `mollie_geheim`: `wijnclub/<omgeving>/anthropic-api-sleutel`. CDK verwijst alleen naar de naam.
- De functie krijgt de naam van het geheim als omgevingsvariabele, nooit de waarde.
- **Aidan doet dit zelf, niet de bouwsessie:** per omgeving een eigen werkruimte in de Console van Anthropic met een bestedingslimiet, een sleutel daarin, en die sleutel in Secrets Manager onder de naam hierboven.

## 3. `functions/wijnclub/model.py`

Eén functie met de vorm `(instructie, vraag) -> str`. De handlers geven haar als `vraag_model` mee aan `stel_voor()` en `herken()`.

- Leest de sleutel één keer per opstart van de functie.
- Importeert `anthropic` pas bij de eerste aanroep. Zo blijven de tests lokaal draaien op Python 3.9, waar het pakket niet op werkt.
- Roept `client.messages.create` aan met de instructie als `system`, de vraag als bericht en het schema via `output_config.format`. Tijdslimiet 20 seconden, hoogstens één herhaling.
- Het model komt uit een omgevingsvariabele en begint op `claude-haiku-5-5`.
- Weigert het model, stopt het op de tokengrens, of is de API niet bereikbaar, dan geeft de functie één eigen fout. De handler antwoordt dan `503` met `model_niet_beschikbaar` en "Vul zelf in". Vang de fouten van het pakket per soort af (limiet, status, verbinding), niet met één brede vangst.

## 4. Het schema

- `SCHEMA` als constante in `tekst.py` (`{"voorstellen": [...]}`) en in `herkennen.py` (de velden van `Herkend`).
- Het schema kent geen maximale lengte en geen maximaal aantal. Die grenzen blijven dus in `lees_antwoord`, dat de waarheid blijft. `_lees_json` en de instructies blijven zoals ze zijn.

## 5. De handlers

`handlers/teksten.py` en `handlers/herken.py`, naar het patroon van [aanbod.py](../../functions/wijnclub/handlers/aanbod.py):

1. `is_beheer()` uit [antwoord.py](../../functions/wijnclub/antwoord.py); anders `403` met `geen_toegang`.
2. De grens per dag; daarboven `429`.
3. De regels uit `domein/`, met `model.py` als `vraag_model`.

In het logboek staat alleen of het lukte, hoeveel voorstellen overbleven en welke velden ontbraken. Nooit de notitie, het bericht of het antwoord van het model.

## 6. De grens van 100 per dag

- Een nieuwe tabel `tellers` met sleutel `tellerId`, bijvoorbeeld `model#2026-11-21`, en een vervaltijd van een paar dagen.
- De handler telt met één voorwaardelijke `UpdateItem`. Boven de 100 volgt `429` en vult Marc zelf in.
- Herkennen, teksten en straks het etiket tellen samen, zoals de bouwspecificatie zegt.
- De regel zelf, de sleutel van de dag en de grens, staat in `domein/`, met tests.

## 7. De stack

- `_functie()` in [api_stack.py](../../infra/wijnclub_infra/api_stack.py) krijgt een optionele tijdslimiet en laag. De twee functies krijgen 30 seconden en de laag. De andere functies blijven op 10 seconden.
- Leesrecht op alleen het geheim van Anthropic en schrijfrecht op alleen `tellers`.
- `tellers` in [data_stack.py](../../infra/wijnclub_infra/data_stack.py), met de vervaltijd aan.
- Stacktests in `tests/infra/test_stacks.py`: precies één geheim per functie, geen rechten op Bedrock, beide routes vragen een token, en `tellers` heeft een vervaltijd.

## 8. Tests

- Handlertests met een nagebootst model: `model_dat_antwoordt()` uit `tests/functions/test_tekst.py` en `tests/functions/test_herkennen.py`. Minstens: geen beheer, de grens van 100, een goed antwoord, en een fout van het model.
- Tests voor `model.py` met een nagebootste client: een goed antwoord, een weigering, de tokengrens, een time-out en een ontbrekende sleutel.
- Zet de grens van 100 ook in `tests/functions/test_grenzen.py`. De dekking blijft minstens 95 procent.

## 9. De test met het echte model

- In `tests/model/`, overgeslagen zonder sleutel en op Python 3.9.
- Voor elk van Marcs zeven teksten in `VOORBEELDEN`: steekwoorden die uit die tekst zijn afgeleid, en het voorbeeld zelf even uit de instructie. Leg het voorstel daarna naast Marcs eigen tekst. Vul aan tot tien met verzonnen sets.
- Draai op Claude Haiku 5.5, Sonnet 5.5 en Opus 5.5. Tel per voorstel: weggevallen op een getal, het aantal woorden in `nieuw`, en aroma's of gerechten die uit een voorbeeld komen in plaats van uit de steekwoorden.
- De uitkomst gaat naar een lokaal bestand dat niet wordt vastgelegd.
- Het kost enkele centen. Draai het alleen na een ja van Aidan.

## 10. Documenten, in dezelfde PR

- [bouwspecificatie.md](../bouwspecificatie.md):
  - Hoofdstuk 2: de tabel `tellers`.
  - Hoofdstuk 5: `503` met `model_niet_beschikbaar`, het model in een omgevingsvariabele, en de grens per dag in `tellers`.
  - Hoofdstuk 7: de laag, en `anthropic` in de tabel met afhankelijkheden. Pas de zin "De Lambda-functies gebruiken alleen `boto3`" aan; "er is geen Docker nodig" blijft waar.
  - Hoofdstuk 8: wat gebouwd is.
- [Roadmap](../roadmap.md), onderwerp 1: bij variant B "gebouwd" zetten.
- Verwijder dit bouwplan.

## Niet in deze sessie

- Het etiket lezen. Dat vraagt uploads en `domein/etiket.py`, en volgt in week 4 op deze route.
- Variant C, feiten opzoeken.
- De web-app aan de API koppelen.
- Uitrollen. Geen `cdk deploy`.

## De poort naar productie

1. Aidan kiest het model op de uitkomst van stap 9. Valt Claude Haiku 5.5 tegen, dan Claude Sonnet 5.5.
2. Anthropic staat als verwerker in de privacyverklaring voordat `prod` een sleutel krijgt.

## Controleren

```bash
source .venv/bin/activate && pytest
```

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=noreply@voorbeeld.nl
```

Kijk in het sjabloon van de API-stack of de twee functies alleen het geheim van Anthropic mogen lezen en alleen in `tellers` mogen schrijven.

## Parallel met andere worktrees

Dit plan raakt `infra/` (`api_stack.py`, `data_stack.py`, `config.py`), `tests/infra/test_stacks.py`, de workflow, `tekst.py` en `herkennen.py`.

- **Niet tegelijk met** ander werk aan de stacks of de workflow.
- **Wel tegelijk met** [bouwplan 16A](16a-kenmerken-per-wijn.md), dat geen `infra/` raakt. Beide raken `herkennen.py` of de buurt ervan; de PR die als tweede komt, lost een kleine botsing op.
