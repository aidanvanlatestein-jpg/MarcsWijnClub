// De veiling (design-v4): de zaal, het biedpaneel, eenmaal andermaal en de hamerslag. De bijzondere
// fles met herkomst, bewaring en spraakbericht staat niet in design-v4; dat scherm komt uit design-v3 (06).
import { Check, Gavel, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Avatar, LiveBalk, MarcBericht } from '../onderdelen/Avond'
import { Betalen } from '../onderdelen/Betalen'
import { Blad } from '../onderdelen/Blad'
import { GrootBedrag, Hoofdknop, Onderkant, Stippellijn } from '../onderdelen/Knoppen'
import { Kop, ZwevendeNav } from '../onderdelen/Kop'
import { dagEnTijd, euro, geleden, heelBedrag, klok, kortJaar, naamMetJaar, nuUtc, tijd, weekdag } from '../opmaak'
import { terug, type Ga } from '../route'
import {
  eersteWoord, plus, HOOGSTE_FACTOR, LAATSTE_MINUTEN, mijnBiedingBestelling, useNu, useStaat, zoekBieding,
  type BiedingStaat,
} from '../staat'
import { voorbeeldBerichten, voorbeeldLedenKijken } from '../voorbeeld'
import { Terugblik } from './Aanbod'
import { BonStatus } from './Toestanden'

/** De hogere stap naast "Bied": het eerstvolgende veelvoud van € 50 boven het minimum. */
function hogereStap(minimum: number): number {
  return Math.ceil((minimum + 1) / 5000) * 5000
}

function titelWoorden(b: BiedingStaat): string[] {
  const woorden = b.naam.toUpperCase().split(' ')
  if (b.jaargang) woorden[woorden.length - 1] += ` ${kortJaar(b.jaargang)}`
  return woorden
}

// ---- De bijzondere fles (design-v3, scherm 06) ----

export function Fles({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat] = useStaat()
  const [bieden, setBieden] = useState<number | null>(null)
  const b = zoekBieding(staat, wijnId)
  if (!b) return <Weg ga={ga} />

  const open = b.biedingStatus === 'open'
  const loopt = open && Boolean(b.geopend)
  const overboden = open && b.mijnBod !== undefined && !b.mijnBodIsHoogste
  const gewonnen = mijnBiedingBestelling(staat, wijnId)
  const hamer = `HAMER ${weekdag(b.eindtijd).toUpperCase()} ${tijd(b.eindtijd)}`
  const herkomst = [b.druif, b.streek, 'UIT MARCS KELDER'].filter(Boolean).join(' · ')

  let label = b.hoogsteBod ? 'HOOGSTE BOD' : 'STARTBOD'
  if (overboden) label = 'OVERBODEN · HOOGSTE BOD'
  if (!open) label = 'VERKOCHT VOOR'

  const advies = [
    { kop: 'Waarom deze', tekst: b.tekst },
    { kop: 'Wanneer', tekst: b.drinken },
    { kop: 'Erbij', tekst: b.spijs },
  ].filter((a): a is { kop: string; tekst: string } => Boolean(a.tekst))

  let knop = null
  if (!open) knop = <Hoofdknop onClick={() => ga(gewonnen ? { scherm: 'gewonnen', wijnId } : { scherm: 'veiling', wijnId })}>{gewonnen ? 'Naar je fles' : 'Naar de zaal'}</Hoofdknop>
  else if (!loopt) knop = <Hoofdknop onClick={() => ga({ scherm: 'veiling', wijnId })}>Naar de veiling · {tijd(staat.lijst.veilingBegin)}</Hoofdknop>
  else if (b.mijnBodIsHoogste) knop = <Hoofdknop className="bovenaan" disabled icoon={<Check size={26} className="goud" aria-hidden />}>Je staat bovenaan</Hoofdknop>
  else knop = <Hoofdknop onClick={() => setBieden(b.minimaalVolgendBod)}>Bied {euro(b.minimaalVolgendBod, { heel: true })}</Hoofdknop>

  return (
    <>
      <main>
        <div className="poster-groot">
          {b.foto ? <img src={b.foto} alt="" /> : null}
          <span className="verloop" aria-hidden />
          <ZwevendeNav titel="Bijzondere fles" onTerug={() => terug(() => ga({ scherm: 'aanbod' }))} vraag={`Hoi Marc, een vraag over de ${naamMetJaar(b)}: `} />
          <span className="sluit-rand" aria-hidden>{hamer} — {hamer}</span>
          <div className="poster-titel">
            <p className="label goud">BIEDING · 1 FLES</p>
            <h1>{titelWoorden(b).map((w, i) => <span key={i} style={{ display: 'block' }}>{w}</span>)}</h1>
            <p className="herkomst-regel">{herkomst}</p>
          </div>
        </div>
        <p className="sr">{open ? `De hamer valt ${dagEnTijd(b.eindtijd)}` : 'Deze veiling is afgelopen'}</p>

        <section className="stand" aria-label="Stand van de veiling" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className={overboden ? 'label goud' : 'label'}>{label}</p>
            <GrootBedrag centen={b.hoogsteBod ?? b.startbod} heel />
          </div>
          <p className="rechts">
            {b.mijnBodIsHoogste && <span className="goud">{open ? 'JIJ BENT DE HOOGSTE' : 'JIJ HEBT GEWONNEN'}</span>}
            {overboden && b.mijnBod && <span>JOUW BOD {euro(b.mijnBod, { heel: true })}</span>}
            {loopt || !open ? <strong>{b.aantalBiedingen ?? 0} BIEDINGEN</strong> : <strong>BEGINT {tijd(staat.lijst.veilingBegin)}</strong>}
            {open && <span>MIN. + {euro(b.minimaleVerhoging, { heel: true })}</span>}
          </p>
        </section>
        {loopt && (
          <button type="button" className="tekstlink" style={{ margin: '4px var(--marge) 0' }} onClick={() => ga({ scherm: 'veiling', wijnId })}>
            Naar de zaal →
          </button>
        )}

        <Spraakbericht />

        <div className="advies">
          {advies.map((a, i) => (
            <div key={a.kop} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Stippellijn />
              <div className="advies-blok">
                <span className="nummer" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{a.kop}</h2>
                  <p className="tekst">{a.tekst}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(b.herkomst || b.bewaring) && (
          <div className="fiche">
            {b.herkomst && (
              <div>
                <p className="label goud">Herkomst</p>
                <p className="tekst klein">{b.herkomst}</p>
              </div>
            )}
            {b.bewaring && (
              <div>
                <p className="label goud">Bewaring</p>
                <p className="tekst klein">{b.bewaring}</p>
              </div>
            )}
          </div>
        )}
      </main>
      <Onderkant ga={ga} knop={knop} />
      {bieden !== null && <Bieden bieding={b} begin={bieden} onSluit={() => setBieden(null)} />}
    </>
  )
}

// ---- De zaal, eenmaal andermaal en de hamerslag ----

export function Veiling({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat] = useStaat()
  const nu = useNu(1000)
  const b = zoekBieding(staat, wijnId)
  if (!b) return <Weg ga={ga} />
  const naarAvond = () => terug(() => ga({ scherm: 'aanbod' }))
  if (b.biedingStatus === 'gesloten') return <Hamerslag bieding={b} ga={ga} />
  const rest = new Date(b.eindtijd).getTime() - nu
  if (b.geopend && rest <= LAATSTE_MINUTEN && staat.instellingen.levendig) {
    return <EenmaalAndermaal bieding={b} rest={rest} ga={ga} onTerug={naarAvond} />
  }
  return <Zaal bieding={b} nu={nu} ga={ga} onTerug={naarAvond} />
}

/** Het bedrag telt in 300 ms op naar een nieuw hoogste bod. Met prefers-reduced-motion direct. */
function useOptellen(doel: number): number {
  const [waarde, setWaarde] = useState(doel)
  const vorige = useRef(doel)
  useEffect(() => {
    const van = vorige.current
    vorige.current = doel
    if (van === doel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaarde(doel)
      return
    }
    const start = performance.now()
    let frame = 0
    const stap = (t: number) => {
      const f = Math.min(1, (t - start) / 300)
      setWaarde(Math.round((van + (doel - van) * (1 - (1 - f) ** 2)) / 100) * 100)
      if (f < 1) frame = requestAnimationFrame(stap)
    }
    frame = requestAnimationFrame(stap)
    return () => cancelAnimationFrame(frame)
  }, [doel])
  return waarde
}

function HeroBedrag({ centen, goud = false }: { centen: number; goud?: boolean }) {
  const waarde = useOptellen(centen)
  return (
    <span className={goud ? 'hero-bedrag goud' : 'hero-bedrag'}>
      <span className="eur">€</span>
      <span className="getal">{heelBedrag(waarde)}</span>
    </span>
  )
}

function BiedKnoppen({ bieding: b, onBied }: { bieding: BiedingStaat; onBied: (bedrag: number) => void }) {
  if (b.mijnBodIsHoogste) {
    return (
      <Hoofdknop className="bovenaan" disabled icoon={<Check size={26} className="goud" aria-hidden />}>
        Je staat bovenaan
      </Hoofdknop>
    )
  }
  const hoger = hogereStap(b.minimaalVolgendBod)
  return (
    <div className="bied-knoppen">
      <Hoofdknop icoon={<Gavel size={26} aria-hidden />} onClick={() => onBied(b.minimaalVolgendBod)}>
        Bied {euro(b.minimaalVolgendBod, { heel: true })}
      </Hoofdknop>
      {hoger <= b.minimaalVolgendBod * HOOGSTE_FACTOR && (
        <button type="button" className="knop-hoger" aria-label={`Bied ${euro(hoger, { heel: true })}`} onClick={() => onBied(hoger)}>
          {euro(hoger, { heel: true })}
        </button>
      )}
    </div>
  )
}

function Zaal({ bieding: b, nu, ga, onTerug }: { bieding: BiedingStaat; nu: number; ga: Ga; onTerug: () => void }) {
  const [staat] = useStaat()
  const [bieden, setBieden] = useState<number | null>(null)
  const overboden = b.mijnBod !== undefined && !b.mijnBodIsHoogste
  let label = b.hoogsteBod ? 'HOOGSTE BOD' : 'STARTBOD'
  if (overboden) label = 'OVERBODEN · HOOGSTE BOD'
  if (b.mijnBodIsHoogste) label = 'JIJ BENT DE HOOGSTE'

  return (
    <>
      <LiveBalk tekst={b.geopend ? 'DE VEILING · LIVE' : 'DE VEILING'} rechts={`${voorbeeldLedenKijken} LEDEN KIJKEN`} onTerug={onTerug} />
      <main>
        <button type="button" className="kavel" onClick={() => ga({ scherm: 'fles', wijnId: b.wijnId })}>
          {b.foto ? <img src={b.foto} alt="" /> : null}
          <span className="verloop-links" aria-hidden />
          <span className="kavel-tekst">
            <span className="label goud">De veiling van vanavond</span>
            <span className="kavel-naam">{titelWoorden(b).join(' ')}</span>
            <span className="sr">, meer over deze fles</span>
          </span>
        </button>
        <section className="zaal-stand" aria-label="Stand van de veiling">
          <div>
            <p className={overboden || b.mijnBodIsHoogste ? 'label goud' : 'label'}>{label}</p>
            <HeroBedrag centen={b.hoogsteBod ?? b.startbod} />
          </div>
          <p className="zaal-hamer">
            <span>{b.geopend ? 'HAMER OM' : 'BEGINT OM'}</span>
            <strong>{tijd(b.geopend ? b.eindtijd : staat.lijst.veilingBegin)}</strong>
          </p>
        </section>
        <p className="sr" aria-live="assertive">{overboden ? `Je bent overboden. Hoogste bod nu ${euro(b.hoogsteBod ?? 0, { heel: true })}.` : ''}</p>
        {b.geopend ? (
          <Biedlog bieding={b} nu={nu} bijnamen={staat.instellingen.bijnamen} />
        ) : (
          <p className="sectie tekst gedempt">Marc opent de veiling om {tijd(staat.lijst.veilingBegin)}. Startbod {euro(b.startbod, { heel: true })}.</p>
        )}
        <p className="uitleg-voorbeeld" style={{ padding: '12px var(--marge)' }}>Voorbeeld: de bieders en de woorden van Marc zijn verzonnen.</p>
      </main>
      <Onderkant ga={ga} knop={b.geopend ? <BiedKnoppen bieding={b} onBied={setBieden} /> : <Hoofdknop disabled>Bieden kan vanaf {tijd(staat.lijst.veilingBegin)}</Hoofdknop>} />
      {bieden !== null && <Bieden bieding={b} begin={bieden} onSluit={() => setBieden(null)} />}
    </>
  )
}

/** De biedlog: nieuwste bovenaan, oudere regels steeds lichter. Berichten van Marc staan ertussen. */
function Biedlog({ bieding: b, nu, bijnamen }: { bieding: BiedingStaat; nu: number; bijnamen: boolean }) {
  const regels = [...b.biedlog].reverse()
  return (
    <ol className="biedlog" aria-label="Biedingen, nieuwste eerst">
      {regels.map((r, i) => {
        const dekking = Math.max(0.35, 1 - i * 0.16)
        if (r.soort === 'bericht') {
          return (
            <li key={i} className="biedlog-bericht" style={{ opacity: dekking }}>
              <Avatar maat={26} />
              <span>“{r.tekst}”</span>
            </li>
          )
        }
        const jij = r.soort === 'bod' && r.bieder === 'jij'
        let wie = 'Marc opent de veiling'
        if (r.soort === 'bod') wie = jij ? 'Jij' : bijnamen ? `Bieder ${r.bieder}` : ''
        return (
          <li key={i} className={`biedlog-bod${jij ? ' jij' : ''}`} style={{ opacity: dekking }}>
            <strong>{euro(r.bedrag, { heel: true })}</strong>
            <span className="wie">{wie}</span>
            <span className="wanneer">{r.soort === 'open' ? tijd(r.op) : geleden(r.op, nu)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function EenmaalAndermaal({ bieding: b, rest, ga, onTerug }: { bieding: BiedingStaat; rest: number; ga: Ga; onTerug: () => void }) {
  const [bieden, setBieden] = useState<number | null>(null)
  const overboden = b.mijnBod !== undefined && !b.mijnBodIsHoogste
  const laatsteBericht = [...b.biedlog].reverse().find((l) => l.soort === 'bericht')
  const seconden = Math.ceil(rest / 1000)
  // De klok wordt niet elke seconde voorgelezen, alleen bij 1:00 en 0:30.
  const [voorlezen, setVoorlezen] = useState('')
  useEffect(() => {
    if (seconden === 60) setVoorlezen('Nog een minuut tot de hamer.')
    if (seconden === 30) setVoorlezen('Nog dertig seconden tot de hamer.')
  }, [seconden])
  return (
    <>
      <LiveBalk tekst="DE VEILING · LAATSTE MINUTEN" rechts={`${voorbeeldLedenKijken + 7} LEDEN KIJKEN`} onTerug={onTerug} />
      <main className="eenmaal">
        <h1 className="eventkop">
          <span>Eenmaal,</span>
          <span className="spook" aria-hidden>Andermaal…</span>
          <span className="sr">andermaal</span>
        </h1>
        <section className="zaal-stand" aria-label="Stand van de veiling" style={{ padding: '24px 0 0' }}>
          <div>
            <p className={overboden || b.mijnBodIsHoogste ? 'label goud' : 'label'}>
              {b.mijnBodIsHoogste ? 'JIJ BENT DE HOOGSTE' : overboden ? 'OVERBODEN · HOOGSTE BOD' : 'HOOGSTE BOD'}
            </p>
            <HeroBedrag centen={b.hoogsteBod ?? b.startbod} goud={b.mijnBodIsHoogste} />
          </div>
          <p className="zaal-hamer">
            <span>HAMER OVER</span>
            <strong aria-hidden>{klok(rest)}</strong>
          </p>
        </section>
        <p className="sr" aria-live="polite">{voorlezen}</p>
        <p className="sr" aria-live="assertive">{overboden ? 'Je bent overboden.' : ''}</p>
        <div className="tijdlijn" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, (rest / LAATSTE_MINUTEN) * 100))}%` }} /></div>
        <p className="tekst klein gedempt">Een bod in de laatste twee minuten verlengt de veiling met twee minuten. De klok loopt rustig af, zonder knipperen.</p>
        {laatsteBericht && laatsteBericht.soort === 'bericht' && (
          <div className="biedlog-bericht" style={{ padding: '8px 0' }}>
            <Avatar maat={26} />
            <span>“{laatsteBericht.tekst}”</span>
          </div>
        )}
      </main>
      <Onderkant ga={ga} knop={<BiedKnoppen bieding={b} onBied={setBieden} />} />
      {bieden !== null && <Bieden bieding={b} begin={bieden} onSluit={() => setBieden(null)} />}
    </>
  )
}

/** VER-KOCHT. voor de winnaar, AFGELOPEN. voor de anderen, met de terugblik op de avond. */
function Hamerslag({ bieding: b, ga }: { bieding: BiedingStaat; ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [betalen, setBetalen] = useState(false)
  const bestelling = mijnBiedingBestelling(staat, b.wijnId)
  const naam = naamMetJaar(b, { kort: true })
  const prijs = euro(b.hoogsteBod ?? b.startbod, { heel: true })
  const betaald = bestelling?.status === 'betaald'

  let knop = <Hoofdknop onClick={() => ga({ scherm: 'aanbod' })}>Terug naar het aanbod</Hoofdknop>
  if (bestelling && betaald) knop = <Hoofdknop onClick={() => ga({ scherm: 'gewonnen', wijnId: b.wijnId })}>Naar je fles</Hoofdknop>
  else if (bestelling && bestelling.status === 'open') knop = <Hoofdknop goud onClick={() => setBetalen(true)}>Betaal {euro(bestelling.totaal, { heel: true })} met iDEAL</Hoofdknop>

  return (
    <>
      <main>
        <div className="sectie" style={{ gap: 16, paddingTop: 28 }}>
          <p className="label">{tijd(b.eindtijd)} · Hamerslag</p>
          {bestelling ? (
            <>
              <h1 className="eventkop goud verkocht">Ver-<br />kocht.</h1>
              <p className="tekst" style={{ fontSize: 22, fontWeight: 400 }}>De {naam} is van jou: {prijs}.</p>
              <MarcBericht groot tekst={voorbeeldBerichten.verkocht} op={plus(b.eindtijd, 60_000)} />
              <p className="uitleg-voorbeeld">Voorbeeldtekst. Marc schrijft dit bericht zelf.</p>
            </>
          ) : (
            <>
              <h1 className="eventkop">Afgelopen.</h1>
              <p className="tekst" style={{ fontSize: 22, fontWeight: 400 }}>
                {b.hoogsteBod ? `De ${eersteWoord(b.naam)} ging voor ${prijs}.` : `Er is niet geboden op de ${eersteWoord(b.naam)}.`}
              </p>
            </>
          )}
          <div style={{ marginTop: 4 }}>{knop}</div>
          {bestelling && bestelling.status === 'open' && (
            <p className="tekst klein gedempt">Je hebt 48 uur om te betalen. Daarna kies je: brengen of halen.</p>
          )}
        </div>
        <div className="vlak">
          <Terugblik />
        </div>
      </main>
      {betalen && bestelling && (
        <Betalen
          bedrag={bestelling.totaal}
          onSluit={() => setBetalen(false)}
          onKlaar={(gelukt) => {
            setBetalen(false)
            dispatch({ type: 'betaal', bestellingId: bestelling.bestellingId, gelukt, nu: nuUtc() })
            ga({ scherm: 'gewonnen', wijnId: b.wijnId })
          }}
        />
      )}
    </>
  )
}

// ---- Spraakbericht ----

/** Een golf die er steeds hetzelfde uitziet. Er is nog geen opname van Marc. */
const GOLF = Array.from({ length: 48 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 82))
const DUUR = 30

function Spraakbericht() {
  const [speelt, setSpeelt] = useState(false)
  const [positie, setPositie] = useState(0)
  useEffect(() => {
    if (!speelt) return
    const t = window.setInterval(() => {
      setPositie((p) => {
        if (p + 0.25 >= DUUR) {
          setSpeelt(false)
          return 0
        }
        return p + 0.25
      })
    }, 250)
    return () => window.clearInterval(t)
  }, [speelt])
  const gespeeld = Math.round((positie / DUUR) * GOLF.length)
  const rest = Math.ceil(DUUR - positie)
  return (
    <section className="spraak" aria-label="Spraakbericht van Marc">
      <div className="spraak-kop">
        <div>
          <button type="button" className="speel" aria-label={speelt ? 'Pauzeer' : 'Speel af'} onClick={() => setSpeelt((s) => !s)}>
            {speelt ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
          </button>
          <strong>MARC VERTELT</strong>
        </div>
        <span className="gedempt">0:{String(speelt || positie ? rest : DUUR).padStart(2, '0')}</span>
      </div>
      <div
        className="golf"
        role="slider"
        tabIndex={0}
        aria-label="Spoel door het spraakbericht"
        aria-valuemin={0}
        aria-valuemax={DUUR}
        aria-valuenow={Math.round(positie)}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPositie(Math.max(0, Math.min(DUUR - 1, ((e.clientX - r.left) / r.width) * DUUR)))
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setPositie((p) => Math.min(DUUR - 1, p + 5))
          if (e.key === 'ArrowLeft') setPositie((p) => Math.max(0, p - 5))
        }}
      >
        {GOLF.map((h, i) => <span key={i} className={i < gespeeld ? 'gespeeld' : undefined} style={{ height: `${h}%` }} />)}
      </div>
      <p className="uitleg-voorbeeld">Voorbeeld: er is nog geen opname. Marc spreekt later per fles 30 seconden in.</p>
    </section>
  )
}

// ---- 08 Bod bevestigen ----

/** Zoveel px vegen is één trede op de ladder. Ruim boven een tik, ruim onder de hoogte van een trede. */
const VEEG_PER_TREDE = 28
/** Zoveel px scrollen met muiswiel of trackpad is één trede, met hoogstens één trede per WIEL_RUST ms. */
const WIEL_PER_TREDE = 24
const WIEL_RUST = 100
/** Na zo'n pauze begint een nieuwe scrollbeweging bij nul. */
const WIEL_PAUZE = 500

/** De ladder: hogere bedragen boven, het gekozen bod groot, het hoogste bod onderaan. */
function Bieden({ bieding, begin, onSluit }: { bieding: BiedingStaat; begin: number; onSluit: () => void }) {
  const [, dispatch] = useStaat()
  const [minimum, setMinimum] = useState(bieding.minimaalVolgendBod)
  const [conflict, setConflict] = useState(false)
  const veeg = useRef<{ id: number; y: number; stap: number } | null>(null)
  const versleept = useRef(false)
  // Het minimum, de hogere stap en nog een stap daarboven. Boven het hoogste toegestane bod valt weg.
  const hoger = hogereStap(minimum)
  const bedragen = [...new Set([minimum, hoger, hoger + 5000])].filter((x) => x <= minimum * HOOGSTE_FACTOR)
  const [stap, setStap] = useState(() => Math.max(0, bedragen.indexOf(begin)))
  const gekozen = bedragen[Math.min(stap, bedragen.length - 1)]
  const hoogste = bieding.hoogsteBod ?? bieding.startbod

  const kies = (i: number) => setStap(Math.max(0, Math.min(bedragen.length - 1, i)))
  const toets = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') kies(stap + 1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') kies(stap - 1)
    else return
    e.preventDefault()
  }
  // Het bod loopt mee met de vinger: elke VEEG_PER_TREDE px is één trede, zonder te wachten op het
  // loslaten. Aan het eind van de ladder schuift het ankerpunt mee met de vinger, zodat omkeren
  // meteen werkt. Met de muis werkt slepen hetzelfde.
  const stopVeeg = () => { veeg.current = null }
  const vegen = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      veeg.current = { id: e.pointerId, y: e.clientY, stap: Math.min(stap, bedragen.length - 1) }
      versleept.current = false
    },
    onPointerMove: (e: PointerEvent) => {
      const v = veeg.current
      if (!v || v.id !== e.pointerId) return
      const treden = Math.trunc((v.y - e.clientY) / VEEG_PER_TREDE)
      if (treden === 0) return
      const doel = v.stap + treden
      const nieuw = Math.max(0, Math.min(bedragen.length - 1, doel))
      v.y = doel === nieuw ? v.y - treden * VEEG_PER_TREDE : e.clientY
      v.stap = nieuw
      if (!versleept.current) {
        // Vanaf de eerste trede hoort de veeg bij de ladder, ook als de vinger of muis erbuiten komt.
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* de aanwijzer is al weg */ }
        versleept.current = true
      }
      setStap(nieuw)
    },
    onPointerUp: stopVeeg,
    onPointerCancel: stopVeeg,
    onPointerLeave: stopVeeg,
  }
  // Muiswiel en trackpad: omhoog scrollen, naar de bedragen die erboven staan, is een hoger bod.
  // Eén klik van het wiel is één trede; een trackpad stuurt veel kleine stapjes, die tellen op tot
  // WIEL_PER_TREDE. React luistert passief naar het wiel, dus de luisteraar staat op het element
  // zelf: alleen zo scrolt het paneel niet mee.
  const ladder = useRef<HTMLDivElement>(null)
  const aantal = bedragen.length
  useEffect(() => {
    const el = ladder.current
    if (!el) return
    let som = 0
    let laatste = 0
    let laatsteTrede = 0
    const wiel = (e: WheelEvent) => {
      if (e.ctrlKey) return // knijpen op een trackpad: dat is zoomen
      e.preventDefault()
      // Sommige browsers melden regels of pagina's in plaats van px.
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY
      if (px === 0) return
      if (e.timeStamp - laatste > WIEL_PAUZE || Math.sign(px) !== Math.sign(som)) som = 0
      laatste = e.timeStamp
      som += px
      if (Math.abs(som) < WIEL_PER_TREDE || e.timeStamp - laatsteTrede < WIEL_RUST) return
      const richting = som < 0 ? 1 : -1
      som = 0
      laatsteTrede = e.timeStamp
      setStap((s) => Math.max(0, Math.min(aantal - 1, s + richting)))
    }
    el.addEventListener('wheel', wiel, { passive: false })
    return () => el.removeEventListener('wheel', wiel)
  }, [aantal])

  // Na een veeg die op een bedrag eindigt, volgt soms nog een tik: die telt niet als keuze.
  const tik = (i: number) => {
    if (versleept.current) versleept.current = false
    else kies(i)
  }

  const bevestig = () => {
    if (gekozen < bieding.minimaalVolgendBod) {
      // Iemand anders bood hoger: de ladder schuift door naar het nieuwe minimum.
      setMinimum(bieding.minimaalVolgendBod)
      setStap(0)
      setConflict(true)
      return
    }
    dispatch({ type: 'bied', wijnId: bieding.wijnId, bedrag: gekozen, nu: nuUtc() })
    onSluit()
  }

  return (
    <Blad titel={`Jouw bod op de ${eersteWoord(bieding.naam)}`} onSluit={onSluit} vol>
      <div className="ladder" ref={ladder} role="radiogroup" aria-label="Kies je bod" tabIndex={0} onKeyDown={toets} {...vegen}>
        {[...bedragen].reverse().map((bedrag) => {
          const i = bedragen.indexOf(bedrag)
          const isGekozen = bedrag === gekozen
          return (
            <button
              key={bedrag}
              type="button"
              role="radio"
              aria-checked={isGekozen}
              tabIndex={-1}
              className={`trede${isGekozen ? ' gekozen' : Math.abs(i - stap) === 1 ? ' dichtbij' : ''}`}
              onClick={() => tik(i)}
            >
              <GrootBedrag centen={bedrag} heel />
              <span className="trede-label">{isGekozen ? 'JOUW BOD' : `+ ${euro(bedrag - hoogste, { heel: true })}`}</span>
            </button>
          )
        })}
        <div className="trede hoogste">
          <GrootBedrag centen={hoogste} heel />
          <span className="trede-label">{bieding.hoogsteBod ? 'HOOGSTE NU' : 'STARTBOD'}</span>
        </div>
        <p className="tekst klein gedempt">{conflict ? 'Er is net hoger geboden. Kies opnieuw.' : 'Schuif omhoog of tik op een bedrag voor een hoger bod'}</p>
      </div>
      <div className="melding-tekst" style={{ margin: '0 calc(-1 * var(--marge))' }}>
        <span className="uitroep" aria-hidden>!</span>
        <p className="tekst">Je bod is bindend. Win je, dan heb je 48 uur om te betalen. Een bod in de laatste twee minuten verlengt de veiling met twee minuten.</p>
      </div>
      {/* Terug staat onderaan, naast Bevestig: het kruisje rechtsboven is met één hand niet te halen. */}
      <div className="blad-voet">
        <button type="button" className="knop-terug" aria-label="Toch niet bieden" onClick={onSluit}>
          <X size={24} aria-hidden />
        </button>
        <Hoofdknop onClick={bevestig}>BEVESTIG {euro(gekozen, { heel: true })}</Hoofdknop>
      </div>
    </Blad>
  )
}

// ---- Na de hamer ----

/** De gewonnen fles: betalen, en na het betalen brengen of halen kiezen. Zelfde scherm als een bon. */
export function Gewonnen({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat] = useStaat()
  const bestelling = mijnBiedingBestelling(staat, wijnId)
  if (!bestelling) return <Weg ga={ga} />
  return <BonStatus bestellingId={bestelling.bestellingId} ga={ga} />
}

function Weg({ ga }: { ga: Ga }) {
  return (
    <>
      <Kop />
      <main className="sectie"><p className="tekst">Deze fles staat niet (meer) in de club.</p></main>
      <Onderkant ga={ga} knop={<Hoofdknop onClick={() => ga({ scherm: 'aanbod' })}>Naar het aanbod</Hoofdknop>} />
    </>
  )
}
