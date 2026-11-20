import { ArrowUpRight, CircleCheck, ScanFace } from 'lucide-react'
import { useRef, useState } from 'react'
import { Hoofdknop } from '../onderdelen/Knoppen'
import { Woordmerk } from '../onderdelen/Kop'
import type { Ga } from '../route'
import { useStaat } from '../staat'
import { voorbeeldLid } from '../voorbeeld'
import { Avatar } from '../onderdelen/Avond'
import { ClubBlad, type Pagina } from './Marc'

const LENGTE = 6
/** De code die "Open mail" in het voorbeeld invult. Elke code van zes cijfers werkt. */
const VOORBEELDCODE = '482917'

type Stap = 'email' | 'code' | 'achttien' | 'faceid'

/**
 * Inloggen (design-v4): e-mailadres, de code uit de mail, 18 of ouder, en daarna eventueel Face ID.
 * Wie Face ID koos, ziet de volgende keer "Welkom terug". In de echte app doet Cognito dit met een
 * eenmalige code per e-mail en een passkey; inloggen wordt niet zelf gebouwd.
 */
export function Welkom({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [stap, setStap] = useState<Stap | null>(staat.faceId ? null : 'email')
  const [email, setEmail] = useState(voorbeeldLid.email ?? '')
  const [code, setCode] = useState('')
  const [nee, setNee] = useState(false)
  const [pagina, setPagina] = useState<Pagina | null>(null)
  const invoer = useRef<HTMLInputElement>(null)
  const binnen = (faceId?: boolean) => {
    dispatch({ type: 'inloggen', faceId })
    ga({ scherm: 'aanbod' })
  }

  if (stap === null) return <Terugkomen onBinnen={() => binnen()} onAnder={() => setStap('email')} />

  const voortgang = stap === 'email' ? 1 : stap === 'code' ? 2 : 3
  const zetCode = (waarde: string) => {
    const schoon = waarde.replace(/\D/g, '').slice(0, LENGTE)
    setCode(schoon)
    // Je gaat automatisch verder zodra de code klopt. In het voorbeeld klopt elke code van zes cijfers.
    if (schoon.length === LENGTE) window.setTimeout(() => setStap('achttien'), 350)
  }

  return (
    <main className="login">
      <div className="login-kop">
        <Woordmerk />
        {stap !== 'faceid' && (
          <div className="login-voortgang" role="progressbar" aria-label="Stap" aria-valuemin={1} aria-valuemax={3} aria-valuenow={voortgang}>
            {[1, 2, 3].map((i) => <span key={i} className={i <= voortgang ? 'klaar' : undefined} />)}
          </div>
        )}
      </div>

      {stap === 'email' && (
        <form className="login-stap" onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setStap('code') }}>
          <div className="marc-bericht">
            <Avatar maat={40} />
            <p className="tekst">Marc heeft je uitgenodigd voor zijn wijnclub.</p>
          </div>
          <label className="login-vraag" htmlFor="email">Welk e-mailadres gaf je aan Marc?</label>
          <input
            id="email"
            className="login-invoer"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Hoofdknop type="submit" disabled={!email.includes('@')}>Stuur mij een code</Hoofdknop>
          <p className="tekst klein gedempt">Geen wachtwoord nodig. Je krijgt een code van 6 cijfers in je mail.</p>
        </form>
      )}

      {stap === 'code' && (
        <div className="login-stap">
          <h1 className="login-vraag">De code staat in je mail</h1>
          <p className="tekst gedempt">Gestuurd naar {email}. Tik hieronder op de code, dan vult je telefoon hem in.</p>
          <div className="login-code" onClick={() => invoer.current?.focus()}>
            <label className="sr" htmlFor="code">Code uit de e-mail, zes cijfers</label>
            <input
              id="code"
              ref={invoer}
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LENGTE}
              autoFocus
              onChange={(e) => zetCode(e.target.value)}
            />
            <span className={code ? 'login-cijfers' : 'login-cijfers leeg'} aria-hidden>
              {(code.padEnd(LENGTE, '·')).replace(/^(.{3})/, '$1 ')}
            </span>
            {code.length === LENGTE && <span className="login-ingevuld"><CircleCheck size={18} aria-hidden /> Ingevuld</span>}
          </div>
          <div className="login-links">
            <button type="button" className="tekstlink zonder-lijn" onClick={() => zetCode(VOORBEELDCODE)}>
              Open mail <ArrowUpRight size={16} aria-hidden />
            </button>
            <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => { setCode(''); setStap('email') }}>
              Ander adres / opnieuw
            </button>
          </div>
          <p className="tekst klein gedempt">Je gaat automatisch verder zodra de code klopt.</p>
          <p className="uitleg-voorbeeld">Voorbeeld: er gaat geen mail weg. Elke code van zes cijfers werkt; Open mail vult er een in.</p>
        </div>
      )}

      {stap === 'achttien' && (
        <div className="login-stap vol">
          <h1 className="login-groot">Welkom, {voorbeeldLid.naam}.</h1>
          <p className="tekst">Ik verkoop wijn, dus ik moet het even vragen:</p>
          <p className="login-vraag">Ben je 18 of ouder?</p>
          {nee && <p className="tekst goud" role="alert">Dan kan ik je helaas geen wijn verkopen. Tot over een paar jaar!</p>}
          <div className="login-onder">
            <Hoofdknop onClick={() => setStap('faceid')}>Ja, kom binnen</Hoofdknop>
            <button type="button" className="knop-grijs midden" onClick={() => setNee(true)}>Nee</button>
            <p className="login-voet">
              Met ‘Ja’ ga je akkoord met de{' '}
              <button type="button" onClick={() => setPagina('voorwaarden')}>clubvoorwaarden</button> en de{' '}
              <button type="button" onClick={() => setPagina('privacy')}>privacyverklaring</button>.
            </p>
          </div>
        </div>
      )}

      {stap === 'faceid' && (
        <div className="login-stap vol">
          <div className="login-faceid">
            <span className="faceid-vak" aria-hidden><ScanFace size={64} strokeWidth={1.5} /></span>
            <h1 className="login-vraag" style={{ textAlign: 'center' }}>Voortaan zonder code?</h1>
            <p className="tekst" style={{ textAlign: 'center' }}>
              Dan kom je de volgende keer binnen met Face ID, net als bij je bank. Werkt alleen op deze telefoon.
            </p>
          </div>
          <div className="login-onder">
            <Hoofdknop icoon={<ScanFace size={26} aria-hidden />} onClick={() => binnen(true)}>Ja, gebruik Face ID</Hoofdknop>
            <button type="button" className="tekstlink zonder-lijn gedempt midden" onClick={() => binnen(false)}>Niet nu</button>
            <p className="uitleg-voorbeeld" style={{ textAlign: 'center' }}>In de echte app een passkey via Cognito; op Android heet het ontgrendelen met je vingerafdruk of gezicht.</p>
          </div>
        </div>
      )}
      {pagina && <ClubBlad pagina={pagina} onSluit={() => setPagina(null)} />}
    </main>
  )
}

/** Terugkomen met Face ID: één tik. */
function Terugkomen({ onBinnen, onAnder }: { onBinnen: () => void; onAnder: () => void }) {
  const [staat] = useStaat()
  const { lijst } = staat
  const veiling = staat.biedingen.some((b) => b.biedingStatus === 'open')
  let zin = 'Er is nu niets open. Je krijgt een melding bij de volgende avond.'
  if (lijst.status === 'open') zin = `Vanavond bij Marc: ${lijst.wijnen.length} wijnen${veiling ? ' en een veiling' : ''}.`
  return (
    <main className="terugkomen">
      <div className="terugkomen-foto">
        <img src="/marc/sfeer.jpg" alt="" />
        <span className="verloop" aria-hidden />
      </div>
      <div className="login-stap vol" style={{ paddingTop: 0 }}>
        <Woordmerk />
        <h1 className="login-groot">Welkom terug, {voorbeeldLid.naam}.</h1>
        <p className="tekst gedempt">{zin}</p>
        <div className="login-onder">
          <Hoofdknop icoon={<ScanFace size={26} aria-hidden />} onClick={onBinnen}>Kom binnen</Hoofdknop>
          <button type="button" className="tekstlink zonder-lijn gedempt midden" onClick={onAnder}>Niet {voorbeeldLid.naam}? Log in met e-mail</button>
        </div>
      </div>
    </main>
  )
}
