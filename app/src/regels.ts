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

/** "11,50", "11.5" of "€ 11" naar hele centen. Geen geldig bedrag: null. */
export function leesEuro(invoer: string): number | null {
  const m = /^\s*€?\s*(\d{1,5})(?:[.,](\d{1,2}))?\s*$/.exec(invoer)
  return m ? centen(m[1], m[2]) : null
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
