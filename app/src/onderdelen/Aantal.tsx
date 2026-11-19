import { Minus, Plus } from 'lucide-react'

interface Props {
  waarde: number
  max: number
  naam: string
  onWijzig: (waarde: number) => void
  /** Groot: over de hele breedte, zoals op het scherm van één wijn. */
  groot?: boolean
}

export function Aantal({ waarde, max, naam, onWijzig, groot = false }: Props) {
  const icoon = groot ? 20 : 14
  return (
    <div className={groot ? 'aantal groot' : 'aantal'}>
      <button type="button" aria-label={`Eén fles ${naam} minder`} disabled={waarde <= 0} onClick={() => onWijzig(waarde - 1)}>
        <Minus size={icoon} aria-hidden />
      </button>
      <output className={waarde === 0 ? 'nul' : undefined} aria-live="polite">{waarde}</output>
      <button type="button" aria-label={`Eén fles ${naam} meer`} disabled={waarde >= max} onClick={() => onWijzig(waarde + 1)}>
        <Plus size={icoon} aria-hidden />
      </button>
    </div>
  )
}
