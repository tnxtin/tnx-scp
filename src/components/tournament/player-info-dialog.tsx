'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  effectiveRatings,
  getStandings,
  type GameResult,
  type GeneratedRound,
  type Player,
  type RatingSnapshot,
} from '@/lib/pairing/engine'

interface RoundRow {
  round: number
  groupIndex: number | null
  band: string | null
  color: 'B' | 'N' | null
  isBye: boolean
  oppName: string | null
  oppElo: RatingSnapshot | null
  result: GameResult | null
  pts: number | null
  cum: number
  /** etiqueta del resultado desde la perspectiva del jugador («1 – 0», «½ – ½»…) */
  _label?: string
}

const chartConfig = {
  puntos: { label: 'Puntos', color: 'var(--chart-1)' },
} satisfies ChartConfig

function fmtElo(v: number, virtual: boolean): string {
  return `${virtual ? '~' : ''}${v}`
}

function resultLabel(result: GameResult | null, isWhite: boolean): {
  text: string
  pts: number | null
} {
  if (result === null) return { text: 'Pendiente', pts: null }
  if (result === '1/2') return { text: '½ – ½', pts: 0.5 }
  const won = (result === '1-0') === isWhite
  return won ? { text: '1 – 0', pts: 1 } : { text: '0 – 1', pts: 0 }
}

const TONE_CLASSES: Record<string, string> = {
  win: 'bg-primary/10 text-primary border-primary/30',
  draw: 'bg-muted text-muted-foreground',
  loss: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-muted text-muted-foreground',
}

export interface PlayerInfoDialogProps {
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
  playerId: string | null
  onOpenChange: (open: boolean) => void
}

export function PlayerInfoDialog({
  players,
  rounds,
  byePoints,
  playerId,
  onOpenChange,
}: PlayerInfoDialogProps) {
  const detail = useMemo(() => {
    if (!playerId) return null
    const player = players.find((p) => p.id === playerId)
    if (!player) return null

    const standings = getStandings(players, rounds, byePoints)
    const myRow = standings.find((r) => r.player.id === playerId)
    const pos = myRow ? standings.indexOf(myRow) + 1 : null
    const effMap = effectiveRatings(players, rounds)
    const eff = effMap.get(playerId)

    const ratingsByRound = new Map(
      rounds.map((r) => [r.number, new Map(r.ratings.map((x) => [x.playerId, x]))]),
    )

    let cum = 0
    const rows: RoundRow[] = rounds.map((r) => {
      const rmap = ratingsByRound.get(r.number) ?? new Map<string, RatingSnapshot>()
      const grp = r.groups.find((g) => g.playerIds.includes(playerId)) ?? null
      let band: string | null = null
      if (grp) {
        const elos = grp.playerIds.map((id) => rmap.get(id)?.effectiveElo ?? 0)
        band = `${Math.max(...elos)} – ${Math.min(...elos)}`
      }
      const game = r.games.find((g) => g.whiteId === playerId || g.blackId === playerId)
      if (game) {
        const isWhite = game.whiteId === playerId
        const oppId = isWhite ? game.blackId : game.whiteId
        const opp = players.find((p) => p.id === oppId)
        const { text, pts } = resultLabel(game.result, isWhite)
        if (pts !== null) cum += pts
        return {
          round: r.number,
          groupIndex: grp?.index ?? null,
          band,
          color: isWhite ? 'B' : 'N',
          isBye: false,
          oppName: opp?.name ?? oppId,
          oppElo: rmap.get(oppId) ?? null,
          result: game.result,
          pts,
          cum,
          _label: text,
        }
      }
      const bye = r.byes.find((b) => b.playerId === playerId)
      if (bye) cum += byePoints
      return {
        round: r.number,
        groupIndex: grp?.index ?? null,
        band,
        color: null,
        isBye: true,
        oppName: null,
        oppElo: null,
        result: null,
        pts: bye ? byePoints : null,
        cum,
      }
    })

    const chartData = [
      { ronda: 0, puntos: 0 },
      ...rows.map((r) => ({ ronda: r.round, puntos: r.cum })),
    ]
    return { player, pos, myRow, eff, rows, chartData }
  }, [playerId, players, rounds, byePoints])

  const open = playerId !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detail ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                {detail.player.name}
                {detail.myRow?.isVirtual && (
                  <Badge variant="secondary" title="Elo virtual (media exponencial en la mitad de la tabla)">
                    ~{detail.eff}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {detail.player.club || 'Sin club'} ·{' '}
                {detail.myRow?.isVirtual
                  ? 'Sin Elo publicado'
                  : `Elo ${detail.player.elo}`}
              </DialogDescription>
            </DialogHeader>

            {/* Datos del torneo */}
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                { k: 'Posición', v: detail.pos ? `${detail.pos}º` : '—' },
                {
                  k: 'Puntos',
                  v: (detail.myRow?.points ?? 0).toLocaleString('es-ES'),
                },
                { k: 'Partidas', v: String(detail.myRow?.played ?? 0) },
                { k: 'Elo efectivo', v: detail.eff !== undefined ? fmtElo(detail.eff, !!detail.myRow?.isVirtual) : '—' },
              ].map(({ k, v }) => (
                <div key={k} className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-mono font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            {rounds.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                El torneo no ha empezado: esta es su posición en el ranking
                inicial. La evolución por rondas aparecerá al generar la
                primera ronda.
              </p>
            ) : (
              <>
                {/* Evolución de puntos */}
                <div>
                  <h4 className="mb-1 text-sm font-medium">Evolución de puntos</h4>
                  <ChartContainer config={chartConfig} className="h-28 w-full">
                    <LineChart
                      data={detail.chartData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="ronda"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        allowDecimals={false}
                      />
                      <YAxis
                        allowDecimals
                        tickLine={false}
                        axisLine={false}
                        tickMargin={2}
                        width={36}
                        domain={[0, 'dataMax']}
                      />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <Line
                        dataKey="puntos"
                        type="monotone"
                        stroke="var(--color-puntos)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>

                {/* Detalle ronda a ronda */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Ronda</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Rival</TableHead>
                      <TableHead className="text-right">Res.</TableHead>
                      <TableHead className="w-14 text-right">Acum.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.rows.map((r) => {
                      const label =
                        r.isBye
                          ? 'Libre'
                          : r._label ?? (r.result === null ? 'Pendiente' : '—')
                      const tone =
                        r.isBye || r.pts === null
                          ? 'pending'
                          : r.pts === 1
                            ? 'win'
                            : r.pts === 0.5
                              ? 'draw'
                              : 'loss'
                      return (
                        <TableRow key={r.round}>
                          <TableCell className="font-mono text-muted-foreground">
                            {r.round}
                          </TableCell>
                          <TableCell>
                            {r.groupIndex !== null ? (
                              <span className="text-xs text-muted-foreground">
                                G{r.groupIndex}
                                {r.band && (
                                  <span className="ml-1 font-mono">({r.band})</span>
                                )}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {r.isBye ? (
                              <span className="text-amber-600">
                                Descansa (+{byePoints.toLocaleString('es-ES')})
                              </span>
                            ) : (
                              <>
                                <span className="font-medium">{r.oppName}</span>
                                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                  {r.oppElo
                                    ? fmtElo(r.oppElo.effectiveElo, r.oppElo.isVirtual)
                                    : ''}
                                </span>
                                {r.color && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1.5 text-[10px]"
                                    title={r.color === 'B' ? 'Llevó blancas' : 'Llevó negras'}
                                  >
                                    {r.color === 'B' ? 'Blancas' : 'Negras'}
                                  </Badge>
                                )}
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`justify-center ${TONE_CLASSES[tone]}`}
                            >
                              {label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {r.cum.toLocaleString('es-ES')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>Jugador no encontrado</DialogTitle>
            <DialogDescription>
              El jugador ya no está en la lista.
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}
