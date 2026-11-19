import { Camera, Check, Pencil } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { BonRegels } from '../onderdelen/Bon'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop } from '../onderdelen/Knoppen'
import { Kop, TerugLink } from '../onderdelen/Kop'
import { bedrag, euro, kortDagEnTijd, naarInvoer, nuUtc, vanInvoer, weekNummer } from '../opmaak'
import { herkenBericht, leesEuro, leesLetters } from '../regels'
import type { Ga } from '../route'
import { afhaalpunt, gesorteerd, plus, useStaat, volgendeLetter } from '../staat'
import { BEWAREN, type Bestelling } from '../types'
import { voorbeeldBericht, voorbeeldLeden } from '../voorbeeld'

function lidNaam(lidId: string): string {
  return voorbeeldLeden.find((l) => l.lidId === lidId)?.naam ?? lidId
}

interface Formulier {
  letter: string
  naam: string
  jaar: string
  aantal: string
  prijs: string
  tekst: string
  startbod: string
  verhoging: string
  eindtijd: string
  herkomst: string
  bewaring: string
}

/** 10 Beheer: een wijn invoeren uit een WhatsApp-bericht, de lijst sluiten, bestellingen en de paklijst. */
export function Beheer({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const lijstOpen = lijst.status === 'open'
  const leeg = (): Formulier => ({
    letter: '', naam: '', jaar: '', aantal: '', prijs: '', tekst: '',
    startbod: '', verhoging: '10', eindtijd: naarInvoer(plus(lijst.openTot, 3_600_000)), herkomst: '', bewaring: '',
  })
  const [bericht, setBericht] = useState(voorbeeldBericht)
  const [form, setForm] = useState<Formulier | null>(null)
  const [soort, setSoort] = useState<'lijst' | 'bieding'>('lijst')
  const [foto, setFoto] = useState<string | undefined>()
  const [fout, setFout] = useState<string | null>(null)

  // Een gekozen foto blijft alleen in deze browser. Ruim het tijdelijke adres op als hij vervangen wordt.
  useEffect(() => () => {
    if (foto?.startsWith('blob:')) URL.revokeObjectURL(foto)
  }, [foto])

  const herken = () => {
    const h = herkenBericht(bericht)
    const bezet = h.letter && lijst.wijnen.some((w) => w.letter === h.letter)
    setForm({
      ...leeg(),
      letter: h.letter && !bezet ? h.letter : volgendeLetter(staat),
      naam: h.naam,
      jaar: h.jaargang ? String(h.jaargang) : '',
      aantal: h.aantal ? String(h.aantal) : '',
      prijs: h.prijs !== undefined ? bedrag(h.prijs) : '',
      tekst: h.tekst,
    })
    setFout(null)
  }
  const zet = (veld: keyof Formulier) => (waarde: string) => setForm((f) => (f ? { ...f, [veld]: waarde } : f))

  const opslaan = () => {
    if (!form) return
    const naam = form.naam.trim()
    const jaargang = form.jaar ? Number(form.jaar) : undefined
    if (!naam) return setFout('Vul de naam van de wijn in.')
    if (jaargang !== undefined && !(Number.isInteger(jaargang) && jaargang > 1900 && jaargang < 2100)) return setFout('Het jaar klopt niet.')
    if (soort === 'lijst') {
      const letter = form.letter.trim().toUpperCase()
      const aantal = Number(form.aantal)
      const prijs = leesEuro(form.prijs)
      if (!lijstOpen) return setFout('De lijst is gesloten. Zet de wijn op de volgende lijst.')
      if (!/^[A-Z]$/.test(letter)) return setFout('De letter moet één letter zijn, zoals J.')
      if (lijst.wijnen.some((w) => w.letter === letter)) return setFout(`Wijn ${letter} staat al op de lijst.`)
      if (!Number.isInteger(aantal) || aantal < 1) return setFout('Het aantal moet minstens 1 fles zijn.')
      if (!prijs) return setFout('De prijs klopt niet. Schrijf hem als 10,50.')
      dispatch({
        type: 'nieuweWijn',
        wijn: {
          wijnId: `wijn-${letter.toLowerCase()}-${Date.now()}`, letter, naam, jaargang, tekst: form.tekst.trim(), foto,
          prijs, voorraad: aantal, partij: aantal, volgorde: lijst.wijnen.reduce((m, w) => Math.max(m, w.volgorde), 0) + 1,
        },
      })
      dispatch({ type: 'melding', melding: { kop: `Wijn ${letter} staat op de lijst`, tekst: `${naam}, ${aantal} flessen voor ${euro(prijs)}.` } })
    } else {
      const startbod = leesEuro(form.startbod)
      const verhoging = leesEuro(form.verhoging)
      const eindtijd = vanInvoer(form.eindtijd)
      if (!startbod) return setFout('Het startbod klopt niet. Schrijf het als 250.')
      if (!verhoging) return setFout('De minimale verhoging klopt niet.')
      if (!eindtijd || eindtijd <= nuUtc()) return setFout('De eindtijd moet in de toekomst liggen.')
      dispatch({
        type: 'nieuweBieding',
        bieding: {
          wijnId: `bieding-${Date.now()}`, naam, jaargang, tekst: form.tekst.trim() || undefined, foto,
          herkomst: form.herkomst.trim() || undefined, bewaring: form.bewaring.trim() || undefined,
          startbod, minimaleVerhoging: verhoging, minimaalVolgendBod: startbod, eindtijd,
          aantalBiedingen: 0, biedingStatus: 'open', mijnBodIsHoogste: false,
        },
      })
      dispatch({ type: 'melding', melding: { kop: 'De bieding is gestart', tekst: `${naam}, vanaf ${euro(startbod, { heel: true })}.` } })
    }
    setForm(null)
    setFoto(undefined)
    setBericht('')
    setFout(null)
    window.scrollTo(0, 0)
  }

  const lijstBestellingen = staat.bestellingen.filter((b) => b.lijstId === lijst.lijstId && b.status !== 'verlopen')
  const biedingBestellingen = staat.bestellingen.filter((b) => b.soort === 'bieding' && b.status !== 'verlopen')
  const flessenVoor = (bs: Bestelling[]) => bs.reduce((som, b) => som + b.regels.reduce((s, r) => s + r.aantal, 0), 0)

  return (
    <>
      <Kop
        sub="Beheer"
        rechts={
          <a className="tekstlink zonder-lijn" href="#bestellingen" onClick={(e) => {
            e.preventDefault()
            document.getElementById('bestellingen')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            Bestellingen ↓
          </a>
        }
      />
      <main>
        <div className="masthead">
          <h1>
            <span className="groot spook">Nieuwe</span>
            <span className="groot">Wijn</span>
          </h1>
        </div>

        <Stap nummer="01" titel="Plak je WhatsApp-bericht">
          <label className="sr" htmlFor="bericht">Je WhatsApp-bericht</label>
          <textarea id="bericht" className="invoer-groot" value={bericht} onChange={(e) => setBericht(e.target.value)} placeholder="*Wijn J Soave Classico 2023* …" />
          <div className="knoppen-rij">
            <button type="button" className="knop-wit" disabled={!bericht.trim()} onClick={herken}>Herken →</button>
            <span className="uitleg-voorbeeld">In de echte app leest een taalmodel het bericht. Hier een eenvoudige regel.</span>
          </div>
          {form && (
            <div className="herkend">
              <p className="label">Herkend · kijk het na</p>
              {soort === 'lijst' && <Veld label="Wijn" waarde={form.letter} onWijzig={zet('letter')} />}
              <Veld label="Naam" waarde={form.naam} onWijzig={zet('naam')} />
              <Veld label="Jaar" waarde={form.jaar} onWijzig={zet('jaar')} invoer="numeric" />
              {soort === 'lijst' && <Veld label="Aantal" waarde={form.aantal} onWijzig={zet('aantal')} invoer="numeric" />}
              {soort === 'lijst' && <Veld label="Prijs" waarde={form.prijs} onWijzig={zet('prijs')} invoer="decimal" voor="€" />}
              <Veld label="Tekst" waarde={form.tekst} onWijzig={zet('tekst')} lang />
            </div>
          )}
        </Stap>

        <Stap nummer="02" titel="Foto">
          <div className="fotos">
            {foto && <img src={foto} alt="Gekozen foto" />}
            <label className="foto-toevoegen">
              <Camera size={24} aria-hidden />
              + FOTO
              {/* Alleen een voorbeeld in deze browser; er wordt niets geüpload. */}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const bestand = e.target.files?.[0]
                  if (!bestand) return
                  if (!bestand.type.startsWith('image/') || bestand.size > 10_000_000) {
                    setFout('Kies een foto van hoogstens 10 MB.')
                    return
                  }
                  setFoto(URL.createObjectURL(bestand))
                }}
              />
            </label>
          </div>
        </Stap>

        <Stap nummer="03" titel="Lijst of bieding?">
          <Keuze
            label="Lijst of bieding"
            gekozen={soort}
            onKies={(id) => setSoort(id as 'lijst' | 'bieding')}
            opties={[
              { id: 'lijst', woord: 'Lijst', zin: lijstOpen ? `Vaste prijs, tot ${kortDagEnTijd(lijst.openTot)}` : 'De lijst is gesloten' },
              { id: 'bieding', woord: 'Bieding', zin: 'Startbod en eindtijd' },
            ]}
          />
          {soort === 'bieding' && form && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <VeldZwart label="Startbod in euro" waarde={form.startbod} onWijzig={zet('startbod')} invoer="decimal" />
              <VeldZwart label="Minimale verhoging in euro" waarde={form.verhoging} onWijzig={zet('verhoging')} invoer="decimal" />
              <VeldZwart label="Eindtijd" waarde={form.eindtijd} onWijzig={zet('eindtijd')} type="datetime-local" />
              <VeldZwart label="Herkomst" waarde={form.herkomst} onWijzig={zet('herkomst')} />
              <VeldZwart label="Bewaring" waarde={form.bewaring} onWijzig={zet('bewaring')} />
              <p className="uitleg-voorbeeld">Het spraakbericht van 30 seconden komt later.</p>
            </div>
          )}
          {!form && <p className="tekst klein gedempt">Laat eerst je bericht herkennen.</p>}
          {fout && <p className="fout" role="alert">{fout}</p>}
          <Hoofdknop disabled={!form} onClick={opslaan}>{soort === 'lijst' ? 'Zet op de lijst' : 'Start de bieding'}</Hoofdknop>
        </Stap>

        <Stap nummer="04" titel="De lijst">
          <p className="tekst">
            {lijst.titel} · week {weekNummer(lijst.openTot)} · {lijstOpen ? `sluit ${kortDagEnTijd(lijst.openTot)}` : 'gesloten'}
          </p>
          <ul className="tekst klein gedempt" style={{ margin: 0, paddingLeft: 18 }}>
            {gesorteerd(lijst.wijnen).map((w) => (
              <li key={w.wijnId}>Wijn {w.letter} · {w.naam} · nog {w.voorraad} van {w.partij ?? w.voorraad}</li>
            ))}
          </ul>
          {lijstOpen && (
            <button type="button" className="knop-grijs" onClick={() => dispatch({ type: 'sluitLijst', nu: nuUtc() })}>
              <span>Sluit de lijst nu</span>
              <span aria-hidden>→</span>
            </button>
          )}
          {lijstOpen && <p className="uitleg-voorbeeld">Wie besteld heeft, krijgt dan een betaalverzoek.</p>}
        </Stap>

        <section id="bestellingen" className="sectie" style={{ paddingTop: 36 }}>
          <div className="sectie-kop" style={{ borderBottom: '1px solid var(--ink)', paddingBottom: 6 }}>
            <h2 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase' }}>Bestellingen</h2>
            <span className="label">WK {weekNummer(lijst.openTot)} · {lijstBestellingen.length}</span>
          </div>
          {lijst.afhaalpunten.map((punt) => {
            const hier = lijstBestellingen.filter((b) => b.levering === punt.afhaalpuntId)
            if (hier.length === 0) return null
            return (
              <Fragment key={punt.afhaalpuntId}>
                <div className="paklijst-kop">
                  <strong>{punt.naam}</strong>
                  <span>{punt.wanneer} · {flessenVoor(hier)} flessen</span>
                </div>
                {hier.map((b) => <BestellingRij key={b.bestellingId} bestelling={b} />)}
              </Fragment>
            )
          })}
          {biedingBestellingen.length > 0 && (
            <>
              <div className="paklijst-kop">
                <strong>Biedingen</strong>
                <span>{biedingBestellingen.length} {biedingBestellingen.length === 1 ? 'fles' : 'flessen'}</span>
              </div>
              {biedingBestellingen.map((b) => <BestellingRij key={b.bestellingId} bestelling={b} />)}
            </>
          )}
          {lijstBestellingen.length === 0 && biedingBestellingen.length === 0 && <p className="tekst gedempt">Nog geen bestellingen.</p>}
          <button type="button" className="tekstlink zonder-lijn" style={{ alignSelf: 'flex-start', marginTop: 8 }} disabled={!lijstOpen} onClick={() => ga({ scherm: 'namens' })}>
            + Bestelling namens een lid
          </button>
        </section>
        <div style={{ padding: '12px 0 40px' }}>
          <TerugLink titel="Naar de app van een lid" onTerug={() => ga({ scherm: 'aanbod' })} />
        </div>
      </main>
    </>
  )
}

function BestellingRij({ bestelling: b }: { bestelling: Bestelling }) {
  const [staat, dispatch] = useStaat()
  const regels = b.regels.map((r) => (r.letter ? `${r.aantal}× ${r.letter}` : r.naam)).join(' · ')
  let levering = ''
  if (b.soort === 'bieding') levering = b.levering === BEWAREN ? 'bewaren' : afhaalpunt(staat, b.levering)?.naam ?? 'nog niet gekozen'
  const status = [
    b.status === 'betaald' ? 'Betaald' : 'Wacht op betaling',
    levering,
    b.ingevoerdDoor === 'beheer' ? 'door jou ingevoerd' : '',
  ].filter(Boolean).join(' · ')
  const klaar = Boolean(b.afgeleverdOp)
  return (
    <div className={klaar ? 'bestelling-rij afgevinkt' : 'bestelling-rij'}>
      <button
        type="button"
        role="checkbox"
        aria-checked={klaar}
        aria-label={`Afgeleverd: ${lidNaam(b.lidId)}, bon ${b.bon}`}
        className="vink-knop"
        onClick={() => dispatch({ type: 'afgeleverd', bestellingId: b.bestellingId, ja: !klaar, nu: nuUtc() })}
      >
        <span>{klaar && <Check size={20} strokeWidth={3} aria-hidden />}</span>
      </button>
      <div>
        <strong>{lidNaam(b.lidId)}</strong>
        <span className="regels">{regels} · {euro(b.totaal)}</span>
        <span className={b.status === 'betaald' ? 'status' : 'status goud'}>{status}</span>
      </div>
    </div>
  )
}

function Stap({ nummer, titel, children }: { nummer: string; titel: string; children: ReactNode }) {
  return (
    <section className="beheer-stap">
      <div className="beheer-stap-kop">
        <span className="stap-nummer" aria-hidden>{nummer}</span>
        <h2>{titel}</h2>
      </div>
      {children}
    </section>
  )
}

function Veld({ label, waarde, onWijzig, invoer, voor, lang = false }: {
  label: string
  waarde: string
  onWijzig: (w: string) => void
  invoer?: 'numeric' | 'decimal'
  voor?: string
  lang?: boolean
}) {
  return (
    <div className={lang ? 'veld tekst-veld' : 'veld'}>
      <span>{label}</span>
      <label>
        {voor && <b style={{ fontSize: 20 }}>{voor}</b>}
        {lang ? (
          <textarea aria-label={label} value={waarde} onChange={(e) => onWijzig(e.target.value)} />
        ) : (
          <input aria-label={label} value={waarde} inputMode={invoer} onChange={(e) => onWijzig(e.target.value)} />
        )}
        {!lang && <Pencil size={18} aria-hidden />}
      </label>
    </div>
  )
}

function VeldZwart({ label, waarde, onWijzig, invoer, type = 'text' }: {
  label: string
  waarde: string
  onWijzig: (w: string) => void
  invoer?: 'decimal'
  type?: string
}) {
  return (
    <label className="veld-zwart">
      <span>{label}</span>
      <input className="invoer" type={type} value={waarde} inputMode={invoer} onChange={(e) => onWijzig(e.target.value)} />
    </label>
  )
}

/** Bestelling namens een lid: lid kiezen, letters en aantallen zoals "G2 H1", afhaalpunt. */
export function Namens({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const leden = voorbeeldLeden.slice(1)
  const [lidId, setLidId] = useState<string | null>(null)
  const [letters, setLetters] = useState('')
  const [punt, setPunt] = useState<string | null>(lijst.afhaalpunten[0]?.afhaalpuntId ?? null)
  const [fout, setFout] = useState<string | null>(null)

  const gelezen = leesLetters(letters)
  const regels = gelezen.regels.map((r) => ({ ...r, wijn: lijst.wijnen.find((w) => w.letter === r.letter) }))
  let probleem = gelezen.fout
  if (!probleem) {
    const onbekend = regels.find((r) => !r.wijn)
    const teVeel = regels.find((r) => r.wijn && r.aantal > r.wijn.voorraad)
    if (onbekend) probleem = `Wijn ${onbekend.letter} staat niet op de lijst.`
    else if (teVeel?.wijn) probleem = `Van wijn ${teVeel.letter} zijn er nog ${teVeel.wijn.voorraad}.`
  }

  const bestel = () => {
    if (lijst.status !== 'open') return setFout('De lijst is gesloten.')
    if (!lidId) return setFout('Kies het lid.')
    if (!punt) return setFout('Kies een afhaalpunt.')
    if (regels.length === 0) return setFout('Schrijf welke wijnen, zoals G2 H1.')
    if (probleem) return setFout(probleem)
    dispatch({
      type: 'bestel', lidId, door: 'beheer', levering: punt, nu: nuUtc(),
      regels: regels.map((r) => ({ wijnId: r.wijn!.wijnId, aantal: r.aantal })),
    })
    dispatch({ type: 'melding', melding: { kop: `Bestelling voor ${lidNaam(lidId)}`, tekst: 'Het lid betaalt als de lijst sluit, net als de anderen.' } })
    ga({ scherm: 'beheer' })
  }

  return (
    <>
      <Kop sub="Beheer" rechts={<span />} />
      <TerugLink titel="Terug naar beheer" onTerug={() => ga({ scherm: 'beheer' })} />
      <main>
        <div className="masthead">
          <h1>
            <span className="groot spook">Namens</span>
            <span className="groot">een lid</span>
          </h1>
        </div>
        <Stap nummer="01" titel="Welk lid?">
          <div className="leden-keuze" role="radiogroup" aria-label="Lid">
            {leden.map((l) => (
              <button key={l.lidId} type="button" role="radio" aria-checked={l.lidId === lidId} onClick={() => setLidId(l.lidId)}>{l.naam}</button>
            ))}
          </div>
        </Stap>
        <Stap nummer="02" titel="Welke wijnen?">
          <label className="veld-zwart">
            <span>Letters en aantallen, zoals in WhatsApp</span>
            <input className="invoer" value={letters} placeholder="G2 H1" autoCapitalize="characters" onChange={(e) => { setLetters(e.target.value); setFout(null) }} />
          </label>
          {letters.trim() && probleem && <p className="fout">{probleem}</p>}
          {letters.trim() && !probleem && regels.length > 0 && (
            <div className="bon-klein" style={{ display: 'block' }}>
              <BonRegels
                regels={regels.map((r) => ({
                  sleutel: r.letter, aantal: r.aantal, letter: r.letter, naam: r.wijn!.naam, jaargang: r.wijn!.jaargang, prijs: r.wijn!.prijs,
                }))}
              />
            </div>
          )}
        </Stap>
        <Stap nummer="03" titel="Waar haalt het lid ze?">
          <Keuze
            label="Afhaalpunt"
            vorm={lijst.afhaalpunten.length === 2 ? 'split' : 'banden'}
            gekozen={punt}
            onKies={setPunt}
            opties={lijst.afhaalpunten.map((a) => ({ id: a.afhaalpuntId, woord: a.naam, zin: a.wanneer }))}
          />
          {fout && <p className="fout" role="alert">{fout}</p>}
          <Hoofdknop onClick={bestel}>Bestel{lidId ? ` voor ${lidNaam(lidId)}` : ''}</Hoofdknop>
          <p className="uitleg-voorbeeld">Het lid krijgt een betaalverzoek als de lijst sluit.</p>
        </Stap>
      </main>
    </>
  )
}
