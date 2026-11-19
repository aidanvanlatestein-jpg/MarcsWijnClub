// De flessenrij: voorraad en keuze in één rij, met een min- en een plusknop ernaast.
// De rij is een tekening. Een fles is te smal om met een duim te raken (bouwspecificatie, M2);
// kiezen gaat daarom met de twee knoppen van minstens 44 × 44 px.
import { Minus, Plus } from 'lucide-react'

const ZICHTBAAR = 12

interface Props {
  /** Flessen die nog te koop zijn, inclusief wat dit lid gekozen heeft. */
  vrij: number
  /** Flessen die al weg zijn: verkocht of door anderen vastgehouden. */
  weg: number
  gekozen: number
  onKies: (aantal: number) => void
  letter: string
  naam: string
  groot?: boolean
}

export function Flessenrij({ vrij, weg, gekozen, onKies, letter, naam, groot = false }: Props) {
  vrij = Math.max(0, vrij)
  const totaal = vrij + Math.max(0, weg)
  const teken = Math.min(totaal, ZICHTBAAR)
  const meer = totaal - teken
  const op = vrij === 0
  const kies = (n: number) => onKies(Math.max(0, Math.min(vrij, n)))
  const wijn = `wijn ${letter}, ${naam}`

  return (
    <div className={groot ? 'flessenkeuze groot' : 'flessenkeuze'} role="group" aria-label={`Aantal flessen van ${wijn}`}>
      <div className="flessenrij" aria-hidden>
        {Array.from({ length: teken }, (_, k) => {
          const i = k + 1
          const toestand = i <= gekozen ? 'gekozen' : i <= vrij ? 'vrij' : 'weg'
          return <span key={i} className={toestand === 'vrij' ? 'fles' : `fles ${toestand}`} />
        })}
        {meer > 0 && <span className="fles-meer">+ {meer}</span>}
      </div>
      <div className="flessenkeuze-onder">
        <RijStatus vrij={vrij} gekozen={gekozen} />
        {!op && (
          <div className="stappen-knoppen">
            <button type="button" className="stap-knop" aria-label={`Eén fles minder van ${wijn}`} disabled={gekozen <= 0} onClick={() => kies(gekozen - 1)}>
              <Minus size={groot ? 26 : 22} strokeWidth={2.5} aria-hidden />
            </button>
            <button type="button" className="stap-knop meer" aria-label={`Eén fles meer van ${wijn}`} disabled={gekozen >= vrij} onClick={() => kies(gekozen + 1)}>
              <Plus size={groot ? 26 : 22} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** De regel naast de knoppen: wat je gekozen hebt en wat er nog is. */
function RijStatus({ vrij, gekozen }: { vrij: number; gekozen: number }) {
  return (
    <p className="rij-status" aria-live="polite">
      {vrij <= 0 ? (
        <span>OP IS OP</span>
      ) : gekozen > 0 ? (
        <>
          <span className="goud">{gekozen} GEKOZEN</span>
          <span>{vrij - gekozen} OVER</span>
        </>
      ) : (
        <span>{vrij} OVER</span>
      )}
    </p>
  )
}
