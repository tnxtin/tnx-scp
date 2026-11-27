'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Knight, Pawn, Queen, Rook } from '@/components/chess/pieces'
import {
  Container,
  Eyebrow,
  botonDorado,
  botonTransparente,
} from '@/components/site/section'
import { cn } from '@/lib/utils'
import type { PublicTournament } from '@/lib/public-site'

/**
 * Aloja una pieza sobre el borde inferior del tablero. La pieza mide un
 * 112,28 % del hueco y se centra: así el hueco que deja la peana en el lienzo
 * (de y=57 a y=64) queda recortado y la pieza parece clavada en el borde.
 */
function Alzada({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'relative aspect-square shrink-0 overflow-hidden [&>svg]:absolute [&>svg]:top-0 [&>svg]:left-1/2 [&>svg]:w-[112.28%] [&>svg]:-translate-x-1/2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function HeroPieces() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5 shadow-2xl shadow-black/50 sm:p-6"
    >
      <div className="chess-board rounded-xl px-3 pt-8 sm:px-5 sm:pt-12 [--board-dark:oklch(1_0_0/6%)] [--board-tile:2.5rem]">
        <div className="flex items-end justify-center gap-3 sm:gap-4">
          <Alzada className="w-[14%]">
            <Pawn className="text-amber-300 drop-shadow-[0_10px_8px_rgb(0_0_0/0.45)]" />
          </Alzada>
          <Alzada className="w-[20%]">
            <Rook className="text-stone-300/80 drop-shadow-[0_10px_8px_rgb(0_0_0/0.45)]" />
          </Alzada>
          <Alzada className="w-[25%]">
            <Knight className="text-stone-100/90 drop-shadow-[0_10px_8px_rgb(0_0_0/0.45)]" />
          </Alzada>
          <Alzada className="w-[31%]">
            <Queen className="text-stone-50 drop-shadow-[0_10px_8px_rgb(0_0_0/0.45)]" />
          </Alzada>
        </div>
      </div>
    </div>
  )
}

/** Cabecera de la portada: damero oscuro, piezas y acceso directo a torneos y jugadores. */
export function LandingHero({ featured }: { featured: PublicTournament | null }) {
  const enJuego = featured?.status === 'ACTIVO' ? featured : null

  return (
    <section className="relative overflow-hidden bg-stone-950 text-stone-100">
      <div
        aria-hidden
        className="chess-board pointer-events-none absolute inset-0 [--board-dark:oklch(1_0_0/4%)] [--board-tile:3.5rem]"
      />
      <Knight
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-[26rem] text-stone-100/[0.04]"
      />

      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24">
        <div>
          <Eyebrow
            icon={Rook}
            tono="oscuro"
            className="rounded-full border border-stone-800 bg-stone-900/80 px-3 py-1 text-[11px] tracking-[0.12em] sm:text-xs sm:tracking-[0.18em]"
          >
            Grupos progresivos · Elo virtual
          </Eyebrow>
          <h1 className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Rivales a tu nivel, <span className="text-amber-300">ronda a ronda</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-stone-400 sm:text-lg sm:leading-8">
            Tnx · Social Chess Pairing empareja el torneo de tu club por grupos
            progresivos: cada jugador se mide a rivales de su fuerza y los grupos
            se van fusionando hasta la final. Con Elo virtual para quienes
            todavía no tienen rating.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className={botonDorado}>
              <Link href="#torneos">
                Ver los torneos <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className={botonTransparente}>
              <Link href="/jugadores">
                <UsersRound className="size-4" aria-hidden /> Listado de jugadores
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-stone-400">
            Software libre (GPL-3.0-or-later) · Consulta pública, sin cuenta ·
            Para clubes, escuelas y centros sociales
          </p>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <HeroPieces />
          {enJuego && (
            <Link
              href={`/torneo/${enJuego.id}`}
              className="relative -mt-4 flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-900 px-4 py-3 text-sm shadow-xl shadow-black/40 transition-colors hover:border-stone-600"
            >
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-emerald-400"
              />
              <span>
                <span className="block font-semibold text-stone-100">
                  En juego ahora: {enJuego.name}
                </span>
                <span className="block text-xs text-stone-400">
                  Ronda {enJuego.roundsPlayed} de {enJuego.totalRounds} ·{' '}
                  {enJuego.playerCount} jugadores
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-stone-400" aria-hidden />
            </Link>
          )}
        </div>
      </Container>
    </section>
  )
}

/** Friso de damero que separa la cabecera del resto de la portada. */
export function BoardFriso() {
  return (
    <div
      aria-hidden
      className="chess-board h-2 [--board-dark:oklch(0.876_0.169_70.226)] [--board-tile:0.25rem]"
    />
  )
}
