import { Bishop } from '@/components/chess/pieces'
import { PageHeader, Section } from '@/components/site/section'
import { WikiCard } from '@/components/tournament/WikiCard'

export const metadata = { title: 'Wiki · Tnx · Social Chess Pairing' }

export default function WikiPage() {
  return (
    <>
      <PageHeader
        icon={Bishop}
        antetitulo="Documentación"
        titulo="Wiki del sistema"
        descripcion="Sistema de emparejamiento, Elo virtual, roles, web pública y app de escritorio."
        enlaces={[{ href: '/', label: 'Inicio' }]}
      />
      <Section>
        <WikiCard sinCabecera />
      </Section>
    </>
  )
}
