// Bedragen en tijden zoals de leden ze zien.

const TIJDZONE = 'Europe/Amsterdam'

/** Hele centen naar "€ 9,75". Met heel: true zonder centen als die nul zijn, zoals bij biedingen: "€ 340". */
export function euro(centen: number, { heel = false } = {}): string {
  const euros = Math.trunc(centen / 100)
  const rest = Math.abs(centen % 100)
  const deel = euros.toLocaleString('nl-NL')
  if (heel && rest === 0) return `€ ${deel}`
  return `€ ${deel},${String(rest).padStart(2, '0')}`
}

/** UTC-tekst naar "zondag 20:00", in Nederlandse tijd. */
export function dagEnTijd(utc: string): string {
  const d = new Date(utc)
  const dag = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', timeZone: TIJDZONE }).format(d)
  const tijd = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: TIJDZONE }).format(d)
  return `${dag} ${tijd}`
}

export function flessen(aantal: number): string {
  return aantal === 1 ? '1 fles' : `${aantal} flessen`
}
