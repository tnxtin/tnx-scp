import { getActivePublicTournament } from '@/lib/tournament'
import { PublicTournamentView } from '@/components/tournament/public-view'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export default async function Home() {
  const data = await getActivePublicTournament()
  return <PublicTournamentView data={data} />
}
