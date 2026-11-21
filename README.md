# Marcs wijnclub

Een besloten web-app waarin leden van Marcs WhatsApp-groep wijn kopen op een avond bij Marc: van de lijst tegen vaste prijs, of in een veiling van een bijzondere fles.

| Document | Inhoud |
| --- | --- |
| [pilotplan-marcs-wijnclub.md](pilotplan-marcs-wijnclub.md) | Wat er komt, voor wie, de besluiten, planning en succescriteria. Begint met wat je leest om de app opnieuw te bouwen |
| [docs/bouwspecificatie.md](docs/bouwspecificatie.md) | Hoe het in elkaar zit: tabellen, levensloop van een avond en een bestelling, API, indeling |
| [docs/roadmap.md](docs/roadmap.md) | Wat er na de pilot kan komen |
| [docs/beveiliging.md](docs/beveiliging.md) | Verbeterpunten uit de beveiligingsscan van 20 november 2026 |
| [docs/marktonderzoek.md](docs/marktonderzoek.md) | Wie hetzelfde doet, van 19 november 2026 |
| [design-v4/DESIGN.md](design-v4/DESIGN.md) | Het ontwerp sinds 20 november 2026, met de schermen in `design-v4/schermen/`: de specificatie van de schermen. Wat V4 niet tekent, staat in `design-v3/` |
| [wijnclub-prototype.html](wijnclub-prototype.html) | Het eerste klikbare prototype, van vóór de ontwerpen. Achterhaald: het klikbare prototype is nu de web-app in `app/` |

## Wat er staat

| Map | Inhoud |
| --- | --- |
| `functions/wijnclub/domein` | De regels zonder AWS: geld, bestelling en levering, bieding, een bericht herkennen en tekstvoorstellen |
| `functions/wijnclub/handlers` | Eén bestand per Lambda-functie. Nu alleen `GET /api/aanbod` |
| `infra` | De omgeving als code, in AWS CDK met Python: vier stacks |
| `app` | De web-app. Nu een klikbaar prototype van de schermen uit `design-v4`, nog zonder koppeling met de API |
| `tests` | Tests voor de functies en voor de stacks |

Dit is de basis van week 3 uit het plan, plus het prototype en de regels voor herkennen en tekstvoorstellen van week 4, en de regels van week 5 en 6. Hoofdstuk 8 van de bouwspecificatie zegt wat er nog niet is.

## Beginnen

Je hebt Python en Node.js nodig. Python 3.14 is de versie die op Lambda draait.

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

```bash
pip install -r requirements-dev.txt
```

## Testen

```bash
pytest
```

De tests draaien lokaal en raken AWS niet. Ze controleren de regels voor bestellen en bieden, de eerste API-functie, en wat de vier stacks opleveren. De integratietests in `tests/integratie` voeren de transacties uit tegen DynamoDB in het geheugen (moto); die vragen Python 3.10 of hoger en slaan zich op 3.9 over. Op 3.10 of hoger controleert `mypy` ook de typen van de functies.

De web-app heeft eigen unit-tests (vitest), naast de code in `app/src`:

```bash
cd app && npm test
```

Een paar regels staan zowel in `functions/wijnclub/domein` als in `app/src/regels.ts`. De gevallen in `tests/gedeeld/regels.json` toetsen beide kanten; verandert zo'n regel, voeg dan eerst daar een geval toe.

De browsertests in `tests/web` lopen de web-app door op een telefoonscherm van 375 × 667 en 320 × 568 px, in Chromium en in WebKit, de motor van Safari op de iPhone. `test_telefoon.py` meet de eisen uit hoofdstuk 10 van de bouwspecificatie; `test_uitkomsten.py` controleert wat er op het scherm staat: het totaal op de bon, de voorraad en het bod. Ze testen de gebouwde app in `app/dist` en slaan zich over als die of een browser ontbreekt. Is `app/dist` ouder dan de broncode van de web-app, dan falen ze: bouw dan opnieuw. Eenmalig de browsers installeren:

```bash
playwright install chromium-headless-shell webkit
```

Daarna, na elke wijziging in de web-app:

```bash
cd app && npm run build && cd .. && pytest tests/web
```

Eén browser kiezen kan met `WIJNCLUB_BROWSERS=chromium`. De dekking van de functies meet je zoals de pipeline dat doet:

```bash
pytest --cov=wijnclub --cov-report=term-missing:skip-covered --cov-fail-under=95
```

## De omgeving opbouwen zonder uit te rollen

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=naam@jouwdomein.nl
```

Dit maakt de sjablonen in `infra/cdk.out` en verandert niets in AWS.

## Voor de eerste uitrol

Uitrollen maakt echte onderdelen aan in AWS en kost geld. Regel eerst dit:

- [ ] Een AWS-account voor de wijnclub. Dat mag een privé-account zijn dat je deelt met je eigen andere projecten; lees dan eerst "Een gedeeld account" hieronder. Test en productie staan er samen in. Zet tweestapsverificatie op de hoofdgebruiker en een budgetalarm van € 20 per maand. In een gedeeld account filter je dat alarm op de tag `project=wijnclub`, die elke stack van de wijnclub krijgt; activeer die tag eerst als kostentag onder Billing, Cost allocation tags.
- [ ] De AWS CLI geïnstalleerd en ingelogd op dat account, met het profiel `wijnclub`.
- [ ] Een geverifieerd afzenderadres of domein in Amazon SES, in dezelfde regio. Vraag ook toegang buiten de proefomgeving van SES aan; daarbinnen komt de inlogcode alleen aan op adressen die je zelf hebt geverifieerd.
- [ ] Het afzenderadres ingevuld bij `afzender_email` in `infra/cdk.json`.
- [ ] De regio gekozen bij `regio` in `infra/cdk.json`. Nu staat er Ierland (`eu-west-1`).

Controleer vóór elke uitrol op welk account je bent ingelogd:

```bash
aws sts get-caller-identity
```

Eenmalig per account en regio:

```bash
cd infra && npx aws-cdk@2.1149.0 bootstrap
```

De testomgeving uitrollen:

```bash
cd infra && npx aws-cdk@2.1149.0 deploy "Wijnclub-test-*" -c omgeving=test
```

Voor productie gebruik je `-c omgeving=prod`. Daar blijven tabellen en bestanden staan als je een stack verwijdert; in test verdwijnen ze.

### Een gedeeld account

De wijnclub draait in een privé-account dat ook andere eigen projecten bevat. Test en productie staan er samen in. Een eigen account per omgeving beschermt vooral tegen een tweede ontwikkelaar; die is er niet.

**Het risico, bewust genomen.** De pipeline rolt uit met de rollen van CDK, en CloudFormation voert daarbij uit met `AdministratorAccess`. Wie de pipeline in handen krijgt, via een overgenomen GitHub-account of een gekaapt pakket, kan dus alles in het account, ook in je andere projecten. Wat dat beperkt:

- Tweestapsverificatie of een passkey op het GitHub-account. Dat is de sleutel tot de pipeline.
- Elke Action staat vast op een commit-hash, en elke afhankelijkheid op een vaste versie.
- Pull requests uit een fork krijgen geen toegang tot AWS, en de rol voor pull requests leest alleen sjablonen.
- Alleen `main` rolt uit naar test, en alleen een tag `v*` met jouw goedkeuring naar productie.

**Afspraken in een gedeeld account.**

- Alles van de wijnclub begint met `Wijnclub-` (stacks) of `wijnclub-` (rollen en namen). Raak niets anders aan, ook niet bij opruimen.
- De CDK-bootstrap (`CDKToolkit`) geldt per account en regio. Staat er in de regio van de wijnclub al een bootstrap van een ander project, gebruik die dan en bootstrap niet opnieuw. Verwijder `CDKToolkit` nooit zolang een ander project hem gebruikt.
- Een account heeft maar één OIDC-koppeling met GitHub. Heeft een ander project er al een, dan faalt de uitrol van `Wijnclub-GitHub`; meld het dan, want dan moet de stack de bestaande koppeling gebruiken. Koppelingen met andere diensten staan er los van.
- Controleer vóór elke uitrol met `aws sts get-caller-identity --profile wijnclub` dat je in het goede account en de goede regio zit.

**Wanneer toch een eigen account.** Komen er een tweede ontwikkelaar, echte leden met betalingen in productie of andere mensen met toegang tot de pipeline bij, verhuis de wijnclub dan naar een eigen account. Een kleiner alternatief is een eigen bootstrap met een beperkt uitvoerbeleid (`cdk bootstrap --qualifier` met `--cloudformation-execution-policies`), zodat de pipeline alleen onderdelen van de wijnclub kan aanraken. Dat is nog niet gebouwd.

### Verhuizen naar een eigen account

Verhuis het liefst vóór de eerste uitrol naar productie. Er staan dan nog geen leden of bestellingen in, dus er hoeft niets mee.

1. Maak het nieuwe account aan, met het budgetalarm en de tweestapsverificatie van hierboven.
2. Laat het profiel `wijnclub` naar het nieuwe account wijzen en controleer dat met `aws sts get-caller-identity --profile wijnclub`. Geef het oude account een eigen profielnaam, zodat je ze niet verwisselt.
3. Verifieer het afzenderadres opnieuw in Amazon SES en vraag opnieuw toegang buiten de proefomgeving aan. Dat geldt per account.
4. Doe in het nieuwe account `cdk bootstrap` en volg daarna "Eenmalig instellen" onder Pipeline. Zet het nieuwe accountnummer in het geheim `AWS_ACCOUNT_ID` in GitHub.
5. Rol test uit en draai de rooktest. Het adres van CloudFront is nieuw.
6. Verwijder pas daarna in het oude account de stacks `Wijnclub-test-*`, met het profiel van het oude account. Verwijder `CDKToolkit` in die regio alleen als geen ander project hem gebruikt; de bucket met bouwbestanden blijft dan staan en leeg je zelf.

Sleutels in Secrets Manager, zoals die van Mollie en Anthropic, zet je in het nieuwe account opnieuw. Ze verhuizen niet mee.

## Pipeline

De pipeline draait in GitHub Actions. De workflows staan in `.github/workflows`. Elke Action staat vast op een commit-hash.

| Workflow | Wanneer | Wat |
| --- | --- | --- |
| `controles.yml` | Vanuit de andere workflows | ruff, pip-audit, mypy en pytest met de integratietests en de dekking van de functies (ondergrens 95%); npm audit, vitest en het bouwen van de web-app; de browsertests in Chromium en WebKit; `cdk synth` voor test en productie. Raakt AWS niet |
| `pull-request.yml` | Elke pull request naar `main` | De controles, en `cdk diff` tegen productie in de samenvatting. Een pull request uit een fork krijgt geen toegang tot AWS |
| `test.yml` | Elke push naar `main` | De controles, uitrol van `Wijnclub-test-*` en de rooktest uit `tests/smoke` |
| `productie.yml` | Elke tag die met `v` begint | De controles, jouw goedkeuring, uitrol van `Wijnclub-prod-*` en de rooktest. Bij een fout zet hij de vorige tag terug |
| `wekelijks.yml` | Maandag 06:00 UTC | De controles, voor nieuw bekende kwetsbaarheden |

GitHub logt via OIDC in op AWS met een tijdelijke rol. Er staan geen AWS-sleutels in GitHub. De rollen staan in de stack `Wijnclub-GitHub` (`infra/wijnclub_infra/github_stack.py`):

| Rol | Alleen vanuit | Mag |
| --- | --- | --- |
| `wijnclub-github-lezen` | Een pull request | Alleen de sjablonen van de stacks `Wijnclub-*` lezen, voor `cdk diff`. Geen gegevens uit tabellen, buckets of Cognito |
| `wijnclub-github-test` | De branch `main` | De uitrolrollen van CDK aannemen |
| `wijnclub-github-prod` | De GitHub-omgeving `productie` | De uitrolrollen van CDK aannemen |

De rol voor een pull request neemt de leesrol van CDK niet aan: die heeft `ReadOnlyAccess` op het hele account en kan daarmee ook de ledentabel lezen. De CLI meldt bij de diff dat hij de leesrol niet kan aannemen en gaat verder met de rol zelf. Dat is de bedoeling.

**Bekende beperking.** Test en productie staan in hetzelfde account en delen de uitrolrollen van CDK. De testrol kan daardoor in AWS hetzelfde als de productierol. De goedkeuring in de omgeving `productie` beschermt tegen een uitrol per ongeluk, niet tegen een commit op `main` die de workflow voor test aanpast. Met één ontwikkelaar is dat een bewuste keuze. Omdat het account gedeeld is, kan de pipeline via die rollen ook bij je andere projecten; zie "Een gedeeld account". De toegang tot de pipeline is het GitHub-account: zet daar tweestapsverificatie of een passkey op. Komt er een tweede ontwikkelaar bij, dan is een eigen account voor productie de volgende stap.

De rollen vergelijken het onderwerp (sub) van het token van GitHub. Deze repository gebruikt het onveranderlijke onderwerp, met de vaste ID's van eigenaar en repository; daarom staat `github_repo` in `infra/cdk.json` als `eigenaar@id/naam@id`. Een repository die later dezelfde naam krijgt, komt zo niet binnen. Het juiste voorvoegsel zie je met `gh api repos/<eigenaar>/<naam>/actions/oidc/customization/sub`. Klopt het niet, dan faalt de workflow met `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

Wijzigt `github_stack.py` of `github_repo`, dan rol je `Wijnclub-GitHub` zelf opnieuw uit; tot dan gelden de oude rechten.

### Eenmalig instellen

Doe dit na de stappen onder "Voor de eerste uitrol".

1. Rol de stack met de rollen zelf uit; de pipeline doet dat nooit. Controleer eerst met `aws sts get-caller-identity --profile wijnclub` dat je in het goede account zit: de rollen uit deze stack geven GitHub toegang tot alles in dat account, ook tot je andere projecten. Staat er in het account al een OIDC-koppeling met GitHub, dan faalt deze stap; meld het dan.

    ```bash
    cd infra && npx aws-cdk@2.1149.0 deploy Wijnclub-GitHub -c afzender_email=naam@jouwdomein.nl
    ```

2. Zet in GitHub onder Settings, Secrets and variables, Actions twee geheimen: `AWS_ACCOUNT_ID` en `AFZENDER_EMAIL`. De repository is openbaar, dus ook de logs; als geheim maskeert GitHub ze. Een andere regio dan Ierland zet je als variabele `AWS_REGIO`.
3. Maak onder Settings, Environments de omgeving `productie` aan. Zet jezelf bij Required reviewers, en beperk Deployment branches and tags tot tags met het patroon `v*`. Doe dit vóór de eerste tag: zonder die beveiliging kan elke workflow in de repository de productierol krijgen.

### Een release naar productie

```bash
git tag v2026.12.1
```

```bash
git push origin v2026.12.1
```

De workflow wacht daarna op jouw goedkeuring in GitHub.

## Afspraken

- **Geen geheimen in de code.** De sleutel van Mollie komt in AWS Secrets Manager onder `wijnclub/<omgeving>/mollie-api-sleutel`. Gebruik in test de testsleutel van Mollie.
- **De sleutel van Anthropic** komt in Secrets Manager onder `wijnclub/<omgeving>/anthropic-api-sleutel`, als platte tekst. Maak per omgeving een eigen werkruimte in de Console van Anthropic met een bestedingslimiet, en een sleutel in die werkruimte. Zonder geheim antwoorden `herken` en `teksten` met `503` en vult Marc zelf in. De test met het echte model (`tests/model/`) kost geld en draait alleen met `WIJNCLUB_ECHT_MODEL=ja` en `ANTHROPIC_API_KEY`, op Python 3.10 of hoger.
- **Vaste versies.** Elke afhankelijkheid staat op een exacte versie in `infra/requirements.txt` en `requirements-dev.txt`.
- **Bedragen in hele centen**, tijden als UTC-tekst.
- **Het lid komt uit het token**, nooit uit de aanvraag.
- **Fouten naar de web-app zijn algemeen.** Details staan alleen in het logboek, zonder persoonsgegevens.

## Bekende punten

- CDK waarschuwt dat Node.js 26 nog niet getest is. De ondersteunde versies zijn 22 en 24. Synthese en tests werken op 26.
- Op Python 3.9 installeert `requirements-dev.txt` oudere versies van pytest en boto3 met bekende kwetsbaarheden. Die draaien alleen lokaal. Met Python 3.10 of hoger krijg je de actuele versies.
