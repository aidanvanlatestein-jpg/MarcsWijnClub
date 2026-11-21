// De kleine hulpjes: adressen, bedragen en tijden, en wat Marc in het beheer intypt.
import { describe, expect, it } from 'vitest'
import { bedrag, euro, flessen, heelBedrag, klok, naamMetJaar, tijd, weekNummer } from './opmaak'
import { herkenBericht, leesLetters } from './regels'
import { adres, leesRoute, type Route } from './route'

describe('adressen', () => {
  const routes: Route[] = [
    { scherm: 'aanbod' },
    { scherm: 'welkom' },
    { scherm: 'wijn', wijnId: 'wijn-f' },
    { scherm: 'bestelling' },
    { scherm: 'bon', bestellingId: 'b-0144' },
    { scherm: 'net-op' },
    { scherm: 'fles', wijnId: 'bieding-1' },
    { scherm: 'veiling', wijnId: 'bieding-1' },
    { scherm: 'gewonnen', wijnId: 'bieding-1' },
    { scherm: 'mijn-bestelling' },
    { scherm: 'marc' },
    { scherm: 'beheer' },
    { scherm: 'beheer', tab: 'nieuw' },
    { scherm: 'beheer', tab: 'afleveren' },
    { scherm: 'namens' },
  ]

  it.each(routes)('%o komt heel terug uit zijn adres', (route) => {
    expect(leesRoute(adres(route))).toEqual(route)
  })

  it('codeert een id met tekens die niet in een adres horen', () => {
    const route: Route = { scherm: 'wijn', wijnId: 'a/b c' }
    expect(leesRoute(adres(route))).toEqual(route)
  })

  it.each([
    ['', { scherm: 'aanbod' }],
    ['#/onbekend', { scherm: 'aanbod' }],
    ['#/%E0%A4%A', { scherm: 'aanbod' }],
    ['#/tip', { scherm: 'aanbod' }],
    ['#/flessen', { scherm: 'mijn-bestelling' }],
    ['#/betaling', { scherm: 'mijn-bestelling' }],
    ['#/besteld/b-0144', { scherm: 'bon', bestellingId: 'b-0144' }],
    ['#/bieding/bieding-1', { scherm: 'fles', wijnId: 'bieding-1' }],
    ['#/bieding/bieding-1/gewonnen', { scherm: 'gewonnen', wijnId: 'bieding-1' }],
    ['#/beheer/wijn', { scherm: 'beheer', tab: 'nieuw' }],
    ['#/beheer/bestellingen', { scherm: 'beheer', tab: 'afleveren' }],
    ['#/beheer/avond', { scherm: 'beheer' }],
    ['#/wijn', { scherm: 'aanbod' }],
  ])('oud of vreemd adres %s', (hash, route) => {
    expect(leesRoute(hash)).toEqual(route)
  })
})

describe('bedragen en tijden', () => {
  it.each([
    [0, '0,00'],
    [5, '0,05'],
    [975, '9,75'],
    [123456, '1.234,56'],
  ])('bedrag(%i) is %s', (centen, tekst) => {
    expect(bedrag(centen)).toBe(tekst)
  })

  it('laat nul centen weg bij een heel bedrag', () => {
    expect(heelBedrag(34000)).toBe('340')
    expect(heelBedrag(34050)).toBe('340,50')
    expect(euro(34000, { heel: true })).toBe('€ 340')
    expect(euro(975)).toBe('€ 9,75')
  })

  it('toont tijden in Nederlandse tijd, ook in de wintertijd en de zomertijd', () => {
    expect(tijd('2026-11-22T19:00:00Z')).toBe('20:00')
    expect(tijd('2026-07-01T19:00:00Z')).toBe('21:00')
  })

  it('telt weken volgens ISO 8601 in Nederlandse tijd', () => {
    expect(weekNummer('2026-11-22T12:00:00Z')).toBe(47)
    // 31 december 23:30 UTC is al 1 januari 2027 in Nederland, en hoort bij week 53 van 2026.
    expect(weekNummer('2026-12-31T23:30:00Z')).toBe(53)
  })

  it('schrijft een klok als m:ss en nooit negatief', () => {
    expect(klok(125_000)).toBe('2:05')
    expect(klok(500)).toBe('0:01')
    expect(klok(-1000)).toBe('0:00')
  })

  it('schrijft flessen en jaargangen', () => {
    expect(flessen(1)).toBe('1 fles')
    expect(flessen(3)).toBe('3 flessen')
    expect(naamMetJaar({ naam: 'Verdejo', jaargang: 2024 }, { kort: true })).toBe('Verdejo ’24')
    expect(naamMetJaar({ naam: 'Verdejo' })).toBe('Verdejo')
  })
})

describe('wat Marc intypt', () => {
  it('leest een verzonnen bericht in de vorm van de WhatsApp-groep', () => {
    const uit = herkenBericht('*Wijn G* Chianti Classico 2021\nKersen en leer.\n6 flessen\n€ 16,00')
    expect(uit).toEqual({ letter: 'G', naam: 'Chianti Classico', jaargang: 2021, aantal: 6, prijs: 1600, tekst: 'Kersen en leer.' })
  })

  it('leest letters met aantallen en telt dezelfde letter op', () => {
    expect(leesLetters('g 2, h')).toEqual({ regels: [{ letter: 'G', aantal: 2 }, { letter: 'H', aantal: 1 }], fout: null })
    expect(leesLetters('G2 G1').regels).toEqual([{ letter: 'G', aantal: 3 }])
  })

  it.each(['GG', 'G0', '2G', 'G123'])('weigert %s', (invoer) => {
    const uit = leesLetters(invoer)
    expect(uit.regels).toEqual([])
    expect(uit.fout).not.toBeNull()
  })
})
