import { loadPublicTournamentById } from '@/lib/tournament'
import { TournamentPublicView } from '@/components/tournament/public-view'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export default async function TorneoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadPublicTournamentById(id)
  return <TournamentPublicView data={data} />
}
