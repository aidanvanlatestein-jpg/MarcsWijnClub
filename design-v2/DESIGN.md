# Design: Marc Kookt Wijnclub (V2)

Ontwerp voor de pilot uit `../pilotplan-marcs-wijnclub.md`. Dit document en de map `schermen/` zijn samen de specificatie voor de bouw van de web-app.

**Wat waar wint**

- **Functie, regels, data en beveiliging:** het pilotplan.
- **Uiterlijk, opmaak en interactie:** dit document en de schermen.
- **Tegenstrijdig of niet beschreven:** vraag het na, niet gokken.

## Inhoud van deze map

| Pad | Wat |
| --- | --- |
| `DESIGN.md` | Dit document: tokens, componenten, schermen, interactie, toestanden |
| `schermen/01…11-*.png` | Elk scherm op 2× (780 px breed). Het ontwerp is 390 px breed |
| `referentie/schermen.html` | Automatische HTML/CSS-export van alle schermen. Alleen als maatreferentie (afstanden, groottes, kleuren), niet als code overnemen: alles is absoluut gepositioneerd |
| `referentie/images/marckookt/` | Echte foto's en logo's van Marc: portret, gerechten en logo's van marckookt.com, plus de foto van de Cándido uit zijn WhatsApp-groep |
| `referentie/images/generated-*.png` | Gegenereerde voorbeeldfoto's van flessen waarvan nog geen echte foto is. Vervangen door Marcs eigen foto's |
| `referentie/marc-wijnclub.pen` | Het bronbestand, te openen in pen.dev. Bevat ook V1 en de roadmapschermen; alleen de frames met `V2 –` in de naam gelden |

## Bouwopdracht in het kort

Bouw een mobile-first web-app (PWA) die er op een telefoon uitziet zoals de elf schermen in `schermen/`. Op een groter scherm blijft de app een kolom van maximaal 430 px, gecentreerd op zwart. De stack, de gegevens en de regels staan in het pilotplan (React op S3/CloudFront, Cognito, Lambda, DynamoDB, Mollie).

## Ontwerpidee

De app voelt als Marcs keuken, niet als een webwinkel.

- **De lijst is een wijnkaart:** reusachtige letters per wijn (F, G, H, I), zoals Marc ze in WhatsApp nummert.
- **Je kiest flessen, geen aantallen:** de voorraad staat als een rij flessen, en je tikt op de flessen die je wilt.
- **Je bestelling is een keukenbon:** wit papier met een gekartelde rand en "tafel: Sanne".
- **Een bijzondere fles is een poster** en **bieden is een ladder** van bedragen.
- **Rustig:** geen badges, geen knipperende aftelklok, geen schaduwen en geen afgeronde hoeken. Contrast komt uit schaal (groot tegen klein) en uit wit tegen zwart.

## Tokens

### Kleuren

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `--bg` | `#000000` | Achtergrond van alles |
| `--ink` | `#FFFFFF` | Tekst, hoofdknop, gekozen fles, bon |
| `--muted` | `#9A9A9A` | Bijschriften, toelichting |
| `--dim` | `#8A8A8A` | Inactieve tabs, inactieve tekst. Het ontwerp toont `#6E6E6E`; gebruik `#8A8A8A` voor genoeg contrast |
| `--ghost` | `#262626` | Spookletters en spookwoorden (WK 47, MIJN, NIEUWE, 2022). Alleen decoratief, nooit de enige drager van informatie |
| `--ghost-2` | `#3A3A3A` | Niet-gekozen helft van een split-keuze, stapnummers |
| `--line` | `#2B2B2B` | Scheidingslijnen tussen rijen, rand van de tabs |
| `--line-soft` | `#1E1E1E` | Lijnen tussen rijen in lijsten, uitverkochte flessen |
| `--outline` | `#6E6E6E` | Rand van een beschikbare fles en van een leeg vinkje |
| `--gold` | `#C9A84C` | Accent: "WIJNCLUB", de actieve tab, "x gekozen", "Marc vertelt", overboden, "JOUW.", de iDEAL-knop. Geschat op basis van het logo; Marc levert de exacte waarde |
| `--paper` | `#FFFFFF` | De bon |
| `--paper-ink` | `#000000` | Tekst op de bon |
| `--paper-muted` | `#555555` | Bijschrift op de bon |
| `--ok` | `#2F6B45` op papier, `#9CCB9C` op zwart | Stempel BETAALD |
| `--grey-btn` | `#4A4A4A` | Secundaire knop (zoals op marckookt.com) |

### Typografie

Eén familie: **Barlow Condensed** (Google Fonts) met de gewichten 300, 400, 500, 600 en 700. marckookt.com gebruikt DIN Pro Condensed, waarvoor een licentie nodig is. Marc beslist; zet de familie in één variabele zodat wisselen één regel is.

| Rol | Grootte / regelhoogte | Gewicht | Overig |
| --- | --- | --- | --- |
| Reuzenletter (wijnletter, JOUW.) | 150 / 0.8 | 700 | Mag buiten zijn vak lopen en wordt bijgesneden |
| Masthead (DE KAART, MIJN FLESSEN) | 104 / 0.86 | 700 | letter-spacing −2px. Tweede regel in `--ghost` |
| Hero-bedrag (€ 340, € 350) | 110–150 / 0.85 | 700 | letter-spacing −3px. Het €-teken op 0,3× in `--muted` |
| Posternaam | 64–72 / 0.9 | 700 | Een woord per regel |
| Prijs in een lijst | 34 / 1 | 700 | Met `€` op 18 en `/ FLES` op 13 |
| Wijnnaam in een lijst | 21 / 1.05 | 700 | Hoofdletters |
| Marcs tekst (citaat) | 21 / 1.25 | 400 | Normaal hoofdlettergebruik |
| Lopende tekst | 15–18 / 1.3 | 300–400 | Normaal hoofdlettergebruik |
| Label (SLUIT, HOOGSTE BOD) | 13–15 | 600–700 | Hoofdletters, letter-spacing 1.5–2px |
| Tab | 16 | 500, actief 700 | Hoofdletters, letter-spacing 2px |

Koppen, labels en knoppen staan in hoofdletters, lopende tekst niet.

### Ruimte en vorm

- **Schermmarge:** 20 px links en rechts. Witruimte binnen secties in stappen van 4: 8, 12, 16, 20, 24 en 28 px.
- **Hoeken:** overal 0, met drie uitzonderingen: de bovenkant van een fles in de flessenrij (afgerond), de afspeelknop (rond) en de pushmelding (systeemstijl).
- **Lijnen:** een gestippelde lijn (1 px, streepjes van 2 px met 3 px tussenruimte, `#5A5A5A`) tussen wijnen en adviesblokken. Een volle witte lijn van 1 px boven en onder "statusbalken" (de stand van een bieding, de tellers).
- **Schaduwen en verlopen:** geen schaduwen. Alleen een verloop van transparant naar zwart over foto's, zodat tekst op de foto leesbaar blijft.

## Componenten

### Tabs

Drie gelijke kolommen: AANBOD, FLESSEN en MARC, zonder iconen.

- **Markering:** elke kolom heeft bovenaan een balk van 2 px: `--gold` als de tab actief is, anders `--line`.
- **Tekst:** links uitgelijnd, gecentreerd en rechts uitgelijnd per kolom. Actief is wit en 700, inactief is `--dim`.
- **Plaats:** vast onderaan, met ruimte voor de veilige zone van de iPhone.

### Kop

Links het woordmerk "MARC" (300), "KOOKT" (700) en "WIJNCLUB" (goud, 12 px, spatiëring 1.5). Rechts de tekstlink VRAAG MARC: een lijnicoon `message-circle` (lucide, 15 px, lijndikte 1.5) vóór de tekst, met een witte onderlijn van 1 px.

Op een scherm met een foto bovenaan vervangt een zwevende navigatie deze kop: twee zwarte vlakken met "← TITEL" en het chaticoon met "VRAAG MARC".

### Hoofdknop

Wit vlak over de volle breedte, padding 18 × 20. Links het label (22 px, 700, zwart, hoofdletters), rechts een pijl. Er is één hoofdknop per scherm, altijd onderaan boven de tabs.

Er is één uitzondering: **BETAAL MET IDEAL** is goud. Dat is de enige plek waar geld weggaat.

### Tekstlink

Hoofdletters met een lijnicoon van lucide (lijndikte 1.5, 0,95× de tekstgrootte, dezelfde kleur als de tekst, 6 px ertussen). `message-circle` vóór de tekst bij alles wat WhatsApp met Marc opent; `arrow-up-right` achter de tekst bij andere links naar buiten (Mail, opnieuw sturen); `→` achter de tekst bij links binnen de app. Gebruik nooit de tekens ↗ of ↓: die tonen op iOS als emoji.

### Flessenrij (kernonderdeel)

Vervangt het invoerveld met plus en min. De rij toont tegelijk de voorraad en je keuze.

- **Eén fles per beschikbare fles van de wijn.** Formaat in de lijst 9 × 20 px met 4 px tussenruimte. Op de wijnpagina 18 × 52 px met 6 px tussenruimte. De bovenhoeken zijn afgerond (3 px en 6 px).
- **Drie toestanden per fles:**
  - **gekozen:** wit gevuld
  - **vrij:** omlijnd met `--outline`, zonder vulling
  - **weg** (verkocht of door anderen vastgehouden): gevuld met `--line-soft`
- **Tikken:**
  - Tik op vrije fles n: je keuze wordt n flessen, van links af gevuld.
  - Tik op de meest rechtse gekozen fles: je keuze gaat één omlaag.
  - Je kunt nooit meer kiezen dan er vrij zijn.
- **Regel eronder:** "2 GEKOZEN · 4 OVER" in goud zodra er iets gekozen is, "4 OVER · TIK OP EEN FLES" in `--muted` als er niets gekozen is, en "OP IS OP" als alles weg is.
- **Grote voorraad:** bij meer dan 12 flessen toon je 12 flessen plus "+ n". Toevoegen gaat dan via het tikken op "+ n".
- **Toegankelijkheid:**
  - De rij is een `radiogroup` of een slider met het label "Aantal flessen van wijn I, 10 beschikbaar".
  - Elke fles is minstens 44 px hoog tikbaar: het tikvlak is groter dan de tekening.
  - Pijltoetsen links en rechts veranderen het aantal.

### Reuzenletter

De letter van de wijn (Marcs nummering) in een vak van 86 × 120 px, bijgesneden. De kleur is wit als er van die wijn iets gekozen is, en anders `--ghost`. Bij een uitverkochte wijn krijgt de hele rij een dekking van 0.4.

De letter is decoratief. Zet daarom "Wijn F" ook als verborgen tekst voor schermlezers.

### Keukenbon (onderste balk)

Verschijnt op Aanbod en Wijn van de lijst zodra er minstens één fles gekozen is. Zonder keuze verdwijnt hij en komen de tabs omhoog.

- **Rand:** bovenaan een gekartelde rand van witte driehoeken (14 × 8 px), daaronder een wit vlak.
- **Links:** "BON · 3 FLESSEN" en het totaal (34 px, 700).
- **Rechts:** een zwarte knop "BESTEL →".
- **Totaal:** telt direct mee bij elke tik.

### Bon (bestelscherm)

Wit papier, 1,2° gedraaid, met de gekartelde rand onderaan.

- **Kop:** "BON" (64 px), daaronder het bonnummer, de dag en de tijd. Rechts "TAFEL" met de voornaam van het lid.
- **Regels:** aantal, letter en naam, en het bedrag. Tussen de blokken een gestippelde zwarte lijn.
- **Totaal:** 64 px.
- **Onderaan:** de regel "Ik houd je flessen 15 minuten vast. — Marc".

Draai de bon niet als de gebruiker minder beweging wil (`prefers-reduced-motion`).

### Split-keuze

Twee halve vlakken in één wit omlijnd blok, bijvoorbeeld BRENG / HAAL of LIJST / BIEDING.

- **Gekozen helft:** wit gevuld, met een zwart woord van 44–52 px.
- **Andere helft:** zwart, met het woord in `--ghost-2`.
- **Onder het woord:** een korte zin.
- **Semantiek:** werkt als een radiogroep.

Bij drie opties (BEWAAR / BRENG / HAAL) worden het gestapelde banden in plaats van twee helften.

### Ladder (bieden)

Bedragen staan verticaal onder elkaar: hogere bedragen boven, in grijs en kleiner.

- **Gekozen bod:** 150 px wit, met rechts een gouden streep en "JOUW BOD".
- **Huidig hoogste bod:** onderaan, doorgestreept, met "HOOGSTE NU".
- **Kiezen:** omhoog vegen of op een bedrag tikken.
- **Stappen:** volgende bedrag = hoogste bod + minimale verhoging. Daarna twee grotere stappen (Marc kiest die per bieding, standaard +€25 en +€50).

### Poster (bijzondere fles)

- **Foto:** over de volle breedte, 640 px hoog, met een verloop naar zwart.
- **Sluittijd:** "SLUIT ZONDAG 21:00" verticaal langs de linkerrand, in goud.
- **Titel:** de naam onderin op de foto (72 px).
- **Stand:** daaronder de stand met het hoogste bod op 110 px, het aantal biedingen en de minimale verhoging.

### Spraakbericht

- **Bediening:** een gouden ronde afspeelknop, "MARC VERTELT" en de duur.
- **Golfvorm:** over de volle breedte, 70 px hoog. Het gespeelde deel is wit, de rest `--ghost-2`.
- **Gedrag:** tik om af te spelen en op de golf om te spoelen.
- **Bestand:** het geluid staat in S3 achter CloudFront (zie het pilotplan).

### Tellers (Mijn flessen)

Drie kolommen met een getal van 56 px en een label: ONDERWEG in wit, BIJ MARC in goud en GEDRONKEN in grijs. Volle witte lijnen boven en onder.

### Stempel

Een omlijnd woord, licht gedraaid (4° tot −8°): "BETAALD" in de kleur `--ok`.

## Schermen

Alle schermen zijn 390 px breed. Een scherm met meer inhoud scrolt; tabs en de keukenbon blijven vast onderaan.

| # | Bestand | Route | Doel | Hoofdactie |
| --- | --- | --- | --- | --- |
| 01 | `01-eerste-login.png` | `/welkom` | Code uit de e-mail invullen, 18+ en voorwaarden bevestigen | KOM BINNEN (pas actief als de code compleet is en beide vinkjes aan staan) |
| 02 | `02-aanbod-de-kaart.png` | `/` | De lijst van de week met alle wijnen, en daaronder de bijzondere fles | Keukenbon → BESTEL |
| 03 | `03-wijn-van-de-lijst.png` | `/wijn/:id` | Eén wijn: foto, Marcs tekst, ERBIJ, DRINKEN, prijs, flessenrij | Keukenbon → BESTEL |
| 04 | `04-bestelling-de-bon.png` | `/bestelling` | Controle, keuze tussen brengen en halen | BETAAL MET IDEAL (naar Mollie) |
| 05 | `05-bijzondere-fles.png` | `/bieding/:id` | Poster, stand, spraakbericht, 01–03, herkomst en bewaring | BIED € {volgend bedrag} (opent 06) |
| 06 | `06-bieden-de-ladder.png` | paneel boven 05 | Bedrag kiezen en bevestigen dat het bod bindend is | BEVESTIG € {bedrag} |
| 07 | `07-na-gewonnen-bieding.png` | `/bieding/:id/gewonnen` | Na betaling: bewaren, brengen of halen | KLAAR |
| 08 | `08-mijn-flessen.png` | `/flessen` | Onderweg (met voortgang), bij Marc in bewaring, eerder gekocht met je oordeel | Per rij: OPEN AAN TAFEL of OPNIEUW → |
| 09 | `09-marc.png` | `/marc` | Portret, korte tekst, voorwaarden, privacy, gegevens wissen | VRAAG MARC IN WHATSAPP |
| 10 | `10-beheer.png` | `/beheer` (alleen groep beheer) | 01 bericht plakken en herkenning nakijken, 02 foto, 03 lijst of bieding, en daaronder de bestellingen | ZET OP DE LIJST, of START DE BIEDING als 03 op bieding staat |
| 11 | `11-toestanden.png` | – | Betaald, wijn net op, geen lijst open, overboden | – |

### Aanvullingen per scherm

- **01 Eerste login**
  - Zes cijfervakken als grote cijfers met een onderlijn. Het actieve vak heeft een gouden onderlijn van 3 px.
  - Plakken van een code van zes cijfers vult alle vakken.
  - Na het inloggen volgt een eenmalige tip om de app op het beginscherm te zetten en meldingen aan te zetten. Op een iPhone werken pushmeldingen pas als de app op het beginscherm staat (pilotplan).
- **02 Aanbod**
  - De wijnen staan in Marcs volgorde. Uitverkochte wijnen blijven staan met dekking 0.4 en "OP IS OP".
  - "SLUIT ZO 20:00" is een vaste tijd, geen aftelklok.
  - Komen er meerdere bijzondere flessen, dan zet je meerdere posters onder elkaar.
- **03 Wijn van de lijst**
  - De reuzenletter staat half op de foto. Naam en jaargang staan op drie regels, het jaar in `--ghost`.
  - Marcs tekst is een citaat met een gouden aanhalingsteken en "— MARC".
- **04 Bestelling**
  - Totaal en keuze worden opgeslagen voordat de app naar Mollie gaat.
  - Na terugkomst van Mollie toon je de toestand "Betaald" uit 11, of een foutmelding.
  - De 15 minuten worden niet als aftelklok getoond.
- **05 Bijzondere fles**
  - **Nadat het lid zelf boden:** onder het hoogste bod staat "JIJ BENT DE HOOGSTE" in goud.
  - **Na overboden:** zie 11.
  - **Na de sluittijd:** de hoofdknop verdwijnt en de stand toont "GESLOTEN".
- **06 Bieden**
  - Bij bevestigen gaat het bod naar de API.
  - **Bij een conflict** (iemand anders bood hoger): de ladder schuift door naar het nieuwe minimum en meldt "Er is net hoger geboden".
  - Het paneel sluit met ✕ of door omlaag te vegen.
- **07 Na gewonnen bieding**
  - De winnaar komt hier via de betaallink.
  - Als er nog niet betaald is, is de hoofdknop "BETAAL € 350 MET IDEAL" (goud) en staat de keuze eronder uitgeschakeld.
- **08 Mijn flessen**
  - De voortgang heeft vier stappen: BESTELD, BETAALD, INGEPAKT en GEBRACHT (of AFGEHAALD).
  - De oordelen LEKKER en NIET VOOR MIJ sluiten elkaar uit. Tik nog eens om een oordeel te wissen.
  - OPNIEUW → staat alleen bij wijnen die nu op de lijst staan.
  - **Knoppen naar WhatsApp:** "OPEN AAN TAFEL" en "LAAT HEM BRENGEN" openen WhatsApp.
- **10 Beheer**
  - Marcs WhatsApp-bericht gaat naar Bedrock. De velden WIJN, NAAM, JAAR, AANTAL en PRIJS verschijnen op een witte bon en zijn elk te bewerken.
  - **Bij BIEDING** worden de velden van 03 startbod, minimale verhoging, eindtijd en herkomst, plus de opname van een spraakbericht van 30 seconden.
  - Bestellingen vink je af door op het vakje te tikken. Een afgevinkte rij krijgt dekking 0.5.
  - **+ BESTELLING NAMENS EEN LID** opent een eenvoudige versie van 02 met een keuze van het lid. Het lid krijgt daarna een betaallink.

## WhatsApp-links

"Vraag Marc", "Open aan tafel" en "Laat hem brengen" openen `https://wa.me/<Marcs nummer>?text=<tekst>` met een kant-en-klaar bericht. Een voorbeeld:

- Vraag Marc vanaf een wijn: "Hoi Marc, een vraag over wijn I, Cándido Immensum 2022: "
- Open aan tafel: "Hoi Marc, wil je mijn Barolo Cannubi 2010 meenemen naar het diner van …?"

Marcs nummer komt uit de configuratie, niet uit de code.

## Toestanden

| Toestand | Hoe het eruitziet |
| --- | --- |
| Laden | Geen spinner. De reuzenletters en masthead staan er al, in `--ghost`. Tekstregels zijn grijze balken van `--line-soft`. Na 300 ms zonder antwoord komt "Even geduld…" onder de masthead |
| Leeg (geen lijst) | "NIETS OPEN." in `--ghost` op 120 px, met een zin van Marc. Zie 11 |
| Wijn net op tijdens bestellen | Kop "WIJN H IS NET OP." in goud. De bon met de weggevallen regel doorgestreept, "er is niets betaald" en de knop "BESTEL ZONDER WIJN H". Zie 11 |
| Betaald | Bon met de stempel BETAALD, een zin van Marc en "NAAR MIJN FLESSEN". Zie 11 |
| Overboden | Pushmelding plus "OVERBODEN · HOOGSTE BOD" in goud op de bijzondere fles. Je eigen bod staat doorgestreept. Zie 11 |
| Betaling mislukt of afgebroken | Bon zonder stempel, met de kop "NIET BETAALD" in wit, "Je flessen houd ik nog tot 16:07 voor je vast" en de hoofdknop "PROBEER OPNIEUW". Nog niet getekend; volg de stijl van "wijn net op" |
| Fout van de server | Algemene tekst, geen technische details (pilotplan): "Er ging iets mis. Probeer het zo nog eens, of vraag het Marc." met de link VRAAG MARC (chaticoon) |
| Geen toegang | Wie niet is uitgenodigd, ziet scherm 01 met de tekst "Deze club is alleen op uitnodiging van Marc." en geen invoervelden |

## Beweging

Kort en functioneel, maximaal 200 ms, met ease-out:

- Een fles die je kiest wordt in 120 ms wit.
- De keukenbon schuift omhoog als de eerste fles gekozen wordt.
- Het biedpaneel schuift omhoog.

Niets knippert of beweegt uit zichzelf. Met `prefers-reduced-motion` gebeurt alles direct.

## Toegankelijkheid

- Tekst onder 18 px heeft minstens 4.5:1 contrast. Daarom is `--dim` `#8A8A8A`.
- Spookletters zijn decoratief: zet `aria-hidden` op de grote letter en verborgen tekst ernaast.
- Tikvlakken zijn minstens 44 × 44 px.
- Elk knopje heeft een naam, bijvoorbeeld "Lekker, Cándido Immensum".
- De taal van de pagina is `nl`.

## Tekst en toon

- **Je-vorm** voor het lid, **ik-vorm** voor Marc ("Ik breng ze donderdagavond langs").
- **Hoofdletters** voor koppen, labels en knoppen; gewone zinnen voor uitleg.
- **Bedragen:** `€ 11,50`, met een spatie na het euroteken en een komma als decimaalteken. Prijs per fles als `€ 11,50 / FLES`.
- **Data en tijden:** Nederlands en kort: "ZO 20:00", "di 19 nov".

## Voorbeeldinhoud die vervangen moet worden

Alle namen, bedragen, adressen, foto's en teksten in de schermen zijn voorbeelden. De volgende komen uit de praktijk: de teksten van wijn H en I en hun prijzen en aantallen (uit Marcs WhatsApp-groep), en de werkwijze met lettergenummerde wijnen.

Verzonnen en dus niet overnemen:

- de wijnen F en G
- alle namen van leden
- het e-mailadres
- de bezorg- en afhaaltijden
- ERBIJ en DRINKEN bij wijn I
- alle tekst bij de Barolo
- de tekst op de pagina van Marc
- de foto's van de Barolo (scherm 02, 05 en 08)

Echte foto's in het ontwerp:

- **Het portret van Marc** (scherm 09) komt van marckookt.com en is 360 × 424 px. Voor de app is een groter origineel nodig.
- **De Cándido** (scherm 03 en 10) is uitgesneden uit Marcs WhatsApp-bericht en is 420 × 510 px. Dat is laag; gebruik zijn originele foto.

In `referentie/images/marckookt/` staan ook vier homepagefoto's (`crop_*voorpaginaslide*.jpg`), zes gerechtenfoto's (`*impressies*.jpg`) en twee logo's in wit (`logo-lang-wit.png`, `logo-wit.png`). Ze zijn nog niet in de schermen gebruikt. Wijnfoto's staan niet op de site.

## Wat Marc nog moet aanleveren

- Logo in de witte uitvoering en de exacte goudkleur
- Besluit over het lettertype: licentie voor DIN Pro Condensed of Barlow Condensed
- Vijf tot tien eigen foto's, waaronder een portret
- Eén echte bijzondere fles met tekst, herkomst, bewaring en een spraakbericht van 30 seconden
- Zijn WhatsApp-nummer, de bezorg- en afhaalmomenten, en de standaardstappen bij een bieding

## Buiten deze opdracht

- De AI-assistent en het genereren van omschrijvingen. Die staan als roadmap in het pilotplan en als ontwerp in het `.pen`-bestand (frames "Na de pilot – …"). Niet bouwen in de pilot.
- V1 van het ontwerp (frames "Pilot – …"). Vervangen door V2.
