import { cn } from '@/lib/utils'

/** Estado de un torneo, con la misma etiqueta en toda la web pública. */
const STATUS: Record<string, { label: string; punto: string; chip: string }> = {
  ACTIVO: {
    label: 'En juego',
    punto: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  BORRADOR: {
    label: 'Por comenzar',
    punto: 'bg-stone-400',
    chip: 'border-stone-200 bg-stone-100 text-stone-700',
  },
  FINALIZADO: {
    label: 'Realizado',
    punto: 'bg-stone-700',
    chip: 'border-stone-300 bg-card text-stone-600',
  },
}

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status
}

/** Color del punto de estado, para chips y listas hechas a medida. */
export function statusDot(status: string): string {
  return STATUS[status]?.punto ?? 'bg-stone-400'
}

/**
 * Etiqueta de estado de un torneo.
 * `onDark` la adapta a las bandas oscuras de la web pública.
 */
export function StatusBadge({
  status,
  onDark = false,
  className,
}: {
  status: string
  onDark?: boolean
  className?: string
}) {
  const s = STATUS[status]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        onDark ? 'border-stone-700 bg-stone-900 text-stone-100' : s?.chip,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          s?.punto ?? 'bg-stone-400',
          status === 'ACTIVO' && 'animate-pulse',
        )}
      />
      {s?.label ?? status}
    </span>
  )
}
