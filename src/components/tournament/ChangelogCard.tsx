'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { History } from 'lucide-react'

type EntryKind = 'nueva' | 'mejora' | 'fix'
/** A qué componente afecta el cambio */
type EntryScope = 'web' | 'app'

interface Entry {
  kind: EntryKind
  scope: EntryScope
  text: string
}

interface Version {
  version: string
  date: string
  title: string
  entries: Entry[]
}

const KIND_LABEL: Record<EntryKind, string> = {
  nueva: 'Nueva función',
  mejora: 'Mejora',
  fix: 'Corrección',
}

const KIND_CLASS: Record<EntryKind, string> = {
  nueva: 'bg-primary/10 text-primary border-primary/30',
  mejora: 'bg-muted text-muted-foreground',
  fix: 'bg-destructive/10 text-destructive border-destructive/30',
}

const SCOPE_LABEL: Record<EntryScope, string> = {
  web: 'Web',
  app: 'App',
}

const SCOPE_CLASS: Record<EntryScope, string> = {
  web: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400',
  app: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400',
}

type Filter = 'todas' | EntryScope

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'todas', label: 'Todo' },
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App de escritorio' },
]

const CHANGELOG: Version[] = [
  {
    version: '0.4.1',
    date: '2026-11-15',
    title: 'La web pública lista todos los torneos',
    entries: [
      { kind: 'nueva', scope: 'web', text: 'La página frontal muestra la lista de torneos en tres apartados: en juego, por comenzar y realizados.' },
      { kind: 'nueva', scope: 'web', text: 'Cada torneo tiene su propia página pública (/torneo/…) con emparejamientos, ranking y clasificación.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-15',
    title: 'Software libre (GPL-3.0-or-later) y nuevo nombre',
    entries: [
      { kind: 'nueva', scope: 'web', text: 'El proyecto se publica como software libre bajo GPL-3.0-or-later: libre de ejecutar, estudiar, modificar y compartir — pensado para clubes, escuelas y centros sociales.' },
      { kind: 'mejora', scope: 'web', text: 'Nuevo nombre: Tnx · Social Chess Pairing (antes Tnx Pairing Chess System).' },
      { kind: 'nueva', scope: 'web', text: 'Nueva pestaña Wiki con la documentación completa del sistema.' },
      { kind: 'nueva', scope: 'web', text: 'Pestaña ChangeLog separada por componente (Web / App de escritorio) con filtros.' },
      { kind: 'nueva', scope: 'web', text: 'Instalador interactivo de la web: elige SQLite o MariaDB/MySQL (pidiendo host, puerto, usuario, contraseña y nombre de la base), da de alta el administrador y deja el sistema listo para arrancar.' },
      { kind: 'mejora', scope: 'web', text: 'El acceso arbitraje del header pasa a ser un icono.' },
      { kind: 'mejora', scope: 'app', text: 'La app de escritorio adopta el nuevo nombre y la licencia GPL en su ventana y paquetes.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-15',
    title: 'App de escritorio offline (Windows, macOS, Linux)',
    entries: [
      { kind: 'nueva', scope: 'app', text: 'Aplicación de escritorio con Tauri 2: genera emparejamientos sin conexión en un ordenador o portátil.' },
      { kind: 'nueva', scope: 'app', text: 'Base de datos SQLite local (tnxpairing.db) con esquema compatible con MariaDB para la futura fase de servidor.' },
      { kind: 'nueva', scope: 'app', text: 'Varios torneos guardados en el equipo, con estados BORRADOR / EN JUEGO / FINALIZADO.' },
      { kind: 'nueva', scope: 'app', text: 'Botón «Respaldar base de datos»: copia el .db a Descargas para llevar el torneo a otro equipo.' },
      { kind: 'nueva', scope: 'app', text: 'Workflow de CI para compilar instaladores de Windows (.msi/.exe), macOS (.dmg) y Linux (AppImage/deb/rpm) al publicar una etiqueta.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-15',
    title: 'Multiusuario: administrador, árbitros y auxiliares',
    entries: [
      { kind: 'nueva', scope: 'web', text: 'Acceso arbitraje con usuario y contraseña (sesión JWT en cookie httpOnly, contraseñas con scrypt).' },
      { kind: 'nueva', scope: 'web', text: 'Panel del administrador: alta de árbitros con datos completos (nombre, apellidos, país, CCAA, provincia, municipio, CP, móvil, email y título de árbitro), auxiliares con supervisor, reseteo de contraseñas y activación/desactivación.' },
      { kind: 'nueva', scope: 'web', text: 'Panel del árbitro: crear torneos (con carga de los 104 inscritos de ejemplo), editar jugadores, generar rondas, introducir resultados y publicar en la web.' },
      { kind: 'nueva', scope: 'web', text: 'Panel del auxiliar de árbitro: introducir y corregir resultados de los torneos de su árbitro.' },
      { kind: 'nueva', scope: 'web', text: 'La web pública pasa a mostrar el torneo ACTIVO guardado en la base de datos (solo lectura para los jugadores).' },
      { kind: 'mejora', scope: 'web', text: 'La base de datos pasa de localStorage del navegador a SQLite en el servidor (Prisma).' },
      { kind: 'fix', scope: 'web', text: 'Escudo de rutas por rol: /admin, /arbitro y /auxiliar protegidos también a nivel de API.' },
    ],
  },
  {
    version: '0.1.2',
    date: '2026-11-15',
    title: 'Mejoras de interfaz y datos reales',
    entries: [
      { kind: 'nueva', scope: 'web', text: 'Demo «Cargar ejemplo» con los 104 inscritos reales del XX Open Internacional Sub 2400 Ciudad de Málaga (7 rondas, bye a 0,5).' },
      { kind: 'nueva', scope: 'web', text: 'Pestañas en la página principal: Emparejamientos, Ranking inicial, Clasificación y FAQ.' },
      { kind: 'nueva', scope: 'web', text: 'Ficha de jugador (icono ℹ en Ranking y Clasificación): datos, gráfico de evolución de puntos y detalle ronda a ronda.' },
      { kind: 'mejora', scope: 'web', text: 'El listado de emparejamientos se secciona por grupos, con cabecera, franja de Elo y número de mesas de cada banda.' },
      { kind: 'fix', scope: 'web', text: 'El aviso «La lista está cerrada» se muestra sobre la línea de inscritos y ya no se solapa con el listado.' },
      { kind: 'fix', scope: 'web', text: 'Corregido el desbordamiento del ScrollArea que pintaba tablas largas por encima del pie de página.' },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-11-15',
    title: 'Puesta en marcha local',
    entries: [
      { kind: 'mejora', scope: 'web', text: 'Entorno de desarrollo listo en openSUSE: Bun, dependencias y arranque del servidor.' },
      { kind: 'fix', scope: 'web', text: 'El arranque en producción escucha en todas las interfaces (HOSTNAME=0.0.0.0).' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-12',
    title: 'Versión inicial',
    entries: [
      { kind: 'nueva', scope: 'web', text: 'Motor de emparejamiento suizo por grupos progresivos con Elo virtual por media exponencial (652 comprobaciones).' },
      { kind: 'nueva', scope: 'web', text: 'Interfaz Next.js + shadcn/ui con configuración, jugadores, rondas y clasificación.' },
      { kind: 'nueva', scope: 'web', text: 'Suite de pruebas del motor (scripts/test-engine.ts).' },
    ],
  },
]

export function ChangelogCard() {
  const [filter, setFilter] = useState<Filter>('todas')

  const versions = CHANGELOG.map((v) => ({
    ...v,
    entries:
      filter === 'todas' ? v.entries : v.entries.filter((e) => e.scope === filter),
  })).filter((v) => v.entries.length > 0)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4" aria-hidden />
          ChangeLog
        </CardTitle>
        <CardDescription>
          Historial de versiones de la <strong className="text-foreground">web</strong> y de
          la <strong className="text-foreground">app de escritorio</strong>: funciones
          nuevas, mejoras y correcciones.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {versions.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Sin cambios registrados para este componente.
          </p>
        )}
        {versions.map((v, vi) => (
          <div key={v.version} className="relative">
            {vi < versions.length - 1 && (
              <span
                className="absolute left-[7px] top-6 bottom-[-1.5rem] w-px bg-border"
                aria-hidden
              />
            )}
            <div className="flex items-center gap-2">
              <span className="size-[15px] rounded-full border-2 border-primary bg-background" aria-hidden />
              <h3 className="font-mono text-sm font-semibold">v{v.version}</h3>
              <span className="text-xs text-muted-foreground">{v.date}</span>
            </div>
            <p className="mt-1 pl-6 text-sm font-medium">{v.title}</p>
            <ul className="mt-2 space-y-1.5 pl-6">
              {v.entries.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm">
                  <Badge
                    variant="outline"
                    className={`mt-0.5 shrink-0 text-[10px] ${SCOPE_CLASS[e.scope]}`}
                  >
                    {SCOPE_LABEL[e.scope]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`mt-0.5 shrink-0 text-[10px] ${KIND_CLASS[e.kind]}`}
                  >
                    {KIND_LABEL[e.kind]}
                  </Badge>
                  <span className="leading-5 text-muted-foreground">{e.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
