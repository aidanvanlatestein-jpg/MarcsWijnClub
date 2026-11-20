// De flessenrij: voorraad en keuze in één rij, met een min- en een plusknop ernaast.
// Design-v4 laat je op de flessen tikken; dat kan, maar een fles is te smal om zeker met een duim te
// raken (bouwspecificatie, M2). De twee knoppen van minstens 44 × 44 px blijven daarom de echte bediening,
// en voor schermlezers is de rij een tekening.
import { Minus, Plus } from 'lucide-react'

const ZICHTBAAR = 12

interface Props {
  /** Flessen die nog te koop zijn, inclusief wat dit lid gekozen heeft. */
  vrij: number
  /** Flessen die al weg zijn: verkocht of door anderen vastgehouden. */
  weg: number
  gekozen: number
  onKies: (aantal: number) => void
  naam: string
  groot?: boolean
  /** Onder de rij: "Tik op de flessen die je wilt" (wijnpagina). */
  uitleg?: boolean
}

export function Flessenrij({ vrij, weg, gekozen, onKies, naam, groot = false, uitleg = false }: Props) {
  vrij = Math.max(0, vrij)
  const totaal = vrij + Math.max(0, weg)
  const teken = Math.min(totaal, ZICHTBAAR)
  const meer = totaal - teken
  const op = vrij === 0
  const kies = (n: number) => onKies(Math.max(0, Math.min(vrij, n)))
  const wijn = naam
  // Tik op fles n: n flessen. Tik op de meest rechtse gekozen fles: één minder.
  const tik = (i: number) => kies(i === gekozen ? i - 1 : i)

  return (
    <div className={groot ? 'flessenkeuze groot' : 'flessenkeuze'} role="group" aria-label={`Aantal flessen van ${wijn}`}>
      <div className="flessenrij" aria-hidden>
        {Array.from({ length: teken }, (_, k) => {
          const i = k + 1
          const toestand = i <= gekozen ? 'gekozen' : i <= vrij ? 'vrij' : 'weg'
          return <span key={i} className={toestand === 'vrij' ? 'fles' : `fles ${toestand}`} onClick={i <= vrij ? () => tik(i) : undefined} />
        })}
        {meer > 0 && <span className="fles-meer">+ {meer}</span>}
      </div>
      <div className="flessenkeuze-onder">
        <RijStatus vrij={vrij} gekozen={gekozen} uitleg={uitleg} />
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
function RijStatus({ vrij, gekozen, uitleg }: { vrij: number; gekozen: number; uitleg: boolean }) {
  if (uitleg && vrij > 0) {
    return (
      <p className="rij-status goud" aria-live="polite">
        <span>Tik op de flessen die je wilt{gekozen > 0 ? ` · ${gekozen} gekozen` : ''}</span>
      </p>
    )
  }
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
