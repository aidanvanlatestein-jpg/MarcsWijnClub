// De staat van het klikbare prototype. Alles staat in het geheugen van de browser;
// er gaat niets naar de API. De regels volgen het pilotplan en de bouwspecificatie:
// bestellen is bindend en kost niets, betalen kan pas als de lijst sluit, in één
// betaling per lid per lijst, binnen 48 uur.
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { Bestelling, Bieding, Eerder, Lijst, Oordeel, Regel, Wijn } from './types'
import { dagEnTijd, euro } from './opmaak'
import {
  voorbeeldBestellingen, voorbeeldBiedingen, voorbeeldEerder, voorbeeldLid, voorbeeldLijst, voorbeeldOordelen,
} from './voorbeeld'

/** Het lid dat in het prototype is ingelogd. In de echte app komt het lid uit het token. */
export const LID = voorbeeldLid.lidId

const OPSLAG = 'wijnclub-voorbeeld-1'
const UUR = 3_600_000
const BETAALTERMIJN = 48 * UUR
const VERLENGING = 2 * 60_000

export interface LijstStaat extends Lijst {
  status: 'open' | 'gesloten'
  geslotenOp?: string
}

export interface BiedingStaat extends Bieding {
  /** Het laatste bod van het ingelogde lid. */
  mijnBod?: number
}

export interface Betaalpoging {
  bestellingIds: string[]
  bedrag: number
  gelukt: boolean
  op: string
}

export interface Melding {
  kop: string
  tekst: string
}

export interface Staat {
  versie: 1
  ingelogd: boolean
  tipGezien: boolean
  lijst: LijstStaat
  biedingen: BiedingStaat[]
  bestellingen: Bestelling[]
  mandje: Record<string, number>
  /** Het afhaalpunt van voorkeur: het laatst gekozen afhaalpunt. */
  levering: string | null
  oordelen: Record<string, Oordeel>
  eerder: Eerder[]
  volgendeBon: number
  betaling: Betaalpoging | null
  melding: Melding | null
}

export type Actie =
  | { type: 'inloggen' }
  | { type: 'tipGezien' }
  | { type: 'mandje'; wijnId: string; aantal: number }
  | { type: 'pasMandjeAan' }
  | { type: 'levering'; afhaalpuntId: string }
  | { type: 'bestel'; lidId: string; regels: { wijnId: string; aantal: number }[]; levering: string; door: 'lid' | 'beheer'; nu: string }
  | { type: 'sluitLijst'; nu: string }
  | { type: 'betaal'; bestellingIds: string[]; gelukt: boolean; nu: string }
  | { type: 'bied'; wijnId: string; bedrag: number; nu: string }
  | { type: 'anderBiedt'; wijnId: string }
  | { type: 'sluitBieding'; wijnId: string; nu: string }
  | { type: 'leveringBieding'; bestellingId: string; levering: string }
  | { type: 'oordeel'; wijnId: string; oordeel: Oordeel | null }
  | { type: 'anderKooptOp'; wijnId: string; nu: string }
  | { type: 'afgeleverd'; bestellingId: string; ja: boolean; nu: string }
  | { type: 'nieuweWijn'; wijn: Wijn }
  | { type: 'nieuweBieding'; bieding: BiedingStaat }
  | { type: 'wijzigLijst'; titel?: string; inleiding?: string; openTot?: string }
  | { type: 'melding'; melding: Melding | null }
  | { type: 'opnieuw'; staat: Staat }

function iso(moment: Date): string {
  return moment.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function plus(utc: string, ms: number): string {
  return iso(new Date(new Date(utc).getTime() + ms))
}

/** De eerstvolgende zondag die minstens twee dagen weg is, om 19:00 UTC. Zo blijft het voorbeeld actueel. */
function volgendeZondag(nu: Date): string {
  const d = new Date(nu)
  d.setUTCHours(19, 0, 0, 0)
  let dagen = (7 - d.getUTCDay()) % 7
  if (dagen < 2) dagen += 7
  d.setUTCDate(d.getUTCDate() + dagen)
  return iso(d)
}

export function bonNummer(n: number): string {
  return String(n).padStart(4, '0')
}

export function beginStaat(): Staat {
  const nu = iso(new Date())
  const openTot = volgendeZondag(new Date())
  return {
    versie: 1,
    ingelogd: false,
    tipGezien: false,
    lijst: {
      ...voorbeeldLijst,
      afhaalpunten: voorbeeldLijst.afhaalpunten.map((a) => ({ ...a })),
      wijnen: voorbeeldLijst.wijnen.map((w) => ({ ...w })),
      openVan: plus(nu, -72 * UUR),
      openTot,
      status: 'open',
    },
    biedingen: voorbeeldBiedingen.map((b) => ({ ...b, eindtijd: plus(openTot, UUR) })),
    bestellingen: voorbeeldBestellingen.map((b, i) => ({
      ...b,
      regels: b.regels.map((r) => ({ ...r })),
      aangemaakt: plus(nu, -(30 - i * 6) * UUR),
    })),
    mandje: {},
    levering: null,
    oordelen: { ...voorbeeldOordelen },
    eerder: voorbeeldEerder.map((e) => ({ ...e })),
    volgendeBon: 147,
    betaling: null,
    melding: null,
  }
}

// ---- Afgeleide gegevens ----

export function zoekWijn(s: Staat, wijnId: string): Wijn | undefined {
  return s.lijst.wijnen.find((w) => w.wijnId === wijnId)
}

export function zoekBieding(s: Staat, wijnId: string): BiedingStaat | undefined {
  return s.biedingen.find((b) => b.wijnId === wijnId)
}

export function gesorteerd(wijnen: Wijn[]): Wijn[] {
  return [...wijnen].sort((a, b) => a.volgorde - b.volgorde)
}

export function mandjeRegels(s: Staat): { wijn: Wijn; aantal: number }[] {
  return gesorteerd(s.lijst.wijnen)
    .filter((w) => (s.mandje[w.wijnId] ?? 0) > 0)
    .map((w) => ({ wijn: w, aantal: s.mandje[w.wijnId] }))
}

/** Wijnen in het mandje waarvan er minder over zijn dan gekozen. */
export function tekorten(s: Staat): Wijn[] {
  return mandjeRegels(s).filter(({ wijn, aantal }) => aantal > wijn.voorraad).map(({ wijn }) => wijn)
}

/** De bestellingen van het ingelogde lid op de lopende lijst, ook wat Marc namens het lid invoerde. */
export function mijnLijstBestellingen(s: Staat): Bestelling[] {
  return s.bestellingen.filter((b) => b.lidId === LID && b.lijstId === s.lijst.lijstId && b.soort !== 'bieding')
}

/** Eén betaling voor alle open bestellingen van het lid op de lijst. */
export function betaalverzoek(s: Staat): { bestellingIds: string[]; bedrag: number } {
  const open = mijnLijstBestellingen(s).filter((b) => b.status === 'open')
  return { bestellingIds: open.map((b) => b.bestellingId), bedrag: open.reduce((som, b) => som + b.totaal, 0) }
}

export function betaalVoor(s: Staat, b: Bestelling): string {
  return b.soort === 'bieding' ? plus(b.aangemaakt, BETAALTERMIJN) : plus(s.lijst.openTot, BETAALTERMIJN)
}

export function volgendeLetter(s: Staat): string {
  const hoogste = s.lijst.wijnen.reduce((max, w) => Math.max(max, w.letter.charCodeAt(0)), 'A'.charCodeAt(0) - 1)
  return String.fromCharCode(Math.min(hoogste + 1, 'Z'.charCodeAt(0)))
}

export function afhaalpunt(s: Staat, id: string | null) {
  return s.lijst.afhaalpunten.find((a) => a.afhaalpuntId === id)
}

function eersteWoord(naam: string): string {
  return naam.split(' ')[0]
}

// ---- Wijzigingen ----

function nieuweBestelling(s: Staat, b: Omit<Bestelling, 'bestellingId' | 'bon'>): [Bestelling, Staat] {
  const bon = bonNummer(s.volgendeBon)
  const bestelling = { ...b, bestellingId: `b-${bon}`, bon }
  return [bestelling, { ...s, bestellingen: [...s.bestellingen, bestelling], volgendeBon: s.volgendeBon + 1 }]
}

function bestel(s: Staat, a: Extract<Actie, { type: 'bestel' }>): Staat {
  if (s.lijst.status !== 'open') return s
  if (!s.lijst.afhaalpunten.some((p) => p.afhaalpuntId === a.levering)) return s
  const regels: Regel[] = []
  for (const r of a.regels) {
    const w = zoekWijn(s, r.wijnId)
    // Alles of niets, zoals de transactie in DynamoDB.
    if (!w || !Number.isInteger(r.aantal) || r.aantal < 1 || r.aantal > w.voorraad) return s
    regels.push({ wijnId: w.wijnId, letter: w.letter, naam: w.naam, jaargang: w.jaargang, aantal: r.aantal, prijs: w.prijs })
  }
  if (regels.length === 0) return s
  const [, na] = nieuweBestelling(s, {
    lidId: a.lidId,
    soort: a.door === 'lid' ? 'lijst' : 'namens',
    lijstId: s.lijst.lijstId,
    regels,
    totaal: regels.reduce((som, r) => som + r.aantal * r.prijs, 0),
    status: 'open',
    levering: a.levering,
    ingevoerdDoor: a.door,
    aangemaakt: a.nu,
  })
  const wijnen = s.lijst.wijnen.map((w) => {
    const r = regels.find((x) => x.wijnId === w.wijnId)
    return r ? { ...w, voorraad: w.voorraad - r.aantal } : w
  })
  return {
    ...na,
    lijst: { ...s.lijst, wijnen },
    mandje: a.door === 'lid' ? {} : s.mandje,
    levering: a.door === 'lid' ? a.levering : s.levering,
  }
}

function reducer(s: Staat, a: Actie): Staat {
  switch (a.type) {
    case 'inloggen':
      return { ...s, ingelogd: true }
    case 'tipGezien':
      return { ...s, tipGezien: true }
    case 'mandje': {
      const mandje = { ...s.mandje }
      if (a.aantal > 0) mandje[a.wijnId] = a.aantal
      else delete mandje[a.wijnId]
      return { ...s, mandje }
    }
    case 'pasMandjeAan': {
      const mandje: Record<string, number> = {}
      for (const [wijnId, aantal] of Object.entries(s.mandje)) {
        const over = Math.min(aantal, zoekWijn(s, wijnId)?.voorraad ?? 0)
        if (over > 0) mandje[wijnId] = over
      }
      return { ...s, mandje }
    }
    case 'levering':
      return { ...s, levering: a.afhaalpuntId }
    case 'bestel':
      return bestel(s, a)
    case 'sluitLijst': {
      if (s.lijst.status !== 'open') return s
      const gesloten: Staat = { ...s, lijst: { ...s.lijst, status: 'gesloten', geslotenOp: a.nu }, mandje: {} }
      const { bedrag } = betaalverzoek(gesloten)
      const melding = bedrag > 0
        ? { kop: 'De lijst is gesloten', tekst: `Je kunt nu betalen: ${euro(bedrag)}, tot ${dagEnTijd(plus(s.lijst.openTot, BETAALTERMIJN))}.` }
        : { kop: 'De lijst is gesloten', tekst: 'Zodra er een nieuwe lijst is, krijg je een melding.' }
      return { ...gesloten, melding }
    }
    case 'betaal': {
      const ids = new Set(a.bestellingIds)
      const bedrag = s.bestellingen.filter((b) => ids.has(b.bestellingId)).reduce((som, b) => som + b.totaal, 0)
      const betaling = { bestellingIds: a.bestellingIds, bedrag, gelukt: a.gelukt, op: a.nu }
      if (!a.gelukt) return { ...s, betaling }
      return {
        ...s,
        betaling,
        // Alleen open bestellingen gaan naar betaald; een tweede melding verandert niets.
        bestellingen: s.bestellingen.map((b) =>
          ids.has(b.bestellingId) && b.status === 'open' ? { ...b, status: 'betaald', betaaldOp: a.nu } : b,
        ),
      }
    }
    case 'bied':
      return {
        ...s,
        biedingen: s.biedingen.map((b) => {
          if (b.wijnId !== a.wijnId || b.biedingStatus !== 'open' || a.nu >= b.eindtijd) return b
          if (!Number.isInteger(a.bedrag) || a.bedrag < b.minimaalVolgendBod) return b
          const rest = new Date(b.eindtijd).getTime() - new Date(a.nu).getTime()
          return {
            ...b,
            hoogsteBod: a.bedrag,
            mijnBod: a.bedrag,
            mijnBodIsHoogste: true,
            minimaalVolgendBod: a.bedrag + b.minimaleVerhoging,
            aantalBiedingen: (b.aantalBiedingen ?? 0) + 1,
            // Een bod in de laatste twee minuten verlengt de eindtijd.
            eindtijd: rest <= VERLENGING ? plus(a.nu, VERLENGING) : b.eindtijd,
          }
        }),
      }
    case 'anderBiedt': {
      let melding = s.melding
      const biedingen = s.biedingen.map((b) => {
        if (b.wijnId !== a.wijnId || b.biedingStatus !== 'open') return b
        const bod = b.minimaalVolgendBod
        if (b.mijnBodIsHoogste) {
          melding = {
            kop: `Je bent overboden op de ${eersteWoord(b.naam)}`,
            tekst: `Hoogste bod nu ${euro(bod, { heel: true })}. Sluit ${dagEnTijd(b.eindtijd)}.`,
          }
        }
        return {
          ...b,
          hoogsteBod: bod,
          minimaalVolgendBod: bod + b.minimaleVerhoging,
          aantalBiedingen: (b.aantalBiedingen ?? 0) + 1,
          mijnBodIsHoogste: false,
        }
      })
      return { ...s, biedingen, melding }
    }
    case 'sluitBieding': {
      const b = zoekBieding(s, a.wijnId)
      if (!b || b.biedingStatus !== 'open') return s
      const biedingen = s.biedingen.map((x) =>
        x.wijnId === b.wijnId ? { ...x, biedingStatus: 'gesloten' as const, eindtijd: a.nu < x.eindtijd ? a.nu : x.eindtijd } : x,
      )
      if (!b.mijnBodIsHoogste || !b.hoogsteBod) {
        const melding = b.mijnBod ? { kop: 'De bieding is gesloten', tekst: `Een ander lid won de ${b.naam}.` } : s.melding
        return { ...s, biedingen, melding }
      }
      const [, na] = nieuweBestelling(s, {
        lidId: LID,
        soort: 'bieding',
        regels: [{ wijnId: b.wijnId, letter: '', naam: b.naam, jaargang: b.jaargang, aantal: 1, prijs: b.hoogsteBod }],
        totaal: b.hoogsteBod,
        status: 'open',
        levering: null,
        ingevoerdDoor: 'lid',
        aangemaakt: a.nu,
      })
      return {
        ...na,
        biedingen,
        melding: { kop: `Je hebt de ${eersteWoord(b.naam)} gewonnen`, tekst: `Voor ${euro(b.hoogsteBod, { heel: true })}. Betaal binnen 48 uur.` },
      }
    }
    case 'leveringBieding':
      return {
        ...s,
        bestellingen: s.bestellingen.map((b) =>
          b.bestellingId === a.bestellingId && b.soort === 'bieding' ? { ...b, levering: a.levering } : b,
        ),
      }
    case 'oordeel': {
      const oordelen = { ...s.oordelen }
      if (a.oordeel) oordelen[a.wijnId] = a.oordeel
      else delete oordelen[a.wijnId]
      return { ...s, oordelen }
    }
    case 'anderKooptOp': {
      const w = zoekWijn(s, a.wijnId)
      if (!w || w.voorraad <= 0 || s.lijst.status !== 'open') return s
      // Een ander lid bestelt de laatste flessen. Het mandje blijft staan, zodat te zien is wat er dan gebeurt.
      const mandje = s.mandje
      const na = bestel({ ...s, mandje: {} }, {
        type: 'bestel', lidId: 'lid-3', regels: [{ wijnId: w.wijnId, aantal: w.voorraad }],
        levering: s.lijst.afhaalpunten[0].afhaalpuntId, door: 'lid', nu: a.nu,
      })
      return { ...na, mandje, levering: s.levering }
    }
    case 'afgeleverd':
      return {
        ...s,
        bestellingen: s.bestellingen.map((b) =>
          b.bestellingId === a.bestellingId ? { ...b, afgeleverdOp: a.ja ? a.nu : undefined } : b,
        ),
      }
    case 'nieuweWijn':
      return { ...s, lijst: { ...s.lijst, wijnen: [...s.lijst.wijnen, a.wijn] } }
    case 'nieuweBieding':
      return { ...s, biedingen: [...s.biedingen, a.bieding] }
    case 'wijzigLijst':
      return {
        ...s,
        lijst: {
          ...s.lijst,
          ...(a.titel !== undefined && { titel: a.titel }),
          ...(a.inleiding !== undefined && { inleiding: a.inleiding }),
          ...(a.openTot !== undefined && { openTot: a.openTot }),
        },
      }
    case 'melding':
      return { ...s, melding: a.melding }
    case 'opnieuw':
      return a.staat
  }
}

// ---- Bewaren in de browser ----
// Alleen voor het gemak: na herladen staat het voorbeeld er nog. Lukt het niet, dan begint het opnieuw.

function zonderTijdelijkeFoto<T extends { foto?: string }>(item: T): T {
  return item.foto?.startsWith('blob:') ? { ...item, foto: undefined } : item
}

function laad(): Staat {
  try {
    const ruw = window.sessionStorage.getItem(OPSLAG)
    if (ruw) {
      const s = JSON.parse(ruw) as Staat
      if (s && s.versie === 1 && s.lijst && Array.isArray(s.bestellingen)) {
        return {
          ...s,
          melding: null,
          lijst: { ...s.lijst, wijnen: s.lijst.wijnen.map(zonderTijdelijkeFoto) },
          biedingen: s.biedingen.map(zonderTijdelijkeFoto),
        }
      }
    }
  } catch {
    // Geen opslag beschikbaar of onleesbaar: begin opnieuw.
  }
  return beginStaat()
}

type Waarde = readonly [Staat, (actie: Actie) => void]

const StaatContext = createContext<Waarde | null>(null)

export function StaatProvider({ children }: { children: ReactNode }) {
  const [staat, dispatch] = useReducer(reducer, undefined, laad)
  useEffect(() => {
    try {
      window.sessionStorage.setItem(OPSLAG, JSON.stringify({ ...staat, melding: null }))
    } catch {
      // Niet erg: dan begint het voorbeeld na herladen opnieuw.
    }
  }, [staat])
  return <StaatContext.Provider value={[staat, dispatch]}>{children}</StaatContext.Provider>
}

export function useStaat(): Waarde {
  const waarde = useContext(StaatContext)
  if (!waarde) throw new Error('useStaat buiten StaatProvider')
  return waarde
}
