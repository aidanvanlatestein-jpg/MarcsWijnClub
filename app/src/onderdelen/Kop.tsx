import { ArrowLeft, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useWhatsApp } from './WhatsApp'

export function Woordmerk({ sub = 'Wijnclub' }: { sub?: string }) {
  return (
    <span className="woordmerk">
      <span>Marc</span>
      <b>Kookt</b>
      <small>{sub}</small>
    </span>
  )
}

/** Opent WhatsApp met een bericht aan Marc dat al klaarstaat. Geen ↗ in tekst: dat wordt op iOS een emoji. */
export function VraagMarc({ tekst = 'Hoi Marc, ', label = 'Vraag Marc', className = 'tekstlink zonder-lijn' }: { tekst?: string; label?: string; className?: string }) {
  const open = useWhatsApp()
  return (
    <button type="button" className={className} onClick={() => open(tekst)}>
      <MessageCircle size={15} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  )
}

/** Links het woordmerk, rechts "Vraag Marc" of iets anders. */
export function Kop({ vraag, sub, rechts }: { vraag?: string; sub?: string; rechts?: ReactNode }) {
  return (
    <header className="kop">
      <Woordmerk sub={sub} />
      {rechts ?? <VraagMarc tekst={vraag} />}
    </header>
  )
}

/** Op een scherm met een foto bovenaan: twee zwarte vlakken over de foto. */
export function ZwevendeNav({ titel, onTerug, vraag }: { titel: string; onTerug: () => void; vraag: string }) {
  return (
    <nav className="zwevend" aria-label="Navigatie">
      <button type="button" onClick={onTerug}>
        <ArrowLeft size={20} aria-hidden />
        {titel}
      </button>
      <VraagMarc tekst={vraag} className="zwevend-knop" />
    </nav>
  )
}

export function TerugLink({ titel, onTerug, rechts }: { titel: string; onTerug: () => void; rechts?: ReactNode }) {
  return (
    <div className="terug-rij">
      <button type="button" className="terug-link" onClick={onTerug}>
        <ArrowLeft size={20} aria-hidden />
        {titel}
      </button>
      {rechts}
    </div>
  )
}
