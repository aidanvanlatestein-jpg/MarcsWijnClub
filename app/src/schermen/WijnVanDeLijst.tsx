import { Flessenrij, RijStatus } from '../onderdelen/Flessenrij'
import { GrootBedrag, Onderkant, Stippellijn } from '../onderdelen/Knoppen'
import { TerugLink, ZwevendeNav } from '../onderdelen/Kop'
import { naamMetJaar } from '../opmaak'
import { terug, type Ga } from '../route'
import { useStaat, zoekWijn } from '../staat'

/** 03 Wijn van de lijst: foto, Marcs tekst, erbij en drinken, prijs en de flessenrij. */
export function WijnVanDeLijst({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const wijn = zoekWijn(staat, wijnId)
  const naarKaart = () => terug(() => ga({ scherm: 'aanbod' }))

  if (!wijn || staat.lijst.status !== 'open') {
    return (
      <>
        <TerugLink titel="Terug naar de kaart" onTerug={() => ga({ scherm: 'aanbod' })} />
        <main className="sectie"><p className="tekst">Deze wijn staat niet (meer) op de lijst.</p></main>
        <Onderkant ga={ga} tab="aanbod" />
      </>
    )
  }

  const gekozen = staat.mandje[wijn.wijnId] ?? 0
  const op = wijn.voorraad <= 0
  const partij = wijn.partij ?? wijn.voorraad
  const herkomst = [wijn.druif, wijn.producent, wijn.streek].filter(Boolean).join(' · ')
  const kies = (aantal: number) => dispatch({ type: 'mandje', wijnId: wijn.wijnId, aantal })

  return (
    <>
      <main>
        <div className="foto-kop">
          {wijn.foto ? <img src={wijn.foto} alt="" /> : null}
          <span className="verloop" aria-hidden />
          <ZwevendeNav titel={`Wijn ${wijn.letter}`} onTerug={naarKaart} vraag={`Hoi Marc, een vraag over wijn ${wijn.letter}, ${naamMetJaar(wijn)}: `} />
          <span className="reuzenletter-groot" aria-hidden style={{ opacity: op ? 0.4 : 1 }}>{wijn.letter}</span>
        </div>
        <div className="wijn-inhoud">
          <h1 className="naam-groot">
            <span className="sr">Wijn {wijn.letter}: </span>
            {wijn.naam}
            {wijn.jaargang ? <span className="jaar">{wijn.jaargang}</span> : null}
          </h1>
          {herkomst && <p className="herkomst-regel">{herkomst}</p>}
          <figure className="citaat" style={{ margin: 0 }}>
            <span className="citaat-teken" aria-hidden>“</span>
            <div>
              <blockquote style={{ margin: 0 }}><p>{wijn.tekst}</p></blockquote>
              <figcaption className="door">— MARC</figcaption>
            </div>
          </figure>
          {(wijn.spijs || wijn.drinken) && (
            <>
              <Stippellijn />
              <div className="twee-kolommen">
                {wijn.spijs && (
                  <div>
                    <h2 className="blok-kop">Erbij</h2>
                    <p className="blok-tekst">{wijn.spijs}</p>
                  </div>
                )}
                {wijn.drinken && (
                  <div>
                    <h2 className="blok-kop">Drinken</h2>
                    <p className="blok-tekst">{wijn.drinken}</p>
                  </div>
                )}
              </div>
            </>
          )}
          <Stippellijn />
          <div className="prijs-groot">
            <GrootBedrag centen={wijn.prijs} />
            <p className="rechts">
              <span>PER FLES</span>
              <span>{op ? 'UITVERKOCHT' : `${wijn.voorraad} VAN ${partij} OVER`}</span>
            </p>
          </div>
          <div className="kies-flessen">
            <Flessenrij groot vrij={wijn.voorraad} weg={Math.max(0, partij - wijn.voorraad)} gekozen={gekozen} onKies={kies} letter={wijn.letter} naam={wijn.naam} />
            <RijStatus groot vrij={wijn.voorraad} gekozen={gekozen} />
          </div>
        </div>
      </main>
      <Onderkant ga={ga} tab="aanbod" bon />
    </>
  )
}
