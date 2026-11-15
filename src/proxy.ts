import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'tnxpcs_session'

function secretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? 'dev-secret-cambiar-en-produccion',
  )
}

/**
 * Escudo de rutas: /admin solo ADMIN, /arbitro ADMIN|ARBITRO,
 * /auxiliar ADMIN|AUXILIAR, /api/tournaments y /api/admin requieren sesión.
 * Los handlers de API re-verifican permisos finos en el servidor.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  let role: string | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey())
      role = typeof payload.role === 'string' ? payload.role : null
    } catch {
      role = null
    }
  }

  const { pathname } = req.nextUrl
  const isAdminArea =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isArbitroArea = pathname.startsWith('/arbitro')
  const isAuxArea = pathname.startsWith('/auxiliar')
  const isTournamentApi = pathname.startsWith('/api/tournaments')

  if (!role) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  const allowed =
    (isAdminArea && role === 'ADMIN') ||
    (isArbitroArea && (role === 'ARBITRO' || role === 'ADMIN')) ||
    (isAuxArea && (role === 'AUXILIAR' || role === 'ADMIN')) ||
    (isTournamentApi &&
      (role === 'ARBITRO' || role === 'AUXILIAR' || role === 'ADMIN'))

  if (!allowed) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/arbitro/:path*',
    '/auxiliar/:path*',
    '/api/admin/:path*',
    '/api/tournaments/:path*',
  ],
}
