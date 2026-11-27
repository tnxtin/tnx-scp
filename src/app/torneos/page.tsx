import { getPublicTournaments } from '@/lib/public-site'
import { TournamentsIndex } from '@/components/tournament/tournaments-index'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Torneos · Tnx · Social Chess Pairing' }

export default async function TorneosPage() {
  const tournaments = await getPublicTournaments()
  return <TournamentsIndex tournaments={tournaments} />
}
