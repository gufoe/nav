/** Format simulation time for scoreboard display (m:ss.t). */
export function formatRunTimeMs(ms: number): string {
  const totalTenths = Math.max(0, Math.round(ms / 100))
  const tenths = totalTenths % 10
  const totalSec = Math.floor(totalTenths / 10)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60)
  return `${min}:${String(sec).padStart(2, "0")}.${tenths}`
}
