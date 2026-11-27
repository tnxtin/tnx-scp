'use client'

import Link from 'next/link'
import { ArrowRight, UserRound } from 'lucide-react'
import { Pawn } from '@/components/chess/pieces'
import { PlayersTable } from '@/components/players/players-table'
import { actionLink, PageHeader, Section, siteCard } from '@/components/site/section'
import { StatusBadge, statusDot } from '@/components/site/status-badge'
import { cn } from '@/lib/utils'
import type { PlayersPageData } from '@/lib/public-site'

export function PlayersPage({
  tournament,
  otros,
  rows,
  started,
  unrated,
}: PlayersPageData) {
  if (!tournament) {
    return (
      <>
        <PageHeader
          icon={Pawn}
          antetitulo="Jugadores"
          titulo="Lista de jugadores"
          descripcion="Todavía no hay torneos con jugadores. En cuanto un árbitro dé de alta uno, su lista aparecerá aquí."
          enlaces={[{ href: '/', label: 'Inicio' }]}
        />
        <Section>
          <Link href="/torneos" className={actionLink}>
            Ver los torneos <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        icon={Pawn}
        antetitulo="Jugadores"
        titulo={tournament.name}
        descripcion={
          <>
            Dirige {tournament.arbitro} · {tournament.playerCount} jugadores ·{' '}
            {tournament.roundsPlayed}/{tournament.totalRounds} rondas · bye{' '}
            {tournament.byePoints.toLocaleString('es-ES')}
          </>
        }
        enlaces={[
          { href: '/', label: 'Inicio' },
          { href: `/torneo/${tournament.id}`, label: 'Torneo' },
        ]}
      />

      <Section>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <StatusBadge status={tournament.status} />
          <span>Pulsa un nombre para abrir la ficha del jugador.</span>
          {unrated > 0 && <span>{unrated} sin Elo (Elo virtual ~).</span>}
        </div>

        <div className={cn(siteCard, 'p-4 sm:p-6')}>
          <PlayersTable
            rows={rows}
            tournamentId={tournament.id}
            started={started}
          />
        </div>

        {otros.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 inline-flex items-center gap-1.5 text-muted-foreground">
              <UserRound className="size-4" aria-hidden />
              Jugadores de otro torneo:
            </span>
            {otros.map((o) => (
              <Link
                key={o.id}
                href={`/jugadores/${o.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-stone-400 hover:bg-stone-100 dark:border-stone-800 dark:hover:bg-stone-900"
              >
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', statusDot(o.status))}
                />
                {o.name}
                <span className="tabular-nums text-muted-foreground">
                  {o.playerCount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
