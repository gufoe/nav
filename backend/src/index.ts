import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { ReplayPayload } from "../../shared/replay.ts"
import { getScoreReplay, insertScore, listScores } from "./db.ts"

const app = new Hono()

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
)

app.get("/api/health", (c) => c.json({ ok: true }))

app.get("/api/scores", (c) => {
  const levelId = c.req.query("levelId")
  if (!levelId?.trim()) {
    return c.json({ error: "levelId is required" }, 400)
  }
  const limitRaw = c.req.query("limit")
  const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 25
  if (Number.isNaN(limit)) {
    return c.json({ error: "invalid limit" }, 400)
  }
  return c.json({ scores: listScores(levelId.trim(), limit) })
})

app.get("/api/scores/:id", (c) => {
  const id = Number(c.req.param("id"))
  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: "invalid id" }, 400)
  }
  const row = getScoreReplay(id)
  if (!row) return c.json({ error: "not found" }, 404)
  return c.json({
    id: row.id,
    levelId: row.levelId,
    playerName: row.playerName,
    timeMs: row.timeMs,
    boatId: row.boatId,
    createdAt: row.createdAt,
    replay: row.replay,
  })
})

app.post("/api/scores", async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "invalid JSON" }, 400)
  }
  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid body" }, 400)
  }
  const { levelId, playerName, timeMs, boatId, replay } = body as Record<string, unknown>
  if (typeof levelId !== "string" || !levelId.trim()) {
    return c.json({ error: "levelId required" }, 400)
  }
  if (typeof playerName !== "string" || !playerName.trim()) {
    return c.json({ error: "playerName required" }, 400)
  }
  if (typeof timeMs !== "number" || !Number.isFinite(timeMs) || timeMs <= 0) {
    return c.json({ error: "timeMs must be a positive number" }, 400)
  }
  if (typeof boatId !== "string" || !boatId.trim()) {
    return c.json({ error: "boatId required" }, 400)
  }
  if (!isReplayPayload(replay)) {
    return c.json({ error: "invalid replay" }, 400)
  }
  if (replay.scenarioId !== levelId.trim()) {
    return c.json({ error: "replay scenario mismatch" }, 400)
  }

  const id = insertScore({
    levelId: levelId.trim(),
    playerName: playerName.trim(),
    timeMs,
    boatId: boatId.trim(),
    replay,
  })
  return c.json({ id }, 201)
})

function isReplayPayload(value: unknown): value is ReplayPayload {
  if (!value || typeof value !== "object") return false
  const r = value as ReplayPayload
  return (
    r.v === 1 &&
    typeof r.scenarioId === "string" &&
    typeof r.boatId === "string" &&
    typeof r.timeMs === "number" &&
    typeof r.fixedDt === "number" &&
    Array.isArray(r.frames)
  )
}

const port = Number(process.env.PORT ?? 3001)
serve({ fetch: app.fetch, port }, () => {
  console.log(`nav backend listening on http://localhost:${port}`)
})
