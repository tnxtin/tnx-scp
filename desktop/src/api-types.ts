import type { GameResult } from '@/lib/pairing/engine'

export interface TournamentSummary {
  id: string
  name: string
  totalRounds: number
  byePoints: number
  status: string
  playerCount: number
  roundsPlayed: number
}

export interface TournamentFull {
  id: string
  name: string
  totalRounds: number
  byePoints: number
  status: string
  players: import('@/lib/pairing/engine').Player[]
  rounds: import('@/lib/pairing/engine').GeneratedRound[]
}

export interface CreateTournamentInput {
  name: string
  totalRounds: number
  byePoints: number
  seedDemo?: boolean
}

/**
 * Capa de dominio: la app empaquetada la implementa sobre SQLite
 * (tauri-plugin-sql) y el desarrollo en navegador sobre localStorage.
 * La ruta futura a MariaDB/en servidor sustituirá esta interfaz por
 * llamadas a la API de la web o a mysql:// con el mismo plugin.
 */
export interface DomainApi {
  listTournaments(): Promise<TournamentSummary[]>
  createTournament(input: CreateTournamentInput): Promise<string>
  deleteTournament(id: string): Promise<void>
  setStatus(id: string, status: string): Promise<void>
  loadTournamentFull(id: string): Promise<TournamentFull | null>
  savePlayers(id: string, players: import('@/lib/pairing/engine').Player[]): Promise<void>
  generateNextRound(id: string): Promise<string | null>
  setRoundResult(
    id: string,
    roundNumber: number,
    board: number,
    result: GameResult | null,
  ): Promise<string | null>
  /** Respaldar la base de datos (solo Tauri); devuelve la ruta o null */
  backupDatabase?(): Promise<string | null>
}
