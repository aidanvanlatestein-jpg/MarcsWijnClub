// De staat van het klikbare prototype. Alles staat in het geheugen van de browser;
// er gaat niets naar de API. De regels volgen het pilotplan en de bouwspecificatie (design-v4):
// een lid betaalt meteen bij het bestellen. Marc houdt de flessen 15 minuten vast; wie dan niet
// betaald heeft, verliest ze weer. Elke bon is één betaling. Het lid kiest brengen of halen.
//
// Elke lijst is "een avond bij Marc": aangekondigd, live, gesloten. Een wijn staat eerst klaar
// en verschijnt pas in de feed als Marc hem op tafel zet. De bijzondere fles gaat aan het eind
// van de avond onder de hamer.
import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import type { Bestelling, Bieding, Fase, FeedItem, LeverSoort, Lijst, LogItem, Regel, Wijn } from './types'
import { euro, tijd, tijdvak } from './opmaak'
import {
  voorbeeldBerichten, voorbeeldBestellingen, voorbeeldBiedingen, voorbeeldLid, voorbeeldLijst,
} from './voorbeeld'

/** Het lid dat in het prototype is ingelogd. In de echte app komt het lid uit het token. */
export const LID = voorbeeldLid.lidId

const OPSLAG = 'wijnclub-voorbeeld-5'
const MINUUT = 60_000
const UUR = 60 * MINUUT
const BETAALTERMIJN = 48 * UUR
/** Zo lang houdt Marc de flessen vast terwijl het lid betaalt. */
export const HOUDTIJD = 15 * MINUUT
const VERLENGING = 2 * MINUUT
/** De veiling begint een half uur na het begin van de avond, de hamer valt een uur later. */
const VEILING_NA_BEGIN = 30 * MINUUT
const VEILING_DUUR = 60 * MINUUT
/** Een bod is hoogstens drie keer het minimum, zoals in functions/wijnclub/domein/bieding.py. */
export const HOOGSTE_FACTOR = 3
/** De laatste twee minuten van een veiling: "eenmaal, andermaal". */
export const LAATSTE_MINUTEN = VERLENGING

export interface LijstStaat extends Lijst {
  /** Open: er kan besteld worden zodra een wijn op tafel staat. */
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

/** De laatste poging om een bon te betalen. Mislukt: de bon toont "Niet betaald". */
export interface Betaalpoging {
  bestellingId: string
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
  /**
   * Alleen om te testen, geen open beslissing: er staat altijd een veiling open, ook vóór en na de
   * avond. Valt de hamer, dan begint er een nieuwe. Uit: de veiling begint op de avond, zoals het plan.
   */
  veilingAltijd: boolean
}

const STANDAARD_INSTELLINGEN: Instellingen = { bijnamen: true, levendig: true, veilingAltijd: true }

export interface Staat {
  versie: 4
  ingelogd: boolean
  /** Het lid koos "Voortaan met Face ID" (een passkey). Dan begint de app met "Welkom terug". */
  faceId: boolean
  lijst: LijstStaat
  biedingen: BiedingStaat[]
  bestellingen: Bestelling[]
  feed: FeedItem[]
  mandje: Record<string, number>
  /** Brengen of halen: wat het lid de vorige keer koos. */
  levering: LeverSoort | null
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
  | { type: 'inloggen'; faceId?: boolean }
  | { type: 'uitloggen' }
  | { type: 'mandje'; wijnId: string; aantal: number }
  | { type: 'pasMandjeAan' }
  | { type: 'levering'; levering: LeverSoort }
  | { type: 'bestel'; lidId: string; regels: { wijnId: string; aantal: number }[]; levering: LeverSoort; door: 'lid' | 'beheer'; nu: string }
  | { type: 'sluitLijst'; nu: string }
  | { type: 'betaal'; bestellingId: string; gelukt: boolean; nu: string }
  | { type: 'bied'; wijnId: string; bedrag: number; nu: string }
  | { type: 'anderBiedt'; wijnId: string; nu: string }
  | { type: 'sluitBieding'; wijnId: string; nu: string }
  | { type: 'leveringBieding'; bestellingId: string; levering: LeverSoort }
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
    versie: 4,
    ingelogd: false,
    faceId: false,
    lijst: {
      ...voorbeeldLijst,
      levering: leveringNa(begin),
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
    volgendeBon: 144,
    volgendId: 1,
    betaling: null,
    melding: null,
    herinnering: false,
    marcTypt: false,
    verbinding: true,
    instellingen: { ...STANDAARD_INSTELLINGEN },
  }
}

// ---- Afgeleide gegevens ----

export function zoekWijn(s: Staat, wijnId: string): Wijn | undefined {
  return s.lijst.wijnen.find((w) => w.wijnId === wijnId)
}

export function zoekBieding(s: Staat, wijnId: string): BiedingStaat | undefined {
  return s.biedingen.find((b) => b.wijnId === wijnId)
}

/** De veiling die nu loopt: open en de zaal is open. */
export function lopendeVeiling(s: Staat): BiedingStaat | undefined {
  return s.biedingen.find((b) => b.biedingStatus === 'open' && b.geopend)
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

export function zoekBestelling(s: Staat, bestellingId: string): Bestelling | undefined {
  return s.bestellingen.find((b) => b.bestellingId === bestellingId)
}

export interface Levermoment {
  soort: LeverSoort
  /** "Donderdag tussen 18:00 en 20:00" */
  wanneer: string
  waar?: string
}

/** Wat Marc deze avond aanbiedt, in zijn volgorde: brengen, dan halen. */
export function levermomenten(s: Staat): Levermoment[] {
  const { brengen, halen } = s.lijst.levering
  const uit: Levermoment[] = []
  if (brengen) uit.push({ soort: 'brengen', wanneer: tijdvak(brengen.van, brengen.tot) })
  if (halen) uit.push({ soort: 'halen', wanneer: tijdvak(halen.van, halen.tot), waar: halen.waar })
  return uit
}

export function levermoment(s: Staat, soort: LeverSoort | null): Levermoment | undefined {
  return levermomenten(s).find((l) => l.soort === soort)
}

/** Brengen twee dagen na de avond, ophalen vier dagen erna. Zo blijft het voorbeeld actueel. */
function leveringNa(begin: string): Lijst['levering'] {
  const dag = (n: number, uur: number) => {
    const d = new Date(plus(begin, n * 24 * UUR))
    d.setUTCHours(uur, 0, 0, 0)
    return iso(d)
  }
  const halen = voorbeeldLijst.levering.halen
  return {
    brengen: { van: dag(2, 17), tot: dag(2, 19) },
    ...(halen && { halen: { ...halen, van: dag(4, 9), tot: dag(4, 11) } }),
  }
}

/** De naam in lijsten en op de bon: "Janasse Côtes du Rhône". */
export function korteNaam(w: { naam: string; korteNaam?: string }): string {
  return w.korteNaam ?? w.naam
}

/** Het woord waarmee de feed een wijn noemt: "JANASSE", "DE VERDEJO". */
export function roepNaam(w: { naam: string; korteNaam?: string }): string {
  return eersteWoord(korteNaam(w)).toUpperCase()
}

export function volgendeLetter(s: Staat): string {
  const hoogste = s.lijst.wijnen.reduce((max, w) => Math.max(max, w.letter.charCodeAt(0)), 'A'.charCodeAt(0) - 1)
  return String.fromCharCode(Math.min(hoogste + 1, 'Z'.charCodeAt(0)))
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
  if (!levermoment(s, a.levering)) return s
  const regels: Regel[] = []
  for (const r of a.regels) {
    const w = zoekWijn(s, r.wijnId)
    // Alles of niets, zoals de transactie in DynamoDB. Een wijn die nog klaarstaat, is niet te koop.
    if (!w || !w.opTafelSinds || !Number.isInteger(r.aantal) || r.aantal < 1 || r.aantal > w.voorraad) return s
    regels.push({ wijnId: w.wijnId, letter: w.letter, naam: korteNaam(w), jaargang: w.jaargang, foto: w.foto, aantal: r.aantal, prijs: w.prijs })
  }
  if (regels.length === 0) return s
  let [, na] = nieuweBestelling(s, {
    lidId: a.lidId,
    soort: a.door === 'lid' ? 'lijst' : 'namens',
    lijstId: s.lijst.lijstId,
    regels,
    totaal: regels.reduce((som, r) => som + r.aantal * r.prijs, 0),
    status: 'open',
    // Het lid betaalt meteen; Marc houdt de flessen 15 minuten vast. Namens een lid stuurt Marc een betaallink.
    betaalVoor: plus(a.nu, a.door === 'lid' ? HOUDTIJD : BETAALTERMIJN),
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
  for (const r of regels) na = metFeed(na, { soort: 'gebeurtenis', op: a.nu, tekst: `${wie} ${r.aantal} × ${roepNaam(zoekWijn(s, r.wijnId)!)}` })
  for (const w of wijnen) {
    if (w.voorraad === 0 && zoekWijn(s, w.wijnId)!.voorraad > 0) na = metFeed(na, { soort: 'gebeurtenis', op: a.nu, tekst: `DE ${roepNaam(w)} IS OP` })
  }
  return {
    ...na,
    mandje: a.door === 'lid' && a.lidId === LID ? {} : s.mandje,
    levering: a.door === 'lid' && a.lidId === LID ? a.levering : s.levering,
  }
}

/** Niet betaald binnen de termijn: de bestelling verloopt en de flessen komen terug op tafel. */
function verloop(s: Staat, nu: string): Staat {
  const weg = s.bestellingen.filter((b) => b.status === 'open' && nu >= b.betaalVoor)
  if (weg.length === 0) return s
  const ids = new Set(weg.map((b) => b.bestellingId))
  const terug = new Map<string, number>()
  for (const b of weg) {
    if (b.soort === 'bieding') continue
    for (const r of b.regels) terug.set(r.wijnId, (terug.get(r.wijnId) ?? 0) + r.aantal)
  }
  const mijn = weg.find((b) => b.lidId === LID && b.soort === 'lijst')
  return {
    ...s,
    bestellingen: s.bestellingen.map((b) => (ids.has(b.bestellingId) ? { ...b, status: 'verlopen' as const } : b)),
    lijst: {
      ...s.lijst,
      wijnen: s.lijst.wijnen.map((w) => {
        const n = terug.get(w.wijnId)
        return n ? { ...w, voorraad: w.voorraad + n, opSinds: undefined } : w
      }),
    },
    melding: mijn ? { kop: 'Je bon is vervallen', tekst: 'Je betaalde niet binnen 15 minuten. De flessen staan weer op tafel.' } : s.melding,
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
    regels: [{ wijnId: b.wijnId, letter: '', naam: b.naam, jaargang: b.jaargang, foto: b.foto, aantal: 1, prijs: b.hoogsteBod }],
    totaal: b.hoogsteBod,
    status: 'open',
    betaalVoor: plus(nu, BETAALTERMIJN),
    levering: null,
    ingevoerdDoor: 'lid',
    aangemaakt: nu,
  })
  return {
    ...metBestelling,
    melding: { kop: `Je hebt de ${eersteWoord(b.naam)} gewonnen`, tekst: `Voor ${euro(b.hoogsteBod, { heel: true })}. Betaal binnen 48 uur.` },
  }
}

/**
 * Voor het testen (instelling `veilingAltijd`): zorgt dat er altijd een veiling loopt. Een veiling
 * die klaarstaat gaat meteen open, ook vóór de avond. Is de hamer gevallen, dan begint er een nieuwe
 * ronde met dezelfde voorbeeldfles onder een eigen nummer; de afgelopen ronde blijft staan, met de
 * winnaar en de betaling.
 */
function houdVeilingGaande(s: Staat, nu: string): Staat {
  if (!s.instellingen.veilingAltijd || lopendeVeiling(s)) return s
  const klaar = s.biedingen.find((b) => b.biedingStatus === 'open')
  if (klaar) return openVeiling(s, klaar.wijnId, nu)
  const vorige = s.biedingen.at(-1)
  if (!vorige) return s
  const ronde: BiedingStaat = {
    ...vorige,
    wijnId: `bieding-r${s.volgendId}`,
    biedingStatus: 'open',
    hoogsteBod: undefined,
    mijnBod: undefined,
    mijnBodIsHoogste: false,
    minimaalVolgendBod: vorige.startbod,
    aantalBiedingen: 0,
    geopend: nu,
    eindtijd: plus(nu, VEILING_DUUR),
    biedlog: [{ soort: 'open', op: nu, bedrag: vorige.startbod }],
  }
  return { ...s, biedingen: [...s.biedingen, ronde], volgendId: s.volgendId + 1 }
}

/** Een avond die al 22 minuten loopt, zoals op scherm 03 en 15. */
function lopendeAvond(s: Staat, nu: string): Staat {
  const begin = heleMinuut(plus(nu, -22 * MINUUT))
  const op = (min: number) => plus(begin, min * MINUUT)
  const basis = beginStaat()
  let na: Staat = {
    ...basis,
    ingelogd: s.ingelogd,
    faceId: s.faceId,
    instellingen: s.instellingen,
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
    const bestellingId = `b-${bonNummer(na.volgendeBon)}`
    na = bestel(na, { type: 'bestel', lidId: v.lidId, door: v.door, levering: v.levering, regels: [{ wijnId: v.wijnId, aantal: v.aantal }], nu: op(v.minuut) })
    if (v.betaald) na = stap(na, { type: 'betaal', bestellingId, gelukt: true, nu: op(v.minuut + 1) })
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
  const na = stap(s, a)
  // Acties zonder tijdstip (een instelling, opnieuw beginnen) vangt de klok binnen een seconde op.
  return 'nu' in a ? houdVeilingGaande(na, a.nu) : na
}

function stap(s: Staat, a: Actie): Staat {
  switch (a.type) {
    case 'inloggen':
      return { ...s, ingelogd: true, faceId: a.faceId ?? s.faceId }
    case 'uitloggen':
      return { ...s, ingelogd: false, mandje: {} }
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
      return levermoment(s, a.levering) ? { ...s, levering: a.levering } : s
    case 'bestel':
      return bestel(s, a)
    case 'sluitLijst': {
      if (s.lijst.status !== 'open') return s
      // Er volgt geen betaalverzoek: wie bestelde, betaalde al. Open bonnen kunnen nog tot hun termijn betaald worden.
      const gesloten: Staat = { ...s, lijst: { ...s.lijst, status: 'gesloten', fase: 'gesloten', geslotenOp: a.nu }, mandje: {}, marcTypt: false }
      return {
        ...metFeed(gesloten, { soort: 'gebeurtenis', op: a.nu, tekst: 'MARC SLOOT DE AVOND' }),
        melding: { kop: 'De avond is gesloten', tekst: 'Zodra er een nieuwe avond is, krijg je een melding.' },
      }
    }
    case 'betaal': {
      const b = zoekBestelling(s, a.bestellingId)
      if (!b) return s
      const betaling = { bestellingId: a.bestellingId, gelukt: a.gelukt, op: a.nu }
      // Alleen een open bon binnen de termijn gaat naar betaald; een tweede melding verandert niets.
      if (!a.gelukt || b.status !== 'open' || a.nu >= b.betaalVoor) return { ...s, betaling }
      return {
        ...s,
        betaling,
        bestellingen: s.bestellingen.map((x) => (x.bestellingId === a.bestellingId ? { ...x, status: 'betaald', betaaldOp: a.nu } : x)),
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
      // Na het betalen kiest de winnaar brengen of halen; bewaren bij Marc is uit de pilot.
      if (!levermoment(s, a.levering)) return s
      return {
        ...s,
        bestellingen: s.bestellingen.map((b) =>
          b.bestellingId === a.bestellingId && b.soort === 'bieding' ? { ...b, levering: a.levering } : b,
        ),
      }
    case 'anderKooptOp': {
      const w = zoekWijn(s, a.wijnId)
      if (!w || w.voorraad <= 0 || s.lijst.status !== 'open' || !w.opTafelSinds) return s
      // Een ander lid bestelt de laatste flessen. Het mandje blijft staan, zodat te zien is wat er dan gebeurt.
      const na = bestel(s, {
        type: 'bestel', lidId: 'lid-3', regels: [{ wijnId: w.wijnId, aantal: w.voorraad }],
        levering: levermomenten(s)[0].soort, door: 'lid', nu: a.nu,
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
      // Wat de server op tijd doet: de veiling openen op de begintijd, de hamer laten vallen op de eindtijd
      // en een bon die niet op tijd betaald is laten verlopen.
      let na = verloop(s, a.nu)
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
  if (s.instellingen.veilingAltijd && !lopendeVeiling(s) && s.biedingen.length > 0) return true
  if (s.bestellingen.some((b) => b.status === 'open' && nu >= b.betaalVoor)) return true
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
      if (s && s.versie === 4 && s.lijst && Array.isArray(s.bestellingen) && Array.isArray(s.feed)) {
        return houdVeilingGaande({
          ...s,
          melding: null,
          marcTypt: false,
          instellingen: { ...STANDAARD_INSTELLINGEN, ...s.instellingen },
          lijst: { ...s.lijst, wijnen: s.lijst.wijnen.map(zonderTijdelijkeFoto) },
          biedingen: s.biedingen.map(zonderTijdelijkeFoto),
        }, iso(new Date()))
      }
    }
  } catch {
    // Geen opslag beschikbaar of onleesbaar: begin opnieuw.
  }
  return houdVeilingGaande(beginStaat(), iso(new Date()))
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
