// Onderdelen die nieuw zijn in design-v3: de live-balk, een bericht van Marc en een gebeurtenis.
import { ArrowLeft } from 'lucide-react'
import { tijd } from '../opmaak'
import { useStaat } from '../staat'

/** Marcs avatar: zijn portret, rond. Het portret komt van marckookt.com; Marc levert nog een groter origineel. */
export function Avatar({ maat = 32 }: { maat?: number }) {
  return <img className="avatar" src="/marc/portret.jpg" alt="" width={maat} height={maat} aria-hidden />
}

interface LiveBalkProps {
  tekst: string
  rechts?: string
  onTerug?: () => void
  /** Voor Marc: goud gevuld met zwarte tekst. */
  marc?: boolean
}

/** Bovenaan op De avond, De veiling en Eenmaal andermaal. De stip knippert niet. */
export function LiveBalk({ tekst, rechts, onTerug, marc = false }: LiveBalkProps) {
  const [staat] = useStaat()
  const weg = !staat.verbinding
  const stip = staat.instellingen.levendig || marc
  return (
    <header className={marc ? 'live-balk marc' : 'live-balk'}>
      <div className="live-links">
        {onTerug && (
          <button type="button" className="live-terug" aria-label="Terug naar de avond" onClick={onTerug}>
            <ArrowLeft size={22} aria-hidden />
          </button>
        )}
        {stip && <span className={weg ? 'live-stip weg' : 'live-stip'} aria-hidden />}
        <span className="live-tekst">{weg ? 'VERBINDING HERSTELLEN…' : tekst}</span>
      </div>
      {rechts && !weg && <span className="live-rechts">{rechts}</span>}
    </header>
  )
}

/** Een bericht van Marc: avatar, zijn woorden en "MARC · 19:52" in goud. */
export function MarcBericht({ tekst, op, groot = false }: { tekst: string; op?: string; groot?: boolean }) {
  return (
    <div className={groot ? 'marc-bericht ruim' : 'marc-bericht'}>
      <Avatar maat={groot ? 40 : 32} />
      <div>
        <p className="marc-tekst">{tekst}</p>
        {op && <p className="marc-afzender">{groot ? '— ' : ''}MARC · {tijd(op)}</p>}
      </div>
    </div>
  )
}

/** Een gecentreerde regel tussen twee dunne lijnen. Nooit namen. */
export function Gebeurtenis({ tekst }: { tekst: string }) {
  return (
    <p className="gebeurtenis">
      <span>{tekst}</span>
    </p>
  )
}
