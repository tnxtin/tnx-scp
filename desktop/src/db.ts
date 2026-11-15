import Database from '@tauri-apps/plugin-sql'

/** ¿Corremos dentro de la ventana Tauri? (en `vite dev` del navegador, no) */
export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface SqlDb {
  select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T[]>
  execute(query: string, bindValues?: unknown[]): Promise<{
    rowsAffected: number
    lastInsertId: unknown
  }>
}

let db: SqlDb | null = null

/** Conexión SQLite local (crea la BD y activa claves foráneas). */
export async function getDb(): Promise<SqlDb | null> {
  if (!isTauri) return null
  if (!db) {
    const conn = await Database.load('sqlite:tnxpairing.db')
    await conn.execute('PRAGMA foreign_keys = ON')
    db = conn as SqlDb
  }
  return db
}
