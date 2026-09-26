/** SQLite `datetime('now')` style → short local date for scoreboard. */
export function formatScoreDate(stored: string): string {
  const trimmed = stored.trim()
  if (!trimmed) return "—"
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return trimmed
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
