// Voorbeeldinhoud, overgenomen uit het ontwerp. Dit zijn geen echte wijnen, prijzen of
// woorden van Marc. De app toont een balk "voorbeeldinhoud" zolang deze gegevens gebruikt
// worden. Zodra inloggen werkt, komt het aanbod uit GET /api/aanbod.
import type { Aanbod } from './types'

export const voorbeeldAanbod: Aanbod = {
  lijsten: [
    {
      lijstId: 'lijst-1',
      titel: 'Lijst van de week',
      inleiding: 'Ik breng ze langs, of je haalt ze op.',
      openVan: '2026-11-16T08:00:00Z',
      openTot: '2026-11-22T19:00:00Z',
      afhaalpunten: [
        { afhaalpuntId: 'roermond', naam: 'Roermond', wanneer: 'Vanaf vrijdag, op afspraak' },
      ],
      wijnen: [
        {
          wijnId: 'wijn-f', letter: 'F', naam: 'Verdejo Rueda 2024', volgorde: 1,
          tekst: 'Fris en sappig, citrus en een beetje venkel. Mijn zomerwit.',
          foto: '/voorbeeld/verdejo.jpg', prijs: 975, voorraad: 0,
        },
        {
          wijnId: 'wijn-g', letter: 'G', naam: 'Chianti Classico 2021', volgorde: 2,
          tekst: 'Kersen, viooltjes en een droge, stevige finale. Perfect bij pasta.',
          foto: '/voorbeeld/chianti.jpg', prijs: 1600, voorraad: 4,
        },
        {
          wijnId: 'wijn-h', letter: 'H', naam: 'Domaine de la Janasse Côtes du Rhône Rouge 2023', volgorde: 3,
          tekst: 'Sappige, karaktervolle rode Rhône-wijn met aroma’s van rijpe aardbeien, zwarte bessen en bramen.',
          foto: '/voorbeeld/janasse.jpg', prijs: 1350, voorraad: 6,
        },
        {
          wijnId: 'wijn-i', letter: 'I', naam: 'Cándido Immensum 2022', volgorde: 4,
          druif: 'Negroamaro', streek: 'Puglia, Italië',
          tekst: 'Krachtige Negroamaro uit Puglia, boordevol rijp zwart fruit, pruimen en warme kruiden. Vol en soepel in de mond, met zwoele tannines en een rijke, lange afdronk. Een echte Italiaanse krachtpatser.',
          spijs: 'Stoofvlees, pasta met ragù of lam van de barbecue.',
          drinken: 'Nu tot 2028. Zet hem een half uur open voor je schenkt.',
          foto: '/voorbeeld/candido.jpg', prijs: 1150, voorraad: 12,
        },
      ],
    },
  ],
  biedingen: [
    {
      wijnId: 'bieding-1', naam: 'Barolo Cannubi 2010', foto: '/voorbeeld/barolo.jpg',
      startbod: 25000, minimaleVerhoging: 2500, minimaalVolgendBod: 36500, hoogsteBod: 34000,
      eindtijd: '2026-11-22T20:00:00Z', aantalBiedingen: 5, biedingStatus: 'open', mijnBodIsHoogste: false,
    },
  ],
}
