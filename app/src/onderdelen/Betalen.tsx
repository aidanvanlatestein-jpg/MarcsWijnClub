import { euro } from '../opmaak'
import { Blad } from './Blad'

interface Props {
  bedrag: number
  onKlaar: (gelukt: boolean) => void
  onSluit: () => void
}

/**
 * Staat in voor de betaalpagina van Mollie. In de echte app gaat het lid naar Mollie en komt het daarna terug;
 * de status komt uit de melding van Mollie. In de testmodus kies je op de betaalpagina zelf of het lukt.
 */
export function Betalen({ bedrag, onKlaar, onSluit }: Props) {
  return (
    <Blad titel="Betaalpagina van Mollie" onSluit={onSluit}>
      <p className="tekst">
        Hier ga je naar Mollie om {euro(bedrag)} te betalen. In dit voorbeeld wordt niets betaald; kies wat er gebeurt.
      </p>
      <button type="button" className="hoofdknop goud klein" onClick={() => onKlaar(true)}>
        <span>Betaling lukt</span>
        <span aria-hidden>→</span>
      </button>
      <button type="button" className="knop-grijs" onClick={() => onKlaar(false)}>
        <span>Betaling mislukt of afgebroken</span>
        <span aria-hidden>→</span>
      </button>
    </Blad>
  )
}
