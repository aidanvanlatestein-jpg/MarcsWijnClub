// De bon op het bestelscherm en de regels die ook elders terugkomen. Zie design-v2/DESIGN.md, "Bon".
import type { ReactNode } from 'react'
import { bedrag, kortJaar } from '../opmaak'
import { GrootBedrag, Stippellijn } from './Knoppen'

export interface BonRegel {
  sleutel: string
  aantal: number
  /** Leeg bij een fles uit een bieding. */
  letter: string
  naam: string
  jaargang?: number
  prijs: number
  /** Doorgestreept: deze wijn is net op. */
  weg?: boolean
}

export function regelNaam(r: Pick<BonRegel, 'letter' | 'naam' | 'jaargang'>): string {
  const naam = r.jaargang ? `${r.naam} ${kortJaar(r.jaargang)}` : r.naam
  return r.letter ? `${r.letter} · ${naam}` : naam
}

export function BonRegels({ regels }: { regels: BonRegel[] }) {
  return (
    <ul className="bon-regels" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {regels.map((r) => (
        <li key={r.sleutel} className={r.weg ? 'bon-regel weg' : 'bon-regel'}>
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
