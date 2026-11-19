// De staat van het klikbare prototype. Alles staat in het geheugen van de browser;
// er gaat niets naar de API. De regels volgen het pilotplan en de bouwspecificatie:
// bestellen is bindend en kost niets, betalen kan pas als de lijst sluit, in één
// betaling per lid per lijst, binnen 48 uur.
//
// Design-v3 maakt van elke lijst "een avond bij Marc": aangekondigd, live, gesloten. Een wijn
// staat eerst klaar en verschijnt pas in de feed als Marc hem op tafel zet. De bijzondere fles
// gaat aan het eind van de avond onder de hamer.
import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import type { Bestelling, Bieding, Eerder, Fase, FeedItem, Lijst, LogItem, Oordeel, Regel, Wijn } from './types'
import { dagEnTijd, euro, tijd } from './opmaak'
import {
  voorbeeldBerichten, voorbeeldBestellingen, voorbeeldBiedingen, voorbeeldEerder, voorbeeldLid, voorbeeldLijst, voorbeeldOordelen,
} from './voorbeeld'

/** Het lid dat in het prototype is ingelogd. In de echte app komt het lid uit het token. */
export const LID = voorbeeldLid.lidId

const OPSLAG = 'wijnclub-voorbeeld-3'
const MINUUT = 60_000
const UUR = 60 * MINUUT
const BETAALTERMIJN = 48 * UUR
const VERLENGING = 2 * MINUUT
/** De veiling begint een half uur na het begin van de avond, de hamer valt een uur later. */
const VEILING_NA_BEGIN = 30 * MINUUT
const VEILING_DUUR = 60 * MINUUT
/** Een bod is hoogstens drie keer het minimum, zoals in functions/wijnclub/domein/bieding.py. */
export const HOOGSTE_FACTOR = 3
/** De laatste twee minuten van een veiling: "eenmaal, andermaal". */
export const LAATSTE_MINUTEN = VERLENGING

export interface LijstStaat extends Lijst {
  /** Open: er kan besteld worden zodra een wijn op tafel staat. Gesloten: betalen kan. */
  status: 'open' | 'gesloten'
  geslotenOp?: string
  fase: Fase
  /** Begin van de avond, zoals 19:30. */
  begin: string
  /** Wanneer de veiling begint als Marc niet eerder op NU STARTEN tikt. */
  veilingBegin: string
  aankondigingOp: string
}

export interface BiedingStaat extends Bieding {
  /** Het laatste bod van het ingelogde lid. */
  mijnBod?: number
  /** Wanneer de zaal openging. Leeg: de veiling is nog niet begonnen. */
  geopend?: string
  /** Biedingen en berichten van Marc, oudste eerst. */
  biedlog: LogItem[]
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

/**
 * Punten waar design-v3 bewust afwijkt van het pilotplan ("Open beslissingen"). Ze staan aan,
 * maar zijn uit te zetten in de voorbeeldbalk zodat Aidan en Marc beide kunnen zien.
 */
export interface Instellingen {
  /** Bieders als "Bieder 7". Uit: alleen bedragen en tijden. */
  bijnamen: boolean
  /** Live-stip, NET OP TAFEL en de klok in de laatste twee minuten. Uit: zo rustig als het plan. */
  levendig: boolean
}

export interface Staat {
  versie: 3
  ingelogd: boolean
  tipGezien: boolean
  lijst: LijstStaat
  biedingen: BiedingStaat[]
  bestellingen: Bestelling[]
  feed: FeedItem[]
  mandje: Record<string, number>
  /** Het afhaalpunt van voorkeur: het laatst gekozen afhaalpunt. */
  levering: string | null
  oordelen: Record<string, Oordeel>
  eerder: Eerder[]
  volgendeBon: number
  volgendId: number
  betaling: Betaalpoging | null
  melding: Melding | null
  herinnering: boolean
  /** Marc typt in het beheer: de feed toont "Marc typt…". */
  marcTypt: boolean
  /** Uit: de live-balk zegt "VERBINDING HERSTELLEN…". */
  verbinding: boolean
  instellingen: Instellingen
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
  | { type: 'anderBiedt'; wijnId: string; nu: string }
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
  | { type: 'beginAvond'; nu: string }
  | { type: 'springNaarAvond'; nu: string }
  | { type: 'zetOpTafel'; wijnId: string; nu: string }
  | { type: 'bericht'; tekst: string; nu: string }
  | { type: 'marcTypt'; ja: boolean }
  | { type: 'openVeiling'; wijnId: string; nu: string }
  | { type: 'laatsteMinuten'; wijnId: string; nu: string }
  | { type: 'herinner' }
  | { type: 'verbinding'; ja: boolean }
  | { type: 'instelling'; naam: keyof Instellingen; aan: boolean }
  | { type: 'tik'; nu: string }

function iso(moment: Date): string {
  return moment.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function plus(utc: string, ms: number): string {
  return iso(new Date(new Date(utc).getTime() + ms))
}

/** Het eerstvolgende hele of halve uur dat minstens een kwartier weg is. Zo blijft het voorbeeld actueel. */
function volgendHalfUur(nu: Date): string {
  const d = new Date(nu.getTime() + 15 * MINUUT)
  d.setUTCSeconds(0, 0)
  const m = d.getUTCMinutes()
  if (m > 30) d.setUTCHours(d.getUTCHours() + 1, 0)
  else if (m > 0) d.setUTCMinutes(30)
  return iso(d)
}

function heleMinuut(utc: string): string {
  const d = new Date(utc)
  d.setUTCSeconds(0, 0)
  return iso(d)
}

export function bonNummer(n: number): string {
  return String(n).padStart(4, '0')
}

export function beginStaat(): Staat {
  const nu = iso(new Date())
  const begin = volgendHalfUur(new Date())
  return {
    versie: 3,
    ingelogd: false,
    tipGezien: false,
    lijst: {
      ...voorbeeldLijst,
      afhaalpunten: voorbeeldLijst.afhaalpunten.map((a) => ({ ...a })),
      wijnen: voorbeeldLijst.wijnen.map((w) => ({ ...w })),
      openVan: begin,
      openTot: plus(begin, VEILING_NA_BEGIN + VEILING_DUUR + 30 * MINUUT),
      status: 'open',
      fase: 'aangekondigd',
      begin,
      veilingBegin: plus(begin, VEILING_NA_BEGIN),
      aankondigingOp: heleMinuut(plus(nu, -5 * UUR)),
    },
    biedingen: voorbeeldBiedingen.map((b) => ({ ...b, eindtijd: plus(begin, VEILING_NA_BEGIN + VEILING_DUUR), biedlog: [] })),
    bestellingen: [],
    feed: [],
    mandje: {},
    levering: null,
    oordelen: { ...voorbeeldOordelen },
    eerder: voorbeeldEerder.map((e) => ({ ...e })),
    volgendeBon: 144,
    volgendId: 1,
    betaling: null,
    melding: null,
    herinnering: false,
    marcTypt: false,
    verbinding: true,
    instellingen: { bijnamen: true, levendig: true },
  }
}

// ---- Afgeleide gegevens ----

export function zoekWijn(s: Staat, wijnId: string): Wijn | undefined {
  return s.lijst.wijnen.find((w) => w.wijnId === wijnId)
}

export function zoekBieding(s: Staat, wijnId: string): BiedingStaat | undefined {
  return s.biedingen.find((b) => b.wijnId === wijnId)
}

/** De veiling van deze avond: de eerste bieding die nog open is, anders de laatste. */
export function veilingVanAvond(s: Staat): BiedingStaat | undefined {
  return s.biedingen.find((b) => b.biedingStatus === 'open') ?? s.biedingen.at(-1)
}

export function gesorteerd(wijnen: Wijn[]): Wijn[] {
  return [...wijnen].sort((a, b) => a.volgorde - b.volgorde)
}

/** Wijnen die Marc op tafel zette, in de volgorde waarin dat gebeurde. */
export function opTafel(s: Staat): Wijn[] {
  return s.lijst.wijnen
    .filter((w) => w.opTafelSinds)
    .sort((a, b) => (a.opTafelSinds! < b.opTafelSinds! ? -1 : 1))
}

/** Wijnen die klaarstaan maar nog niet op tafel liggen, in Marcs volgorde. */
export function klaar(s: Staat): Wijn[] {
  return gesorteerd(s.lijst.wijnen).filter((w) => !w.opTafelSinds)
}

/** De wijn die het laatst op tafel kwam. */
export function nieuwste(s: Staat): Wijn | undefined {
  return opTafel(s).at(-1)
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
  return b.soort === 'bieding' ? plus(b.aangemaakt, BETAALTERMIJN) : plus(s.lijst.geslotenOp ?? s.lijst.openTot, BETAALTERMIJN)
}

export function volgendeLetter(s: Staat): string {
  const hoogste = s.lijst.wijnen.reduce((max, w) => Math.max(max, w.letter.charCodeAt(0)), 'A'.charCodeAt(0) - 1)
  return String.fromCharCode(Math.min(hoogste + 1, 'Z'.charCodeAt(0)))
}

export function afhaalpunt(s: Staat, id: string | null) {
  return s.lijst.afhaalpunten.find((a) => a.afhaalpuntId === id)
}

/** De tellers van de avond: flessen, leden en biedingen (terugblik en beheer). */
export function tellers(s: Staat) {
  const bestellingen = s.bestellingen.filter((b) => b.lijstId === s.lijst.lijstId && b.status !== 'verlopen')
  const flessen = bestellingen.reduce((som, b) => som + b.regels.reduce((x, r) => x + r.aantal, 0), 0)
  const leden = new Set(bestellingen.map((b) => b.lidId)).size
  const betaald = bestellingen.filter((b) => b.status === 'betaald').reduce((som, b) => som + b.totaal, 0)
  const biedingen = s.biedingen.reduce((som, b) => som + (b.aantalBiedingen ?? 0), 0)
  return { flessen, leden, bestellingen: bestellingen.length, betaald, biedingen }
}

/** De bestelling die ontstaat als het lid een bieding wint. */
export function mijnBiedingBestelling(s: Staat, wijnId: string): Bestelling | undefined {
  return s.bestellingen.find((x) => x.soort === 'bieding' && x.lidId === LID && x.regels[0]?.wijnId === wijnId)
}

export function eersteWoord(naam: string): string {
  return naam.split(' ')[0]
}

// ---- Wijzigingen ----

type ZonderId<T> = T extends unknown ? Omit<T, 'id'> : never

function metFeed(s: Staat, item: ZonderId<FeedItem>): Staat {
  return { ...s, feed: [...s.feed, { ...item, id: `f-${s.volgendId}` } as FeedItem], volgendId: s.volgendId + 1 }
}

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
    // Alles of niets, zoals de transactie in DynamoDB. Een wijn die nog klaarstaat, is niet te koop.
    if (!w || !w.opTafelSinds || !Number.isInteger(r.aantal) || r.aantal < 1 || r.aantal > w.voorraad) return s
    regels.push({ wijnId: w.wijnId, letter: w.letter, naam: w.naam, jaargang: w.jaargang, aantal: r.aantal, prijs: w.prijs })
  }
  if (regels.length === 0) return s
  let [, na] = nieuweBestelling(s, {
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
    if (!r) return w
    const voorraad = w.voorraad - r.aantal
    return { ...w, voorraad, opSinds: voorraad === 0 ? a.nu : w.opSinds }
  })
  na = { ...na, lijst: { ...s.lijst, wijnen } }
  // Gebeurtenissen in de feed, zonder namen: het plan zegt dat leden niet zien wie iets kocht.
  const wie = a.lidId === LID ? 'JE NAM' : 'EEN LID NAM'
  for (const r of regels) na = metFeed(na, { soort: 'gebeurtenis', op: a.nu, tekst: `${wie} ${r.aantal} × WIJN ${r.letter}` })
  for (const w of wijnen) {
    if (w.voorraad === 0 && zoekWijn(s, w.wijnId)!.voorraad > 0) na = metFeed(na, { soort: 'gebeurtenis', op: a.nu, tekst: `WIJN ${w.letter} IS OP` })
  }
  return {
    ...na,
    mandje: a.door === 'lid' && a.lidId === LID ? {} : s.mandje,
    levering: a.door === 'lid' && a.lidId === LID ? a.levering : s.levering,
  }
}

function zetOpTafel(s: Staat, wijnId: string, nu: string): Staat {
  const w = zoekWijn(s, wijnId)
  if (!w || w.opTafelSinds || s.lijst.fase !== 'live') return s
  const na = { ...s, lijst: { ...s.lijst, wijnen: s.lijst.wijnen.map((x) => (x.wijnId === wijnId ? { ...x, opTafelSinds: nu } : x)) } }
  return metFeed(na, { soort: 'wijn', op: nu, wijnId })
}

function openVeiling(s: Staat, wijnId: string, nu: string): Staat {
  const b = zoekBieding(s, wijnId)
  if (!b || b.geopend || b.biedingStatus !== 'open') return s
  const eindtijd = b.eindtijd > nu ? b.eindtijd : plus(nu, VEILING_DUUR)
  return {
    ...s,
    biedingen: s.biedingen.map((x) =>
      x.wijnId === wijnId ? { ...x, geopend: nu, eindtijd, biedlog: [...x.biedlog, { soort: 'open', op: nu, bedrag: x.startbod }] } : x,
    ),
  }
}

/** Bieder 7 en bieder 3 wisselen elkaar af; zo staat het in het ontwerp. */
function volgendeBieder(b: BiedingStaat): number {
  const laatste = [...b.biedlog].reverse().find((l) => l.soort === 'bod' && l.bieder !== 'jij')
  return laatste && laatste.soort === 'bod' && laatste.bieder === 7 ? 3 : 7
}

function anderBod(b: BiedingStaat, nu: string): BiedingStaat {
  const bod = b.minimaalVolgendBod
  const rest = new Date(b.eindtijd).getTime() - new Date(nu).getTime()
  return {
    ...b,
    hoogsteBod: bod,
    minimaalVolgendBod: bod + b.minimaleVerhoging,
    aantalBiedingen: (b.aantalBiedingen ?? 0) + 1,
    mijnBodIsHoogste: false,
    eindtijd: rest <= VERLENGING ? plus(nu, VERLENGING) : b.eindtijd,
    biedlog: [...b.biedlog, { soort: 'bod', op: nu, bedrag: bod, bieder: volgendeBieder(b) }],
  }
}

function sluitBieding(s: Staat, wijnId: string, nu: string): Staat {
  const b = zoekBieding(s, wijnId)
  if (!b || b.biedingStatus !== 'open') return s
  const biedingen = s.biedingen.map((x) =>
    x.wijnId === b.wijnId ? { ...x, biedingStatus: 'gesloten' as const, eindtijd: nu < x.eindtijd ? nu : x.eindtijd } : x,
  )
  let na: Staat = { ...s, biedingen }
  if (b.hoogsteBod) {
    na = metFeed(na, { soort: 'gebeurtenis', op: nu, tekst: `DE ${eersteWoord(b.naam).toUpperCase()} GING VOOR ${euro(b.hoogsteBod, { heel: true })}` })
  }
  if (!b.mijnBodIsHoogste || !b.hoogsteBod) {
    const melding = b.mijnBod ? { kop: 'De veiling is afgelopen', tekst: `De ${b.naam} ging voor ${euro(b.hoogsteBod ?? 0, { heel: true })}.` } : s.melding
    return { ...na, melding }
  }
  const [, metBestelling] = nieuweBestelling(na, {
    lidId: LID,
    soort: 'bieding',
    regels: [{ wijnId: b.wijnId, letter: '', naam: b.naam, jaargang: b.jaargang, aantal: 1, prijs: b.hoogsteBod }],
    totaal: b.hoogsteBod,
    status: 'open',
    levering: null,
    ingevoerdDoor: 'lid',
    aangemaakt: nu,
  })
  return {
    ...metBestelling,
    melding: { kop: `Je hebt de ${eersteWoord(b.naam)} gewonnen`, tekst: `Voor ${euro(b.hoogsteBod, { heel: true })}. Betaal binnen 48 uur.` },
  }
}

/** Een avond die al 22 minuten loopt, zoals op scherm 03 en 15. */
function lopendeAvond(s: Staat, nu: string): Staat {
  const begin = heleMinuut(plus(nu, -22 * MINUUT))
  const op = (min: number) => plus(begin, min * MINUUT)
  const basis = beginStaat()
  let na: Staat = {
    ...basis,
    ingelogd: s.ingelogd,
    tipGezien: s.tipGezien,
    instellingen: s.instellingen,
    oordelen: s.oordelen,
    herinnering: s.herinnering,
    lijst: {
      ...basis.lijst,
      fase: 'live',
      begin,
      openVan: begin,
      openTot: plus(begin, VEILING_NA_BEGIN + VEILING_DUUR + 30 * MINUUT),
      veilingBegin: plus(begin, VEILING_NA_BEGIN),
      aankondigingOp: heleMinuut(plus(begin, -5 * UUR)),
    },
    biedingen: basis.biedingen.map((b) => ({ ...b, eindtijd: plus(begin, VEILING_NA_BEGIN + VEILING_DUUR) })),
  }
  na = metFeed(na, { soort: 'bericht', op: op(0), tekst: voorbeeldBerichten.begin })
  const bestelVoorbeeld = (i: number) => {
    const v = voorbeeldBestellingen[i]
    na = bestel(na, { type: 'bestel', lidId: v.lidId, door: v.door, levering: v.levering, regels: [{ wijnId: v.wijnId, aantal: v.aantal }], nu: op(v.minuut) })
  }
  // In de volgorde van de tijd, zodat de feed klopt.
  na = zetOpTafel(na, 'wijn-f', op(1))
  bestelVoorbeeld(0)
  na = zetOpTafel(na, 'wijn-h', op(8))
  bestelVoorbeeld(1)
  bestelVoorbeeld(2)
  na = metFeed(na, { soort: 'bericht', op: op(21), tekst: voorbeeldBerichten.laatste })
  na = zetOpTafel(na, 'wijn-i', op(21))
  bestelVoorbeeld(3)
  return na
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
      let gesloten: Staat = { ...s, lijst: { ...s.lijst, status: 'gesloten', fase: 'gesloten', geslotenOp: a.nu }, mandje: {}, marcTypt: false }
      gesloten = metFeed(gesloten, { soort: 'gebeurtenis', op: a.nu, tekst: 'MARC SLOOT DE AVOND' })
      const { bedrag } = betaalverzoek(gesloten)
      const melding = bedrag > 0
        ? { kop: 'De avond is gesloten', tekst: `Je kunt nu betalen: ${euro(bedrag)}, tot ${dagEnTijd(plus(a.nu, BETAALTERMIJN))}.` }
        : { kop: 'De avond is gesloten', tekst: 'Zodra er een nieuwe avond is, krijg je een melding.' }
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
          if (b.wijnId !== a.wijnId || b.biedingStatus !== 'open' || !b.geopend || a.nu >= b.eindtijd) return b
          // Je eigen hoogste bod overbieden kan niet, en een bod is hoogstens drie keer het minimum.
          if (b.mijnBodIsHoogste) return b
          if (!Number.isInteger(a.bedrag) || a.bedrag < b.minimaalVolgendBod) return b
          if (a.bedrag > b.minimaalVolgendBod * HOOGSTE_FACTOR) return b
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
            biedlog: [...b.biedlog, { soort: 'bod', op: a.nu, bedrag: a.bedrag, bieder: 'jij' }],
          }
        }),
      }
    case 'anderBiedt': {
      let na = openVeiling(s, a.wijnId, a.nu)
      let melding = na.melding
      const biedingen = na.biedingen.map((b) => {
        if (b.wijnId !== a.wijnId || b.biedingStatus !== 'open') return b
        const nieuw = anderBod(b, a.nu)
        if (b.mijnBodIsHoogste) {
          melding = {
            kop: `Je bent overboden op de ${eersteWoord(b.naam)}`,
            tekst: `Hoogste bod nu ${euro(nieuw.hoogsteBod!, { heel: true })}. Hamer om ${tijd(nieuw.eindtijd)}.`,
          }
        }
        return nieuw
      })
      na = { ...na, biedingen, melding }
      return na
    }
    case 'sluitBieding':
      return sluitBieding(s, a.wijnId, a.nu)
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
      if (!w || w.voorraad <= 0 || s.lijst.status !== 'open' || !w.opTafelSinds) return s
      // Een ander lid bestelt de laatste flessen. Het mandje blijft staan, zodat te zien is wat er dan gebeurt.
      const na = bestel(s, {
        type: 'bestel', lidId: 'lid-3', regels: [{ wijnId: w.wijnId, aantal: w.voorraad }],
        levering: s.lijst.afhaalpunten[0].afhaalpuntId, door: 'lid', nu: a.nu,
      })
      return { ...na, mandje: s.mandje, levering: s.levering }
    }
    case 'afgeleverd':
      return {
        ...s,
        bestellingen: s.bestellingen.map((b) =>
          b.bestellingId === a.bestellingId ? { ...b, afgeleverdOp: a.ja ? a.nu : undefined } : b,
        ),
      }
    case 'nieuweWijn':
      // In V3 komt een nieuwe wijn klaar te staan; Marc zet hem tijdens de avond op tafel.
      return { ...s, lijst: { ...s.lijst, wijnen: [...s.lijst.wijnen, { ...a.wijn, opTafelSinds: undefined }] } }
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
    case 'beginAvond': {
      if (s.lijst.fase !== 'aangekondigd') return s
      const begin = heleMinuut(a.nu)
      const melding = s.herinnering ? { kop: 'Marc is begonnen', tekst: 'De eerste wijn komt zo op tafel.' } : s.melding
      return {
        ...s,
        melding,
        lijst: { ...s.lijst, fase: 'live', begin, openVan: begin, veilingBegin: plus(begin, VEILING_NA_BEGIN) },
        biedingen: s.biedingen.map((b) => (b.geopend ? b : { ...b, eindtijd: plus(begin, VEILING_NA_BEGIN + VEILING_DUUR) })),
      }
    }
    case 'springNaarAvond':
      return lopendeAvond(s, a.nu)
    case 'zetOpTafel':
      return zetOpTafel(s, a.wijnId, a.nu)
    case 'bericht': {
      const tekst = a.tekst.trim()
      if (!tekst || s.lijst.fase !== 'live') return s
      // Loopt de veiling, dan staat het bericht ook in de biedlog.
      const na = metFeed({ ...s, marcTypt: false }, { soort: 'bericht', op: a.nu, tekst })
      return {
        ...na,
        biedingen: na.biedingen.map((b) =>
          b.geopend && b.biedingStatus === 'open' ? { ...b, biedlog: [...b.biedlog, { soort: 'bericht', op: a.nu, tekst }] } : b,
        ),
      }
    }
    case 'marcTypt':
      return s.marcTypt === a.ja ? s : { ...s, marcTypt: a.ja }
    case 'openVeiling': {
      const na = openVeiling(s, a.wijnId, a.nu)
      if (na === s) return s
      const b = zoekBieding(na, a.wijnId)!
      return { ...na, melding: { kop: 'De veiling is begonnen', tekst: `${b.naam}, vanaf ${euro(b.startbod, { heel: true })}. Hamer om ${tijd(b.eindtijd)}.` } }
    }
    case 'laatsteMinuten': {
      // Voor het voorbeeld: de veiling springt naar de laatste minuten, met een paar biedingen erin.
      let na = openVeiling(s, a.wijnId, plus(a.nu, -40 * MINUUT))
      const b = zoekBieding(na, a.wijnId)
      if (!b || b.biedingStatus !== 'open') return s
      let x: BiedingStaat = b
      if (x.biedlog.filter((l) => l.soort === 'bod').length < 2) {
        x = anderBod(x, plus(a.nu, -29 * MINUUT))
        x = anderBod(x, plus(a.nu, -22 * MINUUT))
      }
      x = { ...x, eindtijd: plus(a.nu, 100_000) }
      na = { ...na, biedingen: na.biedingen.map((y) => (y.wijnId === a.wijnId ? x : y)) }
      return na
    }
    case 'herinner':
      return { ...s, herinnering: !s.herinnering }
    case 'verbinding':
      return { ...s, verbinding: a.ja }
    case 'instelling':
      return { ...s, instellingen: { ...s.instellingen, [a.naam]: a.aan } }
    case 'tik': {
      // Wat de server op tijd doet: de veiling openen op de begintijd en de hamer laten vallen op de eindtijd.
      let na = s
      for (const b of s.biedingen) {
        if (b.biedingStatus !== 'open') continue
        if (!b.geopend && s.lijst.fase === 'live' && a.nu >= s.lijst.veilingBegin) na = openVeiling(na, b.wijnId, a.nu)
        const nu = zoekBieding(na, b.wijnId)!
        if (nu.geopend && a.nu >= nu.eindtijd) na = sluitBieding(na, b.wijnId, nu.eindtijd)
      }
      return na
    }
  }
}

/** Moet de klok iets doen? Zo hoeft niet elke seconde de hele app opnieuw te tekenen. */
function teDoen(s: Staat, nu: string): boolean {
  return s.biedingen.some(
    (b) => b.biedingStatus === 'open' && ((!b.geopend && s.lijst.fase === 'live' && nu >= s.lijst.veilingBegin) || (b.geopend && nu >= b.eindtijd)),
  )
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
      if (s && s.versie === 3 && s.lijst && Array.isArray(s.bestellingen) && Array.isArray(s.feed)) {
        return {
          ...s,
          melding: null,
          marcTypt: false,
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
  const laatste = useRef(staat)
  useEffect(() => {
    laatste.current = staat
  })
  useEffect(() => {
    const t = window.setInterval(() => {
      const nu = iso(new Date())
      if (teDoen(laatste.current, nu)) dispatch({ type: 'tik', nu })
    }, 1000)
    return () => window.clearInterval(t)
  }, [])
  return <StaatContext.Provider value={[staat, dispatch]}>{children}</StaatContext.Provider>
}

export function useStaat(): Waarde {
  const waarde = useContext(StaatContext)
  if (!waarde) throw new Error('useStaat buiten StaatProvider')
  return waarde
}

/** De huidige tijd in milliseconden, elke `ms` ververst. Voor de klok en "2 min". */
export function useNu(ms = 1000): number {
  const [nu, setNu] = useReducer((_: number, x: number) => x, Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNu(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return nu
}
