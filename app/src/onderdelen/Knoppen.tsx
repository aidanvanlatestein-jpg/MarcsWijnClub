import { ArrowRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { bedrag, euro, flessen, heelBedrag } from '../opmaak'
import type { Ga } from '../route'
import { mandjeRegels, useStaat } from '../staat'
import { Tabbalk, type Tab } from './Tabbalk'

interface HoofdknopProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Goud alleen waar geld weggaat: betalen. */
  goud?: boolean
  icoon?: ReactNode
}

/** Wit vlak over de volle breedte, label links en een pijl rechts. Eén per scherm. */
export function Hoofdknop({ goud = false, icoon, className = '', children, type = 'button', ...rest }: HoofdknopProps) {
  return (
    <button type={type} className={`hoofdknop${goud ? ' goud' : ''} ${className}`.trim()} {...rest}>
      <span>{children}</span>
      {icoon ?? <ArrowRight size={26} aria-hidden />}
    </button>
  )
}

/** € klein en grijs, het getal groot. De grootte komt uit de omgeving. */
export function GrootBedrag({ centen, heel = false }: { centen: number; heel?: boolean }) {
  return (
    <span className="bedrag-groot">
      <span className="eur">€</span>
      <span className="getal">{heel ? heelBedrag(centen) : bedrag(centen)}</span>
    </span>
  )
}

export function Prijs({ centen }: { centen: number }) {
  return (
    <p className="prijs">
      <span className="eur">€</span>
      <span className="getal">{bedrag(centen)}</span>
      <span className="per">/ FLES</span>
    </p>
  )
}

export function Stippellijn({ zwart = false }: { zwart?: boolean }) {
  return <div className={zwart ? 'stippellijn zwart' : 'stippellijn'} role="presentation" />
}

/** Verschijnt zodra er een fles gekozen is: aantal en totaal, en de knop naar de bon. */
function Keukenbon({ onBestel }: { onBestel: () => void }) {
  const [staat] = useStaat()
  const regels = mandjeRegels(staat)
  const aantal = regels.reduce((som, r) => som + r.aantal, 0)
  const totaal = regels.reduce((som, r) => som + r.aantal * r.wijn.prijs, 0)
  return (
    <div className="keukenbon">
      <div className="kartel-boven" aria-hidden />
      <div className="keukenbon-papier">
        <div aria-live="polite">
          <div className="bon-label">BON · {flessen(aantal).toUpperCase()}</div>
          <div className="bon-totaal">{euro(totaal)}</div>
        </div>
        <button type="button" className="bestel" onClick={onBestel}>
          BESTEL <ArrowRight size={20} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** Wat onderaan blijft staan: de keukenbon of de hoofdknop, en de tabs. */
export function Onderkant({ ga, tab, knop, bon = false }: { ga: Ga; tab?: Tab; knop?: ReactNode; bon?: boolean }) {
  const [staat] = useStaat()
  const toonBon = bon && staat.lijst.status === 'open' && mandjeRegels(staat).length > 0
  return (
    <div className="onderkant">
      {toonBon && <Keukenbon onBestel={() => ga({ scherm: 'bestelling' })} />}
      {knop && <div className="hoofdknop-zone">{knop}</div>}
      {tab && <Tabbalk actief={tab} onKies={(t) => ga({ scherm: t })} />}
    </div>
  )
}
