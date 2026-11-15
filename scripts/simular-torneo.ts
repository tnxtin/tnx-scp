/**
 * Simulador de torneos para la web — carga jugadores reales (de info64.org
 * o de un fichero JSON) y juega TODAS las rondas con resultados simulados
 * según el Elo efectivo (favorito gana con alguma sorpresa y ~24% tablas).
 *
 *   bun scripts/simular-torneo.ts --name "I Open Internacional Fugaro · Marbella" \
 *     --rounds 10 --owner admin --players-file scripts/fugaro-marbella.json \
 *     [--url https://info64.org/…] [--status FINALIZADO] [--seed 2026]
 *
 * Estado final por defecto: FINALIZADO (queda en «Realizados» en la frontal).
 */
import { readFileSync, existsSync } from 'node:fs'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const ROOT = process.cwd().replace(/\/$/, '') + '/'

interface JugadorIn { name: string; club?: string; elo?: number | null }

/** Parser de la tabla de inscritos de info64.org */
function parseInfo64(html: string): JugadorIn[] {
  const filas = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []
  const jugadores: JugadorIn[] = []
  for (const fila of filas.slice(1)) {
    const celdas = [...fila.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim(),
    )
    if (celdas.length < 8 || !celdas[2]) continue
    const elo = /^\d+$/.test(celdas[4]) && celdas[4] !== '0' ? Number(celdas[4]) : null
    jugadores.push({ name: celdas[2], club: celdas[celdas.length - 1], elo })
  }
  return jugadores
}

/** mulberry32 determinista */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function main() {
  const name = arg('name') ?? 'Torneo simulado'
  const rounds = Number(arg('rounds') ?? 7)
  const owner = arg('owner') ?? 'admin'
  const statusFinal = arg('status') ?? 'FINALIZADO'
  const baseSeed = Number(arg('seed') ?? 2026)
  const playersFile = arg('players-file')
  const url = arg('url')

  let jugadores: JugadorIn[]
  if (playersFile && existsSync(playersFile)) {
    jugadores = JSON.parse(readFileSync(playersFile, 'utf8'))
    console.log(`Jugadores desde ${playersFile}: ${jugadores.length}`)
  } else if (url) {
    console.log(`Descargando inscritos de ${url}…`)
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    jugadores = parseInfo64(await res.text())
    console.log(`Jugadores parseados: ${jugadores.length}`)
  } else {
    throw new Error('Hace falta --players-file o --url')
  }
  if (jugadores.length < 2) throw new Error('Menos de 2 jugadores')
  if (!Number.isInteger(rounds) || rounds < 2 || rounds > 12)
    throw new Error('Rondas debe ser un número entre 2 y 12')

  const { PrismaClient } = await import('@prisma/client')
  const { generateRound } = await import('../src/lib/pairing/engine')
  const { computePoints } = await import('../src/lib/pairing/engine')
  const prisma = new PrismaClient()

  const admin = await prisma.user.findUnique({ where: { username: owner } })
  if (!admin) throw new Error(`No existe el usuario propietario «${owner}»`)

  const t = await prisma.tournament.create({
    data: {
      name,
      totalRounds: rounds,
      byePoints: 1,
      status: 'ACTIVO',
      createdById: admin.id,
    },
  })
  console.log(`Torneo creado: ${t.name} (${t.id})`)

  const players = []
  for (let i = 0; i < jugadores.length; i++) {
    const p = jugadores[i]
    const row = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: t.id,
        name: p.name,
        club: p.club ?? '',
        elo: p.elo ?? null,
        order: i,
      },
    })
    players.push({ id: row.id, name: row.name, club: row.club, elo: row.elo })
  }

  const rng = mulberry32(baseSeed)
  const previousRounds: Parameters<typeof generateRound>[0]['previousRounds'] = []

  for (let r = 1; r <= rounds; r++) {
    const seed = (baseSeed * 7919 + r * 104729) >>> 0
    const round = generateRound({
      players,
      totalRounds: rounds,
      byePoints: 1,
      previousRounds,
      seed,
    })
    const eloDe = new Map(round.ratings.map((x) => [x.playerId, x.effectiveElo]))
    for (const g of round.games) {
      const eloW = eloDe.get(g.whiteId) ?? 1500
      const eloB = eloDe.get(g.blackId) ?? 1500
      const roll = rng()
      if (roll < 0.24) {
        g.result = '1/2'
      } else {
        const favoritoBlancas = eloW >= eloB
        const sorpresa = rng() < 0.13
        const gananBlancas = favoritoBlancas ? !sorpresa : sorpresa
        g.result = gananBlancas ? '1-0' : '0-1'
      }
    }
    await prisma.tournamentRound.create({
      data: {
        tournamentId: t.id,
        number: round.number,
        seed: round.seed,
        groupsJson: JSON.stringify(round.groups),
        gamesJson: JSON.stringify(round.games),
        byesJson: JSON.stringify(round.byes),
        ratingsJson: JSON.stringify(round.ratings),
      },
    })
    previousRounds.push(round)
    const byes = round.byes.length
    console.log(
      `  Ronda ${r}/${rounds}: ${round.games.length} mesas, ${round.groupCount} grupos${byes ? `, ${byes} bye(s)` : ''}`,
    )
  }

  if (statusFinal !== 'ACTIVO') {
    await prisma.tournament.update({ where: { id: t.id }, data: { status: statusFinal } })
  }

  const pts = computePoints(
    players,
    previousRounds.map((round) => ({ ...round, byes: round.byes.map((b) => ({ ...b, points: 1 })) })),
    1,
  )
  const top = Object.entries(pts)
    .map(([id, p]) => ({ name: players.find((x) => x.id === id)!.name, pts: p }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5)
  console.log('\nTop 5 simulado:')
  top.forEach((x, i) => console.log(`  ${i + 1}. ${x.name} — ${x.pts} pts`))
  console.log(`\nEstado final: ${statusFinal}`)

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('✖', e instanceof Error ? e.message : e)
    process.exit(1)
  })
