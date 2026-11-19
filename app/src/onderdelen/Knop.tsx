import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  soort?: 'hoofd' | 'grijs'
}

/** Hoofdknop (wit) en Knop grijs uit het ontwerp. */
export function Knop({ soort = 'hoofd', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`knop knop-${soort} ${className}`.trim()} {...rest} />
}
