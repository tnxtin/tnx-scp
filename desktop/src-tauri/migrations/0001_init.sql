-- 0001 · tablas base del sistema de emparejamiento offline
-- SQL estándar compatible con SQLite (hoy) y MariaDB (fase servidor):
-- sin tipos exóticos, TEXT para blobs JSON, sin cláusulas exclusivas de un motor.

CREATE TABLE IF NOT EXISTS tournament (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  total_rounds INTEGER NOT NULL,
  bye_points  REAL NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'BORRADOR',
  created_by  TEXT NOT NULL DEFAULT 'local',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tournament_player (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  club          TEXT NOT NULL DEFAULT '',
  elo           INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tournament_round (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  number        INTEGER NOT NULL,
  seed          INTEGER NOT NULL,
  groups_json   TEXT NOT NULL DEFAULT '[]',
  games_json    TEXT NOT NULL DEFAULT '[]',
  byes_json     TEXT NOT NULL DEFAULT '[]',
  ratings_json  TEXT NOT NULL DEFAULT '[]',
  UNIQUE (tournament_id, number)
);

CREATE INDEX IF NOT EXISTS idx_player_tournament ON tournament_player(tournament_id);
CREATE INDEX IF NOT EXISTS idx_round_tournament ON tournament_round(tournament_id);
