import { ChevronRight } from 'lucide-react'
import { regelNaam } from '../onderdelen/Bon'
import { Duim } from '../onderdelen/Foto'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { TerugLink } from '../onderdelen/Kop'
import { dagEnTijd, euro, tijd } from '../opmaak'
import { terug, type Ga } from '../route'
import { LID, levermoment, useStaat, type Staat } from '../staat'
import type { Bestelling } from '../types'
import { LEVER_WOORD } from './Bestelling'

/**
 * Je bestellingen: elke bon van deze avond en de fles die je won, met de status. Niet getekend in
 * design-v4, dat geen tabbalk meer heeft; je komt hier via de terugblik na de avond. De eigen collectie
 * (eerder gekocht, oordelen, in bewaring) is uit de pilot gehaald en staat als onderwerp 14 op de roadmap.
 */
export function MijnBestelling({ ga }: { ga: Ga }) {
  const [staat] = useStaat()
  const bestellingen = staat.bestellingen.filter((b) => b.lidId === LID && b.status !== 'verlopen').reverse()
  return (
    <>
      <TerugLink titel="Het aanbod" onTerug={() => terug(() => ga({ scherm: 'aanbod' }))} />
      <main>
        <div className="masthead">
          <h1 className="groot" style={{ fontSize: 'min(64px, 15vw)' }}>Je bestellingen</h1>
        </div>
        {bestellingen.length > 0 ? (
          <section className="sectie lijn-boven" aria-label="Je bonnen" style={{ gap: 0 }}>
            {bestellingen.map((b) => <Rij key={b.bestellingId} staat={staat} bestelling={b} onOpen={() => ga({ scherm: 'bon', bestellingId: b.bestellingId })} />)}
          </section>
        ) : (
          <section className="sectie lijn-boven">
            <p className="tekst">Je hebt nog niets besteld.</p>
          </section>
        )}
        <div className="sectie">
          <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'marc' })}>
            Over de club, voorwaarden en privacy →
          </button>
        </div>
      </main>
      <Onderkant ga={ga} knop={<Hoofdknop onClick={() => ga({ scherm: 'aanbod' })}>Naar het aanbod</Hoofdknop>} />
    </>
  )
}

function Rij({ staat, bestelling: b, onOpen }: { staat: Staat; bestelling: Bestelling; onOpen: () => void }) {
  const moment = levermoment(staat, b.levering)
  let status: string
  let goud = false
  if (b.afgeleverdOp) status = b.levering === 'halen' ? 'Opgehaald' : 'Gebracht'
  else if (b.status === 'betaald') status = moment ? `Betaald · ${LEVER_WOORD[moment.soort]}: ${moment.wanneer.toLowerCase()}` : 'Betaald · kies brengen of halen'
  else {
    status = b.soort === 'lijst' ? `Betaal vóór ${tijd(b.betaalVoor)}` : `Betaal vóór ${dagEnTijd(b.betaalVoor)}`
    goud = true
  }
  return (
    <button type="button" className="bon-rij" onClick={onOpen}>
      <span className="bon-rij-fotos">{b.regels.slice(0, 3).map((r) => <Duim key={r.wijnId} foto={r.foto} />)}</span>
      <span className="bon-rij-tekst">
        <strong>{b.regels.map((r) => `${r.aantal}× ${regelNaam(r)}`).join(', ')}</strong>
        <span className={goud ? 'goud' : undefined}>Bon Nº {b.bon} · {euro(b.totaal)} · {status}{b.ingevoerdDoor === 'beheer' ? ' · door Marc ingevoerd' : ''}</span>
      </span>
      <ChevronRight size={22} aria-hidden />
    </button>
  )
}
