import { ArrowRight, Bell, Check } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar, Gebeurtenis, LiveBalk, MarcBericht } from '../onderdelen/Avond'
import { Flessenrij } from '../onderdelen/Flessenrij'
import { Hoofdknop, Onderkant, Prijs } from '../onderdelen/Knoppen'
import { Woordmerk } from '../onderdelen/Kop'
import { datumLang, euro, flessen, minutenTussen, naamMetJaar, tijd, weekdag } from '../opmaak'
import type { Ga } from '../route'
import {
  betaalverzoek, gesorteerd, LID, mijnBiedingBestelling, mijnLijstBestellingen, nieuwste, tellers, useNu, useStaat, veilingVanAvond,
  type Staat,
} from '../staat'
import type { FeedItem, Wijn } from '../types'
import { voorbeeldBerichten, voorbeeldLedenBinnen } from '../voorbeeld'

/** "/": de aankondiging (02), de avond zelf (03), of na afloop de terugblik met "Niets open." */
export function Aanbod({ ga }: { ga: Ga }) {
  const [staat] = useStaat()
  if (staat.lijst.fase === 'aangekondigd') return <Aankondiging ga={ga} />
  if (staat.lijst.fase === 'live') return <DeAvond ga={ga} />
  return <NaAfloop ga={ga} />
}

// ---- 02 Aankondiging ----

function Aankondiging({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const { lijst } = staat
  const wijnen = gesorteerd(lijst.wijnen)
  const veiling = veilingVanAvond(staat)
  const totaal = wijnen.reduce((som, w) => som + (w.partij ?? w.voorraad), 0)
  return (
    <>
      <main>
        <div className="aankondiging-kop">
          <img src="/marc/sfeer.jpg" alt="" />
          <span className="verloop" aria-hidden />
          <div className="aankondiging-merk"><Woordmerk /></div>
          <div className="aankondiging-titel">
            <p className="label goud">{datumLang(lijst.begin).toUpperCase()}</p>
            <h1 className="eventkop">Vanavond<br />bij Marc.</h1>
          </div>
        </div>
        <div className="sectie" style={{ paddingTop: 16, gap: 8 }}>
          {lijst.inleiding && <MarcBericht groot tekst={lijst.inleiding} op={lijst.aankondigingOp} />}
          <p className="uitleg-voorbeeld">Voorbeeldtekst. Marc schrijft zijn aankondiging zelf.</p>
        </div>
        <section className="samenvatting" aria-labelledby="op-tafel">
          <div className="samenvatting-kop">
            <h2 id="op-tafel">Op tafel vanavond</h2>
            <span>{wijnen.length} wijnen · {totaal} flessen</span>
          </div>
          <ul>
            {wijnen.map((w) => (
              <li key={w.wijnId}>
                <button type="button" onClick={() => ga({ scherm: 'wijn', wijnId: w.wijnId })}>
                  <span className="sam-letter" aria-hidden>{w.letter}</span>
                  <span className="sam-naam"><span className="sr">Wijn {w.letter}: </span>{naamMetJaar(w)}</span>
                  <span className="sam-aantal">{w.partij ?? w.voorraad} fl</span>
                  <span className="sam-prijs">{euro(w.prijs)}</span>
                </button>
              </li>
            ))}
            {veiling && (
              <li>
                <button type="button" onClick={() => ga({ scherm: 'fles', wijnId: veiling.wijnId })}>
                  <span className="sam-letter goud" aria-hidden>★</span>
                  <span className="sam-naam">
                    <span className="label goud" style={{ display: 'block', fontSize: 13 }}>Veiling</span>
                    {naamMetJaar(veiling)} · 1 fles
                  </span>
                  <span className="sam-prijs">
                    <span className="label" style={{ display: 'block', fontSize: 13 }}>Startbod</span>
                    {euro(veiling.startbod, { heel: true })}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </section>
      </main>
      <Onderkant
        ga={ga}
        tab="aanbod"
        knop={
          <Hoofdknop
            aria-pressed={staat.herinnering}
            icoon={staat.herinnering ? <Check size={26} aria-hidden /> : <Bell size={26} aria-hidden />}
            onClick={() => dispatch({ type: 'herinner' })}
          >
            {staat.herinnering ? `Je krijgt om ${tijd(lijst.begin)} een melding` : `Herinner mij om ${tijd(lijst.begin)}`}
          </Hoofdknop>
        }
      />
    </>
  )
}

// ---- 03 De avond ----

function DeAvond({ ga }: { ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const nu = useNu(15_000)
  const { lijst } = staat
  const laatste = nieuwste(staat)
  const veiling = veilingVanAvond(staat)
  const feedRef = useRef<HTMLDivElement>(null)
  const [nieuw, setNieuw] = useState(false)
  const lengte = useRef(staat.feed.length)

  // Bij openen: naar de nieuwste wijn.
  useLayoutEffect(() => {
    const doel = feedRef.current?.querySelector('.feed-wijn.nieuwste')
    if (doel) doel.scrollIntoView({ block: 'start' })
  }, [])

  // Nieuwe items schuiven onderaan in. Staat de gebruiker hoger, dan verschijnt "Nieuw van Marc".
  useEffect(() => {
    if (staat.feed.length <= lengte.current) {
      lengte.current = staat.feed.length
      return
    }
    lengte.current = staat.feed.length
    const onder = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400
    if (!onder) setNieuw(true)
  }, [staat.feed.length])
  useEffect(() => {
    if (!nieuw) return
    const kijk = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) setNieuw(false)
    }
    window.addEventListener('scroll', kijk, { passive: true })
    return () => window.removeEventListener('scroll', kijk)
  }, [nieuw])

  return (
    <>
      <LiveBalk tekst={`BIJ MARC · LIVE SINDS ${tijd(lijst.begin)}`} rechts={`${voorbeeldLedenBinnen} LEDEN BINNEN`} />
      <main>
        <h1 className="sr">De avond bij Marc</h1>
        <p className="uitleg-voorbeeld" style={{ padding: '10px var(--marge) 0' }}>
          Voorbeeld: de berichten van Marc in deze feed zijn verzonnen.
        </p>
        <div className="feed" ref={feedRef} aria-live="polite" aria-relevant="additions">
          {staat.feed.map((item) => (
            <FeedRegel
              key={item.id}
              item={item}
              staat={staat}
              nu={nu}
              nieuwste={item.soort === 'wijn' && item.wijnId === laatste?.wijnId}
              onKies={(wijnId, aantal) => dispatch({ type: 'mandje', wijnId, aantal })}
              onOpen={(wijnId) => ga({ scherm: 'wijn', wijnId })}
            />
          ))}
          {staat.feed.length === 0 && <p className="tekst gedempt">Marc begint zo. De eerste wijn verschijnt hier.</p>}
          {staat.marcTypt && (
            <div className="marc-typt">
              <Avatar maat={26} />
              <span>Marc typt…</span>
            </div>
          )}
        </div>
        {nieuw && (
          <button
            type="button"
            className="nieuw-van-marc"
            onClick={() => {
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
              setNieuw(false)
            }}
          >
            Nieuw van Marc ↓
          </button>
        )}
        {veiling && veiling.biedingStatus === 'open' && (
          <button
            type="button"
            className="straks"
            onClick={() => ga(veiling.geopend ? { scherm: 'veiling', wijnId: veiling.wijnId } : { scherm: 'fles', wijnId: veiling.wijnId })}
          >
            {veiling.geopend ? (
              <span className="straks-tekst"><strong className="goud" style={{ fontSize: 18 }}>De veiling is begonnen</strong></span>
            ) : (
              <>
                <span className="straks-tijd">{tijd(lijst.veilingBegin)}</span>
                <span className="straks-tekst">De veiling van de {naamMetJaar(veiling, { kort: true })} begint</span>
              </>
            )}
            <ArrowRight size={22} aria-hidden />
          </button>
        )}
      </main>
      <Onderkant ga={ga} tab="aanbod" bon />
    </>
  )
}

function FeedRegel({ item, staat, nu, nieuwste, onKies, onOpen }: {
  item: FeedItem
  staat: Staat
  nu: number
  nieuwste: boolean
  onKies: (wijnId: string, aantal: number) => void
  onOpen: (wijnId: string) => void
}) {
  if (item.soort === 'bericht') return <div className="feed-item"><MarcBericht tekst={item.tekst} op={item.op} /></div>
  if (item.soort === 'gebeurtenis') {
    const wanneer = nu - new Date(item.op).getTime() < 60_000 ? 'ZOJUIST' : tijd(item.op)
    return <div className="feed-item"><Gebeurtenis tekst={`${item.tekst} · ${wanneer}`} /></div>
  }
  const wijn = staat.lijst.wijnen.find((w) => w.wijnId === item.wijnId)
  if (!wijn) return null
  return (
    <div className="feed-item">
      <FeedWijn
        wijn={wijn}
        nieuwste={nieuwste}
        levendig={staat.instellingen.levendig}
        gekozen={staat.mandje[wijn.wijnId] ?? 0}
        onKies={(n) => onKies(wijn.wijnId, n)}
        onOpen={() => onOpen(wijn.wijnId)}
      />
    </div>
  )
}

/** Een wijn in de feed. De nieuwste heeft een gouden rand en een grote foto. */
function FeedWijn({ wijn, nieuwste, levendig, gekozen, onKies, onOpen }: {
  wijn: Wijn
  nieuwste: boolean
  levendig: boolean
  gekozen: number
  onKies: (n: number) => void
  onOpen: () => void
}) {
  const op = wijn.voorraad <= 0
  const partij = wijn.partij ?? wijn.voorraad
  const weg = Math.max(0, partij - wijn.voorraad)
  const groot = nieuwste && !op
  const naam = (
    <h2>
      <button type="button" className="feed-naam" onClick={onOpen}>
        <span className="sr">Wijn {wijn.letter}: </span>{naamMetJaar(wijn)}
      </button>
    </h2>
  )
  return (
    <article className={`feed-wijn${groot ? ' nieuwste' : ''}${op ? ' op' : ''}`} aria-label={`Wijn ${wijn.letter}`}>
      {groot && (
        <div className="feed-foto">
          {wijn.foto ? <img src={wijn.foto} alt="" /> : null}
          <span className="verloop" aria-hidden />
          {levendig && <span className="net-op-tafel">Net op tafel · {tijd(wijn.opTafelSinds!)}</span>}
          <span className="feed-foto-letter" aria-hidden>{wijn.letter}</span>
        </div>
      )}
      <div className="feed-wijn-binnen">
        {!groot && <span className="feed-letter" aria-hidden>{wijn.letter}</span>}
        <div className="feed-wijn-tekst">
          {!groot && <p className="feed-wanneer">Wijn {wijn.letter} · {tijd(wijn.opTafelSinds!)}</p>}
          {naam}
          <p className="feed-omschrijving">{wijn.tekst}</p>
          <div className="feed-prijs-rij">
            <Prijs centen={wijn.prijs} />
            <span className="feed-rest">
              {op ? `OP${wijn.opSinds ? ` · IN ${minutenTussen(wijn.opTafelSinds!, wijn.opSinds)} MIN` : ''}` : `NOG ${wijn.voorraad} VAN ${partij}`}
            </span>
          </div>
          {!op && <Flessenrij vrij={wijn.voorraad} weg={weg} gekozen={gekozen} onKies={onKies} letter={wijn.letter} naam={wijn.naam} />}
        </div>
      </div>
    </article>
  )
}

// ---- Na afloop: terugblik en "Niets open." ----

function NaAfloop({ ga }: { ga: Ga }) {
  const [staat] = useStaat()
  const verzoek = betaalverzoek(staat)
  return (
    <>
      <main>
        <NietsOpen />
        <Terugblik />
      </main>
      <Onderkant
        ga={ga}
        tab="aanbod"
        knop={
          verzoek.bedrag > 0 ? (
            <Hoofdknop goud onClick={() => ga({ scherm: 'flessen' })}>Betaal {euro(verzoek.bedrag)} met iDEAL</Hoofdknop>
          ) : undefined
        }
      />
    </>
  )
}

/** Toestand: geen avond gepland (scherm 16). */
export function NietsOpen() {
  return (
    <div className="masthead" style={{ paddingTop: 24, paddingBottom: 28 }}>
      <h1 className="groot spook" style={{ fontSize: 'min(120px, 30vw)' }}>Niets<br />open.</h1>
      <p className="tekst" style={{ marginTop: 16 }}>{voorbeeldBerichten.nietsOpen} — Marc</p>
      <p className="uitleg-voorbeeld" style={{ marginTop: 6 }}>Voorbeeldtekst. Marc schrijft deze zin zelf.</p>
    </div>
  )
}

/** De terugblik op de avond: tellers en per wijn wanneer hij op was of hoeveel er over is. */
export function Terugblik() {
  const [staat] = useStaat()
  const t = tellers(staat)
  const mijn = mijnLijstBestellingen(staat).reduce((som, b) => som + b.regels.reduce((x, r) => x + r.aantal, 0), 0)
  const veiling = veilingVanAvond(staat)
  const gewonnen = veiling && mijnBiedingBestelling(staat, veiling.wijnId)
  const wijnen = gesorteerd(staat.lijst.wijnen).filter((w) => w.opTafelSinds)
  let slot = ''
  if (mijn > 0 && gewonnen) slot = `Jij nam vanavond ${flessen(mijn)} en de ${veiling.naam.split(' ')[0]}.`
  else if (mijn > 0) slot = `Jij nam vanavond ${flessen(mijn)}.`
  else if (gewonnen) slot = `Jij nam vanavond de ${veiling.naam.split(' ')[0]}.`
  return (
    <section className="terugblik" aria-labelledby="terugblik">
      <h2 id="terugblik" className="label">De avond van {weekdag(staat.lijst.begin)}</h2>
      <div className="tellers lijn-boven lijn-onder">
        <div><strong>{t.flessen}</strong><span>FLESSEN</span></div>
        <div><strong>{t.leden}</strong><span>LEDEN</span></div>
        <div><strong>{t.biedingen}</strong><span>BIEDINGEN</span></div>
      </div>
      <ul className="terugblik-wijnen">
        {wijnen.map((w) => (
          <li key={w.wijnId}>
            <span className="sam-letter" aria-hidden>{w.letter}</span>
            <span className="sam-naam">{w.naam}</span>
            <span className="label" style={{ color: w.voorraad > 0 ? 'var(--ink)' : 'var(--muted)', fontSize: 13 }}>
              {w.voorraad > 0
                ? `NOG ${w.voorraad} OVER`
                : w.opSinds
                  ? minutenTussen(w.opTafelSinds!, w.opSinds) < 15 ? `OP IN ${minutenTussen(w.opTafelSinds!, w.opSinds)} MIN` : `OP OM ${tijd(w.opSinds)}`
                  : 'OP'}
            </span>
          </li>
        ))}
      </ul>
      {slot && <p className="tekst klein gedempt">{slot} Tot de volgende keer.</p>}
      {staat.lijst.status === 'gesloten' && staat.bestellingen.some((b) => b.lidId === LID && b.status === 'betaald') && (
        <p className="tekst klein gedempt">Je hebt betaald: {euro(staat.bestellingen.filter((b) => b.lidId === LID && b.status === 'betaald').reduce((s, b) => s + b.totaal, 0))}.</p>
      )}
    </section>
  )
}
