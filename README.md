# Marcs wijnclub

Een besloten web-app waarin leden van Marcs WhatsApp-groep wijn kopen: van de lijst tegen vaste prijs, of via een bieding op een bijzondere fles.

| Document | Inhoud |
| --- | --- |
| [pilotplan-marcs-wijnclub.md](pilotplan-marcs-wijnclub.md) | Wat er komt, voor wie, planning en succescriteria |
| [docs/bouwspecificatie.md](docs/bouwspecificatie.md) | Hoe het in elkaar zit: tabellen, levensloop van een bestelling, API, indeling |
| [wijnclub-prototype.html](wijnclub-prototype.html) | Klikbaar prototype van alle schermen. Open het in een browser |

## Wat er staat

| Map | Inhoud |
| --- | --- |
| `functions/wijnclub/domein` | De regels voor geld, bestelling en bieding, zonder AWS |
| `functions/wijnclub/handlers` | Eén bestand per Lambda-functie. Nu alleen `GET /api/aanbod` |
| `infra` | De omgeving als code, in AWS CDK met Python: vier stacks |
| `app` | De web-app. Nu een lege pagina |
| `tests` | Tests voor de functies en voor de stacks |

Dit is de basis van week 3 uit het plan, plus de regels van week 5 en 6. Hoofdstuk 8 van de bouwspecificatie zegt wat er nog niet is.

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

De tests draaien lokaal en raken AWS niet. Ze controleren de regels voor bestellen en bieden, de eerste API-functie, en wat de vier stacks opleveren.

## De omgeving opbouwen zonder uit te rollen

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=naam@jouwdomein.nl
```

Dit maakt de sjablonen in `infra/cdk.out` en verandert niets in AWS.

## Voor de eerste uitrol

Uitrollen maakt echte onderdelen aan in AWS en kost geld. Regel eerst dit:

- [ ] Een eigen AWS-account voor de wijnclub, met een budgetalarm op € 20 per maand.
- [ ] De AWS CLI geïnstalleerd en ingelogd op dat account.
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

## Pipeline

De pipeline draait in GitHub Actions. De workflows staan in `.github/workflows`. Elke Action staat vast op een commit-hash.

| Workflow | Wanneer | Wat |
| --- | --- | --- |
| `controles.yml` | Vanuit de andere workflows | ruff, pip-audit en pytest; npm audit en het bouwen van de web-app; `cdk synth` voor test en productie. Raakt AWS niet |
| `pull-request.yml` | Elke pull request naar `main` | De controles, en `cdk diff` tegen productie in de samenvatting. Een pull request uit een fork krijgt geen toegang tot AWS |
| `test.yml` | Elke push naar `main` | De controles, uitrol van `Wijnclub-test-*` en de rooktest uit `tests/smoke` |
| `productie.yml` | Elke tag die met `v` begint | De controles, jouw goedkeuring, uitrol van `Wijnclub-prod-*` en de rooktest. Bij een fout zet hij de vorige tag terug |
| `wekelijks.yml` | Maandag 06:00 UTC | De controles, voor nieuw bekende kwetsbaarheden |

GitHub logt via OIDC in op AWS met een tijdelijke rol. Er staan geen AWS-sleutels in GitHub. De rollen staan in de stack `Wijnclub-GitHub` (`infra/wijnclub_infra/github_stack.py`):

| Rol | Alleen vanuit | Mag |
| --- | --- | --- |
| `wijnclub-github-lezen` | Een pull request | De leesrol van CDK aannemen, voor `cdk diff` |
| `wijnclub-github-test` | De branch `main` | De uitrolrollen van CDK aannemen |
| `wijnclub-github-prod` | De GitHub-omgeving `productie` | De uitrolrollen van CDK aannemen |

Test en productie staan in hetzelfde account en delen de uitrolrollen van CDK. De scheiding zit dus in de voorwaarden van de rollen en in de beveiliging van de omgeving `productie`.

### Eenmalig instellen

Doe dit na de stappen onder "Voor de eerste uitrol".

1. Rol de stack met de rollen zelf uit; de pipeline doet dat nooit. Controleer eerst het account met `aws sts get-caller-identity`. Staat er in het account al een OIDC-koppeling met GitHub, dan faalt deze stap; meld het dan.

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
- **Vaste versies.** Elke afhankelijkheid staat op een exacte versie in `infra/requirements.txt` en `requirements-dev.txt`.
- **Bedragen in hele centen**, tijden als UTC-tekst.
- **Het lid komt uit het token**, nooit uit de aanvraag.
- **Fouten naar de web-app zijn algemeen.** Details staan alleen in het logboek, zonder persoonsgegevens.

## Bekende punten

- CDK waarschuwt dat Node.js 26 nog niet getest is. De ondersteunde versies zijn 22 en 24. Synthese en tests werken op 26.
- Op Python 3.9 installeert `requirements-dev.txt` oudere versies van pytest en boto3 met bekende kwetsbaarheden. Die draaien alleen lokaal. Met Python 3.10 of hoger krijg je de actuele versies.
