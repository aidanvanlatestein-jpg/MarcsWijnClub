import { Pushmelding } from './onderdelen/Pushmelding'
import { Voorbeeldbalk } from './onderdelen/Voorbeeldbalk'
import { WhatsAppProvider } from './onderdelen/WhatsApp'
import { useRoute, type Ga, type Route } from './route'
import { KENMERKEN } from './schakelaars'
import { Aanbod } from './schermen/Aanbod'
import { Beheer, Namens } from './schermen/Beheer'
import { Bestelling } from './schermen/Bestelling'
import { Fles, Gewonnen, Veiling } from './schermen/Bieding'
import { Marc } from './schermen/Marc'
import { MijnBestelling } from './schermen/MijnBestelling'
import { BonStatus, NetOp } from './schermen/Toestanden'
import { Welkom } from './schermen/Welkom'
import { WijnVanDeLijst } from './schermen/WijnVanDeLijst'
import { StaatProvider, useStaat } from './staat'

// Het klikbare prototype. Alles is voorbeeldinhoud uit src/voorbeeld.ts en staat alleen in de browser;
// er gaat niets naar de API. Inloggen, bestellen en betalen komen later via Cognito, de API en Mollie.
export function App() {
  return (
    <StaatProvider>
      <WhatsAppProvider>
        <Prototype />
      </WhatsAppProvider>
    </StaatProvider>
  )
}

/** Beheer is in de echte app alleen voor de groep beheer. In het prototype kan iedereen erheen. */
const ZONDER_INLOGGEN: Route['scherm'][] = ['welkom', 'beheer', 'namens']

function Prototype() {
  const [staat] = useStaat()
  const [route, ga] = useRoute()
  const naarWelkom = !staat.ingelogd && !ZONDER_INLOGGEN.includes(route.scherm)
  return (
    <div className="app" data-kenmerken={KENMERKEN ? 'aan' : 'uit'}>
      <Voorbeeldbalk ga={ga} />
      <Pushmelding />
      {naarWelkom ? <Welkom ga={ga} /> : <Scherm route={route} ga={ga} />}
    </div>
  )
}

function Scherm({ route, ga }: { route: Route; ga: Ga }) {
  switch (route.scherm) {
    case 'welkom':
      return <Welkom ga={ga} />
    case 'aanbod':
      return <Aanbod ga={ga} />
    case 'wijn':
      return <WijnVanDeLijst key={route.wijnId} wijnId={route.wijnId} ga={ga} />
    case 'bestelling':
      return <Bestelling ga={ga} />
    case 'bon':
      return <BonStatus key={route.bestellingId} bestellingId={route.bestellingId} ga={ga} />
    case 'net-op':
      return <NetOp ga={ga} />
    case 'fles':
      return <Fles key={route.wijnId} wijnId={route.wijnId} ga={ga} />
    case 'veiling':
      return <Veiling key={route.wijnId} wijnId={route.wijnId} ga={ga} />
    case 'gewonnen':
      return <Gewonnen wijnId={route.wijnId} ga={ga} />
    case 'mijn-bestelling':
      return <MijnBestelling ga={ga} />
    case 'marc':
      return <Marc ga={ga} />
    case 'beheer':
      return <Beheer key={route.tab ?? 'avond'} ga={ga} tab={route.tab ?? 'avond'} />
    case 'namens':
      return <Namens ga={ga} />
  }
}
