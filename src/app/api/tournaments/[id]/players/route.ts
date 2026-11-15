import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { loadTournament, tournamentPermissions } from '@/lib/tournament'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const tournament = await loadTournament(id)
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }
  const perms = tournamentPermissions(session, tournament)
  if (!perms.canEditPlayers) {
    return NextResponse.json(
      { error: 'Solo el árbitro puede gestionar jugadores' },
      { status: 403 },
    )
  }
  if (tournament.rounds.length > 0) {
    return NextResponse.json(
      { error: 'La lista está cerrada: hay rondas generadas. Reinicia las rondas para modificarla.' },
      { status: 409 },
    )
  }
  const body = (await req.json().catch(() => ({}))) as {
    players?: Array<{ name?: string; club?: string; elo?: number | null }>
  }
  const players = (body.players ?? []).filter((p) => p?.name?.trim())
  if (players.length < 2) {
    return NextResponse.json(
      { error: 'Se necesitan al menos 2 jugadores' },
      { status: 400 },
    )
  }
  await db.$transaction([
    db.tournamentPlayer.deleteMany({ where: { tournamentId: id } }),
    db.tournamentPlayer.createMany({
      data: players.map((p, i) => ({
        tournamentId: id,
        name: p.name!.trim(),
        club: p.club?.trim() ?? '',
        elo: typeof p.elo === 'number' ? p.elo : null,
        order: i,
      })),
    }),
  ])
  return NextResponse.json({ ok: true, count: players.length })
}
