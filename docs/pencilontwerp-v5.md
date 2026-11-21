# Prompt: ontwerp V5 in Pencil, alle schermen

Gebruik deze prompt in een sessie met de Pencil-koppeling (pen.dev). Hij staat op zichzelf: alles wat het ontwerp moet weten, staat hieronder. Heeft de sessie toegang tot deze repository, dan gelden daarnaast `pilotplan-marcs-wijnclub.md`, `docs/bouwspecificatie.md` (hoofdstuk 10), `design-v4/DESIGN.md` en `design-v3/DESIGN.md`; bij een verschil wint het plan.

---

## De opdracht

Maak in Pencil een volledig ontwerp voor de web-app van **Marcs wijnclub**: elk scherm en elke toestand die de pilot nodig heeft, voor het lid en voor Marc. Noem elk frame `V5 – <nummer> <naam>` (bijvoorbeeld `V5 – 08 De avond`) en `V5 Marc – …` voor beheer. Elk frame is **390 px breed**, staand, met de inhoud van een telefoon. Teken ook de toestanden als eigen frame: leeg, laden, fout, mislukt.

V4 (de frames `V4 –`, `V4 Marc –`, `V4 Login –` in `design-v3/referentie/marc-wijnclub.pen`) is het vertrekpunt: neem over wat werkt, maar teken alles opnieuw als één samenhangende set. De schermen die V4 nog niet tekende, staan hieronder gemarkeerd met **nieuw**.

**De leidraad: voor het lid extreem eenvoudig, voor Marc mag het technischer.** Zie "Het belangrijkste" hieronder.

Vraag na wat tegenstrijdig is of nergens staat, in plaats van te gokken. Lever na afloop een lijst: welke frames er zijn, welke keuzes je zelf maakte, en wat open bleef.

## Waar de app over gaat

Marc is een privéchef in Roermond (marckookt.com). Hij verkoopt wijn via een WhatsApp-groep van ongeveer 120 mensen. De app vervangt het bestellen in die groep, voor een pilot met 20 tot 30 leden, alleen op uitnodiging.

- **Een avond bij Marc.** Marc kondigt een avond aan. Op de begintijd zet hij de wijnen een voor een op tafel en zegt er iets bij. Leden zien dat live (de app ververst elke 3 seconden). Een avond duurt enkele uren.
- **De lijst:** wijnen tegen vaste prijs met een voorraad. Een lid kiest per wijn een aantal, kiest **brengen** of **halen**, en betaalt meteen met **iDEAL**. Marc houdt de flessen 15 minuten vast; daarna vervalt een onbetaalde bon en komt de voorraad terug. Bijbestellen is een nieuwe bon.
- **De veiling:** aan het eind van de avond één bijzondere fles. Het hoogste bod op de eindtijd wint. Een bod is bindend.
- **Voor Marc:** hij fotografeert een fles, plakt zijn WhatsApp-bericht, kijkt na wat de app herkende en kiest lijst of veiling. Tijdens de avond zet hij wijnen op tafel. Na de avond levert hij af.
- **Niet:** geen marktplaats tussen leden, geen App Store-app, geen tabbalk, geen chat in de app.

### Begrippen (gebruik precies deze woorden in schermteksten)

Avond · Aanbod (de startpagina van het lid) · De lijst · Op tafel · Feed · Veiling · De zaal (scherm van de veiling) · Bod · Bon (wat een lid in één keer bestelt en betaalt) · Namens een lid · Vervallen · Brengen / halen · Afleveren · Melding · Bericht van Marc · Bijnaam ("Bieder 7") · Terugblik · Je bestellingen.

## Het belangrijkste: extreem eenvoudig voor het lid

De leden zijn gewone mensen uit een WhatsApp-groep, van alle leeftijden, die nu een appje sturen als "2 × G". Bestellen in de app moet minstens zo makkelijk aanvoelen. Dit gaat boven alle andere wensen; wordt een scherm voor het lid ingewikkeld, maak het dan eenvoudiger in plaats van het uit te leggen.

- **Zo min mogelijk stappen.** Van de melding tot betaald: wijn aantikken, BESTEL, BETAAL. Meer niet. Elke extra tik, keuze of vraag moet zich verantwoorden.
- **Eén ding per scherm.** Eén vraag, één hoofdknop. Geen tweede knop die even zwaar weegt.
- **Slimme standaarden.** Wat het lid vorige keer koos (brengen of halen, het adres) staat al gekozen. Biedt Marc maar één manier aan, dan is er niets te kiezen; laat de keuze dan weg en toon alleen hoe je het krijgt.
- **Gewone woorden.** Geen vaktaal, geen technische termen, geen statuscodes. Niet "bestelling verlopen" maar "Je hebt niet op tijd betaald. De flessen zijn weer terug." Zeg altijd wat het lid nu kan doen.
- **Niets onthouden of uitzoeken.** Geen menu, geen tabbalk, geen instellingen, geen account-pagina. Het aanbod is altijd het startpunt en laat zelf zien wat er nu te doen is (bestellen, betalen, bieden, terugkijken).
- **Groot en duidelijk.** Liever een grote foto, een groot bedrag en een grote knop dan veel tekst. Een wijn: foto, naam, Marcs tekst, prijs, aantal. Extra informatie (jaargang, streek, wat eet je erbij) staat lager of op de wijnpagina.
- **Toestanden zijn varianten, geen nieuwe paden.** Niet betaald, vervallen of uitverkocht verschijnt op het scherm waar het lid al is, met één knop om verder te gaan. Het lid raakt nooit de weg kwijt.
- **Fouten voorkomen in plaats van melden.** Wat niet kan, is niet aan te tikken (een uitverkochte wijn, een te laag bod). Bieden gaat met vaste bedragen, nooit met typen.
- **Toets:** zou iemand van 75 die alleen WhatsApp gebruikt dit scherm zonder hulp snappen? Zo niet, vereenvoudig.

## Ontwerpregels voor elk scherm

1. **Gemaakt voor de telefoon, met één hand.** De hoofdknop staat onderaan, binnen bereik van de duim. Op een groter scherm blijft het één gecentreerde kolom van hoogstens 430 px.
2. **Eén hoofdknop per scherm**, altijd onderaan. De vaste onderkant is hoogstens een kwart van 667 px hoog.
3. **De avond is één scherm:** alle wijnen onder elkaar in de feed, het aantal direct erbij.
4. **Naam en foto, geen letters.** Een lid ziet een wijn bij zijn naam en met een foto. Alleen Marc gebruikt letters ("C2 D2") bij een bestelling namens een lid.
5. **Marc eerst:** zijn aankondiging boven de avond, zijn tekst bij elke wijn boven de prijs.
6. **Rustig.** Een live-stip die niet knippert, het label "NET OP TAFEL", een rustige klok in de laatste twee minuten van een veiling. Geen badges, punten of knipperende aftelklok. Elk scherm moet bruikbaar blijven als die drie dingen uit staan.
7. **Tikvlakken minstens 44 × 44 px**, met 8 px ertussen. Een fles in de flessenrij is smaller, daarom staan er ook een min- en een plusknop van 44 px.
8. **Zonder scrollen in beeld op 375 × 667 px**, boven de vaste onderkant:
   - Aanbod: de eerste wijn met naam, prijs en flessenrij
   - De bon: het totaal, brengen of halen, en Betaal
   - Bijzondere fles: het hoogste bod en de eindtijd
   - Biedpaneel: het gekozen bod, dat het bindend is, en Bevestig (ook op 320 × 568 px)
   - Je bestellingen: wat je nog moet betalen
9. **Leesbaar:** lopende tekst minstens 16 px, een label in hoofdletters minstens 13 px. Contrast minstens 4,5:1 (3:1 vanaf 24 px), ook voor een keuze die nog niet gekozen is. Invoervelden 16 px of meer.
10. **Geen vergissing bij een bindende stap:** vóór Betaal en Bevestig bod staan aantal, bedrag en brengen of halen in beeld. Een stap die niet terug kan (de avond sluiten, een lid verwijderen) heeft een bevestiging.
11. **Panelen** schuiven van onderen op en sluiten ook met een knop onderaan of door omlaag te vegen. Houd rekening met de inkeping en de veegbalk (veilige randen).
12. **Een lid hoeft niets te typen** om te bestellen of te bieden.

## Stijl (van marckookt.com, ongewijzigd sinds V3)

**Kleuren**

| Token | Waarde | Gebruik |
| --- | --- | --- |
| bg | `#000000` | Achtergrond |
| surface | `#111111` / `#141414` | Terugblik, de balk "straks" |
| ink | `#FFFFFF` | Tekst, hoofdknop, gekozen fles, de bon |
| muted | `#9A9A9A` | Bijschriften |
| event | `#7A7A7A` | Gebeurtenissen in de feed |
| dim | `#8A8A8A` | Inactieve tekst |
| ghost | `#262626` | Spookwoorden, alleen decoratief |
| line | `#2B2B2B` | Lijnen tussen secties |
| line-soft | `#1E1E1E` | Lijnen tussen rijen, uitverkochte flessen |
| outline | `#6E6E6E` | Rand van een beschikbare fles |
| gold | `#C9A84C` | Accent: live-stip, tijden, "MARC · 19:52", NET OP TAFEL, OVERBODEN, VERKOCHT., de iDEAL-knop. Spaarzaam |
| paper | `#FFFFFF` met tekst `#000000` en bijschrift `#555555` | De bon |
| ok | `#2F6B45` op papier | Stempel BETAALD |
| grey-btn | `#4A4A4A` | Secundaire knop |

**Typografie:** één familie, Barlow Condensed (300 tot 700, plus cursief 300), smal en schreefloos. Koppen, labels en knoppen in hoofdletters. Eventkoppen 76–120 px, gewicht 700, krappe regelafstand (0,82–0,86) en letter-spacing −2 tot −3 px; moeten binnen 390 px passen. Hero-bedrag 112 px. Prijs in de feed 30 px met `€` op 16 en `/ FLES` op 12. Wijnnaam 20 px (de nieuwste 26). Bericht van Marc 18 px, gewone hoofdletters. Afzender en tijd 12–13 px goud, letter-spacing 1,5 px. Labels 13–15 px, gewicht 600–700, letter-spacing 1,2–2 px.

**Ruimte en vorm:** schermmarge 20 px, stappen van 4. Hoeken 0, behalve Marcs avatar en de live-stip (rond), de bovenkant van een fles in de flessenrij, de afspeelknop en de pushmelding. Gestippelde lijnen (1 px, streep 2 px, gat 3 px, `#5A5A5A`) tussen adviesblokken; een volle witte lijn van 1 px boven en onder statusbalken. Geen schaduwen; alleen een verloop van transparant naar zwart over foto's.

**Knoppen:** rechthoekig, hoofdletters. Wit voor de hoofdknop, grijs voor de rest, goud voor betalen. De knop heet "BETAAL MET IDEAL" (wordt later "BETAAL" als Wero komt).

**Beweging:** hoogstens 200 ms, ease-out. Een nieuw feeditem schuift omhoog, een gekozen fles wordt wit, de keukenbon en het biedpaneel schuiven omhoog, een nieuw hoogste bod telt in 300 ms op. Niets knippert.

**Toon:** je-vorm voor het lid, ik-vorm voor Marc, korte zinnen. Bedragen als `€ 11,50` en `€ 11,50 / FLES`. Tijden als "19:52", "zojuist", "2 min".

## Componenten

Teken deze één keer als herbruikbaar onderdeel en gebruik ze overal:

- **Duim:** kleine foto van een fles (26 × 34 px in lijsten, groter in feed en beheer). De veiling heeft een gouden rand. Zonder foto een grijs vlak.
- **Live-balk** met live-stip, en de variant "VERBINDING HERSTELLEN…" met een grijze stip.
- **Bericht van Marc** in de feed: avatar, "MARC · 19:52" in goud, zijn tekst.
- **Gebeurtenis** in de feed, zonder namen: "EEN LID NAM 2 × JANASSE", "DE VERDEJO IS OP".
- **Wijn in de feed:** foto links, bovenaan "WIT · SPANJE · 19:31" (kleur, land, tijd), naam, Marcs tekst, prijs, voorraad, flessenrij met min en plus. De nieuwste krijgt het gouden label "NET OP TAFEL · ROOD · ITALIË · 19:52". Variant uitverkocht.
- **Flessenrij:** kleine flessen om een aantal te kiezen; een gekozen fles is wit. Min- en plusknop van 44 px.
- **Keukenbon:** verschijnt onderaan zodra er iets is aangetikt, met aantal, totaal en BESTEL.
- **Zwevende navigatie** op de wijnpagina: "← HET AANBOD" en "VRAAG MARC" (icoon `message-circle`), elk in een zwart vlak.
- **Bon (papier):** "TAFEL", de naam van het lid, regels met duim, aantal en bedrag, totaal. Onderaan "Ik houd je flessen 15 minuten vast. — Marc".
- **Betaald-bon:** wit papier, per regel een duim, "€ 38,50 · iDEAL" en de groene stempel BETAALD. Varianten: NIET BETAALD., VERVALLEN., OPEN (met betaalknop).
- **Split-keuze:** BRENG / HAAL met een zin eronder ("Ik breng ze donderdagavond", "Jij haalt ze zaterdag op"); in beheer LIJST / VEILING. Variant met één optie niet beschikbaar.
- **Hoe je ze krijgt:** het woord BRENG of HAAL groot, met moment en adres (of plek) ernaast.
- **Biedlog:** bedrag, tijd, bijnaam ("Bieder 7"), berichten van Marc ertussen. Je eigen bod in goud, zonder doorhaling, ook als je overboden bent. Variant zonder bijnamen (alleen bedragen en tijden).
- **Biedknoppen en biedpaneel:** drie bedragen, de melding dat een bod bindend is, BEVESTIG € … en een knop om te stoppen.
- **Eenmaal, andermaal:** spookwoorden en een rustige klok.
- **Hamerslag en terugblik.**
- **Voortgang bij inloggen:** drie gouden balkjes van 3 px.
- **Rij-veld (beheer):** label links in hoofdletters, waarde groot rechts, potlood. Twijfelt de app, dan een lichtgele achtergrond en "KLOPT DIT?".
- **Segmenten (afleveren):** BRENGEN n · HALEN n · KLAAR n; het gekozen segment is wit.
- **Tellers (beheer):** flessen, bonnen, betaald bedrag.
- **Pushmelding** zoals die op het vergrendelscherm verschijnt.
- **Bevestiging:** paneel voor een stap die niet terug kan.
- **Laden:** geen spinner; koppen staan er al in ghost, tekstregels als grijze balken, na 300 ms "Even geduld…".
- **Fout:** "Er ging iets mis. Probeer het zo nog eens, of vraag het Marc." Geen technische details.

## Alle schermen

Elk scherm met de hoofdknop. **Nieuw** = nog nooit getekend.

### A. Inloggen (lid)

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 01 | Je e-mailadres | Het adres dat het lid aan Marc gaf. Voortgang 1 van 3 | STUUR MIJ EEN CODE |
| 02 | De code | Code uit de mail, cijfertoetsenbord, de telefoon vult hem in; daarna vanzelf verder. Ook: code fout of verlopen, opnieuw sturen | – |
| 03 | Achttien | "Welkom, Lid 1" en de vraag: ben je 18 of ouder? Met Ja ga je akkoord met de voorwaarden (link) | JA, KOM BINNEN |
| 03b | **Nieuw:** Nee bij 18 | Uitleg dat je zonder 18+ niet kunt bestellen of bieden, en hoe je het later herstelt | TERUG |
| 06 | **Nieuw:** Geen toegang | "Deze club is alleen op uitnodiging van Marc." | VRAAG MARC |
| 07 | **Nieuw:** Meldingen en beginscherm | Na de eerste keer: zet de app op je beginscherm (uitleg voor iPhone en Android) en sta meldingen toe | STA MELDINGEN TOE |

Teken geen scherm voor Face ID (een passkey) en geen scherm "Welkom terug". Een passkey valt buiten de pilot: hij zit vast aan het adres van de site, en de pilot begint op een tijdelijk adres. Wie ingelogd is, komt direct op het aanbod; wie uitgelogd is, begint bij het e-mailadres. De nummers 04 en 05 blijven leeg.

### B. Het aanbod (startpagina, zonder tabbalk)

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 10 | **Nieuw in V4-stijl:** Niets open | Geen avond aangekondigd en geen terugblik: "NIETS OPEN." met een zin van Marc. Link onderaan naar Marc | – |
| 11 | Aankondiging | Vóór de begintijd: datum, Marcs aankondiging, wat er op tafel komt (duim, naam, kleur, land), de veiling als laatste regel. Een wijn is te bekijken, niet te bestellen | HERINNER MIJ OM 19:30 (daarna: "Je krijgt een melding om 19:30") |
| 12 | De avond (live) | Live-balk, feed met berichten van Marc, wijnen op tafel en gebeurtenissen. Onderaan wanneer de veiling begint. Keukenbon zodra er iets is aangetikt | BESTEL |
| 12b | **Nieuw:** De avond, nog niets op tafel | Begintijd voorbij, Marc heeft nog niets neergezet: "Marc zet zo de eerste wijn op tafel" | – |
| 12c | **Nieuw:** Verbinding herstellen | De avond met grijze stip en "VERBINDING HERSTELLEN…" | – |
| 13 | **Nieuw als eigen scherm:** Terugblik | Na de avond: wat er verkocht is, de uitkomst van de veiling (als er een was), de weg naar Je bestellingen. Blijft tot de volgende aankondiging | NAAR JE BESTELLINGEN |
| 14 | Wijn | Grote foto, naam, kleur, land, jaargang, Marcs tekst; "Wat eet je erbij" en "Wanneer drinken" alleen als Marc ze invulde. Zwevend: ← HET AANBOD en VRAAG MARC. Flessenrij. Varianten: vóór de avond (alleen bekijken), uitverkocht | BESTEL (via keukenbon) |
| 15 | Net op | Een wijn is op terwijl je bestelde: er is niets besteld | TERUG NAAR HET AANBOD |
| 16 | Bijzondere fles | Poster: grote foto, spraakbericht van Marc (30 s, afspeelknop), drie blokken (waarom deze, wanneer drinken, wat eet je erbij), herkomst en bewaring, "geen opgeld: het bod is de prijs". Te openen vanaf de aankondiging en de zaal | NAAR DE VEILING (vóór het begin), BIED € … (tijdens) |

### C. Bestellen en betalen

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 20 | De bon | De gekozen wijnen met aantallen, het totaal, BRENG / HAAL met het moment, "Ik houd je flessen 15 minuten vast". Betaal werkt pas na een keuze. Varianten: alleen brengen, alleen halen | BETAAL MET IDEAL |
| 21 | **Nieuw:** Je afleveradres | Bij brengen zonder adres: straat, huisnummer, postcode, plaats. Alleen het lid en Marc zien het. Ook: adres wijzigen | BEWAAR EN GA VERDER |
| 22 | Betaald | De bon met stempel BETAALD en hoe je ze krijgt: BRENG of HAAL, moment, adres of plek | TERUG NAAR HET AANBOD |
| 23 | **Nieuw:** Niet betaald | Betaling mislukt of afgebroken: "NIET BETAALD.", "Je flessen houd ik nog tot 20:13 voor je vast" | PROBEER OPNIEUW |
| 24 | **Nieuw:** Wacht op de bank | Betaling gestart, nog geen uitslag van Mollie | – |
| 25 | **Nieuw:** Vervallen | "VERVALLEN.": niet op tijd betaald, de flessen zijn terug | TERUG NAAR HET AANBOD |
| 26 | **Nieuw:** Open bon namens een lid | Marc voerde een bon in na een bericht in de groep; het lid opent de betaallink. Betalen vóór een tijd (48 uur), brengen of halen kiezen | BETAAL MET IDEAL |
| 27 | **Nieuw:** Je bestellingen | Je bonnen op de lopende avond en de fles die je won, met brengen of halen en de status: betaal vóór …, betaald, gebracht, opgehaald, vervallen. Een open bon heeft een eigen betaalknop. Lege toestand: "Nog niets besteld" met link naar het aanbod | NAAR HET AANBOD |

### D. De veiling

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 30 | **Nieuw:** De zaal vóór het begin | De fles, de begintijd, het startbod | HERINNER MIJ |
| 31 | De zaal (live) | Hoogste bod groot, de hamertijd, de biedlog met berichten van Marc; je eigen bod in goud. Statussen: JIJ BENT DE HOOGSTE (knop uit) en OVERBODEN (goud) | BIED € … |
| 32 | Bod bevestigen | Paneel van onderaf met drie bedragen (het minimum en twee hoger, hoogstens 3× het minimum), de melding dat een bod bindend is, en stoppen | BEVESTIG € … |
| 33 | Eenmaal, andermaal | Laatste twee minuten: spookwoorden, rustige klok. Een bod verlengt tot twee minuten na dat bod | BIED € … of JE STAAT BOVENAAN |
| 34 | Verkocht (winnaar) | Hamerslag, "VERKOCHT.", je prijs, 48 uur om te betalen | BETAAL € … MET IDEAL |
| 35 | **Nieuw:** Afgelopen (de anderen) | "AFGELOPEN.", voor hoeveel de fles ging, terugblik | TERUG NAAR HET AANBOD |
| 36 | **Nieuw:** Gewonnen fles: brengen of halen | Na het betalen kiest de winnaar BRENG of HAAL; is het moment van de avond voorbij, dan "Marc spreekt het met je af" | KLAAR |
| 37 | **Nieuw:** Veiling gaat niet door | Marc sloot de avond voordat de veiling opende | TERUG NAAR HET AANBOD |

### E. Overige schermen voor het lid

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 40 | Marc | Zijn foto, een korte tekst, links naar voorwaarden en privacy. Bereikbaar via een link onderaan het aanbod, zonder tab | VRAAG MARC |
| 41 | **Nieuw:** Voorwaarden | Leesbare pagina met kopjes; tekst als plaatshouder | TERUG |
| 42 | **Nieuw:** Privacy | Idem, met wat er van het lid bewaard wordt en hoe het dat laat wissen | TERUG |
| 43 | **Nieuw:** Laden | Het aanbod in laadtoestand | – |
| 44 | **Nieuw:** Fout | Algemene foutmelding | PROBEER OPNIEUW |
| 45 | **Nieuw:** Meldingen | Eén frame met alle pushmeldingen op een vergrendelscherm: nieuwe avond, de avond begint, nog beschikbaar, de veiling begint, overboden, gewonnen, betaallink (namens een lid), herinnering om te betalen, "Marc is onderweg" | – |
| 46 | **Nieuw:** Mails | De uitnodigingsmail en de mail met de inlogcode, in de stijl van de club | – |

### F. Beheer (Marc, ook op zijn telefoon)

**Beheer mag technischer.** Marc werkt er vaak in en leert het één keer. Hier mag het compacter en rijker dan bij het lid: meer gegevens per scherm, lijsten en tabellen, tellers, statussen en tijdstempels, filters en segmenten, kleinere tekst voor bijzaken (wel minstens 13 px), meerdere knoppen per scherm, en een menu tussen de schermen. Het blijft wel bruikbaar op zijn telefoon met één hand, in dezelfde stijl, met een bevestiging bij alles wat niet terug kan. Snelheid tijdens de avond gaat voor volledigheid: op het scherm "De avond" moet Marc met één tik een wijn op tafel kunnen zetten.

V4 tekende geen weg tussen de beheerschermen. **Ontwerp die navigatie** (bijvoorbeeld een kop met een menu of een tabbalk alleen voor beheer). Leden zien die nooit.

| # | Scherm | Wat erop staat | Hoofdknop |
| --- | --- | --- | --- |
| 50 | **Nieuw:** Beheer: overzicht | Waar Marc binnenkomt: de volgende avond en zijn status, wat aandacht vraagt, de weg naar de andere schermen | – |
| 51 | **Nieuw:** Een avond plannen | Titel, aankondiging, datum, begin- en eindtijd; brengen en/of halen met moment, bij halen de plek. Daarna aankondigen (leden krijgen een melding; Marc deelt de link in de groep) | KONDIG AAN |
| 52 | Nieuwe fles 1: fotografeer | Camera met kader, fotorol, of WhatsApp-tekst plakken | De sluiter |
| 53 | Nieuwe fles 2: kijk het na | Rij-velden uit etiket en bericht: naam, korte naam, producent, jaargang, streek, kleur, land, partij, aantal, prijs, tekst. Twijfel in lichtgeel met KLOPT DIT? | KLOPT, VERDER |
| 53b | **Nieuw:** Nieuwe fles 2b: tekstvoorstellen | Steekwoorden typen of dicteren ("fris, citrus, bij asperges"), drie voorstellen om uit te kiezen. Woorden die niet van Marc of het etiket komen, zijn gemarkeerd. Zelf aanpassen kan | KIES DEZE |
| 54 | Nieuwe fles 3a: op de lijst | Prijs, aantal (voorraad), "Wat eet je erbij" en "Wanneer drinken" (mag leeg) | ZET KLAAR VOOR DINSDAG |
| 55 | Nieuwe fles 3b: in de veiling | Startbod, minimale verhoging, begin van de veiling, eindtijd (binnen de avond), herkomst, bewaring, spraakbericht van 30 s opnemen en terugluisteren. Hoogstens één veiling per avond | ZET KLAAR VOOR DINSDAG |
| 56 | Nieuwe fles 4: klaar | Zo zien leden de fles; wat klaarstaat voor de avond | NOG EEN FLES |
| 57 | De avond (live verkopen) | Wijnen die klaarstaan en die op tafel staan, iets tegen de tafel zeggen (zelf typen of een snelle zin), de veiling eerder starten, tellers (flessen, bonnen, betaald bedrag). Varianten: vóór de begintijd, tijdens, na het sluiten | ZET DE CHIANTI OP TAFEL, op het eind SLUIT DE AVOND |
| 57b | **Nieuw:** Nog beschikbaar delen | Voorbeeld van het WhatsApp-bericht: de wijnen op tafel die niet op zijn, met prijs, voorraad en link | DEEL IN WHATSAPP |
| 57c | **Nieuw:** De avond sluiten | Bevestiging dat het niet terug kan. Kan niet zolang de veiling open is | SLUIT DE AVOND |
| 58 | **Nieuw:** Namens een lid | Een lid kiezen, letters en aantallen zoals "C2 D2" (de app toont welke wijnen dat zijn), brengen of halen. Het lid krijgt een betaallink | VOER IN |
| 59 | Afleveren | Bovenaan "Vraagt aandacht" met signalen (bijvoorbeeld een bon die verviel na een betaalpoging). Segmenten BRENGEN · HALEN · KLAAR. Per lid de flessen, naam en adres, status van betalen; afvinken; betaallink opnieuw sturen | LAAT WETEN: IK BEN ONDERWEG |
| 59b | **Nieuw:** Tijdlijn van een bestelling | Paneel: de stappen met een tijdstip (besteld, betaling gestart, betaald, gebracht…), zonder naam, adres of bedrag | SLUIT |
| 60 | **Nieuw:** Leden | Lijst van leden; uitnodigen met naam en e-mail en bevestigen dat het lid 18+ is; afleveradres bijhouden; een lid verwijderen (met bevestiging) | NODIG UIT |

## Wat je niet doet

- **Geen echte namen, adressen of telefoonnummers.** Gebruik `Lid 1`, `Lid 2`, `Voorbeeldstraat 1, 6041 AA Roermond`, `lid-1@voorbeeld.nl`. Marc mag bij naam.
- **Leg Marc geen woorden in de mond.** Elke tekst in zijn stem (aankondiging, bericht aan de tafel, wijntekst, snelle zin) is zichtbaar gemarkeerd als **VOORBEELD**.
- Geen logo of huisstijl van marckookt.com overnemen behalve de genoemde kleuren en het lettertype; het logo levert Marc later.
- Niets uit de roadmap: geen eigen collectie, bewaren, wachtlijst, filteren op smaak, maximaal bod, chat.

## Opleveren

1. Alle frames hierboven, genummerd en benoemd zoals in de tabellen, in de volgorde van de tabellen.
2. Een frame met de componenten en de tokens.
3. Een korte lijst: welke keuzes je zelf maakte (bijvoorbeeld de navigatie in beheer), wat je niet kon tekenen en wat open bleef.
4. Per stroom van het lid het aantal tikken: van de melding tot betaald, van de melding tot een bod, en van een open betaallink tot betaald. Zie je een stap die weg kan, stel dat voor.
