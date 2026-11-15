import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword, type Role } from '@/lib/auth'

const ROLES: Role[] = ['ADMIN', 'ARBITRO', 'AUXILIAR']

interface ProfileFields {
  apellidos: string
  pais: string
  comunidad: string
  provincia: string
  municipio: string
  cp: string
  movil: string
  email: string | null
  tituloArbitro: string
}

function extractProfile(body: Record<string, unknown>): ProfileFields {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const email = str(body.email)
  return {
    apellidos: str(body.apellidos),
    pais: str(body.pais),
    comunidad: str(body.comunidad),
    provincia: str(body.provincia),
    municipio: str(body.municipio),
    cp: str(body.cp),
    movil: str(body.movil),
    email: email || null,
    tituloArbitro: str(body.tituloArbitro),
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const users = await db.user.findMany({
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      supervisor: { select: { name: true } },
      apellidos: true,
      pais: true,
      comunidad: true,
      provincia: true,
      municipio: true,
      cp: true,
      movil: true,
      email: true,
      tituloArbitro: true,
      _count: { select: { tournaments: true, auxiliares: true } },
    },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    username?: string
    nombre?: string
    name?: string
    password?: string
    role?: string
    supervisorId?: string
  }
  const username = body.username?.trim().toLowerCase()
  const nombre = (body.nombre ?? body.name)?.trim() ?? ''
  const password = body.password ?? ''
  const role = body.role as Role
  if (!username || !nombre || !password || !ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Usuario, nombre, contraseña y rol son obligatorios' },
      { status: 400 },
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres' },
      { status: 400 },
    )
  }
  if (role === 'AUXILIAR' && !body.supervisorId) {
    return NextResponse.json(
      { error: 'Un auxiliar necesita un árbitro supervisor' },
      { status: 400 },
    )
  }
  const profile = extractProfile(body)
  // datos fundamentales obligatorios para dar de alta un árbitro
  if (role === 'ARBITRO') {
    const faltan: string[] = []
    if (!profile.apellidos) faltan.push('apellidos')
    if (!profile.pais) faltan.push('país')
    if (!profile.comunidad) faltan.push('comunidad autónoma')
    if (!profile.provincia) faltan.push('provincia')
    if (!profile.municipio) faltan.push('municipio')
    if (!profile.cp) faltan.push('CP')
    if (!profile.movil) faltan.push('móvil')
    if (!profile.email) faltan.push('email')
    if (!profile.tituloArbitro) faltan.push('título de árbitro')
    if (faltan.length > 0) {
      return NextResponse.json(
        { error: `Faltan datos del árbitro: ${faltan.join(', ')}` },
        { status: 400 },
      )
    }
  }
  if (profile.email && !EMAIL_RE.test(profile.email)) {
    return NextResponse.json({ error: 'El email no tiene un formato válido' }, { status: 400 })
  }
  const exists = await db.user.findUnique({ where: { username } })
  if (exists) {
    return NextResponse.json({ error: 'Ese usuario ya existe' }, { status: 409 })
  }
  const emailTaken = profile.email
    ? await db.user.findUnique({ where: { email: profile.email } })
    : null
  if (emailTaken) {
    return NextResponse.json({ error: 'Ese email ya está en uso' }, { status: 409 })
  }
  const created = await db.user.create({
    data: {
      username,
      // nombre visible compuesto: «Nombre Apellidos»
      name: [nombre, profile.apellidos].filter(Boolean).join(' '),
      passwordHash: hashPassword(password),
      role,
      supervisorId: role === 'AUXILIAR' ? body.supervisorId : null,
      ...profile,
    },
  })
  return NextResponse.json({ ok: true, id: created.id })
}
