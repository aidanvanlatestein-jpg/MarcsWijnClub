# Roadmap: Marcs wijnclub

Verhuisd uit het [pilotplan](../pilotplan-marcs-wijnclub.md) op 21 november 2026, met dezelfde nummers. Niets hiervan hoort in de pilot, behalve onderwerp 13 en 15 en stap A van onderwerp 19. Onderwerp 13 en 15 moeten af vóór de eerste uitnodiging aan een lid en staan in de planning van het plan, in week 8. Stap A van onderwerp 19 staat in week 7.

Na een geslaagde pilot volgen twee uitbreidingen met een taalmodel: eerst de omschrijving van een fles, daarna een assistent die vragen van leden beantwoordt. Die volgorde is bewust: de omschrijving bouwt voort op wat de pilot al doet en Marc keurt elke tekst goed. De assistent praat rechtstreeks met leden en vraagt meer waarborgen. Een derde uitbreiding staat los van het taalmodel: geplande campagnes, met een meting van het beste moment om leden te benaderen.

Onderwerp 4 tot en met 12 komen uit het marktonderzoek van 19 november 2026. Het zijn ideeën: ze zijn nog niet met Marc besproken en staan in volgorde van verwachte opbrengst tegenover bouwtijd. Geen ervan hoort in de pilot.

Onderwerp 13 is geen idee maar een uitgestelde keuze: het eigen domein. Het staat onderaan omdat het geen functie is, niet omdat het lang kan wachten.

Onderwerp 14 stond eerst in de pilot en is er op 19 november 2026 uitgehaald: de eigen collectie van een lid. De pilot gaat alleen over verkopen en bieden. Dat maakt de app eenvoudiger, en onderwerp 4 en een deel van onderwerp 5 en 9 wachten erop.

Onderwerp 15 is ook geen idee: het is de lijst met verbeterpunten uit de beveiligingsscan van 20 november 2026, nu in [beveiliging.md](beveiliging.md). Een deel moet af vóór de eerste uitrol naar productie. Onderwerp 13 en 15 staan daarom ook in de planning van het plan, in week 8.

Onderwerp 16 is een idee van Aidan van 21 november 2026, met Vivino als aanleiding: een lid ziet bij elke wijn hoe die is, ziet wat bij zijn smaak past en krijgt een melding op maat. Het is dezelfde dag verfijnd na een marktonderzoek en nog niet met Marc besproken. Het hoort niet in de pilot. Stap A heeft een eigen [bouwplan](bouwplannen/16a-kenmerken-per-wijn.md) en wordt gebouwd met een schakelaar die in productie uit staat tot Marc instemt.

Onderwerp 17 is een uitgestelde keuze van 21 november 2026: live bijwerken via een WebSocket in plaats van pollen.

Onderwerp 18 is een idee van Aidan van 21 november 2026: elke flesfoto krijgt dezelfde professionele stijl, met een eigen model in AWS of met commerciële AI. Het is nog niet met Marc besproken en hoort niet in de pilot.

Onderwerp 19 is een idee van Aidan van 21 november 2026: zien wat er met een bestelling gebeurde en waar leden vastlopen, zodat Marc of Aidan kan ingrijpen. Het is nog niet met Marc besproken. Stap A, de tijdlijn per bestelling met de signalen, is dezelfde dag naar de pilot gehaald en staat in week 7 van het plan. Stap B en C blijven hier.

Onderwerp 20 is een verbeterpunt van 21 november 2026: het tabblad van de browser toont nu een algemeen plaatje en krijgt het logo van de club. Het hoort niet in de pilot.

Onderwerp 21 is een idee van Aidan van 21 november 2026: de app ondersteunt naast de telefoon ook de browser op een pc, met een bredere indeling voor beheer. Leden gebruiken vooral hun telefoon; Marc doet zijn voorraad en planning naar verwachting ook achter de pc. Het is nog niet met Marc besproken en hoort niet in de pilot.

Onderwerp 22 is een besluit van 21 november 2026: de passkey ("Face ID") die design-v4 tekende, gaat uit de pilot en wacht op het eigen domein van onderwerp 13.

| Onderwerp | Wat het oplevert | Start als |
| --- | --- | --- |
| 1. Omschrijving via een taalmodel | Marc zet een fles in enkele minuten online, in zijn eigen woorden. Het etiket lezen en tekstvoorstellen uit steekwoorden in zijn stijl, met echte teksten van Marc als voorbeeld, zitten al in de pilot. Hier volgen spraak naar tekst, het leren van zijn stijl uit de teksten die hij in de app goedkeurt, en feiten over de maker opzoeken met bron. De route naar het model is gekozen: de API van Anthropic, met een [bouwplan](bouwplannen/1b-claude-api.md) | De route: nu, vóór week 4 van de pilot. Spraak en stijl: de pilot geslaagd is en Marc in de pilot geregeld een voorstel koos. Opzoeken: Marc in de pilot feiten over de maker zelf blijft intypen |
| 2. Assistent voor vragen van leden | Leden krijgen direct antwoord op veelgestelde vragen; Marc krijgt alleen de vragen die hem nodig hebben | Er minstens 20 flessen met goedgekeurde tekst zijn en Marc dezelfde vragen steeds terug ziet komen |
| 3. Campagnes en het beste moment | Marc plant een reeks berichten rond een lijst of bieding en ziet welk moment de meeste bestellingen oplevert | De pilot geslaagd is en de app per melding heeft vastgelegd wanneer hij verstuurd is en wat hij opleverde |
| 4. Terug op de lijst en op dronk | Leden komen terug voor een wijn die ze lekker vonden, en openen een fles op het goede moment | Onderwerp 14 gebouwd is en er drie maanden aan aankopen en oordelen ligt |
| 5. Inkoopoverzicht voor Marc | Marc ziet per wijn hoe snel hij verkocht en wat er bleef staan. Met onderwerp 14 ook wat leden ervan vonden | De pilot geslaagd is. De verkoopgegevens liggen er dan al |
| 6. De bieding uitbreiden: maximaal bod, volgen, richtprijs | Een lid hoeft de eindtijd niet te bewaken, en weet vooraf wat een fles ongeveer doet | De bieding na de pilot blijft en leden afhaken omdat ze het einde missen |
| 7. Wijn aan tafel: proeverijen en diners | De club wordt meer dan een bestellijst, met iets wat alleen een chef kan bieden | Marc het wil en er een eerste avond te vullen is |
| 8. Een lid stelt een lid voor | De club groeit voorbij de huidige groep en blijft besloten | Alle huidige leden zijn uitgenodigd en Marc wil groeien |
| 9. Bewaren en bundelen | Een lid bestelt ook als het moment van brengen of halen niet past | Leden lijsten overslaan vanwege het moment van brengen of halen |
| 10. Voorinschrijving met een drempel | Marc koopt alleen in wat al verkocht is | Marc wijnen kan krijgen met een minimale afname |
| 11. De vaste doos van Marc | Voorspelbare omzet, en leden die niet elke lijst hoeven te volgen | Een vaste groep op bijna elke lijst bestelt |
| 12. Wachtlijst bij uitverkocht | Een fles die vrijkomt gaat vanzelf naar wie hem wilde | Marc wijnen gaat verkopen die hij kan nabestellen, of bestellingen geregeld vervallen |
| 13. Eigen domein en eigen afzenderadres | Een adres dat leden herkennen, en een inlogcode die van de club komt | De naam van de club gekozen is. Uiterlijk vóór de eerste uitnodiging aan een lid |
| 14. Mijn flessen: de eigen collectie | Een lid ziet terug wat het kocht, wat het ervan vond en wat bij Marc ligt, en bestelt opnieuw | De pilot geslaagd is en leden vragen wat ze eerder kochten, of onderwerp 4 aan de beurt is |
| 15. Security: verbeterpunten uit de scan | De pipeline, het inloggen en de API zijn dicht voordat er echte leden en betalingen zijn | Nu. Groep A vóór de eerste release-tag, groep B en E vóór de eerste uitnodiging aan een lid |
| 16. Mijn smaak: kenmerken, markeren en een melding op maat | Een lid ziet bij elke wijn hoe die is, ziet welke wijnen bij zijn smaak passen, en krijgt alleen een melding als er iets voor hem bij zit | Stap A: nu, met een schakelaar die in productie uit staat tot Marc instemt. Stap B en C: de pilot geslaagd is, en leden zeggen dat ze lijsten of meldingen overslaan omdat er weinig voor hen bij zit |
| 17. Live bijwerken via een WebSocket | De stand van de veiling binnen een seconde, zonder dat elke telefoon elke 3 seconden vraagt | Leden in de pilot een bod missen of zeggen dat de stand achterloopt |
| 18. Flesfoto's in één stijl | Elke fles staat vrij, even groot en op dezelfde donkere achtergrond, zonder dat Marc er iets extra voor doet | Een proef op Marcs eigen foto's goed genoeg uitvalt, en de foto's in de pilot naast elkaar onrustig ogen |
| 19. Volgen wat er gebeurt, en ingrijpen als een bestelling misgaat | Marc en Aidan zien per bestelling wat er gebeurde en krijgen een signaal als een lid vastloopt, voordat het lid erover appt | Stap A zit in de pilot, week 7. Stap B: fouten in de pilot Aidan meer dan een uur per maand kosten om uit te zoeken. Stap C: de club groeit voorbij de pilot |
| 20. Een logo op het tabblad van de browser | Wie de app in een browser opent, herkent het tabblad aan het logo van de club in plaats van aan een algemeen plaatje | Marc het logo heeft geleverd |
| 21. Ook op de pc: de app in een brede browser | Marc doet voorraad en planning op een groot scherm met toetsenbord, in tabellen in plaats van in een smalle kolom. Leden houden dezelfde app, vooral op hun telefoon | De zes beheerschermen gebouwd zijn en Marc zegt dat hij voorraad of planning liever achter de pc doet |
| 22. Inloggen met een passkey ("Face ID") | Een lid komt na het uitloggen of op een nieuw apparaat binnen met één blik, zonder code uit de mail. Marc en Aidan krijgen een sterkere login voor het beheer | Het eigen domein van onderwerp 13 in gebruik is |

## 1. Omschrijving via een taalmodel

In de pilot herkent de app al naam, jaargang, aantal, prijs en tekst in Marcs WhatsApp-bericht. Op 20 november 2026 is de eerste stap van dit onderwerp naar de pilot gehaald: Marc fotografeert de fles, de app leest het etiket, en uit zijn steekwoorden maakt ze drie tekstvoorstellen in zijn stijl. Elk voorstel heeft een eigen opbouw: de wijn, het verhaal van de maker, en Marc zelf in de ik-vorm. De stijl is beschreven in `functions/wijnclub/domein/tekst.py`, met echte omschrijvingen van Marc als voorbeeld. Marc vond het op 21 november 2026 goed dat ze in de openbare repository staan. Zie Hoe het werkt in het [plan](../pilotplan-marcs-wijnclub.md) en de [bouwspecificatie](bouwspecificatie.md), hoofdstuk 5. Na de pilot volgen nog drie stappen. De derde kwam er op 21 november 2026 bij en kan alleen met variant C hieronder:

1. **Van spraak naar tekst.** Marc spreekt 30 seconden in over de fles. De app maakt daar dezelfde drie voorstellen van als bij steekwoorden. Wat hij zegt over wanneer je de fles drinkt en wat je erbij eet, komt in de voorstellen. In de pilot spreekt Marc al in via de microfoon van zijn toetsenbord; deze stap neemt een langere opname op in de app zelf.
2. **Zijn stijl leren.** In de pilot gaan vaste voorbeelden mee: teksten van Marc uit WhatsApp, die Aidan aanlevert. Na de pilot komen daar de teksten bij die Marc in de app ongewijzigd koos of zelf schreef, zodat de voorbeelden vanzelf aangroeien en bij de wijnen van dat moment passen.
3. **Feiten opzoeken.** Marc noemt in zijn steekwoorden alleen wat hij proeft. De app zoekt feiten over de maker en de wijn op het web, toont elk feit met de bron, en Marc vinkt aan wat klopt. Alleen aangevinkte feiten komen in een voorstel.

Vier regels gelden daarbij:

- Marc keurt elke tekst goed voordat een lid hem ziet.
- Herkomst, bewaring en gerechten worden nooit verzonnen. Noemt Marc ze in zijn steekwoorden, dan werkt het model ze uit tot volzinnen. Anders blijven ze uit de tekst. De velden voor herkomst, bewaring, `spijs` en `drinken` vult Marc zelf in.
- Het model verzint geen scores, prijzen of smaken die Marc niet noemde. Met stap 3 wordt dat: elk feit komt van Marc of heeft een bron die Marc zag en aanvinkte. Smaken en gerechten komen altijd van Marc en nooit van het web. Die regel gaat over de tekst in Marcs stem. Licht tot vol bij onderwerp 16 is een schatting die Marc nakijkt, en staat los van zijn woorden.
- We meten hoeveel tijd een fles Marc kost en welk deel van het concept hij ongewijzigd laat. In de pilot legt elke wijn vast waar de tekst vandaan komt.

Voor de spraak blijft Amazon Transcribe de kandidaat, naast de microfoon van het toetsenbord die Marc in de pilot al gebruikt. Of Transcribe Nederlands goed genoeg herkent, moet een proef met Marcs eigen opnames uitwijzen. Of de API van Anthropic zelf geluid aanneemt, staat niet in de documentatie die op 21 november 2026 is nagekeken.

### Wat de voorbeeldteksten laten zien

Er zijn nu zeven teksten van Marc als voorbeeld: vier van "de wijn", één van "het verhaal van de maker" en twee van "Marc zelf". Ze staan in `VOORBEELDEN` in `functions/wijnclub/domein/tekst.py`; twee daarvan staan ook in `app/src/voorbeeld.ts`. Vier dingen vallen op:

- **Feiten die niet uit steekwoorden komen.** Marcs teksten noemen 1986, 5 en 14 hectare, de naam van de zoon die het domein overnam, Premier Cru Classé in 1855, de druiven van Barsac en edele rotting. Met de regel van de pilot valt een voorstel weg bij elk getal dat Marc niet zelf in zijn notitie typte. Voor het verhaal van de maker moet hij dus bijna de hele tekst al aanleveren. Daarom is er stap 3 en variant C.
- **Weinig houvast voor voorstel 2 en 3.** Er is één voorbeeld van het verhaal van de maker, en de twee voorbeelden van Marc zelf zijn delen van een langer bericht.
- **Een smalle basis.** Twee teksten gaan over hetzelfde domein en twee over zoete wijn. De kans dat "honing, abrikoos" of "edele rotting" in een tekst over een andere wijn belandt, is reëel. De test met tien sets steekwoorden moet daar per voorstel op letten.
- **Eén bericht, drie delen.** De tekst over het domein en Marcs eigen tekst over dezelfde wijnen lijken uit één bericht te komen. Marc schrijft dus soms alle drie de opbouwen achter elkaar.

### De route naar het model

De regels in `domein/tekst.py` en `domein/herkennen.py` werken met elk model: de handler geeft een functie mee die de instructie en de vraag naar het model stuurt en de tekst terugkrijgt. Er is nog geen handler, geen aanroep van een model en geen sleutel. De keuze hieronder kost dus nog niets aan ombouw, en geldt voor herkennen, etiket en teksten samen.

Op 21 november 2026 besloot Aidan dat het taalmodel niet in de EU hoeft te draaien. Bij het invoeren van een fles gaan alleen Marcs bericht, zijn steekwoorden en de foto van de fles naar het model, nooit gegevens van leden. De rest van de app blijft in de EU. Voor de assistent van onderwerp 2, die wel met leden praat, geldt dit besluit niet.

**Gekozen op 21 november 2026: variant B nu, variant C daarna.** B is uitgewerkt in [bouwplannen/1b-claude-api.md](bouwplannen/1b-claude-api.md), om in een eigen sessie te bouwen. C is stap 3 van dit onderwerp en komt na de pilot.

#### A. Bedrock (afgevallen)

Een taalmodel via Bedrock, met boto3 uit de runtime en zonder sleutel of nieuwe verwerker. Het was het minste werk, maar kan geen feiten opzoeken. Daarmee zou stap 3 een tweede route naar het model vragen.

#### B. De API van Anthropic (gekozen)

Marc merkt hetzelfde als in de pilot beschreven: drie voorstellen uit zijn steekwoorden en de velden uit zijn bericht. De route geldt voor herkennen, het etiket en de teksten samen.

- Het pakket `anthropic` in een Lambda-laag, de sleutel in Secrets Manager met per omgeving een eigen werkruimte en bestedingslimiet, en een antwoord in een vast JSON-schema.
- Weigert het model of is de API niet bereikbaar, dan vult Marc zelf in.
- Drie voorstellen kosten per wijn ongeveer $0,001 met Claude Haiku 5.5, $0,02 met Claude Sonnet 5.5 en $0,04 met Claude Opus 5.5, naar de prijzen van Anthropic op 21 november 2026. De test met het echte model kiest tussen de drie.
- Anthropic wordt een verwerker, met een regel in de privacyverklaring. De verwerking is wereldwijd of in de VS; de API kent geen keuze voor de EU.
- Wat er gebouwd wordt, in welke volgorde en met welke tests, staat in het bouwplan.

#### C. De API van Anthropic met opzoeken (stap 3, na de pilot)

Bouwt voort op B en maakt stap 3 mogelijk. Het gaat in twee aanroepen, zodat Marc elk feit ziet voordat het in een tekst komt.

1. **Feiten zoeken.** `POST /api/beheer/feiten` krijgt naam, producent, jaargang en streek. Het model zoekt met het zoekgereedschap van de API op het web, hoogstens drie keer, en geeft een lijst korte feiten. Elk feit heeft een bron: de link en de zin waar het staat. De API geeft die bronnen zelf mee. Een feit zonder bron uit dezelfde aanroep valt weg. Marc vinkt aan wat klopt.
2. **Voorstellen.** `POST /api/beheer/teksten` krijgt naast de notitie de aangevinkte feiten. Die tellen mee als bron voor de controle op getallen en voor de markering van nieuwe woorden.

- **Regels:** smaken, gerechten, herkomst en bewaring komen nooit van het web. Het model neemt feiten over, geen zinnen van een importeur of wijnhandel. Een webpagina is tekst om te lezen en nooit een opdracht. Een fout feit met een nette bron blijft mogelijk; daarom vinkt Marc aan.
- **Wachten:** zoeken duurt langer dan de 30 seconden die de HTTP API een aanroep geeft. De aanroep geeft daarom `202` met een id. De functie zoekt verder, zet de feiten in DynamoDB met een vervaltijd van een dag, en de web-app vraagt de uitkomst op zoals hij de stand van de veiling opvraagt.
- **Bewaren:** de aangevinkte feiten en hun bronnen komen bij de wijn, alleen zichtbaar voor Marc.
- **Kosten:** het zoeken kost $10 per 1.000 zoekopdrachten, dus hoogstens $0,03 per wijn, en de gevonden pagina's tellen als tokens in. Samen met de voorstellen ongeveer $0,03 tot $0,11 per wijn, afhankelijk van het model. Bij veertig wijnen per maand is dat $1 tot $5.
- **Bouwen:** een extra route, een tabel of item voor de uitkomst, een scherm om feiten aan te vinken (niet getekend in design-v4) en een uitbreiding van `tekst.py` met feiten als bron.
- **Tegen:** de meeste bouwtijd, en Marc doet een stap extra per fles. Of dat minder tijd kost dan zelf intypen, moet een proef op tien flessen uitwijzen.

#### Nagezocht op 21 november 2026

- **Bewaren en training.** Anthropic verwijdert invoer en uitvoer van de API binnen 30 dagen en gebruikt ze standaard niet om modellen te trainen. Merkt de misbruikcontrole van Anthropic een aanroep aan, dan kan die tot 2 jaar bewaard blijven. Zie [hoe lang Anthropic gegevens bewaart](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data).
- **Plaats van verwerking.** De API kent alleen "wereldwijd" en "VS".
- **Vast JSON-schema.** Werkt op Claude Haiku 5.5, Sonnet 5.5 en Opus 5.5. Het schema kent geen maximale lengte en geen maximaal aantal; die grenzen blijven in `lees_antwoord`.
- **Het pakket.** `anthropic` 2.12.0 vraagt Python 3.10 of hoger. De pipeline draait 3.14; een lokale omgeving op 3.9 kan het niet laden.
- **Zoeken op het web** (voor C) staat standaard aan in de Console. Roep het zoekgereedschap direct aan, zonder het automatische filteren: dat filteren draait code bij Anthropic en valt onder een andere bewaarregel.

Nog open: de [verwerkersovereenkomst](https://www.anthropic.com/legal/data-processing-addendum) van Anthropic is nog niet gelezen. Laat de jurist meekijken voordat `prod` een sleutel krijgt.

#### Vragen voor Marc

- Wil je drie losse voorstellen, of ook een alinea uit het ene voorstel kunnen combineren met een alinea uit het andere?
- Zoek je nu zelf feiten over een maker op voordat je een tekst schrijft? Waar kijk je dan?
- Mogen meer van je teksten uit de WhatsApp-groep als openbaar voorbeeld in de repository? Vooral teksten over een maker en in de ik-vorm helpen.

## 2. Assistent voor vragen van leden

De assistent is een chatvenster in de app dat vragen beantwoordt over het aanbod, de eigen flessen en de werking van de club. Voorbeelden: wanneer is mijn fles op dronk, wat eet ik erbij, wat is het verschil tussen deze twee flessen, hoe werkt bieden, waar is mijn bestelling.

| Onderdeel | Keuze |
| --- | --- |
| Waar hij uit put | Alleen Marcs goedgekeurde teksten, de voorwaarden van de club en de bestellingen en flessen van het lid zelf |
| Als hij het niet weet | Hij zegt dat, en biedt aan de vraag met één tik door te zetten naar Marc via WhatsApp |
| Hoe hij zich voorstelt | Als assistent van de club, nooit als Marc. Leden weten dat ze met een AI praten |
| Wat hij niet doet | Bieden, kopen of betalen namens een lid. Uitspraken over de waarde van een fles. Advies over alcohol en gezondheid |
| Wat hij mag zien | Alleen gegevens van het lid dat de vraag stelt, en alleen lezen |

De risico's en wat ertegen helpt:

- **Een fout antwoord dat als advies van Marc wordt gelezen.** De assistent antwoordt alleen uit goedgekeurde tekst en noemt de fles waar het antwoord vandaan komt. Marc bekijkt elke week een steekproef van gesprekken.
- **Leden die de assistent iets anders proberen te laten doen.** Hij heeft geen rechten om iets te wijzigen, en de invoer van een lid geldt als vraag, nooit als opdracht aan het systeem.
- **Het persoonlijke contact verdwijnt.** "Vraag Marc" blijft op elk scherm staan. De assistent komt ernaast, niet ervoor in de plaats.
- **Privacy.** Gesprekken worden kort bewaard, staan in de privacyverklaring en worden niet gebruikt om een model te trainen. De verwerking blijft in de EU.
- **Regels voor AI.** Voor zover bekend verplicht de Europese AI-verordening om duidelijk te maken dat iemand met een AI praat. Laat dit meenemen in de juridische check.

Technisch is dit één extra Lambda-functie die het taalmodel via Bedrock aanroept. Bij enkele tientallen flessen passen alle teksten in de vraag aan het model, dus een aparte zoekdatabase is niet nodig. Een limiet per lid per dag voorkomt onverwachte kosten.

De assistent is geslaagd als hij meer dan de helft van de vragen afhandelt zonder Marc, en Marc in zijn wekelijkse steekproef geen antwoorden vindt die hij zelf anders had gegeven.

## 3. Campagnes en het beste moment

Een campagne is een reeks geplande berichten rond één lijst of bieding: een vooraankondiging, de opening, een herinnering, een laatste oproep en de uitslag. Marc plant de reeks één keer. De app verstuurt de berichten of zet ze voor hem klaar, en meet per bericht wat het opleverde.

Eén beperking bepaalt de vorm: **automatisch berichten sturen via WhatsApp kan voor wijn in Nederland niet binnen de regels van WhatsApp.** Dit is nagezocht op 19 november 2026.

| Route | Kan het | Waarom |
| --- | --- | --- |
| Zakelijke WhatsApp-koppeling, een bericht per lid | Nee | Het [beleid van WhatsApp](https://whatsappbusiness.com/policy/) staat berichten die alcohol promoten alleen toe in een lijst met landen. Nederland en de rest van Europa staan daar niet op |
| Automatisch plaatsen in Marcs bestaande groep | Nee | De [groepsfunctie van de koppeling](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/get-started/) werkt met groepen die via de koppeling zijn aangemaakt en vraagt een geverifieerd zakelijk account. Voor een bestaande groep is geen route beschreven |
| Marcs eigen account laten aansturen door software | Niet doen | Dat is tegen de voorwaarden van WhatsApp. Een blokkade raakt het nummer waar zijn zaak op draait |
| Marc plaatst zelf in de groep, de app zet het bericht klaar | Ja | Dit is de bestaande werkwijze. De app plant, herinnert hem en meet. Of de werkwijze zelf binnen het beleid past, hoort bij de juridische check |
| Melding van de app en e-mail | Ja | Dit zijn kanalen van de club zelf. Ze zijn volledig te plannen en te meten |

De campagne loopt daarom over drie kanalen:

1. **Melding van de app.** Automatisch, op het geplande moment.
2. **E-mail.** Automatisch, voor leden die geen meldingen aan hebben.
3. **De WhatsApp-groep.** Half automatisch. Op het geplande moment krijgt Marc een melding met het bericht kant-en-klaar. Eén tik opent WhatsApp, hij kiest de groep en verstuurt.

Zo blijft het bereik van de groep behouden zonder dat Marcs nummer gevaar loopt.

### Een reeks rond een bieding

De tabel beschrijft de inhoud per bericht. De tekst zelf is van Marc.

| Moment | Bericht | Kanaal |
| --- | --- | --- |
| Ochtend | Vooraankondiging: vanavond komt er een bijzondere fles, nog zonder te zeggen welke | Groep, melding |
| Een uur vooraf | Een hint: de streek of de jaargang | Melding |
| Opening | De fles, Marcs spraakbericht en het startbod | Groep, melding, e-mail |
| Halverwege | De stand: het hoogste bod | Melding, alleen aan wie de fles bekeek |
| Laatste kwartier | Laatste oproep | Melding, alleen aan wie bood of bekeek |
| Na afloop | De uitslag: verkocht voor dit bedrag | Groep |

Voor een lijst is de reeks korter: aankondiging, opening, "nog beschikbaar" en de sluiting.

### Het beste moment meten

- Elk bericht krijgt een eigen link. De app legt vast wanneer het verstuurd is, via welk kanaal, wie erop tikte, en wie daarna binnen 24 uur bestelde of bood.
- De maat is bestellingen en biedingen per bereikt lid. Geopende berichten tellen niet, want die zeggen niets over verkoop.
- Bij meldingen en e-mail kan de app eerlijk vergelijken: de leden worden willekeurig in twee helften verdeeld, en elke helft krijgt hetzelfde bericht op een ander moment. In de groep kan dat niet; daar vergelijk je lijsten onderling.
- Het overzicht toont per dag en dagdeel het aantal berichten, het bereik en de bestellingen, met de onzekerheid erbij. Het doet pas een aanbeveling als er genoeg metingen zijn.
- Met 30 leden en één lijst per week duurt het maanden voordat een verschil tussen twee momenten meer is dan toeval. Met 120 leden gaat dat vier keer zo snel.

### Sneller antwoord, zonder te bouwen

De groepschat bevat al een deel van het antwoord. Marc kan de chat exporteren. Uit de tijdstippen van zijn aanbiedingen en de bestellingen daarna volgt op welke dagen en uren de groep het snelst en het meest bestelt. Dat kost een middag en kan vóór de pilot.

De export bevat namen en telefoonnummers van leden. Verwerk hem lokaal, bewaar alleen de tellingen en zet hem nooit in de repository.

### Regels

- **Toestemming.** Volgens de [ACM](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/spam-voorkomen-uw-reclame) mag reclame via e-mail, WhatsApp en andere elektronische berichten alleen naar mensen die vooraf toestemming gaven. Bestaande klanten mogen berichten krijgen over producten die met eerdere aankopen te maken hebben. Een lid geeft per kanaal toestemming bij de eerste login.
- **Afmelden.** In elk bericht staat hoe je je afmeldt, en de afzender is herkenbaar. In de app zet een lid elk kanaal apart uit.
- **Rust.** Geen campagneberichten tussen 21:30 en 9:00, en een maximum per lid per week. De grenzen stelt Marc vast.
- **Echte schaarste.** "Nog 3 flessen" komt uit de voorraad. Er zijn geen verzonnen aantallen en geen kunstmatige aftelklok.
- **Marc keurt elke tekst goed.** Een taalmodel mag een concept maken; er gaat niets uit zonder zijn akkoord.
- **Alcoholreclame.** Alleen aan leden die 18 jaar of ouder zijn, en zonder aan te zetten tot meer drinken. Laat de regels voor alcoholreclame meenemen in de juridische check.

### Techniek en kosten

- EventBridge Scheduler plant elk bericht, zoals het ook het sluiten van een bieding plant. Een Lambda-functie verstuurt de melding of de e-mail, of stuurt Marc de herinnering met het klaargezette groepsbericht.
- Er komt één tabel bij: `campagne` (de lijst of bieding, de reeks, de status). `berichten` en `tikken` bestaan sinds de pilot; `berichten` krijgt er de velden gepland op en tekst bij. De toestemming per kanaal staat in `leden`, bij het lid.
- Er komen geen nieuwe externe diensten of sleutels bij. Meldingen zijn gratis en e-mail via SES kost een fractie van een cent per bericht.
- Ter vergelijking: via de zakelijke WhatsApp-koppeling zou een marketingbericht naar een Nederlands nummer ongeveer €0,13 kosten, ruim €15 per bericht aan 120 leden. Dat bedrag komt uit tariefoverzichten van leveranciers; de tarieflijst van Meta zelf is niet geraadpleegd.

### Als het beleid van WhatsApp verandert

Controleer het beleid elk kwartaal. Komt Nederland op de lijst, dan wordt WhatsApp een vierde kanaal in dezelfde planner. Er is dan toestemming per lid nodig, elk bericht gebruikt een goedgekeurd sjabloon en elk bericht kost geld.

### Wat de pilot hiervoor al vastlegt

Meten kan alleen over berichten waarvan het tijdstip en de link bewaard zijn. De pilot legt daarom bij elke melding vast wanneer hij verstuurd is, en geeft elke melding een eigen link. Hetzelfde gebeurt als Marc de link of het overzicht "nog beschikbaar" in de groep deelt. Na acht weken ligt er zo een eerste meting, nog zonder dat er iets gepland of vergeleken wordt.

Campagnes zijn geslaagd als een lijst met campagne meer bestellingen per lid oplevert dan een lijst zonder, weinig leden zich afmelden, en Marc na een kwartaal een voorkeursmoment heeft dat op metingen berust.

## 4. Terug op de lijst en op dronk

Twee meldingen die uit Mijn flessen volgen, onderwerp 14. Zet Marc een wijn op de lijst die een lid eerder "Lekker" gaf, dan krijgt dat lid een melding. En valt een gekochte fles binnen de periode die Marc bij "wanneer drinken" invulde, dan krijgt het lid één bericht dat hij op dronk is.

- "Drinken van en tot" per wijn bestaat al. Het oordeel per lid komt met onderwerp 14; dat moet er dus eerst zijn.
- De melding "op dronk" verschijnt alleen als Marc de periode zelf heeft ingevuld. De app schat niets.
- Dit is het antwoord op de zwakke plek uit het marktonderzoek: terugkomen. Meet welk deel van de meldingen tot een bestelling leidt.
- De regels van de campagnes gelden ook hier: toestemming per kanaal, een maximum per week, niets na 21:30.

## 5. Inkoopoverzicht voor Marc

Een scherm in beheer met per wijn: verkocht van de voorraad, tijd tot uitverkocht, en flessen die bleven staan. Daarnaast per lijst het aantal bestellers en het bedrag per bestelling.

- Dit komt uit gegevens die de pilot al vastlegt. Het is alleen lezen.
- Hoeveel leden een wijn lekker vonden of niet, komt erbij zodra onderwerp 14 de oordelen vastlegt.
- Het overzicht toont tellingen per wijn, geen ranglijst van leden.
- Het helpt bij de vraag die geen concurrent voor Marc beantwoordt: wat hij de volgende keer inkoopt, en hoeveel.

## 6. De bieding uitbreiden: maximaal bod, volgen, richtprijs

De pilot heeft de kern: een bindend bod, een minimale verhoging en verlenging in de laatste twee minuten. Veilinghuizen bieden daarbovenop vier dingen die een lid verwacht dat ze kent.

| Onderdeel | Wat het doet | Waar het vandaan komt |
| --- | --- | --- |
| Maximaal bod | Het lid geeft één keer zijn hoogste bedrag op. De app biedt namens hem telkens de minimale verhoging, tot dat bedrag | iDealwine, en bieden bij afwezigheid bij Winefield's |
| Volgen | Eén tik op "Volg deze fles" geeft een melding bij een nieuw bod en een kwartier voor de eindtijd | De app van Winefield's, iDealwine |
| Richtprijs | Marc vult een bedrag van en tot in. Het veld mag leeg blijven | Beide veilinghuizen tonen een bandbreedte per kavel |
| Staat van de fles | Vulniveau, etiket en capsule, door Marc aangevinkt, bij de herkomst en bewaring | iDealwine beoordeelt vulniveau, etiket en kurk |

- Het maximum is geheim. Leden zien alleen het hoogste bod, zoals nu.
- Een maximaal bod is bindend tot het hele bedrag. Dat moet in de voorwaarden en op het scherm staan voordat het lid bevestigt.
- Bij twee gelijke maxima wint wie het eerst opgaf. De regel hoort in `domein/` met tests, en de schrijfactie in DynamoDB moet het verborgen maximum in dezelfde stap controleren als het bod.
- De richtprijs en de staat komen alleen van Marc en worden nooit gegenereerd, net als herkomst en bewaring.
- Dat er geen opgeld is, staat al in de pilot op het scherm van de bijzondere fles; zie Regels voor de veiling in het plan.

## 7. Wijn aan tafel: proeverijen en diners

Een avond bij Marc staat als regel op de lijst: een proeverij rond de wijnen van die lijst, of een diner waar een bijzondere fles opengaat. Het aantal plaatsen is de voorraad. Het lid bestelt en betaalt zoals het een fles bestelt.

- Dit is het onderdeel dat een landelijke verkoper niet kan namaken. SLOQ en The Online Sommelier houden proeverijen, Crurated diners met producenten, en in de Verenigde Staten draaien meer dan duizend restaurants en winkels een club via Table22. Een [stuk over het verloop bij wijnclubs](https://wineindustryadvisor.com/2026/04/21/the-wine-club-retention-crisis/) noemt clubs die alleen een levering zijn als de eerste die leden opzeggen.
- Het blijft buiten wat de scope uitsluit: geen boekingssysteem voor diners. Het is één datum met een vast aantal plaatsen, geen agenda.
- Technisch is het een derde soort regel naast vaste prijs en bieding, zonder brengen of halen en met een datum. Bestellen, voorraad en betalen blijven gelijk.
- Wat Marc aanbiedt, voor welke prijs en hoe vaak, bepaalt hij. Hier staat alleen de vorm.
- Schenken op een eigen avond kan andere regels kennen dan verkoop van gesloten flessen. Laat dit meenemen in de juridische check.

## 8. Een lid stelt een lid voor

Een lid deelt een persoonlijke link met iemand die het kent. Die persoon vult zelf naam en e-mail in, en Marc keurt de aanvraag goed of af. De club blijft op uitnodiging; alleen de eerste stap komt van een lid. Bij SLOQ kom je zo de groep in, en Slimmer Wijn Kopen geeft er punten voor.

- Het lid voert geen gegevens van een ander in. De nieuwe persoon doet dat zelf, zodat er toestemming is.
- Marc ziet wie wie voorstelde. Dat is ook zijn waarborg bij een bod dat niet betaald wordt.
- Begin zonder beloning. Punten passen niet bij de regel "rustig", en een beloning voor het werven van wijnkopers raakt de regels voor alcoholreclame.
- Stel een grens aan het aantal leden, zodat de schaarste van een lijst echt blijft.

## 9. Bewaren en bundelen

Een lid kiest bij het bestellen "Bewaar bij Marc" in plaats van brengen of halen, en krijgt later alles in één keer. MÈZON laat flessen staan tot het totaal €350 is. In de pilot kan bewaren niet: elke fles wordt gebracht of gehaald, ook een gewonnen fles. Bewaren voor een fles uit een bieding stond eerst in de pilot en is er op 19 november 2026 uitgehaald; het is de kleinste eerste stap van dit onderwerp. Design-v3 tekende er de keuze BEWAAR voor.

- Dit neemt de reden weg om een lijst over te slaan omdat het moment van brengen of halen niet past.
- Het vraagt ruimte en aansprakelijkheid van Marc. Er moet vastliggen van wie de fles is en wie opdraait voor breuk, diefstal of een slechte kurk. Eerst moeten er dus bewaarvoorwaarden zijn en moet Marcs verzekering nagekeken zijn, met een maximale duur en een maximaal aantal flessen per lid. Laat ook uitzoeken wanneer de bedenktijd ingaat als Marc de fles bewaart.
- Of bewaren gratis is of een vergoeding kost, is een keuze van Marc.
- Het lid moet zien wat er in bewaring ligt. Dat hoort bij Mijn flessen, onderwerp 14, met de knoppen "Breng of haal alles" voor de eerstvolgende avond en "Open aan tafel" naar WhatsApp.
- Een goedkoper alternatief zonder opslag: een lid laat een ander lid voor hem ophalen, en dat staat bij Marc onder Afleveren.

## 10. Voorinschrijving met een drempel

Marc biedt een wijn aan die hij nog niet heeft ingekocht, met een minimum aantal flessen. Wordt het minimum gehaald als de lijst sluit, dan koopt hij in. Wordt het niet gehaald, dan vervalt de regel. Slimmer Wijn Kopen werkt zo, met terugbetaling als de minimale afname niet gehaald wordt.

- Sinds 20 november 2026 betaalt een lid bij het bestellen. Betaalt het ook hier meteen, dan moet Marc terugbetalen als het minimum niet gehaald wordt. Een alternatief is een betaallink na het sluiten, zoals bij een bestelling namens een lid: dan betaalt niemand voor een wijn die niet doorgaat.
- Het lid ziet de stand: nog zoveel flessen tot de wijn doorgaat. Dat is echte schaarste, geen aftelklok.
- De levertijd is langer dan bij een gewone lijst en moet bij het bestellen vermeld staan.
- Een wijn per doos, zoals MÈZON soms doet, is dezelfde regel met een veelvoud van zes.
- De bedenktijd bij een fles die nog besteld moet worden, hoort bij de juridische check.

## 11. De vaste doos van Marc

Een lid dat dat wil, krijgt elke maand of elk kwartaal een doos die Marc samenstelt, voor een vast bedrag, gebracht of op te halen bij Marc. Het is het model waarmee Table22 restaurants een club laat draaien. De scope sluit een abonnement nu uit, en dat blijft zo tot de lijst bewezen is.

- Overslaan en pauzeren moeten met één tik kunnen. Bij Commerce7 zijn overslaan, wisselen en pauzeren standaard.
- De cijfers manen tot voorzichtigheid: volgens hetzelfde stuk over het verloop zegt bijna 40% van de leden van Amerikaanse wijnclubs binnen een jaar op. De bron van dat cijfer wordt niet genoemd.
- Het vraagt terugkerende betalingen. Hoe dat bij Mollie werkt, is niet nagezocht, en met de overgang naar Wero komen er in 2027 volgens ABN AMRO betaalvormen voor abonnementen bij. Wacht daarop.
- Een lichtere eerste stap: "Marcs keuze" als één regel op een gewone lijst, een doos van zes die hij samenstelt. Dat meet de belangstelling zonder abonnement.

## 12. Wachtlijst bij uitverkocht

Staat een wijn op uitverkocht, dan tikt een lid op "Zet me op de wachtlijst" met een aantal. Komt er een fles vrij doordat een bestelling niet betaald wordt en vervalt, dan krijgt de eerste op de wachtlijst een aanbod dat een dag geldig is. SLOQ doet dit met de hand in de groep; Commerce7 kent het als wensen die na afloop worden toegekend.

- **Waarom dit onderaan staat.** Marc verkoopt vaak restpartijen. Is zo'n wijn op, dan komt er geen voorraad bij, en levert een wachtlijst alleen iets op als een bestelling vervalt.
- Het sluit aan op wat de pilot al doet: een vervallen bestelling geeft de voorraad nu terug aan Marc. Met een wachtlijst gaat die eerst naar een lid.
- Marc ziet per wijn hoeveel flessen er meer gevraagd waren. Bij een restpartij kan hij daar niets mee; bij een wijn die hij kan nabestellen wel.
- Er komt één tabel bij, `wachtlijst` (wijn, tijdstip, lid, aantal). De volgorde is het tijdstip van aanmelden, en dat staat in de voorwaarden.
- De pilot meet de vraag hiernaar niet.

## 13. Eigen domein en eigen afzenderadres

Voorlopig draait de app op het adres dat CloudFront geeft, zoals `d123abc.cloudfront.net`, en verstuurt Cognito de inlogcode vanaf één los e-mailadres dat in Amazon SES is geverifieerd. Dat is genoeg om te bouwen en om Marc het prototype te laten zien. Besloten op 19 november 2026.

- **Waarom het niet tot na de pilot kan wachten.** De app op het beginscherm, de toestemming voor meldingen en het ingelogd blijven horen bij het adres. Verandert het adres, dan moet elk lid de app opnieuw op het beginscherm zetten, opnieuw inloggen en meldingen opnieuw toestaan. Het domein moet er dus zijn vóór het eerste lid wordt uitgenodigd.
- **Wat het oplevert.** Een adres dat Marc in de groep kan delen en dat leden herkennen, en een inlogcode met de club als afzender in plaats van een los adres.
- **Wat erbij komt.** Het domein zelf, een certificaat in AWS Certificate Manager in de regio `us-east-1` (dat vraagt CloudFront, dus een kleine extra stack in die regio), het domein als afzender in SES met DKIM, en `afzender_email` op een adres van dat domein.
- **SES blijft een eigen stap.** Ook zonder domein geldt: in de proefomgeving van SES komt de inlogcode alleen aan op adressen die je zelf hebt geverifieerd. Toegang daarbuiten vraag je aan bij AWS, en dat moet rond zijn vóór de eerste uitnodiging.
- De naam van de club is een open beslissing van Marc; het domein volgt daaruit.

## 14. Mijn flessen: de eigen collectie

Een scherm waar een lid terugziet wat het bij Marc kocht. Het stond in de pilot en in de ontwerpen tot en met `design-v3` (scherm 12), en is er op 19 november 2026 uitgehaald: de pilot gaat alleen over verkopen en bieden, en dat maakt de app eenvoudiger. Wat er in de pilot van overblijft is Je bestellingen: de lopende bestellingen met status en betalen.

- **Eerder gekocht.** Per wijn het aantal en de datum, uit de bestellingen die al vastliggen.
- **Een oordeel per wijn:** "Lekker" of "Niet voor mij". Daar komt één tabel voor bij, `oordelen` (lid, wijn, oordeel).
- **Opnieuw bestellen** met één tik, als de wijn weer op een open lijst staat.
- **Tellers:** onderweg, bij Marc en gedronken.
- **In bewaring bij Marc** hoort hier pas bij als onderwerp 9 er is.
- Zelf flessen van elders toevoegen blijft erbuiten: het is geen kelderboek.
- Onderwerp 4 leunt op het oordeel, en onderwerp 5 gebruikt het voor wat leden van een wijn vonden.
- De pilot meet de vraag hiernaar niet. Vraag er in de vijf gesprekken na afloop naar.

## 15. Security: verbeterpunten uit de scan

Verhuisd naar [beveiliging.md](beveiliging.md), met dezelfde nummers A1 tot en met E10. Groep A, B en E staan in de planning van het plan, in week 8.

## 16. Mijn smaak: kenmerken, markeren en een melding op maat

Een lid ziet bij elke wijn hoe die is, ziet welke wijnen bij zijn smaak passen, en krijgt alleen een melding als er iets voor hem bij zit. Het idee is van 21 november 2026, met Vivino als aanleiding, en nog niet met Marc besproken. Dezelfde dag is het verfijnd na een [marktonderzoek](marktonderzoek.md#smaak-en-personalisatie). Dat veranderde drie dingen:

- **Vivino is geen goed voorbeeld.** Vivino haalt zijn smaakschalen uit recensies van miljoenen gebruikers en zijn match uit wat iemand zelf beoordeelde. Hier schat één model de kenmerken en kijkt één persoon ze na. Vier schalen, twaalf smaken en tien spijzen zouden precisie suggereren die er niet is, onder Marcs naam.
- **Markeren in plaats van verbergen.** Bij zes tot tien wijnen levert filteren weinig op en haalt het Marcs selectie uit beeld. Kleine clubs bieden hoogstens "alleen rood"; Albert Heijn één as per kleur, soepel of stevig.
- **Eén kenmerk erbij.** `kleur`, `land` en `druif` staan al in de pilot, en wat je erbij eet schrijft Marc zelf; dat is juist zijn kennis als chef. Wat ontbreekt, is licht tot vol.

| Stap | Wat | Leunt op | Schatting |
| --- | --- | --- | --- |
| A. Kenmerken per wijn | Het model stelt licht, midden of vol voor, Marc kijkt na, en het lid ziet het bij de wijn: "ROOD · ITALIË · VOL" | Het etiket lezen uit de pilot | 2 dagen |
| B. Markeren | Een lid legt een paar wensen vast; passende wijnen krijgen een merkje. Niets verdwijnt | Stap A, en een ontwerp van Aidan | 3 dagen |
| C. Melding op maat | "Alleen mijn smaak" als keuze bij de meldingen | Stap B, de meldingen uit week 7 en de regels van onderwerp 3 | 2 dagen, nog niet uitgewerkt |

### Stap A: kenmerken per wijn

Uitgewerkt in [bouwplannen/16a-kenmerken-per-wijn.md](bouwplannen/16a-kenmerken-per-wijn.md), om in een eigen sessie te bouwen. In het kort:

- Eén nieuw veld `volheid` op `wijnen`: `licht`, `midden` of `vol`, optioneel. Plus `kenmerkenBron`: `model` of `marc`, zoals bij de tekst. Drie woorden in plaats van een schaal van 1 tot 5: het verschil tussen 3 en 4 is gokwerk, en drie woorden passen in de bestaande onderdelen en in de regel bij de wijn.
- De regels komen in `domein/kenmerken.py`, met dezelfde opzet als het herkennen van een bericht. Het antwoord van het model is onbetrouwbare invoer: alles buiten de lijst valt weg. Wat het etiket of Marc al gaf, wint.
- **Dit wijkt af van een regel van onderwerp 1:** het model verzint geen smaken die Marc niet noemde. Die regel blijft voor de tekst in Marcs stem. `volheid` is een schatting uit druif, streek en jaargang die Marc nakijkt, en staat bij de wijn als kenmerk, niet als woorden van Marc.
- Het wordt gebouwd en staat **uit in productie** tot Marc instemt en een test met twintig wijnen van eerdere lijsten goed uitvalt: verbetert Marc er meer dan één op de vijf, dan vult hij `volheid` zelf in en vervalt het voorstel.
- De aanroep naar het model zelf komt bij het etiket in week 4 en telt mee in de grens van 100 per dag voor `beheer`. Er komt geen nieuwe dienst, sleutel of afhankelijkheid bij, bovenop wat [bouwplan 1B](bouwplannen/1b-claude-api.md) toevoegt.

### Stap B: markeren

- **Mijn smaak.** Een klein scherm met vier groepen, alles optioneel: kleuren, licht tot vol, favoriete producenten (gekozen uit wat Marc eerder verkocht, geen vrije tekst) en een bedrag per fles "tot en met".
- **Een merkje, geen filter.** Elke wijn blijft staan, in Marcs volgorde. Een passende wijn krijgt het merkje JOUW SMAAK. Berichten van Marc en de veiling krijgen nooit een merkje.
- **Eén regel voor "past".** Binnen een groep geldt "of", tussen groepen "en". Ontbreekt een kenmerk bij de wijn, dan telt die groep als passend. Een wijn van een favoriete producent past altijd. De regel staat in `domein/smaak.py` en gespiegeld in de web-app.
- **Snelfilter op kleur, misschien.** ALLES · ROOD · WIT · ROSÉ · BUBBELS boven het aanbod, alleen voor dit bezoek. Bouw het pas als de lijsten in de pilot vaak meer dan tien wijnen hebben.
- **Opslag.** De wensen staan als één veld `smaak` op het lid, in `leden`. De aanroepen zijn `GET`, `PUT` en `DELETE /api/mijn/smaak`; het lid komt uit het token, en `PUT` weigert alles buiten de lijsten en grenzen.
- **De app beslist zelf wat past.** `GET /api/aanbod` geeft de kenmerken mee. Zo hoeft de server niet te weten wat een lid bekijkt.
- **Ontwerp.** Design-v4 heeft geen profielscherm. Aidan levert twee tekeningen: Mijn smaak, en het merkje bij een wijn.

### Stap C: melding op maat

Nog niet uit te werken: meldingen, `berichten` en de code voor `leden` komen pas in week 7 van de pilot, en toestemming per kanaal staat alleen in onderwerp 3. Wat al vaststaat:

- Een lid kiest "ALLE WIJNEN" of "ALLEEN MIJN SMAAK".
- Meldingen over een eigen bestelling of bod worden nooit gefilterd: de betaallink, de betaalherinnering, overboden en gewonnen.
- De regels van de campagnes gelden ook hier: toestemming per kanaal, een maximum per week, niets na 21:30.
- De app legt niet vast welk lid op welke wijn paste. `berichten` blijft zonder lid.
- **Open vraag:** Marc zet de wijnen een voor een op tafel. Een melding "3 wijnen naar jouw smaak" bij de aankondiging klopt alleen als alle wijnen dan al klaarstaan. Beslis bij het uitwerken of de melding wacht tot de avond compleet is, of gaat over de wijnen die er op dat moment zijn.

### Privacy

- Smaakwensen zijn persoonsgegevens. Bij het bouwen van stap B komen ze in de lijst onder Juridisch en privacy in het plan en in de privacyverklaring.
- Ze zijn vrijwillig. Het lid wist ze zelf met één knop, en ze verdwijnen als een lid zijn gegevens laat verwijderen.
- Marc ziet geen wensen per lid. Tellingen voor inkoop, zoals "14 leden zoeken vol rood", kunnen later bij onderwerp 5.
- De wensen komen niet in het logboek.
- Punt E8 in [beveiliging.md](beveiliging.md) geldt ook hier: wie in het gedeelde account de ledentabel kan lezen, leest ook de wensen.
- Stap A bevat geen persoonsgegevens.

### Wat het niet doet

- Geen tannine, zuur, zoet, smaken of spijzen als kenmerk. Ze komen pas terug als Marc erom vraagt en de test met twintig wijnen laat zien dat het model ze goed schat.
- Geen sterren of scores van leden, en geen "anderen kochten ook".
- Geen smaak afleiden uit aankopen. Dat is wat Vivino, Firstleaf en Bright Cellars uiteindelijk doen, en het is sterker dan ingevulde wensen. Het kan hier pas als onderwerp 14 de oordelen "Lekker" en "Niet voor mij" vastlegt.

### Risico's

- **Weinig wijnen.** Bij een lijst van zes tot tien wijnen helpt markeren een beetje en filteren bijna niet. De meeste waarde zit in stap C en in een grotere club, onderwerp 8. Daarom beginnen B en C pas als leden er zelf om vragen.
- **Het model schat verkeerd.** Het antwoord is de test met twintig wijnen, Marcs blik bij het nakijken, en drie woorden in plaats van vijf cijfers.
- **Minder verkoop voor Marc.** Met markeren in plaats van verbergen ziet iedereen alles.

### Vragen voor Marc

1. Mag het model inschatten of een wijn licht, midden of vol is, als hij het nakijkt?
2. Passen "licht, midden, vol" bij hoe hij over wijn praat, of zegt hij liever iets als "soepel" en "stevig"?
3. Vindt hij een merkje JOUW SMAAK bij een wijn goed, nu dat leden naar bepaalde wijnen stuurt?

Stap A is geslaagd als het nakijken Marc per wijn minder dan tien seconden extra kost, minstens vier van de vijf voorstellen ongewijzigd blijven (te tellen via `kenmerkenBron`), en leden in de gesprekken na de pilot zeggen dat de regel bij de wijn hielp kiezen. Voor stap B en C: als minstens een derde van de leden wensen instelt, en leden in de gesprekken zeggen dat ze minder lijsten of meldingen overslaan. Bij twintig tot dertig leden is een vergelijking in cijfers niet zinvol.

## 17. Live bijwerken via een WebSocket

In de pilot ververst de web-app de avond en de veiling door elke 3 seconden te vragen wat er nieuw is, zolang het scherm zichtbaar is. Besloten op 21 november 2026; zie de besluiten in het plan. Design-v3 vraagt de stand van de veiling binnen 1 seconde, en dat haalt pollen niet altijd.

- **Wat het is.** Een WebSocket API in API Gateway met Lambda, gevoed door DynamoDB Streams op de tabellen van de avond. De server stuurt een nieuwe wijn, een bericht, de voorraad en het hoogste bod zodra ze veranderen.
- **Wat gelijk blijft.** Het bod zelf blijft een gewone aanroep met de voorwaardelijke schrijfactie. Pollen blijft als terugval als de verbinding wegvalt.
- **Wat het kost.** Naar schatting een week bouwtijd, een extra onderdeel om te beveiligen en te testen, en een tabel met open verbindingen.
- **Start als** leden in de pilot een bod missen of zeggen dat de stand achterloopt, of als de club groeit voorbij enkele tientallen leden die tegelijk kijken.

## 18. Flesfoto's in één stijl

Marc fotografeert flessen in zijn keuken of kelder, en de app toont die foto's onbewerkt, bijgesneden vanuit het midden. Daardoor ziet elke fles er anders uit. Het doel is een pakshot zoals bij een wijnhandel: de fles vrijstaand, in een vast vak van 3:4, gecentreerd op een vaste voetlijn en 85% van de hoogte, op één bijna zwarte achtergrond die achter de fles iets lichter is zodat donker glas zichtbaar blijft. Marc maakt de foto zoals nu en doet er niets extra voor; het bewerkte resultaat verschijnt vanzelf bij het nakijken.

Er zijn twee routes. Ze sluiten elkaar niet uit.

**A. Een eigen model in AWS.** Een Lambda-functie in `eu-west-1` maakt de fles vrij met `rembg` en het model BiRefNet (beide MIT), en zet hem met Pillow in het vak.

- Voor: de foto blijft in de EU en in het eigen account, er komt geen nieuwe verwerker bij, en het kost centen per maand.
- Tegen: de functie heeft een container nodig, terwijl de bouwspecificatie nu zegt dat er geen Docker nodig is. Het vrijmaken duurt naar schatting 5 tot 20 seconden en vraagt 4 tot 8 GB geheugen. Het model moet worden bijgehouden.
- Op 21 november 2026 is een proef gestart op foto's van Marc, met BiRefNet en de lichte variant ervan. De foto's en de uitkomst staan niet in de repository.

**B. Commerciële AI.**

- **Claude, via de API met de SDK van Anthropic of via Bedrock.** Claude leest foto's, maar geeft alleen tekst terug. Het kan een foto dus niet bewerken of een fles vrijmaken. Wel kan het in dezelfde aanroep als het etiket lezen zeggen of de foto bruikbaar is (de fles helemaal in beeld, rechtop, één fles, geen raam erachter), waar de fles staat zodat de app hem kan uitsnijden, en of het vrijmaken van route A gelukt is. Dat kost weinig extra, want het etiket gaat in de pilot al naar het model.
- **Diensten die wel foto's bewerken.** remove.bg lijkt in de EU te verwerken; dat moet in hun verwerkersovereenkomst bevestigd worden. Photoroom verwerkt in de VS, en het model van Stability op Bedrock draait alleen in de VS. Ze kosten enkele centen per foto. Elke dienst is een nieuwe verwerker, met een sleutel in Secrets Manager en een plek in de privacyverklaring.
- **Beeldmodellen die een nieuwe foto maken.** Niet gebruiken. Ze kunnen het etiket, de jaargang of de vorm van de fles veranderen, en dan ziet een lid een andere fles dan het koopt.

Voor Claude geldt de route uit onderwerp 1: de API van Anthropic, gekozen op 21 november 2026. Sinds 21 november 2026 hoeft het taalmodel niet in de EU te draaien, omdat er alleen een foto van de fles naartoe gaat.

Het voorstel is beide te combineren: route A maakt het pakshot, Claude controleert de foto en het resultaat. De keuze volgt na de proef.

Regels:

- Marc ziet het bewerkte resultaat voordat een lid het ziet, en kan altijd de foto opnieuw maken.
- Lukt het vrijmaken niet, dan krijgt Marc vanzelf een nette uitsnede zonder vrijmaken, met de reden erbij, zoals "de fles raakt de rand".
- Het origineel blijft bewaard, zodat de stijl later kan veranderen zonder nieuwe foto's.
- De vrijgemaakte fles wordt opgeslagen als doorzichtige afbeelding. De achtergrond komt uit de web-app, zodat hij op elk scherm gelijk is.
- Op de foto hoort alleen de fles. Locatie en andere gegevens gaan eruit voordat hij wordt geüpload, zoals in de pilot.
- Ontwerp V3 kent alleen een verloop van doorzichtig naar zwart over foto's. Een vaste achtergrond achter de fles is een aanvulling op het ontwerp.

**Start als** een proef op Marcs eigen foto's goed genoeg uitvalt, en de foto's in de pilot naast elkaar onrustig ogen.

## 19. Volgen wat er gebeurt, en ingrijpen als een bestelling misgaat

Twee vragen lopen hier door elkaar, en ze vragen iets anders:

1. **Wat gebeurde er met deze bestelling?** Een lid wilde betalen en het lukte niet. Marc of Aidan wil dat zien en het oplossen, liefst voordat het lid erover appt.
2. **Waar haken leden af?** Hoeveel leden openen de avond, vullen een bon, tikken op Betaal en betalen.

Bij 20 tot 30 leden is de eerste vraag de belangrijke. Elk geval telt en is met de hand op te lossen. Voor de tweede zijn de aantallen te klein: een trechter over één avond gaat over een handvol mensen. De bestaande platformen zijn vooral voor de tweede vraag gemaakt. Dit onderwerp begint daarom met een eigen tijdlijn per bestelling en komt pas in stap C bij een platform uit.

Het idee is van Aidan, van 21 november 2026, en is nog niet met Marc besproken. Dezelfde dag koos Aidan om stap A naar de pilot te halen: de pilot is het moment waarop de eerste bestelling misgaat.

### Wat de pilot al heeft, en wat ontbreekt

De tabel beschrijft de pilot zonder stap A: het is de reden voor dit onderwerp. Wat stap A daarvan oplost, staat hieronder en in de bouwspecificatie.

| De pilot heeft | Wat ontbreekt |
| --- | --- |
| Alarmen bij een mislukte betaalmelding, een dubbele betaling en een mislukte geplande taak | Een alarm zegt dat er iets misging, niet bij welke bestelling of wat eraan voorafging |
| `controleNodig` op een bestelling die dubbel betaald is of betaald werd nadat hij verliep | Niemand ziet dat een lid drie keer probeerde te betalen en het opgaf |
| Bericht aan Marc als een bon namens een lid of van een veiling vervalt | Bij een bon van de lijst krijgt Marc geen bericht, ook niet als het lid wel probeerde te betalen |
| De tellingen voor de roadmap en de tijd tot de tik op Betaal | Een fout in de browser van een lid ziet niemand: een wit scherm, een knop die niets doet |
| Het dashboard van Mollie: elke betaling met zijn status | Er is geen weg van een bestelling naar wat er in de app aan voorafging |

### Drie stappen

De schattingen zijn grof en niet met een ontwerp onderbouwd.

| Stap | Wat | Platform | Schatting |
| --- | --- | --- | --- |
| A. Tijdlijn per bestelling en signalen | Per bestelling elke stap met een tijdstip, en een bericht als een bestelling aandacht vraagt | Geen. Een eigen tabel en een paneel in beheer | 3 dagen, in de pilot (week 7) |
| B. Fouten op de telefoon van het lid | Fouten in de web-app en mislukte aanroepen komen in het logboek, met een alarm | Geen, of later Sentry | 1 dag |
| C. De trechter | Per avond hoeveel leden elke stap haalden, als telling | Geen, of later PostHog | 2 dagen |

### Stap A: de tijdlijn per bestelling

Deze stap zit in de pilot. Hoe hij gebouwd wordt, staat in de [bouwspecificatie](bouwspecificatie.md), hoofdstuk 3 onder Tijdlijn en signalen; wijkt de tekst hier af, dan geldt de bouwspecificatie.

Er komt één tabel bij, `tijdlijn`, met per rij `bestellingId`, `tijdstipId`, `stap` en `vervaltOp`. De app schrijft een rij op het moment dat de stap gebeurt.

| `stap` | Wie schrijft hem |
| --- | --- |
| `gemaakt` | Bestellen van de lijst, namens een lid, en het sluiten van een bieding |
| `betaling-gestart`, met het nummer van de poging | Betalen |
| `betaling-niet-gestart` | Betalen, als Mollie geen betaling teruggeeft |
| `terug-van-betalen` | De web-app, als het lid van de betaalpagina terugkomt op de bon |
| `melding-mollie`, met de status van de betaling | De melding van Mollie |
| `betaald`, `verlopen`, `terugbetaald` | De overgang van de status |
| `herinnerd`, `betaallink-verstuurd` | De taak voor verlopen en Marc |
| `afgeleverd` | Afleveren. Haalt Marc het vinkje weg, dan komt er `niet-afgeleverd` bij |

- **Geen naam, adres of bedrag in de tijdlijn.** Alleen het `bestellingId`. Wie het lid is, staat op de bestelling, en die zien alleen het lid zelf en de groep `beheer`.
- **Een eigen tabel, geen veld op de bestelling.** Dezelfde reden als bij `weergaven`: een schrijfactie voor het volgen mag een bestelling of betaling nooit laten mislukken. Mislukt het schrijven, dan staat dat in het logboek en gaat de bestelling gewoon door.
- **De web-app schrijft één stap, de server de rest.** `terug-van-betalen` gaat via `POST /api/bestellingen/{id}/terug`; het lid komt uit het token en de aanroep weigert een bestelling van een ander. Wat een lid meestuurt, is onbetrouwbare invoer: de aanroep heeft geen velden.
- **Bewaren.** `vervaltOp` staat op 180 dagen, zoals bij `weergaven` en `tikken`.

**Signalen.** Een signaal is een regel over de tijdlijn die zegt dat een bestelling aandacht vraagt. De regels komen in `domein/signalen.py`, met tests. De taak die elke minuut de verlopen bestellingen zoekt, rekent ze uit.

| Signaal | Wat het betekent | Wie | Ingrijpen |
| --- | --- | --- | --- |
| Een bon van de lijst vervalt na minstens één `betaling-gestart` | Het lid wilde betalen en het lukte niet | Marc | De bestelling opnieuw invoeren namens het lid: een betaallink met 48 uur |
| Drie of meer betaalpogingen op één bon | Het lid loopt vast in de app van zijn bank | Marc | Het lid een bericht sturen, of de betaallink |
| `betaling-niet-gestart` | Mollie is niet bereikbaar, of de sleutel klopt niet | Aidan | Storing nakijken. Het lid kan binnen de termijn opnieuw op Betaal tikken |
| `terug-van-betalen`, en na twee minuten geen `melding-mollie` | De melding van Mollie kwam niet aan | Aidan | De taak voor verlopen vraagt de status zelf op bij Mollie, dus de bestelling komt goed. De oorzaak nakijken |
| `controleNodig`, bestaat al | Dubbel betaald, of betaald nadat de bon verliep | Marc | Terugbetalen in Mollie, of alsnog leveren |
| `betaald`, en een dag na het moment van brengen of halen nog niet `afgeleverd` | Een fles is blijven staan, of Marc vergat af te vinken | Marc | Afleveren of afvinken |
| Een lid is drie dagen geleden uitgenodigd en heeft nog niet ingelogd | Het lid komt de app niet in, of de uitnodiging kwam niet aan | Marc | Het e-mailadres nakijken en opnieuw uitnodigen |

- **Ingrijpen is altijd een handeling die al bestaat:** de betaallink sturen, namens een lid bestellen, terugbetalen in Mollie, afleveren. Er komt geen knop die een status met de hand zet. Bestellingen worden nooit achteraf gewijzigd.
- **Waar Marc het ziet.** Bovenaan Beheer: afleveren staat "Vraagt aandacht", met per bestelling één regel in gewone taal: "Probeerde drie keer te betalen, bon vervallen om 21:14". Een tik opent de tijdlijn in een paneel. Design-v4 tekent dit niet; Aidan levert een tekening.
- **Bericht.** Een signaal voor Marc gaat als melding naar de groep `beheer`, met e-mail als terugval, één keer per signaal per bestelling. Een signaal voor Aidan is een regel in het logboek met een alarm in CloudWatch.
- **Het laatste signaal gaat niet over een bestelling** en gebruikt de tijdlijn niet. In de pilot komt het uit `uitgenodigdOp` en `eersteLoginOp` op het lid. Het staat hier omdat het dezelfde vraag beantwoordt: een lid loopt vast en niemand weet het.
- **Na de pilot** kan dat signaal scherper: een inlogcode die twee keer is aangevraagd zonder dat het lid inlogde, uit Cognito, en een e-mail die terugkwam, uit de meldingen van SES. Dat vraagt extra opzet in SES en zit niet in de pilot.
- **Een bestelpoging die geen bon werd**, omdat een wijn net op was, komt niet in de tijdlijn: er is geen bestelling. Na de pilot kan de app ze per wijn tellen, zonder lid. Dat getal zegt ook of er vraag is naar de wachtlijst van onderwerp 12. Het zit niet in de pilot.

### Stap B: fouten op de telefoon van het lid

De web-app vangt fouten op die nu niemand ziet: een fout in de code, een aanroep die mislukt, een scherm dat niet laadt. Ze stuurt per fout het scherm, de soort fout, de melding, de statuscode en de versie van de app naar `POST /api/mijn/fouten`. De functie schrijft één regel in het logboek, en een alarm gaat af als er binnen vijf minuten meer dan een paar binnenkomen.

- **Zonder lid.** De aanroep vraagt een token, zodat een vreemde het logboek niet kan vullen, maar het `lidId` komt niet in de regel. Het gaat om de fout, niet om wie hem kreeg.
- **Onbetrouwbare invoer.** Vaste velden, een vaste lijst van schermen, een grens op de lengte, geen regeleinden en een grens per lid per minuut. Het adres van de pagina gaat mee zonder nummers van bestellingen of berichten.
- **Zit de fout in een bestelling,** dan stuurt de web-app het `bestellingId` mee en komt de fout als stap `fout-in-app` in de tijdlijn van stap A. Die stap bestaat in de pilot nog niet.

| Mogelijkheid | Voor | Tegen |
| --- | --- | --- |
| Eigen aanroep naar het logboek van CloudWatch | Geen nieuwe dienst, verwerker, sleutel of afhankelijkheid. Een dag werk | De regel in het logboek wijst naar de gebouwde code; de plek in de broncode zoekt Aidan met de hand op |
| [Amazon CloudWatch RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html) | Blijft in het eigen account en is beschikbaar in `eu-west-1`. Meet ook laadtijden | Een nieuw pakket in de web-app en een eigen toegangsregeling. Betalen per gebeurtenis; het tarief is niet nagezocht |
| [Sentry](https://docs.sentry.io/organization/data-storage-location/) | De beste foutmeldingen: de plek in de broncode, gelijke fouten gegroepeerd, het toestel erbij. Opslag in Frankfurt kan op elk abonnement, ook het gratis | Een nieuwe verwerker, van een Amerikaans bedrijf. Volgens Sentry kan een deel van de gegevens over het account in de Verenigde Staten staan. De regio is na het aanmaken niet meer te wijzigen |

**Keuze:** begin met de eigen aanroep. Kost het uitzoeken van fouten Aidan daarna meer dan een uur per maand, stap dan over op Sentry met opslag in de EU, zonder schermopnames en zonder `lidId`.

### Stap C: de trechter

Per avond vijf getallen: leden die de avond openden, die een wijn bekeken, die een bon maakten, die op Betaal tikten en die betaalden. Het zijn aantallen, zoals de tellingen die de pilot al heeft.

- **De server ziet de meeste stappen al.** Een bon, een betaalpoging en een betaling staan in `bestellingen` en in de tijdlijn. Voor "opende de avond" en "bekeek een wijn" is een rij per lid per avond nodig, zoals `weergaven` dat nu voor een bieding doet.
- **Geen nieuw scherm.** De getallen komen bij `GET /api/beheer/tellingen`.
- **Waar het voor dient.** Het antwoord op het open punt uit de bouwspecificatie: of betalen bij het bestellen leden doet afhaken.

Bestaande platformen, voor als de club groeit en er vragen komen die een telling niet beantwoordt:

| Platform | Wat het is | Past het |
| --- | --- | --- |
| [PostHog](https://posthog.com/eu) | Gebeurtenissen, trechters en schermopnames in één dienst, met opslag in de EU. Gratis tot 1 miljoen gebeurtenissen en 5.000 opnames per maand; de club blijft daar ver onder. De code is open | De eerste keuze als er een platform komt. Een nieuwe verwerker, een nieuw pakket in de web-app, en waarschijnlijk toestemming van het lid |
| Microsoft Clarity, Hotjar | Schermopnames en kaarten van waar bezoekers tikken | Nee. Het hele nut zit in de opname van het scherm, zie hieronder |
| Plausible, Matomo | Bezoekcijfers zonder cookies, van Europese makers | Slecht. Ze tellen bezoeken aan openbare pagina's. De wijnclub is een app achter een login met enkele tientallen bekende leden |
| Google Analytics, Amplitude, Mixpanel | Hetzelfde als PostHog, van Amerikaanse bedrijven | Nee. Geen voordeel boven PostHog, wel gegevens buiten de EU of een extra afweging daarover |

Nagezocht op 21 november 2026 zijn PostHog, Sentry en CloudWatch RUM, op de pagina's waar de tabellen naar verwijzen. De andere platformen staan hier uit eerdere kennis en moeten bij een keuze opnieuw bekeken worden.

**Schermopnames: niet doen.** PostHog, Sentry en Clarity kunnen opnemen wat een lid op zijn scherm ziet en doet. Voor de vraag "wat ging er mis" lijkt dat het snelste antwoord. Maar op het scherm staan naam, adres en wat iemand aan wijn bestelt, en maskeren gaat een keer mis. Bij dertig leden die Marc persoonlijk kent, weegt dat niet op tegen een tijdlijn die hetzelfde vertelt.

### Privacy

- **De tijdlijn hoort bij de bestelling.** Ze dient om een bestelling uit te voeren en een fout te herstellen. Waarschijnlijk is daar geen toestemming voor nodig; laat dat toetsen in de juridische check. Ze komt in de privacyverklaring en verdwijnt na 180 dagen.
- **Volgen buiten een bestelling is iets anders.** Welk lid welke wijn bekeek, is een persoonsgegeven zonder bestelling erachter. Stap C bewaart het 180 dagen, en Marc en Aidan zien alleen aantallen, zoals nu bij `weergaven`.
- **Een platform in de browser vraagt mogelijk toestemming.** Voor zover bekend mag een site volgens artikel 11.7a van de Telecommunicatiewet zonder toestemming alleen gegevens op een toestel zetten of uitlezen als dat nodig is voor de dienst, of voor statistiek die de privacy weinig raakt. Of PostHog in een app met bekende leden daaronder valt, is niet nagezocht. Laat het toetsen voordat er een platform komt.
- **Een nieuwe verwerker** vraagt een verwerkersovereenkomst, opslag in de EU en een regel in de privacyverklaring. Nu is Mollie de enige externe partij.
- **Het logboek blijft zonder namen, adressen en bedragen.** De regels van stap B noemen geen lid. Of een `bestellingId` in het logboek mag staan, is een open keuze: het is via de tabel te herleiden tot een lid.
- Punt E8 in [beveiliging.md](beveiliging.md) geldt ook hier: wie in het gedeelde account de tabellen kan lezen, leest ook de tijdlijn.

### Wat het niet doet

- Geen schermopnames en geen live meekijken met een lid.
- Geen profiel per lid: geen overzicht van wat één lid bekeek of hoe vaak het de app opende.
- Geen status die Marc met de hand zet.
- Geen advertentie- of volgcodes van derden.

### Open keuzes voor Aidan

1. Mag het `bestellingId` in het logboek? Dan is een bestelling ook buiten de app terug te vinden met CloudWatch Logs Insights, als elke regel over een bestelling het nummer en de stap noemt. Tot dat beslist is, staat het er niet in; zie de open punten in de bouwspecificatie.
2. Wil Marc bericht bij een bon van de lijst die vervalt na een betaalpoging? Het is een voorlopige bouwkeuze in het plan; Marc moet het bevestigen.

Beslist op 21 november 2026: stap A komt vóór de eerste uitnodiging aan een lid, in week 7. Dat kost naar schatting drie dagen in een volle planning.

Dit onderwerp is geslaagd als Marc of Aidan bij elke bestelling die misging binnen een dag weet wat er gebeurde, zonder het lid ernaar te vragen, en geen lid een fout meldt waar de app niet al een signaal voor gaf.

## 20. Een logo op het tabblad van de browser

Het tabblad van de browser toont nu het algemene plaatje van de browser zelf: `app/index.html` noemt geen icoon voor het tabblad. De app heeft wel iconen voor het beginscherm van een telefoon, in `app/public/iconen/`, maar die zijn voorlopig. Vastgesteld op 21 november 2026.

- **Wat het is.** Het logo van de club als icoon op het tabblad, in de lijst met bladwijzers en in de geschiedenis van de browser.
- **Wat erbij komt.** Een regel `<link rel="icon">` in `app/index.html`, met het logo als SVG en als klein PNG voor browsers die geen SVG tonen. Het icoon moet op 16 bij 16 beeldpunten herkenbaar blijven, op een licht en op een donker tabblad.
- **Samen met het beginscherm.** De voorlopige iconen in `app/public/iconen/` en in `manifest.webmanifest` worden in dezelfde wijziging het echte logo. Zo ziet een lid op het tabblad en op het beginscherm hetzelfde beeld.
- **Wat het kost.** Naar schatting een uur, zodra het logo er is.
- **Start als** Marc het logo heeft geleverd. Het logo en de naam van de club zijn van Marc; zie onderwerp 13. Er komt geen logo dat zonder hem is bedacht.

## 21. Ook op de pc: de app in een brede browser

De pilot is gemaakt voor de telefoon. Op een breder scherm toont de app dezelfde kolom van hoogstens 430 px, met lege ruimte links en rechts; zie "Mobiel eerst" in het plan en eis M1 in de [bouwspecificatie](bouwspecificatie.md), hoofdstuk 10. Dat werkt, maar het benut een groot scherm niet. Vastgesteld op 21 november 2026.

De telefoon blijft het uitgangspunt: daar gebruiken vrijwel alle leden de app, en Marc tijdens de avond ook. Aidan verwacht dat Marc zijn voorraad en zijn planning ook geregeld achter de pc doet: flessen klaarzetten, een avond plannen en de leden bijhouden. Dat is werk met veel gegevens tegelijk, en typen gaat op een toetsenbord sneller. Het is nog niet met Marc besproken.

- **Wat het is.** De app werkt in de gangbare browsers op telefoon en pc: Safari en Chrome op de telefoon, en Chrome, Safari, Edge en Firefox op de pc. Vanaf een breedte van ongeveer 900 px krijgen de schermen waar het helpt een bredere indeling. Het blijft één web-app op één adres, met dezelfde aanroepen.
- **Beheer eerst.** Een avond plannen, Nieuwe fles, Leden en Afleveren krijgen op een breed scherm een tabel of twee kolommen: de lijst links, de gekozen fles, avond of bestelling rechts. Tussen de beheerschermen komt een vast menu aan de zijkant. De avond blijft gemaakt voor de telefoon, want Marc staat dan aan tafel.
- **Voorraad in één overzicht.** Op de pc ziet Marc alle flessen in één tabel: klaargezet, op tafel, verkocht en nog beschikbaar, te sorteren en te doorzoeken. De pilot heeft dat overzicht niet; daar zet Marc flessen één voor één klaar. Dit raakt onderwerp 5, het inkoopoverzicht.
- **Voor leden.** Het aanbod, de bon en de veiling blijven dezelfde kolom, met op een breed scherm de foto ernaast in plaats van erboven. Meer niet: een lid bestelt op zijn telefoon.
- **Muis en toetsenbord.** Alles is te bedienen met het toetsenbord, met een zichtbare focus. Vegen heeft altijd een knop of het muiswiel als tweede weg, zoals de biedladder nu al. Een foto van een fles kiest Marc op de pc uit een map of sleept hij erin; de camera blijft voor de telefoon. Voor zo'n bestand gelden dezelfde regels als voor elke upload; zie "Uploads zijn een risico" in de bouwspecificatie, hoofdstuk 5.
- **Inloggen op de pc.** In de pilot logt iedereen in met de code per e-mail, ook op de pc. Komt er een passkey (onderwerp 22), dan werkt die van een iPhone of Android-telefoon via de sleutelhanger van Apple of Google, of via de telefoon naast de pc. Zoek uit wat Cognito hier toelaat voordat het ontwerp vastligt. Op een gedeelde pc blijft niemand een jaar ingelogd: daar hoort een kortere sessie of een duidelijke knop Uitloggen bij.
- **Wat er verandert in de documenten.** Eis M1 krijgt een tweede deel voor brede schermen, en hoofdstuk 10 een referentiemaat voor de pc, bijvoorbeeld 1280 × 720 px. De browsertests draaien die maat erbij in Chromium, WebKit en Firefox, en de handtest krijgt een ronde op een pc. Het ontwerp tekent tot nu toe alleen frames van 390 px; Aidan levert de brede schermen voor beheer.
- **Wat het kost.** Naar schatting drie tot vijf dagen: één voor de brede indeling van de bestaande schermen en het menu, twee tot drie voor het voorraadoverzicht, en één voor de tests en de handtest op de pc.
- **Wat het niet doet.** Geen aparte app voor de pc, geen functie die alleen op de pc bestaat behalve het overzicht, en geen eisen voor de telefoon die soepeler worden.

**Start als** de zes beheerschermen van de pilot gebouwd zijn en Marc zegt dat hij voorraad of planning liever achter de pc doet. Vraag het hem bij zijn oordeel over het prototype. Tot dan toont een pc de smalle kolom. Dat is in de pilot alleen in Chromium en WebKit op telefoonformaat getest, niet op een pc en niet in Firefox.

## 22. Inloggen met een passkey ("Face ID")

Design-v4 bood na de eerste login "Voortaan met Face ID" aan, en wie dat koos, zag de volgende keer "Welkom terug". Op 21 november 2026 is besloten dat de pilot alleen met de code per e-mail inlogt. Schermen 04 en 05 zijn uit het prototype gehaald; de frames staan nog in het Pencil-bestand.

- **Wat het is.** Een passkey (WebAuthn) werkt gewoon in de browser: Safari op iPhone en Chrome op Android ondersteunen het zonder app uit de App Store. Op iPhone heet het Face ID of Touch ID, op Android ontgrendelen met je vingerafdruk of gezicht. De passkey staat in de sleutelhanger van Apple of Google en gaat mee naar de andere apparaten van het lid; "werkt alleen op deze telefoon", zoals V4 zei, klopt dus niet.
- **Waarom niet in de pilot.** Een passkey zit vast aan het adres van de site. De pilot begint op het adres van CloudFront; bij de overstap naar een eigen domein (onderwerp 13) vervallen alle passkeys en moet elk lid het opnieuw instellen. Bovendien blijft een lid door het refresh-token van een jaar toch al ingelogd, dus het lid ziet het inloggen zelden.
- **Wat erbij komt.** In `infra/wijnclub_infra/auth_stack.py` komt `passkey` naast `email_otp` bij de toegestane eerste factoren, met het eigen domein als relying party; het Essentials-plan volstaat. De web-app roept het registreren van een passkey aan na de eerste login en biedt hem aan bij het inloggen. Schermen 04 en 05 van V4 komen terug, met een tekst die zegt dat de passkey ook op je andere apparaten werkt. De code per e-mail blijft de terugvaloptie: voor een nieuwe telefoon of een lid zonder sleutelhanger.
- **Eerst voor het beheer.** De groep `beheer` logt nu alleen in met de code per e-mail; wie de mailbox van Marc of Aidan heeft, heeft het beheer (punt B3 in [beveiliging.md](beveiliging.md)). Begin daar.
- **Wat het niet doet.** Geen wachtwoorden, en geen passkey als enige manier om binnen te komen.

**Start als** het eigen domein van onderwerp 13 in gebruik is. Omdat dat vóór de eerste uitnodiging af moet, kan de passkey er voor het beheer al in de pilot bij komen, als Aidan dat wil.

## Bewust niet

| Idee | Waarom niet |
| --- | --- |
| Verkoop tussen leden | Catawiki en Winefield's doen dit met commissie, beoordeling en echtheidscontrole. Het maakt van Marc een tussenpersoon en staat buiten het doel van de club |
| Landelijke pakketverzending | Alle gevonden verkopers verzenden. Het vergroot het bereik, maar ruilt het onderscheid van de club in voor een markt met gratis bezorging als norm, en vraagt een leeftijdscontrole aan de deur |
| Punten en spaarsystemen | Slimmer Wijn Kopen heeft ze. Ze botsen met de regel "rustig" en zetten aan tot meer kopen |
| Een product voor andere chefs en restaurants | Er is in Nederland geen aanbieder zoals Table22 gevonden. Dat is een opening, maar het is een ander project dan een hulpmiddel voor Marc |

## Wat de pilot hiervoor al vastlegt

Drie tellingen maken de keuze tussen deze onderwerpen na acht weken makkelijker. Ze staan in de planning van het plan bij week 6 en 7, en in de [bouwspecificatie](bouwspecificatie.md) onder Tellingen voor de roadmap. Er komt geen scherm bij; de bouwer vraagt ze op voor de evaluatie.

- Welk deel van de leden op een tweede en derde lijst bestelt: of terugkomen een probleem is.
- Bij een bieding: hoeveel leden de fles bekeken zonder te bieden, en hoeveel biedingen de eindtijd verlengden: de vraag naar volgen en een maximaal bod.
- Per melding: wanneer hij verstuurd is, hoeveel leden erop tikten en hoeveel er binnen 24 uur bestelden of boden: het beste moment, voor de campagnes.

Voor onderwerp 16 komt er geen telling bij. Vraag in de vijf gesprekken na afloop of een lid lijsten of meldingen oversloeg omdat er weinig voor hem bij zat.

Voor onderwerp 19 komt er geen telling bij: stap A zit in de pilot. Houd in de pilot bij hoe vaak een signaal afging, hoe vaak Marc of Aidan daarna ingreep, en hoe vaak een lid iets meldde waar geen signaal voor was. Dat zegt of stap B en C nodig zijn.
