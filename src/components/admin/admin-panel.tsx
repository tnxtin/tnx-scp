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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShieldCheck, UserPlus, Users, Contact } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminUser {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'ARBITRO' | 'AUXILIAR'
  active: boolean
  supervisor?: { name: string } | null
  apellidos: string
  pais: string
  comunidad: string
  provincia: string
  municipio: string
  cp: string
  movil: string
  email: string | null
  tituloArbitro: string
  _count: { tournaments: number; auxiliares: number }
}

interface TournamentRow {
  id: string
  name: string
  status: string
  totalRounds: number
  playerCount: number
  roundsPlayed: number
  createdByName: string
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  ARBITRO: 'Árbitro',
  AUXILIAR: 'Auxiliar',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  BORRADOR: 'secondary',
  FINALIZADO: 'outline',
}

const EMPTY_PROFILE = {
  nombre: '',
  apellidos: '',
  email: '',
  movil: '',
  pais: '',
  comunidad: '',
  provincia: '',
  municipio: '',
  cp: '',
  tituloArbitro: '',
}

export function AdminPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ARBITRO' | 'AUXILIAR' | 'ADMIN'>('ARBITRO')
  const [supervisorId, setSupervisorId] = useState<string>('')
  const [profile, setProfile] = useState({ ...EMPTY_PROFILE })
  const [saving, setSaving] = useState(false)
  const [ficha, setFicha] = useState<AdminUser | null>(null)

  const setP = (k: keyof typeof EMPTY_PROFILE) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => ({ ...p, [k]: e.target.value }))

  const fetchAll = useCallback(async () => {
    const [u, t] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/tournaments').then((r) => r.json()),
    ])
    return {
      users: (u.users ?? []) as AdminUser[],
      tournaments: (t.tournaments ?? []) as TournamentRow[],
    }
  }, [])

  const reload = useCallback(async () => {
    const d = await fetchAll()
    setUsers(d.users)
    setTournaments(d.tournaments)
  }, [fetchAll])

  useEffect(() => {
    let ok = true
    fetchAll()
      .then((d) => {
        if (ok) {
          setUsers(d.users)
          setTournaments(d.tournaments)
        }
      })
      .catch(() => {})
    return () => {
      ok = false
    }
  }, [fetchAll])

  const arbiters = users.filter((u) => u.role === 'ARBITRO')
  const esArbitro = role === 'ARBITRO'

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        role,
        supervisorId: role === 'AUXILIAR' ? supervisorId : undefined,
        ...profile,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast({ title: 'No se pudo crear', description: data.error })
      return
    }
    toast({ title: `Usuario ${username} creado` })
    setUsername('')
    setPassword('')
    setSupervisorId('')
    setProfile({ ...EMPTY_PROFILE })
    reload()
  }

  const resetPassword = async (u: AdminUser) => {
    const nueva = window.prompt(`Nueva contraseña para ${u.username} (mín. 8 caracteres)`)
    if (!nueva) return
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva }),
    })
    const data = await res.json()
    toast(
      res.ok
        ? { title: `Contraseña de ${u.username} actualizada` }
        : { title: 'Error', description: data.error },
    )
  }

  const toggleActive = async (u: AdminUser) => {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    if (res.ok) {
      toast({ title: `${u.username} ${u.active ? 'desactivado' : 'activado'}` })
      reload()
    }
  }

  const removeUser = async (u: AdminUser) => {
    if (!window.confirm(`¿Eliminar la cuenta ${u.username}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    toast(
      res.ok
        ? { title: `Cuenta ${u.username} eliminada` }
        : { title: 'No se pudo eliminar', description: data.error },
    )
    if (res.ok) reload()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" aria-hidden />
            Panel del administrador
          </CardTitle>
          <CardDescription>
            Dar de alta árbitros y auxiliares con sus datos completos, resetear
            contraseñas y consultar todos los torneos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-3">
            {/* acceso */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
              <div className="space-y-1">
                <Label htmlFor="nu-username">Usuario</Label>
                <Input id="nu-username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="arbitro1" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nu-pass">Contraseña</Label>
                <Input id="nu-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="mín. 8 caracteres" />
              </div>
              <div className="space-y-1">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger aria-label="Rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARBITRO">Árbitro</SelectItem>
                    <SelectItem value="AUXILIAR">Auxiliar</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'AUXILIAR' && (
                <div className="space-y-1">
                  <Label>Árbitro</Label>
                  <Select value={supervisorId} onValueChange={setSupervisorId}>
                    <SelectTrigger aria-label="Árbitro supervisor">
                      <SelectValue placeholder="Elegir árbitro" />
                    </SelectTrigger>
                    <SelectContent>
                      {arbiters.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-end">
                <Button type="submit" disabled={saving} className="w-full lg:w-auto">
                  <UserPlus className="size-4" aria-hidden />
                  Crear
                </Button>
              </div>
            </div>

            {/* datos personales */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="np-nombre">Nombre {esArbitro && '*'}</Label>
                <Input id="np-nombre" value={profile.nombre} onChange={setP('nombre')} required={esArbitro} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-apellidos">Apellidos {esArbitro && '*'}</Label>
                <Input id="np-apellidos" value={profile.apellidos} onChange={setP('apellidos')} required={esArbitro} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-email">Email {esArbitro && '*'}</Label>
                <Input id="np-email" type="email" value={profile.email} onChange={setP('email')} required={esArbitro} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-movil">Móvil {esArbitro && '*'}</Label>
                <Input id="np-movil" type="tel" value={profile.movil} onChange={setP('movil')} required={esArbitro} placeholder="600 123 456" />
              </div>
            </div>

            {/* ubicación y título */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1">
                <Label htmlFor="np-pais">País {esArbitro && '*'}</Label>
                <Input id="np-pais" value={profile.pais} onChange={setP('pais')} required={esArbitro} placeholder="España" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-comunidad">CCAA o región {esArbitro && '*'}</Label>
                <Input id="np-comunidad" value={profile.comunidad} onChange={setP('comunidad')} required={esArbitro} placeholder="Andalucía" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-provincia">Provincia {esArbitro && '*'}</Label>
                <Input id="np-provincia" value={profile.provincia} onChange={setP('provincia')} required={esArbitro} placeholder="Málaga" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-municipio">Municipio {esArbitro && '*'}</Label>
                <Input id="np-municipio" value={profile.municipio} onChange={setP('municipio')} required={esArbitro} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-cp">CP {esArbitro && '*'}</Label>
                <Input id="np-cp" value={profile.cp} onChange={setP('cp')} required={esArbitro} inputMode="numeric" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-titulo">Título de árbitro {esArbitro && '*'}</Label>
                <Input id="np-titulo" value={profile.tituloArbitro} onChange={setP('tituloArbitro')} required={esArbitro} placeholder="Nacional, Autonómico, FIDE…" />
              </div>
            </div>
            {esArbitro && (
              <p className="text-xs text-muted-foreground">
                * Datos fundamentales obligatorios para dar de alta a un árbitro.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Usuarios */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" aria-hidden />
            Usuarios ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Torneos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.username}</TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                  <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {u._count.tournaments}
                    {u._count.auxiliares > 0 && (
                      <span className="text-muted-foreground"> · {u._count.auxiliares} aux.</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'secondary'}>
                      {u.active ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setFicha(u)}>
                        <Contact className="size-4" aria-hidden />
                        Ficha
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => resetPassword(u)}>
                        Reset clave
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                        {u.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeUser(u)}>
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Torneos */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Todos los torneos ({tournaments.length})</CardTitle>
          <CardDescription>
            Un torneo ACTIVO es el que se muestra en la web pública de los
            jugadores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Todavía no hay torneos creados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Torneo</TableHead>
                  <TableHead>Árbitro</TableHead>
                  <TableHead className="text-right">Jugadores</TableHead>
                  <TableHead className="text-right">Rondas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.createdByName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{t.playerCount}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {t.roundsPlayed}/{t.totalRounds}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ficha completa */}
      <Dialog open={ficha !== null} onOpenChange={(o) => !o && setFicha(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {ficha && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{ficha.name}</DialogTitle>
                <DialogDescription>
                  {ROLE_LABEL[ficha.role]} · @{ficha.username}
                  {ficha.role === 'AUXILIAR' && ficha.supervisor
                    ? ` · auxiliar de ${ficha.supervisor.name}`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {[
                  ['Apellidos', ficha.apellidos],
                  ['País', ficha.pais],
                  ['CCAA / región', ficha.comunidad],
                  ['Provincia', ficha.provincia],
                  ['Municipio', ficha.municipio],
                  ['CP', ficha.cp],
                  ['Móvil', ficha.movil],
                  ['Email', ficha.email ?? ''],
                  ['Título de árbitro', ficha.tituloArbitro],
                ].map(([k, v]) => (
                  <div key={k} className="col-span-2 grid grid-cols-subgrid">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
              {ficha.role === 'ARBITRO' && ficha.tituloArbitro === '' && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                  Este árbitro todavía no tiene los datos de registro completos
                  (creado antes del nuevo formulario).
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
