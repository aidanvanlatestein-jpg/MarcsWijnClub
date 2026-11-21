# Marcs wijnclub

## Waar dit over gaat

Een besloten web-app voor de wijnverkoop van Marc, een privéchef in Roermond (marckookt.com). Marc verkoopt nu wijn via een WhatsApp-groep van ongeveer 120 mensen. De app vervangt het bestellen in die groep door twee vormen:

- **De lijst:** wijnen tegen vaste prijs, op een avond die enkele uren duurt. Marc zet ze een voor een op tafel. Een lid bestelt meerdere wijnen in één keer, kiest brengen of halen en betaalt meteen met iDEAL.
- **De veiling** (in code: de bieding): één bijzondere fles aan het eind van de avond, het hoogste bod op de eindtijd wint.

Het doel is een pilot met 20 tot 30 leden. Het is geen marktplaats tussen leden en geen product voor andere verkopers.

## Dit is een privéproject

Dit project is van Aidan persoonlijk. Het heeft niets te maken met een werkgever of een klant van een werkgever.

- Gebruik geen accounts, e-mailadressen, organisaties, repositories of gegevens van een werkgever. Dat geldt ook voor Jira, Confluence, gedeelde schijven en interne vaardigheden of sjablonen.
- De code staat op Aidans persoonlijke GitHub-account, in `aidanvanlatestein-jpg/MarcsWijnClub`. De git-identiteit is alleen voor deze repository ingesteld, met een noreply-adres. Stel geen identiteit in voor de hele machine.
- **De repository is openbaar.** Alles wat je vastlegt, is voor iedereen zichtbaar en blijft in de geschiedenis staan. Marc heeft ingestemd met het openbaar maken van het plan en het prototype.
- AWS draait in een privé-account van Aidan dat hij deelt met zijn eigen andere projecten. Test en productie staan er samen in. Raak niets aan wat niet bij de wijnclub hoort: alleen stacks en onderdelen die met `Wijnclub-` of `wijnclub-` beginnen. Laat de CDK-bootstrap en de OIDC-koppelingen van andere projecten met rust. Zie "Een gedeeld account" in de README.
- De beveiligingsregels die op deze machine gelden, blijven van kracht. Bedrijfseigen voorzieningen zijn hier niet beschikbaar; dit project gebruikt de beheerde diensten van AWS: Cognito voor inloggen en Secrets Manager voor sleutels.

## Marc en zijn leden zijn echte mensen

- Marc is een echte persoon met een echt bedrijf. Leg hem geen woorden in de mond: voorbeeldteksten in zijn stem zijn altijd als voorbeeld gemarkeerd, zoals in het prototype.
- Publiceer niets onder zijn naam of in zijn huisstijl zonder dat Aidan daar uitdrukkelijk om vraagt.
- Namen, telefoonnummers en adressen van leden komen nooit in de repository, in testgegevens of in logbestanden. Gebruik verzonnen leden, zoals `lid-1`.

## Waar alles staat

| Bestand of map | Inhoud |
| --- | --- |
| `pilotplan-marcs-wijnclub.md` | Het plan: begrippen, besluiten, scope, schermen, architectuur, CI/CD, planning, succescriteria. Begint met wat je leest om de app opnieuw te bouwen |
| `docs/bouwspecificatie.md` | Bouwniveau: tabellen en sleutels, levensloop van een avond en een bestelling, bieding, API. Hoofdstuk 8 zegt wat al gebouwd is |
| `docs/roadmap.md` | Wat er na de pilot kan komen, onderwerp 1 tot en met 20 |
| `docs/beveiliging.md` | Verbeterpunten uit de beveiligingsscan, A1 tot en met E10 |
| `docs/marktonderzoek.md` | Wie hetzelfde doet en wat dat betekent |
| `design-v4/` | Het ontwerp sinds 20 november 2026: `DESIGN.md` en de schermen. De specificatie van de schermen; wat V4 niet tekent, staat in `design-v3/` |
| `wijnclub-prototype.html` | Het eerste klikbare prototype, achterhaald. Het klikbare prototype is nu de web-app in `app/` |
| `functions/wijnclub/` | Lambda-functies in Python. `domein/` bevat de regels zonder AWS |
| `infra/` | AWS CDK in Python, vier stacks per omgeving (`test`, `prod`) |
| `app/` | De web-app: React met Vite. Bouwt naar `app/dist` |
| `tests/` | pytest, voor de functies en voor de stacks |

Lees het plan en de bouwspecificatie voordat je iets ontwerpt. Wijkt een wijziging ervan af, pas dan het document aan in dezelfde wijziging.

## Werken in dit project

```bash
source .venv/bin/activate
```

```bash
pytest
```

```bash
cd app && npm ci && npm run build
```

```bash
cd infra && npx aws-cdk@2.1149.0 synth -c afzender_email=noreply@voorbeeld.nl
```

- Draai de tests voordat je zegt dat iets werkt. `cdk synth` bouwt de sjablonen lokaal en verandert niets in AWS.
- **Rol nooit uit zonder uitdrukkelijke toestemming.** `cdk deploy`, `cdk bootstrap` en `cdk destroy` maken of verwijderen echte onderdelen en kosten geld. Noem eerst het actieve AWS-account en de omgeving, en wacht op een ja.
- Commit en push alleen als erom gevraagd wordt.
- **Auto-fix staat altijd aan.** Zet na elke push naar een branch met een PR, en na het openen van een PR, meteen Auto-fix aan voor die PR. Zo worden falende CI, conflicten en reviewcommentaar vanzelf opgepakt. Vraag hier niet eerst om toestemming.

## Afspraken in de code

- **Taal:** documenten, schermteksten en namen in het domein zijn Nederlands (`lid`, `lijst`, `wijn`, `bod`, `bestelling`), in de je-vorm voor leden.
- **Bedragen** zijn hele centen, nooit kommagetallen. **Tijden** zijn UTC-tekst, zoals `2026-11-19T15:40:00Z`.
- **Het lid komt uit het token**, nooit uit de aanvraag. Een lid ziet alleen zijn eigen gegevens.
- **Regels zonder AWS** staan in `functions/wijnclub/domein/` en hebben tests. De handlers voeren alleen uit.
- **Fouten naar de web-app zijn algemeen.** Details staan alleen in het logboek, zonder persoonsgegevens.
- **Geen geheimen in de code** of in omgevingsvariabelen. De sleutel van Mollie staat in Secrets Manager; in `test` is dat de testsleutel.
- **Vaste versies** voor elke afhankelijkheid. Meld bekende kwetsbaarheden bij een nieuw pakket.
- **Inloggen wordt niet zelf gebouwd.** Het loopt via Cognito, alleen op uitnodiging.
- **Er wordt nooit echt betaald tijdens bouwen en testen.** Gebruik de testmodus van Mollie.
