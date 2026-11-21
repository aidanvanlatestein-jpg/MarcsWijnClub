import { Camera, Check, ClipboardPaste, Mic, Pencil, Send, Truck, X, ZapOff } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { LiveBalk } from '../onderdelen/Avond'
import { BonRegels } from '../onderdelen/Bon'
import { Blad } from '../onderdelen/Blad'
import { Duim } from '../onderdelen/Foto'
import { Keuze } from '../onderdelen/Keuze'
import { Hoofdknop } from '../onderdelen/Knoppen'
import { Kop, TerugLink } from '../onderdelen/Kop'
import { adresRegel, bedrag, dagDatum, euro, kortTijdvak, naamMetJaar, naarInvoer, nuUtc, tijd, vanInvoer, weekdag } from '../opmaak'
import { herkenBericht, leesEuro, leesLetters } from '../regels'
import type { BeheerTab, Ga } from '../route'
import { gesorteerd, klaar, korteNaam, levermomenten, opTafel, plus, roepNaam, tellers, useStaat, veilingVanAvond, volgendeLetter, type Staat } from '../staat'
import type { Bestelling, LeverSoort } from '../types'
import { voorbeeldBericht, voorbeeldBerichten, voorbeeldEtiket, voorbeeldLeden, voorbeeldLedenBinnen, voorbeeldSnelleZinnen } from '../voorbeeld'
import { LEVER_WOORD } from './Bestelling'

function lid(lidId: string) {
  return voorbeeldLeden.find((l) => l.lidId === lidId)
}

function lidNaam(lidId: string): string {
  return lid(lidId)?.naam ?? lidId
}

/**
 * Beheer (design-v4): een nieuwe fles klaarzetten (camera, nakijken, lijst of veiling, klaar), de avond
 * presenteren, en na de avond afleveren. In de echte app alleen voor de groep beheer.
 */
export function Beheer({ ga, tab }: { ga: Ga; tab: BeheerTab }) {
  if (tab === 'nieuw') return <NieuweFles ga={ga} />
  if (tab === 'afleveren') return <Afleveren ga={ga} />
  return <BeheerLive ga={ga} />
}

// ---- Nieuwe fles ----

interface Formulier {
  producent: string
  naam: string
  jaar: string
  druif: string
  streek: string
  prijs: string
  aantal: string
  tekst: string
  spijs: string
  drinken: string
  startbod: string
  verhoging: string
  hamer: string
  herkomst: string
  bewaring: string
}

type Stap = 'foto' | 'na' | 'soort' | 'klaar'

/** Wat de bouwspecificatie als foto toestaat. Een camera levert JPEG. */
const FOTO_SOORTEN = ['image/jpeg', 'image/png', 'image/webp']

function NieuweFles({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const [stap, setStap] = useState<Stap>('foto')
  const [foto, setFoto] = useState<string | undefined>()
  const [plakken, setPlakken] = useState(false)
  const [bericht, setBericht] = useState(voorbeeldBericht)
  const [form, setForm] = useState<Formulier | null>(null)
  const [twijfel, setTwijfel] = useState<Set<keyof Formulier>>(new Set())
  const [soort, setSoort] = useState<'lijst' | 'veiling'>('lijst')
  const [spraak, setSpraak] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [klaarGezet, setKlaarGezet] = useState<{ naam: string; kort: string; tekst: string; foto?: string; regel: string } | null>(null)
  const dag = weekdag(lijst.begin)

  // Een gekozen foto blijft alleen in deze browser. Ruim het tijdelijke adres op als hij vervangen wordt.
  useEffect(() => () => {
    if (foto?.startsWith('blob:')) URL.revokeObjectURL(foto)
  }, [foto])

  /** Lees de WhatsApp-tekst en het etiket. In de echte app doet een taalmodel dat; hier een eenvoudige regel. */
  const herken = (metFoto: string | undefined) => {
    const h = herkenBericht(bericht)
    const etiket = metFoto ? voorbeeldEtiket : undefined
    setFoto(metFoto)
    setForm({
      producent: etiket?.producent ?? '',
      naam: h.naam,
      jaar: h.jaargang ? String(h.jaargang) : '',
      druif: etiket?.druif ?? '',
      streek: etiket?.streek ?? '',
      prijs: h.prijs !== undefined ? bedrag(h.prijs) : '',
      aantal: h.aantal ? String(h.aantal) : '',
      tekst: h.tekst,
      spijs: '',
      drinken: '',
      startbod: '',
      verhoging: '10',
      hamer: naarInvoer(veilingVanAvond(staat)?.eindtijd ?? plus(lijst.begin, 90 * 60_000)),
      herkomst: '',
      bewaring: '',
    })
    // Het jaar op het etiket en in het bericht verschillen vaak: dat vraagt de app na.
    setTwijfel(new Set(h.jaargang ? ['jaar'] : []))
    setFout(null)
    setStap('na')
  }
  /**
   * Een foto uit de camera of de fotorol. Let op: dit is een bestand van de gebruiker. Het prototype toont het
   * alleen als afbeelding in deze browser en stuurt het nergens heen. De echte upload volgt de regels uit de
   * bouwspecificatie: verkleinen, opnieuw wegschrijven als JPEG en het type controleren aan de inhoud.
   */
  const kiesFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    e.target.value = ''
    if (!bestand) return
    if (!FOTO_SOORTEN.includes(bestand.type) || bestand.size > 10_000_000) return setFout('Kies een JPEG, PNG of WebP van hoogstens 10 MB.')
    herken(URL.createObjectURL(bestand))
  }
  const zet = (veld: keyof Formulier) => (waarde: string) => {
    setForm((f) => (f ? { ...f, [veld]: waarde } : f))
    setTwijfel((t) => {
      const n = new Set(t)
      n.delete(veld)
      return n
    })
  }
  const opnieuw = () => {
    setStap('foto')
    setForm(null)
    setFoto(undefined)
    setSoort('lijst')
    setSpraak(false)
    setFout(null)
  }

  const naarSoort = () => {
    if (!form) return
    const jaargang = form.jaar ? Number(form.jaar) : undefined
    if (!form.naam.trim()) return setFout('Vul de naam van de wijn in.')
    if (jaargang !== undefined && !(Number.isInteger(jaargang) && jaargang > 1900 && jaargang < 2100)) return setFout('Het jaar klopt niet.')
    setFout(null)
    setStap('soort')
  }

  const opslaan = () => {
    if (!form) return
    const naam = [form.producent.trim(), form.naam.trim()].filter(Boolean).join(' ')
    const jaargang = form.jaar ? Number(form.jaar) : undefined
    if (soort === 'lijst') {
      const aantal = Number(form.aantal)
      const prijs = leesEuro(form.prijs)
      if (lijst.status !== 'open') return setFout('De avond is gesloten. Zet de wijn klaar voor de volgende avond.')
      if (!Number.isInteger(aantal) || aantal < 1) return setFout('Het aantal moet minstens 1 fles zijn.')
      if (!prijs) return setFout('De prijs klopt niet. Schrijf hem als 10,50.')
      const letter = herkenBericht(bericht).letter
      dispatch({
        type: 'nieuweWijn',
        wijn: {
          wijnId: `wijn-${Date.now()}`,
          letter: letter && !lijst.wijnen.some((w) => w.letter === letter) ? letter : volgendeLetter(staat),
          naam, korteNaam: form.naam.trim() || undefined, producent: form.producent.trim() || undefined, jaargang,
          druif: form.druif.trim() || undefined, streek: form.streek.trim() || undefined,
          tekst: form.tekst.trim(), spijs: form.spijs.trim() || undefined, drinken: form.drinken.trim() || undefined, foto,
          prijs, voorraad: aantal, partij: aantal, volgorde: lijst.wijnen.reduce((m, w) => Math.max(m, w.volgorde), 0) + 1,
        },
      })
      setKlaarGezet({ naam: naamMetJaar({ naam, jaargang }), kort: form.naam.trim() || naam, tekst: form.tekst.trim(), foto, regel: `${euro(prijs)} / fles · ${aantal} flessen` })
    } else {
      const startbod = leesEuro(form.startbod)
      const verhoging = leesEuro(form.verhoging)
      const eindtijd = vanInvoer(form.hamer)
      if (!startbod) return setFout('Het startbod klopt niet. Schrijf het als 250.')
      if (!verhoging) return setFout('De minimale verhoging klopt niet.')
      if (!eindtijd || eindtijd <= nuUtc()) return setFout('De hamer moet in de toekomst vallen.')
      dispatch({
        type: 'nieuweBieding',
        bieding: {
          wijnId: `bieding-${Date.now()}`, naam, jaargang, tekst: form.tekst.trim() || undefined, foto,
          druif: form.druif.trim() || undefined, streek: form.streek.trim() || undefined,
          spijs: form.spijs.trim() || undefined, drinken: form.drinken.trim() || undefined,
          herkomst: form.herkomst.trim() || undefined, bewaring: form.bewaring.trim() || undefined,
          startbod, minimaleVerhoging: verhoging, minimaalVolgendBod: startbod, eindtijd,
          aantalBiedingen: 0, biedingStatus: 'open', mijnBodIsHoogste: false, biedlog: [],
        },
      })
      setKlaarGezet({ naam: naamMetJaar({ naam, jaargang }), kort: form.naam.trim() || naam, tekst: form.tekst.trim(), foto, regel: `Veiling · startbod ${euro(startbod, { heel: true })}` })
    }
    setFout(null)
    setStap('klaar')
    window.scrollTo(0, 0)
  }

  if (stap === 'foto') {
    return (
      <main className="camera">
        <img className="camera-beeld" src={voorbeeldEtiket.foto} alt="" />
        <span className="camera-donker boven" aria-hidden />
        <span className="camera-donker onder" aria-hidden />
        <header className="camera-kop">
          <button type="button" className="camera-knop" aria-label="Stop" onClick={() => ga({ scherm: 'beheer' })}><X size={22} aria-hidden /></button>
          <h1>
            <span>Nieuwe fles</span>
            <small>Voor {dagDatum(lijst.begin).toLowerCase()}</small>
          </h1>
          <span className="camera-knop" aria-hidden><ZapOff size={20} /></span>
        </header>
        <div className="camera-kader" aria-hidden><i /><i /><i /><i /></div>
        <p className="camera-hint">Fles rechtop, etiket naar je toe</p>
        <div className="camera-bediening">
          <label className="camera-zij">
            <img src="/voorbeeld/candido.jpg" alt="" />
            Fotorol
            <input type="file" accept={FOTO_SOORTEN.join(',')} onChange={kiesFoto} />
          </label>
          {/* De sluiter opent de camera van de telefoon, aan de achterkant. Een computer zonder camera opent de bestandskiezer. */}
          <label className="sluiter">
            <span aria-hidden />
            <input type="file" accept="image/*" capture="environment" aria-label="Maak de foto" onChange={kiesFoto} />
          </label>
          <button type="button" className="camera-zij" onClick={() => setPlakken(true)}>
            <span className="camera-plak"><ClipboardPaste size={24} aria-hidden /></span>
            Plak tekst
          </button>
        </div>
        {fout && <p className="fout" role="alert" style={{ textAlign: 'center' }}>{fout}</p>}
        <p className="camera-voet">De app leest je WhatsApp-tekst en het etiket. Jij kijkt het na.</p>
        <p className="uitleg-voorbeeld camera-voet">
          Voorbeeld: je foto blijft op dit toestel en de app leest het etiket niet echt.{' '}
          <button type="button" className="tekstlink gedempt" onClick={() => herken(voorbeeldEtiket.foto)}>Gebruik de voorbeeldfoto</button>
        </p>
        {plakken && (
          <Blad titel="Plak je WhatsApp-bericht" onSluit={() => setPlakken(false)}>
            <label className="sr" htmlFor="bericht">Je WhatsApp-bericht</label>
            <textarea id="bericht" className="invoer-groot" value={bericht} onChange={(e) => setBericht(e.target.value)} placeholder="*Wijn J Soave Classico 2023* …" />
            <Hoofdknop disabled={!bericht.trim()} onClick={() => { setPlakken(false); herken(undefined) }}>Lees het bericht</Hoofdknop>
          </Blad>
        )}
      </main>
    )
  }

  if (stap === 'klaar' && klaarGezet) {
    const rij = [...gesorteerd(lijst.wijnen).filter((w) => !w.opTafelSinds)]
    const veilingen = staat.biedingen.filter((b) => b.biedingStatus === 'open' && !b.geopend)
    return (
      <>
        <main className="sectie" style={{ gap: 16, paddingTop: 28 }}>
          <h1 className="eventkop goud" style={{ fontSize: 'min(110px, 28vw)' }}>Klaar.</h1>
          <p className="tekst">De {klaarGezet.kort.split(' ')[0]} staat klaar voor {dag}. Zo zien leden hem als jij hem op tafel zet:</p>
          <div className="klaar-kaart">
            <Duim foto={klaarGezet.foto} breedte={72} hoogte={96} />
            <div>
              <p className="label goud" style={{ fontSize: 13 }}>Voor {dag}</p>
              <strong>{klaarGezet.naam}</strong>
              <span className="klaar-tekst">{klaarGezet.tekst}</span>
              <span className="label" style={{ color: 'var(--ink)', fontSize: 13 }}>{klaarGezet.regel}</span>
            </div>
          </div>
          <div className="beheer-blok-kop" style={{ marginTop: 6 }}>
            <h2>Klaar voor {dag}</h2>
            <span>{rij.length} {rij.length === 1 ? 'WIJN' : 'WIJNEN'} · {veilingen.length} {veilingen.length === 1 ? 'VEILING' : 'VEILINGEN'}</span>
          </div>
          <div className="klaar-rij">
            {rij.map((w) => <Duim key={w.wijnId} foto={w.foto} breedte={44} hoogte={60} wit={w === rij.at(-1)} />)}
            {veilingen.map((b) => <Duim key={b.wijnId} foto={b.foto} breedte={44} hoogte={60} goud />)}
          </div>
        </main>
        <div className="onderkant">
          <div className="hoofdknop-zone">
            <Hoofdknop icoon={<Camera size={26} aria-hidden />} onClick={opnieuw}>Nog een fles</Hoofdknop>
            <button type="button" className="tekstlink zonder-lijn gedempt midden" onClick={() => ga({ scherm: 'beheer' })}>Bekijk {dag} →</button>
          </div>
        </div>
      </>
    )
  }

  if (!form) return null

  if (stap === 'na') {
    return (
      <>
        <TerugLink titel="Opnieuw" onTerug={opnieuw} rechts={<span className="stap-teller">Stap 2 van 3</span>} />
        <main>
          <div className="na-kop">
            <button type="button" className="na-foto" onClick={opnieuw} aria-label="Maak de foto opnieuw">
              <Duim foto={foto} breedte={120} hoogte={160} />
            </button>
            <div>
              <p className="label goud" style={{ fontSize: 13 }}>Voor {dag}</p>
              <h1 className="na-titel">Nieuwe fles</h1>
              <p className="tekst klein gedempt">{foto ? 'Foto gelukt. Tik op de foto om hem opnieuw te maken.' : 'Nog geen foto. Tik op het vak om er een te maken.'}</p>
            </div>
          </div>
          <div className="herkend">
            <div className="herkend-kop">
              <span>Herkend</span>
              <span>{foto ? 'Etiket + WhatsApp' : 'WhatsApp'}</span>
            </div>
            <Veld label="Producent" waarde={form.producent} onWijzig={zet('producent')} />
            <Veld label="Naam" waarde={form.naam} onWijzig={zet('naam')} />
            <Veld label="Jaar" waarde={form.jaar} onWijzig={zet('jaar')} invoer="numeric" twijfel={twijfel.has('jaar')} />
            <Veld label="Druif · streek" waarde={[form.druif, form.streek].filter(Boolean).join(' · ')} onWijzig={(w) => { const [d = '', ...r] = w.split('·'); zet('druif')(d.trim()); zet('streek')(r.join('·').trim()) }} />
            <Veld label="Prijs per fles" waarde={form.prijs} onWijzig={zet('prijs')} invoer="decimal" voor="€" />
            <Veld label="Aantal" waarde={form.aantal} onWijzig={zet('aantal')} invoer="numeric" na="flessen" />
          </div>
          <section className="sectie">
            <div className="beheer-blok-kop">
              <h2>Jouw tekst</h2>
              <span>Uit je bericht</span>
            </div>
            <label className="sr" htmlFor="tekst">Jouw tekst</label>
            <textarea id="tekst" className="invoer-groot wit" value={form.tekst} onChange={(e) => zet('tekst')(e.target.value)} />
            <div className="twee-kolommen" style={{ gap: 10 }}>
              <label className="vak-veld"><span>Erbij</span><input value={form.spijs} placeholder="Wat eet je erbij?" onChange={(e) => zet('spijs')(e.target.value)} /></label>
              <label className="vak-veld"><span>Drinken</span><input value={form.drinken} placeholder="Nu tot …" onChange={(e) => zet('drinken')(e.target.value)} /></label>
            </div>
            <p className="tekst klein gedempt">Herkomst en bewaring vult de app nooit zelf in.</p>
          </section>
          <div style={{ height: 16 }} />
        </main>
        <div className="onderkant">
          <div className="hoofdknop-zone">
            {fout && <p className="fout" role="alert" style={{ marginBottom: 10 }}>{fout}</p>}
            <Hoofdknop onClick={naarSoort}>Klopt, verder</Hoofdknop>
          </div>
        </div>
      </>
    )
  }

  const opTafelNa = gesorteerd(lijst.wijnen).at(-1)
  const plek = ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste'][lijst.wijnen.length] ?? `${lijst.wijnen.length + 1}e`
  return (
    <>
      <TerugLink titel="Terug" onTerug={() => setStap('na')} rechts={<span className="stap-teller">Stap 3 van 3</span>} />
      <main>
        <div className="soort-kop">
          <Duim foto={foto} breedte={56} hoogte={76} />
          <h1>{naamMetJaar({ naam: [form.producent, form.naam].filter(Boolean).join(' '), jaargang: form.jaar ? Number(form.jaar) : undefined })}{soort === 'veiling' ? ' · 1 fles' : ''}</h1>
        </div>
        <div className="sectie" style={{ paddingTop: 8 }}>
          <Keuze
            label="Lijst of veiling"
            gekozen={soort}
            onKies={(id) => setSoort(id as 'lijst' | 'veiling')}
            opties={[
              { id: 'lijst', woord: 'Lijst', zin: 'Vaste prijs. Wie het eerst is…' },
              { id: 'veiling', woord: 'Veiling', zin: 'Eén of enkele flessen. De hamer beslist.' },
            ]}
          />
        </div>
        {soort === 'lijst' ? (
          <div className="rij-velden">
            <RijVeld label="Prijs per fles" waarde={form.prijs} onWijzig={zet('prijs')} invoer="decimal" voor="€" groot />
            <RijVeld label="Aantal flessen" waarde={form.aantal} onWijzig={zet('aantal')} invoer="numeric" groot />
            <div className="rij-veld">
              <span>Op tafel<small>Als {plek} wijn{opTafelNa ? `, na de ${roepNaam(opTafelNa).toLowerCase().replace(/^./, (c) => c.toUpperCase())}` : ''}</small></span>
              <strong>{dagDatum(lijst.begin)}</strong>
            </div>
          </div>
        ) : (
          <>
            <div className="rij-velden">
              <h2 className="rij-velden-kop">Bieden</h2>
              <RijVeld label="Startbod" waarde={form.startbod} onWijzig={zet('startbod')} invoer="decimal" voor="€" plaats="250" groot />
              <RijVeld label="Minimale verhoging" waarde={form.verhoging} onWijzig={zet('verhoging')} invoer="decimal" voor="€" />
              <label className="rij-veld">
                <span>Hamer<small>Veiling start om {tijd(lijst.veilingBegin)}</small></span>
                <input type="datetime-local" value={form.hamer} onChange={(e) => zet('hamer')(e.target.value)} />
              </label>
            </div>
            <div className="rij-velden">
              <h2 className="rij-velden-kop">Alleen van jou</h2>
              <RijVeld label="Herkomst" waarde={form.herkomst} onWijzig={zet('herkomst')} plaats="Waar komt hij vandaan?" />
              <RijVeld label="Bewaring" waarde={form.bewaring} onWijzig={zet('bewaring')} plaats="Hoe lag hij?" />
              <button type="button" className={spraak ? 'spraak-opname aan' : 'spraak-opname'} aria-pressed={spraak} onClick={() => setSpraak((x) => !x)}>
                <span className="mic" aria-hidden><Mic size={26} /></span>
                <span>
                  <strong>{spraak ? 'Opgenomen · 0:30' : 'Vertel over deze fles'}</strong>
                  <span>Houd ingedrukt · max. 30 seconden. Leden horen jou, niet een tekst.</span>
                </span>
              </button>
              <p className="uitleg-voorbeeld">Voorbeeld: er wordt niets opgenomen.</p>
            </div>
          </>
        )}
        <div style={{ height: 16 }} />
      </main>
      <div className="onderkant">
        <div className="hoofdknop-zone">
          {fout && <p className="fout" role="alert" style={{ marginBottom: 10 }}>{fout}</p>}
          <Hoofdknop onClick={opslaan}>Zet klaar voor {dag}</Hoofdknop>
        </div>
      </div>
    </>
  )
}

/** Een herkend veld op wit papier: label links, de waarde rechts, met een potlood. */
function Veld({ label, waarde, onWijzig, invoer, voor, na, twijfel = false }: {
  label: string
  waarde: string
  onWijzig: (w: string) => void
  invoer?: 'numeric' | 'decimal'
  voor?: string
  na?: string
  twijfel?: boolean
}) {
  return (
    <div className={twijfel ? 'veld twijfel' : 'veld'}>
      <span>{label}{twijfel && <small>Klopt dit?</small>}</span>
      <label>
        {voor && <b>{voor}</b>}
        <input aria-label={label} value={waarde} inputMode={invoer} enterKeyHint="done" onChange={(e) => onWijzig(e.target.value)} />
        {na && waarde && <b>{na}</b>}
        <Pencil size={16} aria-hidden />
      </label>
    </div>
  )
}

/** Een veld op zwart, zoals bij lijst of veiling: label links, de waarde groot rechts. */
function RijVeld({ label, waarde, onWijzig, invoer, voor, plaats, groot = false }: {
  label: string
  waarde: string
  onWijzig: (w: string) => void
  invoer?: 'numeric' | 'decimal'
  voor?: string
  plaats?: string
  groot?: boolean
}) {
  return (
    <label className={groot ? 'rij-veld groot' : 'rij-veld'}>
      <span>{label}</span>
      <span className="rij-veld-waarde">
        {voor && <b>{voor}</b>}
        <input value={waarde} inputMode={invoer} placeholder={plaats} enterKeyHint="done" onChange={(e) => onWijzig(e.target.value)} />
        <Pencil size={16} aria-hidden />
      </span>
    </label>
  )
}

// ---- De avond presenteren ----

/** Een flessenrij om naar te kijken, zonder knoppen. */
function KleineRij({ vrij, partij }: { vrij: number; partij: number }) {
  return (
    <div className="flessenrij" aria-hidden>
      {Array.from({ length: Math.min(partij, 12) }, (_, i) => <span key={i} className={i < vrij ? 'fles' : 'fles weg'} />)}
    </div>
  )
}

/** Marc presenteert: wijnen op tafel zetten, iets zeggen, de veiling starten, de avond sluiten. */
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

  const stuur = (zin: string) => {
    dispatch({ type: 'bericht', tekst: zin, nu: nuUtc() })
    setTekst('')
  }

  let balk = `JE BENT LIVE · SINDS ${tijd(lijst.begin)}`
  if (lijst.fase === 'aangekondigd') balk = `AANGEKONDIGD · BEGIN ${tijd(lijst.begin)}`
  if (lijst.fase === 'gesloten') balk = 'DE AVOND IS GESLOTEN'

  let knop: ReactNode = null
  if (lijst.fase === 'aangekondigd') knop = <Hoofdknop onClick={() => dispatch({ type: 'beginAvond', nu: nuUtc() })}>Begin de avond</Hoofdknop>
  else if (live && volgende) knop = <Hoofdknop onClick={() => dispatch({ type: 'zetOpTafel', wijnId: volgende.wijnId, nu: nuUtc() })}>Zet de {roepNaam(volgende).toLowerCase()} op tafel</Hoofdknop>
  else if (live) knop = <Hoofdknop onClick={() => setSluiten(true)}>Sluit de avond</Hoofdknop>
  else knop = <Hoofdknop onClick={() => ga({ scherm: 'beheer', tab: 'afleveren' })}>Naar afleveren</Hoofdknop>

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
              <Duim foto={w.foto} breedte={52} hoogte={64} />
              <div>
                <strong>{naamMetJaar({ naam: korteNaam(w), jaargang: w.jaargang })}</strong>
                <span>{w.partij ?? w.voorraad} flessen · {euro(w.prijs)} · {w.foto ? 'tekst en foto klaar' : 'nog geen foto'}</span>
              </div>
              <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => ga({ scherm: 'beheer', tab: 'nieuw' })}>Bewerk</button>
            </div>
          ))}
          <button type="button" className="tekstlink zonder-lijn" style={{ alignSelf: 'flex-start' }} onClick={() => ga({ scherm: 'beheer', tab: 'nieuw' })}>+ Nieuwe fles</button>
        </BeheerBlok>

        <BeheerBlok titel="Op tafel" rechts={`${opDeTafel.length} ${opDeTafel.length === 1 ? 'WIJN' : 'WIJNEN'}`}>
          {opDeTafel.length === 0 && <p className="tekst klein gedempt">Nog niets op tafel.</p>}
          {opDeTafel.map((w) => (
            <div key={w.wijnId} className={w.voorraad === 0 ? 'beheer-wijn op-tafel op' : 'beheer-wijn op-tafel'}>
              <Duim foto={w.foto} breedte={30} hoogte={38} />
              <div>
                <strong>{naamMetJaar({ naam: korteNaam(w), jaargang: w.jaargang }, { kort: true })}</strong>
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
              <Duim foto={veiling.foto} breedte={30} hoogte={38} goud />
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
        <div className="hoofdknop-zone">
          {knop}
          <div className="beheer-links">
            {live && volgende && (
              <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => setSluiten(true)}>Sluit de avond</button>
            )}
            <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => ga({ scherm: 'beheer', tab: 'afleveren' })}>Afleveren →</button>
          </div>
        </div>
      </div>
      {sluiten && <SluitBevestiging onSluit={() => setSluiten(false)} />}
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

/** Sluiten is niet terug te draaien: daarom eerst een bevestiging (bouwspecificatie, M10). */
function SluitBevestiging({ onSluit }: { onSluit: () => void }) {
  const [, dispatch] = useStaat()
  return (
    <Blad titel="De avond sluiten?" onSluit={onSluit}>
      <p className="tekst">
        Daarna kan niemand meer bestellen; wijnen die nog klaarstaan, komen niet op tafel. Wie net besteld heeft, kan
        nog betalen tot zijn bon verloopt. Een lopende veiling gaat door tot de hamer. Dit kun je niet terugdraaien.
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

// ---- Afleveren ----

type AfleverTab = 'brengen' | 'halen' | 'klaar'

/** Na de avond: wat Marc brengt, wat leden ophalen, en wat al weg is. */
function Afleveren({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const [tab, setTab] = useState<AfleverTab>('brengen')
  const { lijst } = staat
  const alle = staat.bestellingen.filter((b) => (b.lijstId === lijst.lijstId || b.soort === 'bieding') && b.status !== 'verlopen')
  const per: Record<AfleverTab, Bestelling[]> = {
    brengen: alle.filter((b) => !b.afgeleverdOp && b.levering !== 'halen'),
    halen: alle.filter((b) => !b.afgeleverdOp && b.levering === 'halen'),
    klaar: alle.filter((b) => b.afgeleverdOp),
  }
  const teBrengen = per.brengen.filter((b) => b.status === 'betaald' && b.levering === 'brengen')
  const melding = (kop: string, tekst: string) => dispatch({ type: 'melding', melding: { kop, tekst } })

  return (
    <>
      <Kop
        sub="Beheer"
        rechts={<button type="button" className="tekstlink zonder-lijn" onClick={() => ga({ scherm: 'beheer', tab: 'nieuw' })}>+ Nieuwe fles</button>}
      />
      <main>
        <div className="masthead">
          <h1 className="groot" style={{ fontSize: 'min(88px, 22vw)' }}>Afleveren</h1>
          <p className="tekst gedempt">Na de avond van {weekdag(lijst.begin)}</p>
        </div>
        <div className="segmenten" role="tablist" aria-label="Afleveren">
          {(['brengen', 'halen', 'klaar'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t}<span>{per[t].length}</span>
            </button>
          ))}
        </div>
        <section className="sectie" style={{ paddingTop: 4, gap: 0 }} aria-label={tab}>
          {per[tab].length === 0 && <p className="tekst gedempt" style={{ padding: '16px 0' }}>{tab === 'klaar' ? 'Nog niets afgeleverd.' : 'Niets te doen.'}</p>}
          {per[tab].map((b) => (
            <AfleverRij
              key={b.bestellingId}
              staat={staat}
              bestelling={b}
              onKlaar={(ja) => dispatch({ type: 'afgeleverd', bestellingId: b.bestellingId, ja, nu: nuUtc() })}
              onBetaallink={() => melding('Betaallink gestuurd', `${lidNaam(b.lidId)} krijgt een link om ${euro(b.totaal)} te betalen, vóór ${weekdag(b.betaalVoor)} ${tijd(b.betaalVoor)}.`)}
            />
          ))}
          <button type="button" className="tekstlink zonder-lijn" style={{ alignSelf: 'flex-start', marginTop: 12 }} disabled={lijst.status !== 'open'} onClick={() => ga({ scherm: 'namens' })}>
            + Bestelling namens een lid
          </button>
          {lijst.status !== 'open' && <p className="tekst klein gedempt">Namens een lid bestellen kan alleen zolang de avond open is.</p>}
        </section>
        <div style={{ height: 16 }} />
      </main>
      <div className="onderkant">
        <div className="hoofdknop-zone">
          {tab === 'brengen' && (
            <Hoofdknop
              className="klein"
              disabled={teBrengen.length === 0}
              icoon={<Truck size={26} aria-hidden />}
              onClick={() => melding('Laat weten: ik ben onderweg', `${teBrengen.length} ${teBrengen.length === 1 ? 'lid krijgt' : 'leden krijgen'} een melding: "${voorbeeldBerichten.onderweg}"`)}
            >
              Laat weten: ik ben onderweg
            </Hoofdknop>
          )}
          <div className="beheer-links">
            <button type="button" className="tekstlink zonder-lijn gedempt" onClick={() => ga({ scherm: 'beheer' })}>← De avond</button>
          </div>
        </div>
      </div>
    </>
  )
}

function AfleverRij({ staat, bestelling: b, onKlaar, onBetaallink }: { staat: Staat; bestelling: Bestelling; onKlaar: (ja: boolean) => void; onBetaallink: () => void }) {
  const l = lid(b.lidId)
  const moment = staat.lijst.levering
  const betaald = b.status === 'betaald'
  const delen: string[] = []
  if (b.levering === 'brengen') delen.push(adresRegel(l?.adres) || 'geen adres')
  if (b.levering === 'halen') delen.push('ophalen')
  if (b.soort === 'bieding') delen.push('veiling')
  if (b.soort === 'namens') delen.push('door jou ingevoerd')
  const vak = b.levering === 'brengen' ? moment.brengen : b.levering === 'halen' ? moment.halen : undefined
  if (vak) delen.push(kortTijdvak(vak.van, vak.tot))
  if (!b.levering) delen.push('brengen of halen nog niet gekozen')

  let actie: ReactNode
  if (b.afgeleverdOp) actie = <button type="button" className="knop-klein grijs" onClick={() => onKlaar(false)}>Terugzetten</button>
  else if (!betaald) actie = <button type="button" className="knop-klein grijs" onClick={onBetaallink}>Stuur betaallink</button>
  else actie = (
    <button type="button" className="knop-klein" onClick={() => onKlaar(true)}>
      {b.levering === 'halen' ? 'Opgehaald' : 'Gebracht'} <Check size={16} strokeWidth={2.5} aria-hidden />
    </button>
  )

  return (
    <article className={b.afgeleverdOp ? 'aflever-rij klaar' : 'aflever-rij'}>
      <div className="aflever-boven">
        <div>
          <strong>{l?.naam ?? b.lidId}</strong>
          <span>{delen.join(' · ')}</span>
        </div>
        <p className="aflever-bedrag">
          <strong>{euro(b.totaal)}</strong>
          <span className={betaald ? undefined : 'goud'}>{betaald ? 'Betaald' : 'Wacht op betaling'}</span>
        </p>
      </div>
      <div className="aflever-onder">
        <span className="aflever-flessen">
          {b.regels.map((r) => (
            <span key={r.wijnId}><Duim foto={r.foto} breedte={22} hoogte={28} goud={b.soort === 'bieding'} />{r.aantal}×</span>
          ))}
        </span>
        {actie}
      </div>
    </article>
  )
}

// ---- Namens een lid ----

/** Bestelling namens een lid: lid kiezen, letters en aantallen zoals "G2 H1", brengen of halen. Het lid krijgt een betaallink. */
export function Namens({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const leden = voorbeeldLeden.slice(1)
  const momenten = levermomenten(staat)
  const [lidId, setLidId] = useState<string | null>(null)
  const [letters, setLetters] = useState('')
  const [levering, setLevering] = useState<LeverSoort | null>(momenten[0]?.soort ?? null)
  const [fout, setFout] = useState<string | null>(null)

  const gelezen = leesLetters(letters)
  const regels = gelezen.regels.map((r) => ({ ...r, wijn: lijst.wijnen.find((w) => w.letter === r.letter) }))
  let probleem = gelezen.fout
  if (!probleem) {
    const onbekend = regels.find((r) => !r.wijn)
    const nietOpTafel = regels.find((r) => r.wijn && !r.wijn.opTafelSinds)
    const teVeel = regels.find((r) => r.wijn && r.aantal > r.wijn.voorraad)
    if (onbekend) probleem = `Wijn ${onbekend.letter} staat niet op de lijst.`
    else if (nietOpTafel?.wijn) probleem = `De ${korteNaam(nietOpTafel.wijn)} staat nog niet op tafel.`
    else if (teVeel?.wijn) probleem = `Van de ${korteNaam(teVeel.wijn)} zijn er nog ${teVeel.wijn.voorraad}.`
  }

  const bestel = () => {
    if (lijst.status !== 'open') return setFout('De avond is gesloten.')
    if (!lidId) return setFout('Kies het lid.')
    if (!levering) return setFout('Kies brengen of halen.')
    if (levering === 'brengen' && !lid(lidId)?.adres) return setFout(`${lidNaam(lidId)} heeft geen adres. Kies halen.`)
    if (regels.length === 0) return setFout('Schrijf welke wijnen, zoals G2 H1.')
    if (probleem) return setFout(probleem)
    dispatch({
      type: 'bestel', lidId, door: 'beheer', levering, nu: nuUtc(),
      regels: regels.map((r) => ({ wijnId: r.wijn!.wijnId, aantal: r.aantal })),
    })
    dispatch({ type: 'melding', melding: { kop: `Bestelling voor ${lidNaam(lidId)}`, tekst: 'Het lid krijgt een betaallink en heeft 48 uur om te betalen.' } })
    ga({ scherm: 'beheer', tab: 'afleveren' })
  }

  return (
    <>
      <Kop sub="Beheer" rechts={<span />} />
      <TerugLink titel="Terug naar afleveren" onTerug={() => ga({ scherm: 'beheer', tab: 'afleveren' })} />
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
          <p className="tekst klein gedempt">{gesorteerd(lijst.wijnen).filter((w) => w.opTafelSinds).map((w) => `${w.letter} = ${korteNaam(w)}`).join(' · ')}</p>
          {letters.trim() && probleem && <p className="fout">{probleem}</p>}
          {letters.trim() && !probleem && regels.length > 0 && (
            <div className="bon-klein" style={{ display: 'block' }}>
              <BonRegels
                regels={regels.map((r) => ({
                  sleutel: r.letter, aantal: r.aantal, naam: korteNaam(r.wijn!), jaargang: r.wijn!.jaargang, prijs: r.wijn!.prijs,
                }))}
              />
            </div>
          )}
        </Stap>
        <Stap nummer="03" titel="Brengen of halen?">
          <Keuze
            label="Brengen of halen"
            vorm={momenten.length === 2 ? 'split' : 'banden'}
            gekozen={levering}
            onKies={(id) => setLevering(id as LeverSoort)}
            opties={momenten.map((m) => ({ id: m.soort, woord: LEVER_WOORD[m.soort], zin: m.wanneer }))}
          />
          {levering === 'brengen' && lidId && <p className="tekst klein gedempt">{adresRegel(lid(lidId)?.adres) || `${lidNaam(lidId)} heeft geen adres.`}</p>}
          <p className="uitleg-voorbeeld">Het lid krijgt een betaallink en heeft 48 uur om te betalen.</p>
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

