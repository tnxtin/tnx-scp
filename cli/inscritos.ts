/**
 * Lectura de inscritos para la CLI.
 *
 * Acepta CSV, TSV o texto pegado de una hoja de cálculo:
 *   - separador `;`, `,` tabulación o `|` (se detecta; se puede forzar);
 *   - con cabecera (Nombre;Club;Elo, también en inglés: Name;Club;Rating/FIDE/FEDA)
 *     o sin ella (nombre, club y Elo por ese orden; si el Elo va en la segunda
 *     columna también se reconoce);
 *   - Elo vacío, «-», «NR», 0 o fuera de 100–3500 = sin rating (Elo virtual).
 *
 * Si los nombres llevan coma («Apellido, Nombre»), usa `;` o tabulador como
 * separador, o entrecomilla el campo.
 */
import { readFileSync } from 'node:fs'

export interface Inscrito {
  name: string
  club: string
  elo: number | null
}

const DELIMITADORES = [';', ',', '\t', '|']

const CABECERA_NOMBRE = /^(last names?|surname|names?|nombre|jugador|player|apellidos?)/i
const CABECERA_CLUB = /^(club|equipo)/i
const CABECERA_ELO = /^(elo|rating|fide|feda|standard)/i

/** Elo válido de la web (100–3500); cualquier otra cosa cuenta como sin rating. */
export function parsearElo(s?: string): number | null {
  if (!s) return null
  const m = s.replace(/\s+/g, '').match(/^(\d{3,4})$/)
  if (!m) return null
  const n = Number(m[1])
  return n >= 100 && n <= 3500 ? n : null
}

export function detectarDelimitador(linea: string): string {
  let mejor = ''
  let max = 0
  for (const d of DELIMITADORES) {
    const n = linea.split(d).length - 1
    if (n > max) {
      max = n
      mejor = d
    }
  }
  return mejor // '' = una sola columna (solo nombres)
}

/** `--delimitador tab` (o «tabulador») es la tabulación; lo demás se toma tal cual. */
export function delimitadorDe(opcion: string): string {
  return /^(tab|tabulador|\\t)$/i.test(opcion) ? '\t' : opcion
}

function separarCampos(linea: string, delim: string): string[] {
  const campos: string[] = []
  let actual = ''
  let comillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (comillas) {
      if (ch === '"') {
        // «""» dentro de comillas es una comilla literal
        if (linea[i + 1] === '"') {
          actual += '"'
          i++
        } else {
          comillas = false
        }
      } else {
        actual += ch
      }
    } else if (ch === '"') {
      comillas = true
    } else if (delim !== '' && ch === delim) {
      campos.push(actual)
      actual = ''
    } else {
      actual += ch
    }
  }
  campos.push(actual)
  return campos.map((c) => c.trim())
}

export function parsearInscritos(texto: string, delimitadorForzado?: string): Inscrito[] {
  const lineas = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lineas.length === 0) return []

  const delim = delimitadorForzado ? delimitadorDe(delimitadorForzado) : detectarDelimitador(lineas[0])
  const filas = lineas.map((l) => separarCampos(l, delim))
  const primera = filas[0]

  let colNombre = -1
  let colClub = -1
  let colElo = -1
  const colEloCruda = primera.findIndex((c) => CABECERA_ELO.test(c))
  // Es cabecera si nombra la columna de jugadores, o si la columna de Elo no
  // trae un número (un club llamado «Club Deportivo» no basta para decidirlo).
  const esCabecera =
    primera.some((c) => CABECERA_NOMBRE.test(c)) ||
    (colEloCruda >= 0 && parsearElo(primera[colEloCruda]) === null)
  if (esCabecera) {
    colNombre = primera.findIndex((c) => CABECERA_NOMBRE.test(c))
    colClub = primera.findIndex((c) => CABECERA_CLUB.test(c))
    // con varias columnas de rating gana, por este orden: Elo, FIDE, FEDA
    colElo = primera.findIndex((c) => /^(elo|rating)/i.test(c))
    if (colElo < 0) colElo = primera.findIndex((c) => /fide/i.test(c))
    if (colElo < 0) colElo = primera.findIndex((c) => /feda/i.test(c))
    filas.shift()
  }

  return filas
    .map((campos): Inscrito => {
      if (colNombre >= 0) {
        return {
          name: campos[colNombre] ?? '',
          club: colClub >= 0 ? (campos[colClub] ?? '') : '',
          elo: parsearElo(colElo >= 0 ? campos[colElo] : undefined),
        }
      }
      // sin cabecera: nombre, y después club y Elo según cuál sea numérico
      const resto = campos.slice(1)
      const iElo = resto.findIndex((c) => parsearElo(c) !== null)
      return {
        name: campos[0] ?? '',
        club: iElo === 0 ? (resto[1] ?? '') : (resto[0] ?? ''),
        elo: iElo >= 0 ? parsearElo(resto[iElo]) : null,
      }
    })
    .filter((j) => j.name.length > 0)
}

export function leerInscritos(fichero: string, delimitador?: string): Inscrito[] {
  // «-» lee de la entrada estándar: permite pegar la lista o usar una tubería
  const texto = fichero === '-' ? readFileSync(0, 'utf8') : readFileSync(fichero, 'utf8')
  return parsearInscritos(texto, delimitador)
}
