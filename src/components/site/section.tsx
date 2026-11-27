import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Icono = ComponentType<{ className?: string }>

/** Ancho de lectura común a la portada y a las páginas públicas. */
export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>
      {children}
    </div>
  )
}

/**
 * Contenedor de las páginas de panel (árbitro, administrador, auxiliar,
 * acceso y torneo): es el marco estrecho que antes ponía el <main>.
 */
export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('mx-auto w-full max-w-6xl p-4', className)}>{children}</div>
}

/** Tarjeta común de la web pública. */
export const siteCard =
  'rounded-xl border border-stone-200 bg-card shadow-sm dark:border-stone-800'

/** Enlace de acción de las secciones. */
export const actionLink =
  'inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:text-amber-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500'

/** Botones sobre fondo oscuro (cabeceras y cierre de la portada). */
export const botonDorado = 'bg-amber-300 text-stone-950 hover:bg-amber-200'
export const botonTransparente =
  'border-stone-700 bg-transparent text-stone-100 hover:bg-stone-900 hover:text-stone-50'

/** Antetítulo con pieza: la marca común de todas las secciones. */
export function Eyebrow({
  icon: Icono,
  tono = 'claro',
  className,
  children,
}: {
  icon?: Icono
  tono?: 'claro' | 'oscuro'
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.18em]',
        tono === 'oscuro' ? 'text-amber-300' : 'text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      {Icono && <Icono className="size-5" aria-hidden />}
      {children}
    </p>
  )
}

type Tono = 'llano' | 'suave'

/** Banda de sección: mismo ritmo vertical y mismo ancho en toda la web pública. */
export function Section({
  id,
  tono = 'llano',
  className,
  children,
}: {
  id?: string
  tono?: Tono
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-6 py-12 sm:py-16',
        // fondo fijo por banda: el degradado general no debe difuminar el alternado
        tono === 'suave' ? 'bg-stone-100 dark:bg-stone-900/40' : 'bg-background',
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  )
}

/** Cabecera de sección: pieza + antetítulo, título, descripción y acción opcional. */
export function SectionHeading({
  icon: Icono,
  antetitulo,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icon: Icono
  antetitulo: string
  titulo: string
  descripcion?: ReactNode
  accion?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        <Eyebrow icon={Icono}>{antetitulo}</Eyebrow>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-3 text-base leading-7 text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}

/** Cabecera de las páginas públicas: banda oscura con damero y pieza de marca de agua. */
export function PageHeader({
  icon: Icono,
  antetitulo,
  titulo,
  descripcion,
  enlaces,
  accion,
}: {
  icon: Icono
  antetitulo: string
  titulo: ReactNode
  descripcion?: ReactNode
  /** migas de pan, de la general a la concreta */
  enlaces?: Array<{ href: string; label: string }>
  accion?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden border-b border-stone-800 bg-stone-950 text-stone-100">
      <div
        aria-hidden
        className="chess-board pointer-events-none absolute inset-0 [--board-dark:oklch(1_0_0/5%)] [--board-tile:2.5rem]"
      />
      <Icono
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-6 h-56 text-stone-100/[0.06] sm:h-72"
      />
      <Container className="relative py-10 sm:py-14">
        {enlaces && enlaces.length > 0 && (
          <nav
            aria-label="Migas de pan"
            className="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-400"
          >
            {enlaces.map((e, i) => (
              <span key={e.href} className="inline-flex items-center gap-2">
                {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
                <Link
                  href={e.href}
                  className="underline-offset-4 hover:text-stone-100 hover:underline"
                >
                  {e.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <Eyebrow tono="oscuro">{antetitulo}</Eyebrow>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{titulo}</h1>
            {descripcion && (
              <p className="mt-3 max-w-3xl text-base leading-7 text-stone-400">{descripcion}</p>
            )}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
      </Container>
    </header>
  )
}
