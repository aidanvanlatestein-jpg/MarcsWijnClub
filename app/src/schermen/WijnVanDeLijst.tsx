import { Aantal } from '../onderdelen/Aantal'
import { Stippellijn } from '../onderdelen/Stippellijn'
import { euro, flessen } from '../opmaak'
import type { Wijn } from '../types'

interface Props {
  wijn: Wijn
  aantal: number
  onWijzig: (aantal: number) => void
}

export function WijnVanDeLijst({ wijn, aantal, onWijzig }: Props) {
  const op = wijn.voorraad <= 0
  const herkomst = [wijn.druif, wijn.producent, wijn.streek].filter(Boolean).join(' · ')
  return (
    <main>
      {wijn.foto ? <img className="wijn-groot-foto" src={wijn.foto} alt="" /> : null}
      <div className="inhoud wijn-groot">
        <div className="titel">
          <h1 className="wijn-groot-naam">{wijn.naam}</h1>
          {herkomst && <p className="wijn-groot-herkomst">{herkomst}</p>}
        </div>
        <p className="wijn-groot-tekst">{wijn.tekst}</p>
        {wijn.spijs && <Blok kop="WAT EET JE ERBIJ" tekst={wijn.spijs} />}
        {wijn.drinken && <Blok kop="WANNEER DRINKEN" tekst={wijn.drinken} />}
        <div className="wijn-groot-prijs">
          <strong>{euro(wijn.prijs)} per fles</strong>
          {op ? <small className="op">Uitverkocht</small> : <small>Nog {flessen(wijn.voorraad)}</small>}
        </div>
        {!op && <Aantal groot waarde={aantal} max={wijn.voorraad} naam={wijn.naam} onWijzig={onWijzig} />}
      </div>
    </main>
  )
}

function Blok({ kop, tekst }: { kop: string; tekst: string }) {
  return (
    <section className="kop-sectie">
      <h2>{kop}</h2>
      <Stippellijn />
      <p className="blok-tekst">{tekst}</p>
    </section>
  )
}
