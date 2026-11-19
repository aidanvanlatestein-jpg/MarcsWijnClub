// Voorbeeldinhoud voor het klikbare prototype. De app toont een balk "voorbeeldinhoud"
// zolang deze gegevens gebruikt worden; er wordt niets besteld, betaald of verstuurd.
//
// Uit de praktijk: de teksten, prijzen en aantallen van wijn H en I, en de letters per wijn.
// Verzonnen: wijn F en G, de Barolo en alles wat erbij staat, de afhaalpunten en hun tijden,
// de inleiding, de leden en hun bestellingen. Dit zijn geen woorden van Marc.
import type { Afhaalpunt, Bestelling, Bieding, Eerder, Lid, Lijst, Oordeel } from './types'

export const voorbeeldLid: Lid = { lidId: 'lid-1', naam: 'Lid 1', email: 'lid-1@voorbeeld.nl' }

export const voorbeeldLeden: Lid[] = [
  voorbeeldLid,
  { lidId: 'lid-2', naam: 'Lid 2' },
  { lidId: 'lid-3', naam: 'Lid 3' },
  { lidId: 'lid-4', naam: 'Lid 4' },
]

const afhaalpunten: Afhaalpunt[] = [
  { afhaalpuntId: 'roermond', naam: 'Roermond', wanneer: 'Vrijdag vanaf 17:00' },
  { afhaalpuntId: 'venlo', naam: 'Venlo', wanneer: 'Zaterdag 10:00 tot 12:00' },
]

export const voorbeeldLijst: Lijst = {
  lijstId: 'lijst-47',
  titel: 'Lijst van de week',
  inleiding: 'Vier wijnen deze week. Je haalt ze op bij een afhaalpunt in de buurt.',
  openVan: '2026-11-16T08:00:00Z',
  openTot: '2026-11-22T19:00:00Z',
  afhaalpunten,
  wijnen: [
    {
      wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda', jaargang: 2024, volgorde: 1,
      tekst: 'Fris en sappig, citrus en een beetje venkel. Mijn zomerwit.',
      foto: '/voorbeeld/verdejo.jpg', prijs: 975, voorraad: 0, partij: 6,
    },
    {
      wijnId: 'wijn-g', letter: 'G', naam: 'Chianti Classico', jaargang: 2021, volgorde: 2,
      tekst: 'Kersen, viooltjes en een droge, stevige finale. Perfect bij pasta.',
      foto: '/voorbeeld/chianti.jpg', prijs: 1600, voorraad: 4, partij: 6,
    },
    {
      wijnId: 'wijn-h', letter: 'H', naam: 'Domaine de la Janasse Côtes du Rhône', jaargang: 2023, volgorde: 3,
      tekst: 'Sappige, karaktervolle rode Rhône-wijn met rijpe aardbeien, zwarte bessen en bramen.',
      foto: '/voorbeeld/janasse.jpg', prijs: 1350, voorraad: 6, partij: 6,
    },
    {
      wijnId: 'wijn-i', letter: 'I', naam: 'Cándido Immensum', jaargang: 2022, volgorde: 4,
      druif: 'Negroamaro', streek: 'Puglia · Italië',
      tekst: 'Krachtige Negroamaro uit Puglia, boordevol rijp zwart fruit, pruimen en warme kruiden. Vol en soepel in de mond, met zwoele tannines en een rijke, lange afdronk. Een echte Italiaanse krachtpatser.',
      spijs: 'Stoofvlees, pasta met ragù of lam van de barbecue.',
      drinken: 'Nu tot 2028. Een half uur open voor je schenkt.',
      foto: '/voorbeeld/candido.jpg', prijs: 1150, voorraad: 12, partij: 12,
    },
  ],
}

export const voorbeeldBiedingen: Bieding[] = [
  {
    wijnId: 'bieding-1', naam: 'Barolo Cannubi', jaargang: 2010, druif: 'Nebbiolo', streek: 'Piemonte',
    tekst: 'Ik heb deze fles zelf sinds 2014 liggen. Cannubi is een van de beste wijngaarden van Barolo, en 2010 een topjaar.',
    drinken: 'Nu open, tot ongeveer 2030. Twee uur in een karaf.',
    spijs: 'Risotto met witte truffel, of langzaam gegaarde runderwang.',
    herkomst: 'Gekocht in 2014 bij de importeur, sindsdien in mijn kelder.',
    bewaring: 'Liggend, donker, constant 13 °C.',
    foto: '/voorbeeld/barolo.jpg',
    startbod: 25000, minimaleVerhoging: 1000, minimaalVolgendBod: 35000, hoogsteBod: 34000,
    eindtijd: '2026-11-22T20:00:00Z', aantalBiedingen: 9, biedingStatus: 'open', mijnBodIsHoogste: false,
  },
]

/** Wat andere leden al van deze lijst bestelden. Dit klopt met de voorraad hierboven. */
export const voorbeeldBestellingen: Bestelling[] = [
  {
    bestellingId: 'b-0144', bon: '0144', lidId: 'lid-4', soort: 'namens', lijstId: 'lijst-47',
    regels: [{ wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda', jaargang: 2024, aantal: 3, prijs: 975 }],
    totaal: 2925, status: 'open', levering: 'roermond', ingevoerdDoor: 'beheer', aangemaakt: '2026-11-16T09:12:00Z',
  },
  {
    bestellingId: 'b-0145', bon: '0145', lidId: 'lid-2', soort: 'lijst', lijstId: 'lijst-47',
    regels: [{ wijnId: 'wijn-g', letter: 'G', naam: 'Chianti Classico', jaargang: 2021, aantal: 2, prijs: 1600 }],
    totaal: 3200, status: 'open', levering: 'roermond', ingevoerdDoor: 'lid', aangemaakt: '2026-11-16T10:40:00Z',
  },
  {
    bestellingId: 'b-0146', bon: '0146', lidId: 'lid-3', soort: 'lijst', lijstId: 'lijst-47',
    regels: [{ wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda', jaargang: 2024, aantal: 3, prijs: 975 }],
    totaal: 2925, status: 'open', levering: 'venlo', ingevoerdDoor: 'lid', aangemaakt: '2026-11-17T18:05:00Z',
  },
]

export const voorbeeldEerder: Eerder[] = [
  { wijnId: 'wijn-i', letter: 'I', naam: 'Cándido Immensum', jaargang: 2022, aantal: 3, gekocht: '2026-11-12T12:00:00Z' },
  { wijnId: 'wijn-g', letter: 'G', naam: 'Chianti Classico', jaargang: 2021, aantal: 2, gekocht: '2026-10-29T12:00:00Z' },
  { wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda', jaargang: 2024, aantal: 6, gekocht: '2026-10-01T12:00:00Z' },
]

export const voorbeeldOordelen: Record<string, Oordeel> = { 'wijn-i': 'lekker', 'wijn-f': 'niet' }

/** Het bericht dat in beheer al klaarstaat om te laten herkennen. Verzonnen. */
export const voorbeeldBericht = `*Wijn J Soave Classico 2023*
Fris en rond, met amandel en witte perzik. Lekker bij vis.
18 flessen beschikbaar €10,5 pfl`
