import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  titel: string
  onSluit: () => void
  children: ReactNode
  /** Over het hele scherm, zoals het biedpaneel. */
  vol?: boolean
}

/** Staat dit paneel bovenaan in de geschiedenis van de browser? */
function bovenaan(id: string): boolean {
  const s: unknown = window.history.state
  return typeof s === 'object' && s !== null && (s as { blad?: unknown }).blad === id
}

/**
 * Een paneel van onderaf. Sluit met ✕, Escape, een tik ernaast of de terugknop van de telefoon.
 * Het paneel zet daarvoor één stap in de geschiedenis van de browser: terug sluit eerst het paneel
 * en pas daarna het scherm.
 */
export function Blad({ titel, onSluit, children, vol = false }: Props) {
  const paneel = useRef<HTMLDivElement>(null)
  const id = useId()
  const sluit = useRef(onSluit)
  useEffect(() => {
    sluit.current = onSluit
  })

  const opruimen = useRef<number | null>(null)
  useEffect(() => {
    // React voert dit effect tijdens het ontwikkelen twee keer uit. Het opruimen wacht daarom één tel
    // en vervalt als het paneel er meteen weer staat; anders zou het paneel zichzelf sluiten.
    if (opruimen.current !== null) {
      window.clearTimeout(opruimen.current)
      opruimen.current = null
    }
    if (!bovenaan(id)) window.history.pushState({ blad: id }, '')
    // Na terug staat dit paneel niet meer bovenaan: dan is het dicht. Staat het er nog wel
    // (bijvoorbeeld als een paneel erboven sluit), dan blijft het open.
    const terug = () => {
      if (!bovenaan(id)) sluit.current()
    }
    window.addEventListener('popstate', terug)
    return () => {
      window.removeEventListener('popstate', terug)
      // Gesloten met ✕ of door de app zelf: haal de stap weer uit de geschiedenis.
      opruimen.current = window.setTimeout(() => {
        opruimen.current = null
        if (bovenaan(id)) window.history.back()
      }, 0)
    }
  }, [id])

  useEffect(() => {
    const vorige = document.activeElement instanceof HTMLElement ? document.activeElement : null
    paneel.current?.focus()
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sluit.current()
    }
    document.addEventListener('keydown', toets)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', toets)
      document.body.style.overflow = overflow
      vorige?.focus()
    }
  }, [])

  return (
    <div className="blad-achter" onClick={(e) => e.target === e.currentTarget && sluit.current()}>
      <div className={vol ? 'blad vol' : 'blad'} role="dialog" aria-modal="true" aria-label={titel} tabIndex={-1} ref={paneel}>
        <div className="blad-kop">
          <h2>{titel}</h2>
          <button type="button" className="sluit" aria-label="Sluit" onClick={() => sluit.current()}>
            <X size={22} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
