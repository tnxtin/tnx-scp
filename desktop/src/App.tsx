import { useCallback, useEffect, useState } from 'react'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowLeft,
  DatabaseBackup,
  Eye,
  EyeOff,
  Flag,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { RoundsView } from '@/components/tournament/rounds-view'
import { PlayersView } from '@/components/tournament/players-view'
import { StandingsView } from '@/components/tournament/standings-view'
import { HowItWorksCard } from '@/components/tournament/HowItWorksCard'
import { FaqCard } from '@/components/tournament/FaqCard'
import { useToast } from '@/hooks/use-toast'
import type { GameResult, Player } from '@/lib/pairing/engine'
import { api } from './api'
import { isTauri } from './db'
import type { TournamentFull, TournamentSummary } from './api-types'

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

export default function App() {
  return (
    <>
      <AppBody />
      <Toaster />
    </>
  )
}

function AppBody() {
  const [openId, setOpenId] = useState<string | null>(null)

  if (openId) {
    return (
      <TournamentEditor
        id={openId}
        onClose={() => setOpenId(null)}
      />
    )
  }
  return <TournamentsScreen onOpen={setOpenId} />
}

/* ----------------------- lista de torneos ----------------------- */

function TournamentsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [name, setName] = useState('')
  const [totalRounds, setTotalRounds] = useState('5')
  const [byePoints, setByePoints] = useState('1')
  const [seedDemo, setSeedDemo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setTournaments(await api.listTournaments())
  }, [])

  useEffect(() => {
    let ok = true
    api
      .listTournaments()
      .then((d) => {
        if (ok) setTournaments(d)
      })
      .catch((e) => {
        if (ok) setLoadError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      ok = false
    }
  }, [reload])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const id = await api.createTournament({
      name,
      totalRounds: Number(totalRounds),
      byePoints: Number(byePoints),
      seedDemo,
    })
    setSaving(false)
    if (!id) {
      toast({ title: 'No se pudo crear el torneo' })
      return
    }
    toast({ title: 'Torneo creado', description: 'Añade jugadores y genera la ronda 1.' })
    onOpen(id)
  }

  const remove = async (t: TournamentSummary) => {
    if (!window.confirm(`¿Eliminar «${t.name}» con todos sus jugadores y rondas?`)) return
    await api.deleteTournament(t.id)
    toast({ title: 'Torneo eliminado' })
    reload()
  }

  const setStatus = async (t: TournamentSummary, status: string) => {
    await api.setStatus(t.id, status)
    toast({ title: `«${t.name}» ahora está ${status}` })
    reload()
  }

  const backup = async () => {
    const err = await api.backupDatabase?.()
    if (err === null || err === undefined) {
      toast({ title: 'Copia creada', description: 'Guardada en tu carpeta de Descargas.' })
    } else {
      toast({ title: 'No se pudo respaldar', description: err })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold leading-tight">Tnx · Social Chess Pairing</h1>
          <p className="text-xs text-muted-foreground">
            App de escritorio offline ·{' '}
            {isTauri ? 'almacenamiento SQLite' : 'modo navegador (desarrollo)'} ·{' '}
            {tournaments.length > 0 ? `${tournaments.length} torneo(s)` : 'sin torneos'}
            {loadError ? ` · ERROR: ${loadError}` : ''}
          </p>
        </div>
        {isTauri && (
          <Button variant="outline" size="sm" onClick={backup}>
            <DatabaseBackup className="size-4" aria-hidden />
            Respaldar base de datos
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="size-4" aria-hidden />
            Mis torneos ({tournaments.length})
          </CardTitle>
          <CardDescription>
            Varios torneos guardados en este equipo; solo uno puede estar
            «en juego» (ACTIVO) a la vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Todavía no hay torneos. Crea el primero aquí abajo.
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
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => onOpen(t.id)}
                >
                  <span className="text-sm font-semibold hover:underline">{t.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {t.playerCount} inscritos · {t.roundsPlayed}/{t.totalRounds} rondas
                    · bye {t.byePoints.toLocaleString('es-ES')}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>
                    {t.status === 'ACTIVO' ? 'EN JUEGO' : t.status}
                  </Badge>
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
          <form
            onSubmit={create}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]"
          >
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
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
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
                <Trophy className="size-4" aria-hidden />
                {saving ? 'Creando…' : 'Crear torneo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/* ----------------------- editor de torneo ----------------------- */

function TournamentEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { toast } = useToast()
  const [full, setFull] = useState<TournamentFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const data = await api.loadTournamentFull(id)
    if (!data) {
      setError('Torneo no encontrado')
      return
    }
    setFull(data)
  }, [id])

  useEffect(() => {
    let ok = true
    api
      .loadTournamentFull(id)
      .then((data) => {
        if (!ok) return
        if (!data) setError('Torneo no encontrado')
        else setFull(data)
      })
      .catch(() => setError('No se pudo cargar el torneo'))
    return () => {
      ok = false
    }
  }, [id])

  const onGenerate = async (): Promise<string | null> => {
    const err = await api.generateNextRound(id)
    if (!err) await reload()
    return err
  }

  const onSetResult = async (
    roundNumber: number,
    board: number,
    result: GameResult | null,
  ) => {
    const err = await api.setRoundResult(id, roundNumber, board, result)
    if (err) {
      toast({ title: 'No se pudo guardar el resultado', description: err })
      return
    }
    await reload()
  }

  const onSavePlayers = async (players: Player[]): Promise<string | null> => {
    try {
      await api.savePlayers(id, players)
      await reload()
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Error al guardar'
    }
  }

  const setStatus = async (status: string) => {
    await api.setStatus(id, status)
    toast({ title: `Torneo ahora está ${status}` })
    reload()
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" aria-hidden />
          Volver a mis torneos
        </Button>
      </div>
    )
  }
  if (!full) return null

  const statusActions: Array<{ status: string; label: string; icon: typeof Eye }> = []
  if (full.status === 'BORRADOR')
    statusActions.push({ status: 'ACTIVO', label: 'Marcar en juego', icon: Eye })
  if (full.status === 'ACTIVO') {
    statusActions.push({ status: 'BORRADOR', label: 'Pasar a borrador', icon: EyeOff })
    statusActions.push({ status: 'FINALIZADO', label: 'Finalizar', icon: Flag })
  }
  if (full.status === 'FINALIZADO')
    statusActions.push({ status: 'ACTIVO', label: 'Reabrir', icon: Eye })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Volver a mis torneos"
            onClick={onClose}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <h2 className="text-lg font-bold leading-tight">{full.name}</h2>
          <Badge variant={STATUS_VARIANT[full.status] ?? 'secondary'}>
            {full.status === 'ACTIVO' ? 'EN JUEGO' : full.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {full.players.length} inscritos · {full.rounds.length}/{full.totalRounds} rondas
            · bye {full.byePoints.toLocaleString('es-ES')}
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

      <Tabs defaultValue="jugadores" className="gap-4">
        <TabsList className="flex h-9 w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="jugadores" className="gap-1.5">
            <UserPlus className="size-4" aria-hidden />
            Jugadores
          </TabsTrigger>
          <TabsTrigger value="emparejamientos">Emparejamientos</TabsTrigger>
          <TabsTrigger value="clasificacion">Clasificación</TabsTrigger>
          <TabsTrigger value="explicaciones">Cómo funciona</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="jugadores">
          <PlayersView
            players={full.players}
            rounds={full.rounds}
            byePoints={full.byePoints}
            editable
            onSave={onSavePlayers}
          />
        </TabsContent>

        <TabsContent value="emparejamientos">
          <RoundsView
            players={full.players}
            rounds={full.rounds}
            totalRounds={full.totalRounds}
            byePoints={full.byePoints}
            canEditResults
            canGenerate
            onGenerate={onGenerate}
            onSetResult={onSetResult}
          />
        </TabsContent>

        <TabsContent value="clasificacion">
          <StandingsView
            players={full.players}
            rounds={full.rounds}
            byePoints={full.byePoints}
          />
        </TabsContent>

        <TabsContent value="explicaciones">
          <HowItWorksCard />
        </TabsContent>

        <TabsContent value="faq">
          <FaqCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
