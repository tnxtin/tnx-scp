'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Info, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { PlayerRow } from '@/lib/public-site'

/** Dirección de la ficha de un jugador dentro de su torneo. */
export const fichaPath = (tournamentId: string, playerId: string): string =>
  `/jugadores/${tournamentId}/${playerId}`

/** Sin tildes ni mayúsculas, para que «jose» encuentre a «José». */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function PlayersTable({
  rows,
  tournamentId,
  started,
  limit,
}: {
  rows: PlayerRow[]
  tournamentId: string
  /** el torneo ya tiene rondas: se muestran partidas y puntos */
  started: boolean
  /** con límite solo salen las primeras filas y no hay buscador */
  limit?: number
}) {
  const [q, setQ] = useState('')
  const acotado = limit !== undefined

  const shown = useMemo(() => {
    const s = norm(q.trim())
    const list = s
      ? rows.filter((r) => norm(r.name).includes(s) || norm(r.club).includes(s))
      : rows
    return acotado ? list.slice(0, limit) : list
  }, [rows, q, acotado, limit])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground tabular-nums">
            {rows.length}
          </strong>{' '}
          jugadores
          {!started && ' · sin rondas jugadas: orden del ranking inicial'}
        </p>
        {!acotado && (
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o club"
              aria-label="Buscar jugador"
              className="pl-9"
            />
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? 'Aún no hay jugadores en este torneo.'
            : `Ningún jugador coincide con «${q.trim()}».`}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">Pos</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="hidden sm:table-cell">Club</TableHead>
              <TableHead className="text-right">Elo</TableHead>
              {/* en móvil se omiten las partidas jugadas para que los puntos no salgan de pantalla */}
              {started && <TableHead className="hidden text-right sm:table-cell">PJ</TableHead>}
              {started && <TableHead className="text-right">Pts</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => {
              const ficha = fichaPath(tournamentId, r.playerId)
              return (
                <TableRow key={r.playerId}>
                  <TableCell
                    className={cn(
                      'font-mono text-muted-foreground tabular-nums',
                      started && r.pos <= 3 && 'font-semibold text-amber-700',
                    )}
                  >
                    {r.pos}
                  </TableCell>
                  {/* whitespace-normal: los nombres largos parten en dos líneas en móvil en vez de desbordar */}
                  <TableCell className="whitespace-normal">
                    {/* el nombre abre la ficha; «Ver ficha» es su subenlace */}
                    <Link
                      href={ficha}
                      className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
                    >
                      <span className="font-medium text-foreground underline-offset-4 group-hover:underline">
                        {r.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 group-hover:text-foreground group-hover:underline">
                        <Info className="size-3" aria-hidden />
                        Ver ficha
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.club || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.isVirtual ? `~${r.effectiveElo}` : r.effectiveElo}
                  </TableCell>
                  {started && (
                    <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                      {r.played}
                    </TableCell>
                  )}
                  {started && (
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {r.points.toLocaleString('es-ES')}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
