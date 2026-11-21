// Schakelaars voor wat gebouwd is maar nog niet aan mag in productie. Elke schakelaar staat op één plek
// en staat standaard uit.

/**
 * Licht tot vol (onderwerp 16 op de roadmap, stap A): de rij Licht tot vol op het nakijkscherm van een
 * nieuwe fles. Staat uit tot Marc ermee instemt; alleen aan in een build met VITE_KENMERKEN=aan.
 * Leden hebben geen schakelaar nodig: een wijn zonder volheid toont alleen kleur en land.
 */
export const KENMERKEN = import.meta.env.VITE_KENMERKEN === 'aan'
