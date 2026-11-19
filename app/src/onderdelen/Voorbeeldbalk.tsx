import { useState } from 'react'
import { nuUtc } from '../opmaak'
import type { Ga } from '../route'
import { beginStaat, gesorteerd, mandjeRegels, useStaat } from '../staat'
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
  const lijstOpen = staat.lijst.status === 'open'
  // Liefst een wijn die het lid nu gekozen heeft, anders de wijn met de meeste flessen.
  const gekozen = mandjeRegels(staat).find((r) => r.wijn.voorraad > 0)?.wijn
  const veelste = gesorteerd(staat.lijst.wijnen).filter((w) => w.voorraad > 0).sort((a, b) => b.voorraad - a.voorraad)[0]
  const opTeKopen = gekozen ?? veelste
  const bieding = staat.biedingen.find((b) => b.biedingStatus === 'open')

  if (!staat.ingelogd) {
    proeven.push({ label: 'Sla inloggen over', uitleg: 'Meteen naar de kaart', doe: () => { dispatch({ type: 'inloggen' }); ga({ scherm: 'aanbod' }) } })
  }
  if (lijstOpen && opTeKopen) {
    proeven.push({
      label: `Een ander lid koopt wijn ${opTeKopen.letter} op`,
      uitleg: gekozen ? 'Tik daarna op Bestel: zo zie je wat er gebeurt als een wijn net op is' : 'De wijn staat daarna op uitverkocht',
      doe: () => dispatch({ type: 'anderKooptOp', wijnId: opTeKopen.wijnId, nu: nuUtc() }),
    })
  }
  if (lijstOpen) {
    proeven.push({
      label: 'Sluit de lijst',
      uitleg: 'Wie besteld heeft, krijgt een betaalverzoek. Betalen doe je onder Flessen',
      doe: () => { dispatch({ type: 'sluitLijst', nu: nuUtc() }); ga({ scherm: 'flessen' }) },
    })
  }
  if (bieding) {
    proeven.push({
      label: 'Een ander lid biedt hoger',
      uitleg: bieding.mijnBodIsHoogste ? 'Je krijgt een melding dat je overboden bent' : 'Het hoogste bod gaat omhoog',
      doe: () => { dispatch({ type: 'anderBiedt', wijnId: bieding.wijnId }); ga({ scherm: 'bieding', wijnId: bieding.wijnId }) },
    })
    proeven.push({
      label: 'Sluit de bieding',
      uitleg: bieding.mijnBodIsHoogste ? 'Jij hebt het hoogste bod, dus jij wint' : 'Wie het hoogste bod heeft, wint. Bied eerst zelf om te winnen',
      doe: () => {
        dispatch({ type: 'sluitBieding', wijnId: bieding.wijnId, nu: nuUtc() })
        ga(bieding.mijnBodIsHoogste ? { scherm: 'gewonnen', wijnId: bieding.wijnId } : { scherm: 'bieding', wijnId: bieding.wijnId })
      },
    })
  }
  proeven.push({ label: 'Open het beheer van Marc', uitleg: 'Wijn invoeren, de lijst sluiten, bestellingen en de paklijst', doe: () => ga({ scherm: 'beheer' }) })
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
