import type { ReplayPayload } from "../../../shared/replay.ts"

export interface ScoreListItem {
  id: number
  levelId: string
  playerName: string
  timeMs: number
  boatId: string
  createdAt: string
}

export interface ScoreDetail extends ScoreListItem {
  replay: ReplayPayload
}

export async function fetchScores(levelId: string, limit = 25): Promise<ScoreListItem[]> {
  const params = new URLSearchParams({ levelId, limit: String(limit) })
  const res = await fetch(`/api/scores?${params}`)
  if (!res.ok) throw new Error(`Failed to load scores (${res.status})`)
  const data = (await res.json()) as { scores: ScoreListItem[] }
  return data.scores
}

export async function fetchScore(id: number): Promise<ScoreDetail> {
  const res = await fetch(`/api/scores/${id}`)
  if (!res.ok) throw new Error(`Failed to load score (${res.status})`)
  return (await res.json()) as ScoreDetail
}

export async function submitScore(input: {
  levelId: string
  playerName: string
  timeMs: number
  boatId: string
  replay: ReplayPayload
}): Promise<number> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? `Submit failed (${res.status})`)
  }
  const data = (await res.json()) as { id: number }
  return data.id
}
