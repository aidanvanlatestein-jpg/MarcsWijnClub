import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Blad } from '../onderdelen/Blad'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { useWhatsApp } from '../onderdelen/WhatsApp'
import { TerugLink } from '../onderdelen/Kop'
import { terug, type Ga } from '../route'

export type Pagina = 'voorwaarden' | 'privacy' | 'wissen'

/**
 * Marc: portret, een korte tekst, voorwaarden, privacy en gegevens wissen. Staat niet in design-v4 en heeft
 * geen tab meer; je komt er via Je bestellingen. De voorwaarden en de privacy staan ook bij het inloggen.
 */
export function Marc({ ga }: { ga: Ga }) {
  const open = useWhatsApp()
  const [pagina, setPagina] = useState<Pagina | null>(null)
  return (
    <>
      <TerugLink titel="Terug" onTerug={() => terug(() => ga({ scherm: 'mijn-bestelling' }))} />
      <main>
        <div className="portret">
          <img className="portret-foto" src="/marc/portret.jpg" alt="Marc" />
          <span className="verloop" aria-hidden />
          <h1>
            <span>Ik ben</span>
            <strong>Marc.</strong>
          </h1>
        </div>
        <section className="sectie" style={{ gap: 18 }}>
          <p className="tekst" style={{ fontSize: 19, lineHeight: '26px' }}>
            Ik kook bij mensen thuis en ik drink graag goede wijn. In deze club deel ik flessen die ik zelf inkoop en
            lekker vind. Vraag gerust wat je wilt weten, ik antwoord zelf.
          </p>
          <p className="uitleg-voorbeeld">Voorbeeldtekst. Marc schrijft deze tekst zelf.</p>
          <nav className="grote-links" aria-label="Over de club">
            <Link onClick={() => setPagina('voorwaarden')}>Voorwaarden</Link>
            <Link onClick={() => setPagina('privacy')}>Privacy</Link>
            <Link gedempt onClick={() => setPagina('wissen')}>Mijn gegevens wissen</Link>
          </nav>
        </section>
      </main>
      <Onderkant
        ga={ga}
        knop={
          <Hoofdknop icoon={<MessageCircle size={26} aria-hidden />} onClick={() => open('Hoi Marc, ')}>
            Vraag Marc in WhatsApp
          </Hoofdknop>
        }
      />
      {pagina && <ClubBlad pagina={pagina} onSluit={() => setPagina(null)} />}
    </>
  )
}

/** Voorwaarden, privacy en gegevens wissen, als paneel. */
export function ClubBlad({ pagina, onSluit }: { pagina: Pagina; onSluit: () => void }) {
  if (pagina === 'voorwaarden') {
    return (
      <Blad titel="Clubvoorwaarden" onSluit={onSluit}>
        <p className="uitleg-voorbeeld">Concept op basis van het pilotplan. Nog niet door een jurist bekeken.</p>
        <ul className="tekst" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>De club is alleen op uitnodiging, voor leden van 18 jaar of ouder.</li>
          <li>Je betaalt meteen bij het bestellen, met iDEAL. Ik houd je flessen 15 minuten vast; betaal je niet binnen die tijd, dan gaan ze terug op tafel.</li>
          <li>Een bod is bindend. Win je, dan betaal je binnen 48 uur. Een bod in de laatste twee minuten verlengt de bieding met twee minuten.</li>
          <li>Je kiest of ik je flessen breng of dat je ze ophaalt. Brengen kan alleen naar het adres dat je mij gaf.</li>
        </ul>
      </Blad>
    )
  }
  if (pagina === 'privacy') {
    return (
      <Blad titel="Privacy" onSluit={onSluit}>
        <p className="uitleg-voorbeeld">Concept op basis van het pilotplan. Nog niet door een jurist bekeken.</p>
        <p className="tekst">
          De club bewaart alleen wat nodig is: je naam, e-mail, telefoon, je afleveradres als je wilt dat ik breng, je
          biedingen en je aankopen. Alleen jij en ik zien je adres. Geen geboortedatum en geen kopie van een
          identiteitsbewijs. Betaalgegevens blijven bij Mollie en in mijn boekhouding, zolang de wet dat vraagt.
        </p>
      </Blad>
    )
  }
  return (
    <Blad titel="Mijn gegevens wissen" onSluit={onSluit}>
      <p className="tekst">
        Je kunt je gegevens laten verwijderen. Wat de wet laat bewaren voor de boekhouding, blijft bewaard. Daarna kun
        je niet meer inloggen.
      </p>
      <p className="uitleg-voorbeeld">Voorbeeld: in het prototype wordt niets gewist.</p>
      <Hoofdknop onClick={onSluit}>Begrepen</Hoofdknop>
    </Blad>
  )
}

function Link({ children, onClick, gedempt = false }: { children: ReactNode; onClick: () => void; gedempt?: boolean }) {
  return (
    <button type="button" className={gedempt ? 'gedempt' : undefined} onClick={onClick}>
      <span>{children}</span>
      <ArrowUpRight size={26} aria-hidden style={{ color: 'var(--muted)' }} />
    </button>
  )
}
