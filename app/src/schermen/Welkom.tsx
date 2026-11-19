import { useRef, useState } from 'react'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { Kop } from '../onderdelen/Kop'
import type { Ga } from '../route'
import { useStaat } from '../staat'
import { voorbeeldLid } from '../voorbeeld'

const LENGTE = 6

/**
 * 01 Eerste login. In de echte app stuurt Cognito de code per e-mail; hier werkt elke code
 * van zes cijfers. Inloggen wordt niet zelf gebouwd.
 */
export function Welkom({ ga }: { ga: Ga }) {
  const [, dispatch] = useStaat()
  const [code, setCode] = useState('')
  const [achttien, setAchttien] = useState(false)
  const [akkoord, setAkkoord] = useState(false)
  const [opnieuw, setOpnieuw] = useState(false)
  const [focus, setFocus] = useState(false)
  const invoer = useRef<HTMLInputElement>(null)
  const klaar = code.length === LENGTE && achttien && akkoord

  const binnen = () => {
    if (!klaar) return
    dispatch({ type: 'inloggen' })
    ga({ scherm: 'tip' })
  }

  return (
    <main className="sectie" style={{ gap: 22, paddingTop: 48, minHeight: '100dvh' }}>
      <h1 className="logo-groot">
        <span className="marc">Marc</span>
        <span className="kookt">Kookt</span>
        <small>Wijnclub · op uitnodiging</small>
      </h1>
      <p className="tekst" style={{ fontSize: 19, lineHeight: '25px' }}>
        Welkom, {voorbeeldLid.naam}. Ik heb je een code gemaild op {voorbeeldLid.email}.
      </p>

      <div className="code" onClick={() => invoer.current?.focus()}>
        <label className="sr" htmlFor="code">Code uit de e-mail, zes cijfers</label>
        <input
          id="code"
          ref={invoer}
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LENGTE}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          // Plakken van een hele code vult alle vakken; alles behalve cijfers valt weg.
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, LENGTE))}
          onKeyDown={(e) => e.key === 'Enter' && binnen()}
        />
        {Array.from({ length: LENGTE }, (_, i) => (
          <span key={i} className={focus && i === Math.min(code.length, LENGTE - 1) ? 'code-vak actief' : 'code-vak'} aria-hidden>
            <span className={code[i] ? undefined : 'leeg'}>{code[i] ?? '–'}</span>
            <i />
          </span>
        ))}
      </div>

      <button type="button" className="tekstlink gedempt" style={{ alignSelf: 'flex-start' }} onClick={() => setOpnieuw(true)}>
        {opnieuw ? 'Nieuwe code verstuurd' : 'Geen code? Stuur opnieuw'} <span aria-hidden>↗</span>
      </button>

      <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <Vinkje aan={achttien} onWissel={() => setAchttien((a) => !a)}>Ik ben 18 jaar of ouder</Vinkje>
        <Vinkje aan={akkoord} onWissel={() => setAkkoord((a) => !a)}>Ik ga akkoord met de clubvoorwaarden en de privacyverklaring</Vinkje>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
        <Hoofdknop disabled={!klaar} onClick={binnen}>Kom binnen</Hoofdknop>
        <p className="uitleg-voorbeeld">
          Daarna: zet de wijnclub op je beginscherm en zet meldingen aan. Voorbeeld: elke code van zes cijfers werkt.
        </p>
      </div>
    </main>
  )
}

function Vinkje({ aan, onWissel, children }: { aan: boolean; onWissel: () => void; children: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={aan} className="vinkje-rij" onClick={onWissel}>
      <span className="vinkje" aria-hidden>{aan ? '✓' : ''}</span>
      <span>{children}</span>
    </button>
  )
}

/** Eenmalige tip na het inloggen: op het beginscherm zetten en meldingen aanzetten. */
export function Tip({ ga }: { ga: Ga }) {
  const [, dispatch] = useStaat()
  const verder = () => {
    dispatch({ type: 'tipGezien' })
    ga({ scherm: 'aanbod' })
  }
  return (
    <>
      <Kop />
      <main>
        <div className="masthead">
          <h1>
            <span className="groot spook">Nog</span>
            <span className="groot">één ding</span>
          </h1>
        </div>
        <ol className="sectie stappen" style={{ listStyle: 'none', margin: 0 }}>
          <li className="stap">
            <span className="stap-nummer" aria-hidden>01</span>
            <div>
              <h2>Zet de club op je beginscherm</h2>
              <p className="tekst gedempt">
                iPhone: tik in Safari op Deel en dan op Zet op beginscherm. Android: tik in Chrome op het menu en dan op
                Toevoegen aan startscherm.
              </p>
            </div>
          </li>
          <li className="stap">
            <span className="stap-nummer" aria-hidden>02</span>
            <div>
              <h2>Zet meldingen aan</h2>
              <p className="tekst gedempt">
                Zo weet je het als er een nieuwe lijst is of als iemand je overbiedt. Op een iPhone kan dat pas als de
                club op je beginscherm staat.
              </p>
            </div>
          </li>
        </ol>
      </main>
      <Onderkant ga={ga} knop={<Hoofdknop onClick={verder}>Naar de kaart</Hoofdknop>} />
    </>
  )
}
