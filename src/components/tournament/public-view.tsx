'use client'

import Link from 'next/link'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoundsView } from '@/components/tournament/rounds-view'
import { PlayersView } from '@/components/tournament/players-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { HowItWorksCard } from '@/components/tournament/HowItWorksCard'
import { FaqCard } from '@/components/tournament/FaqCard'
import { Rook } from '@/components/chess/pieces'
import {
  botonTransparente,
  PageContainer,
  PageHeader,
} from '@/components/site/section'
import { StatusBadge } from '@/components/site/status-badge'
import type { PublicTournamentData } from '@/lib/tournament'

/* ------------------------------------------------------------------ */
/* Página de un torneo concreto                                        */
/* ------------------------------------------------------------------ */

export function TournamentPublicView({
  data,
}: {
  data: PublicTournamentData | null
}) {
  if (!data) {
    return (
      <>
        <PageHeader
          icon={Rook}
          antetitulo="Torneo"
          titulo="Este torneo no existe o ya no está disponible"
          enlaces={[{ href: '/torneos', label: 'Todos los torneos' }]}
        />
        <PageContainer className="space-y-4 py-6">
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Puede que haya sido borrado o que el enlace no sea correcto. Vuelve
            a la{' '}
            <Link href="/torneos" className="underline">
              lista de torneos
            </Link>
            .
          </p>
          <FaqCard />
        </PageContainer>
      </>
    )
  }
  const { players, rounds, totalRounds, byePoints, name, arbitro, status, id } = data
  return (
    <>
      <PageHeader
        icon={Rook}
        antetitulo="Torneo"
        titulo={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {name}
            <StatusBadge status={status} onDark />
          </span>
        }
        descripcion={
          <>
            Dirige {arbitro} · {players.length} inscritos · {totalRounds} rondas
            · bye {byePoints.toLocaleString('es-ES')}
          </>
        }
        enlaces={[
          { href: '/', label: 'Inicio' },
          { href: '/torneos', label: 'Torneos' },
        ]}
        accion={
          <Button asChild variant="outline" className={botonTransparente}>
            <Link href={`/jugadores/${id}`}>
              <UsersRound className="size-4" aria-hidden />
              Jugadores
            </Link>
          </Button>
        }
      />

      <PageContainer className="py-6">
        <Tabs defaultValue="emparejamientos" className="gap-4">
          <TabsList className="flex h-9 w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="emparejamientos">Emparejamientos</TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5">
              Ranking inicial
              {players.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1 text-[10px] tabular-nums"
                >
                  {players.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clasificacion">Clasificación</TabsTrigger>
          </TabsList>

          <TabsContent value="emparejamientos" className="space-y-4">
            <RoundsView
              players={players}
              rounds={rounds}
              totalRounds={totalRounds}
              byePoints={byePoints}
            />
            <HowItWorksCard />
          </TabsContent>

          <TabsContent value="ranking">
            <PlayersView players={players} rounds={rounds} byePoints={byePoints} />
          </TabsContent>

          <TabsContent value="clasificacion">
            <StandingsView players={players} rounds={rounds} byePoints={byePoints} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}
