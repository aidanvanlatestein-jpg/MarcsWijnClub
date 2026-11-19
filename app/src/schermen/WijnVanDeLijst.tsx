import { Flessenrij } from '../onderdelen/Flessenrij'
import { GrootBedrag, Onderkant, Stippellijn } from '../onderdelen/Knoppen'
import { TerugLink, ZwevendeNav } from '../onderdelen/Kop'
import { naamMetJaar, tijd } from '../opmaak'
import { terug, type Ga } from '../route'
import { useStaat, zoekWijn } from '../staat'

/**
 * 04 Wijn van de lijst: foto, Marcs tekst, erbij en drinken, prijs en de flessenrij. Vanuit de
 * aankondiging is de wijn alvast te bekijken; bestellen kan pas als Marc hem op tafel zet.
 */
export function WijnVanDeLijst({ wijnId, ga }: { wijnId: string; ga: Ga }) {
  const [staat, dispatch] = useStaat()
  const wijn = zoekWijn(staat, wijnId)
  const naarKaart = () => terug(() => ga({ scherm: 'aanbod' }))

  if (!wijn || staat.lijst.status !== 'open') {
    return (
      <>
        <TerugLink titel="Terug naar de avond" onTerug={() => ga({ scherm: 'aanbod' })} />
        <main className="sectie"><p className="tekst">Deze wijn staat niet (meer) op de lijst.</p></main>
        <Onderkant ga={ga} tab="aanbod" />
      </>
    )
  }

  const gekozen = staat.mandje[wijn.wijnId] ?? 0
  const opTafel = Boolean(wijn.opTafelSinds)
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
              <span>{!opTafel ? `${partij} FLESSEN` : op ? 'UITVERKOCHT' : `${wijn.voorraad} VAN ${partij} OVER`}</span>
            </p>
          </div>
          {!opTafel && (
            <p className="label goud" style={{ padding: '8px 0' }}>
              {staat.lijst.fase === 'aangekondigd' ? `Komt vanavond op tafel · vanaf ${tijd(staat.lijst.begin)}` : 'Marc zet deze wijn straks op tafel'}
            </p>
          )}
          {opTafel && <Flessenrij groot vrij={wijn.voorraad} weg={Math.max(0, partij - wijn.voorraad)} gekozen={gekozen} onKies={kies} letter={wijn.letter} naam={wijn.naam} />}
        </div>
      </main>
      <Onderkant ga={ga} tab="aanbod" bon />
    </>
  )
}
