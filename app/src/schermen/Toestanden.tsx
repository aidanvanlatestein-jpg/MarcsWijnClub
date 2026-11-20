import { useState } from 'react'
import { MarcBericht } from '../onderdelen/Avond'
import { Betalen } from '../onderdelen/Betalen'
import { BonRegels } from '../onderdelen/Bon'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { Kop, VraagMarc } from '../onderdelen/Kop'
import { adresRegel, dagEnTijd, euro, nuUtc, tijd } from '../opmaak'
import type { Ga } from '../route'
import { levermoment, levermomenten, mandjeRegels, korteNaam, roepNaam, tekorten, useStaat, zoekBestelling } from '../staat'
import type { Bestelling, LeverSoort } from '../types'
import { voorbeeldBerichten, voorbeeldLid } from '../voorbeeld'
import { LEVER_WOORD, leverZin } from './Bestelling'

/**
 * Een bon na het bestellen (design-v4, "Betaald"). Open: Marc houdt de flessen vast tot de termijn en het lid
 * betaalt met iDEAL. Betaald: de bon met de stempel en hoe het lid de flessen krijgt. Verlopen: te laat betaald.
 * Een gewonnen fles komt hier ook terecht; na het betalen kies je brengen of halen.
 */
export function BonStatus({ bestellingId, ga }: { bestellingId: string; ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const b = zoekBestelling(staat, bestellingId)
  const poging = staat.betaling?.bestellingId === bestellingId ? staat.betaling : null
  // Net besteld: de betaalpagina gaat meteen open, zoals na een tik op "Betaal met iDEAL".
  const [betalen, setBetalen] = useState(() => Boolean(b && b.status === 'open' && b.soort === 'lijst' && !poging && Date.now() - new Date(b.aangemaakt).getTime() < 60_000))
  if (!b) return <Onbekend ga={ga} />

  const naarAanbod = () => ga({ scherm: 'aanbod' })
  const betaald = b.status === 'betaald'
  const mislukt = b.status === 'open' && poging && !poging.gelukt

  let kop = 'Betalen.'
  if (betaald) kop = 'Betaald.'
  else if (b.status === 'verlopen') kop = 'Vervallen.'
  else if (mislukt) kop = 'Niet betaald.'

  let knop = <Hoofdknop onClick={naarAanbod}>Terug naar het aanbod</Hoofdknop>
  if (b.status === 'open') knop = <Hoofdknop goud onClick={() => setBetalen(true)}>{mislukt ? 'Probeer opnieuw' : `Betaal ${euro(b.totaal)} met iDEAL`}</Hoofdknop>

  return (
    <>
      <main className="sectie bon-status" style={{ gap: 18 }}>
        <p className="label">{tijd(b.aangemaakt)} · Bestelling Nº {b.bon}</p>
        <h1 className={b.status === 'verlopen' ? 'eventkop spook' : 'eventkop'} style={{ fontSize: 'min(96px, 24vw)' }}>{kop}</h1>
        <div className="betaald-bon">
          <BonRegels
            fotos
            regels={b.regels.map((r) => ({ sleutel: r.wijnId, aantal: r.aantal, naam: r.naam, jaargang: r.jaargang, foto: r.foto, prijs: r.prijs, weg: b.status === 'verlopen' }))}
          />
          <div className="betaald-voet">
            <strong>{euro(b.totaal)}{betaald ? ' · iDEAL' : ''}</strong>
            {betaald && <span className="stempel papier">Betaald</span>}
          </div>
        </div>

        {b.status === 'open' && (
          <p className="tekst">
            {b.soort === 'lijst'
              ? `${mislukt ? 'Er is niets afgeschreven. ' : ''}Je flessen houd ik nog tot ${tijd(b.betaalVoor)} voor je vast.`
              : `${mislukt ? 'Er is niets afgeschreven. ' : ''}Betaal vóór ${dagEnTijd(b.betaalVoor)}.${b.soort === 'bieding' ? ' Daarna kies je: brengen of halen.' : ''}`}
          </p>
        )}
        {b.status === 'verlopen' && (
          <p className="tekst gedempt">Je betaalde niet op tijd. De flessen staan weer op tafel{staat.lijst.status === 'open' ? '; je kunt ze opnieuw kiezen' : ''}.</p>
        )}

        {betaald && <HoeJeZeKrijgt bestelling={b} />}
        {betaald && b.levering === 'brengen' && (
          <>
            <MarcBericht tekst={voorbeeldBerichten.betaald} />
            <p className="uitleg-voorbeeld">Voorbeeldtekst. Marc schrijft dit bericht zelf.</p>
          </>
        )}
      </main>
      <Onderkant
        ga={ga}
        knop={betaald && !b.levering ? undefined : knop}
        onder={betaald ? <VraagMarc tekst={`Hoi Marc, over bestelling ${b.bon}: `} label="Iets wijzigen? Vraag Marc" className="tekstlink zonder-lijn gedempt midden" /> : undefined}
      />
      {betalen && b.status === 'open' && (
        <Betalen
          bedrag={b.totaal}
          onSluit={() => setBetalen(false)}
          onKlaar={(gelukt) => {
            setBetalen(false)
            dispatch({ type: 'betaal', bestellingId: b.bestellingId, gelukt, nu: nuUtc() })
          }}
        />
      )}
    </>
  )
}

/** Brengen of halen, met wanneer en waar. Bij een gewonnen fles kiest het lid dat hier, na het betalen. */
function HoeJeZeKrijgt({ bestelling: b }: { bestelling: Bestelling }) {
  const [staat, dispatch] = useStaat()
  const moment = levermoment(staat, b.levering)
  if (!b.levering || !moment) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="label">Hoe wil je hem krijgen?</h2>
        <Keuze
          label="Brengen of halen"
          vorm={levermomenten(staat).length === 2 ? 'split' : 'banden'}
          gekozen={null}
          onKies={(id) => dispatch({ type: 'leveringBieding', bestellingId: b.bestellingId, levering: id as LeverSoort })}
          opties={levermomenten(staat).map((l) => ({ id: l.soort, woord: LEVER_WOORD[l.soort], zin: leverZin(l.soort, l.wanneer) }))}
        />
      </section>
    )
  }
  const waar = moment.soort === 'brengen' ? adresRegel(voorbeeldLid.adres) : moment.waar
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 className="label">Hoe je ze krijgt</h2>
      <div className="lever-rij lijn-boven lijn-onder">
        <strong>{LEVER_WOORD[moment.soort]}</strong>
        <span>{moment.wanneer}{waar ? `, ${waar}` : ''}</span>
      </div>
    </section>
  )
}

/** Toestand: een wijn is net op terwijl je bestelde. Er is niets besteld. */
export function NetOp({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const op = tekorten(staat)
  const regels = mandjeRegels(staat)
  if (op.length === 0) {
    return (
      <>
        <Kop />
        <main className="sectie"><p className="tekst">Alles wat je koos is er nog.</p></main>
        <Onderkant ga={ga} knop={<Hoofdknop onClick={() => ga({ scherm: 'bestelling' })}>Naar de bon</Hoofdknop>} />
      </>
    )
  }
  const namen = op.map((w) => `de ${roepNaam(w).toLowerCase()}`)
  const kop = namen.length === 1 ? `${namen[0]} is net op.` : `${namen.slice(0, -1).join(', ')} en ${namen.at(-1)} zijn net op.`
  const allesWeg = op.every((w) => w.voorraad === 0)
  const blijft = regels.some((r) => r.wijn.voorraad > 0)
  const knop = !blijft ? 'Terug naar het aanbod' : allesWeg ? 'Verder zonder' : 'Bestel wat er nog is'

  return (
    <>
      <Kop />
      <main className="sectie" style={{ gap: 16 }}>
        <h1 className="goud" style={{ fontSize: 48, fontWeight: 700, lineHeight: '43px', textTransform: 'uppercase' }}>{kop}</h1>
        <div className="bon-klein" style={{ display: 'block' }}>
          <BonRegels
            regels={regels.map((r) => ({
              sleutel: r.wijn.wijnId,
              aantal: r.aantal,
              naam: korteNaam(r.wijn),
              jaargang: r.wijn.jaargang,
              prijs: r.wijn.prijs,
              weg: r.aantal > r.wijn.voorraad,
            }))}
          />
        </div>
        <p className="tekst gedempt">
          Iemand was je net voor. Er is niets besteld en niets betaald.
          {op.some((w) => w.voorraad > 0) && ` Van ${op.filter((w) => w.voorraad > 0).map((w) => `de ${korteNaam(w)} zijn er nog ${w.voorraad}`).join(', ')}.`}
        </p>
      </main>
      <Onderkant
        ga={ga}
        knop={
          <Hoofdknop
            onClick={() => {
              dispatch({ type: 'pasMandjeAan' })
              ga({ scherm: blijft ? 'bestelling' : 'aanbod' })
            }}
          >
            {knop}
          </Hoofdknop>
        }
      />
    </>
  )
}

function Onbekend({ ga }: { ga: Ga }) {
  return (
    <>
      <Kop />
      <main className="sectie"><p className="tekst">Deze bon is er niet (meer).</p></main>
      <Onderkant ga={ga} knop={<Hoofdknop onClick={() => ga({ scherm: 'aanbod' })}>Naar het aanbod</Hoofdknop>} />
    </>
  )
}
