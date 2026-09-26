import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ReplayPayload } from "../../shared/replay.ts"

const here = dirname(fileURLToPath(import.meta.url))
const defaultPath = join(here, "..", "data", "nav.db")

export interface ScoreRow {
  id: number
  levelId: string
  playerName: string
  timeMs: number
  boatId: string
  replay: ReplayPayload
  createdAt: string
}

export interface ScoreListItem {
  id: number
  levelId: string
  playerName: string
  timeMs: number
  boatId: string
  createdAt: string
}

let db: Database.Database | null = null

export function openDb(path = process.env.NAV_DB_PATH ?? defaultPath): Database.Database {
  if (db) return db
  mkdirSync(dirname(path), { recursive: true })
  db = new Database(path)
  db.pragma("journal_mode = WAL")
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      time_ms REAL NOT NULL,
      boat_id TEXT NOT NULL,
      replay_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_level_time ON scores(level_id, time_ms);
  `)
  return db
}

export function insertScore(input: {
  levelId: string
  playerName: string
  timeMs: number
  boatId: string
  replay: ReplayPayload
}): number {
  const conn = openDb()
  const stmt = conn.prepare(`
    INSERT INTO scores (level_id, player_name, time_ms, boat_id, replay_json)
    VALUES (@levelId, @playerName, @timeMs, @boatId, @replayJson)
  `)
  const result = stmt.run({
    levelId: input.levelId,
    playerName: input.playerName.trim().slice(0, 64),
    timeMs: input.timeMs,
    boatId: input.boatId,
    replayJson: JSON.stringify(input.replay),
  })
  return Number(result.lastInsertRowid)
}

export function listScores(levelId: string, limit = 25): ScoreListItem[] {
  const conn = openDb()
  const rows = conn
    .prepare(
      `
    SELECT id, level_id AS levelId, player_name AS playerName, time_ms AS timeMs,
           boat_id AS boatId, created_at AS createdAt
    FROM scores
    WHERE level_id = ?
    ORDER BY time_ms ASC, id ASC
    LIMIT ?
  `,
    )
    .all(levelId, limit) as ScoreListItem[]
  return rows
}

export function getScoreReplay(id: number): ScoreRow | null {
  const conn = openDb()
  const row = conn
    .prepare(
      `
    SELECT id, level_id AS levelId, player_name AS playerName, time_ms AS timeMs,
           boat_id AS boatId, replay_json AS replayJson, created_at AS createdAt
    FROM scores
    WHERE id = ?
  `,
    )
    .get(id) as
    | {
        id: number
        levelId: string
        playerName: string
        timeMs: number
        boatId: string
        replayJson: string
        createdAt: string
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    levelId: row.levelId,
    playerName: row.playerName,
    timeMs: row.timeMs,
    boatId: row.boatId,
    createdAt: row.createdAt,
    replay: JSON.parse(row.replayJson) as ReplayPayload,
  }
}
