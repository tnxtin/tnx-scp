# Tnx · Social Chess Pairing

**Software libre** (GPL-3.0-or-later) para clubes, escuelas y centros sociales.

```bash
git clone https://github.com/tnxtin/tnx-scp.git
```

Sistema de emparejamiento de ajedrez **alternativo al sistema suizo**, con **grupos progresivos**, ratings virtuales para jugadores sin Elo y distribución aleatoria dentro de cada franja.

## Licencia

GPL-3.0-or-later — libre de ejecutar, estudiar, modificar y redistribuir (ver `LICENSE`).

## TODO de desarrollo

Ver [TODO.md](TODO.md) — informe FADA, ratings múltiples (FADA/FIDE/Club/USCF).

## Arquitectura

- **Web pública** (`/`): para los jugadores, sin cuenta. Muestra el torneo **ACTIVO** en solo lectura: emparejamientos por grupos, ranking inicial, clasificación y FAQ. Cada jugador tiene ficha con su evolución (icono ℹ).
- **Acceso arbitraje** (`/login`): usuario + contraseña. Tres roles:
  - **ADMIN** (`/admin`): crea árbitros y auxiliares, resetea contraseñas, activa/desactiva cuentas y ve todos los torneos.
  - **ARBITRO** (`/arbitro`): crea torneos (con opción de cargar los 104 inscritos de ejemplo), edita jugadores, genera rondas, introduce resultados y publica/oculta el torneo.
  - **AUXILIAR** (`/auxiliar`): ayuda a su árbitro introduciendo resultados. No puede generar rondas ni editar jugadores.
- **Sesiones**: JWT propio firmado con `jose` (cookie httpOnly `tnxpcs_session`, 7 días). Contraseñas con scrypt (`node:crypto`). Escudo de rutas en `src/proxy.ts` + re-verificación en cada API.

## Datos

Todo vive en **SQLite** vía Prisma (`db/custom.db`): usuarios, torneos, jugadores y rondas (el `GeneratedRound` del motor se guarda como blobs JSON). El motor de emparejamiento (`src/lib/pairing/engine.ts`) es puro y no ha cambiado.

## Instalación de la web (asistente)

```bash
bun install
bun run install:web
```

El asistente pregunta: base de datos (**SQLite** local o **MariaDB/MySQL** en servidor, con host, puerto, usuario, contraseña y nombre — crea la base si puede), datos del **administrador** (`admin`) y puerto. Escribe `.env`, aplica el esquema, siembra el admin y deja la lista para `bun run build && bun run start`.

Instalación manual:


```bash
bun install
bunx prisma db push          # crear/actualizar la BD
bun scripts/seed.ts          # admin + torneo de ejemplo (opcional)
bun run dev                  # http://localhost:3000
```

## Cuentas tras el seed

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `mi_contraseña` | Administrador (con el torneo XX Open Sub 2400 Málaga asignado) |

El admin crea árbitros y auxiliares desde su panel.

## Comprobaciones

```bash
bun scripts/test-engine.ts   # 652 comprobaciones del motor
npm run lint                 # ESLint
bunx tsc --noEmit            # tipos
```

## Estructura

```
src/
├── app/
│   ├── page.tsx               # frontal pública: lista de torneos en 3 apartados (en juego / por comenzar / realizados)
│   ├── torneo/[id]/page.tsx   # página pública de un torneo (solo lectura)
│   ├── login/                 # acceso árbitros/auxiliares/admin
│   ├── admin/                 # panel del administrador
│   ├── arbitro/               # panel del árbitro (lista + /arbitro/[id] editor)
│   ├── auxiliar/              # panel del auxiliar (solo resultados)
│   └── api/                   # auth, public, tournaments, admin
├── components/
│   ├── tournament/            # RoundsView, PlayersView, StandingsView, FAQ, explicaciones
│   ├── arbitro/               # paneles de árbitro/auxiliar
│   ├── admin/                 # panel de administración
│   └── ui/                    # shadcn/ui
├── lib/
│   ├── pairing/engine.ts      # motor (funciones puras, sin cambios)
│   ├── auth.ts                # scrypt + JWT + sesión
│   ├── tournament.ts          # carga/permisos de torneos
│   └── demo-players.ts        # 104 inscritos de ejemplo (Málaga)
├── proxy.ts                   # escudo de rutas por rol (antes middleware)
scripts/
├── seed.ts                    # seed: admin + torneo desde seed-state.json
├── seed-state.json            # estado exportado del torneo original
└── test-engine.ts             # suite del motor
```

## Notas técnicas

- Solo puede haber (por convenio) un torneo **ACTIVO** publicado; la web pública muestra el actualizado más recientemente entre los ACTIVO.
- La lista de jugadores se cierra al generar la ronda 1 (como en el diseño original).
- `next.config.ts` usa `output: standalone` para producción: `bun run build && bun run start`.
