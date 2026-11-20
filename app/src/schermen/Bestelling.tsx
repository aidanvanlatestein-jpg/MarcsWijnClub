import { Bon } from '../onderdelen/Bon'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { TerugLink } from '../onderdelen/Kop'
import { adresRegel, kortDatum, nuUtc, tijd } from '../opmaak'
import { terug, type Ga } from '../route'
import { bonNummer, korteNaam, LID, levermoment, levermomenten, mandjeRegels, tekorten, useStaat } from '../staat'
import type { LeverSoort } from '../types'
import { voorbeeldLid } from '../voorbeeld'

export const LEVER_WOORD: Record<LeverSoort, string> = { brengen: 'Breng', halen: 'Haal' }

/** "Ik breng ze donderdagavond", "Jij haalt ze zaterdag op". */
export function leverZin(soort: LeverSoort, wanneer: string): string {
  const uur = Number(/(\d{2}):\d{2}/.exec(wanneer)?.[1] ?? 0)
  const dag = wanneer.split(' ')[0].toLowerCase() + (uur >= 17 ? 'avond' : '')
  return soort === 'brengen' ? `Ik breng ze ${dag}` : `Jij haalt ze ${dag} op`
}

/**
 * De bon (design-v4): controle, brengen of halen, en meteen betalen met iDEAL. Op het moment van
 * betalen ontstaat de bestelling; Marc houdt de flessen 15 minuten vast.
 */
export function Bestelling({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const regels = mandjeRegels(staat)
  const { lijst } = staat
  const naarAanbod = () => terug(() => ga({ scherm: 'aanbod' }))

  if (lijst.status !== 'open' || regels.length === 0) {
    return (
      <>
        <TerugLink titel="Terug naar het aanbod" onTerug={() => ga({ scherm: 'aanbod' })} />
        <main className="sectie">
          <p className="tekst">{lijst.status === 'open' ? 'Je hebt nog geen flessen gekozen.' : 'De avond is gesloten; bestellen kan niet meer.'}</p>
        </main>
      </>
    )
  }

  const nu = nuUtc()
  const gekozen = levermoment(staat, staat.levering) ? staat.levering : null
  // Brengen kan alleen naar een adres. Zonder adres vraagt de app er eerst om; dat scherm is nog niet getekend.
  const opties = levermomenten(staat).map((l) => ({ id: l.soort, woord: LEVER_WOORD[l.soort], zin: leverZin(l.soort, l.wanneer) }))

  const betaal = () => {
    if (!gekozen) return
    if (tekorten(staat).length > 0) {
      ga({ scherm: 'net-op' })
      return
    }
    const bestellingId = `b-${bonNummer(staat.volgendeBon)}`
    dispatch({
      type: 'bestel', lidId: LID, levering: gekozen, door: 'lid', nu,
      regels: regels.map((r) => ({ wijnId: r.wijn.wijnId, aantal: r.aantal })),
    })
    ga({ scherm: 'bon', bestellingId })
  }

  return (
    <>
      <TerugLink titel="Terug naar het aanbod" onTerug={naarAanbod} />
      <main>
        <h1 className="sr">Je bon</h1>
        <Bon
          kop={`Nº ${bonNummer(staat.volgendeBon)} · ${kortDatum(nu)} · ${tijd(nu)}`}
          tafel={voorbeeldLid.naam}
          regels={regels.map((r) => ({ sleutel: r.wijn.wijnId, aantal: r.aantal, naam: korteNaam(r.wijn), jaargang: r.wijn.jaargang, prijs: r.wijn.prijs }))}
          voet={<>Ik houd je flessen 15 minuten vast. — Marc</>}
        />
        <section className="sectie bestel-keuze" style={{ paddingTop: 26 }}>
          <h2 className="label">Hoe krijg je ze?</h2>
          <Keuze
            label="Brengen of halen"
            vorm={opties.length === 2 ? 'split' : 'banden'}
            gekozen={gekozen}
            onKies={(id) => dispatch({ type: 'levering', levering: id as LeverSoort })}
            opties={opties}
          />
          {gekozen === 'brengen' && voorbeeldLid.adres && <p className="tekst klein gedempt">Naar {adresRegel(voorbeeldLid.adres)}.</p>}
          <p className="uitleg-voorbeeld">Voorbeeld: de zin op de bon is in de stem van Marc; hij kiest zelf zijn woorden.</p>
        </section>
      </main>
      <Onderkant
        ga={ga}
        knop={<Hoofdknop goud disabled={!gekozen} onClick={betaal}>{gekozen ? 'Betaal met iDEAL' : 'Kies breng of haal'}</Hoofdknop>}
      />
    </>
  )
}
