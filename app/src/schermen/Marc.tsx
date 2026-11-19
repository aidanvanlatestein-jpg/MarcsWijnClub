import { MessageCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Blad } from '../onderdelen/Blad'
import { Hoofdknop, Onderkant } from '../onderdelen/Knoppen'
import { useWhatsApp } from '../onderdelen/WhatsApp'
import type { Ga } from '../route'

type Pagina = 'voorwaarden' | 'privacy' | 'wissen'

/** 09 Marc: portret, een korte tekst, voorwaarden, privacy en gegevens wissen. */
export function Marc({ ga }: { ga: Ga }) {
  const open = useWhatsApp()
  const [pagina, setPagina] = useState<Pagina | null>(null)
  return (
    <>
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
        tab="marc"
        knop={
          <Hoofdknop icoon={<MessageCircle size={26} aria-hidden />} onClick={() => open('Hoi Marc, ')}>
            Vraag Marc in WhatsApp
          </Hoofdknop>
        }
      />
      {pagina === 'voorwaarden' && (
        <Blad titel="Clubvoorwaarden" onSluit={() => setPagina(null)}>
          <p className="uitleg-voorbeeld">Concept op basis van het pilotplan. Nog niet door een jurist bekeken.</p>
          <ul className="tekst" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>De club is alleen op uitnodiging, voor leden van 18 jaar of ouder.</li>
            <li>Een bestelling van de lijst is bindend. Als de lijst sluit, betaal je alles in één keer, binnen 48 uur. Daarna vervalt je bestelling.</li>
            <li>Een bod is bindend. Win je, dan betaal je binnen 48 uur. Een bod in de laatste twee minuten verlengt de bieding met twee minuten.</li>
            <li>Je haalt je flessen op bij een afhaalpunt. Een fles uit een bieding kan Marc ook voor je bewaren.</li>
          </ul>
        </Blad>
      )}
      {pagina === 'privacy' && (
        <Blad titel="Privacy" onSluit={() => setPagina(null)}>
          <p className="uitleg-voorbeeld">Concept op basis van het pilotplan. Nog niet door een jurist bekeken.</p>
          <p className="tekst">
            De club bewaart alleen wat nodig is: je naam, e-mail, telefoon, je afhaalpunt van voorkeur, je biedingen en je
            aankopen. Geen adres, geen geboortedatum en geen kopie van een identiteitsbewijs. Betaalgegevens blijven bij
            Mollie en in Marcs boekhouding, zolang de wet dat vraagt.
          </p>
        </Blad>
      )}
      {pagina === 'wissen' && (
        <Blad titel="Mijn gegevens wissen" onSluit={() => setPagina(null)}>
          <p className="tekst">
            Je kunt je gegevens laten verwijderen. Wat de wet laat bewaren voor de boekhouding, blijft bewaard. Daarna kun
            je niet meer inloggen.
          </p>
          <p className="uitleg-voorbeeld">Voorbeeld: in het prototype wordt niets gewist.</p>
          <Hoofdknop onClick={() => setPagina(null)}>Begrepen</Hoofdknop>
        </Blad>
      )}
    </>
  )
}

function Link({ children, onClick, gedempt = false }: { children: ReactNode; onClick: () => void; gedempt?: boolean }) {
  return (
    <button type="button" className={gedempt ? 'gedempt' : undefined} onClick={onClick}>
      <span>{children}</span>
      <span aria-hidden style={{ fontSize: 24, color: 'var(--muted)' }}>↗</span>
    </button>
  )
}
