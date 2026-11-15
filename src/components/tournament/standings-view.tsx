'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, Info } from 'lucide-react'
import { getStandings, type GeneratedRound, type Player } from '@/lib/pairing/engine'
import { PlayerInfoDialog } from '@/components/tournament/player-info-dialog'

export interface StandingsViewProps {
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
}

export function StandingsView({ players, rounds, byePoints }: StandingsViewProps) {
  const [infoId, setInfoId] = useState<string | null>(null)
  const rows = useMemo(
    () => getStandings(players, rounds, byePoints),
    [players, rounds, byePoints],
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4" aria-hidden />
            Clasificación
          </CardTitle>
          <CardDescription>
            Puntos acumulados (la libreta del libre vale{' '}
            {byePoints.toLocaleString('es-ES')}). El orden de desempate es el Elo
            efectivo. Pulsa el icono ℹ para ver la ficha y evolución de cada
            jugador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No hay jugadores en este torneo todavía.
            </p>
          ) : (
            <ScrollArea className="max-h-96 pr-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Pos</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="text-right">Elo</TableHead>
                    <TableHead className="text-right">PJ</TableHead>
                    <TableHead className="text-right">Pts</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.player.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.player.name}
                        {rounds.length === 0 && r.isVirtual && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px]"
                            title="Elo virtual: media exponencial en la mitad de la tabla"
                          >
                            sin Elo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.player.club || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {r.isVirtual ? `~${r.effectiveElo}` : r.effectiveElo}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {r.played}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums">
                        {r.points.toLocaleString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label={`Datos de ${r.player.name}`}
                          onClick={() => setInfoId(r.player.id)}
                        >
                          <Info className="size-4" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      <PlayerInfoDialog
        players={players}
        rounds={rounds}
        byePoints={byePoints}
        playerId={infoId}
        onOpenChange={(o) => {
          if (!o) setInfoId(null)
        }}
      />
    </>
  )
}
