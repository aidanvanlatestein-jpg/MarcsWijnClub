/** Een kleine foto van een fles: in lijsten, op de bon en in het beheer. Zonder foto een grijs vlak. */
export function Duim({ foto, breedte = 26, hoogte = 34, goud = false, wit = false }: { foto?: string; breedte?: number; hoogte?: number; goud?: boolean; wit?: boolean }) {
  const rand = goud ? ' goud' : wit ? ' wit' : ''
  return foto ? (
    <img className={`duim${rand}`} src={foto} alt="" width={breedte} height={hoogte} aria-hidden />
  ) : (
    <span className={`duim leeg${rand}`} style={{ width: breedte, height: hoogte }} aria-hidden />
  )
}
