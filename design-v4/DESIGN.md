# Design: Marc Kookt Wijnclub (V4)

Ontwerp voor de pilot uit `../pilotplan-marcs-wijnclub.md`. Dit document en de map `schermen/` zijn samen de specificatie voor de bouw van de web-app. V4 bouwt voort op V3 ("Vanavond bij Marc"): wat hier niet staat, staat in `../design-v3/DESIGN.md` en blijft gelden.

**Wat waar wint**

- **Functie, regels, data en beveiliging:** het pilotplan en `../docs/bouwspecificatie.md`. Sinds 20 november 2026 volgen die V4 op het betalen en de levering (zie "Wat V4 aan de regels verandert").
- **Uiterlijk, opmaak en interactie:** dit document en de schermen.
- **Tegenstrijdig of niet beschreven:** vraag het na, niet gokken.

## Inhoud van deze map

| Pad | Wat |
| --- | --- |
| `DESIGN.md` | Dit document |
| `schermen/01…21-*.png` | Elk scherm op 2× (780 px breed). Het ontwerp is 390 px breed |

Het bronbestand is hetzelfde als `../design-v3/referentie/marc-wijnclub.pen`. Alleen de frames met `V4 –`, `V4 Marc –` en `V4 Login –` in de naam horen bij V4.

## Wat V4 verandert ten opzichte van V3

**Geen tabbalk meer.** Het lid heeft één startpagina: de aankondiging, het aanbod tijdens de avond, of de terugblik. Mijn flessen en de pagina van Marc zijn geen tab meer.

**Geen letters meer voor leden.** Een wijn heet bij zijn naam en heeft een foto. De reuzenletters zijn weg uit de aankondiging, de feed, de wijnpagina, de bon en de terugblik. Gebeurtenissen noemen de wijn bij het eerste woord van zijn korte naam: "EEN LID NAM 2 × JANASSE", "DE VERDEJO IS OP". Marc gebruikt de letters nog bij een bestelling namens een lid ("G2 H1").

**Betalen bij het bestellen.** De bon heeft BETAAL MET IDEAL (goud). Daarna volgt het scherm BETAALD. Marc houdt de flessen 15 minuten vast.

**Brengen of halen.** Op de bon kiest het lid BRENG of HAAL. Brengen gaat naar het adres van het lid, op een moment dat Marc per avond kiest.

**Inloggen in vijf schermen.** E-mailadres, code, 18 jaar of ouder, Face ID, en terugkomen met Face ID.

**Een fles klaarzetten begint met de camera.** Marc fotografeert de fles. De app leest het etiket en zijn WhatsApp-tekst. Marc kijkt het na en kiest lijst of veiling.

**Afleveren.** Een nieuw beheerscherm na de avond, met brengen, halen en klaar.

### Componenten

- **Duim:** een kleine foto van een fles (26 × 34 px in lijsten, groter in de feed en het beheer). De veiling heeft een gouden rand. Zonder foto een grijs vlak.
- **Wijn in de feed:** de foto links in plaats van de reuzenletter. Bovenaan staat "WIT · SPANJE · 19:31": kleur, land en tijd. De nieuwste heeft het gouden label "NET OP TAFEL · ROOD · ITALIË · 19:52" op de foto, zonder reuzenletter.
- **Zwevende navigatie op de wijnpagina:** "← HET AANBOD" en "VRAAG MARC" met het icoon `message-circle`, elk in een zwart vlak.
- **Bon:** zoals in V3, met "TAFEL" en de naam van het lid. Onderaan staat "Ik houd je flessen 15 minuten vast. — Marc".
- **Split-keuze:** BRENG / HAAL met een zin eronder ("Ik breng ze donderdagavond", "Jij haalt ze zaterdag op"), en LIJST / VEILING in het beheer.
- **Betaald-bon:** wit papier zonder draaiing, met per regel een duim, het totaal "€ 38,50 · iDEAL" en de groene stempel BETAALD.
- **Hoe je ze krijgt:** het woord BRENG of HAAL groot, met het moment en het adres ernaast.
- **Biedlog:** jouw eigen bod staat in goud, zonder doorhaling, ook als je overboden bent.
- **Voortgang bij inloggen:** drie gouden balkjes van 3 px.
- **Rij-veld (beheer):** een label links in hoofdletters en de waarde groot rechts, met een potlood. Een veld waar de app aan twijfelt, krijgt een lichtgele achtergrond en "KLOPT DIT?".
- **Segmenten (afleveren):** BRENGEN n · HALEN n · KLAAR n. Het gekozen segment is wit.

De tokens, de typografie, de ruimte en de vorm zijn ongewijzigd ten opzichte van V3.

## Schermen

| # | Bestand | Route | Doel | Hoofdactie |
| --- | --- | --- | --- | --- |
| 01 | `01-login-1-je-emailadres.png` | `/welkom` | Het e-mailadres dat het lid aan Marc gaf | STUUR MIJ EEN CODE |
| 02 | `02-login-2-de-code.png` | `/welkom` | De code uit de mail. De telefoon vult hem in (`one-time-code`), daarna gaat het lid vanzelf verder | – |
| 03 | `03-login-3-achttien.png` | `/welkom` | "Welkom, …" en de vraag: ben je 18 of ouder? Met Ja ga je akkoord met de voorwaarden | JA, KOM BINNEN |
| 04 | `04-login-4-face-id.png` | `/welkom` | Voortaan zonder code: een passkey | JA, GEBRUIK FACE ID |
| 05 | `05-login-5-terugkomen.png` | `/welkom` | Terugkomen met Face ID | KOM BINNEN |
| 06 | `06-aankondiging.png` | `/` vóór de avond | Wat er vanavond op tafel komt | HERINNER MIJ OM 19:30 |
| 07 | `07-het-aanbod-live.png` | `/` tijdens de avond | De live feed met de flessenrij en de keukenbon | Keukenbon → BESTEL |
| 08 | `08-wijn.png` | `/wijn/:id` | Eén wijn in detail | Keukenbon → BESTEL |
| 09 | `09-bestelling-de-bon.png` | `/bestelling` | Controle, brengen of halen | BETAAL MET IDEAL |
| 10 | `10-betaald.png` | `/bon/:id` | Na de betaling: de bon met stempel, en hoe je ze krijgt | TERUG NAAR HET AANBOD |
| 11 | `11-de-veiling-live.png` | `/veiling/:id` | De zaal | BIED € … |
| 12 | `12-bod-bevestigen.png` | paneel boven 11 | Bedrag kiezen, bindend bevestigen | BEVESTIG € … |
| 13 | `13-eenmaal-andermaal.png` | `/veiling/:id`, laatste 2 min | Spanning tot de hamer | BIED € … of JE STAAT BOVENAAN |
| 14 | `14-verkocht.png` | `/veiling/:id` na de hamer | Hamerslag en terugblik | BETAAL € … MET IDEAL |
| 15 | `15-marc-1-fotografeer.png` | `/beheer/nieuw` | Camera, fotorol of WhatsApp-tekst plakken | De sluiter |
| 16 | `16-marc-2-kijk-het-na.png` | `/beheer/nieuw` | Herkend van het etiket en uit WhatsApp; nakijken | KLOPT, VERDER |
| 17 | `17-marc-3a-op-de-lijst.png` | `/beheer/nieuw` | Lijst: prijs, aantal, wanneer op tafel | ZET KLAAR VOOR DINSDAG |
| 18 | `18-marc-3b-in-de-veiling.png` | `/beheer/nieuw` | Veiling: startbod, verhoging, hamer, herkomst, bewaring, spraakbericht | ZET KLAAR VOOR DINSDAG |
| 19 | `19-marc-4-klaar.png` | `/beheer/nieuw` | Zo zien leden de fles; wat klaarstaat voor de avond | NOG EEN FLES |
| 20 | `20-marc-5-live-verkopen.png` | `/beheer` | Marc presenteert de avond | ZET DE CHIANTI OP TAFEL |
| 21 | `21-marc-6-afleveren.png` | `/beheer/afleveren` | Brengen, halen, klaar; betaallink sturen | LAAT WETEN: IK BEN ONDERWEG |

Zonder `V4`-frame in de tabel hierboven:

- **De bijzondere fles:** de poster met spraakbericht, herkomst en bewaring. Komt uit V3 (scherm 06) en is te openen vanaf de zaal.
- **Net op:** komt uit V3 (scherm 16), zonder letters.
- **Je bestellingen:** nog niet getekend. Het lid komt er via de terugblik na de avond.
- **Marc:** het scherm met voorwaarden en privacy. Nog niet getekend, en zonder tab.

## Wat V4 aan de regels verandert

Aidan besloot op 20 november 2026 om V4 te volgen. Het plan en de bouwspecificatie zijn daarop aangepast.

| Punt | Was (plan, V3-prototype) | Nu (V4) |
| --- | --- | --- |
| Betalen | Bestellen kost niets; één betaling per lid als de lijst sluit, binnen 48 uur | Meteen bij het bestellen, per bon. Marc houdt de flessen 15 minuten vast; daarna vervalt de bon en komt de voorraad terug |
| Namens een lid | Betalen bij het sluiten | Het lid krijgt een betaallink en heeft 48 uur |
| Levering | Afhaalpunten per regio | Brengen (naar het adres van het lid) of halen (bij Marc), per avond met een moment |
| Gewonnen fles | Na het betalen een afhaalpunt kiezen | Na het betalen brengen of halen kiezen |
| Persoonsgegevens | Geen adres | Een afleveradres voor wie wil dat Marc brengt. Alleen het lid en Marc zien het |
| Inloggen | Code per e-mail | Code per e-mail, daarna eventueel een passkey ("Face ID") |

## Hoe het prototype afwijkt van de schermen

- **Flessen kiezen.** Tikken op de flessen werkt, zoals V4 laat zien. De min- en de plusknop van 44 px blijven toch staan: een fles is te smal om met een duim zeker te raken (bouwspecificatie, M2).
- **Namen en adressen.** Het prototype gebruikt verzonnen leden (`Lid 1`, `Voorbeeldstraat 1`), geen namen zoals in de schermen. Zo staat het in CLAUDE.md.
- **Marcs woorden.** Teksten in Marcs stem zijn in het prototype als voorbeeld gemarkeerd.
- **Camera.** De sluiter gebruikt een voorbeeldfoto en de herkenning is een eenvoudige regel. In de echte app leest een taalmodel het etiket en het bericht.
- **Navigatie in het beheer.** V4 tekent geen weg tussen de beheerschermen. Het prototype heeft daarom tekstlinks: "+ NIEUWE FLES" en "AFLEVEREN →" op de avond, en "← DE AVOND" bij afleveren.

## Nog niet getekend

- Je bestellingen, en de pagina met voorwaarden en privacy
- Het adres invullen of wijzigen, en brengen voor een lid zonder adres
- Betaling mislukt, en een bon die vervallen is. Het prototype gebruikt de stijl van scherm 10: "NIET BETAALD." en "VERVALLEN."
- AFGELOPEN. voor wie de veiling niet won
- Een gewonnen fles na het betalen: brengen of halen kiezen
- Nee bij 18 jaar of ouder
- Bestelling namens een lid, in de stijl van V4
- Een avond plannen: datum, tijden, de momenten van brengen en halen, de aankondiging

## Let op voor de openbare repository

De schermen 01, 02, 03, 05, 09, 10 en 21 en het bronbestand bevatten namen en adressen die de ontwerper verzon ("Sanne", straten in Zeeuwse plaatsen). Het zijn geen leden. Ze lijken wel echt. Vervang ze bij een volgende ronde door `Lid 1` en `Voorbeeldstraat 1`.
