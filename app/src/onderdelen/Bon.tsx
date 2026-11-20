// De bon op het bestelscherm en de regels die ook elders terugkomen. Zie design-v4/DESIGN.md, "Bon".
import type { ReactNode } from 'react'
import { bedrag, kortJaar } from '../opmaak'
import { Duim } from './Foto'
import { GrootBedrag, Stippellijn } from './Knoppen'

export interface BonRegel {
  sleutel: string
  aantal: number
  naam: string
  foto?: string
  jaargang?: number
  prijs: number
  /** Doorgestreept: deze wijn is net op. */
  weg?: boolean
}

export function regelNaam(r: Pick<BonRegel, 'naam' | 'jaargang'>): string {
  return r.jaargang ? `${r.naam} ${kortJaar(r.jaargang)}` : r.naam
}

/** Met fotos: zoals op het scherm Betaald. */
export function BonRegels({ regels, fotos = false }: { regels: BonRegel[]; fotos?: boolean }) {
  return (
    <ul className={fotos ? 'bon-regels met-foto' : 'bon-regels'} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {regels.map((r) => (
        <li key={r.sleutel} className={r.weg ? 'bon-regel weg' : 'bon-regel'}>
          {fotos && <Duim foto={r.foto} breedte={28} hoogte={36} />}
          <span className="aantal">{r.aantal}×</span>
          <span className="naam">{regelNaam(r)}</span>
          <span className="som">{bedrag(r.aantal * r.prijs)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Wit papier, licht gedraaid, met een gekartelde rand onderaan. */
export function Bon({ kop, tafel, regels, voet }: { kop: string; tafel: string; regels: BonRegel[]; voet: ReactNode }) {
  const totaal = regels.filter((r) => !r.weg).reduce((som, r) => som + r.aantal * r.prijs, 0)
  return (
    <div className="bon-houder">
      <div className="bon">
        <div className="bon-kop">
          <div>
            <p className="bon-titel">BON</p>
            <p className="bon-sub">{kop}</p>
          </div>
          <p className="bon-tafel">
            <span>TAFEL</span>
            <strong>{tafel}</strong>
          </p>
        </div>
        <Stippellijn zwart />
        <BonRegels regels={regels} />
        <Stippellijn zwart />
        <div className="bon-totaal-rij">
          <span>TOTAAL</span>
          <GrootBedrag centen={totaal} />
        </div>
        <Stippellijn zwart />
        <p className="bon-voet">{voet}</p>
      </div>
    </div>
  )
}
