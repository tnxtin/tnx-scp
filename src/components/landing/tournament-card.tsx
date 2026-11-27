import Link from 'next/link'
import { ArrowRight, CalendarDays, Layers, UsersRound } from 'lucide-react'
import { Queen } from '@/components/chess/pieces'
import { buttonVariants } from '@/components/ui/button'
import {
  actionLink,
  botonDorado,
  botonTransparente,
  siteCard,
} from '@/components/site/section'
import { StatusBadge } from '@/components/site/status-badge'
import { cn } from '@/lib/utils'
import type { PublicTournament } from '@/lib/public-site'

const progreso = (t: PublicTournament) =>
  Math.round((t.roundsPlayed / Math.max(t.totalRounds, 1)) * 100)

/** Barra de rondas jugadas; con `clara` para fondos oscuros. */
function Progreso({
  t,
  clara = false,
}: {
  t: PublicTournament
  clara?: boolean
}) {
  return (
    <div
      role="progressbar"
      aria-label="Rondas jugadas"
      aria-valuemin={0}
      aria-valuemax={t.totalRounds}
      aria-valuenow={t.roundsPlayed}
      className={cn(
        'h-1.5 overflow-hidden rounded-full',
        clara ? 'bg-stone-800' : 'bg-stone-200 dark:bg-stone-800',
      )}
    >
      <div
        className="h-full rounded-full bg-amber-400"
        style={{ width: `${progreso(t)}%` }}
      />
    </div>
  )
}

/** Tarjeta de un torneo en las rejillas. El título enlaza a toda la tarjeta. */
export function TournamentCard({ t }: { t: PublicTournament }) {
  return (
    <article
      className={cn(
        siteCard,
        'group relative flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:hover:border-stone-700',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={t.status} />
        {t.fecha && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {t.fecha}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-lg leading-snug font-semibold text-foreground">
        <Link
          href={`/torneo/${t.id}`}
          className="underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
        >
          {t.name}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Dirige {t.arbitro}</p>

      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound className="size-4 text-muted-foreground" aria-hidden />
          {t.playerCount} jugadores
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Layers className="size-4 text-muted-foreground" aria-hidden />
          {t.roundsPlayed}/{t.totalRounds} rondas
        </span>
      </p>
      <div className="mt-3">
        <Progreso t={t} />
      </div>

      {/* suben por encima del título estirado para seguir siendo clicables */}
      <div className="relative z-10 mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5 text-sm">
        <Link href={`/torneo/${t.id}`} className={actionLink}>
          Ver torneo <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link href={`/jugadores/${t.id}`} className={actionLink}>
          Jugadores
        </Link>
      </div>
    </article>
  )
}

function Dato({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-0.5 font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
        {etiqueta}
      </dt>
      <dd className="font-mono text-3xl font-semibold tabular-nums text-stone-50">
        {valor}
      </dd>
    </div>
  )
}

/** Tarjeta grande del torneo que encabeza la portada. */
export function FeaturedTournament({ t }: { t: PublicTournament }) {
  const completo = t.roundsPlayed >= t.totalRounds
  const avance = completo
    ? 'Torneo completado'
    : t.roundsPlayed === 0
      ? 'Sin rondas jugadas'
      : `Ronda ${t.roundsPlayed} de ${t.totalRounds}`

  return (
    <article className="relative overflow-hidden rounded-2xl bg-stone-950 text-stone-100 shadow-xl shadow-stone-950/15">
      <div
        aria-hidden
        className="chess-board pointer-events-none absolute inset-0 [--board-dark:oklch(1_0_0/4%)] [--board-tile:2.5rem]"
      />
      <Queen
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-8 h-60 text-stone-100/[0.06] sm:h-72"
      />

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <StatusBadge status={t.status} onDark />
          <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            <Link
              href={`/torneo/${t.id}`}
              className="underline-offset-4 hover:underline"
            >
              {t.name}
            </Link>
          </h3>
          <p className="mt-2 text-sm text-stone-400">
            Dirige {t.arbitro}
            {t.fecha && <> · Actualizado el {t.fecha}</>}
          </p>
        </div>
        <dl className="flex items-center gap-8 sm:gap-10">
          <Dato valor={t.playerCount} etiqueta="jugadores" />
          <Dato valor={`${t.roundsPlayed}/${t.totalRounds}`} etiqueta="rondas" />
        </dl>
      </div>

      <div className="relative grid gap-5 px-6 pb-6 sm:px-8 sm:pb-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Progreso t={t} clara />
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
            {avance}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/torneo/${t.id}`}
            className={cn(buttonVariants({ size: 'lg' }), botonDorado)}
          >
            Ver torneo <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/jugadores/${t.id}`}
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), botonTransparente)}
          >
            <UsersRound className="size-4" aria-hidden /> Jugadores
          </Link>
        </div>
      </div>
    </article>
  )
}
