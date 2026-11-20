import { useEffect, useState } from 'react'

// Schermen staan in het adres na #, zodat de terugknop van de telefoon werkt
// en CloudFront maar één pagina hoeft te kennen.
export type Route =
  | { scherm: 'welkom' }
  | { scherm: 'aanbod' }
  | { scherm: 'wijn'; wijnId: string }
  | { scherm: 'bestelling' }
  | { scherm: 'bon'; bestellingId: string }
  | { scherm: 'net-op' }
  | { scherm: 'fles'; wijnId: string }
  | { scherm: 'veiling'; wijnId: string }
  | { scherm: 'gewonnen'; wijnId: string }
  | { scherm: 'mijn-bestelling' }
  | { scherm: 'marc' }
  | { scherm: 'beheer'; tab?: BeheerTab }
  | { scherm: 'namens' }

/** Beheer in design-v4: een nieuwe fles klaarzetten, de avond presenteren, afleveren. */
export const BEHEER_TABS = ['avond', 'nieuw', 'afleveren'] as const
export type BeheerTab = (typeof BEHEER_TABS)[number]

export type Ga = (route: Route) => void

const ZONDER_ID = ['welkom', 'bestelling', 'net-op', 'mijn-bestelling', 'marc'] as const
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
  if ((a === 'bon' || a === 'besteld') && b) return { scherm: 'bon', bestellingId: b }
  if (a === 'veiling' && b) {
    if (c === 'gewonnen') return { scherm: 'gewonnen', wijnId: b }
    return c === 'fles' ? { scherm: 'fles', wijnId: b } : { scherm: 'veiling', wijnId: b }
  }
  // Oude adressen uit eerdere ontwerpen blijven werken.
  if (a === 'tip') return { scherm: 'aanbod' }
  if (a === 'flessen' || a === 'betaling') return { scherm: 'mijn-bestelling' }
  if (a === 'bieding' && b) return c === 'gewonnen' ? { scherm: 'gewonnen', wijnId: b } : { scherm: 'fles', wijnId: b }
  if (a === 'beheer') {
    if (b === 'namens') return { scherm: 'namens' }
    if (b === 'wijn') return { scherm: 'beheer', tab: 'nieuw' }
    if (b === 'bestellingen') return { scherm: 'beheer', tab: 'afleveren' }
    const tab = BEHEER_TABS.find((t) => t === b)
    return tab && tab !== 'avond' ? { scherm: 'beheer', tab } : { scherm: 'beheer' }
  }
  return { scherm: 'aanbod' }
}

export function adres(route: Route): string {
  switch (route.scherm) {
    case 'aanbod':
      return '#/'
    case 'wijn':
      return `#/wijn/${encodeURIComponent(route.wijnId)}`
    case 'bon':
      return `#/bon/${encodeURIComponent(route.bestellingId)}`
    case 'fles':
      return `#/veiling/${encodeURIComponent(route.wijnId)}/fles`
    case 'veiling':
      return `#/veiling/${encodeURIComponent(route.wijnId)}`
    case 'gewonnen':
      return `#/veiling/${encodeURIComponent(route.wijnId)}/gewonnen`
    case 'namens':
      return '#/beheer/namens'
    case 'beheer':
      return route.tab && route.tab !== 'avond' ? `#/beheer/${route.tab}` : '#/beheer'
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
      const s: unknown = window.history.state
      const vanuitPaneel = typeof s === 'object' && s !== null && 'blad' in s
      if (vanuitPaneel) {
        // Een open paneel (zie Blad) heeft een eigen stap in de geschiedenis. Die wordt het nieuwe scherm,
        // zodat terug daarna naar het scherm onder het paneel gaat en niet naar een leeg paneel.
        window.history.replaceState(null, '', doel)
        setRoute(nieuw)
        window.scrollTo(0, 0)
      } else if (window.location.hash === doel || (doel === '#/' && window.location.hash === '')) {
        setRoute(nieuw)
        window.scrollTo(0, 0)
      } else {
        window.location.hash = doel
      }
    },
  ]
}
