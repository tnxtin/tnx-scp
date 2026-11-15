/**
 * Implementación sobre SQLite (tauri-plugin-sql) para la app empaquetada.
 * La migración de esquema vive en src-tauri/migrations/0001_init.sql y el
 * mismo SQL es compatible con MariaDB para la fase de servidor.
 */
import { readFile, BaseDirectory, writeFile } from '@tauri-apps/plugin-fs'
import { getDb, isTauri } from './db'
import type { GameResult, GeneratedRound, Player } from '@/lib/pairing/engine'
import { generateRound } from '@/lib/pairing/engine'
import { DEMO_PLAYERS } from '@/lib/demo-players'
import type {
  DomainApi,
  TournamentFull,
  TournamentSummary,
} from './api-types'
import { fallbackApi } from './fallback-api'

function newId(): string {
  return crypto.randomUUID()
}

function toRound(row: {
  number: number
  seed: number
  groups_json: string
  games_json: string
  byes_json: string
  ratings_json: string
}): GeneratedRound {
  const groups = JSON.parse(row.groups_json) as GeneratedRound['groups']
  return {
    number: row.number,
    seed: row.seed,
    groupCount: groups.length,
    groups,
    games: JSON.parse(row.games_json),
    byes: JSON.parse(row.byes_json),
    ratings: JSON.parse(row.ratings_json),
  }
}

const sqlApi: DomainApi = {
  async listTournaments(): Promise<TournamentSummary[]> {
    const db = await getDb()
    if (!db) return []
    const rows = await db.select<{
      id: string
      name: string
      total_rounds: number
      bye_points: number
      status: string
      player_count: number
      rounds_played: number
    }>(
      `SELECT t.id, t.name, t.total_rounds, t.bye_points, t.status,
              (SELECT COUNT(*) FROM tournament_player p WHERE p.tournament_id = t.id) AS player_count,
              (SELECT COUNT(*) FROM tournament_round r WHERE r.tournament_id = t.id) AS rounds_played
       FROM tournament t
       ORDER BY t.updated_at DESC`,
    )
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalRounds: r.total_rounds,
      byePoints: r.bye_points,
      status: r.status,
      playerCount: Number(r.player_count),
      roundsPlayed: Number(r.rounds_played),
    }))
  },

  async createTournament({ name, totalRounds, byePoints, seedDemo }) {
    const db = await getDb()
    if (!db) return ''
    const id = newId()
    await db.execute(
      'INSERT INTO tournament (id, name, total_rounds, bye_points, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, totalRounds, byePoints, 'BORRADOR', 'local'],
    )
    const players = seedDemo
      ? DEMO_PLAYERS.map(([n, c, e]) => ({ name: n, club: c, elo: e }))
      : []
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      await db.execute(
        'INSERT INTO tournament_player (id, tournament_id, name, club, elo, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
        [newId(), id, p.name, p.club ?? '', p.elo ?? null, i],
      )
    }
    return id
  },

  async deleteTournament(id) {
    const db = await getDb()
    if (!db) return
    await db.execute('DELETE FROM tournament_round WHERE tournament_id = $1', [id])
    await db.execute('DELETE FROM tournament_player WHERE tournament_id = $1', [id])
    await db.execute('DELETE FROM tournament WHERE id = $1', [id])
  },

  async setStatus(id, status) {
    const db = await getDb()
    if (!db) return
    await db.execute("UPDATE tournament SET status = $1, updated_at = datetime('now') WHERE id = $2", [
      status,
      id,
    ])
  },

  async loadTournamentFull(id): Promise<TournamentFull | null> {
    const db = await getDb()
    if (!db) return null
    const ts = await db.select<{
      id: string
      name: string
      total_rounds: number
      bye_points: number
      status: string
    }>('SELECT id, name, total_rounds, bye_points, status FROM tournament WHERE id = $1', [id])
    if (ts.length === 0) return null
    const t = ts[0]
    const ps = await db.select<{
      id: string
      name: string
      club: string
      elo: number | null
      sort_order: number
    }>(
      'SELECT id, name, club, elo, sort_order FROM tournament_player WHERE tournament_id = $1 ORDER BY sort_order ASC',
      [id],
    )
    const rs = await db.select<{
      number: number
      seed: number
      groups_json: string
      games_json: string
      byes_json: string
      ratings_json: string
    }>(
      'SELECT number, seed, groups_json, games_json, byes_json, ratings_json FROM tournament_round WHERE tournament_id = $1 ORDER BY number ASC',
      [id],
    )
    const players: Player[] = ps.map((p) => ({
      id: p.id,
      name: p.name,
      club: p.club,
      elo: p.elo === null || p.elo === undefined ? null : Number(p.elo),
    }))
    const rounds: GeneratedRound[] = rs.map(toRound)
    return {
      id: t.id,
      name: t.name,
      totalRounds: t.total_rounds,
      byePoints: t.bye_points,
      status: t.status,
      players,
      rounds,
    }
  },

  async savePlayers(id, players: Player[]) {
    const db = await getDb()
    if (!db) return
    await db.execute('DELETE FROM tournament_player WHERE tournament_id = $1', [id])
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      await db.execute(
        'INSERT INTO tournament_player (id, tournament_id, name, club, elo, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.id || newId(), id, p.name, p.club, p.elo, i],
      )
    }
    await db.execute("UPDATE tournament SET updated_at = datetime('now') WHERE id = $1", [id])
  },

  async generateNextRound(id): Promise<string | null> {
    const db = await getDb()
    if (!db) return 'Base de datos no disponible'
    const full = await this.loadTournamentFull!(id)
    if (!full) return 'Torneo no encontrado'
    if (full.players.length < 2)
      return 'Se necesitan al menos 2 jugadores para emparejar.'
    if (full.rounds.some((r) => r.games.some((g) => !g.result)))
      return 'Hay partidas sin resultado. Introdúcelas antes de continuar.'
    if (full.rounds.length >= full.totalRounds)
      return 'Ya se han completado todas las rondas del torneo.'
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
    let round: GeneratedRound
    try {
      round = generateRound({
        players: full.players,
        totalRounds: full.totalRounds,
        byePoints: full.byePoints,
        previousRounds: full.rounds,
        seed,
      })
    } catch (e) {
      return e instanceof Error ? e.message : 'Error al emparejar.'
    }
    await db.execute(
      'INSERT INTO tournament_round (id, tournament_id, number, seed, groups_json, games_json, byes_json, ratings_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        newId(),
        id,
        round.number,
        round.seed,
        JSON.stringify(round.groups),
        JSON.stringify(round.games),
        JSON.stringify(round.byes),
        JSON.stringify(round.ratings),
      ],
    )
    await db.execute("UPDATE tournament SET updated_at = datetime('now') WHERE id = $1", [id])
    return null
  },

  async setRoundResult(id, roundNumber, board, result: GameResult | null): Promise<string | null> {
    const db = await getDb()
    if (!db) return 'Base de datos no disponible'
    const rows = await db.select<{
      games_json: string
    }>('SELECT games_json FROM tournament_round WHERE tournament_id = $1 AND number = $2', [
      id,
      roundNumber,
    ])
    if (rows.length === 0) return 'Ronda no encontrada'
    const games = JSON.parse(rows[0].games_json) as GeneratedRound['games']
    const game = games.find((g) => g.board === board)
    if (!game) return 'Mesa no encontrada'
    game.result = result
    await db.execute(
      "UPDATE tournament_round SET games_json = $1 WHERE tournament_id = $2 AND number = $3",
      [JSON.stringify(games), id, roundNumber],
    )
    await db.execute("UPDATE tournament SET updated_at = datetime('now') WHERE id = $1", [id])
    return null
  },

  async backupDatabase(): Promise<string | null> {
    if (!isTauri) return null
    try {
      const bytes = await readFile('tnxpairing.db', {
        baseDir: BaseDirectory.AppData,
      })
      const stamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\..+$/, '')
      const target = `tnxpairing-backup-${stamp}.db`
      await writeFile(target, bytes, { baseDir: BaseDirectory.Download })
      return target
    } catch (e) {
      return e instanceof Error ? e.message : 'No se pudo copiar la base de datos'
    }
  },
}

/** API activa: SQLite dentro de Tauri; localStorage solo para `vite dev` en navegador. */
export const api: DomainApi = isTauri ? sqlApi : fallbackApi
