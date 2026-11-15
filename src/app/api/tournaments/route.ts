import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { DEMO_PLAYERS } from '@/lib/demo-players'

interface CreatePlayerInput {
  name: string
  club?: string
  elo?: number | null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  let auxSupervisorId: string | null = null
  if (session.role === 'AUXILIAR') {
    const me = await db.user.findUnique({
      where: { id: session.uid },
      select: { supervisorId: true },
    })
    auxSupervisorId = me?.supervisorId ?? null
  }
  const where =
    session.role === 'ADMIN'
      ? {}
      : session.role === 'ARBITRO'
        ? { createdById: session.uid }
        : { createdById: auxSupervisorId ?? 'none' }
  const tournaments = await db.tournament.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { players: true, rounds: true } },
    },
  })
  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      totalRounds: t.totalRounds,
      byePoints: t.byePoints,
      status: t.status,
      createdByName: t.createdBy.name,
      createdById: t.createdById,
      playerCount: t._count.players,
      roundsPlayed: t._count.rounds,
      updatedAt: t.updatedAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.role !== 'ARBITRO' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    totalRounds?: number
    byePoints?: number
    seedDemo?: boolean
    players?: CreatePlayerInput[]
  }
  const name = body.name?.trim()
  const totalRounds = Number(body.totalRounds)
  const byePoints = Number(body.byePoints ?? 1)
  if (!name) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }
  if (!Number.isInteger(totalRounds) || totalRounds < 2 || totalRounds > 9) {
    return NextResponse.json(
      { error: 'Las rondas deben ser un número entre 2 y 9' },
      { status: 400 },
    )
  }
  if (byePoints !== 0.5 && byePoints !== 1) {
    return NextResponse.json(
      { error: 'Los puntos por bye deben ser 0,5 o 1' },
      { status: 400 },
    )
  }
  const inputs: CreatePlayerInput[] = Array.isArray(body.players)
    ? body.players.filter((p) => p?.name?.trim())
    : body.seedDemo
      ? DEMO_PLAYERS.map(([n, c, e]) => ({ name: n, club: c, elo: e }))
      : []
  const created = await db.tournament.create({
    data: {
      name,
      totalRounds,
      byePoints,
      status: 'BORRADOR',
      createdById: session.uid,
      players: {
        create: inputs.map((p, i) => ({
          name: p.name.trim(),
          club: p.club?.trim() ?? '',
          elo: typeof p.elo === 'number' ? p.elo : null,
          order: i,
        })),
      },
    },
    include: { _count: { select: { players: true, rounds: true } } },
  })
  return NextResponse.json({
    tournament: {
      id: created.id,
      name: created.name,
      totalRounds: created.totalRounds,
      byePoints: created.byePoints,
      status: created.status,
      playerCount: created._count.players,
      roundsPlayed: created._count.rounds,
    },
  })
}
