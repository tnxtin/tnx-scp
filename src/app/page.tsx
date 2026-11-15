import { listPublicTournaments } from '@/lib/tournament'
import { HomePublicView } from '@/components/tournament/public-view'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export default async function Home() {
  const tournaments = await listPublicTournaments()
  return <HomePublicView tournaments={tournaments} />
}
