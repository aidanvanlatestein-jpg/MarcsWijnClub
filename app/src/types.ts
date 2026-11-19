// De vorm van GET /api/aanbod, zoals functions/wijnclub/handlers/aanbod.py die teruggeeft.
// Bedragen zijn hele centen, tijden UTC-tekst.

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
  tekst?: string
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
