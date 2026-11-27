import {
  getStandings,
  type GeneratedRound,
  type Player,
} from '@/lib/pairing/engine'
import {
  listPublicTournaments,
  loadPublicTournamentById,
  type PublicTournamentSummary,
} from '@/lib/tournament'

export interface PublicTournament extends PublicTournamentSummary {
  /** «15 nov 2026»; se formatea en el servidor para que no difiera del cliente */
  fecha: string | null
}

/** Fila de jugador tal como la reciben el listado y la portada. */
export interface PlayerRow {
  pos: number
  playerId: string
  name: string
  club: string
  elo: number | null
  effectiveElo: number
  isVirtual: boolean
  points: number
  played: number
}

const FECHA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function conFecha(t: PublicTournamentSummary): PublicTournament {
  const d = new Date(t.updatedAt ?? '')
  return { ...t, fecha: Number.isNaN(d.getTime()) ? null : FECHA.format(d) }
}

/** Todos los torneos, del más reciente al más antiguo. */
export async function getPublicTournaments(): Promise<PublicTournament[]> {
  const ts = await listPublicTournaments()
  return ts
    .map(conFecha)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/**
 * El torneo que protagoniza la portada: el ACTIVO más reciente con jugadores;
 * si no hay ninguno en juego, el último torneo con jugadores.
 */
export function pickFeaturedTournament(ts: PublicTournament[]): PublicTournament | null {
  return (
    ts.find((t) => t.status === 'ACTIVO' && t.playerCount > 0) ??
    ts.find((t) => t.playerCount > 0) ??
    null
  )
}

async function roster(t: PublicTournament) {
  const full = await loadPublicTournamentById(t.id)
  if (!full) return null
  return {
    // sin rondas jugadas la clasificación coincide con el orden del ranking inicial
    rows: getStandings(full.players, full.rounds, full.byePoints).map((r, i) => ({
      pos: i + 1,
      playerId: r.player.id,
      name: r.player.name,
      club: r.player.club,
      elo: r.player.elo,
      effectiveElo: r.effectiveElo,
      isVirtual: r.isVirtual,
      points: r.points,
      played: r.played,
    })),
    started: full.rounds.length > 0,
    unrated: full.players.filter((p) => p.elo == null).length,
  }
}

export interface LandingData {
  tournaments: PublicTournament[]
  featured: PublicTournament | null
  /** primeros del torneo destacado, para el avance de la portada */
  topPlayers: PlayerRow[]
  unrated: number
}

export async function getLandingData(): Promise<LandingData> {
  const tournaments = await getPublicTournaments()
  const featured = pickFeaturedTournament(tournaments)
  const destacado = featured ? await roster(featured) : null
  return {
    tournaments,
    featured,
    topPlayers: destacado ? destacado.rows.slice(0, 6) : [],
    unrated: destacado?.unrated ?? 0,
  }
}

export interface PlayersPageData {
  tournament: PublicTournament | null
  /** los demás torneos con jugadores, para saltar de una lista a otra */
  otros: PublicTournament[]
  rows: PlayerRow[]
  started: boolean
  unrated: number
}

/** Listado de jugadores de un torneo; sin `tournamentId`, el torneo destacado. */
export async function getPlayersPageData(tournamentId?: string): Promise<PlayersPageData> {
  const tournaments = await getPublicTournaments()
  const tournament = tournamentId
    ? (tournaments.find((t) => t.id === tournamentId) ?? null)
    : pickFeaturedTournament(tournaments)
  if (!tournament) {
    return { tournament: null, otros: [], rows: [], started: false, unrated: 0 }
  }
  const lista = await roster(tournament)
  return {
    tournament,
    otros: tournaments.filter((t) => t.id !== tournament.id && t.playerCount > 0),
    rows: lista?.rows ?? [],
    started: lista?.started ?? false,
    unrated: lista?.unrated ?? 0,
  }
}

export interface PlayerFichaData {
  tournament: PublicTournament
  playerId: string
  players: Player[]
  rounds: GeneratedRound[]
  byePoints: number
}

/** Ficha de un jugador en su torneo; null si el torneo o el jugador no existen. */
export async function getPlayerFichaData(
  torneoId: string,
  playerId: string,
): Promise<PlayerFichaData | null> {
  const tournaments = await getPublicTournaments()
  const tournament = tournaments.find((t) => t.id === torneoId)
  if (!tournament) return null
  const full = await loadPublicTournamentById(torneoId)
  if (!full || !full.players.some((p) => p.id === playerId)) return null
  return {
    tournament,
    playerId,
    players: full.players,
    rounds: full.rounds,
    byePoints: full.byePoints,
  }
}
