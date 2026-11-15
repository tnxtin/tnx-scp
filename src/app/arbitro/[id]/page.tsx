import { TournamentEditor } from '@/components/arbitro/tournament-editor'

export default async function ArbitroTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TournamentEditor id={id} />
}
