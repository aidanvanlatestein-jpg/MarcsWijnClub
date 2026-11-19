export type Tab = 'aanbod' | 'flessen' | 'marc'

export interface TabKeuze<T extends string> {
  id: T
  label: string
}

const LEDEN_TABS: TabKeuze<Tab>[] = [
  { id: 'aanbod', label: 'AANBOD' },
  { id: 'flessen', label: 'FLESSEN' },
  { id: 'marc', label: 'MARC' },
]

interface Props<T extends string> {
  tabs: TabKeuze<T>[]
  actief: T
  onKies: (tab: T) => void
  label: string
  /** Tabs zo breed als hun woord, voor labels van ongelijke lengte. */
  vrij?: boolean
}

/** Kolommen zonder iconen, onderaan het scherm. De actieve tab heeft een gouden balk. */
export function Tabs<T extends string>({ tabs, actief, onKies, label, vrij = false }: Props<T>) {
  return (
    <nav className={vrij ? 'tabs vrij' : 'tabs'} aria-label={label}>
      {tabs.map(({ id, label: tekst }) => (
        <button
          key={id}
          type="button"
          className="tab"
          aria-current={id === actief ? 'page' : undefined}
          onClick={() => onKies(id)}
        >
          {tekst}
        </button>
      ))}
    </nav>
  )
}

/** De drie tabs van een lid: drie gelijke kolommen. */
export function Tabbalk({ actief, onKies }: { actief: Tab; onKies: (tab: Tab) => void }) {
  return <Tabs tabs={LEDEN_TABS} actief={actief} onKies={onKies} label="Hoofdmenu" />
}
