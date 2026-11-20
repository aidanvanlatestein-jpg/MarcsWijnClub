import { useState } from 'react'
import { Betalen } from '../onderdelen/Betalen'
import { regelNaam } from '../onderdelen/Bon'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { Kop } from '../onderdelen/Kop'
import { dagEnTijd, euro, nuUtc } from '../opmaak'
import type { Ga } from '../route'
import { afhaalpunt, betaalverzoek, betaalVoor, LID, mijnLijstBestellingen, useStaat, type Staat } from '../staat'
import type { Bestelling } from '../types'

/**
 * Mijn bestelling: wat je op de lopende lijst bestelde en de fles die je won, met de status
 * en de betaalknop. Meer niet: de eigen collectie (eerder gekocht, oordelen, in bewaring) is uit
 * de pilot gehaald en staat als onderwerp 14 op de roadmap. Dit scherm is nog niet getekend.
 */
export function MijnBestelling({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [betalen, setBetalen] = useState(false)
  const lijstOpen = staat.lijst.status === 'open'

  const bestellingen = [
    ...mijnLijstBestellingen(staat).filter((b) => b.status === 'open' || b.status === 'betaald'),
    ...staat.bestellingen.filter((b) => b.soort === 'bieding' && b.lidId === LID && b.status !== 'verlopen'),
  ]
  const verzoek = betaalverzoek(staat)
  const kanBetalen = !lijstOpen && verzoek.bedrag > 0

  return (
    <>
      <Kop />
      <main>
        <div className="masthead">
          <h1>
            <span className="groot spook">Mijn</span>
            <span className="groot" style={{ fontSize: 'min(64px, 15vw)' }}>Bestelling</span>
          </h1>
        </div>

        {bestellingen.length > 0 ? (
          <section className="sectie lijn-boven" aria-label="Wat je besteld hebt">
            {bestellingen.map((b) => <Rij key={b.bestellingId} staat={staat} bestelling={b} ga={ga} />)}
          </section>
        ) : (
          <section className="sectie lijn-boven">
            <p className="tekst">Je hebt nog niets besteld.</p>
            <p className="tekst klein gedempt">
              Wat je bestelt of wint, staat hier met de status. Betalen doe je als de lijst sluit.
            </p>
            <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'aanbod' })}>
              Naar het aanbod →
            </button>
          </section>
        )}
      </main>
      <Onderkant
        ga={ga}
        tab="mijn-bestelling"
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

function Rij({ staat, bestelling: b, ga }: { staat: Staat; bestelling: Bestelling; ga: Ga }) {
  const bieding = b.soort === 'bieding'
  const punt = afhaalpunt(staat, b.levering)
  const betaald = b.status === 'betaald'
  // Het datamodel kent besteld, betaald en afgeleverd. "Ingepakt" uit het ontwerp bestaat nog niet.
  const stappen = [
    { naam: bieding ? 'GEWONNEN' : 'BESTELD', klaar: true },
    { naam: 'BETAALD', klaar: betaald },
    { naam: 'AFGEHAALD', klaar: Boolean(b.afgeleverdOp) },
  ]
  let status: string
  let goud = false
  if (b.afgeleverdOp) status = punt ? `Afgehaald in ${punt.naam}` : 'Afgehaald'
  else if (betaald) status = punt ? `Ophalen in ${punt.naam}, ${punt.wanneer.toLowerCase()}` : 'Betaald. Kies nog een afhaalpunt'
  else if (bieding) {
    status = `Gewonnen. Betaal vóór ${dagEnTijd(betaalVoor(staat, b))}`
    goud = true
  } else if (staat.lijst.status === 'open') status = `Je betaalt als de lijst sluit${punt ? ` · ${punt.naam}` : ''}`
  else {
    status = `Klaar om te betalen, vóór ${dagEnTijd(betaalVoor(staat, b))}`
    goud = true
  }
  // Een gewonnen fles betaal je apart, en daarna kies je een afhaalpunt.
  const naarFles = bieding && !b.afgeleverdOp && (!betaald || !punt)

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
      {naarFles && (
        <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'gewonnen', wijnId: b.regels[0].wijnId })}>
          {betaald ? 'Kies een afhaalpunt →' : 'Betaal je fles →'}
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
