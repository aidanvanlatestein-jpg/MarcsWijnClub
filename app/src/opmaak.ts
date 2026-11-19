// Bedragen en tijden zoals de leden ze zien.

const TIJDZONE = 'Europe/Amsterdam'

function deel(utc: string, opties: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: TIJDZONE, ...opties }).format(new Date(utc)).replace(/\./g, '')
}

/** Hele centen naar "11,50", zonder euroteken. */
export function bedrag(centen: number): string {
  const euros = Math.trunc(centen / 100)
  const rest = Math.abs(centen % 100)
  return `${euros.toLocaleString('nl-NL')},${String(rest).padStart(2, '0')}`
}

/** Zonder centen als die nul zijn, zoals bij biedingen: "340". */
export function heelBedrag(centen: number): string {
  return centen % 100 === 0 ? Math.trunc(centen / 100).toLocaleString('nl-NL') : bedrag(centen)
}

/** Hele centen naar "€ 9,75". Met heel: true zonder centen als die nul zijn: "€ 340". */
export function euro(centen: number, { heel = false } = {}): string {
  return `€ ${heel ? heelBedrag(centen) : bedrag(centen)}`
}

export function tijd(utc: string): string {
  return deel(utc, { hour: '2-digit', minute: '2-digit' })
}

/** UTC-tekst naar "zondag 20:00", in Nederlandse tijd. */
export function dagEnTijd(utc: string): string {
  return `${deel(utc, { weekday: 'long' })} ${tijd(utc)}`
}

/** "zo 20:00" */
export function kortDagEnTijd(utc: string): string {
  return `${deel(utc, { weekday: 'short' })} ${tijd(utc)}`
}

/** "di 19 nov" */
export function kortDatum(utc: string): string {
  return deel(utc, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "12 nov" */
export function dagEnMaand(utc: string): string {
  return deel(utc, { day: 'numeric', month: 'short' })
}

export function flessen(aantal: number): string {
  return aantal === 1 ? '1 fles' : `${aantal} flessen`
}

/** 2022 wordt "’22". */
export function kortJaar(jaargang?: number): string {
  return jaargang ? `’${String(jaargang).slice(-2)}` : ''
}

export function naamMetJaar(wijn: { naam: string; jaargang?: number }, { kort = false } = {}): string {
  if (!wijn.jaargang) return wijn.naam
  return `${wijn.naam} ${kort ? kortJaar(wijn.jaargang) : wijn.jaargang}`
}

/** Het weeknummer volgens ISO 8601, in Nederlandse tijd. */
export function weekNummer(utc: string): number {
  const [jaar, maand, dag] = new Intl.DateTimeFormat('en-CA', { timeZone: TIJDZONE }).format(new Date(utc)).split('-').map(Number)
  const d = new Date(Date.UTC(jaar, maand - 1, dag))
  // Donderdag van dezelfde week bepaalt het jaar van de week.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const begin = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - begin) / 86_400_000 + 1) / 7)
}

/** Voor een invoerveld datetime-local: "2026-11-22T20:00" in Nederlandse tijd. */
export function naarInvoer(utc: string): string {
  const d = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIJDZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(utc))
  return d.replace(' ', 'T')
}

/** Terug van een invoerveld datetime-local naar UTC-tekst. De invoer is de tijd van het apparaat. */
export function vanInvoer(lokaal: string): string | null {
  const d = new Date(lokaal)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function nuUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}
