import type { KeyboardEvent } from 'react'

export interface Optie {
  id: string
  woord: string
  zin: string
}

interface Props {
  label: string
  opties: Optie[]
  gekozen: string | null
  onKies: (id: string) => void
  /** Twee helften naast elkaar, of banden onder elkaar. */
  vorm?: 'split' | 'banden'
  uitgeschakeld?: boolean
}

/** Het grote woord moet in zijn vak passen: korter woord, grotere letters. */
function grootte(woord: string, vorm: 'split' | 'banden'): number {
  return vorm === 'split' ? Math.min(52, Math.floor(280 / Math.max(woord.length, 1))) : Math.min(60, Math.floor(400 / Math.max(woord.length, 1)))
}

/** Een keuze die werkt als een radiogroep: BRENG of HAAL, LIJST of BIEDING, een afhaalpunt. */
export function Keuze({ label, opties, gekozen, onKies, vorm = 'split', uitgeschakeld = false }: Props) {
  const toets = (e: KeyboardEvent<HTMLDivElement>) => {
    const richting = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!richting || uitgeschakeld) return
    e.preventDefault()
    const nu = Math.max(0, opties.findIndex((o) => o.id === gekozen))
    const volgende = opties[(nu + richting + opties.length) % opties.length]
    onKies(volgende.id)
    const knop = e.currentTarget.querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(volgende.id)}"]`)
    knop?.focus()
  }
  return (
    <div className={vorm} role="radiogroup" aria-label={label} onKeyDown={toets}>
      {opties.map((o, i) => {
        const aan = o.id === gekozen
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            data-id={o.id}
            aria-checked={aan}
            tabIndex={aan || (gekozen === null && i === 0) ? 0 : -1}
            disabled={uitgeschakeld}
            onClick={() => onKies(o.id)}
          >
            <span className="keuze-woord" style={{ fontSize: grootte(o.woord, vorm) }}>{o.woord}</span>
            <span className="keuze-zin">{o.zin}</span>
          </button>
        )
      })}
    </div>
  )
}
