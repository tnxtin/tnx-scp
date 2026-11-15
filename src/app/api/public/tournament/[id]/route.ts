import { NextResponse } from 'next/server'
import { loadPublicTournamentById } from '@/lib/tournament'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const tournament = await loadPublicTournamentById(id)
  return NextResponse.json({ tournament })
}
