import { useState } from 'react'
import { nuUtc, tijd } from '../opmaak'
import type { Ga } from '../route'
import { beginStaat, klaar, mandjeRegels, opTafel, useStaat, veilingVanAvond } from '../staat'
import { Blad } from './Blad'

interface Proef {
  label: string
  uitleg: string
  doe: () => void
}

/**
 * De gouden balk bovenaan: dit is een voorbeeld, er wordt niets besteld. Een tik opent
 * de proefacties waarmee je laat zien wat er gebeurt als een ander lid iets doet.
 */
export function Voorbeeldbalk({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [open, setOpen] = useState(false)

  const proeven: Proef[] = []
  const { lijst } = staat
  const lijstOpen = lijst.status === 'open'
  // Liefst een wijn die het lid nu gekozen heeft, anders de wijn op tafel met de meeste flessen.
  const gekozen = mandjeRegels(staat).find((r) => r.wijn.voorraad > 0)?.wijn
  const veelste = opTafel(staat).filter((w) => w.voorraad > 0).sort((a, b) => b.voorraad - a.voorraad)[0]
  const opTeKopen = gekozen ?? veelste
  const veiling = veilingVanAvond(staat)
  const lopend = veiling?.biedingStatus === 'open' ? veiling : undefined
  const volgende = klaar(staat)[0]

  if (!staat.ingelogd) {
    proeven.push({ label: 'Sla inloggen over', uitleg: 'Meteen naar de aankondiging', doe: () => { dispatch({ type: 'inloggen' }); ga({ scherm: 'aanbod' }) } })
  }
  if (lijst.fase !== 'gesloten') {
    proeven.push({
      label: 'Spring naar de lopende avond',
      uitleg: 'Marc is 22 minuten bezig: drie wijnen op tafel, wijn G staat nog klaar (scherm 03 en 15)',
      doe: () => { dispatch({ type: 'inloggen' }); dispatch({ type: 'springNaarAvond', nu: nuUtc() }); ga({ scherm: 'aanbod' }) },
    })
  }
  if (lijst.fase === 'live' && volgende) {
    proeven.push({
      label: `Marc zet wijn ${volgende.letter} op tafel`,
      uitleg: 'De wijn verschijnt onderaan de feed als nieuwste',
      doe: () => { dispatch({ type: 'zetOpTafel', wijnId: volgende.wijnId, nu: nuUtc() }); ga({ scherm: 'aanbod' }) },
    })
  }
  if (lijst.fase === 'live' && opTeKopen) {
    proeven.push({
      label: `Een ander lid koopt wijn ${opTeKopen.letter} op`,
      uitleg: gekozen ? 'Tik daarna op Bestel: zo zie je wat er gebeurt als een wijn net op is' : 'In de feed verschijnt "wijn is op"',
      doe: () => dispatch({ type: 'anderKooptOp', wijnId: opTeKopen.wijnId, nu: nuUtc() }),
    })
  }
  if (lopend && !lopend.geopend && lijst.fase === 'live') {
    proeven.push({
      label: 'Open de veiling nu',
      uitleg: `In plaats van om ${tijd(lijst.veilingBegin)}. Marc kan dit ook in zijn beheer`,
      doe: () => { dispatch({ type: 'openVeiling', wijnId: lopend.wijnId, nu: nuUtc() }); ga({ scherm: 'veiling', wijnId: lopend.wijnId }) },
    })
  }
  if (lopend && lijst.fase !== 'aangekondigd') {
    proeven.push({
      label: 'Een ander lid biedt hoger',
      uitleg: lopend.mijnBodIsHoogste ? 'Je krijgt een melding dat je overboden bent' : 'Er komt een bod bij in de biedlog',
      doe: () => { dispatch({ type: 'anderBiedt', wijnId: lopend.wijnId, nu: nuUtc() }); ga({ scherm: 'veiling', wijnId: lopend.wijnId }) },
    })
    proeven.push({
      label: 'Spring naar de laatste minuten',
      uitleg: 'Eenmaal, andermaal: de hamer valt over 1:40, tenzij er nog geboden wordt',
      doe: () => { dispatch({ type: 'laatsteMinuten', wijnId: lopend.wijnId, nu: nuUtc() }); ga({ scherm: 'veiling', wijnId: lopend.wijnId }) },
    })
    proeven.push({
      label: 'Laat de hamer vallen',
      uitleg: lopend.mijnBodIsHoogste ? 'Jij hebt het hoogste bod, dus jij wint (VER-KOCHT.)' : 'Wie het hoogste bod heeft, wint. Bied eerst zelf om te winnen',
      doe: () => { dispatch({ type: 'sluitBieding', wijnId: lopend.wijnId, nu: nuUtc() }); ga({ scherm: 'veiling', wijnId: lopend.wijnId }) },
    })
  }
  if (lijstOpen && lijst.fase === 'live') {
    proeven.push({
      label: 'Sluit de avond',
      uitleg: 'Wie besteld heeft, krijgt een betaalverzoek. Daarna toont de app de terugblik',
      doe: () => { dispatch({ type: 'sluitLijst', nu: nuUtc() }); ga({ scherm: 'aanbod' }) },
    })
  }
  if (lijst.fase === 'live') {
    proeven.push({
      label: staat.verbinding ? 'Verbinding valt weg' : 'Verbinding is terug',
      uitleg: 'De live-balk zegt dan "verbinding herstellen". Bestellen en bieden blijven werken',
      doe: () => dispatch({ type: 'verbinding', ja: !staat.verbinding }),
    })
  }
  proeven.push({ label: 'Open het beheer van Marc', uitleg: 'Wijn klaarzetten, de avond presenteren, bestellingen', doe: () => ga({ scherm: 'beheer', tab: lijst.fase === 'live' ? 'avond' : 'wijn' }) })
  proeven.push({
    label: 'Begin opnieuw',
    uitleg: 'Alles terug naar het begin, met inloggen',
    doe: () => { dispatch({ type: 'opnieuw', staat: beginStaat() }); ga({ scherm: 'welkom' }) },
  })

  return (
    <>
      <button type="button" className="voorbeeld" onClick={() => setOpen(true)} aria-haspopup="dialog">
        Voorbeeld · er wordt niets besteld · probeer <span aria-hidden>▾</span>
      </button>
      {open && (
        <Blad titel="Probeer het voorbeeld" onSluit={() => setOpen(false)}>
          <p className="tekst klein gedempt">
            Alle wijnen, prijzen, leden en teksten zijn voorbeelden. Er wordt niets besteld, betaald of verstuurd.
            Hiermee laat je zien wat er gebeurt als iemand anders iets doet.
          </p>
          <h3 className="label" style={{ marginTop: 4 }}>Open beslissingen uit design-v3</h3>
          <div className="instellingen">
            <Schakelaar
              aan={staat.instellingen.bijnamen}
              onWissel={(aan) => dispatch({ type: 'instelling', naam: 'bijnamen', aan })}
              label="Bijnamen in de biedlog"
              uitleg="Aan: Bieder 7. Uit: alleen bedragen en tijden, zoals het plan"
            />
            <Schakelaar
              aan={staat.instellingen.levendig}
              onWissel={(aan) => dispatch({ type: 'instelling', naam: 'levendig', aan })}
              label="Live-stip, Net op tafel en de klok"
              uitleg="Uit: zo rustig als het plan, zonder klok in de laatste twee minuten"
            />
          </div>
          <h3 className="label">Wat er gebeurt</h3>
          <div className="actie-lijst">
            {proeven.map((p) => (
              <button key={p.label} type="button" onClick={() => { setOpen(false); p.doe() }}>
                <strong>{p.label}</strong>
                <span>{p.uitleg}</span>
              </button>
            ))}
          </div>
        </Blad>
      )}
    </>
  )
}

function Schakelaar({ aan, onWissel, label, uitleg }: { aan: boolean; onWissel: (aan: boolean) => void; label: string; uitleg: string }) {
  return (
    <button type="button" role="switch" aria-checked={aan} className="schakelaar" onClick={() => onWissel(!aan)}>
      <span className="schakelaar-tekst">
        <strong>{label}</strong>
        <span>{uitleg}</span>
      </span>
      <span className="schakelaar-stand" aria-hidden>{aan ? 'AAN' : 'UIT'}</span>
    </button>
  )
}
