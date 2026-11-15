'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ClipboardList, LoaderCircle } from 'lucide-react'
import { RoundsView } from '@/components/tournament/rounds-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { useToast } from '@/hooks/use-toast'
import type { GameResult } from '@/lib/pairing/engine'
import type { TournamentFull } from '@/lib/tournament'

interface TournamentRow {
  id: string
  name: string
  status: string
  totalRounds: number
  byePoints: number
  playerCount: number
  roundsPlayed: number
  createdByName: string
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  BORRADOR: 'secondary',
  FINALIZADO: 'outline',
}

export function AuxiliarPanel() {
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [selected, setSelected] = useState<TournamentFull | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchAll = useCallback(
    async () =>
      (await fetch('/api/tournaments').then((r) =>
        r.json(),
      )) as { tournaments: TournamentRow[] },
    [],
  )

  const reload = useCallback(async () => {
    const d = await fetchAll()
    setTournaments(d.tournaments ?? [])
  }, [fetchAll])

  useEffect(() => {
    let ok = true
    fetchAll()
      .then((d) => {
        if (ok) setTournaments(d.tournaments ?? [])
      })
      .catch(() => {})
    return () => {
      ok = false
    }
  }, [fetchAll])

  const openTournament = async (id: string) => {
    setLoadingDetail(true)
    const res = await fetch(`/api/tournaments/${id}`)
    const data = await res.json()
    setLoadingDetail(false)
    if (!res.ok) {
      toast({ title: 'No se pudo abrir el torneo', description: data.error })
      return
    }
    setSelected(data.tournament)
  }

  const onSetResult = async (
    roundNumber: number,
    board: number,
    result: GameResult | null,
  ) => {
    if (!selected) return
    const res = await fetch(`/api/tournaments/${selected.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber, board, result }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'No se pudo guardar el resultado', description: data.error })
      return
    }
    const fresh = await fetch(`/api/tournaments/${selected.id}`).then((r) => r.json())
    if (fresh.tournament) setSelected(fresh.tournament)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" aria-hidden />
            Torneos de tu árbitro
          </CardTitle>
          <CardDescription>
            Como auxiliar puedes introducir y corregir resultados. Generar
            rondas o editar jugadores corresponde al árbitro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Tu árbitro todavía no tiene torneos.
            </p>
          )}
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.playerCount} inscritos · {t.roundsPlayed}/{t.totalRounds} rondas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>{t.status}</Badge>
                <Button variant="outline" size="sm" onClick={() => openTournament(t.id)}>
                  Introducir resultados
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {loadingDetail && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin" aria-hidden />
        </div>
      )}

      {selected && !loadingDetail && (
        <>
          <RoundsView
            players={selected.players}
            rounds={selected.rounds}
            totalRounds={selected.totalRounds}
            byePoints={selected.byePoints}
            canEditResults
            onSetResult={onSetResult}
          />
          <StandingsView
            players={selected.players}
            rounds={selected.rounds}
            byePoints={selected.byePoints}
          />
        </>
      )}
    </div>
  )
}
