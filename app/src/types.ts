// De vorm van de gegevens in de web-app. Aanbod volgt GET /api/aanbod, zoals
// functions/wijnclub/handlers/aanbod.py die teruggeeft. Bedragen zijn hele centen, tijden UTC-tekst.

export interface Afhaalpunt {
  afhaalpuntId: string
  naam: string
  wanneer: string
  toelichting?: string
}

export interface Wijn {
  wijnId: string
  letter: string
  naam: string
  producent?: string
  jaargang?: number
  druif?: string
  streek?: string
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
  /** Wanneer Marc de wijn op tafel zette (V3). Leeg: hij staat klaar maar is nog niet zichtbaar in de feed. */
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
  afhaalpunten: Afhaalpunt[]
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
  /** Hoe de fles bewaard is. In de API hoort dit nu nog bij herkomst. */
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
}

export interface Regel {
  wijnId: string
  /** Leeg bij een fles uit een bieding. */
  letter: string
  naam: string
  jaargang?: number
  aantal: number
  prijs: number
}

export type BestelStatus = 'open' | 'betaald' | 'verlopen' | 'terugbetaald'

/** Bewaren bij Marc, alleen voor een fles uit een bieding. */
export const BEWAREN = 'bewaren'

export interface Bestelling {
  bestellingId: string
  /** Het nummer op de bon, zoals 0147. */
  bon: string
  lidId: string
  soort: 'lijst' | 'namens' | 'bieding'
  lijstId?: string
  regels: Regel[]
  totaal: number
  status: BestelStatus
  /** Een afhaalpuntId, 'bewaren', of nog niet gekozen (bij een gewonnen bieding). */
  levering: string | null
  ingevoerdDoor: 'lid' | 'beheer'
  aangemaakt: string
  betaaldOp?: string
  afgeleverdOp?: string
}

export type Oordeel = 'lekker' | 'niet'

/** Een wijn die het lid op een eerdere lijst kocht. */
export interface Eerder {
  wijnId: string
  letter: string
  naam: string
  jaargang?: number
  aantal: number
  gekocht: string
}

/** Fase van een avond bij Marc (design-v3). Zie docs/bouwspecificatie.md, hoofdstuk 3. */
export type Fase = 'aangekondigd' | 'live' | 'gesloten'

/** Wat er in de feed van De avond staat. Een gebeurtenis bevat nooit een lidId. */
export type FeedItem =
  | { id: string; op: string; soort: 'bericht'; tekst: string }
  | { id: string; op: string; soort: 'wijn'; wijnId: string }
  | { id: string; op: string; soort: 'gebeurtenis'; tekst: string }

/** Een regel in de biedlog. Een bieder heeft per veiling een vast nummer dat niet herleidbaar is tot het lid. */
export type LogItem =
  | { op: string; soort: 'open'; bedrag: number }
  | { op: string; soort: 'bod'; bedrag: number; bieder: number | 'jij' }
  | { op: string; soort: 'bericht'; tekst: string }
