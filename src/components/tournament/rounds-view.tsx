'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Swords, ChevronLeft, ChevronRight, Info, Play, Users } from 'lucide-react'
import {
  buildHistory,
  computePoints,
  type GameRecord,
  type GameResult,
  type GeneratedRound,
  type Player,
} from '@/lib/pairing/engine'
import { useToast } from '@/hooks/use-toast'

const RESULT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'P', label: 'Pendiente' },
  { value: '1-0', label: '1 – 0' },
  { value: '1/2', label: '½ – ½' },
  { value: '0-1', label: '0 – 1' },
]

function fmtElo(v: number, virtual: boolean): string {
  return `${virtual ? '~' : ''}${v}`
}

export interface RoundsViewProps {
  players: Player[]
  rounds: GeneratedRound[]
  totalRounds: number
  byePoints: number
  /** puede introducir/cambiar resultados (árbitro, auxiliar, admin) */
  canEditResults?: boolean
  /** puede generar la siguiente ronda */
  canGenerate?: boolean
  onGenerate?: () => Promise<string | null>
  onSetResult?: (
    roundNumber: number,
    board: number,
    result: GameResult | null,
  ) => Promise<void>
}

export function RoundsView({
  players,
  rounds,
  totalRounds,
  byePoints,
  canEditResults = false,
  canGenerate = false,
  onGenerate,
  onSetResult,
}: RoundsViewProps) {
  const { toast } = useToast()
  const [viewing, setViewing] = useState<number | null>(null)
  const last = rounds.length
  const current = Math.min(viewing ?? last, last)
  const round = rounds.find((r) => r.number === current) ?? null

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  )
  const ratingMap = useMemo(
    () => new Map(round?.ratings.map((r) => [r.playerId, r]) ?? []),
    [round],
  )

  // puntos acumulados ANTES de la ronda mostrada (para etiquetar los grupos)
  const ptsMap = useMemo(
    () =>
      computePoints(
        players,
        rounds.filter((r) => r.number < current),
        byePoints,
      ),
    [players, rounds, current, byePoints],
  )

  // rivales previos a la ronda mostrada (para marcar repeticiones)
  const prevPairs = useMemo(() => {
    const hist = buildHistory(rounds.filter((r) => r.number < current))
    return hist.playedPairs
  }, [rounds, current])

  // grupo de cada jugador en la ronda mostrada (para seccionar emparejamientos)
  const groupOfPlayer = useMemo(() => {
    const m = new Map<string, number>()
    round?.groups.forEach((g) => g.playerIds.forEach((id) => m.set(id, g.index)))
    return m
  }, [round])

  // emparejamientos de cada banda, con su franja de Elo
  const groupSections = useMemo(() => {
    if (!round) return []
    return round.groups.map((g) => {
      const games = round.games.filter(
        (x) => groupOfPlayer.get(x.whiteId) === g.index,
      )
      const members = g.playerIds.map((id) => ({
        elo: ratingMap.get(id)?.effectiveElo ?? 0,
        virt: !!ratingMap.get(id)?.isVirtual,
      }))
      const max = members.reduce((a, b) => (b.elo > a.elo ? b : a))
      const min = members.reduce((a, b) => (b.elo < a.elo ? b : a))
      return { group: g, games, max, min }
    })
  }, [round, groupOfPlayer, ratingMap])

  const isLatest = current === last
  const pending = rounds
    .filter((r) => r.number === current)
    .flatMap((r) => r.games)
    .filter((g) => !g.result).length

  const onGenerateClick = async () => {
    if (!onGenerate) return
    const err = await onGenerate()
    if (err) {
      toast({ title: 'No se puede generar la ronda', description: err })
    } else {
      setViewing(null)
      toast({
        title: `Ronda ${last + 1} generada`,
        description: 'Revisa los emparejamientos por bandas.',
      })
    }
  }

  const renderGameRow = (g: GameRecord) => {
    const white = playerById.get(g.whiteId)
    const black = playerById.get(g.blackId)
    const wVirt = ratingMap.get(g.whiteId)?.isVirtual
    const bVirt = ratingMap.get(g.blackId)?.isVirtual
    const isRepeat = prevPairs.has([g.whiteId, g.blackId].sort().join('|'))
    return (
      <TableRow key={g.board}>
        <TableCell className="font-mono text-muted-foreground">
          {g.board}
        </TableCell>
        <TableCell>
          <span className="font-medium">{white?.name}</span>
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
            {fmtElo(ratingMap.get(g.whiteId)?.effectiveElo ?? 0, !!wVirt)}
          </span>
          {isRepeat && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="ml-2 text-[10px] text-amber-600">
                    2ª vez
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Ya se enfrentaron antes: no había alternativa dentro del grupo.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TableCell>
        <TableCell>
          <span className="font-medium">{black?.name}</span>
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
            {fmtElo(ratingMap.get(g.blackId)?.effectiveElo ?? 0, !!bVirt)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {canEditResults && isLatest ? (
            <Select
              value={g.result ?? 'P'}
              onValueChange={(v) =>
                onSetResult?.(
                  current,
                  g.board,
                  v === 'P' ? null : (v as GameResult),
                )
              }
            >
              <SelectTrigger
                className="ml-auto h-8 w-28"
                aria-label={`Resultado ${white?.name} contra ${black?.name}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary">
              {g.result === '1/2'
                ? '½ – ½'
                : g.result === '1-0'
                  ? '1 – 0'
                  : g.result === '0-1'
                    ? '0 – 1'
                    : '—'}
            </Badge>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="size-4" aria-hidden />
            {last === 0
              ? 'Emparejamientos'
              : `Ronda ${current} de ${totalRounds}`}
          </CardTitle>
          {last > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={current <= 1}
                aria-label="Ronda anterior"
                onClick={() => setViewing(Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Select
                value={String(current)}
                onValueChange={(v) => setViewing(Number(v))}
              >
                <SelectTrigger className="h-8 w-36" aria-label="Ver ronda">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => (
                    <SelectItem key={r.number} value={String(r.number)}>
                      Ronda {r.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={current >= last}
                aria-label="Ronda siguiente"
                onClick={() => setViewing(Math.min(last, current + 1))}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          {last === 0
            ? 'Aún no hay rondas generadas para este torneo.'
            : viewing !== null && viewing !== last
              ? 'Ronda ya jugada (solo lectura).'
              : pending > 0
                ? `Quedan ${pending} partidas sin resultado.`
                : isLatest && last < totalRounds
                  ? 'Resultados completos: se puede generar la siguiente ronda.'
                  : isLatest
                    ? 'Torneo completado. ¡Enhorabuena!'
                    : 'Ronda ya jugada (solo lectura).'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {last === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              {canGenerate
                ? 'Comprueba que la lista de jugadores es la definitiva y genera la primera ronda. Los grupos iniciales son tantas bandas de Elo como rondas tenga el torneo.'
                : 'El árbitro todavía no ha generado la primera ronda.'}
            </p>
            {canGenerate && onGenerate && (
              <Button onClick={onGenerateClick} disabled={players.length < 2} size="lg">
                <Play className="size-4" aria-hidden />
                Generar emparejamientos de la ronda 1
              </Button>
            )}
          </div>
        ) : round ? (
          <>
            {/* Bandas de la ronda */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Grupos de esta ronda
                <span className="ml-2 font-normal text-muted-foreground">
                  ({round.groupCount} bandas)
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {round.groups.map((g) => {
                  const members = g.playerIds.map((id) => ({
                    id,
                    elo: ratingMap.get(id)?.effectiveElo ?? 0,
                    virt: !!ratingMap.get(id)?.isVirtual,
                  }))
                  const maxP = members.reduce((a, b) => (b.elo > a.elo ? b : a))
                  const minP = members.reduce((a, b) => (b.elo < a.elo ? b : a))
                  return (
                    <div key={g.index} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          Grupo {g.index}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {fmtElo(maxP.elo, maxP.virt)} – {fmtElo(minP.elo, minP.virt)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {members
                          .map(({ id, virt }) => {
                            const p = playerById.get(id)
                            const name = p?.name ?? id
                            const pts = ptsMap[id] ?? 0
                            const ptsTag =
                              current > 1
                                ? ` (${pts.toLocaleString('es-ES')})`
                                : ''
                            return `${name}${virt ? ' (~)' : ''}${ptsTag}`
                          })
                          .join(' · ')}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                El símbolo ~ indica Elo virtual y (x) son los puntos previos a
                esta ronda. En la ronda 1 los grupos son bandas de Elo; a
                partir de la ronda 2 se forman por puntos.
              </p>
            </div>

            {/* Libres */}
            {round.byes.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                {round.byes.map((b) => (
                  <span key={b.playerId}>
                    <strong>{playerById.get(b.playerId)?.name}</strong> descansa
                    esta ronda y recibe {byePoints.toLocaleString('es-ES')}{' '}
                    {byePoints === 1 ? 'punto' : 'puntos'} de libre.
                  </span>
                ))}
              </div>
            )}

            {/* Tabla de emparejamientos, seccionada por grupos */}
            {round.games.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No hay suficientes jugadores para crear parejas.
              </p>
            ) : (
              <div className="space-y-3">
                {groupSections.map(({ group, games, max, min }) => (
                  <div
                    key={group.index}
                    className="overflow-hidden rounded-md border"
                  >
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Users className="size-4 text-muted-foreground" aria-hidden />
                        Grupo {group.index}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {games.length} {games.length === 1 ? 'mesa' : 'mesas'}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {fmtElo(max.elo, max.virt)} – {fmtElo(min.elo, min.virt)}
                        </Badge>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Mesa</TableHead>
                          <TableHead>Blancas</TableHead>
                          <TableHead>Negras</TableHead>
                          <TableHead className="w-28 text-right">
                            Resultado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{games.map(renderGameRow)}</TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}

            {canGenerate && isLatest && last < totalRounds && onGenerate && (
              <div className="flex justify-end pt-1">
                <Button onClick={onGenerateClick} disabled={pending > 0}>
                  <Play className="size-4" aria-hidden />
                  Generar ronda {last + 1}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
