import { Fragment } from 'react'
import { Flessenrij, RijStatus } from '../onderdelen/Flessenrij'
import { Onderkant, Prijs, Stippellijn } from '../onderdelen/Knoppen'
import { Kop } from '../onderdelen/Kop'
import { dagEnTijd, heelBedrag, kortDagEnTijd, naamMetJaar, weekNummer } from '../opmaak'
import type { Ga } from '../route'
import { gesorteerd, useStaat, type BiedingStaat } from '../staat'
import type { Wijn } from '../types'

/** 02 Aanbod: de kaart van de week, en daaronder de bijzondere fles. */
export function Aanbod({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const open = lijst.status === 'open'
  const biedingen = staat.biedingen.filter((b) => b.biedingStatus === 'open')
  const week = weekNummer(lijst.openTot)

  return (
    <>
      <Kop vraag="Hoi Marc, een vraag over de lijst van deze week: " />
      <main>
        {open ? (
          <>
            <div className="masthead">
              <h1 className="groot">De kaart</h1>
              <div className="masthead-rij">
                <span className="groot spook" aria-hidden>WK {week}</span>
                <p className="sluit-tijd">
                  <span>SLUIT</span>
                  <strong>{kortDagEnTijd(lijst.openTot).toUpperCase()}</strong>
                </p>
              </div>
              <p className="sr">Week {week}</p>
              {lijst.inleiding && <p className="inleiding">{lijst.inleiding}</p>}
            </div>
            <section className="wijnen" aria-label="Wijnen op de lijst">
              {gesorteerd(lijst.wijnen).map((wijn) => (
                <Fragment key={wijn.wijnId}>
                  <Stippellijn />
                  <WijnRegel
                    wijn={wijn}
                    gekozen={staat.mandje[wijn.wijnId] ?? 0}
                    onKies={(aantal) => dispatch({ type: 'mandje', wijnId: wijn.wijnId, aantal })}
                    onOpen={() => ga({ scherm: 'wijn', wijnId: wijn.wijnId })}
                  />
                </Fragment>
              ))}
            </section>
          </>
        ) : (
          <NietsOpen />
        )}
        {biedingen.map((b) => (
          <Poster key={b.wijnId} bieding={b} onOpen={() => ga({ scherm: 'bieding', wijnId: b.wijnId })} />
        ))}
      </main>
      <Onderkant ga={ga} tab="aanbod" bon />
    </>
  )
}

function WijnRegel({ wijn, gekozen, onKies, onOpen }: { wijn: Wijn; gekozen: number; onKies: (n: number) => void; onOpen: () => void }) {
  const op = wijn.voorraad <= 0
  const weg = Math.max(0, (wijn.partij ?? wijn.voorraad) - wijn.voorraad)
  return (
    <article className={op ? 'wijnregel op' : 'wijnregel'}>
      <div className={gekozen > 0 && !op ? 'reuzenletter gekozen' : 'reuzenletter'} aria-hidden>{wijn.letter}</div>
      <div className="wijnregel-tekst">
        <h2>
          <button type="button" className="wijnregel-naam" onClick={onOpen}>
            <span><span className="sr">Wijn {wijn.letter}: </span>{naamMetJaar(wijn)}</span>
          </button>
        </h2>
        <p className="wijnregel-omschrijving">{wijn.tekst}</p>
        <Prijs centen={wijn.prijs} />
        <Flessenrij vrij={wijn.voorraad} weg={weg} gekozen={gekozen} onKies={onKies} letter={wijn.letter} naam={wijn.naam} />
        <RijStatus vrij={wijn.voorraad} gekozen={gekozen} />
      </div>
    </article>
  )
}

function Poster({ bieding, onOpen }: { bieding: BiedingStaat; onOpen: () => void }) {
  const bod = bieding.hoogsteBod ?? bieding.startbod
  return (
    <button type="button" className="poster" onClick={onOpen}>
      {bieding.foto ? <img src={bieding.foto} alt="" /> : null}
      <span className="verloop" aria-hidden />
      <span className="poster-rand" aria-hidden>BIJZONDERE FLES · BIJZONDERE FLES · BIJZONDERE FLES</span>
      <span className="poster-info">
        <span className="poster-naam">{naamMetJaar(bieding)} · 1 fles</span>
        <span className="bedrag-groot" style={{ fontSize: 'min(120px, 30vw)' }}>
          <span className="eur">€</span>
          <span className="getal">{heelBedrag(bod)}</span>
        </span>
        <span className="poster-onder">
          {bieding.hoogsteBod ? (bieding.mijnBodIsHoogste ? 'Jouw bod is het hoogste' : 'Hoogste bod') : 'Startbod'} · sluit {dagEnTijd(bieding.eindtijd)} →
        </span>
      </span>
    </button>
  )
}

/** Toestand: geen lijst open. */
export function NietsOpen() {
  return (
    <div className="masthead" style={{ paddingTop: 24, paddingBottom: 28 }}>
      <h1 className="groot spook" style={{ fontSize: 'min(120px, 30vw)' }}>Niets<br />open.</h1>
      <p className="tekst" style={{ marginTop: 16 }}>De lijst is gesloten. Zodra er een nieuwe lijst is, krijg je een melding.</p>
    </div>
  )
}
