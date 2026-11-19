// Voorbeeldinhoud voor het klikbare prototype. De app toont een balk "voorbeeldinhoud"
// zolang deze gegevens gebruikt worden; er wordt niets besteld, betaald of verstuurd.
//
// Uit de praktijk: de teksten, prijzen en aantallen van wijn H en I, de letters per wijn en
// "En de laatste van vandaag". Verzonnen: wijn F en G, de Barolo en alles wat erbij staat, de
// afhaalpunten en hun tijden, de inleiding, de aankondiging, Marcs berichten in de feed en de
// biedlog, de snelle zinnen, het aantal leden, de leden en hun bestellingen. Dit zijn geen woorden van Marc.
import type { Afhaalpunt, Bieding, Lid, Lijst } from './types'

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
  inleiding: 'Ik heb deze week een paar mooie flessen kunnen kopen, alleen voor jullie. Vanaf 19:30 kun je bestellen.',
  openVan: '2026-11-16T08:00:00Z',
  openTot: '2026-11-22T19:00:00Z',
  afhaalpunten,
  wijnen: [
    {
      wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda', jaargang: 2024, volgorde: 1,
      tekst: 'Fris en sappig, citrus en een beetje venkel. Mijn zomerwit.',
      foto: '/voorbeeld/verdejo.jpg', prijs: 975, voorraad: 6, partij: 6,
    },
    {
      wijnId: 'wijn-g', letter: 'G', naam: 'Chianti Classico', jaargang: 2021, volgorde: 2,
      tekst: 'Kersen, viooltjes en een droge, stevige finale. Perfect bij pasta.',
      foto: '/voorbeeld/chianti.jpg', prijs: 1600, voorraad: 6, partij: 6,
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
    startbod: 25000, minimaleVerhoging: 1000, minimaalVolgendBod: 25000,
    eindtijd: '2026-11-19T20:00:00Z', aantalBiedingen: 0, biedingStatus: 'open', mijnBodIsHoogste: false,
  },
]

/**
 * Wat andere leden bestelden op de lopende avond (zie "Spring naar de lopende avond" in de voorbeeldbalk).
 * Samen met de wijnen die op tafel staan geeft dit de stand van scherm 03 en 15.
 */
export const voorbeeldBestellingen: { lidId: string; door: 'lid' | 'beheer'; wijnId: string; aantal: number; levering: string; minuut: number }[] = [
  { lidId: 'lid-3', door: 'lid', wijnId: 'wijn-f', aantal: 3, levering: 'venlo', minuut: 3 },
  { lidId: 'lid-4', door: 'beheer', wijnId: 'wijn-f', aantal: 3, levering: 'roermond', minuut: 9 },
  { lidId: 'lid-2', door: 'lid', wijnId: 'wijn-h', aantal: 2, levering: 'roermond', minuut: 14 },
  { lidId: 'lid-3', door: 'lid', wijnId: 'wijn-i', aantal: 3, levering: 'venlo', minuut: 22 },
]

/** Berichten van Marc op de lopende avond, in minuten na het begin. Verzonnen voorbeelden. */
export const voorbeeldBerichten = {
  begin: 'Goedenavond! Ik zet ze een voor een op tafel. Wie het eerst is, die het eerst maalt.',
  laatste: 'En de laatste van vandaag 👇',
  veiling: 'Mooi! Durft er iemand naar 400?',
  slot: 'Nog even volhouden…',
  verkocht: 'Gefeliciteerd! Deze fles lag al tien jaar in mijn kelder te wachten op de juiste persoon. Proost.',
  nietsOpen: 'De volgende avond kondig ik hier aan. Je krijgt een melding.',
}

/** Snelle zinnen in het beheer. Marc stelt ze zelf in. */
export const voorbeeldSnelleZinnen = ['En de laatste van vandaag 👇', 'Nog maar een paar flessen!', 'Dank jullie wel, proost!']

/** Hoeveel leden de avond of de veiling open hebben. In de echte app een telling van open verbindingen. */
export const voorbeeldLedenBinnen = 14
export const voorbeeldLedenKijken = 12

/** Het bericht dat in beheer al klaarstaat om te laten herkennen. Verzonnen. */
export const voorbeeldBericht = `*Wijn J Soave Classico 2023*
Fris en rond, met amandel en witte perzik. Lekker bij vis.
18 flessen beschikbaar €10,5 pfl`
