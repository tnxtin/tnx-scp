'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Bishop, King, Knight, Pawn, Queen, Rook } from '@/components/chess/pieces'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  actionLink,
  botonDorado,
  botonTransparente,
  Container,
  Eyebrow,
  Section,
  SectionHeading,
  siteCard,
} from '@/components/site/section'
import { StatusBadge } from '@/components/site/status-badge'
import { BoardFriso, LandingHero } from '@/components/landing/hero'
import { FeaturedTournament, TournamentCard } from '@/components/landing/tournament-card'
import { PlayersTable } from '@/components/players/players-table'
import { FAQS } from '@/components/tournament/FaqCard'
import { cn } from '@/lib/utils'
import type { LandingData } from '@/lib/public-site'

/** Cuántos torneos más (aparte del destacado) salen en la portada. */
const TORNEOS_EN_PORTADA = 6

/** Las tres ideas del sistema, cada una con su pieza. */
const IDEAS = [
  {
    Icono: Rook,
    titulo: 'Rivales a tu nivel',
    texto: 'En la ronda 1 la tabla ordenada por Elo se corta en tantas bandas como rondas. Dentro de cada banda solo se cruzan jugadores parecidos: se acaban las palizas.',
  },
  {
    Icono: Knight,
    titulo: 'Grupos que se fusionan',
    texto: 'Cada ronda los grupos se reconstruyen con los puntos y son cada vez menos, hasta un único grupo en la final. Todos compiten hacia el rival más cercano a su nivel.',
  },
  {
    Icono: Bishop,
    titulo: 'Elo virtual para los sin rating',
    texto: '¿Sin Elo publicado? Entran con un Elo virtual (~) calculado por media exponencial en la mitad de la tabla y recalculado en cada ronda.',
  },
] as const

function AvisoVacio({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        siteCard,
        'border-dashed p-8 text-center text-sm text-muted-foreground shadow-none',
      )}
    >
      {children}
    </p>
  )
}

function Dato({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-mono text-2xl font-semibold tabular-nums text-foreground">
        {valor}
      </dd>
    </div>
  )
}

export function LandingPage({
  tournaments,
  featured,
  topPlayers,
  unrated,
}: LandingData) {
  const demas = tournaments.filter((t) => t.id !== featured?.id)
  const visibles = demas.slice(0, TORNEOS_EN_PORTADA)

  return (
    <>
      <LandingHero featured={featured} />
      <BoardFriso />

      {/* Torneos */}
      <Section id="torneos">
        <SectionHeading
          icon={Queen}
          antetitulo="Torneos"
          titulo="Los últimos torneos"
          descripcion="Emparejamientos por grupos, ranking y clasificación de cada torneo, al momento y sin cuenta."
          accion={
            <Link href="/torneos" className={actionLink}>
              Ver todos los torneos <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-8 space-y-4">
          {tournaments.length === 0 && (
            <AvisoVacio>
              Todavía no hay torneos. Cuando un árbitro cree uno, aparecerá
              aquí: primero «por comenzar», luego «en juego» y al terminar
              pasará a «realizado».
            </AvisoVacio>
          )}
          {featured && <FeaturedTournament t={featured} />}
          {visibles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((t) => (
                <TournamentCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Jugadores */}
      <Section id="jugadores" tono="suave">
        <SectionHeading
          icon={Pawn}
          antetitulo="Jugadores"
          titulo="Lista de jugadores"
          descripcion="Pulsa un nombre para abrir su ficha: posición, puntos, evolución y detalle ronda a ronda."
          accion={
            featured && (
              <Link href={`/jugadores/${featured.id}`} className={actionLink}>
                Ver el listado completo <ArrowRight className="size-4" aria-hidden />
              </Link>
            )
          }
        />
        {/* min-w-0: sin ello la tabla ensancha la columna en móvil y la página se desborda */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={cn(siteCard, 'min-w-0 p-4 sm:p-6')}>
            {featured && topPlayers.length > 0 ? (
              <PlayersTable
                rows={topPlayers}
                tournamentId={featured.id}
                started={featured.roundsPlayed > 0}
                limit={6}
              />
            ) : (
              <AvisoVacio>
                Todavía no hay jugadores. En cuanto un árbitro inscriba a los
                primeros, su lista y sus fichas aparecerán aquí.
              </AvisoVacio>
            )}
          </div>
          {featured && (
            <aside className={cn(siteCard, 'flex min-w-0 flex-col gap-4 p-5')}>
              <Eyebrow icon={King}>Torneo de la lista</Eyebrow>
              <p className="text-lg leading-snug font-semibold text-foreground">
                <Link
                  href={`/torneo/${featured.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {featured.name}
                </Link>
              </p>
              <StatusBadge status={featured.status} />
              <dl className="flex flex-wrap gap-x-6 gap-y-3">
                <Dato valor={featured.playerCount} etiqueta="jugadores" />
                <Dato
                  valor={`${featured.roundsPlayed}/${featured.totalRounds}`}
                  etiqueta="rondas"
                />
                <Dato valor={unrated} etiqueta="sin Elo (~)" />
              </dl>
              <p className="text-sm leading-6 text-muted-foreground">
                Estos son los seis primeros. El listado completo lleva a la
                ficha de cada jugador de este torneo.
              </p>
              <Button asChild variant="outline" className="mt-auto">
                <Link href={`/jugadores/${featured.id}`}>
                  Ver el listado completo
                </Link>
              </Button>
            </aside>
          )}
        </div>
      </Section>

      {/* Cómo funciona */}
      <Section id="como-funciona">
        <SectionHeading
          icon={Knight}
          antetitulo="Cómo funciona"
          titulo="Un suizo con grupos progresivos"
          descripcion="Nadie se enfrenta a un rival muy lejos de su fuerza y los que aún no tienen rating también tienen su sitio."
          accion={
            <Link href="/wiki" className={actionLink}>
              Ver el detalle en la Wiki <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {IDEAS.map(({ Icono, titulo, texto }) => (
            <article key={titulo} className={cn(siteCard, 'flex flex-col p-6')}>
              <div className="flex size-12 items-center justify-center rounded-lg bg-stone-950 text-amber-300">
                <Icono className="size-8" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{texto}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" tono="suave">
        <SectionHeading
          icon={Bishop}
          antetitulo="FAQ"
          titulo="Preguntas frecuentes"
          descripcion="Dudas habituales sobre los grupos, los descansos, el Elo virtual y el funcionamiento del sistema."
        />
        <div className={cn(siteCard, 'mt-8 max-w-4xl px-4 py-2 sm:px-6')}>
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {f.a.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Cierre */}
      <section className="relative overflow-hidden bg-stone-950 py-16 text-stone-100 sm:py-20">
        <div
          aria-hidden
          className="chess-board pointer-events-none absolute inset-0 [--board-dark:oklch(1_0_0/4%)] [--board-tile:2.5rem]"
        />
        <King
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-16 h-72 text-stone-100/[0.05]"
        />
        <Container className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Eyebrow tono="oscuro">Arbitraje</Eyebrow>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              ¿Organizas un torneo en tu club?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-400">
              Árbitros y auxiliares crean el torneo, generan las rondas y publican
              los resultados desde su panel. Los jugadores lo consultan aquí, sin
              cuenta.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className={botonDorado}>
              <Link href="/login">Acceso arbitraje</Link>
            </Button>
            <Button asChild variant="outline" className={botonTransparente}>
              <Link href="/wiki">Leer la Wiki</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}
