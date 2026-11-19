import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  titel: string
  onSluit: () => void
  children: ReactNode
  /** Over het hele scherm, zoals het biedpaneel. */
  vol?: boolean
}

/** Een paneel van onderaf. Sluit met ✕, Escape of een tik ernaast. */
export function Blad({ titel, onSluit, children, vol = false }: Props) {
  const paneel = useRef<HTMLDivElement>(null)
  const sluit = useRef(onSluit)
  useEffect(() => {
    sluit.current = onSluit
  })

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
