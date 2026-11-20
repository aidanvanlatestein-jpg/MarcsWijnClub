import { Camera, Check, Pencil } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { BonRegels } from '../onderdelen/Bon'
import { Blad } from '../onderdelen/Blad'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop } from '../onderdelen/Knoppen'
import { Kop, TerugLink } from '../onderdelen/Kop'
import { Tabs, type TabKeuze } from '../onderdelen/Tabbalk'
import { bedrag, euro, naamMetJaar, naarInvoer, nuUtc, tijd, vanInvoer, weekdag, weekNummer } from '../opmaak'
import { herkenBericht, leesEuro, leesLetters } from '../regels'
import type { BeheerTab, Ga } from '../route'
import { afhaalpunt, klaar, opTafel, plus, tellers, useStaat, veilingVanAvond, volgendeLetter } from '../staat'
import type { Bestelling } from '../types'
import { voorbeeldBericht, voorbeeldLeden, voorbeeldLedenBinnen, voorbeeldSnelleZinnen } from '../voorbeeld'
import { LiveBalk } from '../onderdelen/Avond'
import { Send } from 'lucide-react'

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

const TABS: TabKeuze<BeheerTab>[] = [
  { id: 'wijn', label: 'WIJN' },
  { id: 'avond', label: 'AVOND' },
  { id: 'bestellingen', label: 'BESTELLINGEN' },
]

/**
 * Beheer, in drie tabs: een wijn klaarzetten uit een WhatsApp-bericht (14), de avond presenteren (15),
 * en de bestellingen met de paklijst. De hoofdknop staat onderaan, binnen bereik van de duim.
 */
export function Beheer({ ga, tab }: { ga: Ga; tab: BeheerTab }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const lijstOpen = lijst.status === 'open'
  const leeg = (): Formulier => ({
    letter: '', naam: '', jaar: '', aantal: '', prijs: '', tekst: '',
    startbod: '', verhoging: '10', eindtijd: naarInvoer(veilingVanAvond(staat)?.eindtijd ?? plus(lijst.begin, 90 * 60_000)), herkomst: '', bewaring: '',
  })
  const [bericht, setBericht] = useState(voorbeeldBericht)
  const [form, setForm] = useState<Formulier | null>(null)
  const [soort, setSoort] = useState<'lijst' | 'bieding'>('lijst')
  const [foto, setFoto] = useState<string | undefined>()
  const [fout, setFout] = useState<string | null>(null)
  const [sluiten, setSluiten] = useState(false)

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
      if (!lijstOpen) return setFout('De avond is gesloten. Zet de wijn klaar voor de volgende avond.')
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
      dispatch({ type: 'melding', melding: { kop: `Wijn ${letter} staat klaar`, tekst: `${naam}, ${aantal} flessen voor ${euro(prijs)}. Je zet hem tijdens de avond op tafel.` } })
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
          aantalBiedingen: 0, biedingStatus: 'open', mijnBodIsHoogste: false, biedlog: [],
        },
      })
      dispatch({ type: 'melding', melding: { kop: 'De veiling staat klaar', tekst: `${naam}, vanaf ${euro(startbod, { heel: true })}. Hij begint op de avond.` } })
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

  const wachten = new Set(lijstBestellingen.filter((b) => b.status === 'open').map((b) => b.lidId)).size

  let knop: ReactNode = null
  if (tab === 'wijn') knop = <Hoofdknop disabled={!form} onClick={opslaan}>{soort === 'lijst' ? `Zet klaar voor ${weekdag(lijst.begin)}` : 'Zet klaar als veiling'}</Hoofdknop>
  if (tab === 'avond') return <BeheerLive ga={ga} />

  return (
    <>
      <Kop
        sub="Beheer"
        rechts={
          <button type="button" className="tekstlink zonder-lijn" onClick={() => ga({ scherm: 'aanbod' })}>
            Naar de app <span aria-hidden>→</span>
          </button>
        }
      />
      <main>
        {tab === 'wijn' && (
          <>
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
                  {soort === 'lijst' && <Veld label="Wijn" waarde={form.letter} onWijzig={zet('letter')} hoofdletters />}
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
                  { id: 'lijst', woord: 'Lijst', zin: lijstOpen ? `Vaste prijs, ${weekdag(lijst.begin)} vanaf ${tijd(lijst.begin)}` : 'De avond is gesloten' },
                  { id: 'bieding', woord: 'Bieding', zin: 'Startbod, onder de hamer aan het eind' },
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
            </Stap>
          </>
        )}

        {tab === 'bestellingen' && (
          <section className="sectie" style={{ paddingTop: 8 }}>
            <div style={{ borderBottom: '1px solid var(--ink)', paddingBottom: 8 }}>
              <h1 style={{ fontSize: 'min(52px, 14vw)', fontWeight: 700, lineHeight: 1, textTransform: 'uppercase' }}>Bestellingen</h1>
              <p className="label" style={{ marginTop: 6 }}>Week {weekNummer(lijst.openTot)} · {lijstBestellingen.length} van de lijst</p>
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
        )}
        <div style={{ height: 24 }} />
      </main>
      <div className="onderkant">
        {(knop || (tab === 'wijn' && fout)) && (
          <div className="hoofdknop-zone">
            {tab === 'wijn' && fout && <p className="fout" role="alert" style={{ marginBottom: 10 }}>{fout}</p>}
            {knop}
          </div>
        )}
        <Tabs tabs={TABS} actief={tab} onKies={(t) => ga({ scherm: 'beheer', tab: t })} label="Beheer" vrij />
      </div>
      {sluiten && (
        <SluitBevestiging wachten={wachten} onSluit={() => setSluiten(false)} />
      )}
    </>
  )
}

function BestellingRij({ bestelling: b }: { bestelling: Bestelling }) {
  const [staat, dispatch] = useStaat()
  const regels = b.regels.map((r) => (r.letter ? `${r.aantal}× ${r.letter}` : r.naam)).join(' · ')
  let levering = ''
  if (b.soort === 'bieding') levering = afhaalpunt(staat, b.levering)?.naam ?? 'nog niet gekozen'
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

function Veld({ label, waarde, onWijzig, invoer, voor, lang = false, hoofdletters = false }: {
  label: string
  waarde: string
  onWijzig: (w: string) => void
  invoer?: 'numeric' | 'decimal'
  voor?: string
  lang?: boolean
  hoofdletters?: boolean
}) {
  return (
    <div className={lang ? 'veld tekst-veld' : 'veld'}>
      <span>{label}</span>
      <label>
        {voor && <b style={{ fontSize: 20 }}>{voor}</b>}
        {lang ? (
          <textarea aria-label={label} value={waarde} onChange={(e) => onWijzig(e.target.value)} />
        ) : (
          <input aria-label={label} value={waarde} inputMode={invoer} autoCapitalize={hoofdletters ? 'characters' : undefined} enterKeyHint="done" onChange={(e) => onWijzig(e.target.value)} />
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
    ga({ scherm: 'beheer', tab: 'bestellingen' })
  }

  return (
    <>
      <Kop sub="Beheer" rechts={<span />} />
      <TerugLink titel="Terug naar bestellingen" onTerug={() => ga({ scherm: 'beheer', tab: 'bestellingen' })} />
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
          <p className="uitleg-voorbeeld">Het lid krijgt een betaalverzoek als de lijst sluit.</p>
        </Stap>
        <div style={{ height: 24 }} />
      </main>
      <div className="onderkant">
        <div className="hoofdknop-zone">
          {fout && <p className="fout" role="alert" style={{ marginBottom: 10 }}>{fout}</p>}
          <Hoofdknop onClick={bestel}>Bestel{lidId ? ` voor ${lidNaam(lidId)}` : ''}</Hoofdknop>
        </div>
      </div>
    </>
  )
}

/** Sluiten is niet terug te draaien: daarom eerst een bevestiging (bouwspecificatie, M10). */
function SluitBevestiging({ wachten, onSluit }: { wachten: number; onSluit: () => void }) {
  const [, dispatch] = useStaat()
  return (
    <Blad titel="De avond sluiten?" onSluit={onSluit}>
      <p className="tekst">
        {wachten === 0 ? 'Er zijn nog geen bestellingen. ' : `${wachten} ${wachten === 1 ? 'lid krijgt' : 'leden krijgen'} een betaalverzoek. `}
        Daarna kan niemand meer bestellen; wijnen die nog klaarstaan, komen niet op tafel. Een lopende veiling gaat door tot de hamer.
        Dit kun je niet terugdraaien.
      </p>
      <Hoofdknop
        onClick={() => {
          onSluit()
          dispatch({ type: 'sluitLijst', nu: nuUtc() })
        }}
      >
        Sluit de avond
      </Hoofdknop>
      <button type="button" className="knop-grijs" onClick={onSluit}>
        <span>Toch niet</span>
      </button>
    </Blad>
  )
}

/** Een flessenrij om naar te kijken, zonder knoppen. */
function KleineRij({ vrij, partij }: { vrij: number; partij: number }) {
  return (
    <div className="flessenrij" aria-hidden>
      {Array.from({ length: Math.min(partij, 12) }, (_, i) => <span key={i} className={i < vrij ? 'fles' : 'fles weg'} />)}
    </div>
  )
}

/** 15 Beheer live: Marc presenteert. Wijnen op tafel zetten, iets zeggen, de veiling starten, de avond sluiten. */
function BeheerLive({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [tekst, setTekst] = useState('')
  const [sluiten, setSluiten] = useState(false)
  const { lijst } = staat
  const t = tellers(staat)
  const klaarstaand = klaar(staat)
  const opDeTafel = [...opTafel(staat)].reverse()
  const veiling = veilingVanAvond(staat)
  const live = lijst.fase === 'live'
  const volgende = klaarstaand[0]
  const wachten = new Set(staat.bestellingen.filter((b) => b.lijstId === lijst.lijstId && b.status === 'open').map((b) => b.lidId)).size

  const stuur = (zin: string) => {
    dispatch({ type: 'bericht', tekst: zin, nu: nuUtc() })
    setTekst('')
  }

  let balk = `JE BENT LIVE · SINDS ${tijd(lijst.begin)}`
  if (lijst.fase === 'aangekondigd') balk = `AANGEKONDIGD · BEGIN ${tijd(lijst.begin)}`
  if (lijst.fase === 'gesloten') balk = 'DE AVOND IS GESLOTEN'

  let knop: ReactNode = null
  if (lijst.fase === 'aangekondigd') knop = <Hoofdknop onClick={() => dispatch({ type: 'beginAvond', nu: nuUtc() })}>Begin de avond</Hoofdknop>
  else if (live && volgende) knop = <Hoofdknop onClick={() => dispatch({ type: 'zetOpTafel', wijnId: volgende.wijnId, nu: nuUtc() })}>Zet wijn {volgende.letter} op tafel</Hoofdknop>
  else if (live) knop = <Hoofdknop onClick={() => setSluiten(true)}>Sluit de avond</Hoofdknop>

  return (
    <>
      <LiveBalk marc tekst={balk} rechts={live ? `${voorbeeldLedenBinnen} LEDEN BINNEN` : undefined} />
      <main>
        <div className="masthead" style={{ paddingTop: 16 }}>
          <h1>
            <span className="groot">De avond</span>
            <span className="groot spook" style={{ fontSize: 'min(64px, 16vw)' }}>van {weekdag(lijst.begin)}</span>
          </h1>
        </div>
        <div className="tellers lijn-boven lijn-onder">
          <div><strong>{t.flessen}</strong><span>FLESSEN</span></div>
          <div><strong>{t.bestellingen}</strong><span>BESTELLINGEN</span></div>
          <div><strong>{euro(t.betaald, { heel: true })}</strong><span>BETAALD</span></div>
        </div>

        <BeheerBlok titel="Klaar om neer te zetten" rechts={`${klaarstaand.length} ${klaarstaand.length === 1 ? 'WIJN' : 'WIJNEN'}`}>
          {klaarstaand.length === 0 && <p className="tekst klein gedempt">Alles staat op tafel.</p>}
          {klaarstaand.map((w) => (
            <div key={w.wijnId} className="beheer-wijn">
              <span className="beheer-letter" aria-hidden>{w.letter}</span>
              <div>
                <strong>{naamMetJaar(w)}</strong>
                <span>{w.partij ?? w.voorraad} flessen · {euro(w.prijs)} · {w.foto ? 'tekst en foto klaar' : 'nog geen foto'}</span>
              </div>
              <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => ga({ scherm: 'beheer', tab: 'wijn' })}>Bewerk</button>
            </div>
          ))}
        </BeheerBlok>

        <BeheerBlok titel="Op tafel" rechts={`${opDeTafel.length} ${opDeTafel.length === 1 ? 'WIJN' : 'WIJNEN'}`}>
          {opDeTafel.length === 0 && <p className="tekst klein gedempt">Nog niets op tafel.</p>}
          {opDeTafel.map((w) => (
            <div key={w.wijnId} className={w.voorraad === 0 ? 'beheer-wijn op-tafel op' : 'beheer-wijn op-tafel'}>
              <span className="beheer-letter klein" aria-hidden>{w.letter}</span>
              <div>
                <strong>{naamMetJaar(w, { kort: true })}</strong>
                <KleineRij vrij={w.voorraad} partij={w.partij ?? w.voorraad} />
              </div>
              <p className="beheer-rest">
                <strong>{w.voorraad === 0 ? 'OP' : `NOG ${w.voorraad}`}</strong>
                <span>SINDS {tijd(w.opTafelSinds!)}</span>
              </p>
            </div>
          ))}
        </BeheerBlok>

        {live && (
          <BeheerBlok titel="Zeg iets tegen de tafel">
            <form className="bericht-veld" onSubmit={(e) => { e.preventDefault(); stuur(tekst) }}>
              <label className="sr" htmlFor="bericht-tafel">Bericht aan de tafel</label>
              <input
                id="bericht-tafel"
                className="invoer"
                value={tekst}
                placeholder="Typ een bericht…"
                enterKeyHint="send"
                onChange={(e) => { setTekst(e.target.value); dispatch({ type: 'marcTypt', ja: e.target.value.trim().length > 0 }) }}
                onBlur={() => dispatch({ type: 'marcTypt', ja: false })}
              />
              <button type="submit" className="stuur" aria-label="Stuur" disabled={!tekst.trim()}><Send size={22} aria-hidden /></button>
            </form>
            {voorbeeldSnelleZinnen.map((zin) => (
              <button key={zin} type="button" className="snelle-zin" onClick={() => stuur(zin)}>{zin}</button>
            ))}
            <p className="uitleg-voorbeeld">Voorbeeldzinnen. Marc stelt zijn snelle zinnen zelf in.</p>
          </BeheerBlok>
        )}

        {veiling && (
          <BeheerBlok
            titel="De veiling"
            rechts={veiling.biedingStatus === 'gesloten' ? 'AFGELOPEN' : veiling.geopend ? `HAMER ${tijd(veiling.eindtijd)}` : `START OM ${tijd(lijst.veilingBegin)}`}
          >
            <div className="beheer-wijn">
              <span className="beheer-letter goud" aria-hidden>★</span>
              <div>
                <strong>{naamMetJaar(veiling, { kort: true })}</strong>
                <span>
                  {veiling.geopend
                    ? `${veiling.hoogsteBod ? `Hoogste bod ${euro(veiling.hoogsteBod, { heel: true })}` : 'Nog geen bod'} · ${veiling.aantalBiedingen ?? 0} biedingen`
                    : `Startbod ${euro(veiling.startbod, { heel: true })} · +${euro(veiling.minimaleVerhoging, { heel: true })} · hamer ${tijd(veiling.eindtijd)}`}
                </span>
              </div>
              {live && !veiling.geopend && veiling.biedingStatus === 'open' && (
                <button type="button" className="knop-nu" onClick={() => dispatch({ type: 'openVeiling', wijnId: veiling.wijnId, nu: nuUtc() })}>Nu starten</button>
              )}
            </div>
          </BeheerBlok>
        )}
        <div style={{ height: 24 }} />
      </main>
      <div className="onderkant">
        {knop && (
          <div className="hoofdknop-zone">
            {knop}
            {live && volgende && (
              <button type="button" className="tekstlink zonder-lijn gedempt" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => setSluiten(true)}>
                Sluit de avond
              </button>
            )}
          </div>
        )}
        <Tabs tabs={TABS} actief="avond" onKies={(tab) => ga({ scherm: 'beheer', tab })} label="Beheer" vrij />
      </div>
      {sluiten && <SluitBevestiging wachten={wachten} onSluit={() => setSluiten(false)} />}
    </>
  )
}

function BeheerBlok({ titel, rechts, children }: { titel: string; rechts?: string; children: ReactNode }) {
  return (
    <section className="beheer-blok">
      <div className="beheer-blok-kop">
        <h2>{titel}</h2>
        {rechts && <span>{rechts}</span>}
      </div>
      {children}
    </section>
  )
}
