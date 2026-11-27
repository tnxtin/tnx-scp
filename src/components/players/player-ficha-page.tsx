'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { King } from '@/components/chess/pieces'
import { buildPlayerDetail } from '@/lib/pairing/player-detail'
import { PlayerFicha } from '@/components/players/player-ficha'
import { actionLink, PageHeader, Section, siteCard } from '@/components/site/section'
import type { PublicTournament } from '@/lib/public-site'
import type { GeneratedRound, Player } from '@/lib/pairing/engine'

export function PlayerFichaPage({
  tournament,
  playerId,
  players,
  rounds,
  byePoints,
}: {
  tournament: PublicTournament
  playerId: string
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
}) {
  const detail = useMemo(
    () => buildPlayerDetail(players, rounds, byePoints, playerId),
    [players, rounds, byePoints, playerId],
  )

  return (
    <>
      <PageHeader
        icon={King}
        antetitulo="Ficha del jugador"
        titulo={detail?.player.name ?? 'Jugador'}
        descripcion={
          detail &&
          `${detail.player.club || 'Sin club'} · ${
            detail.myRow?.isVirtual ? 'Sin Elo publicado' : `Elo ${detail.player.elo}`
          } · ${tournament.name}`
        }
        enlaces={[
          { href: '/', label: 'Inicio' },
          { href: `/jugadores/${tournament.id}`, label: 'Jugadores' },
        ]}
      />

      <Section>
        <p className="mb-4 text-sm text-muted-foreground">
          <Link
            href={`/jugadores/${tournament.id}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            ← Volver al listado de jugadores
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link
            href={`/torneo/${tournament.id}`}
            className={actionLink}
          >
            Ver el torneo
          </Link>
        </p>
        {/* ancho de lectura: a todo el ancho la gráfica queda demasiado estirada */}
        <div className="max-w-3xl">
          {detail ? (
            <div className={siteCard}>
              <div className="grid gap-6 p-4 sm:p-6">
                <PlayerFicha detail={detail} byePoints={byePoints} />
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Este jugador ya no está en la lista del torneo.
            </p>
          )}
        </div>
      </Section>
    </>
  )
}
