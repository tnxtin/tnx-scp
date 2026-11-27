# Social Chess Pairing ( Tnx )
#### Titulo Apreviado **SCP**: 
## Historia

Hace casi 30 años, hice un programa en DBase IV  para crear un ELO interno del Club Ajedrez Benalmadena, Era muy adictivo, y habia muchos piques para ver quienes eran los mejores del club. En aquella epoca se imprimia en papel cada semana el viernes.Y cada jugador tenia una tarjeta donde apuntaba el numero del rival y los resultados. Habia solo dos ritmos, Blitz y Rapidas. 

Luego se me ocurrio desarrollarlo con otra idea, pero la vida da muchas vuentas y lo aparque.  

Pero...he vuelto y ademas con una experiencia enorme como arbitro. Y de las triquiñuelas de los jugadores.  

Desde que aprendi la forma de elaborar un emparejamiento por el metodo Suizo, pensaba que era un sistema no muy justo, y sobre todo cuando el numero de rondas es pequeño en los torneos con muchos jugadores.  
Por otro lado, veia que jugadores sin Rating ( ELO ), podian jugar muy bien y destrozar la logica de un torneo en los puestos.  

Por ello, este sistema que propongo, acaba con esos dos problemas. Tiene el inconveniente que se hacen calculos que un arbitro con papel no podria elaborarlo. Implica calculos logaritmica y exponenciales.  

Todavia me queda la duda si aplicar logaritmos Neperianos o sistemas Exponenciales. En estos primeros desarrollo lo hare con exponenciales, y mas adelante, dare a elegir si se desea hacer el torneo con exponenciales o Neperianos. 
Tengo que investigar cogiendo multiples suizod de torneos reales y comparar las curvas de los puntos-jugadorees-rondas para ver cuales son las curvas mas idoneas.

La intencion ahora es de crear  la logica y ponerla al principio como Web y CLI ( Terminal o Prompts ). 
Los siguientes pasos es hacer un programa GUI, para  Windows, Linux, Mac.  
Y finalmente para moviles con apk...pero solo para introduccio n  de resultados para arbitros y visualizacion para los jugadores.  
Porque **Social**: Es un software para entidades que no quieren o no ueden tener un gasto economico en la eloaboracion de un Torneo. Hare una cuenta para donaciones y que pueda pagar los gastos de ponerlo en un hosting.  

Mas adelante, hare u suizo clasico, con todos los conceptos que ello conlleva.







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

- **Web pública** (`/`): para los jugadores, sin cuenta. La **portada** muestra los últimos torneos y el listado de jugadores, y explica cómo funciona el sistema. Cada torneo (`/torneo/…`) se consulta en solo lectura: emparejamientos por grupos, ranking inicial y clasificación. Cada jugador tiene **ficha** con su evolución: se abre desde el listado (`/jugadores`, subenlace «Ver ficha») o con el icono ℹ de las tablas del torneo.
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
│   ├── page.tsx               # portada: últimos torneos, jugadores, cómo funciona y FAQ
│   ├── torneos/page.tsx       # lista completa de torneos en 3 apartados (en juego / por comenzar / realizados)
│   ├── torneo/[id]/page.tsx   # página pública de un torneo (solo lectura)
│   ├── jugadores/             # listado de jugadores y ficha (/jugadores/[torneo]/[jugador])
│   ├── wiki/  changelog/      # documentación del sistema e historial de versiones
│   ├── login/                 # acceso árbitros/auxiliares/admin
│   ├── admin/                 # panel del administrador
│   ├── arbitro/               # panel del árbitro (lista + /arbitro/[id] editor)
│   ├── auxiliar/              # panel del auxiliar (solo resultados)
│   └── api/                   # auth, public, tournaments, admin
├── components/
│   ├── chess/                 # piezas de ajedrez en SVG (motivos de la web pública)
│   ├── site/                  # estilo común: secciones, cabeceras de página y tarjeta
│   ├── landing/               # portada (cabecera con damero, tarjetas de torneo)
│   ├── players/               # listado de jugadores y ficha (página y diálogo ℹ)
│   ├── tournament/            # RoundsView, PlayersView, StandingsView, FAQ, explicaciones
│   ├── arbitro/               # paneles de árbitro/auxiliar
│   ├── admin/                 # panel de administración
│   └── ui/                    # shadcn/ui
├── lib/
│   ├── pairing/engine.ts      # motor (funciones puras, sin cambios)
│   ├── auth.ts                # scrypt + JWT + sesión
│   ├── tournament.ts          # carga/permisos de torneos
│   ├── public-site.ts         # datos de la web pública: portada, listado y ficha
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
