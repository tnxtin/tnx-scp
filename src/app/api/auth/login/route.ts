import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  signSession,
  verifyPassword,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type Role,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string
    password?: string
  }
  const username = body.username?.trim()
  const password = body.password
  if (!username || !password) {
    return NextResponse.json(
      { error: 'Usuario y contraseña son obligatorios' },
      { status: 400 },
    )
  }
  const user = await db.user.findUnique({ where: { username } })
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: 'Usuario o contraseña incorrectos' },
      { status: 401 },
    )
  }
  const token = await signSession({
    uid: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
  })
  const res = NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
