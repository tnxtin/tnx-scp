import { getPlayersPageData } from '@/lib/public-site'
import { PlayersPage } from '@/components/players/players-page'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Jugadores · Tnx · Social Chess Pairing' }

/** Listado de jugadores del torneo destacado (el que está en juego). */
export default async function JugadoresPage() {
  const data = await getPlayersPageData()
  return <PlayersPage {...data} />
}
