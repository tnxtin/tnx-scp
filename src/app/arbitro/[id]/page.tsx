import { TournamentEditor } from '@/components/arbitro/tournament-editor'
import { PageContainer } from '@/components/site/section'

export default async function ArbitroTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <PageContainer>
      <TournamentEditor id={id} />
    </PageContainer>
  )
}
