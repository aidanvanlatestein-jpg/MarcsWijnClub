// Regels die in de web-app zelf draaien: een WhatsApp-bericht van Marc lezen en
// "G2 H1" omzetten in regels. Zie docs/bouwspecificatie.md, hoofdstuk 5.
//
// Het herkennen van een bericht gebeurt in de echte app door een taalmodel via
// POST /api/beheer/herken. Hier staat een eenvoudige regel, alleen voor het prototype.

export interface Herkend {
  letter?: string
  naam: string
  jaargang?: number
  aantal?: number
  /** Hele centen. */
  prijs?: number
  tekst: string
}

const AANTAL = /(\d+)\s*(?:flessen|fles|fl)\b/i
const PRIJS = /€\s*(\d+)(?:[.,](\d{1,2}))?/
const JAAR = /\b(19\d{2}|20\d{2})\b/

function centen(euros: string, rest?: string): number {
  const deel = rest ? (rest.length === 1 ? Number(rest) * 10 : Number(rest)) : 0
  return Number(euros) * 100 + deel
}

export function herkenBericht(bericht: string): Herkend {
  const regels = bericht
    .split('\n')
    .map((r) => r.replace(/[*_~]/g, '').trim())
    .filter(Boolean)
  const kopIndex = Math.max(0, regels.findIndex((r) => /^wijn\s+[a-z]\b/i.test(r)))
  const kop = regels[kopIndex] ?? ''
  const uit: Herkend = { naam: '', tekst: '' }

  let rest = kop
  const letter = /^wijn\s+([a-z])\b\s*(.*)$/i.exec(kop)
  if (letter) {
    uit.letter = letter[1].toUpperCase()
    rest = letter[2]
  }
  const jaar = JAAR.exec(rest)
  if (jaar) {
    uit.jaargang = Number(jaar[1])
    rest = rest.replace(jaar[0], ' ')
  }
  uit.naam = rest.replace(/\s+/g, ' ').trim()

  const tekst: string[] = []
  for (const [i, regel] of regels.entries()) {
    if (i === kopIndex) continue
    const aantal = AANTAL.exec(regel)
    const prijs = PRIJS.exec(regel)
    if (aantal && uit.aantal === undefined) uit.aantal = Number(aantal[1])
    if (prijs && uit.prijs === undefined) uit.prijs = centen(prijs[1], prijs[2])
    if (!aantal && !prijs) tekst.push(regel)
  }
  uit.tekst = tekst.join(' ')
  return uit
}

/** "11,50", "11.5", "€ 11" of "10,-" naar hele centen. Geen geldig bedrag: null. Zoals lees_euro in domein/geld.py. */
export function leesEuro(invoer: string): number | null {
  const m = /^\s*€?\s*(\d{1,5})(?:[.,](\d{1,2}|-))?\s*$/.exec(invoer)
  if (!m) return null
  return centen(m[1], m[2] === '-' ? undefined : m[2])
}

// ---- Regels die ook in functions/wijnclub/domein staan ----
// Het prototype speelt de server na. Deze regels moeten daarom precies doen wat het domein doet;
// tests/gedeeld/regels.json bevat de gevallen die beide kanten moeten halen.

const MINUUT = 60_000

/** Zo lang houdt Marc de flessen vast terwijl het lid betaalt (domein/bestelling.py: HOUDTIJD). */
export const HOUDTIJD = 15 * MINUUT
/** Namens een lid en na een gewonnen bieding (domein/bestelling.py: BETAALTERMIJN). */
export const BETAALTERMIJN = 48 * 60 * MINUUT
/** Een bod in de laatste twee minuten verlengt de eindtijd met twee minuten (domein/bieding.py: VERLENGING). */
export const VERLENGING = 2 * MINUUT
/** Een bod is hoogstens drie keer het minimum (domein/bieding.py: HOOGSTE_FACTOR). */
export const HOOGSTE_FACTOR = 3

export function plus(utc: string, ms: number): string {
  return new Date(new Date(utc).getTime() + ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Het totaal van een bestelling in hele centen (domein/geld.py: totaal). */
export function totaal(regels: readonly { prijs: number; aantal: number }[]): number {
  return regels.reduce((som, r) => som + r.prijs * r.aantal, 0)
}

/** Het hoogste bod dat nog doorgaat (domein/bieding.py: hoogste_toegestane_bod). */
export function hoogsteToegestaneBod(minimaalVolgendBod: number): number {
  return minimaalVolgendBod * HOOGSTE_FACTOR
}

/** De eindtijd na een bod: verlengd als het bod in de laatste twee minuten valt (domein/bieding.py: nieuwe_eindtijd). */
export function nieuweEindtijd(eindtijd: string, nu: string): string {
  return new Date(eindtijd).getTime() - new Date(nu).getTime() <= VERLENGING ? plus(nu, VERLENGING) : eindtijd
}

/** Tot wanneer betaald kan worden (domein/bestelling.py: betaal_voor). */
export function betaalVoor(soort: 'lijst' | 'namens' | 'bieding', aangemaakt: string): string {
  return plus(aangemaakt, soort === 'lijst' ? HOUDTIJD : BETAALTERMIJN)
}

export interface LetterRegel {
  letter: string
  aantal: number
}

/** "G2 H1" of "g 2, h" naar regels. Een letter zonder aantal telt als één fles. */
export function leesLetters(invoer: string): { regels: LetterRegel[]; fout: string | null } {
  const schoon = invoer.toUpperCase().replace(/([A-Z])\s+(\d)/g, '$1$2')
  const stukken = schoon.split(/[\s,;+]+/).filter(Boolean)
  const totaal = new Map<string, number>()
  for (const stuk of stukken) {
    const m = /^([A-Z])(\d{1,2})?$/.exec(stuk)
    if (!m) return { regels: [], fout: `"${stuk}" begrijp ik niet. Schrijf een letter en een aantal, zoals G2.` }
    const aantal = m[2] ? Number(m[2]) : 1
    if (aantal < 1) return { regels: [], fout: `Het aantal bij ${m[1]} moet minstens 1 zijn.` }
    totaal.set(m[1], (totaal.get(m[1]) ?? 0) + aantal)
  }
  return { regels: [...totaal].map(([letter, aantal]) => ({ letter, aantal })), fout: null }
}
