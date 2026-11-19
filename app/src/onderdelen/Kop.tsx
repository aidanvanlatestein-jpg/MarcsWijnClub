import { ArrowLeft } from 'lucide-react'
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

export function VraagMarc({ tekst = 'Hoi Marc, ' }: { tekst?: string }) {
  const open = useWhatsApp()
  return (
    <button type="button" className="tekstlink" onClick={() => open(tekst)}>
      Vraag Marc <span aria-hidden>↗</span>
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
  const open = useWhatsApp()
  return (
    <nav className="zwevend" aria-label="Navigatie">
      <button type="button" onClick={onTerug}>
        <ArrowLeft size={20} aria-hidden />
        {titel}
      </button>
      <button type="button" onClick={() => open(vraag)}>
        Vraag Marc <span aria-hidden>↗</span>
      </button>
    </nav>
  )
}

export function TerugLink({ titel, onTerug }: { titel: string; onTerug: () => void }) {
  return (
    <button type="button" className="terug-link" onClick={onTerug}>
      <ArrowLeft size={20} aria-hidden />
      {titel}
    </button>
  )
}
