import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import type { GeneratedRound, Player } from '../src/lib/pairing/engine'

/**
 * Fichero de un torneo para la CLI.
 *
 * Cada torneo es un fichero portable `<nombre>.tnx.json` con la misma forma
 * con la que la web guarda un torneo (jugadores y las rondas del motor), así
 * un torneo de la CLI se puede llevar a la web sin conversión.
 */

export const FORMATO = 'tnx/torneo'
export const VERSION_FORMATO = 1
export const EXT = '.tnx.json'

/** Error que se muestra al árbitro tal cual, sin volcado de pila. */
export class ErrorTnx extends Error {}

export interface TorneoArchivo {
  formato: string
  version: number
  id: string
  name: string
  totalRounds: number
  byePoints: number
  createdAt: string
  players: Player[]
  rounds: GeneratedRound[]
}

export function nuevoTorneo(
  name: string,
  totalRounds: number,
  byePoints: number,
): TorneoArchivo {
  return {
    formato: FORMATO,
    version: VERSION_FORMATO,
    id: crypto.randomUUID(),
    name,
    totalRounds,
    byePoints,
    createdAt: new Date().toISOString(),
    players: [],
    rounds: [],
  }
}

/** Nombre de fichero sugerido a partir del del torneo: «Open de invierno» → open-de-invierno */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Ruta de un torneo: añade la extensión si no la lleva y comprueba que existe.
 * `tnx ronda open` abre `./open.tnx.json`.
 */
export function rutaDeTorneo(fichero: string): string {
  let ruta = resolve(fichero)
  if (!existsSync(ruta) && !ruta.endsWith('.json')) ruta = `${ruta}${EXT}`
  if (!existsSync(ruta)) {
    throw new ErrorTnx(
      `No encuentro el torneo «${fichero}» (buscado en ${dirname(ruta)}). ` +
        'Indica su fichero .tnx.json o créalo con: tnx nuevo <nombre>',
    )
  }
  return ruta
}

export function leerTorneo(fichero: string): TorneoArchivo {
  const ruta = rutaDeTorneo(fichero)
  let datos: unknown
  try {
    datos = JSON.parse(readFileSync(ruta, 'utf8'))
  } catch {
    throw new ErrorTnx(`${basename(ruta)} no es un fichero JSON válido.`)
  }
  const t = datos as Partial<TorneoArchivo> | null
  if (
    !t ||
    t.formato !== FORMATO ||
    !Array.isArray(t.players) ||
    !Array.isArray(t.rounds) ||
    typeof t.totalRounds !== 'number'
  ) {
    throw new ErrorTnx(
      `${basename(ruta)} no es un torneo de Tnx (se esperaba el formato ${FORMATO}).`,
    )
  }
  if (typeof t.version !== 'number' || t.version > VERSION_FORMATO) {
    throw new ErrorTnx(
      `${basename(ruta)} usa un formato más nuevo (versión ${String(t.version)}). Actualiza la CLI.`,
    )
  }
  return t as TorneoArchivo
}

/** Guarda sin dejar el fichero a medias: escribe en un temporal y lo renombra. */
export function guardarTorneo(ruta: string, torneo: TorneoArchivo): void {
  writeFileSync(`${ruta}.tmp`, JSON.stringify(torneo, null, 2) + '\n')
  renameSync(`${ruta}.tmp`, ruta)
}

/** Misma regla que la web: al generar la ronda 1 la lista de jugadores se cierra. */
export function listaCerrada(t: TorneoArchivo): boolean {
  return t.rounds.length > 0
}

export function hayPendientes(t: TorneoArchivo): boolean {
  return t.rounds.some((r) => r.games.some((g) => !g.result))
}
