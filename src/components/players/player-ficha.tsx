'use client'

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
import { TONE_CLASSES, type PlayerDetail } from '@/lib/pairing/player-detail'

const chartConfig = {
  puntos: { label: 'Puntos', color: 'var(--chart-1)' },
} satisfies ChartConfig

function fmtElo(v: number, virtual: boolean): string {
  return `${virtual ? '~' : ''}${v}`
}

/**
 * Cuerpo de la ficha de un jugador: datos del torneo, evolución de puntos
 * y detalle ronda a ronda. Lo usan el diálogo ℹ de las tablas y su página.
 */
export function PlayerFicha({
  detail,
  byePoints,
}: {
  detail: PlayerDetail
  byePoints: number
}) {
  return (
    <>
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

      {detail.rows.length === 0 ? (
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
  )
}
