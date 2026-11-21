// De regels die ook in functions/wijnclub/domein staan, tegen dezelfde gevallen als tests/functions/test_gedeeld.py.
import { describe, expect, it } from 'vitest'
import gevallen from '../../tests/gedeeld/regels.json'
import { betaalVoor, hoogsteToegestaneBod, leesEuro, nieuweEindtijd, totaal } from './regels'

describe('gedeelde regels', () => {
  it('elke regel in het bestand heeft een test', () => {
    const { uitleg: _, ...regels } = gevallen
    expect(Object.keys(regels).sort()).toEqual(['betaalVoor', 'hoogsteToegestaneBod', 'leesEuro', 'nieuweEindtijd', 'totaal'])
  })

  it.each(gevallen.leesEuro)('leesEuro($invoer)', ({ invoer, centen }) => {
    expect(leesEuro(invoer)).toBe(centen)
  })

  it.each(gevallen.totaal)('totaal $centen', ({ regels, centen }) => {
    expect(totaal(regels)).toBe(centen)
  })

  it.each(gevallen.hoogsteToegestaneBod)('hoogste bod bij minimum $minimaalVolgendBod', ({ minimaalVolgendBod, hoogste }) => {
    expect(hoogsteToegestaneBod(minimaalVolgendBod)).toBe(hoogste)
  })

  it.each(gevallen.nieuweEindtijd)('eindtijd na een bod om $nu', ({ eindtijd, nu, nieuw }) => {
    expect(nieuweEindtijd(eindtijd, nu)).toBe(nieuw)
  })

  it.each(gevallen.betaalVoor)('betalen voor, soort $soort', ({ soort, aangemaakt, betaalVoor: verwacht }) => {
    expect(betaalVoor(soort as 'lijst' | 'namens' | 'bieding', aangemaakt)).toBe(verwacht)
  })
})
