// De flessenrij: voorraad en keuze in één rij. Zie design-v2/DESIGN.md, "Flessenrij".
import type { KeyboardEvent } from 'react'

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
  // Tik op vrije fles i: je keuze wordt i. Tik op de meest rechtse gekozen fles: één minder.
  const tik = (i: number) => kies(i === gekozen ? gekozen - 1 : i)

  const toets = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') kies(gekozen + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') kies(gekozen - 1)
    else if (e.key === 'Home') kies(0)
    else if (e.key === 'End') kies(vrij)
    else return
    e.preventDefault()
  }

  return (
    <div
      className={groot ? 'flessenrij groot' : 'flessenrij'}
      role="slider"
      tabIndex={op ? -1 : 0}
      aria-label={`Aantal flessen van wijn ${letter}, ${naam}, ${vrij} beschikbaar`}
      aria-valuemin={0}
      aria-valuemax={vrij}
      aria-valuenow={gekozen}
      aria-valuetext={`${gekozen} gekozen`}
      aria-disabled={op}
      onKeyDown={toets}
    >
      {Array.from({ length: teken }, (_, k) => {
        const i = k + 1
        const toestand = i <= gekozen ? 'gekozen' : i <= vrij ? 'vrij' : 'weg'
        return (
          <span
            key={i}
            className="fles-tik"
            style={toestand === 'weg' ? { cursor: 'default' } : undefined}
            onClick={toestand === 'weg' ? undefined : () => tik(i)}
          >
            <span className={toestand === 'vrij' ? 'fles' : `fles ${toestand}`} />
          </span>
        )
      })}
      {meer > 0 && (
        // Grote voorraad: 12 flessen en "+ n". Een tik op "+ n" kiest er één bij.
        <span className="fles-meer" onClick={() => kies(Math.max(gekozen, ZICHTBAAR) + 1)}>+ {meer}</span>
      )}
    </div>
  )
}

/** De regel onder de flessenrij. */
export function RijStatus({ vrij, gekozen, groot = false }: { vrij: number; gekozen: number; groot?: boolean }) {
  let tekst: string
  if (vrij <= 0) tekst = 'OP IS OP'
  else if (gekozen > 0) tekst = groot ? `TIK OP DE FLESSEN DIE JE WILT · ${gekozen} GEKOZEN` : `${gekozen} GEKOZEN · ${vrij - gekozen} OVER`
  else tekst = groot ? 'TIK OP DE FLESSEN DIE JE WILT' : `${vrij} OVER · TIK OP EEN FLES`
  return (
    <p className={`rij-status${gekozen > 0 && vrij > 0 ? ' goud' : ''}${groot ? ' groot' : ''}`} aria-live="polite">
      {tekst}
    </p>
  )
}
