import { King } from '@/components/chess/pieces'
import { PageHeader, Section } from '@/components/site/section'
import { ChangelogCard } from '@/components/tournament/ChangelogCard'

export const metadata = { title: 'ChangeLog · Tnx · Social Chess Pairing' }

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        icon={King}
        antetitulo="Historial"
        titulo="ChangeLog"
        descripcion="Versiones de la web y de la app de escritorio: funciones nuevas, mejoras y correcciones."
        enlaces={[{ href: '/', label: 'Inicio' }]}
      />
      <Section>
        <ChangelogCard sinCabecera />
      </Section>
    </>
  )
}
