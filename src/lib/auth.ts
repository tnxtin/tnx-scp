import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export type Role = 'ADMIN' | 'ARBITRO' | 'AUXILIAR'

export interface SessionPayload {
  uid: string
  username: string
  name: string
  role: Role
}

const COOKIE_NAME = 'tnxpcs_session'
const MAX_AGE = 7 * 24 * 3600 // 7 días

function secretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? 'dev-secret-cambiar-en-produccion',
  )
}

/** Hash de contraseña con scrypt: «salt:hash» en hexadecimal. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  )
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey())
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return {
      uid: String(payload.uid),
      username: String(payload.username),
      name: String(payload.name),
      role: payload.role as Role,
    }
  } catch {
    return null
  }
}

/** Sesión de la petición actual (server components y route handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export const SESSION_COOKIE = COOKIE_NAME
export const SESSION_MAX_AGE = MAX_AGE
