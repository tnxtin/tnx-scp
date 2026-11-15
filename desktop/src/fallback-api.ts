/**
 * Implementación de la API de dominio sobre localStorage.
 * SOLO para desarrollar la UI en el navegador (sin Tauri): la app real
 * empaquetada usa SQLite a través de tauri-plugin-sql.
 */
import type {
  GameResult,
  GeneratedRound,
  Player,
} from '@/lib/pairing/engine'
import { generateRound } from '@/lib/pairing/engine'
import { DEMO_PLAYERS } from '@/lib/demo-players'
import type { DomainApi, TournamentFull, TournamentSummary } from './api-types'

interface FallbackData {
  tournaments: Array<{
    id: string
    name: string
    totalRounds: number
    byePoints: number
    status: string
    createdAt: string
    updatedAt: string
  }>
  players: Array<{
    id: string
    tournamentId: string
    name: string
    club: string
    elo: number | null
    sortOrder: number
  }>
  rounds: Array<{
    id: string
    tournamentId: string
    round: GeneratedRound
  }>
}

const KEY = 'tnxpcs-desktop-dev'

function load(): FallbackData {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '') as FallbackData
  } catch {
    return { tournaments: [], players: [], rounds: [] }
  }
}

function save(data: FallbackData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

function touch(data: FallbackData, id: string) {
  const t = data.tournaments.find((x) => x.id === id)
  if (t) t.updatedAt = new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

function countPlayers(data: FallbackData, id: string): number {
  return data.players.filter((p) => p.tournamentId === id).length
}

function countRounds(data: FallbackData, id: string): number {
  return data.rounds.filter((r) => r.tournamentId === id).length
}

export const fallbackApi: DomainApi = {
  async listTournaments(): Promise<TournamentSummary[]> {
    const d = load()
    return d.tournaments
      .map((t) => ({
        id: t.id,
        name: t.name,
        totalRounds: t.totalRounds,
        byePoints: t.byePoints,
        status: t.status,
        playerCount: countPlayers(d, t.id),
        roundsPlayed: countRounds(d, t.id),
      }))
      .sort((a, b) => (a.id < b.id ? 1 : -1))
  },

  async createTournament({ name, totalRounds, byePoints, seedDemo }) {
    const d = load()
    const id = newId()
    const now = new Date().toISOString()
    d.tournaments.push({ id, name, totalRounds, byePoints, status: 'BORRADOR', createdAt: now, updatedAt: now })
    const players = seedDemo
      ? DEMO_PLAYERS.map(([n, c, e]) => ({ name: n, club: c, elo: e }))
      : []
    players.forEach((p, i) =>
      d.players.push({ id: newId(), tournamentId: id, name: p.name, club: p.club ?? '', elo: p.elo ?? null, sortOrder: i }),
    )
    save(d)
    return id
  },

  async deleteTournament(id) {
    const d = load()
    d.tournaments = d.tournaments.filter((t) => t.id !== id)
    d.players = d.players.filter((p) => p.tournamentId !== id)
    d.rounds = d.rounds.filter((r) => r.tournamentId !== id)
    save(d)
  },

  async setStatus(id, status) {
    const d = load()
    const t = d.tournaments.find((x) => x.id === id)
    if (t) {
      t.status = status
      touch(d, id)
      save(d)
    }
  },

  async loadTournamentFull(id): Promise<TournamentFull | null> {
    const d = load()
    const t = d.tournaments.find((x) => x.id === id)
    if (!t) return null
    const players: Player[] = d.players
      .filter((p) => p.tournamentId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ id: p.id, name: p.name, club: p.club, elo: p.elo }))
    const rounds = d.rounds
      .filter((r) => r.tournamentId === id)
      .sort((a, b) => a.round.number - b.round.number)
      .map((r) => r.round)
    return {
      id: t.id,
      name: t.name,
      totalRounds: t.totalRounds,
      byePoints: t.byePoints,
      status: t.status,
      players,
      rounds,
    }
  },

  async savePlayers(id, players: Player[]) {
    const d = load()
    d.players = d.players.filter((p) => p.tournamentId !== id)
    players.forEach((p, i) =>
      d.players.push({ id: p.id || newId(), tournamentId: id, name: p.name, club: p.club, elo: p.elo, sortOrder: i }),
    )
    touch(d, id)
    save(d)
  },

  async generateNextRound(id): Promise<string | null> {
    const d = load()
    const t = d.tournaments.find((x) => x.id === id)
    if (!t) return 'Torneo no encontrado'
    const players: Player[] = d.players
      .filter((p) => p.tournamentId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ id: p.id, name: p.name, club: p.club, elo: p.elo }))
    const prev = d.rounds
      .filter((r) => r.tournamentId === id)
      .sort((a, b) => a.round.number - b.round.number)
      .map((r) => r.round)
    if (players.length < 2) return 'Se necesitan al menos 2 jugadores para emparejar.'
    if (prev.some((r) => r.games.some((g) => !g.result)))
      return 'Hay partidas sin resultado. Introdúcelas antes de continuar.'
    if (prev.length >= t.totalRounds)
      return 'Ya se han completado todas las rondas del torneo.'
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
    try {
      const round = generateRound({
        players,
        totalRounds: t.totalRounds,
        byePoints: t.byePoints,
        previousRounds: prev,
        seed,
      })
      d.rounds.push({ id: newId(), tournamentId: id, round })
      touch(d, id)
      save(d)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Error al emparejar.'
    }
  },

  async setRoundResult(id, roundNumber, board, result: GameResult): Promise<string | null> {
    const d = load()
    const row = d.rounds.find((r) => r.tournamentId === id && r.round.number === roundNumber)
    if (!row) return 'Ronda no encontrada'
    const game = row.round.games.find((g) => g.board === board)
    if (!game) return 'Mesa no encontrada'
    game.result = result
    touch(d, id)
    save(d)
    return null
  },
}
