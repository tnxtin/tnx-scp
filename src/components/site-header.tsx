'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Crown, LogIn, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export function SiteHeader() {
  const [me, setMe] = useState<Me | null>(null)
  const [loaded, setLoaded] = useState(false)

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

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 p-4">
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
      </div>
    </header>
  )
}
