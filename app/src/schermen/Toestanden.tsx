import { useState } from 'react'
import { Betalen } from '../onderdelen/Betalen'
import { BonRegels } from '../onderdelen/Bon'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { Kop } from '../onderdelen/Kop'
import { dagEnTijd, euro, flessen, nuUtc } from '../opmaak'
import type { Ga } from '../route'
import { afhaalpunt, betaalVoor, mandjeRegels, tekorten, useStaat } from '../staat'

/** Na het bestellen: de bon staat, betalen volgt als de lijst sluit. */
export function Besteld({ bestellingId, ga }: { bestellingId: string; ga: Ga }) {
  const [staat] = useStaat()
  const b = staat.bestellingen.find((x) => x.bestellingId === bestellingId)
  if (!b) return <Onbekend ga={ga} />
  const punt = afhaalpunt(staat, b.levering)
  const aantal = b.regels.reduce((som, r) => som + r.aantal, 0)
  return (
    <>
      <Kop />
      <main className="sectie" style={{ gap: 18 }}>
        <h1 className="groot" style={{ fontSize: 'min(96px, 24vw)' }}>Besteld.</h1>
        <div className="bon-klein">
          <div>
            <strong>BON Nº {b.bon}</strong>
            <span>{flessen(aantal)} · {euro(b.totaal)}{punt ? ` · ${punt.naam}` : ''}</span>
          </div>
          <span className="stempel inkt">Besteld</span>
        </div>
        <p className="tekst">
          Je bestelling is bindend. Als de lijst sluit, krijg je een betaalverzoek voor alles wat je van deze lijst
          bestelde. Je betaalt dan in één keer, vóór {dagEnTijd(betaalVoor(staat, b))}.
        </p>
        {punt && <p className="tekst gedempt">Ophalen: {punt.naam}, {punt.wanneer.toLowerCase()}.</p>}
        <button type="button" className="tekstlink" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'aanbod' })}>
          Bijbestellen →
        </button>
      </main>
      <Onderkant ga={ga} tab="aanbod" knop={<Hoofdknop onClick={() => ga({ scherm: 'flessen' })}>Naar mijn flessen</Hoofdknop>} />
    </>
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
        <Onderkant ga={ga} tab="aanbod" knop={<Hoofdknop onClick={() => ga({ scherm: 'bestelling' })}>Naar de bon</Hoofdknop>} />
      </>
    )
  }
  const letters = op.map((w) => w.letter)
  const kop = letters.length === 1 ? `Wijn ${letters[0]} is net op.` : `Wijn ${letters.slice(0, -1).join(', ')} en ${letters.at(-1)} zijn net op.`
  const allesWeg = op.every((w) => w.voorraad === 0)
  const blijft = regels.some((r) => r.wijn.voorraad > 0)
  const knop = !blijft ? 'Terug naar de avond' : allesWeg ? `Bestel zonder wijn ${letters.join(' en ')}` : 'Bestel wat er nog is'

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
              letter: r.wijn.letter,
              naam: r.wijn.naam,
              jaargang: r.wijn.jaargang,
              prijs: r.wijn.prijs,
              weg: r.aantal > r.wijn.voorraad,
            }))}
          />
        </div>
        <p className="tekst gedempt">
          Iemand was je net voor. Je bestelling is niet doorgegaan.
          {op.some((w) => w.voorraad > 0) && ` Van ${op.filter((w) => w.voorraad > 0).map((w) => `wijn ${w.letter} zijn er nog ${w.voorraad}`).join(', ')}.`}
        </p>
      </main>
      <Onderkant
        ga={ga}
        tab="aanbod"
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

/** Terug van de betaalpagina: betaald, of niet betaald. */
export function Betaling({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [betalen, setBetalen] = useState(false)
  const poging = staat.betaling
  if (!poging) return <Onbekend ga={ga} />
  const bestellingen = staat.bestellingen.filter((b) => poging.bestellingIds.includes(b.bestellingId))
  const aantal = bestellingen.reduce((som, b) => som + b.regels.reduce((s, r) => s + r.aantal, 0), 0)
  const eerste = bestellingen[0]
  const punt = afhaalpunt(staat, eerste?.levering ?? null)
  const bieding = eerste?.soort === 'bieding'
  const bonnen = bestellingen.map((b) => b.bon).join(', ')
  const nogOpen = bestellingen.filter((b) => b.status === 'open')

  return (
    <>
      <Kop />
      <main className="sectie" style={{ gap: 16 }}>
        <h1 className={poging.gelukt ? 'groot' : 'groot'} style={{ fontSize: 'min(96px, 24vw)' }}>
          {poging.gelukt ? 'Betaald.' : 'Niet betaald.'}
        </h1>
        <div className="bon-klein">
          <div>
            <strong>BON Nº {bonnen}</strong>
            <span>{flessen(aantal)} · {euro(poging.bedrag)}{punt ? ` · ${punt.naam}` : ''}</span>
          </div>
          {poging.gelukt && <span className="stempel papier">Betaald</span>}
        </div>
        {poging.gelukt ? (
          <p className="tekst">
            Dank je. {bieding ? 'Kies nu wat er met de fles gebeurt.' : punt ? `Je flessen liggen klaar in ${punt.naam}, ${punt.wanneer.toLowerCase()}.` : ''}
          </p>
        ) : (
          <p className="tekst gedempt">
            Er is niets afgeschreven. Je kunt opnieuw betalen{eerste ? ` tot ${dagEnTijd(betaalVoor(staat, eerste))}` : ''}.
          </p>
        )}
      </main>
      <Onderkant
        ga={ga}
        tab="flessen"
        knop={
          poging.gelukt ? (
            <Hoofdknop onClick={() => ga(bieding && eerste ? { scherm: 'gewonnen', wijnId: eerste.regels[0].wijnId } : { scherm: 'flessen' })}>
              {bieding ? 'Kies wat er met de fles gebeurt' : 'Naar mijn flessen'}
            </Hoofdknop>
          ) : nogOpen.length > 0 ? (
            <Hoofdknop goud onClick={() => setBetalen(true)}>Probeer opnieuw</Hoofdknop>
          ) : undefined
        }
      />
      {betalen && (
        <Betalen
          bedrag={nogOpen.reduce((som, b) => som + b.totaal, 0)}
          onSluit={() => setBetalen(false)}
          onKlaar={(gelukt) => {
            setBetalen(false)
            dispatch({ type: 'betaal', bestellingIds: nogOpen.map((b) => b.bestellingId), gelukt, nu: nuUtc() })
          }}
        />
      )}
    </>
  )
}

function Onbekend({ ga }: { ga: Ga }) {
  return (
    <>
      <Kop />
      <main className="sectie"><p className="tekst">Dit scherm is er niet meer.</p></main>
      <Onderkant ga={ga} tab="aanbod" />
    </>
  )
}
