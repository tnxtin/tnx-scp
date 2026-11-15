'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, EyeOff, Flag, LoaderCircle } from 'lucide-react'
import { RoundsView } from '@/components/tournament/rounds-view'
import { PlayersView } from '@/components/tournament/players-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { useToast } from '@/hooks/use-toast'
import type { GameResult, Player } from '@/lib/pairing/engine'
import type { TournamentFull } from '@/lib/tournament'

interface Perms {
  canView: boolean
  canEditPlayers: boolean
  canGenerate: boolean
  canSetResults: boolean
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  BORRADOR: 'secondary',
  FINALIZADO: 'outline',
}

export function TournamentEditor({ id }: { id: string }) {
  const { toast } = useToast()
  const [tournament, setTournament] = useState<TournamentFull | null>(null)
  const [perms, setPerms] = useState<Perms | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(
    async () => await fetch(`/api/tournaments/${id}`),
    [id],
  )

  const reload = useCallback(async () => {
    const res = await fetchDetail()
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo cargar el torneo')
      setLoading(false)
      return
    }
    setTournament(data.tournament)
    setPerms(data.perms)
    setLoading(false)
  }, [fetchDetail])

  useEffect(() => {
    let ok = true
    fetchDetail()
      .then((res) => res.json())
      .then((data) => {
        if (!ok) return
        if (data.error) {
          setError(data.error ?? 'No se pudo cargar el torneo')
        } else {
          setTournament(data.tournament)
          setPerms(data.perms)
        }
        setLoading(false)
      })
      .catch(() => {})
    return () => {
      ok = false
    }
  }, [fetchDetail])

  const onGenerate = async (): Promise<string | null> => {
    const res = await fetch(`/api/tournaments/${id}/generate`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Error al generar'
    await reload()
    return null
  }

  const onSetResult = async (
    roundNumber: number,
    board: number,
    result: GameResult | null,
  ) => {
    const res = await fetch(`/api/tournaments/${id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber, board, result }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'No se pudo guardar el resultado', description: data.error })
      return
    }
    await reload()
  }

  const onSavePlayers = async (players: Player[]): Promise<string | null> => {
    const res = await fetch(`/api/tournaments/${id}/players`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: players.map((p) => ({ name: p.name, club: p.club, elo: p.elo })),
      }),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Error al guardar'
    await reload()
    return null
  }

  const setStatus = async (status: string) => {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'No se pudo cambiar el estado', description: data.error })
      return
    }
    toast({ title: `Torneo ahora está ${status}` })
    reload()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" aria-hidden />
      </div>
    )
  }
  if (error || !tournament || !perms) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? 'Torneo no encontrado'}
      </p>
    )
  }

  const statusActions: Array<{ status: string; label: string; icon: typeof Eye }> = []
  if (tournament.status === 'BORRADOR')
    statusActions.push({ status: 'ACTIVO', label: 'Publicar en la web', icon: Eye })
  if (tournament.status === 'ACTIVO') {
    statusActions.push({ status: 'BORRADOR', label: 'Ocultar de la web', icon: EyeOff })
    statusActions.push({ status: 'FINALIZADO', label: 'Finalizar', icon: Flag })
  }
  if (tournament.status === 'FINALIZADO')
    statusActions.push({ status: 'ACTIVO', label: 'Reabrir', icon: Eye })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="size-8" aria-label="Volver a mis torneos">
            <Link href="/arbitro">
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
          <h2 className="text-lg font-bold leading-tight">{tournament.name}</h2>
          <Badge variant={STATUS_VARIANT[tournament.status] ?? 'secondary'}>
            {tournament.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {tournament.players.length} inscritos · {tournament.rounds.length}/
            {tournament.totalRounds} rondas · bye{' '}
            {tournament.byePoints.toLocaleString('es-ES')}
          </span>
          {statusActions.map((a) => {
            const Icon = a.icon
            return (
              <Button key={a.status} variant="outline" size="sm" onClick={() => setStatus(a.status)}>
                <Icon className="size-4" aria-hidden />
                {a.label}
              </Button>
            )
          })}
        </div>
      </div>

      <RoundsView
        players={tournament.players}
        rounds={tournament.rounds}
        totalRounds={tournament.totalRounds}
        byePoints={tournament.byePoints}
        canEditResults={perms.canSetResults}
        canGenerate={perms.canGenerate}
        onGenerate={perms.canGenerate ? onGenerate : undefined}
        onSetResult={perms.canSetResults ? onSetResult : undefined}
      />

      <PlayersView
        players={tournament.players}
        rounds={tournament.rounds}
        byePoints={tournament.byePoints}
        editable={perms.canEditPlayers}
        onSave={perms.canEditPlayers ? onSavePlayers : undefined}
      />

      <StandingsView
        players={tournament.players}
        rounds={tournament.rounds}
        byePoints={tournament.byePoints}
      />
    </div>
  )
}
