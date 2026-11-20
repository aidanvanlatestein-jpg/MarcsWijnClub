import { createContext, useContext, useState, type ReactNode } from 'react'
import { Blad } from './Blad'

// "Vraag Marc" opent WhatsApp met een bericht dat al klaarstaat.
// Marcs nummer komt uit de configuratie, niet uit de code. In het prototype is er geen nummer:
// dan laat de app het bericht zien en kies je in WhatsApp zelf een gesprek.

const WhatsAppContext = createContext<(tekst: string) => void>(() => {})

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [tekst, setTekst] = useState<string | null>(null)
  return (
    <WhatsAppContext.Provider value={setTekst}>
      {children}
      {tekst !== null && (
        <Blad titel="Naar WhatsApp" onSluit={() => setTekst(null)}>
          <p className="bericht-bel">{tekst}</p>
          <p className="tekst klein gedempt">
            In de echte app opent WhatsApp met Marcs nummer en dit bericht. In dit voorbeeld staat zijn nummer er
            nog niet in; je kiest zelf een gesprek.
          </p>
          <a
            className="hoofdknop klein"
            href={`https://wa.me/?text=${encodeURIComponent(tekst)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTekst(null)}
          >
            <span>Open WhatsApp</span>
            <span aria-hidden>↗</span>
          </a>
        </Blad>
      )}
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  return useContext(WhatsAppContext)
}
