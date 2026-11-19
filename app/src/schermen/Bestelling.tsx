import { Bon } from '../onderdelen/Bon'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { TerugLink } from '../onderdelen/Kop'
import { euro, kortDatum, nuUtc, tijd } from '../opmaak'
import { terug, type Ga } from '../route'
import { bonNummer, LID, mandjeRegels, plus, tekorten, useStaat } from '../staat'
import { voorbeeldLid } from '../voorbeeld'

/**
 * 04 Bestelling: de bon. Het ontwerp laat hier "Betaal met iDEAL" zien; het pilotplan wint
 * bij regels: bestellen is bindend en kost niets, betalen volgt als de lijst sluit.
 * Daarom is de hoofdknop "Bestel" en kies je een afhaalpunt in plaats van brengen of halen.
 */
export function Bestelling({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const regels = mandjeRegels(staat)
  const { lijst } = staat
  const naarKaart = () => terug(() => ga({ scherm: 'aanbod' }))

  if (lijst.status !== 'open' || regels.length === 0) {
    return (
      <>
        <TerugLink titel="Terug naar de avond" onTerug={() => ga({ scherm: 'aanbod' })} />
        <main className="sectie">
          <p className="tekst">{lijst.status === 'open' ? 'Je hebt nog geen flessen gekozen.' : 'De lijst is gesloten; bestellen kan niet meer.'}</p>
        </main>
        <Onderkant ga={ga} tab="aanbod" />
      </>
    )
  }

  const nu = nuUtc()
  const gekozen = lijst.afhaalpunten.some((a) => a.afhaalpuntId === staat.levering) ? staat.levering : null
  const totaal = regels.reduce((som, r) => som + r.aantal * r.wijn.prijs, 0)

  const bestel = () => {
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
    ga({ scherm: 'besteld', bestellingId })
  }

  return (
    <>
      <TerugLink titel="Terug naar de avond" onTerug={naarKaart} />
      <main>
        <h1 className="sr">Je bestelling</h1>
        {/* Het afhaalpunt staat boven de bon: zo staat het in beeld als je op Bestel tikt, ook op een kleine telefoon. */}
        <section className="sectie" style={{ paddingTop: 4, paddingBottom: 14 }}>
          <h2 className="label">{gekozen ? 'Waar haal je ze?' : 'Waar haal je ze? Kies een afhaalpunt'}</h2>
          <Keuze
            label="Afhaalpunt"
            vorm={lijst.afhaalpunten.length === 2 ? 'split' : 'banden'}
            gekozen={gekozen}
            onKies={(id) => dispatch({ type: 'levering', afhaalpuntId: id })}
            opties={lijst.afhaalpunten.map((a) => ({ id: a.afhaalpuntId, woord: a.naam, zin: a.wanneer }))}
          />
        </section>
        <Bon
          kop={`Nº ${bonNummer(staat.volgendeBon)} · ${kortDatum(nu)} · ${tijd(nu)}`}
          tafel={voorbeeldLid.naam}
          regels={regels.map((r) => ({ sleutel: r.wijn.wijnId, aantal: r.aantal, letter: r.wijn.letter, naam: r.wijn.naam, jaargang: r.wijn.jaargang, prijs: r.wijn.prijs }))}
          voet={<>Bindend. Je betaalt als de lijst sluit, in één keer, binnen 48 uur: vóór {kortDatum(plus(lijst.openTot, 48 * 3_600_000))}.</>}
        />
        <div style={{ height: 24 }} />
      </main>
      <Onderkant
        ga={ga}
        tab="aanbod"
        knop={<Hoofdknop disabled={!gekozen} onClick={bestel}>Bestel · {euro(totaal)}</Hoofdknop>}
      />
    </>
  )
}
