/** m/s → knots. */
export function msToKnots(ms: number): number {
  return ms * 1.943844
}

/** Format a compact speed for HUD (kn when ≥ 0.05, else calm). */
export function formatKnots(ms: number, digits = 1): string {
  if (ms < 0.05) return "calm"
  return `${msToKnots(ms).toFixed(digits)} kn`
}

/** Cardinal from angle (0 = +X / east, CCW). */
export function toCardinal(radians: number): string {
  const dirs = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"] as const
  const twoPi = Math.PI * 2
  const a = ((radians % twoPi) + twoPi) % twoPi
  const idx = Math.round(a / (Math.PI / 4)) % 8
  return dirs[idx] ?? "E"
}
