/**
 * Seed inicial: usuario admin y torneo actual (exportado del navegador)
 * como ACTIVO y propiedad del admin.
 *
 *   bun scripts/seed.ts
 */
import { readFileSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

interface StoredState {
  state?: {
    players?: Array<{ id: string; name: string; club: string; elo: number | null }>
    totalRounds?: number
    byePoints?: number
    rounds?: Array<{
      number: number
      seed: number
      groups: unknown[]
      games: unknown[]
      byes: unknown[]
      ratings: unknown[]
    }>
  }
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrador',
      role: 'ADMIN',
      passwordHash: hashPassword('mi_contraseña'),
    },
  })
  console.log(`Admin listo: ${admin.username} (${admin.id})`)

  const existing = await prisma.tournament.findFirst({
    where: { createdById: admin.id },
  })
  if (existing) {
    console.log(`El admin ya tiene el torneo «${existing.name}»; no se duplica.`)
    return
  }

  const raw: StoredState = JSON.parse(
    readFileSync('scripts/seed-state.json', 'utf8'),
  )
  const st = raw.state
  if (!st?.players?.length) throw new Error('seed-state.json sin jugadores')

  const t = await prisma.tournament.create({
    data: {
      name: 'XX Open Internacional Sub 2400 · Ciudad de Málaga',
      totalRounds: st.totalRounds ?? 7,
      byePoints: st.byePoints ?? 0.5,
      status: 'ACTIVO',
      createdById: admin.id,
    },
  })
  await prisma.tournamentPlayer.createMany({
    data: st.players.map((p, i) => ({
      // conservar el id del estado: las rondas importadas lo referencian
      id: p.id,
      tournamentId: t.id,
      name: p.name,
      club: p.club ?? '',
      elo: p.elo ?? null,
      order: i,
    })),
  })
  for (const r of st.rounds ?? []) {
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
  console.log(
    `Torneo creado: «${t.name}» — ${st.players.length} jugadores, ${st.rounds?.length ?? 0} ronda(s), estado ACTIVO (${t.id})`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
