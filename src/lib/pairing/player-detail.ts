import {
  effectiveRatings,
  getStandings,
  type GameResult,
  type GeneratedRound,
  type Player,
  type RatingSnapshot,
  type StandingRow,
} from '@/lib/pairing/engine'

export interface RoundRow {
  round: number
  groupIndex: number | null
  band: string | null
  color: 'B' | 'N' | null
  isBye: boolean
  oppName: string | null
  oppElo: RatingSnapshot | null
  result: GameResult | null
  pts: number | null
  cum: number
  /** etiqueta del resultado desde la perspectiva del jugador («1 – 0», «½ – ½»…) */
  _label?: string
}

/** Todo lo que muestra la ficha de un jugador en un torneo. */
export interface PlayerDetail {
  player: Player
  /** posición en la clasificación; null si el jugador no está en la tabla */
  pos: number | null
  myRow: StandingRow | undefined
  /** Elo efectivo; undefined si el jugador no está en la tabla */
  eff: number | undefined
  rows: RoundRow[]
  chartData: Array<{ ronda: number; puntos: number }>
}

export const TONE_CLASSES: Record<string, string> = {
  win: 'bg-primary/10 text-primary border-primary/30',
  draw: 'bg-muted text-muted-foreground',
  loss: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-muted text-muted-foreground',
}

export function resultLabel(result: GameResult | null, isWhite: boolean): {
  text: string
  pts: number | null
} {
  if (result === null) return { text: 'Pendiente', pts: null }
  if (result === '1/2') return { text: '½ – ½', pts: 0.5 }
  const won = (result === '1-0') === isWhite
  return won ? { text: '1 – 0', pts: 1 } : { text: '0 – 1', pts: 0 }
}

/**
 * Calcula la ficha de un jugador a partir del torneo.
 * Lo comparten el diálogo ℹ de las tablas y la página pública de la ficha.
 */
export function buildPlayerDetail(
  players: Player[],
  rounds: GeneratedRound[],
  byePoints: number,
  /** null = ningún jugador seleccionado (diálogo cerrado) */
  playerId: string | null,
): PlayerDetail | null {
  const player = players.find((p) => p.id === playerId)
  if (!player) return null
  const id = player.id

  const standings = getStandings(players, rounds, byePoints)
  const myRow = standings.find((r) => r.player.id === id)
  const pos = myRow ? standings.indexOf(myRow) + 1 : null
  const effMap = effectiveRatings(players, rounds)
  const eff = effMap.get(id)

  const ratingsByRound = new Map(
    rounds.map((r) => [r.number, new Map(r.ratings.map((x) => [x.playerId, x]))]),
  )

  let cum = 0
  const rows: RoundRow[] = rounds.map((r) => {
    const rmap = ratingsByRound.get(r.number) ?? new Map<string, RatingSnapshot>()
    const grp = r.groups.find((g) => g.playerIds.includes(id)) ?? null
    let band: string | null = null
    if (grp) {
      const elos = grp.playerIds.map((pid) => rmap.get(pid)?.effectiveElo ?? 0)
      band = `${Math.max(...elos)} – ${Math.min(...elos)}`
    }
    const game = r.games.find((g) => g.whiteId === id || g.blackId === id)
    if (game) {
      const isWhite = game.whiteId === id
      const oppId = isWhite ? game.blackId : game.whiteId
      const opp = players.find((p) => p.id === oppId)
      const { text, pts } = resultLabel(game.result, isWhite)
      if (pts !== null) cum += pts
      return {
        round: r.number,
        groupIndex: grp?.index ?? null,
        band,
        color: isWhite ? 'B' : 'N',
        isBye: false,
        oppName: opp?.name ?? oppId,
        oppElo: rmap.get(oppId) ?? null,
        result: game.result,
        pts,
        cum,
        _label: text,
      }
    }
    const bye = r.byes.find((b) => b.playerId === id)
    if (bye) cum += byePoints
    return {
      round: r.number,
      groupIndex: grp?.index ?? null,
      band,
      color: null,
      isBye: true,
      oppName: null,
      oppElo: null,
      result: null,
      pts: bye ? byePoints : null,
      cum,
    }
  })

  const chartData = [
    { ronda: 0, puntos: 0 },
    ...rows.map((r) => ({ ronda: r.round, puntos: r.cum })),
  ]
  return { player, pos, myRow, eff, rows, chartData }
}
