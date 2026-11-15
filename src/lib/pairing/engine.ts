/**
 * Motor de emparejamiento de ajedrez con "bandas progresivas".
 *
 * Sistema (idea del usuario):
 *  1. Los jugadores SIN Elo reciben un Elo virtual calculado con la media
 *     exponencial (EMA) de la tabla ordenada por Elo: se insertan en la MITAD
 *     de la tabla, se recalcula la media progresiva y se reubican, repitiendo
 *     hasta estabilizar. El recálculo se hace ANTES DE CADA RONDA.
 *  2. Jugadores con el mismo Elo virtual se barajan al azar en cada ronda
 *     (ocupan posiciones aleatorias dentro de su franja de Elo).
 *  3. Ronda 1: la tabla ordenada por Elo se divide en G grupos, donde
 *     G = número de rondas del torneo. Dentro de cada grupo se emparejan
 *     entre ellos (suizo: mitad alta contra mitad baja).
 *  4. Ronda r: los grupos se reconstruyen con los PUNTOS acumulados y
 *     G = rondas − r + 1 (cada vez menos grupos), hasta un único grupo en la
 *     última ronda. Así todos van "compitiendo hacia el jugador más cercano
 *     a su rating".
 *  5. Empates en puntos: un bloque de empatados no se divide entre dos grupos
 *     (flota entero al grupo inferior) salvo que el bloque sea demasiado grande.
 *  6. Grupo impar: el último clasificado del grupo que aún no haya tenido
 *     libre recibe el punto libre (bye), con puntos configurables.
 *  7. Colores: se equilibran blancas/negras y se evita el mismo color tres
 *     veces seguidas cuando es posible.
 */
import { mulberry32, shuffle, type RNG } from './rng'

export type GameResult = '1-0' | '0-1' | '1/2'
export type Color = 'W' | 'B'

export interface Player {
  id: string
  name: string
  club: string
  /** null = jugador sin rating (recibirá Elo virtual) */
  elo: number | null
}

export interface GameRecord {
  round: number
  board: number
  whiteId: string
  blackId: string
  result: GameResult | null
}

export interface ByeRecord {
  round: number
  playerId: string
}

export interface GroupInfo {
  index: number
  playerIds: string[]
}

export interface RatingSnapshot {
  playerId: string
  effectiveElo: number
  isVirtual: boolean
}

export interface GeneratedRound {
  number: number
  seed: number
  groupCount: number
  groups: GroupInfo[]
  games: GameRecord[]
  byes: ByeRecord[]
  ratings: RatingSnapshot[]
}

export interface RoundLike {
  games: { whiteId: string; blackId: string; result: GameResult | null }[]
  byes: { playerId: string }[]
}

export interface GenerateRoundParams {
  players: Player[]
  totalRounds: number
  byePoints: number
  previousRounds: RoundLike[]
  seed: number
}

const DEFAULT_RATING = 1500
/** Factor de suavizado de la EMA sobre la tabla ordenada por Elo. */
export const EMA_ALPHA = 0.3

/* ------------------------------------------------------------------ */
/* 1. Curva exponencial (EMA) y Elo virtual                           */
/* ------------------------------------------------------------------ */

/**
 * Media exponencial móvil SIMÉTRICA sobre una lista ordenada (descendente):
 * se calcula la EMA de arriba abajo y de abajo arriba y se promedian en el
 * punto medio exacto de la tabla. Así el valor central no depende de la
 * dirección de recorrido.
 */
export function emaCenter(values: number[], alpha: number = EMA_ALPHA): number {
  if (values.length === 0) return DEFAULT_RATING
  const n = values.length
  const s: number[] = new Array(n)
  const t: number[] = new Array(n)
  s[0] = values[0]
  for (let i = 1; i < n; i++) s[i] = alpha * values[i] + (1 - alpha) * s[i - 1]
  t[n - 1] = values[n - 1]
  for (let i = n - 2; i >= 0; i--) t[i] = alpha * values[i] + (1 - alpha) * t[i + 1]
  const c = (n - 1) / 2
  const i0 = Math.floor(c)
  const i1 = Math.ceil(c)
  const f = c - i0
  const sC = s[i0] * (1 - f) + s[i1] * f
  const tC = t[i0] * (1 - f) + t[i1] * f
  return (sC + tC) / 2
}

/**
 * Elo virtual para los jugadores sin rating.
 * Proceso iterativo descrito por el usuario:
 *   a) valor inicial = punto medio de la curva EMA de los clasificados;
 *   b) se insertan los "virtuales" en mitad de la tabla (todos con ese valor);
 *   c) se recalcula la media progresiva de la TABLA COMPLETA;
 *   d) se reubican y se repite b)–c) hasta estabilizar (< 0.5 puntos Elo).
 */
export function computeVirtualRating(
  ratedElos: number[],
  unratedCount: number,
  alpha: number = EMA_ALPHA,
): { value: number; iterations: number; converged: boolean } {
  if (ratedElos.length === 0) {
    return { value: DEFAULT_RATING, iterations: 0, converged: true }
  }
  const rated = [...ratedElos].sort((a, b) => b - a)
  let v = emaCenter(rated, alpha)
  let iterations = 0
  let converged = true
  if (unratedCount > 0) {
    for (let i = 0; i < 50; i++) {
      iterations++
      const full = [...rated, ...new Array<number>(unratedCount).fill(v)].sort(
        (a, b) => b - a,
      )
      const v2 = emaCenter(full, alpha)
      if (Math.abs(v2 - v) < 0.5) {
        v = v2
        break
      }
      if (i === 49) converged = false
      v = v2
    }
  }
  return { value: Math.round(v), iterations, converged }
}

/** Puntos acumulados de cada jugador con las rondas ya jugadas. */
export function computePoints(
  players: Player[],
  previousRounds: RoundLike[],
  byePoints: number,
): Record<string, number> {
  const pts: Record<string, number> = {}
  for (const p of players) pts[p.id] = 0
  for (const r of previousRounds) {
    for (const g of r.games) {
      if (!g.result) continue
      if (g.result === '1-0') pts[g.whiteId] = (pts[g.whiteId] ?? 0) + 1
      else if (g.result === '0-1') pts[g.blackId] = (pts[g.blackId] ?? 0) + 1
      else {
        pts[g.whiteId] = (pts[g.whiteId] ?? 0) + 0.5
        pts[g.blackId] = (pts[g.blackId] ?? 0) + 0.5
      }
    }
    for (const b of r.byes) pts[b.playerId] = (pts[b.playerId] ?? 0) + byePoints
  }
  return pts
}

/**
 * Elo efectivo de todos los jugadores para ESTA ronda:
 * los clasificados mantienen su Elo; los sin rating obtienen el valor virtual
 * recalculado en cada ronda.
 */
export function effectiveRatings(
  players: Player[],
  previousRounds: RoundLike[],
): Map<string, number> {
  const rated = players.filter((p) => p.elo != null)
  const unrated = players.filter((p) => p.elo == null)
  const { value } = computeVirtualRating(
    rated.map((p) => p.elo as number),
    unrated.length,
  )
  const map = new Map<string, number>()
  for (const p of rated) map.set(p.id, p.elo as number)
  for (const p of unrated) map.set(p.id, value)
  return map
}

/* ------------------------------------------------------------------ */
/* 2. Tamaños de grupo: minimizar grupos impares (menos libres)       */
/* ------------------------------------------------------------------ */

/**
 * Reparte N jugadores en G grupos con tamaños lo más iguales posible
 * (diferencia máxima 3) y con el mínimo número de grupos impares,
 * porque cada grupo impar genera un punto libre. Como criterio secundario
 * minimiza la dispersión de tamaños respecto a la media.
 */
export function chooseGroupSizes(n: number, g: number): number[] {
  const base = Math.floor(n / g)
  const lo = Math.max(2, base - 1)
  const hi = base + 2
  const avg = n / g
  const INF = Number.MAX_SAFE_INTEGER
  // dp[i][s] = coste mínimo (1000·impares + dispersión) para llenar i grupos sumando s
  const dp: number[][] = Array.from({ length: g + 1 }, () =>
    new Array(n + 1).fill(INF),
  )
  const choice: number[][] = Array.from({ length: g + 1 }, () =>
    new Array(n + 1).fill(-1),
  )
  if (lo > hi) {
    const b = Math.floor(n / g)
    const rest = n - b * g
    const sizes: number[] = []
    for (let k = 0; k < g; k++) sizes.push(k < rest ? b + 1 : b)
    return sizes
  }
  dp[0][0] = 0
  for (let i = 0; i < g; i++) {
    for (let s = 0; s <= n; s++) {
      if (dp[i][s] === INF) continue
      for (let size = lo; size <= hi; size++) {
        const ns = s + size
        if (ns > n) continue
        const cost =
          dp[i][s] + (size % 2 === 1 ? 1000 : 0) + Math.abs(size - avg)
        if (cost < dp[i + 1][ns]) {
          dp[i + 1][ns] = cost
          choice[i + 1][ns] = size
        }
      }
    }
  }
  const sizes: number[] = []
  let s = n
  for (let i = g; i >= 1; i--) {
    const size = choice[i][s]
    if (size < 0) {
      // retirada: reparto clásico
      const b = Math.floor(n / g)
      const rest = n - b * g
      const fallback: number[] = []
      for (let k = 0; k < g; k++) fallback.push(k < rest ? b + 1 : b)
      return fallback
    }
    sizes.push(size)
    s -= size
  }
  sizes.reverse()
  // determinismo: los grupos más grandes primero (bandas superiores más anchas)
  sizes.sort((a, b) => b - a)
  return sizes
}

/* ------------------------------------------------------------------ */
/* 3. Fronteras entre grupos y bloques de empatados                   */
/* ------------------------------------------------------------------ */

/**
 * Ajusta una frontera de grupo para no partir un bloque de jugadores con los
 * MISMOS PUNTOS: el bloque entero flota al grupo inferior, salvo que sea
 * demasiado grande (entonces se reparte, ya que el orden interno entre
 * iguales es aleatorio) o dejase el grupo actual demasiado pequeño.
 */
function adjustBoundary(
  orderedIds: string[],
  points: Record<string, number>,
  end: number,
  start: number,
): number {
  if (end >= orderedIds.length || end <= start) return end
  const refPts = points[orderedIds[end - 1]]
  let runStart = end - 1
  while (runStart > start && points[orderedIds[runStart - 1]] === refPts) runStart--
  let runEnd = end
  while (runEnd < orderedIds.length && points[orderedIds[runEnd]] === refPts) runEnd++
  const insideRun = end > runStart && end < runEnd
  if (!insideRun) return end
  const blockSize = runEnd - runStart
  const cap = Math.max(3, end - start)
  if (blockSize <= cap && runStart - start >= 2) return runStart
  return end
}

/* ------------------------------------------------------------------ */
/* 4. Historial: rivales, colores y libres                            */
/* ------------------------------------------------------------------ */

export interface History {
  /** clave "idA|idB" con ids en orden alfabético */
  playedPairs: Set<string>
  colors: Map<string, Color[]>
  hadBye: Set<string>
}

export function buildHistory(rounds: RoundLike[]): History {
  const playedPairs = new Set<string>()
  const colors = new Map<string, Color[]>()
  const hadBye = new Set<string>()
  for (const r of rounds) {
    for (const g of r.games) {
      const key = [g.whiteId, g.blackId].sort().join('|')
      playedPairs.add(key)
      if (!colors.has(g.whiteId)) colors.set(g.whiteId, [])
      if (!colors.has(g.blackId)) colors.set(g.blackId, [])
      colors.get(g.whiteId)!.push('W')
      colors.get(g.blackId)!.push('B')
    }
    for (const b of r.byes) hadBye.add(b.playerId)
  }
  return { playedPairs, colors, hadBye }
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

/* ------------------------------------------------------------------ */
/* 5. Colores                                                         */
/* ------------------------------------------------------------------ */

function countColor(colors: Color[] | undefined, c: Color): number {
  if (!colors) return 0
  return colors.filter((x) => x === c).length
}

interface ColorNeed {
  want: Color | null
  strength: number
}

function colorNeed(history: Color[] | undefined): ColorNeed {
  if (!history || history.length === 0) return { want: null, strength: 0 }
  const w = countColor(history, 'W')
  const b = history.length - w
  const last = history[history.length - 1]
  const prev = history.length >= 2 ? history[history.length - 2] : null
  if (prev && prev === last) {
    return { want: last === 'W' ? 'B' : 'W', strength: 2 }
  }
  if (w - b >= 2) return { want: 'B', strength: 2 }
  if (b - w >= 2) return { want: 'W', strength: 2 }
  return { want: last === 'W' ? 'B' : 'W', strength: 1 }
}

/** Decide qué jugador lleva blancas dentro de una pareja. */
function decideColors(
  idA: string,
  idB: string,
  history: History,
  rng: RNG,
): { whiteId: string; blackId: string } {
  const hA = history.colors.get(idA)
  const hB = history.colors.get(idB)
  const na = colorNeed(hA)
  const nb = colorNeed(hB)
  const bA = countColor(hA, 'B')
  const bB = countColor(hB, 'B')
  const wA = countColor(hA, 'W')
  const wB = countColor(hB, 'W')
  let white = idA
  if (na.want && nb.want) {
    if (na.strength > nb.strength) {
      white = na.want === 'W' ? idA : idB
    } else if (nb.strength > na.strength) {
      white = nb.want === 'W' ? idA : idB
    } else if (na.want === nb.want) {
      // Empate de necesidad: quien más haya jugado del color contrario
      // recibe el que le falta; si siguen empatados, el mejor clasificado.
      if (na.want === 'W') white = bA >= bB ? idA : idB
      else white = wA >= wB ? idA : idB
    } else {
      white = na.want === 'W' ? idA : idB
    }
  } else if (na.want) {
    white = na.want === 'W' ? idA : idB
  } else if (nb.want) {
    white = nb.want === 'W' ? idA : idB
  } else {
    const wa = wA
    const wb = wB
    if (wa < wb) white = idA
    else if (wb < wa) white = idB
    else white = rng() < 0.5 ? idA : idB
  }
  return white === idA ? { whiteId: idA, blackId: idB } : { whiteId: idB, blackId: idA }
}

/* ------------------------------------------------------------------ */
/* 6. Emparejamiento dentro de un grupo (suizo: mitades cruzadas)     */
/* ------------------------------------------------------------------ */

/**
 * Empareja la mitad alta contra la mitad baja del grupo evitando repetir
 * rivales y equilibrando colores. Busca la asignación de coste mínimo:
 *   coste(i, j) = 1000·repetición + 4·conflicto de colores + |i − j|.
 * Usa programación dinámica con máscara de bits (grupos pequeños) y
 * voraz con reparación para grupos muy grandes.
 */
type ColorConflictFn = (a: string, b: string) => number

function assignPairs(
  top: string[],
  bottom: string[],
  playedPairs: Set<string>,
  colorConflict?: ColorConflictFn,
): Array<[string, string]> {
  const k = Math.min(top.length, bottom.length)
  const cost = (i: number, j: number): number =>
    (playedPairs.has(pairKey(top[i], bottom[j])) ? 1000 : 0) +
    (colorConflict ? colorConflict(top[i], bottom[j]) * 4 : 0) +
    Math.abs(i - j)

  if (k <= 16) {
    // DP bitmasks sobre la mitad baja
    const size = 1 << k
    const INF = Number.MAX_SAFE_INTEGER
    const dp = new Float64Array(size).fill(INF)
    const parent = new Int16Array(size).fill(-1)
    dp[0] = 0
    for (let mask = 0; mask < size; mask++) {
      if (dp[mask] >= INF) continue
      const i = popcount(mask)
      if (i >= k) continue
      for (let j = 0; j < k; j++) {
        if (mask & (1 << j)) continue
        const nmask = mask | (1 << j)
        const c = dp[mask] + cost(i, j)
        if (c < dp[nmask]) {
          dp[nmask] = c
          parent[nmask] = j
        }
      }
    }
    const pairs: Array<[string, string]> = []
    let mask = size - 1
    for (let i = k - 1; i >= 0; i--) {
      const j = parent[mask]
      pairs.push([top[i], bottom[j]])
      mask ^= 1 << j
    }
    pairs.reverse()
    return pairs
  }

  // Fallback voraz para grupos muy grandes: alineación directa + reparación
  const used = new Array<boolean>(k).fill(false)
  const assign = new Array<number>(k).fill(-1)
  for (let i = 0; i < k; i++) {
    let best = -1
    let bestCost = Number.POSITIVE_INFINITY
    for (let j = 0; j < k; j++) {
      if (used[j]) continue
      const c = cost(i, j)
      if (c < bestCost) {
        bestCost = c
        best = j
      }
    }
    assign[i] = best
    used[best] = true
  }
  return assign.map((j, i) => [top[i], bottom[j]])
}

function popcount(x: number): number {
  let c = 0
  while (x) {
    x &= x - 1
    c++
  }
  return c
}

/** Detecta si dos jugadores compiten por el mismo color con la misma fuerza. */
function makeColorConflict(history: History): ColorConflictFn {
  return (a: string, b: string): number => {
    const na = colorNeed(history.colors.get(a))
    const nb = colorNeed(history.colors.get(b))
    if (na.want && nb.want && na.want === nb.want && na.strength === nb.strength)
      return 1
    return 0
  }
}

export interface GroupPairing {
  games: Array<{ whiteId: string; blackId: string }>
  byePlayerId: string | null
}

function pairWithinGroup(
  group: string[],
  history: History,
  rng: RNG,
): GroupPairing {
  const ordered = [...group]
  let byePlayerId: string | null = null
  let restPairs: Array<[string, string]> | null = null

  if (ordered.length % 2 === 1) {
    // Libre: se prefiere el último clasificado que aún no haya tenido libre.
    // Entre los candidatos se elige el que NO fuerce una repetición de
    // rivales (si es posible).
    const candidates: number[] = []
    for (let i = ordered.length - 1; i >= 0; i--)
      if (!history.hadBye.has(ordered[i])) candidates.push(i)
    if (candidates.length === 0)
      for (let i = ordered.length - 1; i >= 0; i--) candidates.push(i)

    const evalBye = (idx: number) => {
      const rest = ordered.filter((_, i) => i !== idx)
      const half = rest.length / 2
      const pairs = assignPairs(
        rest.slice(0, half),
        rest.slice(half),
        history.playedPairs,
      )
      const repeats = pairs.reduce(
        (acc, [a, b]) => acc + (history.playedPairs.has(pairKey(a, b)) ? 1 : 0),
        0,
      )
      return { pairs, repeats }
    }

    let chosenIdx = candidates[0]
    let bestRepeats = Number.POSITIVE_INFINITY
    for (const c of candidates) {
      const { pairs, repeats } = evalBye(c)
      if (repeats < bestRepeats) {
        bestRepeats = repeats
        chosenIdx = c
        restPairs = pairs
      }
      if (bestRepeats === 0) break
    }
    byePlayerId = ordered[chosenIdx]
    ordered.splice(chosenIdx, 1)
  }

  const half = ordered.length / 2
  const top = ordered.slice(0, half)
  const bottom = ordered.slice(half)
  const crossPairs =
    restPairs ?? assignPairs(top, bottom, history.playedPairs, makeColorConflict(history))
  const games = crossPairs.map(([a, b]) => decideColors(a, b, history, rng))
  return { games, byePlayerId }
}

/* ------------------------------------------------------------------ */
/* 7. Generación completa de una ronda                                */
/* ------------------------------------------------------------------ */

export function generateRound(params: GenerateRoundParams): GeneratedRound {
  const { players, previousRounds, byePoints, seed } = params
  const roundNumber = previousRounds.length + 1
  const totalRounds = Math.max(2, params.totalRounds)
  const n = players.length
  if (n < 2) throw new Error('Se necesitan al menos 2 jugadores.')
  if (previousRounds.length >= totalRounds)
    throw new Error('El torneo ya ha completado todas sus rondas.')

  const rng = mulberry32(seed)
  const eff = effectiveRatings(players, previousRounds)
  const points = computePoints(players, previousRounds, byePoints)
  const history = buildHistory(previousRounds)

  // Orden de la ronda: puntos desc, luego Elo efectivo desc.
  // Antes de ordenar se baraja todo: los empates EXACTOS (mismos puntos y
  // mismo Elo) quedan en orden aleatorio distinto cada ronda ("Barajar").
  const jittered = shuffle(players, rng)
  const ordered = [...jittered].sort((a, b) => {
    const pa = points[a.id] ?? 0
    const pb = points[b.id] ?? 0
    if (pb !== pa) return pb - pa
    const ea = eff.get(a.id) ?? 0
    const eb = eff.get(b.id) ?? 0
    if (eb !== ea) return eb - ea
    return 0
  })
  const orderedIds = ordered.map((p) => p.id)

  // Nº de grupos: ronda 1 -> tantas grupos como rondas; decrece hasta 1
  let g = Math.max(1, totalRounds - roundNumber + 1)
  g = Math.min(g, Math.floor(n / 2))

  const sizes = chooseGroupSizes(n, g)

  // Fronteras ajustadas para no romper bloques de empatados en puntos
  const groupIds: string[][] = []
  let start = 0
  for (let gi = 0; gi < g; gi++) {
    let end = start + sizes[gi]
    if (gi < g - 1) end = adjustBoundary(orderedIds, points, end, start)
    groupIds.push(orderedIds.slice(start, end))
    start = end
  }
  // Todo jugador debe estar en un grupo (seguridad)
  while (start < n) {
    groupIds[groupIds.length - 1].push(orderedIds[start])
    start++
  }

  // Emparejamiento dentro de cada grupo
  const games: GameRecord[] = []
  const byes: ByeRecord[] = []
  const groups: GroupInfo[] = []
  const usedThisRound = new Set<string>()
  let board = 1
  for (let gi = 0; gi < groupIds.length; gi++) {
    const grp = groupIds[gi].filter((id) => !usedThisRound.has(id))
    if (grp.length === 0) continue
    for (const id of grp) usedThisRound.add(id)
    groups.push({ index: groups.length + 1, playerIds: grp })
    const { games: pairGames, byePlayerId } = pairWithinGroup(grp, history, rng)
    for (const pg of pairGames) {
      games.push({
        round: roundNumber,
        board: board++,
        whiteId: pg.whiteId,
        blackId: pg.blackId,
        result: null,
      })
    }
    if (byePlayerId) byes.push({ round: roundNumber, playerId: byePlayerId })
  }

  const ratings: RatingSnapshot[] = players.map((p) => ({
    playerId: p.id,
    effectiveElo: eff.get(p.id) ?? DEFAULT_RATING,
    isVirtual: p.elo == null,
  }))

  return {
    number: roundNumber,
    seed,
    groupCount: groups.length,
    groups,
    games,
    byes,
    ratings,
  }
}

/* ------------------------------------------------------------------ */
/* 8. Clasificación                                                   */
/* ------------------------------------------------------------------ */

export interface StandingRow {
  player: Player
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  byes: number
  effectiveElo: number
  isVirtual: boolean
}

export function getStandings(
  players: Player[],
  rounds: GeneratedRound[],
  byePoints: number,
): StandingRow[] {
  const eff = effectiveRatings(players, rounds)
  const pts = computePoints(players, rounds, byePoints)
  const stats = new Map<string, { played: number; wins: number; draws: number; losses: number; byes: number }>()
  for (const p of players)
    stats.set(p.id, { played: 0, wins: 0, draws: 0, losses: 0, byes: 0 })
  for (const r of rounds) {
    for (const gm of r.games) {
      if (!gm.result) continue
      const sW = stats.get(gm.whiteId)
      const sB = stats.get(gm.blackId)
      if (!sW || !sB) continue
      sW.played++
      sB.played++
      if (gm.result === '1-0') {
        sW.wins++
        sB.losses++
      } else if (gm.result === '0-1') {
        sB.wins++
        sW.losses++
      } else {
        sW.draws++
        sB.draws++
      }
    }
    for (const b of r.byes) {
      const s = stats.get(b.playerId)
      if (s) s.byes++
    }
  }
  const rows: StandingRow[] = players.map((p) => ({
    player: p,
    points: pts[p.id] ?? 0,
    ...(stats.get(p.id) as { played: number; wins: number; draws: number; losses: number; byes: number }),
    effectiveElo: eff.get(p.id) ?? DEFAULT_RATING,
    isVirtual: p.elo == null,
  }))
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.effectiveElo !== a.effectiveElo) return b.effectiveElo - a.effectiveElo
    return a.player.name.localeCompare(b.player.name, 'es')
  })
  return rows
}
