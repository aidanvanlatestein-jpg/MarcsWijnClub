import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Aantal } from '../onderdelen/Aantal'
import { Stippellijn } from '../onderdelen/Stippellijn'
import { dagEnTijd, euro } from '../opmaak'
import type { Aanbod as AanbodGegevens, Bieding, Wijn } from '../types'

export type Mandje = Record<string, number>

interface Props {
  aanbod: AanbodGegevens
  mandje: Mandje
  onWijzig: (wijnId: string, aantal: number) => void
  onOpenWijn?: (wijnId: string) => void
  onOpenBieding?: (wijnId: string) => void
}

export function Aanbod({ aanbod, mandje, onWijzig, onOpenWijn, onOpenBieding }: Props) {
  const lijst = aanbod.lijsten[0]
  const biedingen = aanbod.biedingen.filter((b) => b.biedingStatus === 'open')

  return (
    <main className="inhoud">
      {lijst ? (
        <>
          <div className="titel">
            <h1>{lijst.titel}</h1>
            <p>
              Open tot {dagEnTijd(lijst.openTot)}.{lijst.inleiding ? ` ${lijst.inleiding}` : ''}
            </p>
          </div>
          {[...lijst.wijnen]
            .sort((a, b) => a.volgorde - b.volgorde)
            .map((wijn) => (
              <Fragment key={wijn.wijnId}>
                <Stippellijn />
                <WijnRegel
                  wijn={wijn}
                  aantal={mandje[wijn.wijnId] ?? 0}
                  onWijzig={(n) => onWijzig(wijn.wijnId, n)}
                  onOpen={onOpenWijn && (() => onOpenWijn(wijn.wijnId))}
                />
              </Fragment>
            ))}
        </>
      ) : (
        <div className="titel">
          <h1>Geen lijst open</h1>
          <p>Zodra er een nieuwe lijst is, staat hij hier.</p>
        </div>
      )}

      {biedingen.length > 0 && (
        <div className="kop-sectie">
          <h2>BIJZONDERE FLES</h2>
          <Stippellijn />
        </div>
      )}
      {biedingen.map((b) => (
        <BijzondereFles key={b.wijnId} bieding={b} onOpen={onOpenBieding && (() => onOpenBieding(b.wijnId))} />
      ))}
    </main>
  )
}

function WijnRegel({ wijn, aantal, onWijzig, onOpen }: { wijn: Wijn; aantal: number; onWijzig: (n: number) => void; onOpen?: () => void }) {
  const op = wijn.voorraad <= 0
  return (
    <article className={op ? 'wijn op' : 'wijn'}>
      {wijn.foto ? <img className="wijn-foto" src={wijn.foto} alt="" /> : <div className="wijn-foto" />}
      <div className="wijn-tekst">
        <span className="wijn-letter">WIJN {wijn.letter}</span>
        {onOpen ? (
          <button type="button" className="wijn-naam" onClick={onOpen}>{wijn.naam}</button>
        ) : (
          <span className="wijn-naam">{wijn.naam}</span>
        )}
        <p className="wijn-omschrijving">{wijn.tekst}</p>
        <div className="prijs-en-aantal">
          <div className="prijs">
            <strong>{euro(wijn.prijs)} per fles</strong>
            {op ? <small className="op">Uitverkocht</small> : <small>Nog {wijn.voorraad} {wijn.voorraad === 1 ? 'fles' : 'flessen'}</small>}
          </div>
          {op ? (
            <span className="uitverkocht">UITVERKOCHT</span>
          ) : (
            <Aantal waarde={aantal} max={wijn.voorraad} naam={wijn.naam} onWijzig={onWijzig} />
          )}
        </div>
      </div>
    </article>
  )
}

function BijzondereFles({ bieding, onOpen }: { bieding: Bieding; onOpen?: () => void }) {
  const stand = bieding.hoogsteBod
    ? `Hoogste bod ${euro(bieding.hoogsteBod, { heel: true })}`
    : `Startbod ${euro(bieding.startbod, { heel: true })}`
  return (
    <button type="button" className="bijzondere-fles" onClick={onOpen}>
      {bieding.foto ? <img src={bieding.foto} alt="" /> : null}
      <span className="info">
        <span>
          <span className="naam">{bieding.naam}</span>
          <span className="stand">{stand} · sluit {dagEnTijd(bieding.eindtijd)}</span>
        </span>
        <ChevronRight size={22} aria-hidden />
      </span>
    </button>
  )
}
