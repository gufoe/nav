/** Clamp value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Inverse lerp: fraction of value between a and b. */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0
  return (value - a) / (b - a)
}

/** Remap value from one range to another. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value))
}

/** Wrap angle to (-π, π]. */
export function wrapAngle(radians: number): number {
  const twoPi = Math.PI * 2
  let a = ((radians + Math.PI) % twoPi + twoPi) % twoPi
  return a - Math.PI
}

/** Shortest signed angular delta from `from` to `to` (radians). */
export function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from)
}

/** Degrees ↔ radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

/** Smoothstep (Hermite) in [0, 1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Nearly equal floating-point comparison. */
export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon
}
