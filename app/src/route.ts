import { useEffect, useState } from 'react'

// Schermen staan in het adres na #, zodat de terugknop van de telefoon werkt
// en CloudFront maar één pagina hoeft te kennen.
export type Route =
  | { scherm: 'aanbod' }
  | { scherm: 'wijn'; wijnId: string }
  | { scherm: 'flessen' }
  | { scherm: 'marc' }

export function leesRoute(hash: string): Route {
  const [, scherm, id] = hash.replace(/^#/, '').split('/')
  if (scherm === 'wijn' && id) return { scherm: 'wijn', wijnId: decodeURIComponent(id) }
  if (scherm === 'flessen' || scherm === 'marc') return { scherm }
  return { scherm: 'aanbod' }
}

export function adres(route: Route): string {
  if (route.scherm === 'wijn') return `#/wijn/${encodeURIComponent(route.wijnId)}`
  return `#/${route.scherm}`
}

// Of er binnen de app al genavigeerd is. Zo niet (bijvoorbeeld via een link in een melding),
// dan zou terug de app verlaten; dan gaat terug naar het aanbod.
let binnenGenavigeerd = false

export function terug(naar: () => void) {
  if (binnenGenavigeerd) window.history.back()
  else naar()
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState(() => leesRoute(window.location.hash))
  useEffect(() => {
    const bij = () => {
      setRoute(leesRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', bij)
    return () => window.removeEventListener('hashchange', bij)
  }, [])
  return [route, (nieuw) => {
    binnenGenavigeerd = true
    window.location.hash = adres(nieuw)
  }]
}
