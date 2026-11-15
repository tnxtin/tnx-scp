/**
 * Instalador de la Web · Tnx · Social Chess Pairing
 *
 * Asistente que configura la web para producción:
 *   1. Elige base de datos: SQLite (local) o MariaDB/MySQL (servidor)
 *   2. Pide los parámetros de conexión y crea la base si hace falta
 *   3. Pide los datos del administrador (admin)
 *   4. Escribe .env y prisma/schema.prisma, aplica el esquema y siembra el admin
 *
 * Uso:
 *   bun scripts/install-web.ts                # interactivo
 *   bun scripts/install-web.ts --db sqlite \
 *     --admin-user admin --admin-pass 'mi_contraseña' --admin-name 'Administrador' \
 *     [--demo] [--port 3000] [--force]        # desasistido
 *   (MariaDB añade: --db-host --db-port --db-user --db-pass --db-name)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'
import { execSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

// se ejecuta desde la raíz del proyecto: bun scripts/install-web.ts
const ROOT = process.cwd().replace(/\/$/, '') + '/'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)
const NONINTERACTIVE = flag('yes') || flag('force') || arg('db') !== undefined

const rl = readline.createInterface({ input, output })

async function ask(q: string, def = ''): Promise<string> {
  const hint = def ? ` [${def}]` : ''
  const a = (await rl.question(`${q}${hint}: `)).trim()
  return a || def
}
async function askSecret(q: string, def = ''): Promise<string> {
  const hint = def ? ` [${def}]` : ''
  const a = (await rl.question(`${q}${hint}: `)).trim()
  return a || def
}
async function confirm(q: string, def = true): Promise<boolean> {
  if (NONINTERACTIVE) return def
  const a = (await rl.question(`${q} [s/n, def. ${def ? 's' : 'n'}]: `)).trim().toLowerCase()
  if (!a) return def
  return a === 's' || a === 'si' || a === 'sí' || a === 'y' || a === 'yes'
}
function die(msg: string): never {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
function run(cmd: string, extraEnv: Record<string, string> = {}) {
  console.log(`  ▸ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, env: { ...process.env, ...extraEnv } })
}

/* ------------------------------------------------------------------ */

console.log(`
╔══════════════════════════════════════════════════╗
║   Tnx · Social Chess Pairing — Instalador Web    ║
║   GPL-3.0-or-later · clubes, escuelas, centros   ║
╚══════════════════════════════════════════════════╝
`)

/* 1 · base de datos ------------------------------------------------ */
type DbType = 'sqlite' | 'mariadb'
let dbType: DbType = (arg('db') as DbType) ?? 'sqlite'
if (!['sqlite', 'mariadb'].includes(dbType)) die('--db debe ser "sqlite" o "mariadb"')

if (!NONINTERACTIVE) {
  const a = await ask('Base de datos: 1) SQLite (local) 2) MariaDB/MySQL (servidor)', '1')
  dbType = a === '2' || a.toLowerCase() === 'mariadb' || a.toLowerCase() === 'mysql' ? 'mariadb' : 'sqlite'
}

let dbUrl = ''
if (dbType === 'sqlite') {
  const file = arg('db-file') ?? 'db/custom.db'
  dbUrl = `file:${ROOT}${file}`
  if (existsSync(`${ROOT}${file}`) && !flag('force'))
    die(`La base de datos ${file} ya existe. Usa --force si quieres reinstalar sobre ella.`)
  console.log(`  ▸ SQLite: ${file}`)
} else {
  const host = arg('db-host') ?? (NONINTERACTIVE ? die('--db-host es obligatorio con MariaDB') : await ask('Host de MariaDB', '127.0.0.1'))
  const port = arg('db-port') ?? (NONINTERACTIVE ? '3306' : await ask('Puerto', '3306'))
  const user = arg('db-user') ?? (NONINTERACTIVE ? die('--db-user es obligatorio con MariaDB') : await ask('Usuario de la BD', 'tnxscp'))
  const pass = arg('db-pass') ?? (NONINTERACTIVE ? die('--db-pass es obligatorio con MariaDB') : await askSecret('Contraseña de la BD'))
  const name = arg('db-name') ?? (NONINTERACTIVE ? die('--db-name es obligatorio con MariaDB') : await ask('Nombre de la base de datos', 'tnx_scp'))

  // la base debe existir (Prisma no la crea): la creamos por mysql2
  const { createConnection } = await import('mysql2/promise')
  try {
    console.log(`  ▸ Conectando a ${host}:${port}…`)
    const conn = await createConnection({ host, port: Number(port), user, password: pass })
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await conn.end()
    console.log(`  ▸ Base de datos \`${name}\` lista (utf8mb4)`)
  } catch (e) {
    die(`No se pudo conectar a MariaDB/MySQL: ${e instanceof Error ? e.message : e}
    Comprueba host, puerto, usuario y contraseña; y que el usuario pueda crear bases de datos.`)
  }
  dbUrl = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`
}

/* 2 · administrador ------------------------------------------------- */
const adminUser = (arg('admin-user') ?? (NONINTERACTIVE ? 'admin' : await ask('Usuario del administrador', 'admin'))).trim().toLowerCase()
const adminName = (arg('admin-name') ?? (NONINTERACTIVE ? 'Administrador' : await ask('Nombre del administrador', 'Administrador'))).trim()
let adminPass = arg('admin-pass') ?? ''
if (!NONINTERACTIVE && !adminPass) {
  adminPass = await askSecret('Contraseña del administrador (mín. 8 caracteres)')
  if (adminPass.length < 8) die('La contraseña debe tener al menos 8 caracteres')
  const repite = await askSecret('Repite la contraseña')
  if (repite !== adminPass) die('Las contraseñas no coinciden')
}
if (!adminPass || adminPass.length < 8) {
  die('--admin-pass es obligatoria (mín. 8 caracteres)')
}

/* 3 · puerto -------------------------------------------------------- */
const port = arg('port') ?? (NONINTERACTIVE ? '3000' : await ask('Puerto de la web', '3000'))

/* 4 · torneo de ejemplo --------------------------------------------- */
const hayDemo = existsSync(`${ROOT}scripts/seed-state.json`)
const demo = flag('demo') || (hayDemo && !NONINTERACTIVE && (await confirm('¿Cargar el torneo de ejemplo (104 inscritos Málaga)?', false)))

/* 5 · resumen y confirmación ---------------------------------------- */
console.log(`
──────────────────────────────────────────
  Base de datos : ${dbType === 'sqlite' ? 'SQLite (local)' : 'MariaDB/MySQL (servidor)'}
  Admin         : ${adminUser} (${adminName})
  Puerto web    : ${port}
  Demo 104      : ${demo ? 'sí' : 'no'}
──────────────────────────────────────────`)
if (!NONINTERACTIVE && !(await confirm('¿Todo correcto? Instalamos', true))) {
  console.log('Instalación cancelada.')
  process.exit(0)
}

/* 6 · .env ---------------------------------------------------------- */
const envPath = `${ROOT}.env`
const envPrev = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const authSecret =
  envPrev.match(/^AUTH_SECRET=(.+)$/m)?.[1] ?? randomBytes(32).toString('hex')
writeFileSync(
  envPath,
  `DATABASE_URL=${dbUrl}\nAUTH_SECRET=${authSecret}\nPORT=${port}\n`,
)
console.log('  ▸ .env escrito')
process.env.DATABASE_URL = dbUrl

/* 7 · schema.prisma: proveedor según la BD -------------------------- */
const schemaPath = `${ROOT}prisma/schema.prisma`
if (!existsSync(schemaPath)) die('No encuentro prisma/schema.prisma')
let schema = readFileSync(schemaPath, 'utf8')
schema = schema.replace(
  /datasource db \{[^}]*\}/,
  dbType === 'sqlite'
    ? 'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}'
    : 'datasource db {\n  provider = "mysql"\n  url      = env("DATABASE_URL")\n}',
)
writeFileSync(schemaPath, schema)
console.log(`  ▸ prisma/schema.prisma: provider ${dbType === 'sqlite' ? 'sqlite' : 'mysql'}`)

/* 8 · aplicar esquema ----------------------------------------------- */
console.log('  ▸ Aplicando esquema (prisma db push)…')
run(`bunx prisma db push${flag('force') ? ' --accept-data-loss' : ''}`, { DATABASE_URL: dbUrl })
run('bunx prisma generate', { DATABASE_URL: dbUrl })

/* 9 · admin + demo --------------------------------------------------- */
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
const existente = await prisma.user.findUnique({ where: { username: adminUser } })
if (existente) {
  await prisma.user.update({
    where: { username: adminUser },
    data: { passwordHash: hashPassword(adminPass), name: adminName, role: 'ADMIN', active: true },
  })
  console.log(`  ▸ Admin «${adminUser}» actualizado`)
} else {
  await prisma.user.create({
    data: { username: adminUser, name: adminName, role: 'ADMIN', passwordHash: hashPassword(adminPass) },
  })
  console.log(`  ▸ Admin «${adminUser}» creado`)
}

if (demo) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: adminUser } })
  const yaTiene = await prisma.tournament.findFirst({ where: { createdById: admin.id } })
  const state = JSON.parse(readFileSync(`${ROOT}scripts/seed-state.json`, 'utf8')).state
  if (yaTiene || !state?.players?.length) {
    console.log('  ▸ Demo omitida (ya hay torneos o no hay datos de ejemplo)')
  } else {
    const t = await prisma.tournament.create({
      data: {
        name: 'XX Open Internacional Sub 2400 · Ciudad de Málaga',
        totalRounds: state.totalRounds ?? 7,
        byePoints: state.byePoints ?? 0.5,
        status: 'ACTIVO',
        createdById: admin.id,
      },
    })
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i]
      await prisma.tournamentPlayer.create({
        // conservar el id del estado: las rondas importadas lo referencian
        data: { id: p.id, tournamentId: t.id, name: p.name, club: p.club ?? '', elo: p.elo ?? null, order: i },
      })
    }
    for (const r of state.rounds ?? []) {
      await prisma.tournamentRound.create({
        data: {
          tournamentId: t.id,
          number: r.number,
          seed: r.seed,
          groupsJson: JSON.stringify(r.groups),
          gamesJson: JSON.stringify(r.games),
          byesJson: JSON.stringify(r.byes),
          ratingsJson: JSON.stringify(r.ratings),
        },
      })
    }
    console.log(`  ▸ Torneo de ejemplo creado (${state.players.length} jugadores)`)
  }
}
await prisma.$disconnect()

/* 10 · listo --------------------------------------------------------- */
console.log(`
✔ Instalación completada.

  Siguiente paso:
    bun run build     # compila la web para producción
    bun run start     # sirve en http://localhost:${port}

  (Bun lee .env automáticamente: DATABASE_URL, AUTH_SECRET y PORT)
  Panel de administración: http://localhost:${port}/login — usuario «${adminUser}»
`)
process.exit(0)
