import { Archive, ChefHat, Wine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Tab = 'aanbod' | 'flessen' | 'marc'

const TABS: { id: Tab; label: string; icoon: LucideIcon }[] = [
  { id: 'aanbod', label: 'AANBOD', icoon: Wine },
  { id: 'flessen', label: 'MIJN FLESSEN', icoon: Archive },
  { id: 'marc', label: 'MARC', icoon: ChefHat },
]

export function Tabbalk({ actief, onKies }: { actief: Tab; onKies: (tab: Tab) => void }) {
  return (
    <nav className="tabbalk" aria-label="Hoofdmenu">
      {TABS.map(({ id, label, icoon: Icoon }) => (
        <button
          key={id}
          type="button"
          className="tab"
          aria-current={id === actief ? 'page' : undefined}
          onClick={() => onKies(id)}
        >
          <Icoon size={22} aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  )
}
