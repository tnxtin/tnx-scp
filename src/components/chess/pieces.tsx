import type { SVGProps } from 'react'

/**
 * Piezas de ajedrez en silueta para los motivos de la web pública.
 *
 * Todas comparten lienzo 64×64 con la base apoyada en y=57 y se pintan con
 * `currentColor`, así que el color lo decide la clase de texto que las envuelve.
 * Al ser SVG propias no dependen de la fuente del sistema (los glifos ♞ ♛…
 * cambian de forma o salen como emoji según el equipo).
 */

type PieceProps = SVGProps<SVGSVGElement>

function Piece({ children, ...props }: PieceProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden {...props}>
      {children}
    </svg>
  )
}

/** Peana común a todas las piezas. */
const Base = <rect x="15" y="49" width="34" height="8" rx="3" />

export function Pawn(props: PieceProps) {
  return (
    <Piece {...props}>
      <circle cx="32" cy="14.5" r="7.5" />
      <ellipse cx="32" cy="25" rx="9.5" ry="3.2" />
      <path d="M27.5 26.5h9L41.5 50h-19z" />
      {Base}
    </Piece>
  )
}

export function Rook(props: PieceProps) {
  return (
    <Piece {...props}>
      <path d="M17.5 10h7v5h5v-5h5v5h5v-5h7v12h-29z" />
      <path d="M17.5 21.5h29v3.5h-29z" />
      <path d="M21 24.5h22l2.5 25h-27z" />
      {Base}
    </Piece>
  )
}

export function Knight(props: PieceProps) {
  return (
    <Piece {...props}>
      <path
        fillRule="evenodd"
        d="M21 49c.5-5-.5-8.5-2.5-11.5-1.5-2-3-3.5-3.5-5.5-2.5-.5-3.5-2.5-2.5-4.5-1.5-1-2-3-.5-4.5 2-2 5.5-3.5 9-5L26.5 13.5 30 6l3.5 7c7.5 3 12.5 11 13 20 .5 5.5.5 11 .5 16zm1.5-24.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z"
      />
      {Base}
    </Piece>
  )
}

export function Bishop(props: PieceProps) {
  return (
    <Piece {...props}>
      <circle cx="32" cy="8.5" r="3.5" />
      <path
        fillRule="evenodd"
        d="M32 11.5c6.5 5.5 10.5 12 10 18-.5 5.5-5 9-10 9s-9.5-3.5-10-9c-.5-6 3.5-12.5 10-18zm-1 7.5l8 10-2.2 1.8-8-10z"
      />
      <ellipse cx="32" cy="39" rx="10" ry="3.2" />
      <path d="M27.5 41h9L41 50H23z" />
      {Base}
    </Piece>
  )
}

export function Queen(props: PieceProps) {
  return (
    <Piece {...props}>
      <circle cx="17" cy="15" r="3.2" />
      <circle cx="24.5" cy="10" r="3.2" />
      <circle cx="32" cy="7.5" r="3.2" />
      <circle cx="39.5" cy="10" r="3.2" />
      <circle cx="47" cy="15" r="3.2" />
      <path d="M17 17.5l4.4 5 3.1-9.5 3.8 7.5L32 10.5l3.7 10 3.8-7.5 3.1 9.5 4.4-5-2.5 16h-25z" />
      <ellipse cx="32" cy="34" rx="11" ry="3.2" />
      <path d="M26 36.5h12L42.5 50h-21z" />
      {Base}
    </Piece>
  )
}

export function King(props: PieceProps) {
  return (
    <Piece {...props}>
      <path d="M30 3.5h4V8h4.5v4H34v4.5h-4V12h-4.5V8H30z" />
      <path d="M23 16h18a3 3 0 0 1 3 3.3L42.5 33h-21L20 19.3A3 3 0 0 1 23 16z" />
      <ellipse cx="32" cy="34" rx="11" ry="3.2" />
      <path d="M26 36.5h12L42.5 50h-21z" />
      {Base}
    </Piece>
  )
}
