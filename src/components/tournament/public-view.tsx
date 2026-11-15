'use client'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoundsView } from '@/components/tournament/rounds-view'
import { PlayersView } from '@/components/tournament/players-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { HowItWorksCard } from '@/components/tournament/HowItWorksCard'
import { FaqCard } from '@/components/tournament/FaqCard'
import { WikiCard } from '@/components/tournament/WikiCard'
import { ChangelogCard } from '@/components/tournament/ChangelogCard'
import type { PublicTournamentData } from '@/lib/tournament'

const EMPTY_MSG =
  'Ahora mismo no hay ningún torneo publicado. Cuando el árbitro active un torneo, aquí aparecerá toda la información.'

function EmptyTab() {
  return (
    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {EMPTY_MSG}
    </p>
  )
}

export function PublicTournamentView({
  data,
}: {
  data: PublicTournamentData | null
}) {
  const { players, rounds, totalRounds, byePoints, name, arbitro, status } =
    data ?? {
      players: [],
      rounds: [],
      totalRounds: 0,
      byePoints: 1,
      name: '',
      arbitro: '',
      status: '',
    }

  return (
    <div className="space-y-4">
      {data ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/60 p-3">
          <span className="text-sm font-semibold">{name}</span>
          <Badge variant={status === 'ACTIVO' ? 'default' : 'secondary'}>
            {status === 'ACTIVO' ? 'En juego' : status === 'FINALIZADO' ? 'Finalizado' : 'Borrador'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Dirige {arbitro} · {totalRounds} rondas · bye{' '}
            {byePoints.toLocaleString('es-ES')} · {players.length} inscritos
          </span>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {EMPTY_MSG} La Wiki y el ChangeLog están siempre disponibles.
        </p>
      )}

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
          <TabsTrigger value="wiki">Wiki</TabsTrigger>
          <TabsTrigger value="changelog">ChangeLog</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="emparejamientos" className="space-y-4">
          {data ? (
            <>
              <RoundsView
                players={players}
                rounds={rounds}
                totalRounds={totalRounds}
                byePoints={byePoints}
              />
              <HowItWorksCard />
            </>
          ) : (
            <EmptyTab />
          )}
        </TabsContent>

        <TabsContent value="ranking">
          {data ? (
            <PlayersView players={players} rounds={rounds} byePoints={byePoints} />
          ) : (
            <EmptyTab />
          )}
        </TabsContent>

        <TabsContent value="clasificacion">
          {data ? (
            <StandingsView players={players} rounds={rounds} byePoints={byePoints} />
          ) : (
            <EmptyTab />
          )}
        </TabsContent>

        <TabsContent value="wiki">
          <WikiCard />
        </TabsContent>

        <TabsContent value="changelog">
          <ChangelogCard />
        </TabsContent>

        <TabsContent value="faq">
          <FaqCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
