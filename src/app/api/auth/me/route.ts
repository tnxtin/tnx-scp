import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })
  // datos frescos de BD (por si cambia rol o se desactiva la cuenta)
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      supervisor: { select: { name: true } },
    },
  })
  if (!user || !user.active) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}
