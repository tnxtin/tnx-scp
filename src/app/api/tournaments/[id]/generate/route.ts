import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { loadTournament, tournamentPermissions, toGeneratedRound } from '@/lib/tournament'
import { generateRound } from '@/lib/pairing/engine'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
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
  if (!perms.canGenerate) {
    return NextResponse.json(
      { error: 'Solo el árbitro puede generar rondas' },
      { status: 403 },
    )
  }
  if (tournament.players.length < 2) {
    return NextResponse.json(
      { error: 'Se necesitan al menos 2 jugadores para emparejar.' },
      { status: 400 },
    )
  }
  const pending = tournament.rounds.some((r) => r.games.some((g) => !g.result))
  if (pending) {
    return NextResponse.json(
      { error: 'Hay partidas sin resultado. Introdúcelas antes de continuar.' },
      { status: 409 },
    )
  }
  if (tournament.rounds.length >= tournament.totalRounds) {
    return NextResponse.json(
      { error: 'Ya se han completado todas las rondas del torneo.' },
      { status: 409 },
    )
  }
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
  let round
  try {
    round = generateRound({
      players: tournament.players,
      totalRounds: tournament.totalRounds,
      byePoints: tournament.byePoints,
      previousRounds: tournament.rounds,
      seed,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al emparejar.' },
      { status: 400 },
    )
  }
  await db.tournamentRound.create({
    data: {
      tournamentId: id,
      number: round.number,
      seed: round.seed,
      groupsJson: JSON.stringify(round.groups),
      gamesJson: JSON.stringify(round.games),
      byesJson: JSON.stringify(round.byes),
      ratingsJson: JSON.stringify(round.ratings),
    },
  })
  // primer torneo activable: pasa de BORRADOR a ACTIVO al publicarse explícitamente,
  // pero cerramos la lista de jugadores de facto al existir ronda 1.
  const saved = await db.tournamentRound.findUnique({
    where: { tournamentId_number: { tournamentId: id, number: round.number } },
  })
  return NextResponse.json({
    ok: true,
    round: saved ? toGeneratedRound(saved) : round,
  })
}
