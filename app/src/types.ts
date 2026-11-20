// De vorm van de gegevens in de web-app. Aanbod volgt GET /api/aanbod, zoals
// functions/wijnclub/handlers/aanbod.py die teruggeeft. Bedragen zijn hele centen, tijden UTC-tekst.

/** Hoe een lid zijn flessen krijgt (design-v4): Marc brengt ze, of het lid haalt ze op. */
export type LeverSoort = 'brengen' | 'halen'

/** Wat Marc per lijst aanbiedt, zoals GET /api/aanbod het geeft. Wat hij niet aanbiedt, ontbreekt. */
export interface Levering {
  brengen?: { van: string; tot: string }
  halen?: { van: string; tot: string; waar: string }
}

export interface Wijn {
  wijnId: string
  /**
   * Marcs letter uit WhatsApp. Leden zien hem niet meer (design-v4); Marc gebruikt hem nog bij
   * een bestelling namens een lid, zoals "G2 H1".
   */
  letter: string
  naam: string
  /** Korter, voor lijsten en de bon: "Janasse Côtes du Rhône" in plaats van de volle naam. */
  korteNaam?: string
  producent?: string
  jaargang?: number
  /** "rood", "wit", "rosé". Dit veld zit nog niet in de API; zie de open punten in docs/bouwspecificatie.md. */
  kleur?: string
  druif?: string
  streek?: string
  land?: string
  tekst: string
  spijs?: string
  drinken?: string
  foto?: string
  prijs: number
  voorraad: number
  volgorde: number
  /** Het aantal flessen waarmee de wijn op de lijst kwam. De flessenrij tekent daarmee wat al weg is.
   *  Dit veld zit nog niet in de API; zie de open punten in docs/bouwspecificatie.md. */
  partij?: number
  /** Wanneer Marc de wijn op tafel zette. Leeg: hij staat klaar maar is nog niet zichtbaar in de feed. */
  opTafelSinds?: string
  /** Wanneer de laatste fles weg was. */
  opSinds?: string
}

export interface Lijst {
  lijstId: string
  titel: string
  inleiding?: string
  openVan: string
  openTot: string
  /** Brengen, halen of allebei. */
  levering: Levering
  wijnen: Wijn[]
}

export interface Bieding {
  wijnId: string
  naam: string
  producent?: string
  jaargang?: number
  druif?: string
  streek?: string
  /** Waarom deze fles. */
  tekst?: string
  spijs?: string
  drinken?: string
  herkomst?: string
  /** Hoe de fles bewaard is. */
  bewaring?: string
  spraakbericht?: string
  foto?: string
  startbod: number
  minimaleVerhoging: number
  minimaalVolgendBod: number
  hoogsteBod?: number
  eindtijd: string
  aantalBiedingen?: number
  biedingStatus: 'open' | 'gesloten'
  mijnBodIsHoogste: boolean
}

export interface Aanbod {
  lijsten: Lijst[]
  biedingen: Bieding[]
}

export interface Lid {
  lidId: string
  naam: string
  email?: string
  /** Het afleveradres, alleen voor brengen. Alleen het lid zelf en de groep beheer zien het. */
  adres?: { straat: string; postcode: string; plaats: string }
}

export interface Regel {
  wijnId: string
  /** Leeg bij een fles uit een bieding. */
  letter: string
  naam: string
  jaargang?: number
  foto?: string
  aantal: number
  prijs: number
}

export type BestelStatus = 'open' | 'betaald' | 'verlopen' | 'terugbetaald'

export interface Bestelling {
  bestellingId: string
  /** Het nummer op de bon, zoals 0147. */
  bon: string
  lidId: string
  soort: 'lijst' | 'namens' | 'bieding'
  lijstId?: string
  regels: Regel[]
  totaal: number
  /** Open tot betaald of verlopen. Een bestelling van de lijst wacht 15 minuten op de betaling. */
  status: BestelStatus
  betaalVoor: string
  /** Brengen of halen. Bij een gewonnen bieding kiest het lid pas na het betalen. */
  levering: LeverSoort | null
  ingevoerdDoor: 'lid' | 'beheer'
  aangemaakt: string
  betaaldOp?: string
  afgeleverdOp?: string
}

/** Fase van een avond bij Marc. Zie docs/bouwspecificatie.md, hoofdstuk 3. */
export type Fase = 'aangekondigd' | 'live' | 'gesloten'

/** Wat er in de feed van het aanbod staat. Een gebeurtenis bevat nooit een lidId. */
export type FeedItem =
  | { id: string; op: string; soort: 'bericht'; tekst: string }
  | { id: string; op: string; soort: 'wijn'; wijnId: string }
  | { id: string; op: string; soort: 'gebeurtenis'; tekst: string }

/** Een regel in de biedlog. Een bieder heeft per veiling een vast nummer dat niet herleidbaar is tot het lid. */
export type LogItem =
  | { op: string; soort: 'open'; bedrag: number }
  | { op: string; soort: 'bod'; bedrag: number; bieder: number | 'jij' }
  | { op: string; soort: 'bericht'; tekst: string }
