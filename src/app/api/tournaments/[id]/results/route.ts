import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toGeneratedRound, tournamentPermissions } from '@/lib/tournament'

type Params = { params: Promise<{ id: string }> }

const VALID: Array<string | null> = ['1-0', '0-1', '1/2', null]

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    roundNumber?: number
    board?: number
    result?: string | null
  }
  const roundNumber = Number(body.roundNumber)
  const board = Number(body.board)
  const result = body.result === undefined ? null : body.result
  if (
    !Number.isInteger(roundNumber) ||
    roundNumber < 1 ||
    !Number.isInteger(board) ||
    board < 1 ||
    !VALID.includes(result)
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const tournament = await db.tournament.findUnique({
    where: { id },
    include: {
      rounds: { where: { number: roundNumber } },
    },
  })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  let auxSupervisorId: string | null = null
  if (session.role === 'AUXILIAR') {
    const me = await db.user.findUnique({
      where: { id: session.uid },
      select: { supervisorId: true },
    })
    auxSupervisorId = me?.supervisorId ?? null
  }
  const perms = tournamentPermissions(session, tournament, auxSupervisorId)
  if (!perms.canSetResults) {
    return NextResponse.json(
      { error: 'Sin permisos para introducir resultados' },
      { status: 403 },
    )
  }

  const row = tournament.rounds[0]
  if (!row) {
    return NextResponse.json({ error: 'Ronda no encontrada' }, { status: 404 })
  }
  const round = toGeneratedRound(row)
  const game = round.games.find((g) => g.board === board)
  if (!game) {
    return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
  }
  game.result = result as (typeof game)['result']
  await db.tournamentRound.update({
    where: { tournamentId_number: { tournamentId: id, number: roundNumber } },
    data: { gamesJson: JSON.stringify(round.games) },
  })
  return NextResponse.json({ ok: true })
}
