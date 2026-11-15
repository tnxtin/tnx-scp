'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoundsView } from '@/components/tournament/rounds-view'
import { PlayersView } from '@/components/tournament/players-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { HowItWorksCard } from '@/components/tournament/HowItWorksCard'
import { FaqCard } from '@/components/tournament/FaqCard'
import { WikiCard } from '@/components/tournament/WikiCard'
import { ChangelogCard } from '@/components/tournament/ChangelogCard'
import {
  CalendarClock,
  Play,
  Trophy,
} from 'lucide-react'
import type {
  PublicTournamentData,
  PublicTournamentSummary,
} from '@/lib/tournament'

/* ------------------------------------------------------------------ */
/* Frontal: lista de torneos en tres apartados + documentación         */
/* ------------------------------------------------------------------ */

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  BORRADOR: 'secondary',
  FINALIZADO: 'outline',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVO: 'En juego',
  BORRADOR: 'Por comenzar',
  FINALIZADO: 'Realizado',
}

const SECCIONES: Array<{
  status: string
  titulo: string
  icono: typeof Play
  vacio: string
}> = [
  { status: 'ACTIVO', titulo: 'En juego', icono: Play, vacio: 'Ningún torneo en juego ahora mismo.' },
  { status: 'BORRADOR', titulo: 'Por comenzar', icono: CalendarClock, vacio: 'Ningún torneo anunciado por ahora.' },
  { status: 'FINALIZADO', titulo: 'Realizados', icono: Trophy, vacio: 'Aún no hay torneos finalizados.' },
]

function TorneoCard({ t }: { t: PublicTournamentSummary }) {
  return (
    <Link
      href={`/torneo/${t.id}`}
      className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold hover:underline">{t.name}</span>
        <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>
          {STATUS_LABEL[t.status] ?? t.status}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Dirige {t.arbitro} · {t.playerCount} inscritos · {t.roundsPlayed}/
        {t.totalRounds} rondas · bye {t.byePoints.toLocaleString('es-ES')}
      </p>
    </Link>
  )
}

export function HomePublicView({
  tournaments,
}: {
  tournaments: PublicTournamentSummary[]
}) {
  const hayTorneos = tournaments.length > 0
  return (
    <div className="space-y-4">
      <Tabs defaultValue="torneos" className="gap-4">
        <TabsList className="flex h-9 w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="torneos" className="gap-1.5">
            Torneos
            {hayTorneos && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1 text-[10px] tabular-nums"
              >
                {tournaments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="wiki">Wiki</TabsTrigger>
          <TabsTrigger value="changelog">ChangeLog</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="torneos" className="space-y-5">
          {!hayTorneos && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no hay torneos. Cuando un árbitro cree uno, aparecerá
              aquí: primero «por comenzar», luego «en juego» y al terminar
              pasará a «realizados».
            </p>
          )}
          {SECCIONES.map(({ status, titulo, icono: Icono, vacio }) => {
            const lista = tournaments.filter((t) => t.status === status)
            return (
              <section key={status} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Icono className="size-4 text-muted-foreground" aria-hidden />
                  {titulo}
                  <span className="font-normal text-muted-foreground">
                    ({lista.length})
                  </span>
                </h2>
                {lista.length === 0 ? (
                  <p className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground">
                    {vacio}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lista.map((t) => (
                      <TorneoCard key={t.id} t={t} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
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
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Este torneo no existe o ya no está disponible. Vuelve a la{' '}
          <Link href="/" className="underline">
            lista de torneos
          </Link>
          .
        </p>
        <FaqCard />
      </div>
    )
  }
  const { players, rounds, totalRounds, byePoints, name, arbitro, status } = data
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/60 p-3">
        <span className="text-sm font-semibold">{name}</span>
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Dirige {arbitro} · {totalRounds} rondas · bye{' '}
          {byePoints.toLocaleString('es-ES')} · {players.length} inscritos
        </span>
        <Link href="/" className="ml-auto text-xs underline">
          ← Todos los torneos
        </Link>
      </div>

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
    </div>
  )
}
