import { CalendarClock, Play, Trophy } from 'lucide-react'
import { Queen } from '@/components/chess/pieces'
import { PageHeader, Section, siteCard } from '@/components/site/section'
import { TournamentCard } from '@/components/landing/tournament-card'
import { cn } from '@/lib/utils'
import type { PublicTournament } from '@/lib/public-site'

const APARTADOS: Array<{
  status: string
  titulo: string
  icono: typeof Play
  vacio: string
}> = [
  { status: 'ACTIVO', titulo: 'En juego', icono: Play, vacio: 'Ningún torneo en juego ahora mismo.' },
  { status: 'BORRADOR', titulo: 'Por comenzar', icono: CalendarClock, vacio: 'Ningún torneo anunciado por ahora.' },
  { status: 'FINALIZADO', titulo: 'Realizados', icono: Trophy, vacio: 'Aún no hay torneos finalizados.' },
]

/** Todos los torneos, agrupados por estado. */
export function TournamentsIndex({ tournaments }: { tournaments: PublicTournament[] }) {
  return (
    <>
      <PageHeader
        icon={Queen}
        antetitulo="Torneos"
        titulo="Todos los torneos"
        descripcion="En juego, por comenzar y realizados. Entra en cualquiera para ver sus emparejamientos, su ranking y su clasificación."
        enlaces={[{ href: '/', label: 'Inicio' }]}
      />
      <Section>
        <div className="space-y-12">
          {tournaments.length === 0 && (
            <p
              className={cn(
                siteCard,
                'border-dashed p-8 text-center text-sm text-muted-foreground shadow-none',
              )}
            >
              Todavía no hay torneos. Cuando un árbitro cree uno, aparecerá
              aquí: primero «por comenzar», luego «en juego» y al terminar
              pasará a «realizados».
            </p>
          )}
          {APARTADOS.map(({ status, titulo, icono: Icono, vacio }) => {
            const lista = tournaments.filter((t) => t.status === status)
            return (
              <div key={status}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Icono className="size-5 text-muted-foreground" aria-hidden />
                  {titulo}
                  <span className="font-normal text-muted-foreground">({lista.length})</span>
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lista.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                      {vacio}
                    </p>
                  ) : (
                    lista.map((t) => <TournamentCard key={t.id} t={t} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </>
  )
}
