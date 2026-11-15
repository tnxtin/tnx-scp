# Sincronización SQLite local → SQL de servidor (DISEÑO, no implementado)

> Estado: **diseño** a fecha 2026-11-15. Nada de esto está implementado aún.
> Objetivo del usuario: los portátiles de árbitros trabajan offline con SQLite
> y «más adelante» se sube/sincroniza a una base SQL de servidor
> (MariaDB / MySQL / Postgres).

## Contrato actual que hace viable la sincronía

- **IDs UUID de texto** en torneos, jugadores y rondas (generados con
  `crypto.randomUUID`): no hay colisiones entre portátiles.
- **Tablas con los mismos nombres** en web y escritorio (`tournament`,
  `tournament_player`, `tournament_round`): mismo dominio, mismos blobs JSON
  para las rondas (el `GeneratedRound` del motor se reconstruye igual en
  cualquier parte).
- La web del servidor ya expone **API con autenticación por rol** (árbitro):
  el push/pull puede apoyarse en ella.

## LAGUNAS conocidas (resolver antes de implementar)

1. **Columnas**: la web (Prisma) usa camelCase (`totalRounds`), la app de
   escritorio snake_case (`total_rounds`). Unificar (sugerido: snake_case
   con `@map` en Prisma) o escribir un mapeador.
2. **Marcas de modificación**: solo el torneo tiene `updated_at`. La
   sincronía incremental necesita `updated_at` (o similar) por entidad
   (jugador, ronda).
3. **El clon web y la app escritorio usan esquemas distintos para lo
   mismo**: decidir un único formato canónico del SQLite local (se sugiere
   el del escritorio + vistas/compatibilidad en el clon).

## Opciones (A la simple, C la ambiciosa)

### A · Copia del .db + conversión
El árbitro copia `tnxpairing.db`/`custom.db` al servidor (USB o subida) y un
script convierte e inserta en MariaDB/MySQL (o Postgres). Por torneo
completo, sin tiempo real. Ideal como primer paso y como rescate.

### B · API push/pull del servidor (RECOMENDADA si hay varios árbitros)
El clon (o la app) llama a la API del servidor con credenciales de árbitro:
- `pull`: baja torneos del servidor.
- `push`: sube torneos/modificaciones locales (delta desde `updated_at`).
Requiere timestamps por entidad y resolución de conflictos definida.

### C · Motor SQL directo desde la app
`tauri-plugin-sql` ya compila con features `sqlite` y `mysql` (y soporta
`postgres`): la app escribiría en el servidor cuando hay red y en SQLite
cuando no, con cola de cambios. Más acoplado y con credenciales de BD en
cada portátil — solo tiene sentido en redes de confianza.

## Decisiones de producto pendientes (preguntar al usuario cuando toque)

1. ¿Quién sincroniza: el clon web, la app de escritorio, o ambas?
2. Conflictos: ¿última escritura gana, o por entidad/jugador?
3. ¿Qué se sincroniza: torneos propios del árbitro? ¿usuarios (no: los
   usuarios los gestiona el servidor)?
4. ¿Postgres entra de verdad o nos ceñimos a MariaDB/MySQL?

## Plan sugerido de implementación (cuando el usuario dé el vistoso)

1. Unificar el esquema local (una sola fuente de verdad, snake_case + `@map`).
2. Añadir `updated_at` por fila en jugador y ronda.
3. Endpoint `pull`/`push` en la web del servidor con auth de árbitro.
4. Comando `bun run sync --server https://… --token …` en el clon.
5. Botón «Sincronizar» en la app usando la misma API.
