'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, LayoutDashboard, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Container } from '@/components/site/section'
import { cn } from '@/lib/utils'

interface Me {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'ARBITRO' | 'AUXILIAR'
  active: boolean
  supervisor?: { name: string } | null
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  ARBITRO: 'Árbitro',
  AUXILIAR: 'Auxiliar de árbitro',
}

const PANEL_PATH: Record<string, string> = {
  ADMIN: '/admin',
  ARBITRO: '/arbitro',
  AUXILIAR: '/auxiliar',
}

/** Navegación de la web pública. `coincide` es el inicio de ruta que deja el enlace marcado. */
const NAV: Array<{ href: string; label: string; coincide?: string }> = [
  { href: '/torneos', label: 'Torneos', coincide: '/torneo' },
  { href: '/jugadores', label: 'Jugadores', coincide: '/jugadores' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/wiki', label: 'Wiki', coincide: '/wiki' },
  { href: '/changelog', label: 'ChangeLog', coincide: '/changelog' },
]

export function SiteHeader() {
  const [me, setMe] = useState<Me | null>(null)
  const [loaded, setLoaded] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null))
      .finally(() => setLoaded(true))
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const activo = (coincide?: string) => !!coincide && pathname.startsWith(coincide)

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Crown className="size-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight sm:text-xl">
              Tnx · Social Chess Pairing
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sistema de Emparejamiento por Grupos Progresivos · Elo virtual · GPL-3.0-or-later
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {loaded && me && (
            <>
              <span className="hidden text-sm sm:inline">
                <strong>{me.name}</strong>{' '}
                <span className="text-muted-foreground">({me.username})</span>
              </span>
              <Badge variant="secondary">{ROLE_LABEL[me.role]}</Badge>
              <Button asChild variant="outline" size="sm">
                <Link href={PANEL_PATH[me.role]}>
                  <LayoutDashboard className="size-4" aria-hidden />
                  Mi panel
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4" aria-hidden />
                Salir
              </Button>
            </>
          )}
          {!me && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="Acceso arbitraje"
              title="Acceso arbitraje"
            >
              <Link href="/login">
                <LogIn className="size-4" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </Container>

      {/* segunda fila: en móvil se desplaza en horizontal (sin barra visible) en lugar de doblarse */}
      <div className="border-t">
        <Container>
          <nav
            aria-label="Web pública"
            className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {NAV.map(({ href, label, coincide }) => (
              <Link
                key={href}
                href={href}
                aria-current={activo(coincide) ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-stone-300 hover:text-foreground',
                  activo(coincide) && 'border-amber-500 text-foreground hover:border-amber-500',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>
    </header>
  )
}
