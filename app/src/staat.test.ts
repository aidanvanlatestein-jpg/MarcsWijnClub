// De reducer speelt na wat de server doet: bestellen, betalen, verlopen, bieden en de hamer.
// Deze tests leggen vast wat de browsertests in tests/web alleen via de schermen zien.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { plus } from './regels'
import { beginStaat, reducer, zoekBieding, zoekBestelling, zoekWijn, type Actie, type Staat } from './staat'

const BEGIN = '2026-11-22T18:30:00Z'
const op = (minuten: number, seconden = 0) => plus(BEGIN, (minuten * 60 + seconden) * 1000)

/** Een avond die net begonnen is, met de Verdejo (6 flessen van € 9,75) op tafel. */
function avond(): Staat {
  const basis = beginStaat()
  let s: Staat = { ...basis, ingelogd: true, instellingen: { ...basis.instellingen, veilingAltijd: false } }
  s = reducer(s, { type: 'beginAvond', nu: BEGIN })
  return reducer(s, { type: 'zetOpTafel', wijnId: 'wijn-f', nu: op(1) })
}

function bestel(s: Staat, regels: { wijnId: string; aantal: number }[], extra: Partial<Extract<Actie, { type: 'bestel' }>> = {}): Staat {
  return reducer(s, { type: 'bestel', lidId: 'lid-1', regels, levering: 'brengen', door: 'lid', nu: op(2), ...extra })
}

beforeEach(() => {
  // beginStaat rekent vanaf de klok: om 18:00 begint de avond om 18:30.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-22T18:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('de avond', () => {
  it('begint om het volgende halve uur, de veiling een half uur later', () => {
    const s = avond()
    expect(s.lijst.fase).toBe('live')
    expect(s.lijst.begin).toBe(BEGIN)
    expect(s.lijst.veilingBegin).toBe(op(30))
    expect(zoekBieding(s, 'bieding-1')?.eindtijd).toBe(op(90))
  })
})

describe('bestellen', () => {
  it('maakt een open bon, haalt flessen van de voorraad en leegt het mandje', () => {
    let s = reducer(avond(), { type: 'mandje', wijnId: 'wijn-f', aantal: 2 })
    s = bestel(s, [{ wijnId: 'wijn-f', aantal: 2 }])
    const bon = s.bestellingen.at(-1)!
    expect(bon).toMatchObject({ lidId: 'lid-1', soort: 'lijst', status: 'open', totaal: 1950, levering: 'brengen' })
    expect(bon.betaalVoor).toBe(op(17))
    expect(zoekWijn(s, 'wijn-f')?.voorraad).toBe(4)
    expect(s.mandje).toEqual({})
    expect(s.levering).toBe('brengen')
  })

  it('namens een lid is 48 uur te betalen', () => {
    const s = bestel(avond(), [{ wijnId: 'wijn-f', aantal: 1 }], { door: 'beheer', lidId: 'lid-4' })
    expect(s.bestellingen.at(-1)).toMatchObject({ soort: 'namens', betaalVoor: plus(op(2), 48 * 3_600_000) })
  })

  it.each([
    ['een wijn die nog klaarstaat', [{ wijnId: 'wijn-g', aantal: 1 }]],
    ['alles of niets: één regel kan niet', [{ wijnId: 'wijn-f', aantal: 1 }, { wijnId: 'wijn-g', aantal: 1 }]],
    ['meer dan de voorraad', [{ wijnId: 'wijn-f', aantal: 7 }]],
    ['nul flessen', [{ wijnId: 'wijn-f', aantal: 0 }]],
    ['een half aantal', [{ wijnId: 'wijn-f', aantal: 1.5 }]],
    ['een onbekende wijn', [{ wijnId: 'wijn-x', aantal: 1 }]],
    ['geen regels', []],
  ])('gaat niet door bij %s', (_, regels) => {
    const s = avond()
    expect(bestel(s, regels)).toBe(s)
  })

  it('gaat niet door met een levering die Marc niet aanbiedt', () => {
    const basis = avond()
    const s: Staat = { ...basis, lijst: { ...basis.lijst, levering: { brengen: basis.lijst.levering.brengen } } }
    expect(bestel(s, [{ wijnId: 'wijn-f', aantal: 1 }], { levering: 'halen' })).toBe(s)
  })

  it('laat de voorraad nooit onder nul zakken', () => {
    let s = bestel(avond(), [{ wijnId: 'wijn-f', aantal: 6 }])
    expect(zoekWijn(s, 'wijn-f')?.voorraad).toBe(0)
    expect(s.feed.some((f) => f.soort === 'gebeurtenis' && f.tekst === 'DE VERDEJO IS OP')).toBe(true)
    const na = bestel(s, [{ wijnId: 'wijn-f', aantal: 1 }], { lidId: 'lid-2' })
    expect(na).toBe(s)
    s = na
    expect(zoekWijn(s, 'wijn-f')?.voorraad).toBe(0)
  })

  it('gaat niet door als de avond gesloten is', () => {
    const s = reducer(avond(), { type: 'sluitLijst', nu: op(3) })
    expect(bestel(s, [{ wijnId: 'wijn-f', aantal: 1 }])).toBe(s)
  })
})

describe('betalen en verlopen', () => {
  const metBon = () => bestel(avond(), [{ wijnId: 'wijn-f', aantal: 2 }])

  it('zet een open bon binnen de termijn op betaald', () => {
    const s = metBon()
    const id = s.bestellingen.at(-1)!.bestellingId
    const na = reducer(s, { type: 'betaal', bestellingId: id, gelukt: true, nu: op(10) })
    expect(zoekBestelling(na, id)).toMatchObject({ status: 'betaald', betaaldOp: op(10) })
  })

  it('verandert niets bij een tweede melding van dezelfde betaling', () => {
    let s = metBon()
    const id = s.bestellingen.at(-1)!.bestellingId
    s = reducer(s, { type: 'betaal', bestellingId: id, gelukt: true, nu: op(10) })
    s = reducer(s, { type: 'betaal', bestellingId: id, gelukt: true, nu: op(11) })
    expect(zoekBestelling(s, id)?.betaaldOp).toBe(op(10))
  })

  it('zet een bon niet op betaald als de betaling mislukt of te laat is', () => {
    const s = metBon()
    const id = s.bestellingen.at(-1)!.bestellingId
    expect(zoekBestelling(reducer(s, { type: 'betaal', bestellingId: id, gelukt: false, nu: op(10) }), id)?.status).toBe('open')
    expect(zoekBestelling(reducer(s, { type: 'betaal', bestellingId: id, gelukt: true, nu: op(17) }), id)?.status).toBe('open')
  })

  it('laat een onbetaalde bon na 15 minuten verlopen; de flessen komen terug', () => {
    const s = metBon()
    const id = s.bestellingen.at(-1)!.bestellingId
    const net = reducer(s, { type: 'tik', nu: op(16, 59) })
    expect(zoekBestelling(net, id)?.status).toBe('open')
    const na = reducer(s, { type: 'tik', nu: op(17) })
    expect(zoekBestelling(na, id)?.status).toBe('verlopen')
    expect(zoekWijn(na, 'wijn-f')?.voorraad).toBe(6)
    expect(na.melding?.kop).toBe('Je bon is vervallen')
  })

  it('laat een betaalde bon niet verlopen', () => {
    let s = metBon()
    const id = s.bestellingen.at(-1)!.bestellingId
    s = reducer(s, { type: 'betaal', bestellingId: id, gelukt: true, nu: op(10) })
    s = reducer(s, { type: 'tik', nu: op(30) })
    expect(zoekBestelling(s, id)?.status).toBe('betaald')
    expect(zoekWijn(s, 'wijn-f')?.voorraad).toBe(4)
  })
})

describe('de veiling', () => {
  const bied = (s: Staat, bedrag: number, nu = op(40)) => reducer(s, { type: 'bied', wijnId: 'bieding-1', bedrag, nu })
  const geopend = () => reducer(avond(), { type: 'openVeiling', wijnId: 'bieding-1', nu: op(30) })
  const veiling = (s: Staat) => zoekBieding(s, 'bieding-1')!

  it('neemt geen bod aan voordat de zaal open is', () => {
    const s = avond()
    expect(bied(s, 25000)).toEqual(s)
  })

  it('neemt een bod vanaf het minimum aan en verhoogt het minimum', () => {
    const s = geopend()
    expect(veiling(bied(s, 24999))).toEqual(veiling(s))
    const na = veiling(bied(s, 25000))
    expect(na).toMatchObject({ hoogsteBod: 25000, mijnBod: 25000, mijnBodIsHoogste: true, minimaalVolgendBod: 26000, aantalBiedingen: 1 })
  })

  it('laat je je eigen hoogste bod niet overbieden', () => {
    const s = bied(geopend(), 25000)
    expect(veiling(bied(s, 30000))).toEqual(veiling(s))
  })

  it('neemt hoogstens drie keer het minimum aan', () => {
    const s = geopend()
    expect(veiling(bied(s, 75001)).hoogsteBod).toBeUndefined()
    expect(veiling(bied(s, 75000)).hoogsteBod).toBe(75000)
  })

  it('verlengt de eindtijd bij een bod in de laatste twee minuten', () => {
    const s = geopend()
    expect(veiling(bied(s, 25000, op(80))).eindtijd).toBe(op(90))
    expect(veiling(bied(s, 25000, op(89))).eindtijd).toBe(op(91))
  })

  it('meldt het als een ander lid je overbiedt', () => {
    const s = reducer(bied(geopend(), 25000), { type: 'anderBiedt', wijnId: 'bieding-1', nu: op(45) })
    expect(veiling(s)).toMatchObject({ hoogsteBod: 26000, mijnBodIsHoogste: false, minimaalVolgendBod: 27000 })
    expect(s.melding?.kop).toBe('Je bent overboden op de Barolo')
  })

  it('neemt na de eindtijd geen bod meer aan', () => {
    const s = geopend()
    expect(veiling(bied(s, 25000, op(90)))).toEqual(veiling(s))
  })

  it('maakt bij de hamer een bon voor de winnaar, 48 uur te betalen', () => {
    const s = reducer(bied(geopend(), 25000), { type: 'tik', nu: op(90) })
    expect(veiling(s).biedingStatus).toBe('gesloten')
    const bon = s.bestellingen.at(-1)!
    expect(bon).toMatchObject({ soort: 'bieding', lidId: 'lid-1', totaal: 25000, status: 'open', betaalVoor: plus(op(90), 48 * 3_600_000) })
    expect(s.melding?.kop).toBe('Je hebt de Barolo gewonnen')
  })

  it('maakt geen bon als een ander lid wint', () => {
    let s = reducer(bied(geopend(), 25000), { type: 'anderBiedt', wijnId: 'bieding-1', nu: op(45) })
    const aantal = s.bestellingen.length
    s = reducer(s, { type: 'tik', nu: op(90) })
    expect(veiling(s).biedingStatus).toBe('gesloten')
    expect(s.bestellingen).toHaveLength(aantal)
  })
})
