import { notFound } from 'next/navigation'
import { getPlayersPageData } from '@/lib/public-site'
import { PlayersPage } from '@/components/players/players-page'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

/** Listado de jugadores de un torneo concreto. */
export default async function JugadoresTorneoPage({
  params,
}: {
  params: Promise<{ torneoId: string }>
}) {
  const { torneoId } = await params
  const data = await getPlayersPageData(torneoId)
  if (!data.tournament) notFound()
  return <PlayersPage {...data} />
}
