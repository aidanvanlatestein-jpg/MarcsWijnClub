import { useState } from 'react'
import { Knop } from './onderdelen/Knop'
import { Kopbalk, KopbalkTerug } from './onderdelen/Kopbalk'
import { Tabbalk, type Tab } from './onderdelen/Tabbalk'
import { euro, flessen } from './opmaak'
import { terug, useRoute, type Route } from './route'
import { Aanbod, type Mandje } from './schermen/Aanbod'
import { WijnVanDeLijst } from './schermen/WijnVanDeLijst'
import { voorbeeldAanbod } from './voorbeeld'

const TAB_VAN: Record<Route['scherm'], Tab> = { aanbod: 'aanbod', wijn: 'aanbod', flessen: 'flessen', marc: 'marc' }

export function App() {
  // Tot inloggen werkt: voorbeeldinhoud uit het ontwerp.
  const aanbod = voorbeeldAanbod
  const [route, ga] = useRoute()
  const [mandje, setMandje] = useState<Mandje>({})

  const wijnen = aanbod.lijsten[0]?.wijnen ?? []
  const aantal = Object.values(mandje).reduce((som, n) => som + n, 0)
  const totaal = wijnen.reduce((som, w) => som + (mandje[w.wijnId] ?? 0) * w.prijs, 0)
  const wijzig = (wijnId: string, n: number) => setMandje((m) => ({ ...m, [wijnId]: n }))
  const wijn = route.scherm === 'wijn' ? wijnen.find((w) => w.wijnId === route.wijnId) : undefined

  let kop = <Kopbalk />
  let scherm
  if (route.scherm === 'aanbod') {
    scherm = <Aanbod aanbod={aanbod} mandje={mandje} onWijzig={wijzig} onOpenWijn={(wijnId) => ga({ scherm: 'wijn', wijnId })} />
  } else if (route.scherm === 'wijn' && wijn) {
    kop = <KopbalkTerug titel={`Wijn ${wijn.letter}`} onTerug={() => terug(() => ga({ scherm: 'aanbod' }))} />
    scherm = <WijnVanDeLijst wijn={wijn} aantal={mandje[wijn.wijnId] ?? 0} onWijzig={(n) => wijzig(wijn.wijnId, n)} />
  } else if (route.scherm === 'wijn') {
    kop = <KopbalkTerug titel="Wijn" onTerug={() => ga({ scherm: 'aanbod' })} />
    scherm = <main className="melding">Deze wijn staat niet (meer) op de lijst.</main>
  } else {
    scherm = <main className="melding">Dit scherm komt nog.</main>
  }

  const toonBestel = (route.scherm === 'aanbod' || route.scherm === 'wijn') && aantal > 0

  return (
    <div className="app">
      <div className="voorbeeld">Voorbeeldinhoud · er wordt niets besteld</div>
      {kop}
      {scherm}
      <div className="onderkant">
        {toonBestel && (
          <div className="hoofdknop-zone">
            <Knop>BESTEL {flessen(aantal).toUpperCase()} · {euro(totaal)}</Knop>
          </div>
        )}
        <Tabbalk actief={TAB_VAN[route.scherm]} onKies={(tab) => ga({ scherm: tab })} />
      </div>
    </div>
  )
}
