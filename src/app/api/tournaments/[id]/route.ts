import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { loadTournament, tournamentPermissions } from '@/lib/tournament'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const tournament = await loadTournament(id)
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }
  let auxSupervisorId: string | null = null
  if (session.role === 'AUXILIAR') {
    const me = await db.user.findUnique({ where: { id: session.uid }, select: { supervisorId: true } })
    auxSupervisorId = me?.supervisorId ?? null
  }
  const perms = tournamentPermissions(session, tournament, auxSupervisorId)
  if (!perms.canView) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  return NextResponse.json({ tournament, perms })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const tournament = await db.tournament.findUnique({ where: { id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }
  const isOwner = session.role === 'ARBITRO' && session.uid === tournament.createdById
  if (!isOwner && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    status?: string
  }
  const data: { name?: string; status?: string } = {}
  if (body.name?.trim()) data.name = body.name.trim()
  if (body.status && ['BORRADOR', 'ACTIVO', 'FINALIZADO'].includes(body.status)) {
    data.status = body.status
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }
  const updated = await db.tournament.update({ where: { id }, data })
  return NextResponse.json({ ok: true, status: updated.status, name: updated.name })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const tournament = await db.tournament.findUnique({ where: { id } })
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }
  const isOwner = session.role === 'ARBITRO' && session.uid === tournament.createdById
  if (!isOwner && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  await db.tournament.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
