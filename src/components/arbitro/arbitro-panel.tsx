'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Plus, Swords, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TournamentRow {
  id: string
  name: string
  status: string
  totalRounds: number
  byePoints: number
  playerCount: number
  roundsPlayed: number
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  BORRADOR: 'secondary',
  FINALIZADO: 'outline',
}

const STATUS_ACTION: Record<string, { next: string; label: string; icon: typeof Eye }> = {
  BORRADOR: { next: 'ACTIVO', label: 'Publicar', icon: Eye },
  ACTIVO: { next: 'BORRADOR', label: 'Ocultar', icon: EyeOff },
  FINALIZADO: { next: 'ACTIVO', label: 'Reabrir', icon: Eye },
}

export function ArbitroPanel() {
  const { toast } = useToast()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [name, setName] = useState('')
  const [totalRounds, setTotalRounds] = useState('5')
  const [byePoints, setByePoints] = useState('1')
  const [seedDemo, setSeedDemo] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        totalRounds: Number(totalRounds),
        byePoints: Number(byePoints),
        seedDemo,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast({ title: 'No se pudo crear el torneo', description: data.error })
      return
    }
    toast({ title: 'Torneo creado', description: 'Añade jugadores y genera la ronda 1.' })
    router.push(`/arbitro/${data.tournament.id}`)
  }

  const setStatus = async (t: TournamentRow, status: string) => {
    const res = await fetch(`/api/tournaments/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'No se pudo cambiar el estado', description: data.error })
      return
    }
    toast({ title: `«${t.name}» ahora está ${status}` })
    reload()
  }

  const remove = async (t: TournamentRow) => {
    if (!window.confirm(`¿Eliminar «${t.name}» con todos sus jugadores y rondas?`)) return
    const res = await fetch(`/api/tournaments/${t.id}`, { method: 'DELETE' })
    const data = await res.json()
    toast(
      res.ok
        ? { title: 'Torneo eliminado' }
        : { title: 'No se pudo eliminar', description: data.error },
    )
    if (res.ok) reload()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="size-4" aria-hidden />
            Mis torneos ({tournaments.length})
          </CardTitle>
          <CardDescription>
            Un solo torneo puede estar ACTIVO (publicado) a la vez en la web
            pública; crea varios y publica el que esté en juego.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Todavía no tienes torneos. Crea el primero aquí abajo.
            </p>
          )}
          {tournaments.map((t) => {
            const action = STATUS_ACTION[t.status] ?? STATUS_ACTION.BORRADOR
            const ActionIcon = action.icon
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/arbitro/${t.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.playerCount} inscritos · {t.roundsPlayed}/{t.totalRounds} rondas
                    · bye {t.byePoints.toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>{t.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setStatus(t, action.next)}>
                    <ActionIcon className="size-4" aria-hidden />
                    {action.label}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar ${t.name}`}
                    onClick={() => remove(t)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Crear torneo</CardTitle>
          <CardDescription>
            Después podrás editar la lista de jugadores y generar las rondas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-1">
              <Label htmlFor="nt-name">Nombre del torneo</Label>
              <Input
                id="nt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Open de primavera"
              />
            </div>
            <div className="space-y-1">
              <Label>Número de rondas</Label>
              <Select value={totalRounds} onValueChange={setTotalRounds}>
                <SelectTrigger aria-label="Número de rondas">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} rondas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Puntos por bye</Label>
              <Select value={byePoints} onValueChange={setByePoints}>
                <SelectTrigger aria-label="Puntos por bye">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 punto</SelectItem>
                  <SelectItem value="0.5">0,5 puntos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
              <Checkbox
                id="nt-demo"
                checked={seedDemo}
                onCheckedChange={(v) => setSeedDemo(v === true)}
              />
              <Label htmlFor="nt-demo" className="text-sm font-normal">
                Cargar los 104 inscritos de ejemplo (XX Open Sub 2400 Málaga)
              </Label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                <Plus className="size-4" aria-hidden />
                {saving ? 'Creando…' : 'Crear torneo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
