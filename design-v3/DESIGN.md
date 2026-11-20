# Design: Marc Kookt Wijnclub (V3, "Vanavond bij Marc")

Ontwerp voor de pilot uit `../pilotplan-marcs-wijnclub.md`. Dit document en de map `schermen/` zijn samen de specificatie voor de bouw van de web-app.

**Wat waar wint**

- **Functie, regels, data en beveiliging:** het pilotplan.
- **Uiterlijk, opmaak en interactie:** dit document en de schermen.
- **Afwijkingen:** waar V3 bewust van het plan afwijkt, staat dat onder "Open beslissingen". Bouw die punten zoals hier beschreven, maar zo dat ze met een instelling uit kunnen.
- **Tegenstrijdig of niet beschreven:** vraag het na, niet gokken.

## Inhoud van deze map

| Pad | Wat |
| --- | --- |
| `DESIGN.md` | Dit document |
| `schermen/01…16-*.png` | Elk scherm op 2× (780 px breed). Het ontwerp is 390 px breed |
| `referentie/schermen.html` | Automatische HTML/CSS-export van dezelfde schermen. Alleen als maatreferentie, niet als code overnemen: alles is absoluut gepositioneerd |
| `referentie/images/marckookt/` | Echte foto's en logo's van Marc (marckookt.com) en de foto van de Cándido uit zijn WhatsApp-groep |
| `referentie/images/generated-*.png` | Gegenereerde voorbeeldfoto's. Vervangen door Marcs eigen foto's |
| `referentie/marc-wijnclub.pen` | Het bronbestand, te openen in pen.dev. Alleen de frames met `V3 –` in de naam en de V2-frames uit de schermenlijst hieronder gelden. `V2 – Aanbod (de kaart)` is vervangen door `V3 – De avond`. V1 (`Pilot –`) en de roadmapschermen (`Na de pilot –`) gelden niet |

## Bouwopdracht in het kort

Bouw een mobile-first web-app (PWA) die er op een telefoon uitziet zoals de zestien schermen in `schermen/`. Op een groter scherm blijft de app een kolom van maximaal 430 px, gecentreerd op zwart.

De stack, de gegevens en de regels staan in het pilotplan (React op S3/CloudFront, Cognito, Lambda, DynamoDB, Mollie). V3 voegt live bijwerken toe; zie "Live en realtime".

## Ontwerpidee

Elk aanbod is **een avond bij Marc**, zoals nu in zijn WhatsApp-groep: hij kondigt hem aan, zet de wijnen een voor een op tafel, zegt er iets bij, en de leden zien de avond gebeuren. De bijzondere fles gaat aan het eind onder de hamer.

- **Aankondiging:** wat er vanavond op tafel komt, met een persoonlijk bericht van Marc.
- **De avond:** de lijst als live feed. Een wijn verschijnt pas als Marc hem op tafel zet. Tussendoor staan Marcs berichten en wat er gebeurt ("een lid nam 2 × wijn H", "wijn F is op").
- **De veiling:** een zaal met het hoogste bod groot in beeld, een biedlog waar Marc tussendoor reageert, en aan het eind "eenmaal, andermaal" en de hamerslag.
- **Na afloop:** een terugblik op de avond.

De vormentaal komt uit V2 en blijft gelden:

- reuzenletters per wijn
- flessen kiezen door erop te tikken
- de keukenbon
- zwart, wit, grijs en goud
- Barlow Condensed
- geen schaduwen en geen afgeronde hoeken

## Tokens

### Kleuren

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `--bg` | `#000000` | Achtergrond van alles |
| `--surface` | `#111111` / `#141414` | Terugblik, de balk "straks" |
| `--ink` | `#FFFFFF` | Tekst, hoofdknop, gekozen fles, bon |
| `--muted` | `#9A9A9A` | Bijschriften |
| `--event` | `#7A7A7A` | Gebeurtenissen in de feed (13 px, hoofdletters). Contrast 4.6:1 |
| `--dim` | `#8A8A8A` | Inactieve tabs, inactieve tekst. Het ontwerp toont `#6E6E6E`; gebruik `#8A8A8A` voor genoeg contrast |
| `--ghost` | `#262626` / `#2B2B2B` | Spookletters en spookwoorden (ANDERMAAL…, VAN DINSDAG). Alleen decoratief |
| `--ghost-2` | `#3A3A3A` / `#5A5A5A` | Letters in de samenvatting, oudere regels in de biedlog |
| `--line` | `#2B2B2B` | Lijnen tussen secties, randen van de feedkaarten |
| `--line-soft` | `#1E1E1E` | Lijnen tussen rijen, uitverkochte flessen |
| `--outline` | `#6E6E6E` | Rand van een beschikbare fles |
| `--gold` | `#C9A84C` | Live-stip, tijden, "MARC · 19:52", NET OP TAFEL, OVERBODEN, JIJ BENT DE HOOGSTE, VERKOCHT., de iDEAL-knop, de live-balk van Marc. Marc levert de exacte waarde |
| `--paper` | `#FFFFFF`, tekst `#000000`, bijschrift `#555555` | De bon |
| `--ok` | `#2F6B45` op papier | Stempel BETAALD |
| `--grey-btn` | `#4A4A4A` | Secundaire knop |

### Typografie

Eén familie: **Barlow Condensed** (Google Fonts), met de gewichten 300, 400, 500, 600 en 700 en de cursief van 300 voor "Marc typt…". De familie staat in één variabele: Marc kan nog kiezen voor DIN Pro Condensed.

| Rol | Grootte / regelhoogte | Gewicht | Overig |
| --- | --- | --- | --- |
| Eventkop (VANAVOND BIJ MARC., EENMAAL, ANDERMAAL…, VER-KOCHT.) | 76–120 / 0.82–0.86 | 700 | letter-spacing −2 tot −3px. Moet op 390 px binnen de marges passen |
| Reuzenletter | 120–190 / 0.8 | 700 | Wordt bijgesneden door zijn vak |
| Hero-bedrag (€ 360, € 410) | 112 / 0.85 | 700 | Het €-teken op 28 in `--muted` |
| Masthead (DE AVOND) | 88 / 0.86 | 700 | |
| Prijs in de feed | 30 / 1 | 700 | `€` op 16 en `/ FLES` op 12 |
| Wijnnaam | 20 (feed), 26 (de nieuwste) | 700 | Hoofdletters |
| Bericht van Marc | 18 / 1.3 | 400 | Normaal hoofdlettergebruik |
| Afzender en tijd (MARC · 19:52) | 12–13 | 700 | Goud, hoofdletters, letter-spacing 1.5px |
| Gebeurtenis in de feed | 13 | 600 | `--event`, hoofdletters, tussen twee lijnen |
| Label | 12–15 | 600–700 | Hoofdletters, letter-spacing 1.2–2px |
| Tab | 16 | 500, actief 700 | Hoofdletters, letter-spacing 2px |

### Ruimte en vorm

- **Schermmarge:** 20 px links en rechts. Ruimte binnen secties in stappen van 4.
- **Hoeken:** overal 0, met deze uitzonderingen: Marcs avatar (rond), de live-stip (rond), de bovenkant van een fles in de flessenrij, de afspeelknop en de pushmelding.
- **Lijnen:** gestippeld (1 px, 2 px streep met 3 px tussenruimte, `#5A5A5A`) tussen adviesblokken. Een volle witte lijn van 1 px boven en onder statusbalken: stand, tellers, samenvatting.
- **Schaduwen en verlopen:** geen schaduwen. Alleen een verloop van transparant naar zwart over foto's.

## Componenten

### Uit V2, ongewijzigd

- **Tabs:** AANBOD, FLESSEN en MARC, alleen tekst. Bovenaan een balk van 2 px, goud als de tab actief is.
- **Kop:** het woordmerk MARC (300) + KOOKT (700) + WIJNCLUB (goud), en rechts de tekstlink VRAAG MARC met een lijnicoon `message-circle` (lucide, 15 px, lijndikte 1.5) vóór de tekst. Andere links naar buiten krijgen `arrow-up-right` achter de tekst. Gebruik nooit de tekens ↗ of ↓ in tekst: die tonen op iOS als emoji.
- **Hoofdknop:** wit, over de volle breedte, met het label links en een pijl rechts. Uitzondering: BETAAL … MET IDEAL is goud.
- **Flessenrij:**
  - Eén fles per beschikbare fles. Gekozen is wit, vrij is omlijnd, weg is `--line-soft`.
  - Tik op fles n om n flessen te kiezen. Tik op de meest rechtse gekozen fles om er één af te halen.
  - Bij meer dan 12 flessen: 12 flessen plus "+ n".
  - Toegankelijk als `radiogroup` of slider, met tikvlakken van minstens 44 px.
- **Keukenbon:** een gekartelde witte balk onderaan met "BON · n FLESSEN", het totaal en BESTEL →. Hij verschijnt zodra er iets gekozen is.
- **Bon:** het bestelscherm als wit papier, 1,2° gedraaid. Niet draaien bij `prefers-reduced-motion`.
- **Split-keuze:** BRENG / HAAL, of LIJST / BIEDING. De gekozen helft is wit.
- **Ladder:** het bod kiezen en bevestigen (scherm 08).
- **Poster, spraakbericht, tellers en stempel:** zoals op de schermen 06, 12 en 16.

### Nieuw in V3

#### Live-balk

Bovenaan op De avond, De veiling en Eenmaal andermaal.

- **Links:** een gouden stip van 8 px en "BIJ MARC · LIVE SINDS 19:30" (15 px, 700). De stip knippert niet.
- **Rechts:** "14 LEDEN BINNEN" of "12 LEDEN KIJKEN" (13 px, `--muted`). Dit getal ververst hooguit elke 30 seconden.
- **Navigatie:** in de veilingschermen staat links een pijl terug naar De avond.
- **Voor Marc** (scherm 15) is de balk goud gevuld met zwarte tekst: "JE BENT LIVE".

#### Bericht van Marc

Een avatar van Marc (rond, 24–40 px, zijn portret), de tekst (18 px, 400) en daaronder "MARC · 19:52" in goud.

- In de biedlog is het bericht korter: een avatar van 26 px en de tekst tussen aanhalingstekens.
- "Marc typt…" (cursief, `--muted`) verschijnt zolang Marc in scherm 15 typt.

#### Gebeurtenis

Een gecentreerde regel tussen twee dunne lijnen: "WIJN F IS OP · 19:40" of "EEN LID NAM 3 × WIJN I · ZOJUIST".

**Nooit namen.** Het plan zegt dat leden niet zien wie iets kocht of bood.

#### Wijn in de feed

Een omlijnde kaart (1 px `--line`) met de reuzenletter (64 × 92 px), "WIJN H · 19:38", de naam, Marcs tekst, de prijs, "NOG 2 VAN 6", de flessenrij en eventueel "2 GEKOZEN".

**De nieuwste wijn** (zolang hij de laatste is die op tafel kwam):

- de kaart heeft een gouden rand
- de foto staat over de volle breedte (300 px hoog)
- een reuzenletter van 190 px staat op de foto
- linksboven staat het gouden label "NET OP TAFEL · 19:52"

Zodra Marc een volgende wijn neerzet, krijgt de vorige de gewone kaart.

Een uitverkochte wijn blijft staan met dekking 0.45 en "OP · IN 9 MIN", zonder flessenrij.

#### Samenvatting "Op tafel vanavond"

Op de aankondiging (scherm 02). Een kop met "4 WIJNEN · 30 FLESSEN".

- **Per wijn:** letter (grijs), naam, aantal flessen en prijs.
- **Als laatste regel:** de veiling, met een gouden ★, "VEILING", de naam en het startbod.
- **Geen tijdlijn.**

#### Biedlog

Een lijst van biedingen, de nieuwste bovenaan: bedrag, bieder, tijd.

- **Bieders:** heten "Bieder 3", "Bieder 7", een vast nummer per bieder per veiling. Jijzelf heet "Jij", in goud.
- **Jouw overboden bod:** doorgestreept.
- **Oudere regels:** worden steeds lichter (dekking 1 → 0.35).
- **Onderaan:** "Marc opent de veiling · 20:00" met het startbod.
- **Berichten van Marc** staan tussen de biedingen, op het moment dat hij ze stuurde.

#### Biedknoppen

Onderaan op De veiling:

- **Wit:** "BIED € 370" (het volgende minimum) met een hamer.
- **Grijs:** een hogere stap, "€ 400".

Beide openen het biedpaneel (scherm 08) met dat bedrag al gekozen. Bevestigen blijft verplicht, omdat een bod bindend is.

**Als jij het hoogste bod hebt,** wordt de witte knop donkergrijs met "JE STAAT BOVENAAN ✓" en is hij uitgeschakeld.

#### Eenmaal, andermaal

Alleen in de laatste twee minuten van een veiling (scherm 09).

- **Kop:** "EENMAAL," in wit en "ANDERMAAL…" in `--ghost`.
- **Stand:** het bod (goud als jij de hoogste bent), "HAMER OVER" en de resterende tijd in m:ss.
- **Tijdlijn:** een witte balk van 4 px die rustig leegloopt.
- **Gedrag:** geen knipperen en geen kleurwissel bij de laatste seconden. Een nieuw bod zet de klok terug op 2:00 (de verlengingsregel uit het plan).

#### Hamerslag en terugblik

Scherm 10.

- **Kop:** "VER-KOCHT." in goud (120 px), met daaronder voor wie en voor hoeveel.
- **Daaronder:** een bericht van Marc en de goudkleurige iDEAL-knop.
- **Terugblik op de avond:** tellers (flessen, leden, biedingen) en per wijn wanneer hij op was of hoeveel er over is.

Wie niet won, ziet dezelfde terugblik met de kop "AFGELOPEN." in wit en "De Barolo ging voor € 410." Dit scherm is nog niet getekend; volg scherm 10.

## Schermen

| # | Bestand | Route | Doel | Hoofdactie |
| --- | --- | --- | --- | --- |
| 01 | `01-eerste-login.png` | `/welkom` | Code uit de e-mail, 18+, voorwaarden | KOM BINNEN |
| 02 | `02-aankondiging.png` | `/` vóór de avond | Wat er vanavond op tafel komt, met een bericht van Marc | HERINNER MIJ OM 19:30 (pushmelding bij het begin) |
| 03 | `03-de-avond.png` | `/` tijdens de avond | De lijst als live feed, met bestellen via de flessenrij en de keukenbon | Keukenbon → BESTEL |
| 04 | `04-wijn-van-de-lijst.png` | `/wijn/:id` | Eén wijn in detail: Marcs tekst, ERBIJ, DRINKEN | Keukenbon → BESTEL |
| 05 | `05-bestelling-de-bon.png` | `/bestelling` | Controle, brengen of halen | BETAAL MET IDEAL |
| 06 | `06-bijzondere-fles.png` | `/veiling/:id/fles` | Poster met spraakbericht, 01–03, herkomst en bewaring. Bereikbaar vanuit 02, 03 en 07 | BIED € … (of "NAAR DE VEILING" vóór 20:00) |
| 07 | `07-de-veiling-live.png` | `/veiling/:id` | De zaal: stand, biedlog, berichten van Marc | BIED € 370 |
| 08 | `08-bod-bevestigen.png` | paneel boven 07 | Bedrag kiezen, bindend bevestigen | BEVESTIG € … |
| 09 | `09-eenmaal-andermaal.png` | `/veiling/:id` in de laatste 2 min | Spanning tot de hamer | BIED € … of JE STAAT BOVENAAN |
| 10 | `10-verkocht.png` | `/veiling/:id` na de hamer | Hamerslag, bericht van Marc, terugblik | BETAAL € … MET IDEAL |
| 11 | `11-na-betaling-bewaar-breng-haal.png` | `/veiling/:id/gewonnen` | Na betaling: bewaren, brengen of halen | KLAAR |
| 12 | `12-mijn-flessen.png` | `/flessen` | Onderweg, in bewaring, eerder gekocht met oordeel | Per rij |
| 13 | `13-marc.png` | `/marc` | Portret, voorwaarden, privacy | VRAAG MARC IN WHATSAPP |
| 14 | `14-beheer-wijn-klaarzetten.png` | `/beheer/wijn` | WhatsApp-bericht plakken, herkenning nakijken, foto, lijst of veiling. In V3 komt een wijn hiermee **klaar te staan** voor de avond, niet direct online | ZET KLAAR VOOR DINSDAG |
| 15 | `15-beheer-live.png` | `/beheer/avond` | Marc presenteert: wijnen op tafel zetten, iets zeggen, de veiling starten, de avond sluiten | ZET WIJN G OP TAFEL |
| 16 | `16-toestanden.png` | – | Betaald, wijn net op, geen avond, overboden | – |

### Het verloop van een avond

1. **Klaarzetten.** Marc zet in 14 de wijnen en de veiling klaar en kiest de datum, de begintijd (19:30), het begin van de veiling (20:00) en de hamer (21:00). Hij schrijft het aankondigingsbericht.
2. **Aankondiging.** Leden krijgen een pushmelding "Vanavond bij Marc". Scherm 02 is dan de startpagina.
3. **Begin.** Op de begintijd wordt `/` scherm 03. Leden die "herinner mij" kozen, krijgen een melding. Marc opent scherm 15.
4. **Wijnen op tafel.**
   - Marc tikt op "ZET WIJN G OP TAFEL". De wijn verschijnt bij iedereen bovenaan de feed als nieuwste.
   - Leden bestellen zoals in V2: flessen kiezen, keukenbon, bon, iDEAL. De voorraad telt live af.
   - Is een wijn op, dan verschijnt "WIJN … IS OP" in de feed.
5. **Berichten.** Wat Marc in 15 typt of kiest uit de snelle zinnen, verschijnt direct in de feed. In de biedlog verschijnt het als de veiling loopt.
6. **De veiling.**
   - Op 20:00, of eerder met "NU STARTEN", verschijnt in 03 de balk "De veiling begint". Wie 06 of 07 open heeft, ziet de zaal openen.
   - Biedingen volgen de regels uit het plan: bindend, minimale verhoging, verlenging in de laatste twee minuten.
7. **Hamer.** Op 21:00 (plus eventuele verlenging) sluit de veiling. De winnaar ziet 10 en krijgt de betaallink, die 48 uur geldig is. De anderen zien "AFGELOPEN.".
8. **Sluiten.** Marc tikt op "SLUIT DE AVOND", of de lijst sluit op de eindtijd. `/` toont dan de terugblik, en daarna "NIETS OPEN." (zie 16) tot de volgende aankondiging.

### Aanvullingen per scherm

- **02 Aankondiging:** de foto bovenaan is een sfeerfoto van Marc (nu `crop_1582137194svoorpaginaslide3.jpg`). Tik op een wijn in de samenvatting om alvast de wijnpagina (04) te zien, zonder bestellen.
- **03 De avond:**
  - Bij openen scrolt de feed naar de nieuwste wijn.
  - Nieuwe items schuiven onderaan in, zonder dat de pagina verspringt waar de gebruiker zit. Is de gebruiker omhoog gescrold, dan verschijnt een tekstknop "NIEUW VAN MARC" met het icoon `arrow-down` erachter.
  - De balk "20:00 · De veiling van … begint" staat onder de feed tot de veiling begint. Daarna wordt het "DE VEILING IS BEGONNEN →".
- **07 De veiling:** de stand toont boven het bedrag "OVERBODEN · HOOGSTE BOD" (goud) als jij overboden bent, "JIJ BENT DE HOOGSTE" (goud) als je bovenaan staat, en anders "HOOGSTE BOD".
- **15 Beheer live:**
  - **Tellers:** flessen, bestellingen en betaald bedrag.
  - **"Klaar om neer te zetten":** wijnen die klaarstaan maar nog niet op tafel liggen, met "BEWERK".
  - **"Op tafel":** met flessenrij, rest en tijdstip.
  - **Bericht sturen:** een invoerveld met drie snelle zinnen.
  - **De veiling:** met "NU STARTEN".
  - **De hoofdknop** zet de volgende klaarstaande wijn op tafel. Zijn er geen meer, dan wordt hij "SLUIT DE AVOND".

## Live en realtime

V3 heeft live bijwerken nodig. Het plan heeft dat nog niet.

| Wat | Hoe vaak | Voorstel |
| --- | --- | --- |
| Nieuwe wijn, bericht, gebeurtenis, voorraad | Binnen 2 seconden | API Gateway WebSocket API + Lambda, gevoed door DynamoDB Streams. Eenvoudiger alternatief voor de pilot: elke 3 seconden pollen zolang het scherm zichtbaar is |
| Bod en stand van de veiling | Binnen 1 seconde | Dezelfde WebSocket. Het bod zelf blijft een gewone aanroep met de voorwaardelijke schrijfactie uit het plan |
| Aantal leden binnen of kijkend | Hooguit elke 30 seconden | Telling van open verbindingen |
| Klok in de laatste 2 minuten | Lokaal | Rekent op basis van de eindtijd van de server; corrigeert bij elk bericht van de server |

- **Nieuwe gegevens:** `avond` (datum, begintijd, eindtijd, aankondiging, status: aangekondigd, live, gesloten), `feeditem` (avondId + tijdstip, soort: wijn op tafel, bericht, gebeurtenis, tekst of wijnId), en per wijn `opTafelSinds`.
- **Privacy:** een gebeurtenis bevat nooit een lidId. Een bieder krijgt per veiling een vast nummer dat niet herleidbaar is tot het lid.

## Toestanden

| Toestand | Hoe het eruitziet |
| --- | --- |
| Laden | Geen spinner. Masthead en reuzenletters staan er al in `--ghost`, tekstregels als grijze balken. Na 300 ms "Even geduld…" |
| Verbinding weg tijdens de avond | De live-stip wordt grijs en de live-balk zegt "VERBINDING HERSTELLEN…". Bestellen en bieden blijven werken via gewone aanroepen |
| Geen avond gepland | "NIETS OPEN." met een zin van Marc (zie 16) |
| Wijn net op tijdens bestellen | "WIJN H IS NET OP." (zie 16) |
| Betaald | Bon met de stempel BETAALD (zie 16) |
| Overboden | Pushmelding, en in 07 de gouden status (zie 07 en 16) |
| Veiling verloren | "AFGELOPEN." met de terugblik (nog niet getekend, zie scherm 10) |
| Betaling mislukt | Bon zonder stempel, "NIET BETAALD", "Je flessen houd ik nog tot 20:13 voor je vast", PROBEER OPNIEUW (nog niet getekend) |
| Fout van de server | "Er ging iets mis. Probeer het zo nog eens, of vraag het Marc." Geen technische details |
| Geen toegang | Scherm 01 met "Deze club is alleen op uitnodiging van Marc." |

## Beweging

Kort en functioneel, maximaal 200 ms, met ease-out.

- Een nieuw feeditem schuift in 200 ms omhoog in beeld.
- Een gekozen fles wordt wit.
- De keukenbon schuift omhoog.
- Het biedpaneel schuift omhoog.
- Bij een nieuw hoogste bod telt het bedrag in 300 ms op naar het nieuwe bedrag.

Niets knippert. Met `prefers-reduced-motion` gebeurt alles direct.

## Toegankelijkheid

- Tekst onder 18 px heeft minstens 4.5:1 contrast.
- Spookletters en spookwoorden krijgen `aria-hidden`, met verborgen tekst.
- **Feed:** een `aria-live="polite"` regio. Een nieuwe wijn wordt voorgelezen als "Marc zette wijn G op tafel: Chianti Classico 2021, 16 euro".
- **Stand van de veiling:** `aria-live="assertive"` alleen bij "overboden".
- **Klok:** wordt niet elke seconde voorgelezen, alleen bij 1:00 en 0:30.
- Tikvlakken zijn minstens 44 × 44 px. De taal van de pagina is `nl`.

## Tekst en toon

- **Je-vorm** voor het lid, **ik-vorm** voor Marc.
- **Berichten van Marc** zijn zijn eigen woorden. De app verzint ze niet; de snelle zinnen in 15 stelt Marc zelf in.
- **Hoofdletters** voor koppen, labels en knoppen.
- **Bedragen:** `€ 11,50` en `€ 11,50 / FLES`.
- **Tijden:** "19:52", "zojuist", "2 min".

## Open beslissingen

V3 wijkt op deze punten bewust af van het pilotplan. Bouw ze met een instelling, zodat ze uit kunnen.

| Punt | Plan | V3 | Te beslissen door |
| --- | --- | --- | --- |
| Rust | "Geen knipperende aftelklok, badges of punten" | Live-stip (knippert niet), het label NET OP TAFEL, een klok in de laatste 2 minuten | Aidan en Marc |
| Wie bood | "Leden zien het hoogste bod, niet wie het deed" | Bijnamen "Bieder 7". Alternatief: alleen bedragen en tijden | Aidan, jurist |
| Live | Niet in de architectuur | WebSocket of pollen, zie "Live en realtime". Kost naar schatting een week extra bouwtijd | Aidan |
| Rol van Marc | Lijst klaarzetten en delen | Tijdens de avond actief: wijnen neerzetten, berichten sturen | Marc |
| Lijst sluiten | Op een eindtijd | Op een eindtijd, of eerder met SLUIT DE AVOND | Marc |

## Voorbeeldinhoud die vervangen moet worden

**Echt:**

- de teksten, prijzen en aantallen van wijn H en I (uit Marcs WhatsApp-groep)
- de werkwijze met lettergenummerde wijnen en "En de laatste van vandaag 👇"
- de foto van de Cándido (uitgesneden, 420 × 510 px; gebruik het origineel)
- Marcs portret (360 × 424 px; groter origineel nodig)
- de sfeerfoto van de aankondiging (marckookt.com)

**Verzonnen:**

- de wijnen F en G
- alle tekst en de foto's van de Barolo
- de berichten van Marc in de feed en de biedlog
- de aantallen leden, bestellingen en bedragen
- de namen van leden
- de bezorg- en afhaaltijden
- ERBIJ en DRINKEN bij wijn I
- de tekst op de pagina van Marc

## Wat Marc nog moet aanleveren

- Logo in de witte uitvoering (`referentie/images/marckookt/logo-*.png` van zijn site; is er een betere versie?) en de exacte goudkleur
- Besluit over het lettertype
- Eigen foto's van flessen, een portret in hoge resolutie en twee of drie sfeerfoto's voor aankondigingen
- Eén echte bijzondere fles met tekst, herkomst, bewaring en een spraakbericht van 30 seconden
- Zijn WhatsApp-nummer, de bezorg- en afhaalmomenten, de standaardstappen bij een veiling, en zijn snelle zinnen voor de avond
- Akkoord op zijn rol tijdens de avond (zie "Open beslissingen")

## Nog niet getekend

Deze schermen en toestanden staan alleen als tekst in dit document. Volg bij het bouwen de stijl van het genoemde voorbeeldscherm, of laat ze eerst tekenen:

- AFGELOPEN. (veiling verloren)
- betaling mislukt
- verbinding herstellen
- lege Mijn flessen
- het formulier voor een veiling in 14 (startbod, minimale verhoging, tijden, herkomst, spraakbericht opnemen)
- de avond plannen in 14 (datum, tijden, aankondiging)
- bestelling namens een lid
- het afleveradres van een lid
- de drie leveringstoestanden (gebracht, afgehaald, in bewaring)
- de pagina's voor voorwaarden en privacy
- de uitnodigingsmail

## Buiten deze opdracht

- De AI-assistent en het genereren van omschrijvingen. Die staan als roadmap in het pilotplan; niet bouwen in de pilot.
- V1 en V2 van het ontwerp, behalve de V2-schermen die hierboven als V3-scherm staan.
