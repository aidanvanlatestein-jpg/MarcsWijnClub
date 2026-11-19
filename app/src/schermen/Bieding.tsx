import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import { Betalen } from '../onderdelen/Betalen'
import { Blad } from '../onderdelen/Blad'
import { Keuze } from '../onderdelen/Keuze'
import { GrootBedrag, Hoofdknop, Onderkant, Stippellijn } from '../onderdelen/Knoppen'
import { Kop, VraagMarc, ZwevendeNav } from '../onderdelen/Kop'
import { dagEnTijd, euro, kortDagEnTijd, kortDatum, kortJaar, naamMetJaar, nuUtc, tijd } from '../opmaak'
import { terug, type Ga } from '../route'
import { afhaalpunt, betaalVoor, LID, useStaat, zoekBieding, type BiedingStaat } from '../staat'
import { BEWAREN } from '../types'

/** Twee grotere stappen boven het minimum. Marc kiest ze later per bieding. */
const STAPPEN = [0, 2500, 5000]

/** 05 Bijzondere fles: poster, stand, spraakbericht, advies, herkomst en bewaring. */
export function Bieding({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat] = useStaat()
  const [bieden, setBieden] = useState(false)
  const b = zoekBieding(staat, wijnId)
  if (!b) return <Weg ga={ga} />

  const open = b.biedingStatus === 'open'
  const overboden = open && b.mijnBod !== undefined && !b.mijnBodIsHoogste
  const gewonnen = mijnBiedingBestelling(staat.bestellingen, wijnId)
  const korteNaam = b.naam.split(' ')[0]
  const titel = [...b.naam.toUpperCase().split(' ')]
  if (b.jaargang) titel[titel.length - 1] += ` ${kortJaar(b.jaargang)}`
  const sluit = `SLUIT ${dagEnTijd(b.eindtijd).toUpperCase()}`
  const herkomst = [b.druif, b.streek, 'UIT MARCS KELDER'].filter(Boolean).join(' · ')

  let label = b.hoogsteBod ? 'HOOGSTE BOD' : 'STARTBOD'
  if (overboden) label = 'OVERBODEN · HOOGSTE BOD'
  if (!open) label = 'GESLOTEN · HOOGSTE BOD'

  const advies = [
    { kop: 'Waarom deze', tekst: b.tekst },
    { kop: 'Wanneer', tekst: b.drinken },
    { kop: 'Erbij', tekst: b.spijs },
  ].filter((a): a is { kop: string; tekst: string } => Boolean(a.tekst))

  let knop = null
  if (open) {
    knop = <Hoofdknop onClick={() => setBieden(true)}>BIED {euro(b.minimaalVolgendBod, { heel: true })}</Hoofdknop>
  } else if (gewonnen) {
    knop = <Hoofdknop onClick={() => ga({ scherm: 'gewonnen', wijnId })}>NAAR JE FLES</Hoofdknop>
  }

  return (
    <>
      <main>
        <div className="poster-groot">
          {b.foto ? <img src={b.foto} alt="" /> : null}
          <span className="verloop" aria-hidden />
          <ZwevendeNav
            titel="Bijzondere fles"
            onTerug={() => terug(() => ga({ scherm: 'aanbod' }))}
            vraag={`Hoi Marc, een vraag over de ${naamMetJaar(b)}: `}
          />
          <span className="sluit-rand" aria-hidden>{sluit} — {sluit}</span>
          <div className="poster-titel">
            <p className="label goud">BIEDING · 1 FLES</p>
            <h1>
              {titel.map((woord, i) => <span key={i} style={{ display: 'block' }}>{woord}</span>)}
            </h1>
            <p className="herkomst-regel">{herkomst}</p>
          </div>
        </div>
        <p className="sr">{open ? `Sluit ${dagEnTijd(b.eindtijd)}` : 'Deze bieding is gesloten'}</p>

        <section className="stand" aria-label="Stand van de bieding" style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className={overboden ? 'label goud' : 'label'}>{label}</p>
            <GrootBedrag centen={b.hoogsteBod ?? b.startbod} heel />
          </div>
          <p className="rechts">
            {b.mijnBodIsHoogste && <span className="goud">{open ? 'JIJ BENT DE HOOGSTE' : 'JIJ HEBT GEWONNEN'}</span>}
            {overboden && b.mijnBod && <span>JOUW BOD {euro(b.mijnBod, { heel: true })}</span>}
            <strong>{b.aantalBiedingen ?? 0} BIEDINGEN</strong>
            {open && <span>MIN. + {euro(b.minimaleVerhoging, { heel: true })}</span>}
          </p>
        </section>

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
        {!open && !gewonnen && (
          <p className="sectie tekst gedempt">Deze bieding is gesloten{b.mijnBod ? `. Een ander lid won de ${korteNaam}.` : '.'}</p>
        )}
      </main>
      <Onderkant ga={ga} tab="aanbod" knop={knop} />
      {bieden && <Bieden bieding={b} onSluit={() => setBieden(false)} />}
    </>
  )
}

/** De bestelling die ontstaat als het lid een bieding wint. */
function mijnBiedingBestelling<T extends { soort: string; lidId: string; regels: { wijnId: string }[] }>(bestellingen: T[], wijnId: string): T | undefined {
  return bestellingen.find((x) => x.soort === 'bieding' && x.lidId === LID && x.regels[0]?.wijnId === wijnId)
}

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

/** 06 Bieden: de ladder. Hogere bedragen boven, het gekozen bod groot, het hoogste bod onderaan. */
function Bieden({ bieding, onSluit }: { bieding: BiedingStaat; onSluit: () => void }) {
  const [, dispatch] = useStaat()
  const [stap, setStap] = useState(0)
  const [minimum, setMinimum] = useState(bieding.minimaalVolgendBod)
  const [conflict, setConflict] = useState(false)
  const begin = useRef<number | null>(null)
  const bedragen = STAPPEN.map((s) => minimum + s)
  const gekozen = bedragen[stap]
  const hoogste = bieding.hoogsteBod ?? bieding.startbod
  const korteNaam = bieding.naam.split(' ')[0]

  const kies = (i: number) => setStap(Math.max(0, Math.min(bedragen.length - 1, i)))
  const toets = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') kies(stap + 1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') kies(stap - 1)
    else return
    e.preventDefault()
  }
  const vegen = {
    onTouchStart: (e: TouchEvent) => { begin.current = e.touches[0].clientY },
    onTouchEnd: (e: TouchEvent) => {
      if (begin.current === null) return
      const dy = e.changedTouches[0].clientY - begin.current
      if (dy < -40) kies(stap + 1)
      if (dy > 40) kies(stap - 1)
      begin.current = null
    },
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
    <Blad titel={`Jouw bod op de ${korteNaam}`} onSluit={onSluit} vol>
      <div className="ladder" role="radiogroup" aria-label="Kies je bod" tabIndex={0} onKeyDown={toets} {...vegen}>
        {[...bedragen].reverse().map((bedrag) => {
          const i = bedragen.indexOf(bedrag)
          const isGekozen = i === stap
          return (
            <button
              key={bedrag}
              type="button"
              role="radio"
              aria-checked={isGekozen}
              tabIndex={-1}
              className={`trede${isGekozen ? ' gekozen' : Math.abs(i - stap) === 1 ? ' dichtbij' : ''}`}
              onClick={() => kies(i)}
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
        <p className="tekst">Je bod is bindend. Win je, dan heb je 48 uur om te betalen. Een bod in de laatste twee minuten verlengt de bieding met twee minuten.</p>
      </div>
      <Hoofdknop onClick={bevestig}>BEVESTIG {euro(gekozen, { heel: true })}</Hoofdknop>
    </Blad>
  )
}

/** 07 Na een gewonnen bieding: betalen, daarna bewaren bij Marc of een afhaalpunt. */
export function Gewonnen({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [betalen, setBetalen] = useState(false)
  const b = zoekBieding(staat, wijnId)
  const bestelling = mijnBiedingBestelling(staat.bestellingen, wijnId)
  if (!b || !bestelling) return <Weg ga={ga} />

  const betaald = bestelling.status === 'betaald'
  const naam = naamMetJaar(b, { kort: true }).toUpperCase()
  const opties = [
    { id: BEWAREN, woord: 'Bewaar', zin: b.bewaring ? `Bij Marc. ${b.bewaring} Haal hem wanneer je wilt.` : 'Bij Marc. Haal hem wanneer je wilt.' },
    ...staat.lijst.afhaalpunten.map((a) => ({ id: a.afhaalpuntId, woord: a.naam, zin: a.wanneer })),
  ]
  const punt = afhaalpunt(staat, bestelling.levering)

  return (
    <>
      <Kop
        rechts={<VraagMarc tekst={`Hoi Marc, over de ${naamMetJaar(b)} die ik won: `} />}
      />
      <main>
        <div className="masthead">
          <p className="label">BIEDING GESLOTEN · {kortDagEnTijd(b.eindtijd).toUpperCase()}</p>
          <h1>
            <span className="jouw" style={{ display: 'block', marginTop: 12 }}>Jouw.</span>
            <span style={{ display: 'block', fontSize: 26, fontWeight: 700, lineHeight: 1.1, textTransform: 'uppercase', marginTop: 6 }}>
              De {naam} is van jou. {euro(bestelling.totaal, { heel: true })}.
            </span>
          </h1>
        </div>
        <div className="betaald-rij lijn-boven lijn-onder" style={{ marginTop: 12 }}>
          {betaald ? (
            <>
              <span className="stempel">Betaald</span>
              <span className="gedempt">iDEAL · {bestelling.betaaldOp ? `${kortDatum(bestelling.betaaldOp)} ${tijd(bestelling.betaaldOp)}` : ''}</span>
            </>
          ) : (
            <span className="tekst">Nog niet betaald. Betaal vóór {dagEnTijd(betaalVoor(staat, bestelling))}.</span>
          )}
        </div>
        <section className="sectie">
          <h2 className="label">Wat doen we met de fles?</h2>
          <Keuze
            label="Wat doen we met de fles"
            vorm="banden"
            opties={opties}
            gekozen={bestelling.levering}
            uitgeschakeld={!betaald}
            onKies={(id) => dispatch({ type: 'leveringBieding', bestellingId: bestelling.bestellingId, levering: id })}
          />
          {!betaald && <p className="tekst klein gedempt">Na het betalen kies je wat er met de fles gebeurt.</p>}
          {betaald && punt && <p className="tekst klein gedempt">Je haalt hem op in {punt.naam}, {punt.wanneer.toLowerCase()}.</p>}
        </section>
      </main>
      <Onderkant
        ga={ga}
        tab="aanbod"
        knop={
          betaald ? (
            <Hoofdknop disabled={!bestelling.levering} onClick={() => ga({ scherm: 'flessen' })}>Klaar</Hoofdknop>
          ) : (
            <Hoofdknop goud onClick={() => setBetalen(true)}>Betaal {euro(bestelling.totaal, { heel: true })} met iDEAL</Hoofdknop>
          )
        }
      />
      {betalen && (
        <Betalen
          bedrag={bestelling.totaal}
          onSluit={() => setBetalen(false)}
          onKlaar={(gelukt) => {
            setBetalen(false)
            dispatch({ type: 'betaal', bestellingIds: [bestelling.bestellingId], gelukt, nu: nuUtc() })
            if (!gelukt) ga({ scherm: 'betaling' })
          }}
        />
      )}
    </>
  )
}

function Weg({ ga }: { ga: Ga }) {
  return (
    <>
      <Kop />
      <main className="sectie"><p className="tekst">Deze fles staat niet (meer) in de club.</p></main>
      <Onderkant ga={ga} tab="aanbod" />
    </>
  )
}
