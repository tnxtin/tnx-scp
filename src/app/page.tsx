import { getLandingData } from '@/lib/public-site'
import { LandingPage } from '@/components/landing/landing-page'

// siempre datos frescos: los resultados cambian mientras el árbitro arbitra
export const dynamic = 'force-dynamic'

export default async function Home() {
  const data = await getLandingData()
  return <LandingPage {...data} />
}
