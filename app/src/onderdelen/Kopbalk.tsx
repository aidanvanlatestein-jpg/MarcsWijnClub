import { ArrowLeft, MessageCircle } from 'lucide-react'

function VraagMarc({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" className="vraag-marc" onClick={onClick}>
      <MessageCircle size={15} aria-hidden />
      VRAAG MARC
    </button>
  )
}

export function Kopbalk({ onVraagMarc }: { onVraagMarc?: () => void }) {
  return (
    <header className="kopbalk">
      <div className="logo" aria-label="Marc kookt wijnclub">
        <span className="marc">MARC</span>
        <span className="kookt">KOOKT</span>
        <span className="club">WIJNCLUB</span>
      </div>
      <VraagMarc onClick={onVraagMarc} />
    </header>
  )
}

/** Kopbalk terug: pijl en titel in plaats van het logo. */
export function KopbalkTerug({ titel, onTerug, onVraagMarc }: { titel: string; onTerug: () => void; onVraagMarc?: () => void }) {
  return (
    <header className="kopbalk">
      <button type="button" className="terug" onClick={onTerug}>
        <ArrowLeft size={20} aria-hidden />
        {titel}
      </button>
      <VraagMarc onClick={onVraagMarc} />
    </header>
  )
}
