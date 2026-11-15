import { NextResponse } from 'next/server'
import { getActivePublicTournament } from '@/lib/tournament'

export async function GET() {
  const data = await getActivePublicTournament()
  return NextResponse.json({ tournament: data })
}
