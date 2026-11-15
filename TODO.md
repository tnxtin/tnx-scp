# TODO · desarrollo pendiente

> Marca las casillas al completar. Cada bloque es independiente; el orden
> sugerido es el de aparición.

## 1 · Informe para FADA (Lista ELO)

Los ELO virtuales (`~`) son un **remedio interno para poder emparejar**:
no deben aparecer jamás en el informe que se envía a FADA para la lista ELO.

- [ ] Confirmar con FADA el formato exacto de entrega (¿TRF16 estándar FIDE
      o plantilla propia de FADA?). Depende del formato: escritura de
      fichero `.txt`/`.trf` o CSV para su portal.
- [ ] Decidir qué partidas entran: los jugadores **con ELO real** van con
      su elo y sus resultados; los jugadores virtuales se listan como
      **sin rating** (sus partidas cuentan solo para el rival con ELO real,
      nunca se envía el valor virtual).
- [ ] Datos que debe llevar cada línea de informe:
      - jugador (nombre, FIDE ID — falta añadir este campo, ver §2)
      - ELO real (FADA y/o FIDE según pida FADA)
      - ronda a ronda: color, rival (nombre + FIDE ID) y resultado
- [ ] Exclusión estricta de valores virtuales: cualquier `~elo` calculado
      por el motor queda **fuera** del informe (test con torneo mixto
      verificando que no aparece ni un `~`).
- [ ] UI: botón «Informe FADA» en el panel del árbitro (por torneo) que
      descargue el fichero generado.
- [ ] Validación previa: avisar si el torneo tiene partidas pendientes de
      resultado.

## 2 · Ratings múltiples por jugador

Hoy el jugador tiene un único `elo`. Se piden **cuatro ratings reales**:

| Campo | Descripción | Origen típico |
|---|---|---|
| `eloFada` | ELO de la Federación Andaluza | lista FADA mensual |
| `eloFide` | ELO internacional FIDE | lista FIDE mensual |
| `eloClub` | ELO interno del club | el propio club |
| `eloUscf` | Rating norteamericano (USCF) | lista USCF |

- [ ] **Modelo (Prisma)**: añadir los 4 campos `Int?` a `TournamentPlayer`
      (y a `User`… no: los ratings son del jugador de torneo, no del
      usuario). `db push` (SQLite) — campos genéricos válidos también para
      MariaDB/MySQL/Postgres.
- [ ] **Migración de datos**: el `elo` actual pasa a ser `eloFide`
      (decisión sugerida; confirmar).
- [ ] **Orden de emparejamiento (decisión clave)**: cadena de prioridad
      para la tabla de emparejamiento:
      `eloFide → eloFada → eloClub → eloUscf → Elo virtual (~)`.
      El Elo virtual sigue existiendo SOLO como remedio interno de
      emparejamiento (nunca sale en informes, ver §1).
      → Refactor de `effectiveRatings()` en el motor para usar la cadena
      y exponer qué rating se usó (para mostrarlo en la ficha).
- [ ] **UI alta/edición de jugadores** (PlayersView): inputs compactos
      para los 4 ratings; si no caben, sección desplegable «ratings».
- [ ] **Ficha de jugador** (PlayerInfoDialog): mostrar los 4 ratings con
      qué valor se usó para emparejar.
- [ ] **API** `PUT /api/tournaments/[id]/players`: aceptar y validar los 4
      campos (rangos 100–3500, opcionalmente null).
- [ ] **Importador info64**: las tablas de info64 traen columna FIDE y
      columna FEDA — mapearlas directamente a `eloFide` y `eloFada`
      (el simulador actual solo lee la FIDE).
- [ ] **Informe FADA (§1)**: usar `eloFada` como ELO del jugador en el
      informe.
- [ ] **App de escritorio** (aparcada): replicar campos y cadena de
      prioridad cuando se retome.

### Enlazar las altas con las bases de datos de FADA y FIDE

Al dar de alta un jugador nuevo, poder **traer sus datos reales** (nombre,
FIDE ID, `eloFide`, `eloFada`) en vez de teclearlos a mano.

- [ ] Investigar fuentes disponibles:
      - **FIDE**: listas mensuales descargables
        (ratings.fide.com → download_lists) con nombre, FIDE ID, fed. y
        elo estándar/rapid/blitz.
      - **FEDA/FADA**: página de consulta de licencias/ratings — ¿existe
        API o solo HTML? Valorar también info64.org, que ya agrega FIDE +
        FEDA por jugador.
- [ ] **Decisión de arquitectura** (abierta por el usuario):
      - **Opción A — Espejo mensual en el servidor huésped** (recomendada):
        descargar la lista oficial cuando se publica, guardarla en una
        tabla local (`player_rating_mirror`) y consultarla desde el alta.
        Rápida, funciona aunque caiga la web del tercero, una sola fuente
        de verdad por mes.
      - **Opción B — Consulta directa**: buscar en el portal de FEDA/FIDE
        en el momento del alta. Siempre al día, pero depende de su web
        (puede cambiar de HTML o caerse) y añade latencia al alta.
      - **Híbrida**: espejo mensual + búsqueda directa como refresco
        puntual cuando el jugador no aparece en el espejo.
- [ ] UX del alta: campo «Buscar en FIDE/FADA…» (por nombre o FIDE ID) con
      sugerencias; al elegir, rellena nombre, FIDE ID, `eloFide` y
      `eloFada` de la ficha.
- [ ] Tareas técnicas si se elige el espejo: tabla `player_rating_mirror`,
      job de descarga mensual, endpoint `/api/ratings/search?q=`,
      autocompletado en PlayersView.
- [ ] Revisar las condiciones de uso de los datos de FIDE/FEDA antes de
      redistribuirlos en el espejo.

## 3 · Ideas relacionadas (sin fecha)

- [ ] Informe FIDE (TRF16) además del de FADA — comparte el 90 % del
      trabajo de §1.
- [ ] Selector de «rating activo» por torneo (p. ej. torneo jugado solo
      con ELO Club).
