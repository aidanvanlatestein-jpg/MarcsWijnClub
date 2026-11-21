# Bouwspecificatie: Marcs wijnclub

19 november 2026, bijgewerkt op 20 november 2026 voor ontwerp V4 · hoort bij [pilotplan-marcs-wijnclub.md](../pilotplan-marcs-wijnclub.md)

Dit document werkt het pilotplan uit tot bouwniveau: sleutels in DynamoDB, de levensloop van een bestelling, de bieding, de API-aanroepen en de indeling van het project. Het plan zegt wat er komt; dit document zegt hoe het in elkaar zit.

## 1. Uitgangspunten

| Onderdeel | Keuze |
| --- | --- |
| Taal backend | Python, Lambda-runtime `python3.14` |
| Omgeving als code | AWS CDK in Python (`aws-cdk-lib` 2.255.0) |
| Web-app | React met Vite, in TypeScript. `npm run build` in `app/` schrijft statische bestanden naar `app/dist`; die staan op S3 achter CloudFront. Geen paden: één pagina |
| Apparaat | De telefoon eerst: vrijwel elk lid gebruikt de app op zijn telefoon. De eisen staan in hoofdstuk 10 |
| API | API Gateway HTTP API, bereikbaar via CloudFront onder `/api/*` |
| Inloggen | Cognito, eenmalige code per e-mail, alleen op uitnodiging |
| Betalen | Mollie, iDEAL |
| Omgevingen | `test` en `prod`, elk een eigen set stacks, samen in één privé-AWS-account dat ook andere eigen projecten bevat; alles van de wijnclub begint met `Wijnclub-` |

De API loopt via CloudFront, zodat web-app en API hetzelfde adres hebben. Daardoor is geen CORS-instelling nodig en hangen de stacks niet in een kring van elkaar af.

Bedragen staan overal als **hele centen** (`950` voor € 9,50), nooit als kommagetal. Tijden staan als UTC-tekst in de vorm `2026-11-19T15:40:00Z`, zodat ze als tekst te sorteren en te vergelijken zijn.

### Nagezocht op 19 november 2026

| Feit | Bron |
| --- | --- |
| Een code per e-mail vraagt het Essentials-plan van Cognito, de inlogstroom `USER_AUTH` en verzending via Amazon SES | [Cognito: authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html), [Cognito: e-mail](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html) |
| Een beheerder kan gebruikers zonder wachtwoord aanmaken | Zelfde pagina |
| Een refresh-token kan maximaal 10 jaar geldig zijn | [Cognito: refresh tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html) |
| `python3.14` is de nieuwste algemeen beschikbare Lambda-runtime, ondersteund tot 30 juni 2029 | [Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) |
| Een open iDEAL-betaling verloopt bij Mollie na 15 minuten | [Mollie: handling payment status](https://docs.mollie.com/docs/handling-payment-status) |
| De melding van Mollie is een POST met alleen `id=tr_…`. De status moet je zelf ophalen. Er is geen handtekening om te controleren | [Mollie: webhooks](https://docs.mollie.com/reference/webhooks) |
| Mollie probeert een melding 10 keer, verspreid over 26 uur, en verwacht `200 OK` binnen 15 seconden | Zelfde pagina |
| Mollie roept de melding ook aan bij een terugbetaling | Zelfde pagina |
| Eindstatussen van een betaling: `paid`, `canceled`, `expired`, `failed` | [Mollie: handling payment status](https://docs.mollie.com/docs/handling-payment-status) |

## 2. Tabellen en sleutels

Negen tabellen, alle met betalen naar gebruik en herstel naar een tijdstip. `betalingen` is erbij gekomen om een melding van Mollie aan een bestelling te koppelen, en `weergaven`, `berichten` en `tikken` voor de tellingen in hoofdstuk 5. Zes zijn gebouwd; `weergaven`, `berichten` en `tikken` nog niet. De tabel `oordelen` is op 19 november 2026 vervallen: de eigen collectie van een lid is uit de pilot gehaald en staat als onderwerp 14 op de roadmap van het plan.

| Tabel | Sleutel | Extra index | Waarvoor de index dient |
| --- | --- | --- | --- |
| `leden` | `lidId` | geen | |
| `lijsten` | `lijstId` | `status-index`: `status` + `openTot` | De lijst die nu open staat |
| `wijnen` | `wijnId` | `lijst-index`: `lijstId` + `volgorde` | Wijnen van één lijst, in Marcs volgorde |
| | | `bieding-index`: `biedingStatus` + `eindtijd` | Biedingen die nu open staan. Alleen wijnen met een bieding hebben `biedingStatus` |
| `biedingen` | `wijnId` + `tijdstipLid` | `lid-index`: `lidId` + `tijdstip` | Biedingen van één lid |
| `bestellingen` | `bestellingId` | `lid-index`: `lidId` + `aangemaakt` | Je bestellingen |
| | | `lijst-index`: `lijstId` + `aangemaakt` | Marcs overzicht per lijst |
| | | `betaal-index`: `status` + `betaalVoor` | Open bestellingen waarvan de termijn voorbij is, voor de taak die ze laat verlopen |
| `betalingen` | `mollieBetalingId` | geen | Melding van Mollie naar de bestelling van die betaling |
| `weergaven` | `wijnId` + `lidId` | geen | Per bieding tellen hoeveel leden hem openden |
| `berichten` | `berichtId` | geen | Per melding vastleggen wanneer hij verstuurd is. Bij enkele honderden berichten is alles doorlopen geen probleem |
| `tikken` | `berichtId` + `lidId` | geen | Per melding tellen hoeveel leden erop tikten |

`lidId` is de `sub` uit Cognito. Abonnementen op meldingen staan als lijst op het lid; bij 120 leden is alle leden doorlopen voor een melding geen probleem.

### Velden per tabel

- **`leden`**: `lidId`, `naam`, `email`, `telefoon`, `adres` (het afleveradres: `straat` met huisnummer, `postcode`, `plaats`; ontbreekt als het lid geen adres heeft), `leveringVoorkeur` (`brengen` of `halen`), `volwassenBevestigdOp`, `meldingen` (lijst van abonnementen), `uitgenodigdOp`. Het adres is er alleen voor brengen. Alleen het lid zelf en de groep `beheer` zien het (design-v4 toont het op scherm 10); een ander lid nooit. Het komt niet op de bestelling en nooit in het logboek.
- **`lijsten`**: `lijstId`, `titel`, `inleiding`, `status` (`concept`, `open`, `gesloten`), `openVan`, `openTot`, `geslotenOp`, `herinnerdOp`, `levering`. In `levering` staat wat Marc voor deze lijst aanbiedt: `brengen` met `van` en `tot` (het tijdvak waarin hij aan huis brengt), en `halen` met `van`, `tot` en `waar` (waar en wanneer het lid ophaalt). Wat hij niet aanbiedt, ontbreekt; minstens één van de twee staat er. Bijvoorbeeld:

  ```json
  {
    "brengen": { "van": "2026-11-26T17:00:00Z", "tot": "2026-11-26T19:00:00Z" },
    "halen": { "van": "2026-11-28T09:00:00Z", "tot": "2026-11-28T12:00:00Z", "waar": "Bij Marc" }
  }
  ```

- **`wijnen`**: `wijnId`, `soort` (`vast` of `bieding`), `naam`, `producent`, `jaargang`, `streek`, `tekst`, `tekstBron` (`bericht`, `voorstel`, `voorstel-aangepast` of `zelf`), `foto`. Optioneel: `druif`, `spijs`, `drinken`.
  - Bij `vast`: `lijstId`, `volgorde`, `letter`, `prijs`, `voorraad`. De letter is die uit Marcs WhatsApp-bericht: A voor de eerste wijn van de lijst.
  - Bij `bieding`: `biedingStatus` (`open`, `gesloten`), `startbod`, `minimaleVerhoging`, `minimaalVolgendBod`, `eindtijd`, `herkomst`, `spraakbericht`, `hoogsteBod`, `hoogsteBieder`, `aantalBiedingen`.
- **`biedingen`**: `wijnId`, `tijdstipLid` (`<tijdstip>#<lidId>`), `tijdstip`, `lidId`, `bedrag`, `verlengd` (waar als dit bod de eindtijd verschoof).
- **`bestellingen`**: `bestellingId`, `lidId`, `soort` (`lijst`, `bieding`, `namens`), `lijstId`, `regels` (lijst van `wijnId`, `naam`, `aantal`, `prijs`), `totaal`, `status`, `voorraadGereserveerd`, `betaalVoor`, `levering` (`brengen` of `halen`; bij een gewonnen bieding leeg tot het lid na het betalen kiest), `afgeleverdOp`, `ingevoerdDoor`, `aangemaakt`, `betaalpogingen` (lijst van `mollieBetalingId`: elke betaling die voor deze bestelling is gestart), `betaaldOp`, `mollieBetalingId` (de betaling waarmee de bestelling op betaald is gezet), `verlopenOp`, `herinnerdOp`, `controleNodig`.
- **`betalingen`**: `mollieBetalingId`, `bestellingId`, `lidId`, `bedrag`, `aangemaakt`. Een betaling hoort bij precies één bestelling.
- **`weergaven`**: `wijnId`, `lidId`, `eerst`, `vervaltOp`. Eén rij per lid per bieding, alleen voor de tellingen.
- **`berichten`**: `berichtId`, `soort` (`nieuwe-lijst`, `nog-beschikbaar`, `betaalverzoek` (de betaallink bij een bestelling namens een lid), `betaalherinnering`, `nieuwe-bieding`, `overboden`, `gewonnen`), `kanaal` (`melding`, `email`, `groep`), `lijstId` of `wijnId`, `verzondenOp`, `ontvangers` (aantal). Er staat geen `lidId` in, ook niet bij een bericht aan één lid.
- **`tikken`**: `berichtId`, `lidId`, `eerst`, `vervaltOp`. Eén rij per lid per bericht, alleen voor de tellingen.

`minimaalVolgendBod` bestaat omdat DynamoDB in een voorwaarde niet kan rekenen. Na elk bod wordt het `bod + minimaleVerhoging`.

**Nieuw door design-v3, nog niet in de tabellen.** Het ontwerp maakt van elke lijst "een avond bij Marc". Het prototype in `app/` gebruikt daarvoor deze velden; ze komen in de tabellen zodra de open beslissingen uit hoofdstuk 9 genomen zijn:

- **`lijsten`**: `fase` (`aangekondigd`, `live`, `gesloten`), `begin` (de begintijd, zoals 19:30), `veilingBegin` (wanneer de veiling opent als Marc niet eerder start), `aankondigingOp`. De `inleiding` is Marcs aankondiging.
- **`wijnen`**: `opTafelSinds` (wanneer Marc de wijn op tafel zette; leeg is "staat klaar" en dan is hij niet te koop) en `opSinds` (wanneer de laatste fles weg was). Bij een bieding: `geopend` (wanneer de zaal openging).
- **Nieuwe tabel `feed`**: sleutel `lijstId` + `tijdstip`, met `soort` (`wijn`, `bericht`, `gebeurtenis`), en `wijnId` of `tekst`. Een gebeurtenis zoals "een lid nam 2 × wijn H" bevat nooit een `lidId`.
- **`biedingen`**: een vast `bieder`-nummer per lid per veiling, voor "Bieder 7" in de biedlog. Het nummer is niet herleidbaar tot het lid; alleen de server kent de koppeling.

## 3. Levensloop van een bestelling

Eén regel bepaalt alles: **een bestelling blijft open tot `betaalVoor`, en alleen een geslaagde betaling of het verstrijken van die tijd verandert de status.** Een mislukte of afgebroken betaling verandert niets; het lid kan binnen de termijn opnieuw betalen.

**Elke bestelling wordt apart betaald**, met iDEAL via Mollie. Van de lijst betaalt het lid meteen bij het bestellen: Marc houdt de flessen 15 minuten vast. De voorraad gaat bij het bestellen omlaag; is er na 15 minuten niet betaald, dan verloopt de bestelling en komt de voorraad terug. Bijbestellen is een nieuwe bestelling, met een eigen betaling. Er is geen gezamenlijke betaling bij het sluiten van de lijst.

```mermaid
stateDiagram-v2
    [*] --> open: besteld, voorraad gereserveerd
    open --> betaald: Mollie meldt paid
    open --> verlopen: betaalVoor verstreken zonder betaling
    betaald --> terugbetaald: Mollie meldt een terugbetaling
    verlopen --> [*]
    terugbetaald --> [*]
```

| Soort bestelling | Ontstaat als | `betaalVoor` | Voorraad gereserveerd |
| --- | --- | --- | --- |
| `lijst` | Een lid bestelt van de lijst | 15 minuten na het bestellen | Ja |
| `namens` | Marc een bestelling voor een lid invoert | 48 uur na het invoeren | Ja |
| `bieding` | Een bieding sluit met een winnaar | 48 uur na sluiten van de bieding | Nee, de fles is al van de lijst af |

Het sluiten van de lijst verandert geen enkele `betaalVoor`. De regels staan in `domein/bestelling.py`.

### Levering

Een bestelling wordt gebracht of gehaald:

- **`brengen`**: Marc brengt de flessen aan huis, in het tijdvak dat hij voor de lijst instelt, zoals donderdagavond van 18:00 tot 20:00.
- **`halen`**: het lid haalt de flessen bij Marc op, op het moment en de plek die hij voor de lijst instelt.

Per lijst kiest Marc of hij brengen, halen of beide aanbiedt, met `van` en `tot` en bij halen `waar` (zie `lijsten` in hoofdstuk 2). De app controleert dat er minstens één is, dat `van` vóór `tot` ligt en dat halen een plek heeft.

Bij bestellen controleert de app de levering met wat in de opslag staat, nooit met wat de aanvraag zegt:

- Geen levering gekozen: `geen_levering`. Iets anders dan `brengen` of `halen`: `onbekende_levering`.
- Een levering die de lijst niet aanbiedt: `levering_niet_aangeboden`.
- Brengen terwijl het lid geen afleveradres heeft: `geen_adres`.

Het adres komt niet op de bestelling. De paklijst leest het uit `leden`, zodat er geen kopieën van ontstaan. Bewaren bij Marc is uit de pilot en staat op de roadmap.

### Bestellen van de lijst

1. De app controleert de regels: minstens één wijn, elk aantal tussen 1 en 24, elke wijn één keer, hoogstens 25 regels. Daarna de levering, zoals hierboven.
2. De web-app stuurt per bestelpoging een `sleutel` mee: een willekeurige tekst van 8 tot 64 letters, cijfers en streepjes, zoals een UUID. Ze maakt die aan als het lid op Bestel tikt en stuurt dezelfde sleutel mee als ze de aanroep herhaalt. Het `bestellingId` wordt afgeleid van het lid en de sleutel, zodat dezelfde poging altijd hetzelfde nummer geeft.
3. Eén transactie in DynamoDB doet alles of niets:
   - controleer dat de lijst `open` is en `openTot` niet voorbij;
   - verlaag per wijn de `voorraad`, op voorwaarde dat er genoeg is;
   - schrijf de bestelling met status `open` en `betaalVoor` 15 minuten na nu, op voorwaarde dat het `bestellingId` nog niet bestaat.
4. Mislukt de transactie, dan kijkt de app in deze volgorde naar de reden:
   - **Een botsing in de tijd.** Bestellen twee leden op hetzelfde moment dezelfde wijn, dan breekt DynamoDB één van de twee af zonder dat er iets op is. De app probeert het hoogstens drie keer opnieuw, met een korte willekeurige pauze. Lukt het dan nog niet, dan krijgt het lid `503` en probeert de web-app het opnieuw met dezelfde sleutel.
   - **De bestelling stond er al.** Dezelfde poging kwam twee keer binnen, bijvoorbeeld na een time-out of een dubbele tik. Het lid krijgt de bestaande bestelling terug met `201`, zonder nieuwe betaling; er komt geen tweede bestelling. Is hij nog open, dan start de web-app de betaling met Betaal.
   - **De lijst is dicht of een wijn is op.** Het lid krijgt `409` terug met de wijnen die op zijn. Er is niets gereserveerd.
5. Gelukt: de app start meteen de betaling, zoals onder Betalen, en het lid krijgt `201` met de bestelling en de `betaalUrl`. De web-app stuurt het lid door naar de betaalpagina. Lukt het starten bij Mollie niet, dan blijft de bestelling staan zonder `betaalUrl`; het lid kan binnen de 15 minuten op Betaal tikken.
6. Bestelt het lid opnieuw van dezelfde lijst, met een nieuwe sleutel, dan ontstaat een tweede bestelling met een eigen houdtijd en een eigen betaling. Bestellingen worden nooit achteraf gewijzigd.
7. De gekozen levering wordt als voorkeur op het lid bewaard, in `leveringVoorkeur`.

### Namens een lid

1. Marc voert regels en levering in voor een lid, bijvoorbeeld na een bericht in de groep. De controles en de transactie zijn dezelfde als bij bestellen van de lijst; de adrescontrole gaat over het lid voor wie hij bestelt. `betaalVoor` is 48 uur na het invoeren.
2. Het antwoord bevat een `betaalLink`: een link naar de bon in de app (`/bon/{bestellingId}`), en geen link van Mollie, want een betaling bij Mollie verloopt na 15 minuten. Marc stuurt de link zelf naar het lid. Het lid opent hem, logt zo nodig in en tikt op Betaal.
3. Tot het lid betaalt of de termijn voorbij is, blijft de voorraad vast.

### De lijst sluiten

1. Een eenmalige taak in EventBridge Scheduler staat op `openTot`. Marc kan de lijst ook eerder sluiten.
2. De taak zet de status van de lijst op `gesloten`, op voorwaarde dat die nog `open` is, en schrijft `geslotenOp`.
3. Er volgt geen betaalverzoek: elke bestelling is al betaald of heeft een eigen termijn. Een bestelling van vlak voor het sluiten blijft binnen zijn 15 minuten te betalen. Verloopt hij toch, dan komt de voorraad terug op een gesloten lijst en is hij niet meer te bestellen.

### Betalen

1. Het lid komt van Bestel of tikt op Betaal bij een open bestelling. Elke betaling hoort bij precies één bestelling.
2. De app controleert dat de bestelling van het lid is, `open` is en dat `betaalVoor` niet voorbij is. Of de lijst open of gesloten is, doet er niet toe.
3. De app maakt bij Mollie een betaling aan voor het `totaal`, schrijft die met het `bestellingId` in `betalingen`, zet het nummer bij `betaalpogingen` op de bestelling en stuurt het lid naar de betaalpagina. Een iDEAL-betaling verloopt bij Mollie na 15 minuten; binnen de termijn kan het lid een nieuwe starten.

Een betaling die vlak voor het einde van de houdtijd start, kan bij Mollie nog tot 15 minuten later slagen. De taak voor verlopen wacht daarop, dus de flessen staan hoogstens ongeveer een half uur vast.

### Melding van Mollie

1. De melding bevat alleen het nummer van de betaling. De app zoekt de bestelling op in `betalingen` en haalt de status op bij Mollie.
2. `paid`: de bestelling gaat van `open` naar `betaald`, op voorwaarde dat hij nog `open` is. Het nummer van de betaling komt als `mollieBetalingId` op de bestelling.
3. Faalt die voorwaarde, dan leest de app de bestelling opnieuw en beslist:
   - `betaald` met hetzelfde `mollieBetalingId`: dezelfde melding kwam nog eens. Er gebeurt niets.
   - `betaald` of `terugbetaald` met een ander `mollieBetalingId`: het lid heeft **dubbel betaald**, bijvoorbeeld door twee betalingen tegelijk te starten. De status blijft staan, `controleNodig` gaat aan en er gaat een alarm af. Marc betaalt de tweede betaling terug.
   - `verlopen`: de status blijft `verlopen`, `controleNodig` gaat aan en er gaat een alarm af. Marc levert alsnog of betaalt terug.
4. Een terugbetaling van de betaling waarmee de bestelling betaald is: de status wordt `terugbetaald`. De voorraad komt niet vanzelf terug; dat beslist Marc. Een terugbetaling van een andere betaling, de dubbele, verandert de status niet.
5. Elke andere status van de betaling: geen wijziging.
6. De app antwoordt altijd `200`, ook als het nummer onbekend is. Een onbekend nummer wordt gelogd.

### Verlopen

Een taak in EventBridge Scheduler draait elke minuut. Hij zoekt via `betaal-index` de bestellingen met status `open` waarvan `betaalVoor` voorbij is, en vraagt per bestelling bij Mollie de status op van alle betalingen in `betaalpogingen`. Alleen de laatste is niet genoeg: een eerdere betaling kan nog slagen nadat een latere is afgebroken.

- Eén ervan betaald: verwerken als een melding.
- Geen betaald, maar één nog bezig (`open`, `pending`, `authorized`): niets doen. De volgende ronde kijkt opnieuw.
- Anders: één transactie zet de status op `verlopen`, schrijft `verlopenOp` en geeft de voorraad terug, op voorwaarde dat de status nog `open` is. Bij een bestelling van de lijst krijgt Marc geen bericht: de flessen zijn meteen weer te bestellen. Bij een bestelling namens een lid krijgt hij wel bericht.

Bij een verlopen bestelling uit een bieding komt er geen voorraad terug. Marc krijgt bericht en beslist of de fles naar de volgende bieder gaat.

Dezelfde taak stuurt bij een bestelling `namens` of `bieding` die 24 uur vóór `betaalVoor` nog open is één herinnering, en zet `herinnerdOp` zodat het bij één blijft. Bij een bestelling van de lijst is er geen herinnering: het lid betaalt meteen.

### Levering kiezen na een bieding

Een gewonnen bieding ontstaat zonder levering. Na het betalen kiest de winnaar brengen of halen met `PUT /api/bestellingen/{id}/levering`, tot de fles is afgeleverd. Een bieding hoort niet bij een lijst; de winnaar kan daarom beide kiezen, brengen alleen met een afleveradres, en Marc spreekt het moment met hem af of neemt de fles mee met de eerstvolgende lijst.

## 4. De bieding

### Een bod plaatsen

1. De app leest de wijn en controleert: `biedingStatus` is `open`, `eindtijd` is niet voorbij, het lid is niet zelf de hoogste bieder, en het bod is minstens `minimaalVolgendBod` en hoogstens drie keer dat bedrag. De bovengrens vangt een tikfout op: een bod is bindend en zet het minimum voor iedereen vast.
2. Valt het bod in de laatste twee minuten, dan wordt de nieuwe eindtijd het moment van bieden plus twee minuten.
3. Eén transactie schrijft het bod, met `verlengd` als stap 2 de eindtijd verschoof, en werkt de wijn bij, op voorwaarde dat `minimaalVolgendBod` en `eindtijd` nog zijn zoals gelezen. Faalt de transactie, dan leest de app de wijn opnieuw en beoordeelt het bod nog eens, hoogstens drie keer. Was iemand net eerder, dan krijgt het lid `409` met het nieuwe minimum. Botsten twee biedingen alleen in de tijd, dan gaat het bod bij de volgende poging gewoon door.
4. De vorige hoogste bieder krijgt een melding dat hij overboden is.

Leden zien `hoogsteBod` en of hun eigen bod het hoogste is. Wie de hoogste bieder is, gaat nooit naar de web-app.

### Een bieding sluiten

1. Bij het starten van een bieding komt er een eenmalige taak op `eindtijd`.
2. De taak leest de wijn. Is de eindtijd verlengd, dan plant hij zichzelf opnieuw op de nieuwe eindtijd en stopt.
3. Anders zet hij `biedingStatus` op `gesloten`, op voorwaarde dat die nog `open` is en dat `eindtijd` en `minimaalVolgendBod` nog zijn zoals gelezen. Is er een hoogste bieder, dan schrijft dezelfde transactie een bestelling van soort `bieding` met `betaalVoor` over 48 uur en zonder levering. Zo is er nooit een gesloten bieding met een winnaar zonder bestelling.
4. Daarna krijgt de winnaar een melding met een link naar zijn fles in de app. Hij betaalt en kiest daarna brengen of halen, zie "Levering kiezen na een bieding" in hoofdstuk 3.

## 5. API-aanroepen

Alle paden beginnen met `/api`. Elke aanroep vraagt een geldig token van Cognito, behalve de melding van Mollie. Paden onder `/api/beheer` vragen daarnaast de groep `beheer`.

| Aanroep | Doet | Antwoord |
| --- | --- | --- |
| `GET /api/aanbod` | De open lijst met wijnen en de `levering` die Marc aanbiedt (`brengen` met `van` en `tot`, `halen` met `van`, `tot` en `waar`; wat hij niet aanbiedt ontbreekt), en de open biedingen | `200` |
| `GET /api/wijnen/{wijnId}` | Eén wijn. Legt vast dat het lid een bieding opende, zie Tellingen voor de roadmap | `200`, `404` |
| `POST /api/bestellingen` | Bestellen van de lijst: `regels`, `levering` (`brengen` of `halen`), `sleutel` (per bestelpoging). Houdt de voorraad 15 minuten vast en start meteen de betaling. Dezelfde sleutel nog eens geeft dezelfde bestelling terug, zonder nieuwe betaling | `201` met de bestelling en `betaalUrl`, `400` met `geen_levering`, `onbekende_levering`, `levering_niet_aangeboden` of `geen_adres`, `409` met de wijnen die op zijn, of `503` bij aanhoudende drukte |
| `GET /api/bestellingen/{id}` | Status, na terugkomst van de betaalpagina | `200`, `404` |
| `POST /api/mijn/betalingen` | Een betaling starten voor één open bestelling: `bestellingId`. Voor elke soort, ook als de lijst nog open staat | `201` met `betaalUrl`, `409` als de bestelling niet open is of `betaalVoor` voorbij is |
| `PUT /api/bestellingen/{id}/levering` | `brengen` of `halen`, voor een gewonnen fles na het betalen | `200`, `400` met `onbekende_levering` of `geen_adres`, `409` als de bestelling nog niet betaald of al afgeleverd is |
| `POST /api/wijnen/{wijnId}/biedingen` | Een bod: `bedrag` | `201`, of `409` met `minimaalVolgendBod` en het hoogste toegestane bod. De fout zegt waarom: `bod_te_laag`, `bod_te_hoog`, `al_hoogste` of `bieding_gesloten` |
| `GET /api/mijn/bestellingen` | De bestellingen van de lopende lijst en gewonnen flessen die nog niet zijn afgeleverd, met bedrag, levering, status en `betaalVoor` | `200` |
| `GET` en `PUT /api/mijn/profiel` | Naam, telefoon, levering van voorkeur, bevestiging 18 jaar, en het eigen afleveradres (`adres`). Een lid ziet en wijzigt alleen zijn eigen adres | `200` |
| `POST` en `DELETE /api/mijn/meldingen` | Abonnement op meldingen | `200` |
| `POST /api/mijn/tikken` | Een tik op een melding: `berichtId`. Telt één keer per lid, zie Tellingen voor de roadmap | altijd `200` |
| `POST /api/beheer/herken` | Velden uit Marcs WhatsApp-bericht: `naam`, `producent`, `jaargang`, `aantal`, `prijs` in centen, `tekst` en `ontbreekt`. Zie "Een bericht herkennen" | `200`, `400` |
| `POST /api/beheer/uploads` | Tijdelijke uploadlink voor foto of spraakbericht, met een `uploadId` | `200` |
| `POST /api/beheer/etiket` | Velden van de foto van het etiket: `uploadId` erin; `naam`, `producent`, `jaargang`, `streek` en `ontbreekt` eruit. Zie "Een etiket lezen" | `200`, `400` |
| `POST /api/beheer/teksten` | Drie tekstvoorstellen: `notitie` en de velden van de wijn erin; `voorstellen` eruit, elk met `tekst` en `nieuw`. Zie "Een tekst voorstellen" | `200`, `400` |
| `POST` en `PUT /api/beheer/lijsten` | Lijst aanmaken met titel, inleiding, eindtijd en `levering` (brengen, halen of beide, met `van` en `tot`, en bij halen `waar`); openen, sluiten | `200`, `201`, `400` met `geen_levering_aangeboden`, `ongeldige_levering`, `ongeldig_moment` of `geen_ophaalplek` |
| `POST /api/beheer/lijsten/{id}/herinnering` | Eén melding "nog beschikbaar" aan alle leden. Kan één keer per lijst | `200`, `409` |
| `GET /api/beheer/lijsten/{id}/paklijst` | Per levering: wat Marc brengt, met naam en adres, en wat er gehaald wordt, met naam. Per bestelling de wijnen en of hij betaald is | `200` |
| `POST` en `PUT /api/beheer/wijnen` | Wijn op de lijst zetten of bieding starten | `200`, `201` |
| `GET /api/beheer/bestellingen` | Overzicht per lijst | `200` |
| `POST /api/beheer/bestellingen` | Bestelling namens een lid: `lidId`, `regels`, `levering`. De web-app zet "C2 D2" om in regels. Het lid heeft 48 uur om te betalen | `201` met `betaalLink` (naar de bon in de app), `400` zoals bij bestellen, `409` |
| `PUT /api/beheer/bestellingen/{id}/afgeleverd` | Afvinken | `200` |
| `POST /api/beheer/leden` | Lid uitnodigen, eventueel met `adres` | `201` |
| `PUT /api/beheer/leden/{lidId}/adres` | Afleveradres zetten of wissen: `straat`, `postcode`, `plaats`, of leeg | `200`, `400` |
| `POST /api/beheer/berichten` | Vastleggen dat Marc iets in de WhatsApp-groep deelt: `soort`, `lijstId` of `wijnId`. Geeft de link met het `berichtId` terug | `201` |
| `GET /api/beheer/tellingen` | De tellingen voor de roadmap, alleen aantallen | `200` |
| `POST /api/webhooks/mollie` | Melding van Mollie, zonder token | altijd `200` |

Een lid ziet alleen zijn eigen bestellingen en biedingen. De app neemt het `lidId` altijd uit het token en nooit uit de aanvraag.

Een fout heeft altijd dezelfde vorm, zonder interne details:

```json
{ "fout": "uitverkocht", "bericht": "Een van de wijnen is net op." }
```

Details staan in het logboek, zonder namen, adressen of bedragen per persoon.

**Een bericht herkennen.** Een taalmodel in Bedrock leest het bericht. De regels staan in `domein/herkennen.py`; de handler roept alleen het model aan.

- Het bericht is hoogstens 2000 tekens, anders `400` zonder aanroep van het model. Het gaat tussen `<bericht>` en `</bericht>` naar het model, als tekst om te lezen en nooit als opdracht.
- Het model geeft JSON terug. De prijs komt terug zoals Marc hem schreef, zoals `10,5`. De app rekent hem om naar centen, niet het model.
- Alleen wat in het bericht staat, wordt overgenomen. Naam en producent staan er woord voor woord in. Elk woord van de tekst staat in het bericht, dus geen verzonnen smaken. Jaargang, aantal en prijs staan er als los getal in: 18 telt niet als het alleen in 2018 voorkomt.
- Daarnaast gelden grenzen: jaargang 1900 tot 2100, aantal 1 tot 999, prijs boven nul en hoogstens € 1000.
- Klopt een veld niet, of is het antwoord geen leesbare JSON, dan blijft dat veld leeg en staat het in `ontbreekt`. Marc vult het dan zelf in. Een fout van het model zelf geeft de algemene fout; Marc kan dan alles zelf invullen.
- De letter wordt niet herkend: de app geeft de volgende letter van de lijst.
- Het bericht en het antwoord komen niet in het logboek, alleen of het lukte en welke velden ontbraken.

**Een etiket lezen.** Besloten op 20 november 2026: dit komt in de pilot, in week 4. Hetzelfde taalmodel als bij een bericht kijkt naar de foto. De regels staan in `domein/etiket.py`; de handler haalt de foto uit de bucket en roept het model aan.

- Marc begint met een foto, met zijn bericht of met beide. Bij beide gelden de velden uit het bericht, en het etiket vult aan wat het bericht niet noemt. Verschillen naam of jaargang, dan toont de app beide met "Klopt dit?".
- Er is geen tekst om tegen te controleren, dus gelden alleen grenzen: naam en producent hoogstens 120 tekens, zonder regeleinden en zonder links, streek hoogstens 60 tekens, jaargang 1900 tot 2100. Aantal en prijs komen nooit van het etiket.
- Tekst op het etiket is iets om te lezen en nooit een opdracht. Het antwoord is JSON, net als bij een bericht; een veld dat niet klopt, blijft leeg en staat in `ontbreekt`.
- `domein/etiket.py` gebruikt hetzelfde lezen van JSON, opschonen en dezelfde grenzen als `domein/herkennen.py`. Wat beide gebruiken, staat op één plek.

**Een tekst voorstellen.** Ook in de pilot, in week 4. Marc geeft een `notitie`: een paar steekwoorden, getypt of gedicteerd met de microfoon van zijn toetsenbord, zoals "fris, citrus, bij asperges, nu drinken". Het model maakt er drie korte teksten van in een vaste stijl. De regels staan in `domein/tekst.py`.

- De notitie is verplicht en hoogstens 500 tekens. Zonder notitie geen voorstel: dan heeft het model niets van Marc om op te schrijven.
- Een voorstel is hoogstens 400 tekens. Het model verzint geen smaak, score, prijs of jaartal: een getal dat niet in de notitie of de velden staat, laat het voorstel vallen.
- Een woord dat niet in de notitie of de velden staat en geen gewoon woord als "de", "met" of "lekker" is, komt in `nieuw`. De web-app markeert die woorden, zodat Marc ziet wat het model toevoegde. Ze worden niet weggegooid.
- Herkomst en bewaring worden nooit voorgesteld. Ook "wat eet je erbij" en "wanneer drinken" vult Marc zelf in.
- De stijl is één vaste beschrijving in `domein/tekst.py`. Aidan levert die aan op basis van Marcs omschrijvingen in WhatsApp. Echte berichten van Marc komen alleen in de repository als Marc dat goed vindt.
- Marc kiest een voorstel, past het aan of schrijft zelf. De web-app zet `tekstBron` op de wijn; zie Tellingen voor de roadmap.
- De notitie, de foto en het antwoord komen niet in het logboek, alleen of het lukte en welke velden ontbraken.

**Kosten en grenzen van het model.** Per wijn kost herkennen, het etiket lezen en drie voorstellen samen ongeveer $0,002 met Claude Haiku 5.5 en ongeveer $0,03 met Claude Sonnet 5.5, naar de prijzen van Anthropic op 20 november 2026; Bedrock heeft eigen prijzen. De berekening staat in het plan onder Kosten. `etiket` en `teksten` tellen samen met `herken` mee in een limiet van 100 aanroepen per dag voor de groep `beheer`; daarboven geeft de API `429` en vult Marc zelf in.

**Uploads zijn een risico.** De uploadlink is alleen voor de groep `beheer`, geldt enkele minuten, staat alleen afbeeldingen en geluid toe en heeft een maximale grootte. Bestanden komen in een eigen map van de bucket en worden nooit uitgevoerd. Voor een foto van een fles:

- De web-app verkleint de foto tot hoogstens 1600 px en schrijft hem opnieuw weg als JPEG. Daarmee verdwijnen de locatie en andere gegevens uit de foto, en blijft hij klein.
- De link staat alleen JPEG, PNG en WebP toe, tot hoogstens 5 MB. De functie die de foto leest, controleert het type aan de inhoud van het bestand en niet aan de naam (punt C4 van de beveiligingsscan in het plan).
- Op de telefoon opent + FOTO de camera (`capture="environment"`); kiezen uit de fotorol kan ook.

### Tellingen voor de roadmap

De pilot legt drie tellingen vast, zodat na acht weken te kiezen is tussen de onderwerpen op de roadmap van het plan. Er komt geen scherm bij: de bouwer vraagt ze op met `GET /api/beheer/tellingen` voor de evaluatie.

| Telling | Beantwoordt | Komt uit | Nieuw |
| --- | --- | --- | --- |
| Leden die op één, twee, of drie en meer lijsten bestelden | Komen leden terug | `bestellingen`, via `lijst-index` | Niets |
| Per bieding: leden die keken, leden die boden, en biedingen die de eindtijd verlengden | Is er vraag naar volgen en een maximaal bod | `weergaven`, en `biedingen` met `verlengd` | Tabel `weergaven` en veld `verlengd` |
| Per melding: wanneer hij verstuurd is, hoeveel leden erop tikten, en hoeveel er binnen 24 uur bestelden of boden | Welk moment werkt, voor de campagnes op de roadmap | `berichten`, `tikken`, `bestellingen` en `biedingen` | Tabellen `berichten` en `tikken` |

**Waar de tekst vandaan komt.** Naast de drie tellingen geeft `GET /api/beheer/tellingen` per `tekstBron` het aantal wijnen. Daarmee is na de pilot te zien hoe vaak Marc een voorstel ongewijzigd koos, en of onderwerp 1 op de roadmap verder moet.

**Een weergave vastleggen.** `GET /api/wijnen/{wijnId}` schrijft één rij in `weergaven` als de wijn een bieding is die open staat.

- De rij wordt alleen geschreven als hij nog niet bestaat. Tien keer openen telt als één lid.
- Het is een eigen tabel en geen veld op de wijn. Een schrijfactie op de wijn tijdens een bod of een bestelling kan die transactie laten mislukken, en een telling mag de bieding nooit raken.
- Mislukt het schrijven, dan staat dat in het logboek en krijgt het lid gewoon de wijn te zien.
- Een aanroep uit de groep `beheer` telt niet mee.
- Het scherm Bijzondere fles roept `GET /api/wijnen/{wijnId}` altijd aan bij het openen, ook als de gegevens al uit `GET /api/aanbod` bekend zijn.

**Terugkomende bestellers.** Een lid telt voor een lijst mee als het daar minstens één bestelling van soort `lijst` of `namens` heeft die niet `verlopen` is. De telling loopt over alle gesloten lijsten. De regel staat in `domein/`, met tests.

**Een tik op een melding vastleggen.** Elke melding die de app verstuurt, krijgt een rij in `berichten` en een link met het `berichtId`, zoals `/?b=<berichtId>`.

- De functie die een melding verstuurt, schrijft eerst de rij in `berichten` met `verzondenOp` en het aantal ontvangers, en zet het `berichtId` in de link.
- Opent een lid de app via die link, dan stuurt de web-app na het inloggen `POST /api/mijn/tikken` en haalt ze het `berichtId` uit het adres.
- De rij in `tikken` wordt alleen geschreven als hij nog niet bestaat. Tien keer tikken telt als één lid.
- Een onbekend `berichtId` geeft ook `200`, zodat de aanroep niet verraadt welke berichten bestaan. Mislukt het schrijven, dan staat dat in het logboek en merkt het lid er niets van.
- Deelt Marc de link of het overzicht "nog beschikbaar" in de WhatsApp-groep, dan vraagt de web-app eerst `POST /api/beheer/berichten` aan en zet ze de link met het `berichtId` in de tekst. Het moment van delen geldt als `verzondenOp`.
- Wie na een bericht bestelde of bood, wordt niet opgeslagen. De telling loopt over de bestellingen en biedingen op die lijst of wijn binnen 24 uur na `verzondenOp`.

**Wat `GET /api/beheer/tellingen` teruggeeft.** Alleen aantallen: per bieding, per lijst en per bericht. Er gaat geen `lidId` en geen naam in het antwoord, en ook niet in het logboek.

**Privacy.** `weergaven` legt vast welk lid welke bieding opende, en `tikken` welk lid op welke melding tikte. Dat is een persoonsgegeven en hoort in de privacyverklaring. `vervaltOp` staat op 180 dagen na `eerst`, waarna DynamoDB de rij verwijdert. Dat veld is een getal in seconden sinds 1970, omdat DynamoDB dat vraagt; het is de enige tijd die niet als UTC-tekst staat.

## 6. Inloggen en rechten

- De gebruikerspool staat op het Essentials-plan, met `EMAIL_OTP` als toegestane eerste factor en zelf aanmelden uit.
- Marc nodigt uit via `POST /api/beheer/leden`. Die maakt de gebruiker aan in Cognito zonder wachtwoord en een rij in `leden`.
- De web-app gebruikt de stroom `USER_AUTH`. Het refresh-token is een jaar geldig, zodat een lid op zijn telefoon ingelogd blijft.
- De groep `beheer` bevat alleen Marc en de bouwer. API Gateway controleert het token; de Lambda-functie controleert de groep.
- Het afleveradres van een lid zien en wijzigen alleen het lid zelf (`GET` en `PUT /api/mijn/profiel`, met het lid uit het token) en de groep `beheer` (`POST /api/beheer/leden`, `PUT /api/beheer/leden/{lidId}/adres` en de afleverlijst). Een ander lid ziet het nooit. Het adres komt niet op de bestelling, niet in een foutmelding en niet in het logboek.
- Inloggen wordt niet zelf gebouwd. Draait dit ooit binnen een organisatie met een eigen standaard voor klantlogin, dan vervangt die Cognito.

**Vooraf regelen:** een geverifieerd domein of adres in Amazon SES, en toegang buiten de proefomgeving van SES. In de proefomgeving kan SES alleen mailen naar adressen die je zelf hebt geverifieerd. Voorlopig is de afzender één los geverifieerd adres en draait de app op het adres van CloudFront; het eigen domein is onderwerp 13 op de roadmap van het plan.

## 7. Projectindeling

```text
wine/
├── README.md
├── pilotplan-marcs-wijnclub.md      het plan
├── docs/bouwspecificatie.md         dit document
├── design-v4/                       het ontwerp: DESIGN.md en de schermen, de specificatie van de schermen
├── design-v2/, design-v3/           eerdere ontwerpen; wat V4 niet tekent, komt uit design-v3
├── wijnclub-prototype.html          het eerste klikbare prototype, achterhaald
├── app/                             de web-app: React met Vite, gebouwd naar app/dist. Nu een klikbaar prototype
├── functions/wijnclub/
│   ├── domein/                      regels zonder AWS: geld, bestelling en levering, bieding, herkennen, etiket, tekst
│   ├── handlers/                    één bestand per Lambda-functie
│   ├── opslag.py                    lezen en schrijven in DynamoDB
│   └── antwoord.py                  antwoorden en gegevens uit het token
├── infra/
│   ├── app.py                       de CDK-app
│   ├── cdk.json
│   └── wijnclub_infra/              vier stacks: data, inloggen, api, web
└── tests/
    ├── functions/                   tests voor de regels en de functies
    ├── infra/                       tests voor de stacks
    ├── web/                         browsertests op telefoonformaat, tegen app/dist
    └── smoke/                       rooktest na een uitrol
```

De regels in `domein/` gebruiken geen AWS en zijn daardoor los te testen. De functies daar bouwen de transacties op; de handlers voeren ze uit.

| Stack | Bevat |
| --- | --- |
| `Wijnclub-<omgeving>-Data` | De tabellen uit hoofdstuk 2 |
| `Wijnclub-<omgeving>-Inloggen` | Gebruikerspool, groep `beheer`, client voor de web-app |
| `Wijnclub-<omgeving>-Api` | HTTP API en de Lambda-functies |
| `Wijnclub-<omgeving>-Web` | Bucket, CloudFront, uitrol van de web-app |

In `test` worden tabellen en bucket weggegooid als je de stack verwijdert. In `prod` blijven ze staan.

### Afhankelijkheden

Alle versies staan vast. De Lambda-functies gebruiken alleen `boto3`, dat in de runtime zit; er is dus geen Docker nodig om uit te rollen.

| Pakket | Versie | Waarvoor |
| --- | --- | --- |
| `aws-cdk-lib` | 2.255.0 | Omgeving als code |
| `constructs` | 10.6.0 | Hoort bij CDK |
| `aws-cdk` (npm, via `npx`) | 2.1149.0 | Het programma `cdk` |
| `react`, `react-dom` | 19.3.1 | Web-app |
| `vite` | 8.3.5 | Bouwen van de web-app |
| `@vitejs/plugin-react` | 6.2.1 | Bouwen van de web-app |
| `typescript` | 7.0.2 | Typecontrole van de web-app |
| `@types/react`, `@types/react-dom` | 19.3.0 | Typecontrole van de web-app |
| `lucide-react` | 1.68.0 | Iconen, dezelfde als in het ontwerp |
| `@fontsource/barlow-condensed` | 5.3.0 | Lettertype, vanaf het eigen domein in plaats van Google Fonts |
| `pytest` | 9.2.0 (8.4.2 op Python 3.9) | Tests |
| `boto3` | 1.44.6 (1.42.97 op Python 3.9) | Alleen lokaal, voor tests |

Van de web-app is steeds de nieuwste versie gekozen die minstens twee weken oud was. `npm audit` meldde bij het vastleggen geen kwetsbaarheden.

Komt er later een pakket bij dat niet in de runtime zit, zoals Powertools, dan gaat dat als Lambda-laag mee.

## 8. Wat de opzet bevat

| Onderdeel | Staat | Hoort bij |
| --- | --- | --- |
| Zes tabellen met indexen | Gebouwd | Week 3 |
| Gebruikerspool met code per e-mail | Gebouwd | Week 3 |
| HTTP API met `GET /api/aanbod` | Gebouwd | Week 3 en 4 |
| Bucket, CloudFront, uitrol van `app/dist` | Gebouwd | Week 3 |
| Regels voor geld, bestelling en bieding, met tests | Gebouwd | Week 5 en 6 |
| Regels voor betalen bij het bestellen en levering (V4), met tests in `domein/bestelling.py`: 15 minuten houdtijd voor een bestelling van de lijst en 48 uur namens een lid of na een bieding, één betaling per bestelling, bijbestellen als nieuwe bestelling, verlopen met de voorraad terug, brengen of halen controleren tegen wat de lijst aanbiedt en of het lid een adres heeft, de levering van een lijst controleren, en levering kiezen na een gewonnen bieding. `GET /api/aanbod` geeft de levering van de lijst mee. Deze regels vervangen die voor afhaalpunten en één betaling per lid per lijst | Gebouwd | Week 5 |
| Regels na de review van 19 november: dubbele betaling herkennen, alle betalingen meewegen op de termijn, een herhaalde bestelpoging herkennen, een botsing in de tijd onderscheiden van uitverkocht, bovengrens op een bod, niet jezelf overbieden, bieding sluiten en bestelling schrijven in één transactie. Met tests; de handlers die ze uitvoeren zijn er nog niet | Gebouwd | Week 5 en 6 |
| Regels voor het herkennen van een bericht (`domein/herkennen.py`): vraag aan het model en controle van het antwoord, met tests op een nagebootst model. De handler, de koppeling met Bedrock en de test met twintig echte berichten zijn er nog niet | Gebouwd | Week 4 |
| Een etiket lezen en een tekst voorstellen: `domein/etiket.py` en `domein/tekst.py` met tests op een nagebootst model, `POST /api/beheer/etiket` en `POST /api/beheer/teksten`, de uploadlink voor foto's, het veld `tekstBron`, de rechten op het ene model in Bedrock en de map met uploads, en de test met twintig etiketten en tien sets steekwoorden | Nog niet | Week 4 |
| Lijst sluiten, de taak die onbetaalde bestellingen laat verlopen, herinnering na 24 uur bij een bestelling namens een lid of een gewonnen bieding | Nog niet | Week 5 en 7 |
| Brengen en halen per lijst in beheer, afleveradres van een lid, paklijst voor afleveren, herinnering "nog beschikbaar" | Nog niet | Week 4 en 7 |
| Overige API-aanroepen | Nog niet | Week 4 tot en met 7 |
| Koppeling met Mollie | Nog niet | Week 5 |
| Taken in EventBridge Scheduler | Nog niet | Week 5 en 6 |
| Meldingen | Nog niet | Week 7 |
| Tellingen voor de roadmap: tabel `weergaven`, veld `verlengd`, `GET /api/beheer/tellingen` | Nog niet | Week 6 en 7 |
| Meting per melding: tabellen `berichten` en `tikken`, `POST /api/mijn/tikken`, `POST /api/beheer/berichten` | Nog niet | Week 7 |
| Web-app: klikbaar prototype van de schermen uit `design-v4`, aangevuld uit `design-v3` waar V4 niets tekent. Leden: inloggen in vijf stappen met Face ID en terugkomen, aankondiging, de avond als live feed, wijn, de bon met brengen of halen, betalen via een nagebootste betaalpagina, betaald, niet betaald en vervallen, bijzondere fles, de veiling met biedlog, biedpaneel, eenmaal andermaal, hamerslag met terugblik, je bestellingen, Marc. Beheer: de avond, nieuwe fles (camera, nakijken, lijst of veiling, klaar), afleveren, namens een lid. Verder de toestanden. Met voorbeeldinhoud en proefacties. Alles staat in de browser (`app/src/staat.tsx`); er gaat niets naar de API, en "live", de betaalpagina van Mollie en het lezen van het etiket zijn nagebootst | Gebouwd | Week 4 |
| Web-app: echt inloggen via Cognito met code en passkey, koppeling met de API, betalen via Mollie, foto's uploaden, het etiket en het bericht laten lezen door het taalmodel, spraakbericht | Nog niet | Week 4 tot en met 7 |
| Web-app: eisen voor de telefoon uit hoofdstuk 10. Het prototype voldoet aan M1, M2 en M6 en deels aan tien andere; de stand per eis staat in dat hoofdstuk | Deels | Week 4 tot en met 7 |
| Web-app: manifest en een voorlopig icoon voor het beginscherm (`app/public/manifest.webmanifest`, `app/public/iconen/`). Geen service worker | Gebouwd | Week 4 |
| Browsertests op telefoonformaat tegen het prototype: `tests/web`, Playwright in pytest, op 375 × 667 en 320 × 568 px, en een eigen stap in de pipeline (`controles.yml`, job `telefoon`). Ze meten M1, M2, M4 (de bon en het biedpaneel), M5, M6, M9 en M10, en lopen de stromen van V4 door: inloggen, bestellen en betalen, niet betaald en vervallen, terugkomen met Face ID en een nieuwe fles klaarzetten | Gebouwd | Week 4 |
| End-to-end-tests tegen de teststack en de handtest op echte telefoons (M14) | Nog niet | Week 4 tot en met 7 |

## 9. Open punten

- **Gebruikers zonder wachtwoord.** De documentatie zegt dat een beheerder gebruikers zonder wachtwoord kan aanmaken. Of zo'n gebruiker direct met een code kan inloggen, zonder tussenstap, is niet letterlijk bevestigd. Test dit als eerste in week 3.
- **Eigen gegevens bij een Mollie-betaling.** Het ontwerp gebruikt de tabel `betalingen` en is niet afhankelijk van het veld `metadata` van Mollie, omdat de werking daarvan niet letterlijk is nagelezen.
- **Dubbele betaling voorkomen.** Of Mollie een sleutel ondersteunt om een dubbel aangemaakte betaling te voorkomen, is niet gevonden. Het ontwerp vangt dit op door per betaalpoging een rij in `betalingen` te schrijven.
- **Betalen bij het bestellen.** Besloten op 20 november 2026, met ontwerp V4: het lid betaalt meteen, per bon, en Marc houdt de flessen 15 minuten vast. Dat maakt bestellen een stap langer dan een bericht in WhatsApp. Of leden afhaken bij het betalen, laat de pilot zien: hoeveel bonnen vervallen. Of 15 minuten past bij de tijd die een lid in de app van zijn bank nodig heeft, is een schatting; test het in week 5 op echte telefoons.
- **Bovengrens op een bod.** Een bod mag hoogstens drie keer het minimum zijn. De factor drie is een keuze van de bouwer na de review, geen wens van Marc. Hij staat op één plek in `domein/bieding.py` en in `app/src/staat.tsx`. Vraag Marc of dit past bij hoe er nu geboden wordt.
- **Jezelf overbieden.** De hoogste bieder kan niet opnieuw bieden tot hij overboden is. Komt er later een maximaal bod waarbij de app namens het lid meebiedt (roadmap), dan moet deze regel opnieuw bekeken worden.
- **Een bestelling annuleren.** Een bestelling wordt nooit gewijzigd. Vergist een lid zich op de bon, dan betaalt het niet en vervalt de bon na 15 minuten. Een betaalde bestelling kan alleen Marc terugdraaien, met een terugbetaling in Mollie; de voorraad komt dan niet vanzelf terug. Een bestelling namens een lid houdt de voorraad 48 uur vast, en ook Marc kan dat nu niet eerder vrijgeven. Vraag Marc of hij in beheer een open bestelling wil kunnen annuleren, met de voorraad terug. Dat is dan een nieuwe status `geannuleerd` en een aanroep onder `/api/beheer`.
- **Wie niet betaalt.** Een bon van de lijst vervalt na 15 minuten en de flessen zijn meteen weer te bestellen; Marc krijgt geen bericht. Een bestelling namens een lid en een gewonnen fles vervallen na 48 uur, met bericht aan Marc. Of Marc dat wil, of liever zelf beslist per lid, moet hij aangeven.
- **Meldingen op de iPhone.** Werken alleen als de app op het beginscherm staat. De precieze eisen moeten in week 7 nagezocht worden.
- **Bedrock.** Welk model en of het in de gekozen regio beschikbaar is, wordt in week 4 gekozen. Het model moet ook een foto kunnen lezen en goed Nederlands schrijven. Begin met een klein model, zoals Claude Haiku 5.5, en stap alleen over als de test met twintig etiketten en tien sets steekwoorden tegenvalt. Zoek op of het model in de EU draait of alleen via inferentie over meerdere regio's in de EU, wat Bedrock daarvoor rekent, en of het een abonnement in AWS Marketplace vraagt. Dat laatste is een handeling in het gedeelde account; vraag Aidan eerst.
- **Stijl van de tekstvoorstellen.** Aidan levert de stijl aan op basis van Marcs omschrijvingen in WhatsApp. Tot dan staat in `domein/tekst.py` een neutrale beschrijving. Vraag Marc of voorbeelden van zijn berichten in de openbare repository mogen; zo niet, dan staat er alleen een beschrijving.
- **Nieuwe woorden markeren.** Of het markeren van woorden die niet van Marc komen in het Nederlands goed genoeg werkt, bijvoorbeeld bij "fris" en "frisse", moet de test met tien sets steekwoorden uitwijzen. Werkt het niet, vergelijk dan op de stam van een woord.
- **Tekstvoorstellen in het ontwerp.** Design-v4 tekent nog niet waar Marc steekwoorden geeft en uit drie voorstellen kiest. Het hoort bij scherm 16, nakijken. Aidan levert het ontwerp.
- **Rijen automatisch verwijderen.** `weergaven` en `tikken` gaan ervan uit dat DynamoDB een rij verwijdert op het tijdstip in `vervaltOp`. Dat is uit het hoofd opgeschreven en niet nagelezen. Zoek bij het bouwen in week 6 op hoe het werkt en hoe snel na het tijdstip de rij echt weg is.
- **Grondslag voor de tellingen.** Of het vastleggen van welk lid welke bieding opende of op welke melding tikte onder het gerechtvaardigd belang van Marc valt, of toestemming vraagt, hoort bij de juridische check.
- **Web-app.** Gekozen: React met Vite. Het ontwerp in pen.dev is de bron voor de schermen; het prototype blijft de bron voor het gedrag.
- **Waar het prototype afwijkt van design-v4.** Op 20 november 2026 koos Aidan om V4 te volgen, ook waar het van het plan afweek; het plan en dit document zijn daarop aangepast. Wat nu nog afwijkt, staat in `design-v4/DESIGN.md` onder "Hoe het prototype afwijkt van de schermen": de min- en plusknop naast de flessen (zie de flessenrij hieronder), verzonnen leden en adressen in plaats van de namen in de schermen, Marcs woorden als voorbeeld gemarkeerd, een nagebootste camera en herkenning, en tekstlinks tussen de beheerschermen ("+ NIEUWE FLES", "AFLEVEREN →", "← DE AVOND"), omdat V4 daar geen weg tekent.
- **Nog niet getekend in design-v4.** Je bestellingen, de pagina van Marc met voorwaarden en privacy, het adres invullen of wijzigen, brengen voor een lid zonder adres, betaling mislukt en een vervallen bon (het prototype gebruikt de stijl van scherm 10), AFGELOPEN. voor wie de veiling niet won, brengen of halen kiezen na een gewonnen fles, nee bij 18 jaar of ouder, een bestelling namens een lid in de stijl van V4, en een avond plannen met de momenten van brengen en halen. Het prototype heeft voor deze schermen een eigen invulling; Aidan levert de ontwerpen.
- **Mijn flessen en bewaren zijn uit de pilot.** Besloten op 19 november 2026: de pilot gaat alleen over verkopen en bieden. Scherm 12 uit `design-v3` (mijn flessen: tellers, in bewaring, eerder gekocht met een oordeel) en de keuze BEWAAR op scherm 11 zijn niet meer gebouwd. In het prototype staat daarvoor in de plaats het scherm Je bestellingen (`#/mijn-bestelling`): wat je besteld of gewonnen hebt en de status. Je komt er via de terugblik na de avond; er is geen tabbalk meer. Het oude adres `#/flessen` opent Je bestellingen. De eigen collectie is onderwerp 14 op de roadmap van het plan, bewaren onderwerp 9.
- **Kleur, land en korte naam van een wijn.** Design-v4 toont bij een wijn de kleur en het land ("WIT · SPANJE") en noemt hem in gebeurtenissen en op de bon bij een korte naam. Het prototype gebruikt daarvoor de velden `kleur`, `land` en `korteNaam`, en voor de flessenrij `partij`: het aantal flessen waarmee de wijn op de lijst kwam. Geen van de vier staat nog in `wijnen` of in `GET /api/aanbod`. Of de herkenning ze uit het etiket of het bericht haalt, of Marc ze invult, is nog niet gekozen.
- **Het adres invullen door het lid zelf.** Nu zet alleen de groep `beheer` het afleveradres, via `POST /api/beheer/leden` en `PUT /api/beheer/leden/{lidId}/adres`. Design-v4 tekent nog niet hoe een lid zijn adres invult of wijzigt, of wat er gebeurt als een lid zonder adres op BRENG tikt. De aanroep is `PUT /api/mijn/profiel` met `adres` (hoofdstuk 5); het scherm ontbreekt nog.
- **De momenten van brengen en halen.** De API en het prototype vragen per lijst een begin- en eindtijd, `van` en `tot`, en bij halen `waar`. Design-v4 toont alleen een moment in woorden ("Ik breng ze donderdagavond", "Jij haalt ze zaterdag op"), en het scherm om een avond te plannen is nog niet getekend. Of Marc een tijdvak opgeeft of alleen een dag, volgt uit dat ontwerp.
- **Etiket lezen.** Besloten op 20 november 2026: het etiket lezen en tekstvoorstellen komen in de pilot, in week 4, met een eigen aanroep naast `POST /api/beheer/herken`. Zie hoofdstuk 5, "Een etiket lezen" en "Een tekst voorstellen". Het bericht blijft de bron voor aantal en prijs.
- **Ik ben onderweg.** Bij afleveren stuurt Marc met één tik een melding aan de leden die hij gaat brengen. Die melding staat nog niet bij de soorten in `berichten` en heeft nog geen aanroep onder `/api/beheer`.
- **Passkey ("Face ID").** Design-v4 biedt na de eerste login een passkey aan, en wie die koos, komt terug met "Welkom terug". Hoofdstuk 6 noemt alleen de code per e-mail. Zoek in week 3 op hoe Cognito een passkey als eerste factor ondersteunt en wat dat vraagt van het plan van de gebruikerspool, en leg het daarna vast in hoofdstuk 6. Een passkey voor de groep `beheer` staat ook bij punt B3 van onderwerp 15 op de roadmap van het plan.
- **Open beslissingen uit design-v3.** Het ontwerp wijkt op vijf punten bewust af van het plan en vraagt die met een instelling te bouwen. In het prototype: (1) *Rust*: live-stip, NET OP TAFEL en de klok in de laatste twee minuten staan aan en zijn samen uit te zetten in de voorbeeldbalk; (2) *Wie bood*: bijnamen als "Bieder 7" staan aan en zijn uit te zetten, dan toont de biedlog alleen bedragen en tijden. Nog een vraag voor de jurist; (3) *Live*: zie hieronder; (4) *Rol van Marc*: hij zet tijdens de avond wijnen op tafel en stuurt berichten (scherm 15). Een nieuwe wijn komt daarom eerst klaar te staan en is pas te koop als hij op tafel ligt. Zonder Marc op de avond zou een wijn op de begintijd vanzelf op tafel moeten komen; dat is nog niet gebouwd; (5) *Lijst sluiten*: op de eindtijd, of eerder met SLUIT DE AVOND. In het prototype sluit de avond alleen met de knop; op de eindtijd sluiten volgt met de API. De veiling opent wel vanzelf op de begintijd en de hamer valt vanzelf op de eindtijd.
- **De veiling loopt altijd, alleen in het prototype.** Om bieden te kunnen testen zonder op de avond te wachten, heeft de voorbeeldbalk onder "Voor het testen" de instelling "De veiling loopt altijd". Die staat aan: er staat altijd een veiling open, ook vóór en na de avond, en valt de hamer, dan begint er een nieuwe ronde met dezelfde voorbeeldfles onder een eigen nummer. De afgelopen ronde blijft staan, met de winnaar, de betaling en brengen of halen. Uit: de veiling begint op de avond, zoals het plan. Dit is geen regel van de club en geen open beslissing; het verdwijnt met de voorbeeldbalk zodra de web-app aan de API hangt. Wil Aidan dit ook in de teststack met de echte API, dan is dat een aparte taak die alleen in `test` biedingen aanmaakt.
- **Live bijwerken.** Design-v3 vraagt nieuwe wijnen, berichten en voorraad binnen 2 seconden en de stand van de veiling binnen 1 seconde. Het plan heeft dat nog niet. Voorstel van het ontwerp: een WebSocket API in API Gateway met Lambda, gevoed door DynamoDB Streams, of voor de pilot pollen elke 3 seconden zolang het scherm zichtbaar is. Het bod zelf blijft een gewone aanroep met de voorwaardelijke schrijfactie. Naar schatting een week extra bouwtijd. Aidan kiest; tot dan bootst het prototype het na in de browser.
- **Marcs portret en foto's.** Het ontwerp toont Marcs portret als avatar bij elk bericht en een sfeerfoto van zijn site op de aankondiging. Het prototype gebruikt zijn portret van marckookt.com (`app/public/marc/portret.jpg`, 360 × 424 px) als avatar en op zijn pagina; Marc levert nog een groter origineel. Op de aankondiging staat zijn sfeerfoto van dezelfde site (`app/public/marc/sfeer.jpg`); Marc levert nog twee of drie eigen sfeerfoto's voor aankondigingen. De berichten van Marc in de feed, de biedlog, de snelle zinnen en de aantallen leden zijn verzonnen en als voorbeeld gemarkeerd.
- **Foto's uploaden.** In het prototype opent de sluiter de camera van de telefoon (`capture="environment"`) en blijft een gemaakte of gekozen foto in de browser. In de echte app gaat de upload via een vooraf ondertekende S3-URL, alleen voor de groep `beheer`, met een vaste lijst bestandstypen en een maximale grootte, en de app toont de foto pas na controle aan de serverkant; zie "Uploads zijn een risico" in hoofdstuk 5. Een bestand van een gebruiker is een risico; neem dit mee in de review van week 4. De foto gaat ook naar het taalmodel in Bedrock; dat hoort bij de juridische check.
- **De flessenrij op de telefoon.** Twaalf flessen van 44 px passen niet naast elkaar op een telefoon. Design-v4 laat je op de flessen tikken, en dat kan in het prototype ook. Een fles is alleen te smal om zeker met een duim te raken, dus de min- en de plusknop van 44 × 44 px blijven de echte bediening, en voor een schermlezer is de rij een tekening. Zo staat het ook in `design-v4/DESIGN.md`. Aidan en Marc beslissen of de knoppen blijven; daarna moet het ontwerp worden aangepast.
- **Andere aanpassingen voor de telefoon die van het ontwerp afwijken.** De foto van een wijn en de poster van een bijzondere fles zijn niet vast 430 en 640 px hoog, maar schalen mee met de hoogte van het scherm. In het biedpaneel staat naast Bevestig een knop om te stoppen. Op een lage telefoon is de bon compacter, zodat brengen of halen, het totaal en Betaal zonder scrollen in beeld staan (M4). Het ontwerp moet hierop worden aangepast, of het prototype als Aidan en Marc anders kiezen.
- **Spookwoorden in koppen.** Een deel van een grote kop staat in `--ghost` met een contrast van 1,4:1. In het prototype van 20 november 2026: "Namens" bij een bestelling namens een lid, de dag van de avond in beheer ("van dinsdag"), "Niets open." en de kop van een vervallen bon. Dat is het beeldmerk van het ontwerp, maar de woorden horen bij de kop en halen M5 niet. Kies: lichter grijs (minstens 3:1), of de eis voor deze woorden laten vallen.
- **Voorlopig icoon.** Het icoon voor het beginscherm is een gouden W op zwart, getekend zonder Marcs logo. Vervang het zodra Marc het logo aanlevert.
- **De link uit WhatsApp en de app op het beginscherm.** Uit het hoofd opgeschreven en niet nagezocht: op een iPhone opent een link uit WhatsApp in de browser en niet in de app op het beginscherm, en die twee delen mogelijk geen login. Een lid dat de app heeft geïnstalleerd, zou dan na een tik op Marcs link opnieuw moeten inloggen. Zoek dit op en test het op een echte iPhone en een echte Android-telefoon vóór de eerste uitnodiging; het bepaalt of "zet de app op je beginscherm" de juiste tip is.
- **Terug van de bank.** Ook niet nagezocht: na betalen in de app van de bank komt het lid terug in de browser, mogelijk niet in de app op het beginscherm en mogelijk zonder login. Het scherm na betalen moet dan ook zonder login iets zinnigs tonen, zonder persoonsgegevens, en de status moet kloppen zodra het lid de app weer opent. Test dit in week 5 met Mollie in testmodus op echte telefoons.
- **Zichtbare hoogte in de browser.** De maat 375 × 667 px in hoofdstuk 10 is een schatting van wat een gangbare telefoon in de browser overhoudt met de adresbalk in beeld. Meet dit na op echte toestellen en pas de maat aan als hij niet klopt.
- **Lokale Python.** Op de machine waarop deze opzet is gemaakt staat Python 3.9, dat niet meer wordt ondersteund. De code en de tests werken ermee, maar pip installeert er oudere versies van pytest en boto3 op, met bekende kwetsbaarheden (pytest: PYSEC-2026-1845; urllib3 1.26, via boto3: meerdere). Die draaien alleen lokaal en komen niet in Lambda. Installeer Python 3.14: dan lopen de versies gelijk met Lambda en zijn de kwetsbaarheden weg. De tests zijn alleen op 3.9 gedraaid.

## 10. Eisen voor de telefoon

Vrijwel elk lid gebruikt de app op zijn telefoon: de link komt uit de WhatsApp-groep. De telefoon is daarom het uitgangspunt en geen variant. De eisen gelden voor elk scherm, ook voor beheer, en zijn zo geschreven dat je ze kunt meten. Maten zijn CSS-pixels.

Er zijn twee referentiematen, beide staand. **375 × 667 px** is de maat waarop alles moet kloppen: een kleine iPhone, en naar schatting ook wat een grotere telefoon in de browser overhoudt met de adresbalk in beeld. **320 × 568 px** is de ondergrens: daar mag je meer moeten scrollen, maar alles blijft bruikbaar.

| Nr | Eis | Hoe je het toetst |
| --- | --- | --- |
| M1 | **Schermmaat.** Elk scherm werkt van 320 tot 430 px breed, zonder horizontaal scrollen. Boven 430 px blijft de app één gecentreerde kolom | Browsertest op beide referentiematen: de pagina is niet breder dan het scherm |
| M2 | **Tikvlakken.** Alles wat je kunt aantikken is minstens 44 × 44 px. Tussen twee tikvlakken naast elkaar zit minstens 8 px, of ze zijn samen één vlak | Browsertest meet elk bedienbaar onderdeel |
| M3 | **Eén hand.** De hoofdknop staat onderaan. Een paneel sluit ook met een knop onderaan of door omlaag te vegen, niet alleen met het kruisje rechtsboven. De vaste onderkant neemt op 375 × 667 px hoogstens een kwart van de hoogte in | Browsertest meet de onderkant; de rest in de handtest |
| M4 | **Zonder scrollen in beeld** op 375 × 667 px, boven de vaste onderkant. Aanbod: de eerste wijn met naam, prijs en flessenrij. De bon: het totaal, brengen of halen, en de knop Betaal. Bijzondere fles: het hoogste bod en de eindtijd. Biedpaneel: het gekozen bod, de melding dat het bindend is en de knop Bevestig. Je bestellingen: wat je nog moet betalen. Op 320 × 568 px staat in het biedpaneel de knop Bevestig nog steeds in beeld | Browsertest per scherm |
| M5 | **Leesbaar.** Lopende tekst is minstens 16 px, een label in hoofdletters minstens 13 px. Tekst die je moet kunnen lezen heeft een contrast van minstens 4,5:1, of 3:1 vanaf 24 px. Dat geldt ook voor een keuze die nog niet gekozen is en voor een jaargang of bedrag. Alleen versiering mag lichter, en is dan verborgen voor schermlezers | Browsertest meet grootte en contrast; de handtest buiten in daglicht |
| M6 | **Invoer.** Een veld heeft tekst van minstens 16 px, zodat een iPhone niet inzoomt. Elk veld vraagt het juiste toetsenbord: cijfers voor een code, een aantal of een bedrag. De code uit de e-mail kun je plakken en laten invullen door de telefoon. Een lid hoeft niets te typen om te bestellen of te bieden | Browsertest op de kenmerken van elk veld |
| M7 | **Inzoomen en grote tekst.** Inzoomen is niet geblokkeerd. Met de tekstgrootte van de telefoon op de grootste stand blijft elke stroom bruikbaar: niets valt weg of over elkaar | Handtest |
| M8 | **Veilige randen.** Niets wat je moet lezen of aantikken valt onder de inkeping, de statusbalk of de veegbalk onderaan, ook niet als de app schermvullend vanaf het beginscherm draait. Dat geldt boven en onder, ook in een paneel | Handtest op een iPhone, vanaf het beginscherm |
| M9 | **Terugknop en vegen.** De terugknop of het teruggebaar van de telefoon sluit eerst een open paneel en gaat daarna naar het vorige scherm. Vegen in het biedpaneel scrolt de pagina niet mee en ververst de pagina niet | Browsertest voor terug; handtest voor vegen |
| M10 | **Geen vergissing.** Vóór Betaal en Bevestig bod staan aantal, bedrag en brengen of halen in beeld. De knop werkt één keer: dubbel tikken of een trage verbinding geeft één bestelling, één bod of één betaling. Een stap in beheer die niet terug te draaien is, zoals de lijst sluiten, vraagt een bevestiging | Browsertest met dubbel tikken; integratietest op de API |
| M11 | **Onderbreking.** Het mandje, de keuze brengen of halen en een half ingevulde login blijven staan na herladen en na wisselen naar een andere app en terug, ook naar de app van de bank. Komt het lid terug in de app, dan zijn voorraad en hoogste bod binnen twee seconden ververst | Browsertest met herladen; handtest met wisselen van app |
| M12 | **Trage verbinding.** Elk scherm heeft een toestand voor laden en voor "het lukte niet, probeer opnieuw". Op een gemiddelde telefoon met 4G staat de kaart er binnen drie seconden. Een foto is niet groter dan nodig voor het scherm en hoogstens 150 kB, heeft vaste afmetingen zodat de pagina niet verspringt, en laadt pas als hij in beeld komt | Lighthouse in de pipeline, met de instelling voor mobiel |
| M13 | **Op het beginscherm.** De app heeft een manifest met naam en iconen en opent schermvullend en staand. De app werkt ook volledig in de browser, zonder installeren. Een link uit WhatsApp, een melding of een e-mail opent het juiste scherm | Handtest op iPhone en Android |
| M14 | **Testen.** De end-to-end-tests draaien op beide referentiematen. Elke release wordt met de hand nagelopen op een echte iPhone, in Safari en vanaf het beginscherm, en op een echte Android-telefoon in Chrome. De bestelstroom wordt één keer per release met de schermlezer doorlopen: VoiceOver en TalkBack | Pipeline en een afvinklijst per release |

### Stand van het prototype op 20 november 2026

Het prototype in `app/` volgt sinds 20 november 2026 `design-v4`. De browsertests in `tests/web` zijn die dag gedraaid op 375 × 667 en 320 × 568 px, tegen de gebouwde app in `app/dist`: 35 tests, alle geslaagd. De maten bij M4 zijn daarna met de hand nagemeten in dezelfde browser, op 375 × 667 px. Het gaat om een nagebootst telefoonscherm, geen echte telefoon: vegen, het toetsenbord, de schermlezer, Face ID en de app op het beginscherm zijn niet getest. De stand van 19 november, met design-v3, staat in de geschiedenis van dit bestand.

| Nr | Stand | Bevinding |
| --- | --- | --- |
| M1 | Voldoet | Geen horizontaal scrollen op 320 en 375 px breed, op elk scherm dat de browsertests openen: de stappen van het inloggen en terugkomen, de aankondiging, de avond, de bon, betaald, Je bestellingen, Marc, de avond in beheer, elke stap van een nieuwe fles, afleveren en namens een lid |
| M2 | Voldoet | Elk tikvlak op die schermen is minstens 44 × 44 px. Kiezen gaat met een min- en een plusknop van 44 × 44 px; op de flessen tikken kan ook, maar is niet de bediening die de eis haalt. De ruimte van 8 px tussen twee tikvlakken meet de test niet; die is op 19 november nagemeten. De gouden voorbeeldbalk telt niet mee; die verdwijnt in de echte app |
| M3 | Deels | Er is geen tabbalk meer. De hoofdknop staat onderaan, ook in beheer. De vaste onderkant van de bon is 90 px: 13% van 667 px. Het biedpaneel heeft onderaan een knop om te stoppen, naast Bevestig. Een gewoon paneel sluit met het kruisje in de kop van het paneel, een tik ernaast of de terugknop van de telefoon, maar niet met een knop onderaan of door omlaag te vegen |
| M4 | Deels | Gemeten op 375 × 667 px, na "Spring naar de lopende avond" in de voorbeeldbalk. De bon: het totaal staat op 216 tot 263 px, brengen of halen op 358 tot 463 px, en Betaal op 589 tot 651 px in de vaste onderkant vanaf 577 px. Biedpaneel: het gekozen bod en Bevestig staan in beeld, ook op 320 × 568 px. Beide bewaakt een browsertest. Aanbod: de eerste wijn in de feed is uitverkocht en staat met naam en prijs in beeld (214 tot 412 px); van de eerste wijn die te koop is, staan de flessenrij en de plusknop onder de vouw (680 tot 750 px). Bijzondere fles en Je bestellingen zijn niet opnieuw gemeten |
| M5 | Deels | Alle geteste schermen halen de eis op tekstgrootte en contrast, ook de nieuwe schermen van V4. De overtredingen van 19 november (het label "Startbod", de afzender bij een bericht van Marc, een uitverkochte wijn in de avond) meldt de test niet meer. Uitzondering blijven de spookwoorden in grote koppen (1,4:1, zie de open punten); de browsertests slaan ze voorlopig over. De zaal van de veiling wordt niet gemeten |
| M6 | Voldoet | Alle velden hebben tekst van 16 px of meer en het juiste toetsenbord. Het e-mailadres heeft `autocomplete="email"`, de code `inputmode="numeric"` en `one-time-code`, en na de code gaat het lid vanzelf verder. Bestellen en bieden gaan zonder typen |
| M7 | Deels | Inzoomen is niet geblokkeerd. Alle maten zijn vaste pixels; grote tekst is niet getest |
| M8 | Deels | De app, de melding en het biedpaneel houden boven rekening met de inkeping, en de onderkant en de panelen onder met de veegbalk. Niet getest op een echte iPhone |
| M9 | Deels | De terugknop sluit eerst een open paneel; getest in de browser. De ladder heeft `touch-action: none` en een paneel `overscroll-behavior: contain`, zodat vegen de pagina niet meeneemt. Het vegen zelf is niet op een echte telefoon getest |
| M10 | Deels | Betaal werkt pas als brengen of halen gekozen is, en brengen of halen, het totaal en Betaal staan samen in beeld. Dubbel tikken op Betaal geeft in het prototype één bestelling (`test_dubbel_tikken_geeft_een_bestelling`). Een bod vraagt een bevestiging met het bedrag. De avond sluiten vraagt een bevestiging die zegt dat het niet terug te draaien is. Tegen de API is dubbel tikken nog niet te toetsen |
| M11 | Deels | Het mandje, de keuze brengen of halen en een bon die nog niet betaald is, overleven herladen (opslag in de browser, per tabblad); de bon vervalt daarna gewoon op zijn tijd (`test_niet_betaald_en_vervallen`). Het inloggen begint na herladen weer bij het e-mailadres. In de echte app opnieuw toetsen, ook na het sluiten van de app en na de app van de bank. Verversen bij terugkomst bestaat nog niet |
| M12 | Nog niet te toetsen | Er is geen API, dus geen toestand voor laden of mislukken. Foto's onder de vouw laden pas als ze in beeld komen. De app laadt vijf gewichten van het lettertype. De foto's van de voorbeeldwijnen zijn 70 tot 90 kB |
| M13 | Deels | Er is een manifest met een voorlopig icoon; de app opent schermvullend en staand. Niet getest vanaf het beginscherm van een echte telefoon. Schermen hebben een eigen adres, ook de drie beheerschermen (`/beheer`, `/beheer/nieuw`, `/beheer/afleveren`). Oude adressen, zoals `#/flessen` en `#/beheer/bestellingen`, openen het scherm dat ervoor in de plaats kwam. Wat een link uit WhatsApp doet, staat bij de open punten |
| M14 | Deels | De browsertests in `tests/web` draaien bij elke pull request op beide referentiematen, tegen het prototype in `app/dist`. Ze lopen door: inloggen met en zonder Face ID, terugkomen met Face ID (`test_terugkomen_met_face_id`), bestellen en meteen betalen, een betaling die mislukt en een bon die vervalt (`test_niet_betaald_en_vervallen`), dubbel tikken, Je bestellingen, een bod met bevestiging, de veiling die altijd loopt, een paneel met de terugknop, en een nieuwe fles klaarzetten (`test_nieuwe_fles`). Op elk scherm meten ze tikvlakken, horizontaal scrollen, contrast en tekstgrootte. Bieden is te testen doordat er in het prototype altijd een veiling loopt (zie de open punten); de zaal zelf wordt nog niet gemeten. Tegen de teststack en op echte telefoons is nog niets getest |
