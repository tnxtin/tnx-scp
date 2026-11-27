import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerFichaData } from '@/lib/public-site'
import { PlayerFichaPage } from '@/components/players/player-ficha-page'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ torneoId: string; playerId: string }> }

/** El título lleva el nombre del jugador: así se reconoce el enlace al compartirlo. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { torneoId, playerId } = await params
  const data = await getPlayerFichaData(torneoId, playerId)
  const nombre = data?.players.find((p) => p.id === playerId)?.name
  return {
    title: nombre ? `Ficha de ${nombre} · ${data?.tournament.name}` : 'Ficha del jugador',
  }
}

/** Ficha pública de un jugador: subenlace del listado de jugadores. */
export default async function FichaPage({ params }: Params) {
  const { torneoId, playerId } = await params
  const data = await getPlayerFichaData(torneoId, playerId)
  if (!data) notFound()
  return <PlayerFichaPage {...data} />
}
