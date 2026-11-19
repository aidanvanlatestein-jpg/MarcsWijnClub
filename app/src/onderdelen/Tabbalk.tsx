export type Tab = 'aanbod' | 'flessen' | 'marc'

const TABS: { id: Tab; label: string }[] = [
  { id: 'aanbod', label: 'AANBOD' },
  { id: 'flessen', label: 'FLESSEN' },
  { id: 'marc', label: 'MARC' },
]

/** Drie gelijke kolommen zonder iconen. De actieve tab heeft een gouden balk. */
export function Tabbalk({ actief, onKies }: { actief: Tab; onKies: (tab: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="Hoofdmenu">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="tab"
          aria-current={id === actief ? 'page' : undefined}
          onClick={() => onKies(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
