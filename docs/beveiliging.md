# Beveiliging: verbeterpunten uit de scan

Verhuisd uit het [pilotplan](../pilotplan-marcs-wijnclub.md) op 21 november 2026, waar het onderwerp 15 op de roadmap was. De nummers A1 tot en met E10 zijn gelijk gebleven. "Het plan" is het pilotplan: het beschrijft hoe het moet worden, deze lijst wat er nog niet zo staat. Groep A moet af vóór de eerste release-tag, groep B en E vóór de eerste uitnodiging aan een lid; zie week 8 in de planning van het plan.


Op 20 november 2026 zijn de repository, de instellingen van de repository in GitHub en de lokaal gebouwde sjablonen van de stacks nagelopen. Het AWS-account is op 20 november alleen-lezen gescand: de instellingen van het account, de bootstrap van CDK, de drie rollen voor GitHub en de teststack. De bevindingen staan in groep E. De sessie verliep halverwege; wat daardoor openstaat, staat onderaan.

In AWS bevestigd: de drie rollen voor GitHub vertrouwen precies de bedoelde plek en hebben alleen de bedoelde rechten, geen andere rol vertrouwt de koppeling met GitHub, de productierol is nog nooit gebruikt, de bucket is niet openbaar, de tabellen hebben herstel naar een tijdstip en geen eigen toegangsbeleid, er zijn geen IAM-gebruikers met toegangssleutels, en buiten `eu-west-1` staat er niets van de wijnclub.

Wat goed staat: geen geheimen of persoonsgegevens in de code of de geschiedenis, een noreply-adres als auteur, secret scanning met push-beveiliging aan, elke Action op een commit-hash, OIDC met het onveranderlijke onderwerp, een bucket die alleen CloudFront kan lezen, herstel naar een tijdstip op elke tabel, zelf aanmelden uit, `npm audit` zonder meldingen en `pip-audit` schoon op Python 3.14 in de pipeline.

## Groep A: vóór de eerste release-tag

| Nr | Punt | Wat te doen |
| --- | --- | --- |
| A1 | De GitHub-omgeving `productie` bestaat niet. De rol `wijnclub-github-prod` vertrouwt alleen op de naam van die omgeving. Zonder goedkeurder en zonder beperking tot tags krijgt elke workflow die de omgeving noemt de productierol | Maak de omgeving aan met jezelf als verplichte goedkeurder en alleen tags `v*`. Dit is stap 3 van "Eenmalig instellen" in de [README](../README.md) |
| A2 | `main` is niet beschermd en er zijn geen regels voor tags. Een push naar `main` rolt uit met rechten op het hele account | Een ruleset voor `main`: alleen via een pull request, de controles geslaagd, geen force-push en niet verwijderen. Een tweede ruleset voor tags `v*`: alleen jij maakt ze, en niet verplaatsen of verwijderen |
| A3 | Alle Actions zijn toegestaan en een commit-hash is niet verplicht. Een workflow van een externe bijdrager vraagt alleen de eerste keer om goedkeuring | Sta alleen `actions/*` en `aws-actions/*` toe, verplicht een commit-hash, en vraag goedkeuring voor elke externe bijdrager |
| A4 | De uitrolrollen van CDK zijn beheerder van het hele gedeelde account. Dat is een bewust risico, maar het maakt A1 tot en met A3 zwaarder | Een eigen bootstrap voor de wijnclub met een eigen kenmerk (qualifier) en een uitvoeringsbeleid of een grens (permissions boundary) die alleen `Wijnclub-*` en `wijnclub-*` toelaat. Of het eigen account uit de README |
| A5 | `productie.yml` controleert niet of de tag op `main` staat. Een tag op een losse commit gaat na goedkeuring naar productie | Een stap die stopt als de commit van de tag niet in `main` zit |
| A6 | De CDK-opdrachtregel komt bij elke run via `npx --yes aws-cdk@2.1149.0` binnen, zonder lockbestand; pip installeert zonder hashes. De versie staat vast, de inhoud en de onderliggende pakketten niet | Zet `aws-cdk` als ontwikkelpakket in een `package.json` met lockbestand en gebruik `npm ci`. Installeer Python-pakketten met `--require-hashes` |
| A7 | Het plan zegt dat de productiestack beëindigingsbeveiliging heeft. In `infra/` staat die nergens aan | `termination_protection` aan voor de stacks van productie en voor `Wijnclub-GitHub`, met een stacktest |

## Groep B: vóór de eerste uitnodiging aan een lid

| Nr | Punt | Wat te doen |
| --- | --- | --- |
| B1 | Inloggen met een wachtwoord staat in beide omgevingen aan als eerste factor (`auth_stack.py`). Het plan zegt dat het in productie uit staat | Zet het in productie uit. Laat Cognito dat niet toe, maak leden dan aan zonder wachtwoord, zet een streng wachtwoordbeleid en leg in een stacktest vast wat er geldt |
| B2 | De client van de user pool heeft de OAuth-stromen `implicit` en `code` aan. Dat is de standaard van CDK; de app gebruikt ze niet | `disable_o_auth=True` op de client, met een stacktest |
| B3 | De groep `beheer` logt in zonder tweede factor. Wie de mailbox van Marc of de bouwer heeft, heeft het beheer | Een passkey of een tweede factor voor de groep `beheer`, en een korter refresh-token voor beheer dan het jaar voor leden. Een passkey wacht op het eigen domein: zie [roadmap, onderwerp 22](roadmap.md) |
| B4 | De begrenzing van de API is één grens voor iedereen samen: 20 per seconde. Het plan belooft een grens per gebruiker. Eén lid of één script kan nu de API voor iedereen dichtzetten tijdens een bieding | Een grens per lid op bieden en bestellen, in de functie zelf. Een regel in AWS WAF op CloudFront die per IP-adres begrenst |
| B5 | De API is ook rechtstreeks bereikbaar op het adres van API Gateway, buiten CloudFront om. Het token blijft verplicht, maar headers en een latere WAF gelden daar niet | Met het eigen domein (onderwerp 13 op de [roadmap](roadmap.md)) het standaardadres uitzetten, of CloudFront een geheime header laten meesturen die de API controleert |
| B6 | Er is geen Content-Security-Policy. Het standaardbeleid `SECURITY_HEADERS` van CloudFront bevat die niet, en ook geen Permissions-Policy. Op `/api/*` staat geen headerbeleid | Een eigen headerbeleid met een CSP die alleen de eigen herkomst toelaat, ook op `/api/*`. Doe dit vóór het echte inloggen in de web-app komt |
| B7 | Zonder eigen domein geldt de ingestelde minimale TLS-versie niet: op het adres van CloudFront accepteert AWS ook TLS 1.0 | Vervalt met onderwerp 13 op de [roadmap](roadmap.md). Controleer daarna dat TLS 1.2 het minimum is |
| B8 | Er is geen toegangslogboek op de API en op CloudFront. Na een incident is niet te zien wie wat aanriep | Toegangslogboek op de stage van de API en standaardlogboek op CloudFront, met een bewaartermijn en zonder persoonsgegevens buiten het IP-adres |
| B9 | De alarmen uit week 7 gaan over betalen en sluiten, niet over misbruik | Alarmen op pieken in 401, 403 en 429, op mislukte inlogpogingen in Cognito, en een budgetalarm |

## Groep C: bij het bouwen van de volgende delen

| Nr | Punt | Wat te doen |
| --- | --- | --- |
| C1 | Het echte inloggen in de web-app (week 4 tot en met 7). De bibliotheken van Cognito bewaren tokens standaard in `localStorage`, waar elk script op de pagina bij kan | Kies bewust waar het refresh-token staat en leg het vast in de bouwspecificatie. Samen met B6 |
| C2 | De melding van Mollie is de enige route zonder token, en Mollie ondertekent hem niet | Vertrouw nooit de inhoud: haal de status op bij Mollie, verwerk dezelfde melding één keer, en geef de route een eigen, lage grens |
| C3 | Paden onder `/api/beheer` controleren de groep in de functie zelf. Eén vergeten controle zet een beheerroute open voor elk lid | Eén gedeelde controle die elke beheerfunctie als eerste aanroept, en per route een test dat een gewoon lid `403` krijgt |
| C4 | Uploads van foto's en spraak | Wat de bouwspecificatie al zegt, plus: het bestandstype controleren op inhoud en niet op naam, en serveren met `nosniff` en als bijlage waar het kan |
| C5 | `herkennen.py` haalt `<bericht>`-tags één keer weg. Een geneste tag, zoals `</beri</bericht>cht>`, blijft als geldige tag over. Het risico is laag: alleen Marc voert in, en elk veld wordt tegen het bericht gecontroleerd | Herhaal het weghalen tot er niets meer verandert, of vervang elke `<`. Met een test |
| C6 | De API van Anthropic (onderwerp 1 van de [roadmap](roadmap.md)) en Secrets Manager komen er nog bij | Per functie alleen het ene model en het ene geheim dat hij nodig heeft, met een stacktest op de rechten. Bij de API van Anthropic: een eigen sleutel per omgeving met een bestedingslimiet. De sleutels van Mollie en de rest van de app blijven in een regio in de EU; het model hoeft dat sinds 21 november 2026 niet |

## Groep D: zicht houden

| Nr | Punt | Wat te doen |
| --- | --- | --- |
| D1 | Dependabot staat uit: geen meldingen en geen updates. De Actions op een commit-hash blijven zo voor altijd op dezelfde versie | Meldingen aan, en een `dependabot.yml` voor pip, npm en GitHub Actions |
| D2 | Code scanning (CodeQL) is niet ingesteld. Voor een openbare repository is het gratis | De standaardinstelling aanzetten voor Python, TypeScript en de workflows |
| D3 | cdk-nag staat in het plan als "volgt" | Toevoegen aan de controles, met een korte lijst uitzonderingen en de reden erbij |
| D4 | Er is geen `SECURITY.md` en vertrouwelijk melden staat uit. De repository is openbaar | Vertrouwelijk melden aanzetten en in één alinea zeggen hoe iemand een lek meldt |
| D5 | Secret scanning zoekt alleen naar sleutels van bekende leveranciers | Ook de algemene patronen en de geldigheidscontrole aanzetten |
| D6 | De lokale `.venv` draait op Python 3.9.6. `pip-audit` meldt daar 15 bekende kwetsbaarheden, in pytest, urllib3, requests, filelock en msgpack. Ze draaien alleen lokaal | De lokale omgeving opnieuw aanmaken met Python 3.14 en de regels voor 3.9 uit `requirements-dev.txt` halen |

## Groep E: het AWS-account, vóór de eerste uitnodiging aan een lid

Het account is gedeeld. E2, E5 en E8 raken ook andere projecten: beoordeel ze, en verander daar niets vanuit de wijnclub.

| Nr | Punt | Wat te doen |
| --- | --- | --- |
| E1 | AWS meldt dat de hoofdgebruiker (root) geen tweestapsverificatie heeft. Toegangssleutels heeft hij niet. In een account dat lid is van een organisatie kan dit ook betekenen dat de hoofdgebruiker geen inloggegevens heeft | Nagaan welke van de twee het is. Heeft hij een wachtwoord, zet dan tweestapsverificatie aan. De README vraagt dit al |
| E2 | Er zijn zeven IAM-gebruikers, geen ervan met tweestapsverificatie. Eén heeft een wachtwoord voor de console, zes hebben niets om mee in te loggen | Tweestapsverificatie op de gebruiker met een wachtwoord, of hem vervangen door inloggen via Identity Center. Ongebruikte gebruikers opruimen |
| E3 | Er is geen CloudTrail-spoor, geen GuardDuty, geen Security Hub, geen Config en geen Access Analyzer. Alleen de standaardgeschiedenis van 90 dagen bestaat. Na een incident is niet te zien wat er in het account gebeurde | Een CloudTrail-spoor voor alle regio's naar een eigen bucket, met controle van de logbestanden. Access Analyzer voor toegang van buiten; dat is gratis. GuardDuty overwegen, dat kost geld |
| E4 | Er is geen budgetalarm, terwijl de README er een van € 20 vraagt. De kostentag `project` is vanuit dit account niet te activeren: dat kan alleen het beheeraccount van de organisatie | Een budgetalarm op het account, of een melding bij afwijkende kosten (Cost Anomaly Detection). De tag laten activeren in het beheeraccount, of de README aanpassen |
| E5 | De blokkade van openbare toegang tot S3 staat niet aan op het niveau van het account. De buckets van de wijnclub en van CDK hebben hem zelf wel | Aanzetten voor het account, nadat is nagegaan dat geen ander project een bucket bewust openbaar heeft |
| E6 | De bootstrap van CDK in `eu-west-1` is op 19 november 2026 met de standaardinstellingen aangemaakt: uitvoeren met `AdministratorAccess`, geen grens, en elke rol in het account met genoeg rechten mag de uitrolrollen aannemen. In die regio staan alleen stacks van de wijnclub | Dit is A4, en het kan zonder een ander project te raken: opnieuw bootstrappen in `eu-west-1` met een beperkt uitvoeringsbeleid |
| E7 | De client in de teststack staat zoals in B1 en B2: wachtwoord als eerste factor, OAuth aan met `https://example.com` als terugkeeradres en het bereik `aws.cognito.signin.user.admin`. De user pool heeft geen domein, dus de inlogpagina van Cognito is niet bereikbaar. Het tijdelijke wachtwoord is zeven dagen geldig | B1 en B2. Voeg nooit een domein aan de user pool toe zolang OAuth aan staat |
| E8 | De scheiding werkt ook de andere kant op. Er staan 48 rollen, twee koppelingen met een andere dienst voor pipelines en gebruikers van andere projecten in het account. Wie daar beheerrechten heeft, kan de ledentabel en de user pool lezen | Vóór er echte leden in staan: het eigen account uit de README, of de gegevens van leden versleutelen met een eigen sleutel in KMS die alleen de functies van de wijnclub mogen gebruiken |
| E9 | Het account is lid van een AWS-organisatie en het inloggen loopt via Identity Center. Wie de organisatie en Identity Center beheert, bepaalt wie er nog meer in dit account kan | Vastleggen wie dat zijn en welke rechten zij op dit account hebben. Dit hoort ook in de privacyverklaring: wie kan bij de gegevens van leden |
| E10 | Er is geen contactpersoon voor beveiliging ingesteld. Meldingen van AWS over misbruik gaan dan alleen naar het adres van de hoofdgebruiker | Een contactpersoon voor beveiliging instellen onder Account |

## Nog te controleren in het AWS-account

De sessie verliep voordat dit gelezen was. De sjablonen zeggen wat er hoort te staan; dit is de controle of het er ook zo staat.

- De API: of elke route een token vraagt en wat de begrenzing op de stage is.
- De functies: wie ze mag aanroepen, en dat er geen eigen adres (function URL) op staat.
- Secrets Manager: of er alleen `wijnclub/<omgeving>/…` staat en wie het mag lezen.
- SES: of het afzenderadres geverifieerd is en of het account nog in de proefomgeving zit.
- De logboeken en hun bewaartermijn, en of er al alarmen zijn.
- Afwijkingen tussen de stacks en hun sjablonen (drift). Die controle start een bewerking in CloudFormation en is daarom niet gedraaid.
