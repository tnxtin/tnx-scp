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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Info, Plus, Trash2, UserPlus } from 'lucide-react'
import {
  effectiveRatings,
  type GeneratedRound,
  type Player,
} from '@/lib/pairing/engine'
import { PlayerInfoDialog } from '@/components/tournament/player-info-dialog'
import { useToast } from '@/hooks/use-toast'

export interface PlayersViewProps {
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
  /** el árbitro puede editar la lista mientras no haya rondas */
  editable?: boolean
  onSave?: (players: Player[]) => Promise<string | null>
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function PlayersView({
  players,
  rounds,
  byePoints,
  editable = false,
  onSave,
}: PlayersViewProps) {
  const { toast } = useToast()
  const locked = rounds.length > 0
  const canEdit = editable && !locked

  // null = sin cambios locales (se muestran los props tal cual)
  const [draft, setDraft] = useState<Player[] | null>(null)
  const dirty = draft !== null
  const [saving, setSaving] = useState(false)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [club, setClub] = useState('')
  const [elo, setElo] = useState('')

  const current = draft ?? players

  const eff = useMemo(
    () => effectiveRatings(players, rounds),
    [players, rounds],
  )
  const unratedCount = players.filter((p) => p.elo == null).length

  const update = (id: string, patch: Partial<Player>) => {
    setDraft(current.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  const remove = (id: string) => {
    setDraft(current.filter((p) => p.id !== id))
  }
  const add = () => {
    if (!name.trim()) {
      toast({ title: 'Escribe el nombre del jugador' })
      return
    }
    const eloValue = elo.trim() === '' ? null : parseInt(elo, 10)
    if (
      eloValue !== null &&
      (Number.isNaN(eloValue) || eloValue < 100 || eloValue > 3500)
    ) {
      toast({ title: 'El Elo debe estar entre 100 y 3500 (o vacío si no tiene)' })
      return
    }
    setDraft([
      ...current,
      { id: newId(), name: name.trim(), club: club.trim(), elo: eloValue },
    ])
    setName('')
    setClub('')
    setElo('')
  }

  const save = async () => {
    if (!onSave) return
    if (current.length < 2) {
      toast({ title: 'Se necesitan al menos 2 jugadores' })
      return
    }
    setSaving(true)
    const err = await onSave(current)
    setSaving(false)
    if (err) {
      toast({ title: 'No se pudo guardar', description: err })
    } else {
      setDraft(null)
      toast({ title: 'Lista de jugadores guardada' })
    }
  }

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="size-4" aria-hidden />
            Ranking inicial
          </CardTitle>
          {locked && (
            <p className="text-xs text-muted-foreground">
              La lista está cerrada porque el torneo ya ha empezado. Sin rondas
              se puede modificar.
            </p>
          )}
          <CardDescription>
            {players.length} inscritos · {unratedCount} sin Elo (recibirán Elo
            virtual en la mitad de la tabla)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canEdit && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_auto]">
              <Input
                placeholder="Nombre *"
                value={name}
                aria-label="Nombre del jugador"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <Input
                  placeholder="Club"
                  value={club}
                  aria-label="Club del jugador"
                  onChange={(e) => setClub(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
                <Input
                  placeholder="Elo (vacío = sin rating)"
                  type="number"
                  min={100}
                  max={3500}
                  value={elo}
                  aria-label="Elo del jugador"
                  onChange={(e) => setElo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
              </div>
              <Button onClick={add} className="sm:w-full lg:w-auto">
                <Plus className="size-4" aria-hidden />
                Añadir
              </Button>
            </div>
          )}

          {current.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aún no hay jugadores en este torneo.
            </p>
          ) : (
            <ScrollArea className="max-h-96 pr-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="text-right">Elo</TableHead>
                    <TableHead className="w-10" />
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((p, i) => {
                    const virtual = p.elo == null
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Input
                              className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-1"
                              value={p.name}
                              aria-label={`Nombre de ${p.name}`}
                              onChange={(e) => update(p.id, { name: e.target.value })}
                            />
                          ) : (
                            <span>{p.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Input
                              className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-1"
                              value={p.club}
                              aria-label={`Club de ${p.name}`}
                              placeholder="—"
                              onChange={(e) => update(p.id, { club: e.target.value })}
                            />
                          ) : (
                            <span className="text-muted-foreground">{p.club}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {virtual ? (
                            <Badge variant="secondary" title="Elo virtual (media exponencial en la mitad de la tabla)">
                              ~{eff.get(p.id) ?? ''}
                            </Badge>
                          ) : (
                            <span className="font-mono tabular-nums">{p.elo}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            aria-label={`Datos de ${p.name}`}
                            onClick={() => setInfoId(p.id)}
                          >
                            <Info className="size-4" aria-hidden />
                          </Button>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              aria-label={`Eliminar a ${p.name}`}
                              onClick={() => remove(p.id)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {canEdit && dirty && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDraft(null)}
              >
                Descartar cambios
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar lista'}
              </Button>
            </div>
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
