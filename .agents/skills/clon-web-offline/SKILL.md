---
name: clon-web-offline
description: Monta, actualiza y opera el «clon offline» de la web de Tnx · Social Chess Pairing en portátiles y ordenadores de árbitros — la web completa con SQLite local, sin conexión, para que ningún árbitro se quede sin poder actualizar. Usar siempre que se mencione el «clon», trabajar offline en un portátil de árbitro, sincronizar el SQLite local hacia MariaDB/MySQL/Postgres, o preparar portátiles para clubes, escuelas y centros sociales — aunque no se diga la palabra «clon».
---

# Clon offline de la web (árbitros)

## Qué es el clon

La **web completa** corriendo en el portátil del árbitro con base de datos **SQLite local** (`db/custom.db`): login local, creación de torneos, generación de rondas, resultados y clasificación — todo sin conexión. Los datos viven en el fichero local hasta sincronizarlos con el servidor (ver la sección de sincronización al final).

No hace falta Tauri ni webkit para el clon: solo **Bun** y **git**. (Esos requisitos son de la app de escritorio, que es otra cosa.)

## Montar el clon en un portátil nuevo

```bash
git clone https://github.com/tnxtin/tnx-scp.git
cd tnx-scp
bun install
bun run install:web      # asistente: SQLite, datos del admin local, puerto
bun run build
bun run start            # http://localhost:3000
```

En el asistente, cada árbitro elige su usuario y contraseña **locales** (no hay que coordinarlas con nadie: el login del portátil es independiente del del servidor).

## Actualizar un clon existente

```bash
git pull                 # los datos de árbitros NO se tocan: db/*.db y .env no van en git
bun install
bunx prisma db push      # solo si el pull cambió prisma/schema.prisma
bun run build
```

⚠️ Si `prisma db push` avisa de que va a perder datos (drift): **respalda primero** `db/custom.db` y decide con el usuario; no aceptes pérdidas sin más.

## Operar offline

Todo el flujo árbitro funciona sin red: crear torneos, generar rondas, introducir resultados, clasificación y fichas. La pestaña pública del propio clon sirve para mostrar la clasificación en una pantalla del salón.

## Respaldo (recordárselo al árbitro a menudo)

Copiar `db/custom.db` a un USB o a Descargas. Con restaurar ese fichero en otro portátil (misma ruta) el clon recupera el torneo completo.

## Sincronización con el servidor (MariaDB / MySQL / Postgres)

**Antes de diseñar o implementar cualquier sincronización, leer `references/sincronizacion.md`.** Contiene el contrato actual, las tres opciones posibles y las decisiones de diseño que siguen abiertas (conflictos multi-árbitro, qué se sincroniza, autenticación). No improvisar el sync sin leerlo: hay decisiones de producto pendientes que el usuario aún no ha tomado.
