import { useEffect, useState } from 'react'

// Schermen staan in het adres na #, zodat de terugknop van de telefoon werkt
// en CloudFront maar één pagina hoeft te kennen.
export type Route =
  | { scherm: 'welkom' }
  | { scherm: 'tip' }
  | { scherm: 'aanbod' }
  | { scherm: 'wijn'; wijnId: string }
  | { scherm: 'bestelling' }
  | { scherm: 'besteld'; bestellingId: string }
  | { scherm: 'net-op' }
  | { scherm: 'betaling' }
  | { scherm: 'bieding'; wijnId: string }
  | { scherm: 'gewonnen'; wijnId: string }
  | { scherm: 'flessen' }
  | { scherm: 'marc' }
  | { scherm: 'beheer' }
  | { scherm: 'namens' }

export type Ga = (route: Route) => void

const ZONDER_ID = ['welkom', 'tip', 'bestelling', 'net-op', 'betaling', 'flessen', 'marc'] as const
type ZonderId = (typeof ZONDER_ID)[number]

function isZonderId(waarde: string): waarde is ZonderId {
  return (ZONDER_ID as readonly string[]).includes(waarde)
}

export function leesRoute(hash: string): Route {
  let delen: string[]
  try {
    delen = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  } catch {
    return { scherm: 'aanbod' }
  }
  const [a = '', b, c] = delen
  if (isZonderId(a)) return { scherm: a }
  if (a === 'wijn' && b) return { scherm: 'wijn', wijnId: b }
  if (a === 'besteld' && b) return { scherm: 'besteld', bestellingId: b }
  if (a === 'bieding' && b) return c === 'gewonnen' ? { scherm: 'gewonnen', wijnId: b } : { scherm: 'bieding', wijnId: b }
  if (a === 'beheer') return b === 'namens' ? { scherm: 'namens' } : { scherm: 'beheer' }
  return { scherm: 'aanbod' }
}

export function adres(route: Route): string {
  switch (route.scherm) {
    case 'aanbod':
      return '#/'
    case 'wijn':
      return `#/wijn/${encodeURIComponent(route.wijnId)}`
    case 'besteld':
      return `#/besteld/${encodeURIComponent(route.bestellingId)}`
    case 'bieding':
      return `#/bieding/${encodeURIComponent(route.wijnId)}`
    case 'gewonnen':
      return `#/bieding/${encodeURIComponent(route.wijnId)}/gewonnen`
    case 'namens':
      return '#/beheer/namens'
    default:
      return `#/${route.scherm}`
  }
}

// Of er binnen de app al genavigeerd is. Zo niet (bijvoorbeeld via een link in een melding),
// dan zou terug de app verlaten; dan gaat terug naar het opgegeven scherm.
let binnenGenavigeerd = false

export function terug(naar: () => void) {
  if (binnenGenavigeerd) window.history.back()
  else naar()
}

export function useRoute(): [Route, Ga] {
  const [route, setRoute] = useState(() => leesRoute(window.location.hash))
  useEffect(() => {
    const bij = () => {
      setRoute(leesRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', bij)
    return () => window.removeEventListener('hashchange', bij)
  }, [])
  return [
    route,
    (nieuw) => {
      binnenGenavigeerd = true
      const doel = adres(nieuw)
      if (window.location.hash === doel || (doel === '#/' && window.location.hash === '')) {
        setRoute(nieuw)
        window.scrollTo(0, 0)
      } else {
        window.location.hash = doel
      }
    },
  ]
}
