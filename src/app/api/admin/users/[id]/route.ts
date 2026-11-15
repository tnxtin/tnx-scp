import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string
    apellidos?: string
    pais?: string
    comunidad?: string
    provincia?: string
    municipio?: string
    cp?: string
    movil?: string
    email?: string | null
    tituloArbitro?: string
    password?: string
    active?: boolean
    supervisorId?: string | null
  }
  const data: {
    name?: string
    apellidos?: string
    pais?: string
    comunidad?: string
    provincia?: string
    municipio?: string
    cp?: string
    movil?: string
    email?: string | null
    tituloArbitro?: string
    passwordHash?: string
    active?: boolean
    supervisorId?: string | null
  } = {}
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined)
  const apellidos = str(body.apellidos)
  if (apellidos !== undefined) data.apellidos = apellidos
  if (body.pais !== undefined) data.pais = str(body.pais) ?? ''
  if (body.comunidad !== undefined) data.comunidad = str(body.comunidad) ?? ''
  if (body.provincia !== undefined) data.provincia = str(body.provincia) ?? ''
  if (body.municipio !== undefined) data.municipio = str(body.municipio) ?? ''
  if (body.cp !== undefined) data.cp = str(body.cp) ?? ''
  if (body.movil !== undefined) data.movil = str(body.movil) ?? ''
  if (body.email !== undefined) {
    const email = str(body.email) || null
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'El email no tiene un formato válido' }, { status: 400 })
    }
    data.email = email
  }
  if (body.tituloArbitro !== undefined) data.tituloArbitro = str(body.tituloArbitro) ?? ''
  // recomponer el nombre visible si cambian nombre o apellidos
  if (body.nombre?.trim() || apellidos !== undefined) {
    const user = await db.user.findUnique({ where: { id }, select: { name: true, apellidos: true } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    const nombre = body.nombre?.trim() ?? user.name.replace(` ${user.apellidos}`, '').trim()
    const aps = apellidos ?? user.apellidos
    data.name = [nombre, aps].filter(Boolean).join(' ')
  }
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 },
      )
    }
    data.passwordHash = hashPassword(body.password)
  }
  if (typeof body.active === 'boolean') data.active = body.active
  if (body.supervisorId !== undefined) data.supervisorId = body.supervisorId
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }
  try {
    await db.user.update({ where: { id }, data })
  } catch {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  if (session.uid === id) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta' },
      { status: 400 },
    )
  }
  const user = await db.user.findUnique({
    where: { id },
    include: { _count: { select: { tournaments: true, auxiliares: true } } },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user._count.tournaments > 0 || user._count.auxiliares > 0) {
    return NextResponse.json(
      {
        error:
          'El usuario tiene torneos o auxiliares asignados: desactívalo en lugar de eliminarlo.',
      },
      { status: 409 },
    )
  }
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
