import { db } from '@/lib/db'
import type { GeneratedRound, Player } from '@/lib/pairing/engine'
import type { SessionPayload } from '@/lib/auth'

export interface TournamentFull {
  id: string
  name: string
  totalRounds: number
  byePoints: number
  status: string
  createdById: string
  createdByName: string
  players: Player[]
  rounds: GeneratedRound[]
}

type TournamentWithRelations = Awaited<
  ReturnType<typeof db.tournament.findUniqueOrThrow>
> & {
  createdBy: { name: string }
  players: Array<{ id: string; name: string; club: string; elo: number | null; order: number }>
  rounds: Array<{
    number: number
    seed: number
    groupsJson: string
    gamesJson: string
    byesJson: string
    ratingsJson: string
  }>
}

export function toGeneratedRound(row: {
  number: number
  seed: number
  groupsJson: string
  gamesJson: string
  byesJson: string
  ratingsJson: string
}): GeneratedRound {
  const groups = JSON.parse(row.groupsJson) as GeneratedRound['groups']
  return {
    number: row.number,
    seed: row.seed,
    groupCount: groups.length,
    groups,
    games: JSON.parse(row.gamesJson),
    byes: JSON.parse(row.byesJson),
    ratings: JSON.parse(row.ratingsJson),
  }
}

export async function loadTournament(id: string): Promise<TournamentFull | null> {
  const t = (await db.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      players: { orderBy: { order: 'asc' } },
      rounds: { orderBy: { number: 'asc' } },
    },
  })) as TournamentWithRelations | null
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    totalRounds: t.totalRounds,
    byePoints: t.byePoints,
    status: t.status,
    createdById: t.createdById,
    createdByName: t.createdBy.name,
    players: t.players.map((p) => ({ id: p.id, name: p.name, club: p.club, elo: p.elo })),
    rounds: t.rounds.map(toGeneratedRound),
  }
}

/**
 * Permisos sobre un torneo:
 * - ADMIN: todo.
 * - ARBITRO dueño: todo sobre el torneo.
 * - AUXILIAR de ese árbitro: solo resultados (`canSetResults`).
 * `auxSupervisorId` = supervisorId del usuario en BD (solo para AUXILIAR).
 */
export function tournamentPermissions(
  session: SessionPayload,
  tournament: { createdById: string },
  auxSupervisorId?: string | null,
): { canView: boolean; canEditPlayers: boolean; canGenerate: boolean; canSetResults: boolean } {
  if (session.role === 'ADMIN') {
    return { canView: true, canEditPlayers: true, canGenerate: true, canSetResults: true }
  }
  const isOwner = session.role === 'ARBITRO' && session.uid === tournament.createdById
  if (isOwner) {
    return { canView: true, canEditPlayers: true, canGenerate: true, canSetResults: true }
  }
  if (session.role === 'AUXILIAR' && auxSupervisorId === tournament.createdById) {
    return { canView: true, canEditPlayers: false, canGenerate: false, canSetResults: true }
  }
  return { canView: false, canEditPlayers: false, canGenerate: false, canSetResults: false }
}

export interface PublicTournamentData {
  id: string
  name: string
  totalRounds: number
  byePoints: number
  status: string
  arbitro: string
  players: Player[]
  rounds: GeneratedRound[]
}

export interface PublicTournamentSummary {
  id: string
  name: string
  totalRounds: number
  byePoints: number
  status: string
  arbitro: string
  playerCount: number
  roundsPlayed: number
}

/** Lista pública de TODOS los torneos (la frontal los agrupa por estado). */
export async function listPublicTournaments(): Promise<PublicTournamentSummary[]> {
  const ts = await db.tournament.findMany({
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { players: true, rounds: true } },
    },
  })
  return ts.map((t) => ({
    id: t.id,
    name: t.name,
    totalRounds: t.totalRounds,
    byePoints: t.byePoints,
    status: t.status,
    arbitro: t.createdBy.name,
    playerCount: t._count.players,
    roundsPlayed: t._count.rounds,
  }))
}

/** Torneo concreto para la página pública (cualquier estado). */
export async function loadPublicTournamentById(
  id: string,
): Promise<PublicTournamentData | null> {
  const t = (await db.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      players: { orderBy: { order: 'asc' } },
      rounds: { orderBy: { number: 'asc' } },
    },
  })) as TournamentWithRelations | null
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    totalRounds: t.totalRounds,
    byePoints: t.byePoints,
    status: t.status,
    arbitro: t.createdBy.name,
    players: t.players.map((p) => ({ id: p.id, name: p.name, club: p.club, elo: p.elo })),
    rounds: t.rounds.map(toGeneratedRound),
  }
}
