import { Fragment, useState } from 'react'
import { Betalen } from '../onderdelen/Betalen'
import { regelNaam } from '../onderdelen/Bon'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { Kop } from '../onderdelen/Kop'
import { useWhatsApp } from '../onderdelen/WhatsApp'
import { dagEnMaand, dagEnTijd, euro, flessen, naamMetJaar, nuUtc } from '../opmaak'
import type { Ga } from '../route'
import { afhaalpunt, betaalverzoek, betaalVoor, LID, mijnLijstBestellingen, useStaat, zoekBieding, zoekWijn, type Staat } from '../staat'
import { BEWAREN, type Bestelling } from '../types'

function aantalIn(b: Bestelling): number {
  return b.regels.reduce((som, r) => som + r.aantal, 0)
}

/** 08 Mijn flessen: onderweg, bij Marc in bewaring, en wat je eerder kocht. */
export function Flessen({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [betalen, setBetalen] = useState(false)
  const lijstOpen = staat.lijst.status === 'open'

  const lijstBestellingen = mijnLijstBestellingen(staat).filter((b) => b.status === 'open' || b.status === 'betaald')
  const biedingBestellingen = staat.bestellingen.filter((b) => b.soort === 'bieding' && b.lidId === LID && b.status !== 'verlopen')
  const bewaard = biedingBestellingen.filter((b) => b.status === 'betaald' && b.levering === BEWAREN && !b.afgeleverdOp)
  const onderweg = [
    ...lijstBestellingen.filter((b) => !b.afgeleverdOp),
    ...biedingBestellingen.filter((b) => b.levering !== BEWAREN && !b.afgeleverdOp),
  ]
  const afgeleverd = [...lijstBestellingen, ...biedingBestellingen].filter((b) => b.afgeleverdOp)
  const gedronken = staat.eerder.reduce((som, e) => som + e.aantal, 0) + afgeleverd.reduce((som, b) => som + aantalIn(b), 0)
  const verzoek = betaalverzoek(staat)
  const kanBetalen = !lijstOpen && verzoek.bedrag > 0

  return (
    <>
      <Kop />
      <main>
        <div className="masthead">
          <h1>
            <span className="groot spook">Mijn</span>
            <span className="groot">Flessen</span>
          </h1>
        </div>
        <div className="tellers" style={{ marginTop: 8 }}>
          <div>
            <strong>{onderweg.reduce((som, b) => som + aantalIn(b), 0)}</strong>
            <span>ONDERWEG</span>
          </div>
          <div>
            <strong className="goud">{bewaard.length}</strong>
            <span>BIJ MARC</span>
          </div>
          <div>
            <strong className="gedempt">{gedronken}</strong>
            <span>GEDRONKEN</span>
          </div>
        </div>

        {onderweg.length > 0 && (
          <section className="sectie" aria-labelledby="onderweg">
            <h2 id="onderweg" className="label">Onderweg</h2>
            {onderweg.map((b) => <Onderweg key={b.bestellingId} staat={staat} bestelling={b} ga={ga} />)}
          </section>
        )}

        {bewaard.map((b) => <Bewaard key={b.bestellingId} staat={staat} bestelling={b} />)}

        <section className="sectie" aria-labelledby="eerder">
          <h2 id="eerder" className="label">Eerder gekocht · wat vond je ervan?</h2>
          <div>
            {staat.eerder.map((e) => {
              const oordeel = staat.oordelen[e.wijnId] ?? null
              const nu = zoekWijn(staat, e.wijnId)
              const opnieuw = lijstOpen && nu && nu.voorraad > 0
              const naam = naamMetJaar(e, { kort: true })
              const zet = (o: 'lekker' | 'niet') => dispatch({ type: 'oordeel', wijnId: e.wijnId, oordeel: oordeel === o ? null : o })
              return (
                <article key={e.wijnId} className="eerder-rij">
                  <span className={oordeel === 'lekker' ? 'letter lekker' : 'letter'} aria-hidden>{e.letter}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{naam}</h3>
                    <p className="tekst klein gedempt">
                      {flessen(e.aantal)} · {dagEnMaand(e.gekocht)}{nu ? '' : ' · niet meer op de lijst'}
                    </p>
                    <div className="oordeel">
                      <button type="button" className="lekker" aria-pressed={oordeel === 'lekker'} aria-label={`Lekker, ${e.naam}`} onClick={() => zet('lekker')}>Lekker</button>
                      <button type="button" aria-pressed={oordeel === 'niet'} aria-label={`Niet voor mij, ${e.naam}`} onClick={() => zet('niet')}>Niet voor mij</button>
                      {opnieuw && (
                        <button
                          type="button"
                          className="knop-wit"
                          aria-label={`Opnieuw bestellen, ${e.naam}`}
                          onClick={() => {
                            dispatch({ type: 'mandje', wijnId: nu.wijnId, aantal: Math.max(1, staat.mandje[nu.wijnId] ?? 0) })
                            ga({ scherm: 'wijn', wijnId: nu.wijnId })
                          }}
                        >
                          OPNIEUW →
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
      <Onderkant
        ga={ga}
        tab="flessen"
        knop={kanBetalen ? <Hoofdknop goud onClick={() => setBetalen(true)}>Betaal {euro(verzoek.bedrag)}</Hoofdknop> : undefined}
      />
      {betalen && (
        <Betalen
          bedrag={verzoek.bedrag}
          onSluit={() => setBetalen(false)}
          onKlaar={(gelukt) => {
            setBetalen(false)
            dispatch({ type: 'betaal', bestellingIds: verzoek.bestellingIds, gelukt, nu: nuUtc() })
            ga({ scherm: 'betaling' })
          }}
        />
      )}
    </>
  )
}

function Onderweg({ staat, bestelling: b, ga }: { staat: Staat; bestelling: Bestelling; ga: Ga }) {
  const bieding = b.soort === 'bieding'
  const punt = afhaalpunt(staat, b.levering)
  const betaald = b.status === 'betaald'
  // Het datamodel kent besteld, betaald en afgeleverd. "Ingepakt" uit het ontwerp bestaat nog niet.
  const stappen = [
    { naam: 'BESTELD', klaar: true },
    { naam: 'BETAALD', klaar: betaald },
    { naam: 'AFGEHAALD', klaar: Boolean(b.afgeleverdOp) },
  ]
  let status: string
  let goud = false
  if (betaald) status = punt ? `Ophalen in ${punt.naam}, ${punt.wanneer.toLowerCase()}` : 'Betaald. Kies nog een afhaalpunt'
  else if (bieding) {
    status = `Gewonnen. Betaal vóór ${dagEnTijd(betaalVoor(staat, b))}`
    goud = true
  } else if (staat.lijst.status === 'open') status = `Je betaalt als de lijst sluit${punt ? ` · ${punt.naam}` : ''}`
  else {
    status = `Klaar om te betalen, vóór ${dagEnTijd(betaalVoor(staat, b))}`
    goud = true
  }

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
      {b.regels.map((r) => (
        <div key={r.wijnId} className="onderweg-regel">
          <span className="aantal">{r.aantal}×</span>
          <div>
            <strong>{regelNaam(r)}</strong>
          </div>
        </div>
      ))}
      <p className={goud ? 'tekst klein goud' : 'tekst klein gedempt'}>
        Bon № {b.bon} · {euro(b.totaal)} · {status}
        {b.ingevoerdDoor === 'beheer' ? ' · door Marc ingevoerd' : ''}
      </p>
      {bieding && !betaald && (
        <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'gewonnen', wijnId: b.regels[0].wijnId })}>
          Betaal je fles →
        </button>
      )}
      <div className="voortgang" role="list" aria-label="Voortgang">
        {stappen.map((s) => (
          <div key={s.naam} role="listitem" className={s.klaar ? 'klaar' : undefined}>
            {s.naam}<span className="sr">{s.klaar ? ': klaar' : ': nog niet'}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function Bewaard({ staat, bestelling: b }: { staat: Staat; bestelling: Bestelling }) {
  const open = useWhatsApp()
  const bieding = zoekBieding(staat, b.regels[0].wijnId)
  const naam = bieding ? naamMetJaar(bieding) : b.regels[0].naam
  const kort = bieding ? naamMetJaar(bieding, { kort: true }) : naam
  const woorden = kort.toUpperCase().split(' ')
  return (
    <section className="bewaring" aria-label="Bij Marc in bewaring">
      {bieding?.foto ? <img src={bieding.foto} alt="" /> : null}
      <span className="verloop" aria-hidden />
      <div className="bewaring-info">
        <p className="label goud">Bij Marc in bewaring</p>
        <h3>
          {woorden.map((w, i) => (
            <Fragment key={i}>{i > 0 && ' '}{w}</Fragment>
          ))}
        </h3>
        <p className="tekst klein gedempt">
          {(bieding?.bewaring ?? 'Bij Marc').replace(/\.$/, '')}{b.betaaldOp ? ` · sinds ${dagEnMaand(b.betaaldOp)}` : ''}
        </p>
        <button type="button" className="knop-wit" style={{ alignSelf: 'flex-start' }} onClick={() => open(`Hoi Marc, wil je mijn ${naam} meenemen naar het diner van …?`)}>
          OPEN AAN TAFEL →
        </button>
        <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => open(`Hoi Marc, wil je mijn ${naam} klaarzetten bij een afhaalpunt? `)}>
          Zet hem klaar <span aria-hidden>↗</span>
        </button>
      </div>
    </section>
  )
}
