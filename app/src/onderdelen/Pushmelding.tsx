import { useEffect } from 'react'
import { useStaat } from '../staat'

/** Zo ziet een melding van de wijnclub eruit. In het prototype verschijnt hij in de app zelf. */
export function Pushmelding() {
  const [staat, dispatch] = useStaat()
  const melding = staat.melding
  useEffect(() => {
    if (!melding) return
    const weg = window.setTimeout(() => dispatch({ type: 'melding', melding: null }), 7000)
    return () => window.clearTimeout(weg)
  }, [melding, dispatch])
  if (!melding) return null
  return (
    <button type="button" className="push" role="status" onClick={() => dispatch({ type: 'melding', melding: null })}>
      <span className="push-bron"><i aria-hidden>W</i>WIJNCLUB · nu</span>
      <strong>{melding.kop}</strong>
      <span>{melding.tekst}</span>
    </button>
  )
}
